const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/db');

// Root project directory (parent of backend)
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_DIR = path.resolve(__dirname, '../..');
const DB_FILE = path.resolve(BACKEND_DIR, 'earist_clinic.db');
const BACKUPS_DIR = path.resolve(BACKEND_DIR, 'backups');

// In-memory concurrency lock to prevent overlapping updates
let isUpdating = false;
let lastUpdateStatus = null;

/**
 * Execute a shell command wrapped in a Promise
 */
function runCommand(command, cwd = PROJECT_ROOT, timeout = 60000) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout }, (error, stdout, stderr) => {
      if (error) {
        return reject({ error, stdout: stdout ? stdout.trim() : '', stderr: stderr ? stderr.trim() : '' });
      }
      resolve(stdout ? stdout.trim() : '');
    });
  });
}

/**
 * Get tracking remote and branch dynamically
 */
async function getRemoteAndBranch() {
  let branch = 'master';
  let remote = 'origin';

  try {
    const b = await runCommand('git branch --show-current');
    if (b) branch = b;
  } catch (e) {}

  try {
    const r = await runCommand(`git config branch.${branch}.remote`);
    if (r) {
      remote = r;
    } else {
      const remotes = await runCommand('git remote');
      const first = remotes.split('\n')[0].trim();
      if (first) remote = first;
    }
  } catch (e) {
    try {
      const remotes = await runCommand('git remote');
      const first = remotes.split('\n')[0].trim();
      if (first) remote = first;
    } catch (e2) {}
  }

  return { remote, branch };
}

/**
 * Read current system version, active git commit, branch, and build timestamp
 */
async function getCurrentVersion() {
  const pkgPath = path.resolve(BACKEND_DIR, 'package.json');
  let appVersion = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    appVersion = pkg.version || '1.0.0';
  } catch (e) {
    // Keep fallback version
  }

  const { remote, branch } = await getRemoteAndBranch();

  try {
    const commitHash = await runCommand('git rev-parse HEAD');
    const shortHash = await runCommand('git rev-parse --short HEAD');
    const commitDate = await runCommand('git log -1 --format="%ad" --date=iso');

    return {
      success: true,
      version: appVersion,
      commitHash,
      shortHash,
      commitDate,
      branch: branch || 'master',
      remote,
      nodeEnv: process.env.NODE_ENV || 'production',
      isUpdating
    };
  } catch (err) {
    return {
      success: true,
      version: appVersion,
      commitHash: 'local-build',
      shortHash: 'local',
      commitDate: new Date().toISOString(),
      branch: branch || 'master',
      remote,
      nodeEnv: process.env.NODE_ENV || 'production',
      isUpdating
    };
  }
}

/**
 * Check GitHub remote for incoming commits on master
 */
