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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-10 my-8`}
          >
            {/* Header */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-[#800020] text-white flex items-center justify-between border-b border-[#9e1b32]">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-earist-gold"></span>
                  {title}
                </h3>
                {subtitle && <p className="text-sm text-amber-100/90 mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 max-h-[calc(85vh-120px)] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
