import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Stethoscope,
  ShieldAlert,
  Clock,
  HeartPulse,
  HeartHandshake,
  CheckCircle2,
  MapPin,
  ArrowRight,
  PhoneCall,
  Award,
  Activity,
  Search,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Calendar,
  Building2,
  UserCheck
} from 'lucide-react';

export const LandingPage = ({ onNavigate, onOpenBooking, onOpenTrack }) => {
  const [activeWidgetTab, setActiveWidgetTab] = useState('tracker'); // 'tracker' | 'stations'
  const [quickCode, setQuickCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const handleQuickSearch = async (targetCode) => {
    const code = (targetCode !== undefined ? targetCode : quickCode).trim();
    if (!code) return;

    setIsSearching(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const res = await fetch(`/api/appointments/track/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No appointment found for this reference code.');
      }
      setTrackResult(data.appointment);
    } catch (err) {
      setTrackError(err.message || 'Unable to find appointment.');
    } finally {
      setIsSearching(false);
    }
  };
  const services = [
    {
      icon: Stethoscope,
      title: 'General Health & Medical Triage',
      desc: 'Outpatient checkups, diagnostics, initial medical triage, and campus health clearances for students & personnel.',
      badge: 'Daily Consultation'
    },
    {
      icon: Activity,
      title: 'Dental Health & Oral Care',
      desc: 'Routine dental checkups, cleaning, oral examinations, tooth extraction, and dental health certifications.',
      badge: 'Dr. Alice Johnson'
    },
    {
      icon: Award,
      title: 'OJT & Athletic Clearances',
      desc: 'Medical physical examinations, lab assessment verification, and certified campus fitness clearances.',
      badge: 'Fast-Track Verification'
    },
    {
      icon: HeartHandshake,
      title: 'Student Wellness & First Aid',
      desc: 'Emergency response, vital signs & BP monitoring, first-aid interventions, and prescription issuance.',
      badge: 'Campus Care'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Heading and CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-7 space-y-6"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Modern, Fast & Accessible <br />
                <span className="text-earist-crimson">Campus Healthcare</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Serving the student body, faculty, and academic personnel of the{' '}
                <strong className="text-slate-900 font-semibold">
                  Eulogio "Amang" Rodriguez Institute of Science and Technology
                </strong>{' '}
                in Nagtahan, Sampaloc, Manila. Book medical and dental visits online directly without sign up or waiting in long clinic lines.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={onOpenBooking}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 transition-colors shadow-xs"
                >
                  <CalendarCheck className="w-5 h-5 text-earist-gold" />
                  <span>Book Appointment Directly</span>
                  <span className="text-xs bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-bold ml-1">
                    No Sign-Up
                  </span>
                </button>
                <button
                  onClick={onOpenTrack}
                  className="px-6 py-3.5 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs hover:border-slate-400 transition-colors flex items-center gap-2"
                >
                  <span>Track Ticket & Clearance Slip</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Highlights bar */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-earist-crimson">100% Free</p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">For EARIST Students</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">15 Mins</p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">Average Triage Time</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">Digital</p>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">Prescriptions & Slips</p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Interactive Clinic Desk & Instant Slip Tracker */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden">
                {/* Institutional Accent Bar */}
                <div className="h-2 bg-gradient-to-r from-[#800020] via-[#a31535] to-amber-500" />

                {/* Desk Header */}
                <div className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-earist-crimson" />
                      EARIST Health Desk
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Ground Flr, Main Admin Wing
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Open Today
                  </span>
                </div>

                {/* Functional View Tabs */}
                <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveWidgetTab('tracker')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeWidgetTab === 'tracker'
                        ? 'bg-red-50 text-earist-crimson border border-red-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    Instant Slip Tracker
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWidgetTab('stations')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeWidgetTab === 'stations'
                        ? 'bg-red-50 text-earist-crimson border border-red-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    Duty Doctors & Rooms
                  </button>
                </div>

                {/* Tab 1: Instant Slip Tracker */}
                {activeWidgetTab === 'tracker' && (
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Track Appointment / Clearance Slip
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={quickCode}
                          onChange={(e) => setQuickCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                          placeholder="e.g. EAR-2026-A109 or 234-0000M"
                          className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson text-xs font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickSearch()}
                          disabled={isSearching || !quickCode.trim()}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#800020] hover:bg-[#660019] text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                          {isSearching ? '...' : 'Track'}
                        </button>
                      </div>

                      {/* Quick demo pills */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 font-medium">Quick Test:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCode('EAR-2026-A109');
                            handleQuickSearch('EAR-2026-A109');
                          }}
                          className="text-[10px] font-semibold text-earist-crimson bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md border border-red-200 transition-colors"
                        >
                          EAR-2026-A109
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCode('EAR-2026-B244');
                            handleQuickSearch('EAR-2026-B244');
                          }}
                          className="text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                        >
                          EAR-2026-B244
                        </button>
                      </div>
                    </div>

                    {/* Result Preview Box */}
                    {trackResult && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 truncate max-w-[200px]">
                            {trackResult.patient_name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              trackResult.status === 'Completed'
                                ? 'bg-purple-100 text-purple-800'
                                : trackResult.status === 'OnGoing'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {trackResult.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-amber-200/60">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Station / Room:</span>
                            <span className="font-semibold text-slate-800">{trackResult.room_number || 'Main Clinic'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Schedule:</span>
                            <span className="font-semibold text-slate-800">{trackResult.time_slot}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenTrack(trackResult.reference_code)}
                          className="w-full mt-1 py-1.5 px-3 rounded-lg bg-earist-crimson hover:bg-[#660019] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <span>Open Full Slip & Print</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Error Notice */}
                    {trackError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{trackError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={onOpenBooking}
                          className="text-[11px] font-bold text-earist-crimson underline hover:opacity-80"
                        >
                          Book Now
                        </button>
                      </div>
                    )}

                    {!trackResult && !trackError && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-1">
                        <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          Direct Campus Access
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          Students, faculty, and outsource personnel can book directly without logging in. Your Reference Code is provided upon booking.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Duty Doctors & Rooms */}
                {activeWidgetTab === 'stations' && (
                  <div className="p-5 space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 text-earist-crimson flex items-center justify-center shrink-0 mt-0.5">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">Main Clinic Rm 101</h4>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Dr. Roberto
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          General Physician & Triage • 08:00 AM – 05:00 PM
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">Dental Wing Rm 102</h4>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Dr. Alice
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Dental Health & Oral Surgery • 08:30 AM – 04:00 PM
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenBooking}
                      className="w-full py-2.5 px-3 rounded-xl bg-earist-crimson hover:bg-[#660019] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <CalendarCheck className="w-4 h-4 text-earist-gold" />
                      Book Consultation with Duty Doctor
                    </button>
                  </div>
                )}

                {/* Desk Card Footer: Emergency */}
                <div className="px-5 py-3 bg-red-50/70 border-t border-red-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-earist-crimson font-medium text-[11px]">
                    <PhoneCall className="w-3.5 h-3.5 text-earist-crimson shrink-0" />
                    <span>Emergency Hotline: <strong>(02) 8716-6273 (Ext. 104)</strong></span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                    Walk-in Priority
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Clinical & Healthcare Services
            </h2>
            <p className="text-base text-slate-600 mt-2 font-medium">
              Equipped with licensed medical professionals and certified campus health officers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-earist-crimson flex items-center justify-center border border-red-100">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold tracking-wider uppercase text-earist-crimson bg-red-50 px-2.5 py-1 rounded-md border border-red-200/60">
                        {item.badge}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2.5">{item.title}</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-100 flex items-center text-xs font-semibold text-earist-crimson">
                    <span>Available On Campus</span>
                    <CheckCircle2 className="w-4 h-4 ml-1.5 text-emerald-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