async function checkForUpdates() {
  const current = await getCurrentVersion();
  const { remote, branch } = await getRemoteAndBranch();

  try {
    // 1. Fetch remote updates quietly
    await runCommand(`git fetch ${remote} ${branch} --quiet`, PROJECT_ROOT, 20000);

    // 2. Count how many commits local HEAD is behind remote tracking branch
    const behindCountStr = await runCommand(`git rev-list --count HEAD..${remote}/${branch}`);
    const commitsBehind = parseInt(behindCountStr, 10) || 0;

    let changelog = [];
    let remoteCommit = current.commitHash;

    if (commitsBehind > 0) {
      // 3. Fetch remote HEAD commit hash
      remoteCommit = await runCommand(`git rev-parse ${remote}/${branch}`);

      // 4. Parse pending commit changelog: hash \t author \t date \t message
      const logOutput = await runCommand(
        `git log HEAD..${remote}/${branch} --pretty=format:"%h%x09%an%x09%ad%x09%s" --date=short`
      );
      if (logOutput) {
        changelog = logOutput
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, author, date, ...rest] = line.split('\t');
            return {
              hash: hash ? hash.trim() : '',
              author: author ? author.trim() : '',
              date: date ? date.trim() : '',
              message: rest.join('\t').trim()
            };
          });
      }
    }

    // 5. Check if local working tree has uncommitted modifications
    const statusOutput = await runCommand('git status --porcelain');
    const isDirty = Boolean(statusOutput && statusOutput.length > 0);
    const dirtyFiles = isDirty
      ? statusOutput
          .split('\n')
          .filter(Boolean)
          .map((s) => s.trim())
      : [];

    return {
      success: true,
      updateAvailable: commitsBehind > 0,
      commitsBehind,
      currentCommit: current.shortHash,
      remoteCommit: remoteCommit.slice(0, 7),
      branch,
      remote,
      isDirty,
      dirtyFiles,
      changelog,
      lastChecked: new Date().toISOString()
    };
  } catch (err) {
    console.error('OTA Update check error:', err);
    return {
      success: false,
      updateAvailable: false,
      commitsBehind: 0,
      currentCommit: current.shortHash,
      branch: current.branch,
      remote,
      error: `Could not connect to remote repository '${remote}'. Verify network connection and repository access.`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Execute Over-The-Air Update:
 * 1. Pre-flight check & lock
 * 2. SQLite database backup snapshot
 * 3. Git pull origin master
 * 4. Build frontend production assets
 * 5. Verify database migrations
 */
async function applyUpdate() {
  if (isUpdating) {
    throw new Error('An OTA update is already in progress. Please wait.');
  }

  isUpdating = true;
  const progressLogs = [];
  const logStep = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    progressLogs.push(`[${timestamp}] ${msg}`);
  };

  try {
    logStep('Starting Over-The-Air system update...');

    // Step 1: Pre-flight working tree check
    logStep('Checking working tree status...');
    const statusOutput = await runCommand('git status --porcelain');
    if (statusOutput && statusOutput.trim().length > 0) {
      // Allow minor untracked docs or temp files, but reject modified tracked code
      const modifiedTracked = statusOutput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('M ') || l.startsWith(' M'));
      if (modifiedTracked.length > 0) {
        throw new Error(
          `Local tracked files have uncommitted changes (${modifiedTracked.length} files). Stash or commit changes first.`
        );
      }
    }

    // Step 2: Database backup snapshot
    logStep('Creating pre-update SQLite database backup snapshot...');
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `earist_clinic_pre_update_${timestamp}.db`;
    const backupPath = path.resolve(BACKUPS_DIR, backupFileName);

    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, backupPath);
      logStep(`Database successfully snapshotted to ${backupFileName}`);
    } else {
      logStep('No active database file found to snapshot, continuing.');
    }

    // Step 3: Git Pull from remote master
    const { remote, branch } = await getRemoteAndBranch();
    logStep(`Pulling latest commits from remote ${remote}/${branch}...`);
    const pullOutput = await runCommand(`git pull ${remote} ${branch}`, PROJECT_ROOT, 60000);
    logStep(`Git pull completed: ${pullOutput.split('\n')[0]}`);

    // Step 4: Frontend Production Build
    logStep('Compiling and building updated frontend assets (Vite)...');
    const buildOutput = await runCommand('npm --prefix frontend run build', PROJECT_ROOT, 120000);
    logStep('Frontend production assets compiled successfully.');

    // Step 5: Database Schema Auto-Migration
    logStep('Running database schema migration check...');
    getDb();
    logStep('Database schema validated.');

    const newVersion = await getCurrentVersion();
    logStep(`System updated successfully to commit ${newVersion.shortHash}!`);

    lastUpdateStatus = {
      success: true,
      timestamp: new Date().toISOString(),
      backupPath: backupFileName,
      commit: newVersion.shortHash,
      logs: progressLogs
    };

    return {
      success: true,
      message: 'System update completed successfully.',
      currentCommit: newVersion.shortHash,
      backupFile: backupFileName,
      logs: progressLogs
    };
  } catch (err) {
    const errorMsg = err.message || (err.stderr ? err.stderr : 'Unknown error during update');
    logStep(`ERROR: ${errorMsg}`);
    console.error('OTA Update failed:', err);

    lastUpdateStatus = {
      success: false,
      timestamp: new Date().toISOString(),
      error: errorMsg,
      logs: progressLogs
    };

    throw new Error(`Update failed: ${errorMsg}`);
  } finally {
    isUpdating = false;
  }
}

module.exports = {
  getCurrentVersion,
  checkForUpdates,
  applyUpdate,
  isUpdating: () => isUpdating,
  getLastUpdateStatus: () => lastUpdateStatus
};
