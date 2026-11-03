const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getCurrentVersion,
  checkForUpdates,
  applyUpdate,
  isUpdating,
  getLastUpdateStatus
} = require('../services/updater.service');

const router = express.Router();

/**
 * GET /api/system/version
 * Public endpoint polled by active clients (browsers, kiosks, dashboards)
 * to detect newly deployed versions without caching.
 */
router.get('/version', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const versionInfo = await getCurrentVersion();
    return res.json(versionInfo);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to read system version info'
    });
  }
});

/**
 * GET /api/system/check-updates
 * Protected (Admin only). Queries remote repository to check for incoming commits.
 */
router.get('/check-updates', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const updateInfo = await checkForUpdates();
    return res.json(updateInfo);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check for updates from remote repository'
    });
  }
});

/**
 * GET /api/system/update-status
 * Protected (Admin only). Returns active update progress state and last execution logs.
 */
router.get('/update-status', authenticateToken, requireRole(['admin']), (req, res) => {
  return res.json({
    success: true,
    isUpdating: isUpdating(),
    lastStatus: getLastUpdateStatus()
  });
});

/**
 * POST /api/system/apply-update
 * Protected (Admin only). Executes database backup snapshot, git pull, and frontend asset rebuild.
 */
router.post('/apply-update', authenticateToken, requireRole(['admin']), async (req, res) => {
  if (isUpdating()) {
    return res.status(409).json({
      success: false,
      message: 'An update is already in progress. Please wait for it to complete.'
    });
  }

  try {
    const result = await applyUpdate();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'System update encountered an unexpected error.'
    });
  }
});

module.exports = router;

