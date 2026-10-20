import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, LogOut, User, Shield, Stethoscope, HeartPulse, Sparkles } from 'lucide-react';

export const Navbar = ({ currentTab, onNavigate, onOpenBooking, onOpenTrack }) => {
  const { user, logout, isAdmin, isDoctor, isPatient } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onNavigate && onNavigate('home')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl earist-gradient flex items-center justify-center shadow-md shadow-red-950/20 group-hover:scale-105 transition-transform duration-200">
              <Activity className="w-6 h-6 text-earist-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-earist-dark group-hover:text-earist-crimson transition-colors">
                  EARIST <span className="text-earist-gold">CLINIC</span>
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                  Manila Campus
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Health & Wellness Services • Nagtahan, Sampaloc
              </p>
            </div>
          </div>

          {/* Navigation & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Role Badge & Profile */}
                <div className="flex items-center gap-3 bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200/80">
                  <div className="w-8 h-8 rounded-lg bg-earist-crimson text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {isAdmin && <Shield className="w-4 h-4 text-earist-gold" />}
                    {isDoctor && <Stethoscope className="w-4 h-4 text-emerald-300" />}
                    {isPatient && <User className="w-4 h-4 text-amber-200" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[10px] font-semibold text-earist-crimson uppercase tracking-wider">
                      {isAdmin ? 'System Admin' : isDoctor ? 'Medical Staff' : 'User'}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                  title="Sign out of clinic portal"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenTrack}
                  className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-earist-crimson hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Track Ticket
                </button>

                <button
                  onClick={onOpenBooking}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white earist-gradient hover:opacity-95 rounded-xl shadow-xs shadow-red-950/20 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-earist-gold" />
                  <span>Book Appointment</span>
                </button>

                <span className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                <button
                  onClick={() => onNavigate && onNavigate('login')}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/80"
                  title="Medical Staff & Admin Sign In"
                >
                  Staff Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
