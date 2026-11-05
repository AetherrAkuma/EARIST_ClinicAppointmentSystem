import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X,
  Phone,
  Building2,
  Clock
} from 'lucide-react';

export const LoginPage = ({ onNavigate, onOpenBooking, onOpenTrack }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      // Navigation will be automatically updated by AuthContext
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your official credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header Banner */}
        <div className="p-8 text-center bg-[#800020] text-white relative border-b border-[#9e1b32]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3 shadow-sm">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Staff & Medical Officer Portal</h2>
          <p className="text-xs text-amber-100/90 font-medium mt-1">
            EARIST Manila Campus Health Services Directorate
          </p>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
            Authorized Personnel Only
          </span>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@e-clinic.ragetech.dev or admin@earist.edu.ph"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-semibold text-earist-crimson hover:text-red-900 hover:underline transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3 inline" />
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white earist-gradient hover:opacity-95 shadow-md shadow-red-950/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-earist-gold" />
                  Sign In to Clinic Portal
                </>
              )}
            </button>
          </form>

          {/* Security Assurance Badge */}
          <div className="mt-5 py-2 px-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>256-Bit SSL Encrypted • Directorate Session Security</span>
          </div>

          {/* Student/Staff Patient Notice */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              Are you an EARIST Student, Faculty, or Outsource Staff?
            </p>
            <p className="text-[11px] text-slate-400">
              Patients do not need to sign in to access clinic services.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenBooking}
                className="text-xs font-bold text-earist-crimson hover:underline"
              >
                Book Appointment (No Login)
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={onOpenTrack}
                className="text-xs font-bold text-slate-700 hover:underline"
              >
                Track Slip / Queue Ticket
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password / Institutional Reset Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-[#800020] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">Institutional Security Protocol</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-600">
                <p className="leading-relaxed">
                  In compliance with EARIST Health Services security and medical data privacy policies,
                  medical officer and clinic staff credential resets are administered centrally.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block">Health Services Directorate</span>
                      <span>Ground Floor, Main Administration Wing, Manila Campus</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block">Direct Extension Hotline</span>
                      <span>(02) 8716-6273 &bull; Extension 104 (Clinic Admin)</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block">Office Operating Hours</span>
                      <span>Monday to Friday &bull; 8:00 AM – 5:00 PM PHT</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Note: If you are an active Medical Assistant or Doctor, you may also request an in-person credential reset from the Chief Medical Officer or Clinic Administrator.
                </p>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-white bg-[#800020] hover:bg-[#600018] transition-colors"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
