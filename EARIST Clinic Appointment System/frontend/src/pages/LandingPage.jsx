import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Stethoscope,
  ShieldAlert,
  Clock,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  MapPin,
  ArrowRight,
  PhoneCall,
  Award
} from 'lucide-react';

export const LandingPage = ({ onNavigate, onOpenBooking, onOpenTrack }) => {
  const services = [
    {
      icon: Stethoscope,
      title: 'General Health & Medical Triage',
      desc: 'Comprehensive outpatient checkups, diagnosis, first-aid treatment, and campus health clearances.',
      badge: 'Daily Consultation'
    },
    {
      icon: Sparkles,
      title: 'Dental Health & Oral Care',
      desc: 'Annual dental checkups, cleaning, oral examinations, tooth extraction, and dental health certifications.',
      badge: 'Dr. Alice Johnson'
    },
    {
      icon: Award,
      title: 'OJT & Athletic Clearances',
      desc: 'Medical physical examinations, lab certificate assessments, and verified fitness certifications.',
      badge: 'Fast-Track Verification'
    },
    {
      icon: HeartHandshake,
      title: 'Student Wellness & First Aid',
      desc: 'Emergency response, vital signs monitoring, routine health assessments, and prescription issuance.',
      badge: 'Campus Care'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-earist-crimson/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-earist-gold/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading and CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-earist-dark text-xs font-bold tracking-wide">
                <span className="flex h-2 w-2 rounded-full bg-earist-crimson animate-pulse" />
                OFFICIAL EARIST CAMPUS HEALTH PORTAL • DIRECT ACCESS
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Modern, Fast & Accessible <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-earist-crimson via-red-800 to-amber-600">
                  Campus Healthcare
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Serving the student body, faculty, and academic personnel of the{' '}
                <strong className="text-slate-900 font-semibold">
                  Eulogio "Amang" Rodriguez Institute of Science and Technology
                </strong>{' '}
                in Nagtahan, Sampaloc, Manila. Book medical and dental visits online directly without sign up or waiting in long clinic lines.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onOpenBooking}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold text-white earist-gradient hover:shadow-lg hover:shadow-red-950/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CalendarCheck className="w-5 h-5 text-earist-gold" />
                  <span>Book Appointment Directly</span>
                  <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-extrabold uppercase ml-1">
                    No Sign-Up
                  </span>
                </button>
                <button
                  onClick={onOpenTrack}
                  className="px-6 py-3.5 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs hover:border-slate-400 transition-all flex items-center gap-2"
                >
                  <span>Track Ticket & Clearance Slip</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Highlights bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
                <div>
                  <p className="text-2xl font-extrabold text-earist-crimson">100% Free</p>
                  <p className="text-xs text-slate-500 font-medium">For EARIST Students</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">15 Mins</p>
                  <p className="text-xs text-slate-500 font-medium">Average Triage Time</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-earist-amber">Digital</p>
                  <p className="text-xs text-slate-500 font-medium">Prescription & Slips</p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Interactive Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="glass-maroon p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Stethoscope className="w-40 h-40" />
                </div>

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">Clinic Hours & Location</h3>
                      <p className="text-xs text-amber-200/80 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Ground Flr, Main Administration Wing
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Open Today
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-xs">
                      <span className="flex items-center gap-2 font-medium text-amber-100">
                        <Clock className="w-4 h-4 text-earist-gold" />
                        Monday – Friday
                      </span>
                      <span className="font-bold text-white">08:00 AM – 05:00 PM</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-xs">
                      <span className="flex items-center gap-2 font-medium text-amber-100">
                        <Sparkles className="w-4 h-4 text-earist-gold" />
                        Dental Clinic Hours
                      </span>
                      <span className="font-bold text-white">08:30 AM – 04:00 PM</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-xs">
                      <span className="flex items-center gap-2 font-medium text-amber-100">
                        <ShieldAlert className="w-4 h-4 text-rose-300" />
                        Campus Emergency Triage
                      </span>
                      <span className="font-bold text-emerald-300">Priority Walk-ins</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Emergency Campus Hotline</p>
                      <p className="text-xs text-amber-200">(02) 8716-6273 / Local 104</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Clinical & Healthcare Services
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Equipped with licensed medical professionals and certified campus health officers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100/80 text-earist-crimson flex items-center justify-center shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-earist-crimson bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">
                        {item.badge}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2">{item.title}</h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center text-xs font-semibold text-earist-crimson">
                    <span>Available Online</span>
                    <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 text-emerald-600" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
