import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../common/Modal';
import { TicketQRCode } from '../common/TicketQRCode';
import { TurnstileWidget } from '../common/TurnstileWidget';
import { downloadICSFile, getGoogleCalendarUrl } from '../../utils/calendar';
import { formatDoctorName } from '../../utils/formatters';
import {
  Calendar,
  Clock,
  User,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Printer,
  Copy,
  GraduationCap,
  Briefcase,
  Building2,
  Zap,
  CalendarDays,
  Info,
  CalendarCheck,
  Mail,
  Send,
  KeyRound
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

export const DirectBookingWizard = ({ isOpen, onClose, onBookingSuccess, initialData = null }) => {
  const [step, setStep] = useState(1);
  const [patientType, setPatientType] = useState('student'); // 'student' | 'academic_non_academic' | 'outsource_extension'
  const [bookingMode, setBookingMode] = useState('urgent_today'); // 'urgent_today' | 'scheduled_later'
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Bot protection & Security challenge
  const [securityChallenge, setSecurityChallenge] = useState(null);
  const [botNum1, setBotNum1] = useState(4);
  const [botNum2, setBotNum2] = useState(3);
  const [botAnswerInput, setBotAnswerInput] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const turnstileRef = useRef(null);

  // Email OTP verification state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpNotice, setOtpNotice] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    patient_name: '',
    id_number: '',
    department: 'College of Computing Studies',
    course: '',
    year_section: '',
    age: '',
    gender: 'Male',
    address: '',
    contact_number: '',
    email: '',
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
  const [codeCopied, setCodeCopied] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotDetails, setSlotDetails] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateAvailableStatus, setDateAvailableStatus] = useState({ available: true, message: '' });

  // Categorized complaints & service requests matching EARIST Daily Clinic Visit Logsheet
  const studentComplaints = [
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

  const academicStaffRequests = [
    { label: 'Blood Pressure (BP) Monitoring', icon: '🩺' },
    { label: 'Facemask / Health Supplies Request', icon: '😷' },
    { label: 'Over-the-Counter Medicine Request', icon: '💊' },
    { label: 'Annual Medical Clearance / Physical', icon: '📋' },
    { label: 'General Physician Consultation', icon: '👨‍⚕️' },
    { label: 'Headache / Tension Relief', icon: '💆' }
  ];

  const outsourceRequests = [
    { label: 'First-Aid Treatment & Wound Dressing', icon: '🩹' },
    { label: 'Blood Pressure & Vitals Check', icon: '🩺' },
    { label: 'Immediate Workplace Injury Triage', icon: '🚨' },
    { label: 'General Health Consultation', icon: '👨‍⚕️' },
    { label: 'Fever / Headache Relief Medication', icon: '💊' }
  ];

  const activeComplaintOptions =
    patientType === 'student'
      ? studentComplaints
      : patientType === 'outsource_extension'
      ? outsourceRequests
      : academicStaffRequests;

  const departmentsByCat = {
    student: [
      'College of Computing Studies',
      'College of Arts and Sciences',
      'College of Business and Public Administration',
      'College of Hospitality and Tourism Management',
      'College of Engineering',
      'College of Education',
      'College of Industrial Technology',
      'College of Criminal Justice Education',
      'College of Architecture and Fine Arts',
      'Graduate School (GS)'
    ],
    academic_non_academic: [
      'College Faculty / Academic Department',
      'Office of the President (OP)',
      'Office of the Vice President for Academic Affairs (OVPAA)',
      'Office of the Vice President for Administration & Finance (OVPAF)',
      'Registrar & Admissions Services Office',
      'Human Resource Development & Management Office (HRDMO)',
      'Cashier & Accounting Division',
      'Student Affairs & Services Office (SASO)',
      'General Services & Physical Plant Division (GSO / PPD)',
      'Campus Security & Safety Directorate',
      'EARIST Health & Wellness Services / Clinic',
      'University Library & Learning Resources'
    ],
    outsource_extension: [
      'Campus Security Agency Personnel',
      'Campus Janitorial & Sanitation Services',
      'Physical Plant Maintenance Crew / Contractor',
      'EARIST Cavite Extension Campus Visiting Staff',
      'Accredited Canteen & Concessionaire Staff',
      'External University Guest / Contractor'
    ]
  };

  const currentDepartments = departmentsByCat[patientType] || departmentsByCat.student;

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
          if (data.doctors.length > 0 && !formData.assistant_id) {
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
    setFormData((prev) => ({
      ...prev,
      appointment_date: prev.appointment_date || todayStr
    }));

    // Auto-fill from initialData or localStorage
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        patient_name: initialData.patient_name || '',
        id_number: initialData.id_number || '',
        department: initialData.department || currentDepartments[0],
        course: initialData.course || '',
        year_section: initialData.year_section || '',
        contact_number: initialData.contact_number || '',
        email: initialData.email || '',
        service_type: initialData.service_type || 'General Medical Consultation',
        reason: initialData.reason || '',
        allergies: initialData.allergies || '',
        medical_history: initialData.medical_history || ''
      }));
      if (initialData.patient_type) {
        setPatientType(
          initialData.patient_type === 'faculty_staff'
            ? 'academic_non_academic'
            : initialData.patient_type
        );
      }
      setIsAutoFilled(true);
    } else {
      try {
        const saved = localStorage.getItem('earist_clinic_patient');
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData((prev) => ({
            ...prev,
            patient_name: parsed.patient_name || '',
            id_number: parsed.id_number || '',
            department: parsed.department || currentDepartments[0],
            course: parsed.course || '',
            year_section: parsed.year_section || '',
            age: parsed.age || '',
            gender: parsed.gender || 'Male',
            contact_number: parsed.contact_number || '',
            email: parsed.email || '',
            address: parsed.address || ''
          }));
          if (parsed.patient_type) {
            setPatientType(
              parsed.patient_type === 'faculty_staff'
                ? 'academic_non_academic'
                : parsed.patient_type
            );
          }
          setIsAutoFilled(true);
        }
      } catch (e) {}
    }
  }, [initialData]);

  const handleClearAutoFill = () => {
    localStorage.removeItem('earist_clinic_patient');
    setFormData({
      patient_name: '',
      id_number: '',
      department: currentDepartments[0],
      course: '',
      year_section: '',
      age: '',
      gender: 'Male',
      address: '',
      contact_number: '',
      email: '',
      symptoms: [],
      symptom_severity: 'Mild',
      allergies: '',
      medical_history: '',
      reason: '',
      assistant_id: doctors.length > 0 ? doctors[0].assistant_id : '',
      appointment_date: getTodayString(),
      time_slot: '09:00 AM - 09:30 AM',
      service_type: 'General Medical Consultation'
    });
    setIsAutoFilled(false);
  };

  // Check date availability & slots dynamically
  useEffect(() => {
    if (!formData.assistant_id || !formData.appointment_date) return;

    setLoadingSlots(true);
    setDateAvailableStatus({ available: true, message: '' });

    fetch(`/api/doctors/${formData.assistant_id}/check-date?date=${formData.appointment_date}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDateAvailableStatus({
            available: data.is_available,
            message: data.message
          });

          if (data.is_available) {
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

  const fetchSecurityChallenge = async () => {
    try {
      const res = await fetch('/api/appointments/security-challenge');
      const data = await res.json();
      if (data.success) {
        setSecurityChallenge(data);
      }
    } catch (err) {
      console.error('Failed to load security challenge:', err);
    }
  };

  useEffect(() => {
    if (isOpen && step === 4 && !securityChallenge) {
      fetchSecurityChallenge();
    }
  }, [isOpen, step, securityChallenge]);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleSendOtp = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid email address first.');
      return;
    }
    setOtpSending(true);
    setOtpNotice('');
    setErrorMessage('');
    try {
      const res = await fetch('/api/appointments/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch verification code.');
      }
      setOtpSent(true);
      setOtpCooldown(60);

      // Log verification code to the browser developer console
      console.log(
        '%c[EARIST Clinic] Verification OTP Code:',
        'color: #800020; font-size: 14px; font-weight: bold;'
      );
      console.log(
        `%c📧 Recipient: ${formData.email}  |  🔑 Code: ${data.otp_code || 'Sent'}`,
        'color: #059669; font-size: 13px; font-weight: bold; background: #ecfdf5; padding: 4px 8px; border-radius: 4px;'
      );

      if (data.otp_code) {
        setOtpNotice(`Verification code sent! (Console/Test Code: ${data.otp_code})`);
      } else {
        setOtpNotice(data.message || '6-digit verification code sent to your email.');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code received in your email.');
      return;
    }
    setVerifyingOtp(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/appointments/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp_code: otpCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification code failed.');
      }
      setIsEmailVerified(true);
      setOtpNotice('Email address verified successfully!');
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

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
            : patientType === 'academic_non_academic'
            ? 'Please enter your Employee / Faculty ID number.'
            : 'Please enter your Agency or Personnel ID number.'
        );
        return;
      }
      if (!formData.contact_number.trim()) {
        setErrorMessage('Please enter an active mobile phone number so the clinic can contact you.');
        return;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setErrorMessage('Please enter a valid email address so we can email your consultation ticket pass and reference code.');
        return;
      }
      if (!isEmailVerified) {
        setErrorMessage('Please verify your email address with the 6-digit code before proceeding to Complaints & Symptoms.');
        if (!otpSent) {
          handleSendOtp();
        }
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.symptoms.length === 0 && !formData.reason.trim()) {
        setErrorMessage('Please select what complaints/symptoms you have or describe your reason for consultation.');
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

    if (formData.email && !isEmailVerified) {
      setErrorMessage('Please complete email verification before confirming your consultation.');
      setStep(1);
      return;
    }

    if (!turnstileToken && !botAnswerInput.trim()) {
      setErrorMessage('Please complete the anti-bot verification check before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments/public-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_hp: honeypot,
          turnstile_token: turnstileToken,
          'cf-turnstile-response': turnstileToken,
          challenge_id: securityChallenge?.challenge_id || '',
          expires_at: securityChallenge?.expires_at || 0,
          signature: securityChallenge?.signature || '',
          bot_challenge_token: botNum1 + botNum2,
          bot_answer: botAnswerInput.trim(),
          otp_code: otpCode.trim(),
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
          email: formData.email.trim().toLowerCase(),
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

      // Save demographic info to localStorage for future visits
      try {
        localStorage.setItem(
          'earist_clinic_patient',
          JSON.stringify({
            patient_type: patientType,
            patient_name: formData.patient_name,
            id_number: formData.id_number,
            department: formData.department,
            course: formData.course,
            year_section: formData.year_section,
            age: formData.age,
            gender: formData.gender,
            contact_number: formData.contact_number,
            email: formData.email,
            address: formData.address
          })
        );
      } catch (e) {}

      setConfirmedTicket({
        reference_code: data.reference_code,
        appointment_date: formData.appointment_date,
        time_slot: formData.time_slot,
        doctor: doctors.find((d) => d.assistant_id === parseInt(formData.assistant_id, 10)),
        service: formData.service_type,
        patient_name: formData.patient_name,
        id_number: formData.id_number,
        patient_type: patientType,
        department: formData.department,
        email: formData.email.trim()
      });

      if (onBookingSuccess) onBookingSuccess(data.reference_code);
    } catch (err) {
      setErrorMessage(err.message);
      turnstileRef.current?.reset();
      setTurnstileToken('');
      fetchSecurityChallenge();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (confirmedTicket) {
      try {
        navigator.clipboard.writeText(confirmedTicket.reference_code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2500);
      } catch (e) {
        console.error('Clipboard error:', e);
      }
    }
  };

  const getCategoryLabel = (type) => {
    if (type === 'student') return 'EARIST Student';
    if (type === 'outsource_extension') return 'Outsource / Extension Personnel';
    return 'Academic / Non-Academic Personnel';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmedTicket(null);
        setStep(1);
        onClose();
      }}
      title={confirmedTicket ? 'EARIST Clinic Appointment Confirmed' : 'EARIST Clinic Appointment Booking'}
      subtitle={
        confirmedTicket
          ? 'Official consultation ticket pass for Manila Campus'
          : `Step ${step} of 4 — Direct booking for students, personnel & outsource units`
      }
      maxWidth="max-w-2xl"
    >
      {confirmedTicket ? (
        /* Confirmed Ticket Screen */
        <div className="space-y-5 text-center py-1">
          {/* Top Status Header */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200/80 shadow-xs mb-2.5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              OFFICIAL CLINIC TICKET PASS
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              Appointment Successfully Reserved!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1">
              Please present this verified pass or reference code at the clinic triage reception upon arrival.
            </p>
          </div>

          {/* Premium Boarding Pass Card */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm text-left transition-all">
            {/* Ticket Header Ribbon */}
            <div className="bg-gradient-to-r from-earist-dark via-earist-crimson to-earist-dark text-white px-5 sm:px-6 py-3 flex items-center justify-between border-b border-earist-dark">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <HeartPulse className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-widest uppercase text-amber-200">
                    EARIST Health Services Clinic
                  </div>
                  <div className="text-[10px] text-white/80 font-medium">
                    Manila Main Campus • Nagtahan, Sampaloc
                  </div>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-white/15 border border-white/20 text-white">
                Verified Priority Pass
              </span>
            </div>

            {/* Reference Code & One-Click Copy */}
            <div className="bg-slate-50/90 border-b border-slate-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Booking Reference Code
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-earist-dark tracking-wider select-all">
                  {confirmedTicket.reference_code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                  codeCopied
                    ? 'bg-emerald-600 text-white border border-emerald-600'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {codeCopied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Details Grid & Fast QR Stub */}
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-5 text-sm">
                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                    Patient Name:
                  </span>
                  <span className="font-bold text-slate-900 block leading-tight">
                    {confirmedTicket.patient_name}
                  </span>
                  <span className="text-slate-500 font-mono text-xs block mt-0.5">
                    {confirmedTicket.id_number}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                    Visitor Category:
                  </span>
                  <span className="font-bold text-slate-900 block leading-tight">
                    {getCategoryLabel(confirmedTicket.patient_type)}
                  </span>
                  <span className="text-slate-500 text-xs block mt-0.5 truncate">
                    {confirmedTicket.department}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                    Consultation Service:
                  </span>
                  <span className="font-bold text-earist-dark block leading-tight">
                    {confirmedTicket.service || 'General Medical Consultation'}
                  </span>
                  <span className="text-slate-500 text-xs block mt-0.5">
                    Standard Campus Care
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                    Station & Doctor:
                  </span>
                  <span className="font-bold text-slate-900 block leading-tight">
                    {formatDoctorName(confirmedTicket.doctor?.first_name, confirmedTicket.doctor?.last_name)}
                  </span>
                  <span className="text-slate-500 text-xs block mt-0.5">
                    {confirmedTicket.doctor?.room_number || 'Main Clinic Rm 101'}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                      Scheduled Arrival Window:
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {confirmedTicket.appointment_date} at {confirmedTicket.time_slot ? confirmedTicket.time_slot.split(' - ')[0] : ''}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Buffer: 15–30 min arrival
                  </span>
                </div>
              </div>

              {/* Fast-Check-in QR Code Stub */}
              <div className="flex flex-col items-center justify-center sm:border-l sm:border-dashed sm:border-slate-300 sm:pl-5 py-1">
                <TicketQRCode 
                  value={confirmedTicket.reference_code} 
                  size={105}
                  label="Scan at Triage Desk"
                />
              </div>
            </div>

            {/* Checklist / Reminder Bar */}
            <div className="bg-amber-50/70 border-t border-amber-200/70 px-5 py-2.5 text-xs text-amber-950 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Triage Reminder:</strong> Please present your physical EARIST Student ID or validated Registration Form (COR) upon arrival.
              </span>
            </div>
          </div>

          {confirmedTicket.email && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 font-medium flex items-center gap-2.5 text-left">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                An official confirmation pass and tracking reference code has been sent to <strong>{confirmedTicket.email}</strong>.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => downloadICSFile({
                reference_code: confirmedTicket.reference_code,
                patient_name: confirmedTicket.patient_name,
                id_number: confirmedTicket.id_number,
                appointment_date: confirmedTicket.appointment_date,
                time_slot: confirmedTicket.time_slot,
                service_type: confirmedTicket.service,
                doctor_first_name: confirmedTicket.doctor?.first_name,
                doctor_last_name: confirmedTicket.doctor?.last_name,
                room_number: confirmedTicket.doctor?.room_number
              })}
              className="py-3 px-3 rounded-xl text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Calendar className="w-4 h-4 text-amber-700" />
              Add to Calendar (.ics)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="py-3 px-3 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Clinic Pass
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmedTicket(null);
                setStep(1);
                onClose();
              }}
              className="py-3 px-3 rounded-xl text-xs sm:text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Stage Form */
        <div>
          {/* Progress Indicator (Adaptive Mobile & Desktop) */}
          <div className="mb-6 sm:mb-8 pb-4 sm:pb-5 border-b border-slate-200">
            {/* Mobile Native Progress Header */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-earist-crimson uppercase tracking-wider">
                  Step {step} of 4
                </span>
                <span className="font-semibold text-slate-600">
                  {step === 1 && 'Visitor Identification'}
                  {step === 2 && 'Complaints & Symptoms'}
                  {step === 3 && 'Doctor & Date'}
                  {step === 4 && 'Verification & Pass'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1.5 rounded-full overflow-hidden">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-full rounded-full transition-all duration-300 ${
                      step >= s ? 'bg-earist-crimson' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop Step Pills */}
            <div className="hidden sm:flex items-center justify-between text-sm">
              {[
                { num: 1, label: 'Visitor Type' },
                { num: 2, label: 'Complaints' },
                { num: 3, label: 'Schedule' },
                { num: 4, label: 'Confirm' }
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 font-bold ${
                    step === s.num
                      ? 'text-earist-crimson'
                      : step > s.num
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                      step === s.num
                        ? 'bg-earist-crimson text-white shadow-xs'
                        : step > s.num
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STAGE 1: Affiliation & Identification */}
          {step === 1 && (
            <div className="space-y-5">
              {isAutoFilled && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Welcome back, <strong>{formData.patient_name || 'student'}</strong>! Your information was auto-filled from your previous visit.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAutoFill}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Clear Info
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Visitor Classification (Daily Clinic Visit Logsheet) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPatientType('student');
                      setFormData((prev) => ({ ...prev, department: departmentsByCat.student[0] }));
                    }}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 font-bold text-sm transition-all text-left ${
                      patientType === 'student'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark shadow-xs ring-1 ring-earist-crimson'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${patientType === 'student' ? 'bg-earist-crimson text-white' : 'bg-red-50 text-earist-crimson'}`}>
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">Student</p>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">Enrolled students</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPatientType('academic_non_academic');
                      setFormData((prev) => ({ ...prev, department: departmentsByCat.academic_non_academic[0] }));
                    }}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 font-bold text-sm transition-all text-left ${
                      patientType === 'academic_non_academic' || patientType === 'faculty_staff'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark shadow-xs ring-1 ring-earist-crimson'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${patientType === 'academic_non_academic' || patientType === 'faculty_staff' ? 'bg-earist-crimson text-white' : 'bg-amber-50 text-amber-700'}`}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">Academic / Staff</p>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">Faculty & personnel</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPatientType('outsource_extension');
                      setFormData((prev) => ({ ...prev, department: departmentsByCat.outsource_extension[0] }));
                    }}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 font-bold text-sm transition-all text-left ${
                      patientType === 'outsource_extension'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark shadow-xs ring-1 ring-earist-crimson'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${patientType === 'outsource_extension' ? 'bg-earist-crimson text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">Outsource / Ext.</p>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">Contractors & units</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {patientType === 'student'
                      ? 'Student Full Name *'
                      : patientType === 'academic_non_academic'
                      ? 'Employee / Faculty Full Name *'
                      : 'Personnel / Visitor Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    required
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {patientType === 'student'
                      ? 'Student No. (e.g. 234-0000M) *'
                      : patientType === 'academic_non_academic'
                      ? 'Employee ID No. (e.g. FAC-2022-045) *'
                      : 'Agency / Personnel ID No. *'}
                  </label>
                  <input
                    type="text"
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    required
                    autoCapitalize="characters"
                    placeholder={
                      patientType === 'student'
                        ? '234-0000M'
                        : patientType === 'academic_non_academic'
                        ? 'FAC-2022-045'
                        : 'SEC-2024-012'
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson uppercase font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {patientType === 'student' ? 'College / Institute *' : 'Department / Assigned Unit *'}
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  >
                    {currentDepartments.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {patientType === 'student' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course</label>
                      <input
                        type="text"
                        value={formData.course}
                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                        placeholder="e.g. BSCpE"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year & Sec</label>
                      <input
                        type="text"
                        value={formData.year_section}
                        onChange={(e) => setFormData({ ...formData, year_section: e.target.value })}
                        placeholder="e.g. 3-B"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {patientType === 'academic_non_academic' ? 'Designation / Academic Rank' : 'Agency / Assignment'}
                    </label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      placeholder={
                        patientType === 'academic_non_academic'
                          ? 'e.g. Associate Professor / Admin Aide'
                          : 'e.g. Security Guard / Maintenance Tech'
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Age</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="20"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    required
                    placeholder="09XX-XXX-XXXX"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Email Address *</span>
                    <span className="text-xs text-earist-crimson font-medium">Ticket will be emailed</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (isEmailVerified) {
                        setIsEmailVerified(false);
                        setOtpSent(false);
                        setOtpCode('');
                        setOtpNotice('');
                      }
                    }}
                    required
                    placeholder="e.g. yourname@gmail.com or student@e-clinic.ragetech.dev"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
              </div>

              {/* Step 1 Email Authenticity & OTP Verification Gate */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Mail className="w-4 h-4 text-earist-crimson" />
                    <span>Email Authenticity Verification</span>
                  </div>
                  {isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                    </span>
                  ) : otpSent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Code Sent to Email
                    </span>
                  ) : null}
                </div>

                {isEmailVerified ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-emerald-300 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 font-mono">{formData.email}</p>
                        <p className="text-[11px] text-emerald-700 font-medium">Email authenticated. Consultation ticket pass will be delivered here.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailVerified(false);
                        setOtpSent(false);
                        setOtpCode('');
                        setOtpNotice('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      To prevent unauthorized reservations, please verify your email address before proceeding to Symptoms & Complaints:
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative flex-1">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 6-digit code"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm font-bold font-mono tracking-widest text-slate-900 placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                        />
                      </div>

                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpSending || !formData.email || !formData.email.includes('@')}
                          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white earist-gradient hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          {otpSending ? (
                            'Sending Code...'
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-earist-gold" />
                              Send Verification Code
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otpCode.length !== 6}
                            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                          >
                            {verifyingOtp ? (
                              'Checking...'
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verify Code
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpSending || otpCooldown > 0}
                            className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all cursor-pointer"
                          >
                            {otpCooldown > 0 ? `${otpCooldown}s` : 'Resend'}
                          </button>
                        </div>
                      )}
                    </div>

                    {otpNotice && (
                      <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {otpNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Next: Complaints & Reason for Visit
                  <ChevronRight className="w-4 h-4 text-earist-gold" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: Health Triage & Complaints */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Complaints & Health Concerns (Select all that apply)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  This records your complaints into the official Daily Clinic Visit Logsheet.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {activeComplaintOptions.map((s, idx) => {
                    const active = formData.symptoms.includes(s.label);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleSymptom(s.label)}
                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all flex items-start gap-2.5 ${
                          active
                            ? 'border-earist-crimson bg-red-50 text-earist-dark font-bold shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg">{s.icon}</span>
                        <span className="leading-snug">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Severity / Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { level: 'Mild', desc: 'Can continue classes/duties' },
                    { level: 'Moderate', desc: 'Needs clinic rest or meds' },
                    { level: 'Severe', desc: 'Urgent medical triage' }
                  ].map((sev) => (
                    <button
                      key={sev.level}
                      type="button"
                      onClick={() => setFormData({ ...formData, symptom_severity: sev.level })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.symptom_severity === sev.level
                          ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-bold">{sev.level}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sev.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Specific Details / Description of Complaints
                </label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Experiencing throbbing headache and slight fever since morning lecture..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Known Drug Allergies</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Aspirin, None"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pre-existing Medical History</label>
                  <input
                    type="text"
                    value={formData.medical_history}
                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                    placeholder="e.g. Asthma, Hypertension, None"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
              </div>

              <div className="flex gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-2/3 py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Next: Choose Schedule & Doctor
                  <ChevronRight className="w-4 h-4 text-earist-gold" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: Schedule & Doctor Selection */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Select Consultation Service Type
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                >
                  <option value="General Medical Consultation">General Medical Consultation</option>
                  <option value="Annual Dental Cleaning & Oral Checkup">Annual Dental Cleaning & Oral Checkup</option>
                  <option value="Campus Health Physical Clearance">Campus Health Physical Clearance</option>
                  <option value="Vaccination & Immunization">Vaccination & Immunization</option>
                  <option value="Emergency First Aid Assessment">Emergency First Aid Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Select Attending Medical Officer / Station
                </label>
                <div className="space-y-2.5">
                  {doctors.map((doc) => {
                    const isSelected = parseInt(formData.assistant_id, 10) === doc.assistant_id;
                    const isOnDuty = doc.is_on_duty === 1;
                    return (
                      <button
                        key={doc.assistant_id}
                        type="button"
                        onClick={() => setFormData({ ...formData, assistant_id: doc.assistant_id })}
                        className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-earist-crimson bg-red-50 shadow-xs ring-1 ring-earist-crimson'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 text-earist-crimson flex items-center justify-center font-bold">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {formatDoctorName(doc.first_name, doc.last_name)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {doc.specialization} • {doc.room_number || 'Room 101'}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isOnDuty ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-600" />
                              ON DUTY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              OFF DUTY
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Booking Mode Selector */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  When do you need medical consultation?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingMode('urgent_today');
                      setFormData((prev) => ({ ...prev, appointment_date: getTodayString() }));
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      bookingMode === 'urgent_today'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark ring-1 ring-earist-crimson shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`p-1.5 rounded-lg ${bookingMode === 'urgent_today' ? 'bg-earist-crimson text-white' : 'bg-red-100 text-earist-crimson'}`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Right Now / Today's Earliest</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
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
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      bookingMode === 'scheduled_later'
                        ? 'border-earist-crimson bg-red-50 text-earist-dark ring-1 ring-earist-crimson shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`p-1.5 rounded-lg ${bookingMode === 'scheduled_later' ? 'bg-earist-crimson text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Schedule for Another Date</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      For routine checkups, dental cleaning, or medical clearance.
                    </p>
                  </button>
                </div>
              </div>

              {bookingMode === 'scheduled_later' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Select Consultation Date
                  </label>
                  <input
                    type="date"
                    min={getTodayString()}
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-between text-slate-700">
                  <span className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-earist-crimson" />
                    Appointment Date: <strong>Today ({formData.appointment_date})</strong>
                  </span>
                  <span className="text-xs bg-red-100 text-earist-crimson px-2.5 py-1 rounded-md font-bold uppercase">
                    Immediate Walk-In Triage
                  </span>
                </div>
              )}

              {/* Consultation Time Slots */}
              <div>
                {(() => {
                  const displayedSlots = filterUpcomingSlotsToday(availableSlots, formData.appointment_date);

                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-earist-crimson" />
                          Consultation Arrival / Start Time
                        </label>
                        {displayedSlots.length > 0 && (
                          <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {displayedSlots.length} Times Available (Max 5/slot)
                          </span>
                        )}
                      </div>

                      {!dateAvailableStatus.available ? (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                          <span>{dateAvailableStatus.message || 'This doctor is marked off-duty on this date. Please select another date.'}</span>
                        </div>
                      ) : loadingSlots ? (
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
                          Checking active consultation start times...
                        </div>
                      ) : displayedSlots.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                          <span>
                            {bookingMode === 'urgent_today'
                              ? 'No more upcoming slots remaining today. Please click "Schedule for Another Date".'
                              : 'All slots for this date are fully booked or blocked. Please pick another date.'}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
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
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  isFull
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-earist-dark text-white border-earist-crimson shadow-xs'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-extrabold">{startTimeOnly}</span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-earist-gold" />}
                                </div>
                                <div className="flex items-center justify-between gap-1 text-xs">
                                  <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                                    ~15–30m
                                  </span>
                                  {isFull ? (
                                    <span className="font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 uppercase">
                                      Full
                                    </span>
                                  ) : (
                                    <span
                                      className={`font-semibold px-2 py-0.5 rounded ${
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

              <div className="flex gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-2/3 py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Next: Review & Anti-Bot Check
                  <ChevronRight className="w-4 h-4 text-earist-gold" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: Anti-Bot Check & Confirmation */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-sm">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2.5 text-base">
                  Daily Clinic Visit Logsheet Preview
                </h4>
                <div className="grid grid-cols-2 gap-3.5 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase">Patient:</span>
                    <span className="font-bold text-slate-900">{formData.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase">ID Number:</span>
                    <span className="font-bold font-mono text-slate-900">{formData.id_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase">Category / Unit:</span>
                    <span className="font-medium text-slate-900">{getCategoryLabel(patientType)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase">Department:</span>
                    <span className="font-medium text-slate-900">{formData.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase">Date & Arrival Time:</span>
                    <span className="font-bold text-slate-900">
                      {formData.appointment_date} at {formData.time_slot ? formData.time_slot.split(' - ')[0] : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase">Reported Complaints:</span>
                    <span className="font-medium text-slate-900">
                      {formData.symptoms.length > 0 ? formData.symptoms.join(', ') : formData.reason || 'General Visit'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Patient Contact Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Email Authenticated & Ready
                    </p>
                    <p className="text-[11px] text-emerald-800 font-mono">
                      {formData.email} • {formData.contact_number}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified
                </span>
              </div>

              {/* Bot & Malicious Actor Filter */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    Anti-Bot & Human Verification
                  </div>
                  {!turnstileToken && (
                    <button
                      type="button"
                      onClick={fetchSecurityChallenge}
                      className="text-xs text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                    >
                      Refresh Question
                    </button>
                  )}
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  To protect public booking queues against automated spam, please complete the verification below:
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

                {/* Cloudflare Turnstile */}
                <div className="flex justify-center sm:justify-start">
                  <TurnstileWidget
                    ref={turnstileRef}
                    action="booking"
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      setErrorMessage('');
                    }}
                    onExpire={() => setTurnstileToken('')}
                    onError={() => {}}
                  />
                </div>

                {/* Fallback Math Challenge when Turnstile is pending/not verified */}
                {!turnstileToken && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <p className="text-[11px] text-amber-800 mb-2 font-medium">
                      Or solve the backup security challenge:
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900 font-mono bg-white px-3.5 py-2.5 rounded-lg border border-amber-300 shadow-xs">
                        {securityChallenge?.question || `${botNum1} + ${botNum2} = ?`}
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={botAnswerInput}
                        onChange={(e) => setBotAnswerInput(e.target.value)}
                        placeholder="Your answer"
                        className="w-36 px-3.5 py-2.5 rounded-lg border border-amber-300 text-base sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 py-3.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-3.5 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4 text-earist-gold" />
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
