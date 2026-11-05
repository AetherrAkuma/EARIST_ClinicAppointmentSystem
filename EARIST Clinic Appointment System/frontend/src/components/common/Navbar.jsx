import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  LogOut,
  User,
  Shield,
  Stethoscope,
  HeartPulse,
  CalendarCheck,
  Menu,
  X,
  PhoneCall,
  Search,
  LogIn,
  Clock,
  MapPin,
  ChevronRight
} from 'lucide-react';

export const Navbar = ({ currentTab, onNavigate, onOpenBooking, onOpenTrack }) => {
  const { user, logout, isAdmin, isDoctor, isPatient } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo & Name */}
            <div
              onClick={() => {
                closeMenu();
                if (onNavigate) onNavigate('home');
              }}
              className="flex items-center gap-2.5 sm:gap-4 cursor-pointer group select-none min-w-0"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl earist-gradient flex items-center justify-center shadow-xs group-hover:scale-102 transition-transform duration-150 shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-earist-gold" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-2xl tracking-tight text-earist-dark group-hover:text-earist-crimson transition-colors truncate">
                    EARIST <span className="text-earist-gold">CLINIC</span>
                  </span>
                  <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-wider uppercase bg-amber-50 text-amber-900 rounded-md border border-amber-200 shrink-0">
                    Manila Campus
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block mt-0.5 truncate">
                  Health & Wellness Services • Nagtahan, Sampaloc
                </p>
              </div>
            </div>

            {/* Desktop Navigation & Actions */}
            <div className="hidden sm:flex items-center gap-2.5 sm:gap-3.5">
              {user ? (
                <>
                  <div className="flex items-center gap-3 bg-slate-100/90 px-4 py-2 rounded-xl border border-slate-200">
                    <div className="w-9 h-9 rounded-lg bg-earist-crimson text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {isAdmin && <Shield className="w-4.5 h-4.5 text-earist-gold" />}
                      {isDoctor && <Stethoscope className="w-4.5 h-4.5 text-emerald-300" />}
                      {isPatient && <User className="w-4.5 h-4.5 text-amber-200" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs font-semibold text-earist-crimson uppercase tracking-wider">
                        {isAdmin ? 'System Admin' : isDoctor ? 'Medical Staff' : 'User'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                    title="Sign out of clinic portal"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <button
                    onClick={onOpenTrack}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-earist-crimson hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                  >
                    Track Ticket
                  </button>

                  <button
                    onClick={onOpenBooking}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white earist-gradient hover:brightness-105 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4 text-earist-gold" />
                    <span>Book Appointment</span>
                  </button>

                  <span className="h-5 w-px bg-slate-200 mx-1" />

                  <button
                    onClick={() => onNavigate && onNavigate('login')}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    title="Medical Staff & Admin Sign In"
                  >
                    Staff Portal
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Actions: Emergency Call & Hamburger Button */}
            <div className="flex sm:hidden items-center gap-2">
              <a
                href="tel:0287166273"
                className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs"
                title="Call Emergency Clinic Trunkline"
                aria-label="Emergency call"
              >
                <PhoneCall className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-earist-crimson" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={closeMenu}
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 right-0 max-w-[320px] w-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div className="p-5 space-y-6 overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg earist-gradient flex items-center justify-center">
                    <Activity className="w-5 h-5 text-earist-gold" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">EARIST CLINIC</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Health Services Portal</p>
                  </div>
                </div>
                <button
                  onClick={closeMenu}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Badge (If Logged In) */}
              {user && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-earist-crimson text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {isAdmin && <Shield className="w-5 h-5 text-earist-gold" />}
                    {isDoctor && <Stethoscope className="w-5 h-5 text-emerald-300" />}
                    {isPatient && <User className="w-5 h-5 text-amber-200" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[11px] font-semibold text-earist-crimson uppercase tracking-wider mt-0.5">
                      {isAdmin ? 'System Administrator' : isDoctor ? 'Medical Staff' : 'Student / Patient'}
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Mobile Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onOpenBooking();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarCheck className="w-5 h-5 text-earist-gold" />
                    Book Clinic Appointment
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onOpenTrack();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-between cursor-pointer border border-slate-200"
                >
                  <span className="flex items-center gap-2.5">
                    <Search className="w-5 h-5 text-slate-600" />
                    Track Ticket & Slips
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-sm font-semibold text-slate-700">
                <button
                  onClick={() => {
                    closeMenu();
                    if (onNavigate) onNavigate('home');
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <Activity className="w-4 h-4 text-earist-crimson" />
                  Home & Clinic Services
                </button>

                {user ? (
                  <button
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    className="w-full text-left py-2.5 px-3 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out Account
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      closeMenu();
                      if (onNavigate) onNavigate('login');
                    }}
                    className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <LogIn className="w-4 h-4 text-slate-600" />
                    Staff & Doctor Portal
                  </button>
                )}
              </div>

              {/* Quick Info & Hours */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Clock className="w-4 h-4 text-amber-700" />
                  Clinic Operating Hours
                </div>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  Monday to Friday: <strong>8:00 AM – 5:00 PM</strong><br />
                  Emergency triage accepts walk-ins anytime during duty.
                </p>
                <div className="pt-1.5 flex items-start gap-1.5 text-amber-900/90 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>Main Campus, Nagtahan, Sampaloc, Manila</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Hotline */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <a
                href="tel:0287166273"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                Call Clinic: (02) 8716-6273
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
