import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, LogOut, User, Shield, Stethoscope, HeartPulse, CalendarCheck } from 'lucide-react';

export const Navbar = ({ currentTab, onNavigate, onOpenBooking, onOpenTrack }) => {
  const { user, logout, isAdmin, isDoctor, isPatient } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onNavigate && onNavigate('home')}
            className="flex items-center gap-4 cursor-pointer group select-none"
          >
            <div className="w-12 h-12 rounded-xl earist-gradient flex items-center justify-center shadow-xs group-hover:scale-102 transition-transform duration-150">
              <Activity className="w-6 h-6 text-earist-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-earist-dark group-hover:text-earist-crimson transition-colors">
                  EARIST <span className="text-earist-gold">CLINIC</span>
                </span>
                <span className="hidden md:inline-flex px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase bg-amber-50 text-amber-900 rounded-md border border-amber-200">
                  Manila Campus
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">
                Health & Wellness Services • Nagtahan, Sampaloc
              </p>
            </div>
          </div>

          {/* Navigation & User Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {user ? (
              <>
                {/* Role Badge & Profile */}
                <div className="flex items-center gap-3 bg-slate-100/90 px-4 py-2 rounded-xl border border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-earist-crimson text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {isAdmin && <Shield className="w-4.5 h-4.5 text-earist-gold" />}
                    {isDoctor && <Stethoscope className="w-4.5 h-4.5 text-emerald-300" />}
                    {isPatient && <User className="w-4.5 h-4.5 text-amber-200" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs font-semibold text-earist-crimson uppercase tracking-wider">
                      {isAdmin ? 'System Admin' : isDoctor ? 'Medical Staff' : 'User'}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                  title="Sign out of clinic portal"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  onClick={onOpenTrack}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-earist-crimson hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                >
                  Track Ticket
                </button>

                <button
                  onClick={onOpenBooking}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white earist-gradient hover:brightness-105 rounded-xl shadow-xs transition-all"
                >
                  <CalendarCheck className="w-4 h-4 text-earist-gold" />
                  <span>Book Appointment</span>
                </button>

                <span className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                <button
                  onClick={() => onNavigate && onNavigate('login')}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
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
