import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowUpCircle, X } from 'lucide-react';
import { useSystemVersion } from '../../hooks/useSystemVersion';

export const UpdateBanner = () => {
  const { updateAvailable, latestVersion, initialCommit, reloadApp, dismissUpdate } = useSystemVersion(45000);

  if (!updateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#800020] text-white border-b-2 border-amber-400 shadow-lg px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-xs font-bold">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white tracking-wide">
                New EARIST Clinic System Update Available
              </p>
              <p className="text-amber-100/90 text-xs mt-0.5">
                Version updated from <code className="font-mono bg-black/20 px-1 py-0.5 rounded">{initialCommit}</code> to{' '}
                <code className="font-mono bg-amber-400 text-amber-950 px-1 py-0.5 rounded font-bold">
                  {latestVersion?.shortHash || 'latest'}
                </code>
                . Reload your session to apply the latest clinical features and bug fixes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={reloadApp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update & Reload</span>
            </button>
            <button
              type="button"
              onClick={dismissUpdate}
              className="p-2 rounded-xl text-amber-200/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
