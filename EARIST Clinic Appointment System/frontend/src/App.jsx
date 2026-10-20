import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DirectBookingWizard } from './components/patient/DirectBookingWizard';
import { TrackAppointmentModal } from './components/patient/TrackAppointmentModal';
import { HeartPulse, MapPin, Mail, Phone } from 'lucide-react';

const MainApp = () => {
  const { user, loading, isAdmin, isDoctor, isPatient } = useAuth();
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login'
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl earist-gradient flex items-center justify-center text-earist-gold mx-auto shadow-lg animate-pulse">
            <HeartPulse className="w-7 h-7" />
          </div>
          <p className="text-xs font-bold text-earist-dark tracking-wider uppercase">
            Loading EARIST Clinic Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar
        currentTab={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenTrack={() => setIsTrackOpen(true)}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div
              key="authenticated-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {isAdmin && <AdminDashboard />}
              {isDoctor && <DoctorDashboard />}
              {isPatient && <DoctorDashboard />}
            </motion.div>
          ) : (
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {currentView === 'home' && (
                <LandingPage
                  onNavigate={(view) => setCurrentView(view)}
                  onOpenBooking={() => setIsBookingOpen(true)}
                  onOpenTrack={() => setIsTrackOpen(true)}
                />
              )}
              {currentView === 'login' && (
                <LoginPage
                  onNavigate={(view) => setCurrentView(view)}
                  onOpenBooking={() => setIsBookingOpen(true)}
                  onOpenTrack={() => setIsTrackOpen(true)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Modals for Direct Booking and Ticket Tracking */}
      <DirectBookingWizard
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBookingSuccess={() => {}}
      />
      <TrackAppointmentModal
        isOpen={isTrackOpen}
        onClose={() => setIsTrackOpen(false)}
      />

      {/* Campus Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">
                EARIST Manila Campus Health Services
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Eulogio "Amang" Rodriguez Institute of Science and Technology. Dedicated to fostering a healthy, safe, and productive academic community.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">Campus Location & Clinic Wing</h4>
              <p className="flex items-start gap-1.5 text-slate-400">
                <MapPin className="w-4 h-4 shrink-0 text-earist-gold mt-0.5" />
                <span>Nagtahan St., Sampaloc, City of Manila, 1008 Metro Manila, Philippines</span>
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">Emergency Clinic Contact</h4>
              <p className="flex items-center gap-1.5 text-slate-400">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Trunkline: (02) 8716-6273 / Clinic Ext. 104</span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-400">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>clinic@earist.edu.ph</span>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} EARIST Manila Campus. All rights reserved.</p>
            <p className="font-medium">Clinic Management & Appointment Scheduling Portal v2.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
