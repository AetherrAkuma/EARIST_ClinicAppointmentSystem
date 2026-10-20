import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Calendar,
  Clock,
  PlusCircle,
  FileText,
  Stethoscope,
  Sparkles,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Printer,
  ChevronRight,
  User,
  HeartPulse
} from 'lucide-react';

export const PatientDashboard = () => {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Booking Form State
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedService, setSelectedService] = useState('General Medical Consultation');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Time Slots
  const timeSlots = [
    '08:30 AM - 09:00 AM',
    '09:00 AM - 09:30 AM',
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:00 AM - 11:30 AM',
    '01:00 PM - 01:30 PM',
    '01:30 PM - 02:00 PM',
    '02:00 PM - 02:30 PM',
    '02:30 PM - 03:00 PM',
    '03:00 PM - 03:30 PM',
    '03:30 PM - 04:00 PM'
  ];

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (data.success) {
        setDoctors(data.doctors);
        if (data.doctors.length > 0) {
          setSelectedDoctorId(data.doctors[0].assistant_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    // Default tomorrow for booking date
    const tom = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setSelectedDate(tom);
    setSelectedSlot(timeSlots[0]);
  }, []);

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this clinic appointment?')) return;
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchAppointments();
      } else {
        alert(data.message || 'Could not cancel appointment.');
      }
    } catch (err) {
      alert('Error cancelling appointment.');
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingSubmitting(true);
    setBookingError('');

    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assistant_id: parseInt(selectedDoctorId, 10),
          appointment_date: selectedDate,
          time_slot: selectedSlot,
          service_type: selectedService,
          reason: reason.trim() || 'General consultation visit'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to book slot.');
      }

      setBookingSuccess(true);
      fetchAppointments();
      setTimeout(() => {
        setIsBookingOpen(false);
        setBookingSuccess(false);
        setBookingStep(1);
        setReason('');
      }, 1200);
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const profile = user?.profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Patient Greeting & Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-maroon p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
              Student Patient Portal
            </span>
            <span className="text-xs text-amber-200">EARIST Manila</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.first_name} {user?.last_name}!
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 font-medium max-w-xl">
            Student ID: <span className="font-mono text-white font-bold">{user?.id_number || '2023-XXXXX'}</span> •{' '}
            {profile.department || 'College Department'} • Blood: <span className="font-bold text-white">{profile.blood_type || 'O+'}</span>
          </p>
        </div>

        <button
          onClick={() => {
            setIsBookingOpen(true);
            setBookingStep(1);
            setBookingError('');
          }}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-earist-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-amber-950 shadow-lg shadow-amber-950/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          Schedule New Appointment
        </button>
      </motion.div>

      {/* Appointments Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-earist-crimson" />
              My Clinic Appointments
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review your upcoming consultations, doctor schedules, and clearance slips.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {appointments.length} Total Records
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <span className="inline-block w-8 h-8 border-3 border-earist-crimson border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 mt-2 font-medium">Loading clinic schedule...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <HeartPulse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No scheduled appointments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You currently have no pending or completed visits. Click the button below to reserve an appointment slot.
            </p>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-earist-gold" />
              Book Your First Visit
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {appointments.map((appt) => (
              <motion.div
                key={appt.appointment_id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      APPT #{appt.appointment_id}
                    </span>
                    <Badge status={appt.status} />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                      {appt.service_type}
                    </h4>
                    <p className="text-xs font-semibold text-earist-crimson flex items-center gap-1 mt-1">
                      <Stethoscope className="w-3.5 h-3.5 text-earist-crimson" />
                      {appt.doctor_first_name} {appt.doctor_last_name}
                      <span className="text-slate-400 font-normal">({appt.specialization})</span>
                    </p>
                  </div>

                  <div className="space-y-1.5 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-medium text-slate-900">{appt.appointment_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{appt.time_slot}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{appt.room_number || 'Main Clinic Rm 101'}</span>
                    </div>
                  </div>

                  {appt.reason && (
                    <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      "{appt.reason}"
                    </p>
                  )}

                  {/* Prescription Notice if Completed */}
                  {appt.status === 'Completed' && appt.prescription && (
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1 text-emerald-900">
                      <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Diagnosis: {appt.diagnosis || 'Fit to attend classes'}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Rx: {appt.prescription}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {appt.status === 'Completed' ? (
                    <button
                      onClick={() => setSelectedSlip(appt)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-earist-dark bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-700" />
                      View Clinic Clearance Slip
                    </button>
                  ) : ['Pending', 'Approved'].includes(appt.status) ? (
                    <button
                      onClick={() => handleCancel(appt.appointment_id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Appointment
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Status archived
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Wizard Modal */}
      <Modal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        title="Book Clinic Appointment"
        subtitle="Step-by-step campus consultation booking"
      >
        {bookingSuccess ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Appointment Confirmed!</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your consultation request is registered. Please arrive 10 minutes before your slot.
            </p>
          </div>
        ) : (
          <form onSubmit={handleBookSubmit} className="space-y-5">
            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Step 1: Service & Doctor */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Consultation Service
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'General Medical Consultation',
                      'Annual Dental Cleaning',
                      'Medical Physical Clearance',
                      'Vaccination & Immunization'
                    ].map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => setSelectedService(srv)}
                        className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                          selectedService === srv
                            ? 'border-earist-crimson bg-red-50 text-earist-dark shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Attending Doctor / Clinic Assistant
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  >
                    {doctors.map((doc) => (
                      <option key={doc.assistant_id} value={doc.assistant_id}>
                        Dr. {doc.first_name} {doc.last_name} — {doc.specialization} ({doc.room_number})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:opacity-95 shadow-md shadow-red-950/20 flex items-center justify-center gap-2 mt-4"
                >
                  Proceed to Schedule & Slot
                  <ChevronRight className="w-4 h-4 text-earist-gold" />
                </button>
              </div>
            )}

            {/* Step 2: Date & Available Slots */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferred Appointment Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Available Time Slots (30 Mins Each)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          selectedSlot === slot
                            ? 'bg-earist-dark text-white border-earist-crimson shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chief Complaint / Purpose of Visit
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly state symptoms or clinical reason for appointment..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-2/3 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md shadow-red-950/20 flex items-center justify-center gap-2"
                  >
                    {bookingSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Clearance Slip Modal */}
      {selectedSlip && (
        <Modal
          isOpen={!!selectedSlip}
          onClose={() => setSelectedSlip(null)}
          title="EARIST Clinic Clearance Slip"
          subtitle="Official campus medical consultation record"
        >
          <div className="space-y-6">
            <div className="border-2 border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4 print:border-black">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b border-slate-200">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Republic of the Philippines
                </p>
                <h4 className="font-extrabold text-base text-earist-dark">
                  Eulogio "Amang" Rodriguez Institute of Science and Technology
                </h4>
                <p className="text-xs text-slate-600">Health and Wellness Services • Nagtahan, Manila</p>
                <div className="mt-2 inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold">
                  MEDICAL / DENTAL CLEARANCE CERTIFICATE
                </div>
              </div>

              {/* Patient Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Patient Name:</span>
                  <span className="font-bold text-slate-900">
                    {user?.first_name} {user?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Student / Staff ID:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {user?.id_number || '2023-10492-MN-0'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">College Department:</span>
                  <span className="font-bold text-slate-900">
                    {profile.department || 'College of Engineering'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date & Time of Consultation:</span>
                  <span className="font-bold text-slate-900">
                    {selectedSlip.appointment_date} ({selectedSlip.time_slot})
                  </span>
                </div>
              </div>

              {/* Diagnosis and Rx */}
              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Clinical Diagnosis / Remarks:</span>
                  <p className="font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                    {selectedSlip.diagnosis || 'Patient clinically evaluated. Fit for campus activities.'}
                  </p>
                </div>
                {selectedSlip.prescription && (
                  <div>
                    <span className="text-slate-400 block font-medium">Prescription (Rx) & Dosage Instructions:</span>
                    <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200 text-emerald-950 font-medium">
                      <p className="font-bold text-emerald-900">{selectedSlip.prescription}</p>
                      <p className="text-[11px] text-emerald-800 mt-1">{selectedSlip.dosage_instructions}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Doctor Sign-off */}
              <div className="pt-6 text-right">
                <div className="inline-block text-center border-t border-slate-400 pt-1 px-8">
                  <p className="text-xs font-bold text-slate-900">
                    {selectedSlip.doctor_first_name} {selectedSlip.doctor_last_name}, M.D. / D.M.D.
                  </p>
                  <p className="text-[10px] text-slate-500">Attending Campus Medical Officer</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-earist-gold" />
              Print Official Certificate
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
