import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../common/Modal';
import {
  Calendar,
  Clock,
  User,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Printer,
  Copy,
  GraduationCap,
  Briefcase,
  Zap,
  CalendarDays,
  Timer,
  Info
} from 'lucide-react';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTomorrowString = () => {
  const d = new Date(Date.now() + 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const filterUpcomingSlotsToday = (slots, date) => {
  if (date !== getTodayString()) return slots;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.filter((slot) => {
    const startStr = slot.split(' - ')[0];
    const parts = startStr.trim().split(' ');
    if (parts.length < 2) return true;
    const [time, modifier] = parts;
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const slotMinutes = hours * 60 + (minutes || 0);

    // Allow 10 minute grace period for walk-in arrivals
    return slotMinutes >= currentMinutes - 10;
  });
};

export const DirectBookingWizard = ({ isOpen, onClose, onBookingSuccess }) => {
  const [step, setStep] = useState(1);
  const [patientType, setPatientType] = useState('student'); // 'student' | 'faculty_staff'
  const [bookingMode, setBookingMode] = useState('urgent_today'); // 'urgent_today' | 'scheduled_later'
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Bot protection challenge
  const [botNum1, setBotNum1] = useState(4);
  const [botNum2, setBotNum2] = useState(3);
  const [botAnswerInput, setBotAnswerInput] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    patient_name: '',
    id_number: '',
    department: 'College of Engineering (CEN)',
    course: '',
    year_section: '',
    age: '',
    gender: 'Male',
    address: '',
    contact_number: '',
    symptoms: [],
    symptom_severity: 'Mild',
    allergies: '',
    medical_history: '',
    reason: '',
    assistant_id: '',
    appointment_date: '',
    time_slot: '09:00 AM - 09:30 AM',
    service_type: 'General Medical Consultation'
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotDetails, setSlotDetails] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateAvailableStatus, setDateAvailableStatus] = useState({ available: true, message: '' });

  const symptomOptions = [
    { label: 'High Fever / Chills', icon: '🤒' },
    { label: 'Throbbing Headache / Migraine', icon: '🤕' },
    { label: 'Stomach Pain / Nausea / Vomiting', icon: '🤢' },
    { label: 'Asthma / Difficulty Breathing', icon: '😮‍💨' },
    { label: 'Severe Toothache / Gum Swelling', icon: '🦷' },
    { label: 'Heavy Cough & Colds', icon: '🤧' },
    { label: 'Dizziness / Vertigo / Fainting', icon: '💫' },
    { label: 'Physical Wound / Cut / Burn', icon: '🩹' },
    { label: 'Campus Athletic / OJT Clearance', icon: '📋' }
  ];

  const colleges = [
    'College of Engineering (CEN)',
    'College of Arts and Sciences (CAS)',
    'College of Business Administration (CBA)',
    'College of Education (CED)',
    'College of Hospitality and Tourism Management (CHTM)',
    'College of Architecture and Fine Arts (CAFA)',
    'College of Industrial Technology (CIT)',
    'College of Public Administration and Criminology (CPAC)',
    'EARIST Faculty & Administrative Staff'
  ];

  useEffect(() => {
    // Generate new bot challenge
    const n1 = Math.floor(Math.random() * 6) + 2;
    const n2 = Math.floor(Math.random() * 5) + 1;
    setBotNum1(n1);
    setBotNum2(n2);

    // Fetch doctors
    fetch('/api/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.doctors) {
          setDoctors(data.doctors);
          if (data.doctors.length > 0) {
            setFormData((prev) => ({
              ...prev,
              assistant_id: data.doctors[0].assistant_id
            }));
          }
        }
      })
      .catch((err) => console.error('Failed to load doctors:', err))
      .finally(() => setLoadingDoctors(false));

    // Default appointment date to today for immediate triage
    const todayStr = getTodayString();
    setFormData((prev) => ({ ...prev, appointment_date: todayStr }));
  }, [isOpen]);

  // Dynamically load active unbooked time slots for selected doctor and date
  useEffect(() => {
    if (!formData.assistant_id || !formData.appointment_date) return;

    setLoadingSlots(true);
    fetch(`/api/doctors/${formData.assistant_id}/available-slots?date=${formData.appointment_date}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (!data.is_available) {
            setDateAvailableStatus({ available: false, message: data.reason || 'Doctor is off-duty on this date.' });
            setAvailableSlots([]);
            setSlotDetails([]);
          } else {
            setDateAvailableStatus({ available: true, message: '' });
            const slots = data.available_slots || [];
            setAvailableSlots(slots);
            setSlotDetails(data.slot_details || []);
            const valid = filterUpcomingSlotsToday(slots, formData.appointment_date);
            if (valid.length > 0) {
              setFormData((prev) => ({
                ...prev,
                time_slot: valid.includes(prev.time_slot) ? prev.time_slot : valid[0]
              }));
            }
          }
        }
      })
      .catch((err) => console.error('Failed to load dynamic slots:', err))
      .finally(() => setLoadingSlots(false));
  }, [formData.assistant_id, formData.appointment_date]);

  const toggleSymptom = (s) => {
    setFormData((prev) => {
      const exists = prev.symptoms.includes(s);
      return {
        ...prev,
        symptoms: exists ? prev.symptoms.filter((item) => item !== s) : [...prev.symptoms, s]
      };
    });
  };

  const handleNext = () => {
    setErrorMessage('');
    if (step === 1) {
      if (!formData.patient_name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!formData.id_number.trim()) {
        setErrorMessage(
          patientType === 'student'
            ? 'Please enter your Student Number (e.g. 234-0000M).'
            : 'Please enter your Employee / Faculty ID number.'
        );
        return;
      }
      if (!formData.contact_number.trim()) {
        setErrorMessage('Please enter an active mobile phone number so the clinic can contact you.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.symptoms.length === 0 && !formData.reason.trim()) {
        setErrorMessage('Please select what symptoms you are feeling or describe your reason for consultation.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.appointment_date || !formData.assistant_id) {
        setErrorMessage('Please choose a consultation date and doctor station.');
        return;
      }
      if (!dateAvailableStatus.available) {
        setErrorMessage(dateAvailableStatus.message || 'The selected medical officer is off-duty on this date. Please choose another date.');
        return;
      }
      if (!formData.time_slot || availableSlots.length === 0) {
        setErrorMessage('No available consultation slots on this date. Please choose another date.');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Check bot answer
    if (parseInt(botAnswerInput.trim(), 10) !== botNum1 + botNum2) {
      setErrorMessage('Verification answer was incorrect. Please solve the simple math problem.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments/public-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_hp: honeypot,
          bot_challenge_token: botNum1 + botNum2,
          bot_answer: botAnswerInput.trim(),
          patient_type: patientType,
          patient_name: formData.patient_name,
          id_number: formData.id_number,
          department: formData.department,
          course: formData.course,
          year_section: formData.year_section,
          age: formData.age,
          gender: formData.gender,
          address: formData.address,
          contact_number: formData.contact_number,
          symptoms: formData.symptoms,
          symptom_severity: formData.symptom_severity,
          allergies: formData.allergies,
          medical_history: formData.medical_history,
          reason: formData.reason,
          assistant_id: formData.assistant_id,
          appointment_date: formData.appointment_date,
          time_slot: formData.time_slot,
          service_type: formData.service_type
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Booking submission failed.');
      }

      setConfirmedTicket({
        reference_code: data.reference_code,
        appointment_date: formData.appointment_date,
        time_slot: formData.time_slot,
        doctor: doctors.find((d) => d.assistant_id === parseInt(formData.assistant_id, 10)),
        service: formData.service_type,
        patient_name: formData.patient_name,
        id_number: formData.id_number
      });

      if (onBookingSuccess) onBookingSuccess(data.reference_code);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (confirmedTicket) {
      navigator.clipboard.writeText(confirmedTicket.reference_code);
      alert('Reference Code copied to clipboard: ' + confirmedTicket.reference_code);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmedTicket(null);
        setStep(1);
        onClose();
      }}
      title={confirmedTicket ? 'EARIST Clinic Appointment Confirmed!' : 'EARIST Clinic Appointment Booking'}
      subtitle={
        confirmedTicket
          ? 'Save your official consultation ticket pass'
          : `Step ${step} of 4 — Direct booking for students & campus personnel`
      }
      maxWidth="max-w-2xl"
    >
      {confirmedTicket ? (
        /* Confirmed Ticket Screen */
        <div className="space-y-6 text-center py-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              OFFICIAL CLINIC TICKET PASS
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-2">
              Appointment Successfully Reserved!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Please take note of your unique Reference Code. You can present this code at the clinic triage.
            </p>
          </div>

          {/* Reference Pass Card */}
          <div className="border-2 border-dashed border-earist-crimson/50 rounded-2xl p-6 bg-red-50/40 text-left space-y-4 relative">
            <div className="flex items-center justify-between border-b border-red-200/80 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Reference Code
                </span>
                <span className="text-2xl font-mono font-extrabold text-earist-dark tracking-wide">
                  {confirmedTicket.reference_code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                Copy Code
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Patient:</span>
                <span className="font-bold text-slate-900">{confirmedTicket.patient_name}</span>
                <span className="text-slate-500 block font-mono text-[11px]">{confirmedTicket.id_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Service Type:</span>
                <span className="font-bold text-slate-900">{confirmedTicket.service}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Scheduled Date & Arrival Time:</span>
                <span className="font-bold text-slate-900">
                  {confirmedTicket.appointment_date} at {confirmedTicket.time_slot ? confirmedTicket.time_slot.split(' - ')[0] : ''}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  (Estimated 15–30 min consultation buffer)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Station & Doctor:</span>
                <span className="font-bold text-earist-dark">
                  Dr. {confirmedTicket.doctor?.first_name} {confirmedTicket.doctor?.last_name}
                </span>
                <span className="text-slate-500 block text-[11px]">
                  {confirmedTicket.doctor?.room_number || 'Main Clinic Rm 101'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Clinic Pass
            </button>
            <button
              onClick={() => {
                setConfirmedTicket(null);
                setStep(1);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
            >
              Done & Close
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Stage Form */
        <div>
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 text-xs">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Symptoms' },
              { num: 3, label: 'Schedule' },
              { num: 4, label: 'Confirm' }
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 font-bold ${
                  step === s.num
                    ? 'text-earist-crimson'
                    : step > s.num
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === s.num
                      ? 'bg-earist-crimson text-white shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STAGE 1: Affiliation & Identification */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Who is this consultation for?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPatientType('student')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-xs transition-all ${
                      patientType === 'student'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-earist-crimson" />
                    <span>EARIST Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientType('faculty_staff')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-xs transition-all ${
                      patientType === 'faculty_staff'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    <span>Faculty / Staff / Prof</span>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {patientType === 'student' ? 'Student Full Name *' : 'Employee Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {patientType === 'student' ? 'Student No. (e.g. 234-0000M) *' : 'Employee ID No. *'}
                  </label>
                  <input
                    type="text"
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    required
                    placeholder={patientType === 'student' ? '234-0000M' : 'FAC-2022-045'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson uppercase font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">College / Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  >
                    {colleges.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {patientType === 'student' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                      <input
                        type="text"
                        value={formData.course}
                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                        placeholder="e.g. BSCpE"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Year & Sec</label>
                      <input
                        type="text"
                        value={formData.year_section}
                        onChange={(e) => setFormData({ ...formData, year_section: e.target.value })}
                        placeholder="e.g. 3-B"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Role</label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      placeholder="e.g. Associate Professor"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="20"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    required
                    placeholder="0917-123-4567"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Present Address / Manila Residence</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Nagtahan, Sampaloc, Manila"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
              >
                Next: What are you feeling?
                <ChevronRight className="w-4 h-4 text-earist-gold" />
              </button>
            </div>
          )}

          {/* STAGE 2: Health Triage & Symptoms */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  What are you feeling right now? (Select all that apply)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Take your time. This helps clinic nurses prepare the proper medical station.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {symptomOptions.map((s, idx) => {
                    const active = formData.symptoms.includes(s.label);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleSymptom(s.label)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2 ${
                          active
                            ? 'border-earist-crimson bg-red-50 text-earist-dark font-bold shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base">{s.icon}</span>
                        <span className="leading-tight">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Symptom Severity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { level: 'Mild', desc: 'Can attend classes' },
                    { level: 'Moderate', desc: 'Needs rest & medication' },
                    { level: 'Severe', desc: 'Urgent clinic attention' }
                  ].map((sev) => (
                    <button
                      key={sev.level}
                      type="button"
                      onClick={() => setFormData({ ...formData, symptom_severity: sev.level })}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        formData.symptom_severity === sev.level
                          ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold">{sev.level}</p>
                      <p className="text-[10px] text-slate-500">{sev.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Describe your symptoms in your own words
                </label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Started having sharp pain this morning after physical education class..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Known Drug Allergies</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Paracetamol, None"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pre-existing Medical History</label>
                  <input
                    type="text"
                    value={formData.medical_history}
                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                    placeholder="e.g. Asthma, High Blood, None"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-2/3 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
                >
                  Next: Choose Schedule & Doctor
                  <ChevronRight className="w-4 h-4 text-earist-gold" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: Schedule & Doctor Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Consultation Type
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                >
                  <option value="General Medical Consultation">General Medical Consultation</option>
                  <option value="Annual Dental Cleaning & Oral Checkup">Annual Dental Cleaning & Oral Checkup</option>
                  <option value="Campus Health Physical Clearance">Campus Health Physical Clearance</option>
                  <option value="Vaccination & Immunization">Vaccination & Immunization</option>
                  <option value="Emergency First Aid Assessment">Emergency First Aid Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Attending Medical Staff / Station
                </label>
                <div className="space-y-2">
                  {doctors.map((doc) => {
                    const isSelected = parseInt(formData.assistant_id, 10) === doc.assistant_id;
                    const isOnDuty = doc.is_on_duty === 1;
                    return (
                      <button
                        key={doc.assistant_id}
                        type="button"
                        onClick={() => setFormData({ ...formData, assistant_id: doc.assistant_id })}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-earist-crimson bg-red-50 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-red-100 text-earist-crimson flex items-center justify-center font-bold">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              Dr. {doc.first_name} {doc.last_name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {doc.specialization} • {doc.room_number || 'Room 101'}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isOnDuty ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ON DUTY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              OFF DUTY
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Booking Mode Selector (Option 1: Right Now / Today vs Option 2: Schedule for Later Date) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  When do you need medical consultation?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('urgent_today');
                      setFormData((prev) => ({ ...prev, appointment_date: getTodayString() }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      bookingMode === 'urgent_today'
                        ? 'border-earist-crimson bg-red-50/70 text-earist-dark ring-2 ring-earist-crimson/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${bookingMode === 'urgent_today' ? 'bg-earist-crimson text-white' : 'bg-red-100 text-earist-crimson'}`}>
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">Right Now / Today's Earliest</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      For acute sickness needing walk-in care today. Scans upcoming times today.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('scheduled_later');
                      if (formData.appointment_date === getTodayString()) {
                        setFormData((prev) => ({ ...prev, appointment_date: getTomorrowString() }));
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      bookingMode === 'scheduled_later'
                        ? 'border-earist-crimson bg-red-50/70 text-earist-dark ring-2 ring-earist-crimson/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${bookingMode === 'scheduled_later' ? 'bg-earist-crimson text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <CalendarDays className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">Schedule for Another Date</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      For routine checkups, dental cleaning, or medical clearance.
                    </p>
                  </button>
                </div>
              </div>

              {/* Consultation Date Selection (Shown if scheduling for later or custom date) */}
              {bookingMode === 'scheduled_later' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Consultation Date
                  </label>
                  <input
                    type="date"
                    min={getTodayString()}
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between text-slate-700">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-earist-crimson" />
                    Appointment Date: <strong>Today ({formData.appointment_date})</strong>
                  </span>
                  <span className="text-[10px] bg-red-100 text-earist-crimson px-2 py-0.5 rounded font-bold uppercase">
                    Immediate Walk-In Triage
                  </span>
                </div>
              )}

              {/* Earliest Slot Highlight in Today Mode */}
              {(() => {
                const displayedSlots = filterUpcomingSlotsToday(availableSlots, formData.appointment_date);
                if (bookingMode === 'urgent_today' && displayedSlots.length > 0) {
                  const earliest = displayedSlots[0];
                  const earliestStart = earliest.split(' - ')[0];
                  const isEarliestSelected = formData.time_slot === earliest;
                  const earliestDetail = slotDetails.find((d) => d.slot === earliest);
                  const remaining = earliestDetail ? earliestDetail.remaining : 5;

                  return (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-earist-crimson text-white">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-earist-crimson uppercase tracking-wider block">
                            Next Available Arrival Today
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {earliestStart} • <span className="text-emerald-700">{remaining} of 5 slots open</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, time_slot: earliest })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                          isEarliestSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-red-300 text-earist-crimson hover:bg-red-50'
                        }`}
                      >
                        {isEarliestSelected ? '✓ Selected' : 'Select Earliest'}
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Consultation Start Time (Auto-calculated duration, user only picks start) */}
              <div>
                {(() => {
                  const displayedSlots = filterUpcomingSlotsToday(availableSlots, formData.appointment_date);

                  return (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-earist-crimson" />
                          Consultation Arrival / Start Time
                        </label>
                        {displayedSlots.length > 0 && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {displayedSlots.length} Times Available (Max 5/slot)
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 mb-2.5 flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Each consultation start time accommodates up to 5 patients before becoming full.</span>
                      </div>

                      {!dateAvailableStatus.available ? (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{dateAvailableStatus.message || 'This doctor is marked off-duty on this date. Please select another date.'}</span>
                        </div>
                      ) : loadingSlots ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 animate-pulse">
                          Checking active consultation start times...
                        </div>
                      ) : displayedSlots.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>
                            {bookingMode === 'urgent_today'
                              ? 'No more upcoming slots remaining today. Please click "Schedule for Another Date".'
                              : 'All slots for this date are fully booked or blocked. Please pick another date.'}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                          {displayedSlots.map((slot) => {
                            const startTimeOnly = slot.split(' - ')[0];
                            const isSelected = formData.time_slot === slot;
                            const detail = slotDetails.find((d) => d.slot === slot);
                            const remaining = detail ? detail.remaining : 5;
                            const isFull = remaining <= 0;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isFull}
                                onClick={() => setFormData({ ...formData, time_slot: slot })}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                  isFull
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-earist-dark text-white border-earist-crimson shadow-2xs scale-[1.01]'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-extrabold">{startTimeOnly}</span>
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-earist-gold" />}
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                    Est. 15–30m
                                  </span>
                                  {isFull ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 uppercase">
                                      Full
                                    </span>
                                  ) : remaining <= 2 ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      {remaining} left
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                                      }`}
                                    >
                                      {remaining}/5 open
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-2/3 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
                >
                  Next: Review & Anti-Bot Check
                  <ChevronRight className="w-4 h-4 text-earist-gold" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: Anti-Bot Check & Confirmation */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                  Appointment Summary Preview
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block font-medium">Patient:</span>
                    <span className="font-bold text-slate-800">{formData.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">ID Number:</span>
                    <span className="font-bold font-mono text-slate-800">{formData.id_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">College/Course:</span>
                    <span className="font-medium text-slate-800">{formData.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Date & Arrival Time:</span>
                    <span className="font-bold text-slate-900">
                      {formData.appointment_date} at {formData.time_slot ? formData.time_slot.split(' - ')[0] : 'None'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      (Approx. 15–30 min consultation buffer)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bot & Malicious Actor Filter */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Anti-Bot & Human Verification Check
                </div>
                <p className="text-[11px] text-amber-900/80">
                  To prevent malicious automated appointments and protect clinic queue integrity, please solve this quick question:
                </p>

                {/* Honeypot field (hidden from humans) */}
                <input
                  type="text"
                  name="website_hp"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800 font-mono bg-white px-3 py-1.5 rounded-lg border border-amber-300">
                    {botNum1} + {botNum2} = ?
                  </span>
                  <input
                    type="number"
                    value={botAnswerInput}
                    onChange={(e) => setBotAnswerInput(e.target.value)}
                    required
                    placeholder="Enter answer"
                    className="w-32 px-3 py-1.5 rounded-lg border border-amber-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-3 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-earist-gold" />
                      Generate Clinic Ticket Pass
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};
