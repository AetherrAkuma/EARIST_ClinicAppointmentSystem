import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, Sparkles, User, Shield, Stethoscope, AlertCircle } from 'lucide-react';

export const LoginPage = ({ onNavigate, onOpenBooking, onOpenTrack }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation will be automatically updated by AuthContext
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Header Banner */}
        <div className="p-8 text-center earist-gradient text-white relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-inner">
            <Sparkles className="w-7 h-7 text-earist-gold" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Staff & Admin Portal</h2>
          <p className="text-xs text-amber-100/90 font-medium mt-1">
            EARIST-Manila Campus Health Directorate
          </p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
            Medical Staff Sign-In Only
          </span>
        </div>

        {/* Quick-Fill Demo Chips */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            One-Click Staff Demo Credentials:
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('dr.bob@earist.edu.ph')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700 font-medium transition-all text-center"
            >
              <Stethoscope className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[11px] font-bold">Dr. Bob</span>
              <span className="text-[9px] text-slate-400">Physician</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('dr.alice@earist.edu.ph')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 font-medium transition-all text-center"
            >
              <Sparkles className="w-4 h-4 text-blue-600 mb-1" />
              <span className="text-[11px] font-bold">Dr. Alice</span>
              <span className="text-[9px] text-slate-400">Dentist</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('admin@earist.edu.ph')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50/50 text-slate-700 font-medium transition-all text-center"
            >
              <Shield className="w-4 h-4 text-red-600 mb-1" />
              <span className="text-[11px] font-bold">Admin</span>
              <span className="text-[9px] text-slate-400">Directorate</span>
            </button>
          </div>
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
                EARIST Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student.john@earist.edu.ph"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <span className="text-[11px] text-slate-400">Default: password123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
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

          <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              Are you an EARIST Student, Teacher, or Staff?
            </p>
            <div className="flex items-center justify-center gap-2">
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
                Track Slip / Ticket
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
