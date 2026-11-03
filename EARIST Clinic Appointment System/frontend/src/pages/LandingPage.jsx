import React from 'react';
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
  Activity
} from 'lucide-react';

export const LandingPage = ({ onNavigate, onOpenBooking, onOpenTrack }) => {
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
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-earist-dark text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-earist-crimson" />
                OFFICIAL EARIST CAMPUS HEALTH PORTAL • DIRECT ACCESS
              </div>

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

            {/* Right Column: Institutional Info Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="bg-[#800020] border border-[#9e1b32] p-7 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/20 pb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">Clinic Hours & Location</h3>
                      <p className="text-xs text-amber-200 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-4 h-4 text-earist-gold shrink-0" />
                        <span>Ground Flr, Main Administration Wing</span>
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      Open Today
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/10">
                      <span className="flex items-center gap-2 font-medium text-amber-100">
                        <Clock className="w-4 h-4 text-earist-gold" />
                        Monday – Friday
                      </span>
                      <span className="font-bold text-white">08:00 AM – 05:00 PM</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/10">
                      <span className="flex items-center gap-2 font-medium text-amber-100">
                        <Activity className="w-4 h-4 text-earist-gold" />
                        Dental Clinic Hours
                      </span>
                      <span className="font-bold text-white">08:30 AM – 04:00 PM</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/10">
                      <span className="flex items-center gap-2 font-medium text-amber-100">
                        <ShieldAlert className="w-4 h-4 text-rose-300" />
                        Emergency Triage
                      </span>
                      <span className="font-bold text-emerald-300">Priority Walk-ins</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/25 border border-amber-400/30 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Emergency Campus Hotline</p>
                      <p className="text-sm font-semibold text-amber-200">(02) 8716-6273 / Local 104</p>
                    </div>
                  </div>
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
