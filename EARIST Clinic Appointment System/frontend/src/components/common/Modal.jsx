import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal / Bottom-Sheet Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative w-full ${maxWidth} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 max-h-[92vh] sm:max-h-[88vh] flex flex-col`}
          >
            {/* Header with Mobile Drag Indicator */}
            <div className="px-4 sm:px-8 pt-3 pb-4 sm:py-5 bg-[#800020] text-white flex flex-col justify-between border-b border-[#9e1b32] shrink-0">
              {/* Drag Handle (Mobile only) */}
              <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-earist-gold shrink-0"></span>
                    <span className="truncate">{title}</span>
                  </h3>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5 sm:mt-1 truncate">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
