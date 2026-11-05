import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { FullAvailabilityCalendar } from '../components/doctor/FullAvailabilityCalendar';
import { WalkInModal } from '../components/doctor/WalkInModal';
import { PatientHistoryModal } from '../components/doctor/PatientHistoryModal';
import {
  Stethoscope,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Pill,
  RefreshCw,
  Power,
  Phone,
  GraduationCap,
  Briefcase,
  Building2,
  FileText,
  Search,
  Filter,
  FileSpreadsheet,
  UserPlus,
  History,
  Thermometer,
  HeartPulse
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user, token } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultationAppt, setConsultationAppt] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'logsheet' | 'availability'
  const [viewDetailsAppt, setViewDetailsAppt] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'student' | 'academic_non_academic' | 'outsource_extension'
  const [searchTerm, setSearchTerm] = useState('');
  const [showOffDutyModal, setShowOffDutyModal] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const inFlightRef = React.useRef(false);

  // Consultation Form
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [dosageInstructions, setDosageInstructions] = useState('');
  const [updating, setUpdating] = useState(false);

  // Vitals State in Consultation
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Walk-In and History Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [historyPatient, setHistoryPatient] = useState(null);

  const fetchDoctorData = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Queue
      const resQueue = await fetch('/api/appointments/queue', { headers });
      const dataQueue = await resQueue.json();
      if (dataQueue.success) {
        setQueue(dataQueue.queue || []);
        setLastSyncedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }

      // 2. Fetch Doctor Schedules & Duty status
      const resSched = await fetch('/api/doctors/my/schedules', { headers });
      const dataSched = await resSched.json();
      if (dataSched.success && dataSched.schedules) {
        setSchedules(dataSched.schedules);
        if (dataSched.doctor) {
          setIsOnDuty(dataSched.doctor.is_on_duty === 1);
        }
      } else {
        const assistantId = user?.assistant_id || user?.profile?.assistant_id;
        if (assistantId) {
          const resFallback = await fetch(`/api/doctors/${assistantId}/schedules`);
          const dataFallback = await resFallback.json();
          if (dataFallback.success && dataFallback.schedules) {
            setSchedules(dataFallback.schedules);
            if (dataFallback.doctor) {
              setIsOnDuty(dataFallback.doctor.is_on_duty === 1);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync doctor data:', err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    const interval = setInterval(fetchDoctorData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleDutyButtonClick = () => {
    if (isOnDuty) {
      setShowOffDutyModal(true);
    } else {
      executeDutyChange(true);
    }
  };

  const executeDutyChange = async (targetDuty) => {
    setTogglingDuty(true);
    try {
      const res = await fetch('/api/doctors/duty-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_on_duty: targetDuty })
      });
      const data = await res.json();
      if (data.success) {
        setIsOnDuty(data.is_on_duty === 1);
        setShowOffDutyModal(false);
      } else {
        alert(data.message || 'Error updating duty status');
      }
    } catch (err) {
      alert('Error updating duty status');
    } finally {
      setTogglingDuty(false);
    }
  };

  const updateStatus = async (appointmentId, newStatus) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchDoctorData();
      } else {
        alert(data.message || 'Error updating status');
      }
    } catch (err) {
      alert('Error updating patient status');
    }
  };

  const openConsultation = (appt) => {
    setConsultationAppt(appt);
    setDiagnosis(appt.diagnosis || '');
    setPrescription(appt.prescription || '');
    setDosageInstructions(appt.dosage_instructions || '');
    setBpSystolic(appt.bp_systolic !== null && appt.bp_systolic !== undefined ? appt.bp_systolic : '');
    setBpDiastolic(appt.bp_diastolic !== null && appt.bp_diastolic !== undefined ? appt.bp_diastolic : '');
    setTemperature(appt.temperature !== null && appt.temperature !== undefined ? appt.temperature : '');
    setPulseRate(appt.pulse_rate !== null && appt.pulse_rate !== undefined ? appt.pulse_rate : '');
    setSpo2(appt.spo2 !== null && appt.spo2 !== undefined ? appt.spo2 : '');
    setWeightKg(appt.weight_kg !== null && appt.weight_kg !== undefined ? appt.weight_kg : '');
  };

  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    if (!consultationAppt) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/appointments/${consultationAppt.appointment_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Completed',
          diagnosis: diagnosis.trim() || 'Clinically evaluated. Fit for campus activities.',
          prescription: prescription.trim() || 'None prescribed.',
          dosage_instructions: dosageInstructions.trim() || 'Follow general healthy habits.',
          bp_systolic: bpSystolic !== '' ? parseInt(bpSystolic, 10) : null,
          bp_diastolic: bpDiastolic !== '' ? parseInt(bpDiastolic, 10) : null,
          temperature: temperature !== '' ? parseFloat(temperature) : null,
          pulse_rate: pulseRate !== '' ? parseInt(pulseRate, 10) : null,
          spo2: spo2 !== '' ? parseInt(spo2, 10) : null,
          weight_kg: weightKg !== '' ? parseFloat(weightKg) : null
        })
      });

      const data = await res.json();
      if (data.success) {
        setConsultationAppt(null);
        fetchDoctorData();
      }
    } catch (err) {
      alert('Failed to complete consultation');
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadCsv = (cat = categoryFilter) => {
    const url = cat && cat !== 'all' ? `/api/doctors/export-logsheet?category=${cat}` : '/api/doctors/export-logsheet';
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export request failed');
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const catSuffix = cat !== 'all' ? `_${cat.toUpperCase()}` : '_ALL_VISITS';
        a.download = `EARIST_Daily_Clinic_Visit_Logsheet${catSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => {
        console.error('CSV export error:', err);
        alert('Could not export clinic logsheet. Please verify your connection.');
      });
  };

  const getCategoryLabel = (type) => {
    if (type === 'student') return 'Student';
    if (type === 'outsource_extension') return 'Outsource / Extension';
    return 'Academic / Non-Academic';
  };

  const getCategoryBadgeClass = (type) => {
    if (type === 'student') return 'bg-red-50 text-earist-crimson border-red-200';
    if (type === 'outsource_extension') return 'bg-slate-100 text-slate-800 border-slate-300';
    return 'bg-amber-50 text-amber-900 border-amber-300';
  };

  const filteredQueue = queue.filter((item) => {
    const matchCat =
      categoryFilter === 'all' ||
      item.patient_type === categoryFilter ||
      (categoryFilter === 'academic_non_academic' && item.patient_type === 'faculty_staff');
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (item.patient_name || '').toLowerCase().includes(q) ||
      (item.id_number || '').toLowerCase().includes(q) ||
      (item.reference_code || '').toLowerCase().includes(q) ||
      (item.department || '').toLowerCase().includes(q) ||
      (item.symptoms || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr === todayStr) return 'Today';
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === tomorrow) return 'Tomorrow';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // 1. Today's active consultations queue (today's scheduled arrivals)
  const todayQueue = filteredQueue
    .filter((item) => item.appointment_date <= todayStr && item.status !== 'Completed')
    .sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));

  // 2. Upcoming schedule (future dates)
  const upcomingQueue = filteredQueue
    .filter((item) => item.appointment_date > todayStr && item.status !== 'Completed')
    .sort((a, b) => (a.appointment_date || '').localeCompare(b.appointment_date || '') || (a.time_slot || '').localeCompare(b.time_slot || ''));

  // 3. Completed logsheet records
  const completedQueue = filteredQueue
    .filter((item) => item.status === 'Completed')
    .sort((a, b) => (b.appointment_date || '').localeCompare(a.appointment_date || ''));

  const profile = user?.profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#800020] border border-[#9e1b32] p-7 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isOnDuty ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-300 text-slate-900'
              }`}
            >
              {isOnDuty ? '● ON DUTY & ACCEPTING PATIENTS' : '○ OFF DUTY'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-emerald-300 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Live Sync (15s) • {lastSyncedTime}
            </span>
            <span className="text-xs text-amber-200">EARIST Medical Directorate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-sm text-amber-100/90 font-medium">
            Specialization: <strong className="text-white">{profile.specialization || 'Clinical Medicine'}</strong> •{' '}
            Station: <strong className="text-white">{profile.room_number || 'Main Clinic Rm 101'}</strong>
          </p>
        </div>

        {/* Duty Status Quick Toggle & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={() => setShowWalkInModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-white text-earist-dark hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
            title="Log Walk-In Patient Arrival (Immediate Triage)"
          >
            <UserPlus className="w-4 h-4 text-earist-crimson" />
            <span>+ Walk-In Patient</span>
          </button>
          <button
            onClick={handleDutyButtonClick}
            disabled={togglingDuty}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer ${
              isOnDuty
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnDuty ? 'Set to OFF DUTY' : 'Set to ON DUTY'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadCsv(categoryFilter)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-amber-950 transition-all shadow-xs cursor-pointer"
            title="Export Daily Clinic Visit Logsheet (Medical Services) to CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Logsheet (CSV)</span>
          </button>
          <button
            onClick={fetchDoctorData}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-white text-earist-dark shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Today's Consultations ({todayQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-white text-earist-dark shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Upcoming Schedule ({upcomingQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logsheet')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'logsheet'
              ? 'bg-white text-earist-dark shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>Completed Logsheet ({completedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'availability'
              ? 'bg-white text-earist-dark shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Duty & Availability</span>
        </button>
      </div>

      {/* Search & Filter Controls Bar */}
      {activeTab !== 'availability' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'logsheet' ? (
              <>
                <span className="text-xs font-bold text-slate-400 uppercase mr-1">Filter Visitor:</span>
                {[
                  { id: 'all', label: 'All Visits' },
                  { id: 'student', label: 'Students' },
                  { id: 'academic_non_academic', label: 'Academic / Staff' },
                  { id: 'outsource_extension', label: 'Outsource / Ext.' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      categoryFilter === tab.id
                        ? 'bg-earist-crimson text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {activeTab === 'today'
                    ? `Showing ${todayQueue.length} patient consultation(s) for today`
                    : `Showing ${upcomingQueue.length} upcoming scheduled appointment(s)`}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient, ID, or complaints..."
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson w-full sm:w-64"
              />
            </div>

            {activeTab === 'logsheet' && (
              <button
                type="button"
                onClick={() => handleDownloadCsv(categoryFilter)}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-amber-950 transition-colors shadow-xs cursor-pointer shrink-0"
                title={`Export ${categoryFilter === 'all' ? 'All Visits' : categoryFilter} Daily Clinic Visit Logsheet to CSV`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  Export Logsheet (
                  {categoryFilter === 'all'
                    ? 'All'
                    : categoryFilter === 'student'
                    ? 'Students'
                    : categoryFilter === 'outsource_extension'
                    ? 'Outsource'
                    : 'Staff'}
                  )
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <span className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-2 font-medium">Syncing consultation schedule...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Today's Active Consultations Queue */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              {todayQueue.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Patient Consultations Scheduled for Today</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    All of today's patients have been attended, or check the <strong>Upcoming Schedule</strong> tab to view reservations for future dates.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {todayQueue.map((appt) => {
                    const isOngoing = appt.status === 'OnGoing';
                    const isSevere = appt.symptom_severity === 'Severe';
                    const isStudent = appt.patient_type === 'student';
                    const isOutsource = appt.patient_type === 'outsource_extension';

                    return (
                      <div
                        key={appt.appointment_id}
                        className={`bg-white rounded-2xl border p-6 flex flex-col justify-between shadow-xs transition-all ${
                          isOngoing
                            ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/15'
                            : isSevere
                            ? 'border-rose-300 ring-2 ring-rose-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Header: Time Slot Pill & Reference Code */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                {appt.time_slot}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded">
                                Today
                              </span>
                              {appt.is_walkin === 1 && (
                                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                  Walk-In
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-bold text-earist-dark bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {appt.reference_code}
                            </span>
                          </div>

                          {/* Patient Identity */}
                          <div>
                            <div className="flex items-center gap-2">
                              {isStudent ? (
                                <GraduationCap className="w-5 h-5 text-earist-crimson shrink-0" />
                              ) : isOutsource ? (
                                <Building2 className="w-5 h-5 text-slate-700 shrink-0" />
                              ) : (
                                <Briefcase className="w-5 h-5 text-amber-700 shrink-0" />
                              )}
                              <h4 className="font-extrabold text-slate-900 text-lg leading-tight">
                                {appt.patient_name}
                              </h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                              <span className={`font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(appt.patient_type)}`}>
                                {getCategoryLabel(appt.patient_type)}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {appt.department} {appt.year_section && `(${appt.year_section})`}
                              </span>
                              <span className="font-mono text-slate-400">• ID: {appt.id_number}</span>
                            </div>
                          </div>

                          {/* Clinical Symptoms / Chief Complaint */}
                          <div className="pt-2 text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                Chief Complaint:
                              </span>
                              {appt.symptom_severity === 'Severe' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  Severe
                                </span>
                              )}
                              {appt.symptom_severity === 'Moderate' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Moderate
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-800 text-sm leading-snug">
                              {appt.symptoms || appt.reason || 'General Medical Consultation'}
                            </p>
                            {appt.reason && appt.reason !== appt.symptoms && (
                              <p className="text-xs text-slate-500 italic mt-0.5">
                                "{appt.reason}"
                              </p>
                            )}
                            {appt.allergies && appt.allergies !== 'None' && (
                              <p className="text-xs text-rose-700 font-bold pt-1">
                                ⚠️ Allergies: {appt.allergies}
                              </p>
                            )}
                          </div>

                          {/* Contact phone */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.contact_number}</span>
                            {appt.email && <span className="text-slate-400 truncate">• {appt.email}</span>}
                          </div>
                        </div>

                        {/* Context-Aware Actions for Today */}
                        <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2.5">
                          {appt.status === 'Approved' && (
                            <>
                              <button
                                onClick={() => updateStatus(appt.appointment_id, 'OnGoing')}
                                className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-[#800020] hover:bg-[#68001a] text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Stethoscope className="w-4 h-4" />
                                <span>Start Consultation</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setHistoryPatient({ idNumber: appt.id_number, patientName: appt.patient_name })}
                                className="px-3 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                                title="View Patient Clinic History"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline">History</span>
                              </button>
                              <button
                                onClick={() => setViewDetailsAppt(appt)}
                                className="px-4 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            </>
                          )}

                          {appt.status === 'OnGoing' && (
                            <>
                              <button
                                onClick={() => openConsultation(appt)}
                                className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Pill className="w-4 h-4" />
                                <span>Prescribe & Record Management</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setHistoryPatient({ idNumber: appt.id_number, patientName: appt.patient_name })}
                                className="px-3 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                                title="View Patient Clinic History"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline">History</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upcoming Schedule (Future Dates) */}
          {activeTab === 'upcoming' && (
            <div className="space-y-6">
              {upcomingQueue.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Upcoming Appointments in Schedule</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    New patient reservations for tomorrow and future dates will automatically appear here once scheduled.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingQueue.map((appt) => {
                    const isStudent = appt.patient_type === 'student';
                    const isOutsource = appt.patient_type === 'outsource_extension';

                    return (
                      <div
                        key={appt.appointment_id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-4">
                          {/* Header: Date & Time */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              {formatDisplayDate(appt.appointment_date)} • {appt.time_slot ? appt.time_slot.split(' - ')[0] : ''}
                            </span>
                            <span className="text-xs font-mono font-bold text-earist-dark bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {appt.reference_code}
                            </span>
                          </div>

                          {/* Patient Identity */}
                          <div>
                            <div className="flex items-center gap-2">
                              {isStudent ? (
                                <GraduationCap className="w-5 h-5 text-earist-crimson shrink-0" />
                              ) : isOutsource ? (
                                <Building2 className="w-5 h-5 text-slate-700 shrink-0" />
                              ) : (
                                <Briefcase className="w-5 h-5 text-amber-700 shrink-0" />
                              )}
                              <h4 className="font-extrabold text-slate-900 text-lg leading-tight">
                                {appt.patient_name}
                              </h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                              <span className={`font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(appt.patient_type)}`}>
                                {getCategoryLabel(appt.patient_type)}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {appt.department} {appt.year_section && `(${appt.year_section})`}
                              </span>
                              <span className="font-mono text-slate-400">• ID: {appt.id_number}</span>
                            </div>
                          </div>

                          {/* Reason / Complaint */}
                          <div className="pt-2 text-sm space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                              Reason for Consultation:
                            </span>
                            <p className="font-bold text-slate-800 text-sm leading-snug">
                              {appt.symptoms || appt.reason || 'General Medical Consultation'}
                            </p>
                          </div>

                          {/* Contact */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.contact_number}</span>
                            {appt.email && <span className="text-slate-400 truncate">• {appt.email}</span>}
                          </div>
                        </div>

                        {/* Actions: NO START BUTTON FOR FUTURE DATES */}
                        <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Arrival on {appt.appointment_date}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewDetailsAppt(appt)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          >
                            Patient Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Completed Clinic Visit Logsheet */}
          {activeTab === 'logsheet' && (
            <div className="space-y-6">
              {completedQueue.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Completed Records Matching Filter</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Consultations finished and recorded with management will appear in this logsheet archive.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedQueue.map((appt) => {
                    const isStudent = appt.patient_type === 'student';
                    const isOutsource = appt.patient_type === 'outsource_extension';

                    return (
                      <div
                        key={appt.appointment_id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-4">
                          {/* Header: Date & Time */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {appt.appointment_date} • {appt.time_slot ? appt.time_slot.split(' - ')[0] : ''}
                            </span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                              Completed
                            </span>
                          </div>

                          {/* Patient Identity */}
                          <div>
                            <div className="flex items-center gap-2">
                              {isStudent ? (
                                <GraduationCap className="w-5 h-5 text-earist-crimson shrink-0" />
                              ) : isOutsource ? (
                                <Building2 className="w-5 h-5 text-slate-700 shrink-0" />
                              ) : (
                                <Briefcase className="w-5 h-5 text-amber-700 shrink-0" />
                              )}
                              <h4 className="font-extrabold text-slate-900 text-lg leading-tight">
                                {appt.patient_name}
                              </h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                              <span className={`font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(appt.patient_type)}`}>
                                {getCategoryLabel(appt.patient_type)}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {appt.department}
                              </span>
                            </div>
                          </div>

                          {/* Complaints & Management Recorded */}
                          <div className="pt-2 text-xs space-y-2">
                            <div>
                              <span className="font-bold text-slate-400 uppercase tracking-wide block">
                                Complaints:
                              </span>
                              <p className="font-bold text-slate-800 text-sm mt-0.5">
                                {appt.symptoms || appt.reason || 'General Consultation'}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                              <span className="font-bold text-slate-500 uppercase tracking-wide block text-[10px]">
                                Clinical Management & Interventions:
                              </span>
                              <p className="font-semibold text-slate-900 mt-0.5">
                                {appt.prescription && appt.prescription !== 'None'
                                  ? `${appt.prescription} (${appt.diagnosis || 'Routine Check'})`
                                  : appt.diagnosis || 'Consultation Completed'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action: Review Slip */}
                        <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-xs font-mono text-slate-400 font-bold">
                            {appt.reference_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => openConsultation(appt)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          >
                            Review Evaluation Slip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 4: Full Availability Calendar */}
      {activeTab === 'availability' && (
        <FullAvailabilityCalendar
          schedules={schedules}
          onSchedulesUpdated={fetchDoctorData}
        />
      )}

      {/* Patient Full Details Read-Only Modal */}
      {viewDetailsAppt && (
        <Modal
          isOpen={!!viewDetailsAppt}
          onClose={() => setViewDetailsAppt(null)}
          title={`Patient Record — ${viewDetailsAppt.patient_name}`}
          subtitle={`Reference Code: ${viewDetailsAppt.reference_code}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Visitor Classification</span>
                <span className="font-bold text-slate-900">{getCategoryLabel(viewDetailsAppt.patient_type)}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">College / Department</span>
                <span className="font-bold text-slate-900">{viewDetailsAppt.department}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">ID Number</span>
                <span className="font-mono font-bold text-slate-900">{viewDetailsAppt.id_number}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Course & Section</span>
                <span className="font-bold text-slate-900">{[viewDetailsAppt.course, viewDetailsAppt.year_section].filter(Boolean).join(' - ') || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Contact Phone</span>
                <span className="font-bold text-slate-900">{viewDetailsAppt.contact_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Email Address</span>
                <span className="font-bold text-slate-900 truncate block">{viewDetailsAppt.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Age & Gender</span>
                <span className="font-bold text-slate-900">{viewDetailsAppt.age ? `${viewDetailsAppt.age} y/o` : 'N/A'} • {viewDetailsAppt.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Scheduled Arrival</span>
                <span className="font-bold text-earist-dark">{viewDetailsAppt.appointment_date} at {viewDetailsAppt.time_slot ? viewDetailsAppt.time_slot.split(' - ')[0] : ''}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Chief Complaints & Symptoms:</span>
                <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {viewDetailsAppt.symptoms || viewDetailsAppt.reason || 'General Health Consultation'}
                </p>
              </div>

              {viewDetailsAppt.reason && viewDetailsAppt.reason !== viewDetailsAppt.symptoms && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Patient Additional Notes:</span>
                  <p className="text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                    "{viewDetailsAppt.reason}"
                  </p>
                </div>
              )}

              {viewDetailsAppt.allergies && viewDetailsAppt.allergies !== 'None' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs">
                  ⚠️ Known Allergies: {viewDetailsAppt.allergies}
                </div>
              )}

              {viewDetailsAppt.medical_history && viewDetailsAppt.medical_history !== 'None' && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Medical History:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    {viewDetailsAppt.medical_history}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewDetailsAppt(null)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Consultation & Logsheet Management Modal */}
      {consultationAppt && (
        <Modal
          isOpen={!!consultationAppt}
          onClose={() => setConsultationAppt(null)}
          title={`Clinical Consultation — ${consultationAppt.patient_name}`}
          subtitle={`Daily Clinic Visit Logsheet • Ref: ${consultationAppt.reference_code}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleCompleteConsultation} className="space-y-5">
            {/* Patient Reported Complaints Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-1.5 text-slate-700">
              <span className="font-bold text-slate-400 text-xs uppercase block">
                Chief Complaints (Reported by Patient):
              </span>
              <p className="font-bold text-slate-900 text-base">{consultationAppt.symptoms}</p>
              {consultationAppt.allergies && consultationAppt.allergies !== 'None' && (
                <p className="text-rose-700 font-bold text-xs pt-1">
                  Allergies: {consultationAppt.allergies}
                </p>
              )}
            </div>

            {/* Structured Vital Signs Grid */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-earist-crimson" />
                  Clinical Vital Signs (Triage Record)
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryPatient({ idNumber: consultationAppt.id_number, patientName: consultationAppt.patient_name })}
                  className="text-xs font-bold text-earist-crimson hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Past Visits</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">BP (Systolic)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">BP (Diastolic)</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="36.8"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Heart Rate</label>
                  <input
                    type="number"
                    placeholder="75"
                    value={pulseRate}
                    onChange={(e) => setPulseRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">SpO₂ (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                  />
                </div>
              </div>

              {/* Vitals Clinical Alerts */}
              {(parseFloat(temperature) >= 37.8 || (parseInt(bpSystolic, 10) >= 140 || parseInt(bpDiastolic, 10) >= 90) || parseInt(spo2, 10) < 95) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {parseFloat(temperature) >= 37.8 && (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-200 text-xs font-bold flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-red-700" />
                      Fever Alert ({temperature}°C)
                    </span>
                  )}
                  {(parseInt(bpSystolic, 10) >= 140 || parseInt(bpDiastolic, 10) >= 90) && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-amber-700" />
                      Elevated Blood Pressure ({bpSystolic}/{bpDiastolic})
                    </span>
                  )}
                  {parseInt(spo2, 10) < 95 && (
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-purple-700" />
                      Hypoxemia Warning ({spo2}%)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Clinical Management & Interventions (Daily Logsheet Management) *
              </label>
              <textarea
                rows={2}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
                placeholder="e.g. Blood pressure checked: 120/80. Wound cleaned & dressed with betadine. Celecoxib 200mg issued. 30 mins rest in clinic bed."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                Prescription / Dispensed Medicines (e.g. Celecoxib, Mefenamic Acid, Paracetamol)
              </label>
              <textarea
                rows={2}
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="e.g. Celecoxib 200mg #2 tabs, Paracetamol 500mg, Oral Rehydration Salts..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Dosage & Post-Care Instructions
              </label>
              <textarea
                rows={2}
                value={dosageInstructions}
                onChange={(e) => setDosageInstructions(e.target.value)}
                placeholder="e.g. Take 1 capsule after meals as needed for pain. Maintain hydration and report back if symptoms persist."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setConsultationAppt(null)}
                className="w-1/3 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="w-2/3 py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {updating ? 'Saving...' : 'Discharge Patient & Record into Logsheet'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Off-Duty Confirmation Modal */}
      {showOffDutyModal && (
        <Modal
          isOpen={showOffDutyModal}
          onClose={() => setShowOffDutyModal(false)}
          title="Confirm Setting Station to Off-Duty"
          subtitle="EARIST Medical Attendance Protection"
        >
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-sm">
                <h4 className="font-bold text-amber-950">Are you sure you want to go OFF DUTY?</h4>
                <p className="text-amber-900/90 leading-relaxed">
                  Setting your status to <strong>Off Duty</strong> will immediately pause direct student appointments for your station and mark your clinic room as temporarily closed.
                </p>
                <div className="bg-amber-100/70 p-3 rounded-xl space-y-1 text-xs text-amber-950 font-medium">
                  <p>• Students and staff will not see your station available for booking.</p>
                  <p>• Existing appointments in your queue will remain intact.</p>
                  <p>• You can toggle back <strong>On Duty</strong> at any time.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOffDutyModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel / Keep On-Duty
              </button>
              <button
                type="button"
                disabled={togglingDuty}
                onClick={() => executeDutyChange(false)}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {togglingDuty ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    <span>Yes, Set to Off-Duty</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Acute Walk-In Intake Modal */}
      {showWalkInModal && (
        <WalkInModal
          isOpen={showWalkInModal}
          onClose={() => setShowWalkInModal(false)}
          currentDoctorId={user?.assistant_id || user?.profile?.assistant_id || 1}
          onSuccess={(createdAppt, serveImmediately) => {
            fetchDoctorData();
            if (serveImmediately) {
              openConsultation(createdAppt);
            }
          }}
        />
      )}

      {/* Patient Past Visit History Modal */}
      {historyPatient && (
        <PatientHistoryModal
          isOpen={!!historyPatient}
          onClose={() => setHistoryPatient(null)}
          idNumber={historyPatient.idNumber}
          patientName={historyPatient.patientName}
        />
      )}
    </div>
  );
};
