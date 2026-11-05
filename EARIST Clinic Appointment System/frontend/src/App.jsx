import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PatientDashboard } from './pages/PatientDashboard';
import { DirectBookingWizard } from './components/patient/DirectBookingWizard';
import { TrackAppointmentModal } from './components/patient/TrackAppointmentModal';
import { UpdateBanner } from './components/common/UpdateBanner';
import {
  HeartPulse,
  MapPin,
  Mail,
  Phone,
  Home,
  CalendarCheck,
  Search,
  UserCheck,
  Shield,
  Stethoscope,
  User
} from 'lucide-react';

const MainApp = () => {
  const { user, loading, isAdmin, isDoctor, isPatient } = useAuth();
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login'
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [bookingInitialData, setBookingInitialData] = useState(null);
  const [trackInitialQuery, setTrackInitialQuery] = useState('');

  const handleOpenBooking = (initialData = null) => {
    setBookingInitialData(initialData);
    setIsBookingOpen(true);
  };

  const handleOpenTrack = (query = '') => {
    setTrackInitialQuery(typeof query === 'string' ? query : '');
    setIsTrackOpen(true);
  };

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
      <UpdateBanner />
      <Navbar
        currentTab={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenBooking={() => handleOpenBooking(null)}
        onOpenTrack={handleOpenTrack}
      />

      <main className="flex-1 pb-20 sm:pb-0">
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
              {!isAdmin && !isDoctor && <PatientDashboard />}
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
                  onOpenBooking={() => handleOpenBooking(null)}
                  onOpenTrack={handleOpenTrack}
                />
              )}
              {currentView === 'login' && (
                <LoginPage
                  onNavigate={(view) => setCurrentView(view)}
                  onOpenBooking={() => handleOpenBooking(null)}
                  onOpenTrack={handleOpenTrack}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Modals for Direct Booking and Ticket Tracking */}
      <DirectBookingWizard
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setBookingInitialData(null);
        }}
        onBookingSuccess={() => {}}
        initialData={bookingInitialData}
      />
      <TrackAppointmentModal
        isOpen={isTrackOpen}
        initialQuery={trackInitialQuery}
        onClose={() => {
          setIsTrackOpen(false);
          setTrackInitialQuery('');
        }}
        onReschedule={(apptData) => {
          setIsTrackOpen(false);
          setTrackInitialQuery('');
          handleOpenBooking(apptData);
        }}
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
                <span>clinic@e-clinic.ragetech.dev</span>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} EARIST Manila Campus. All rights reserved.</p>
            <p className="font-medium">Clinic Management & Appointment Scheduling Portal v2.0</p>
          </div>
        </div>
      </footer>
      {/* Native-Like Mobile Bottom Navigation Bar (App Dock) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-1.5 flex items-center justify-around sm:hidden select-none"
      >
        <button
          type="button"
          onClick={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'home' && !user ? 'text-earist-crimson font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenTrack('')}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-medium transition-all cursor-pointer"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Track Ticket</span>
        </button>

        {/* Elevated Center Booking Action Button */}
        <button
          type="button"
          onClick={() => handleOpenBooking(null)}
          className="-mt-5 w-14 h-14 rounded-full earist-gradient text-white flex flex-col items-center justify-center shadow-lg shadow-crimson-900/30 border-4 border-white active:scale-95 transition-transform cursor-pointer group"
          aria-label="Direct Clinic Booking"
        >
          <CalendarCheck className="w-6 h-6 text-earist-gold group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-extrabold text-amber-200 uppercase tracking-tighter">Book</span>
        </button>

        <a
          href="tel:0287166273"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-emerald-700 font-medium transition-all"
          title="Emergency Hotline"
        >
          <Phone className="w-5 h-5 mb-0.5 text-emerald-600" />
          <span className="text-[10px] tracking-tight">Clinic Dial</span>
        </a>

        {user ? (
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-earist-crimson font-bold cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-earist-crimson text-white text-[10px] font-bold flex items-center justify-center mb-0.5">
              {isAdmin ? 'A' : isDoctor ? 'Dr' : 'St'}
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-[50px]">{user.first_name}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentView('login')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'login' ? 'text-earist-crimson font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <UserCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Staff Login</span>
          </button>
        )}
      </nav>
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
