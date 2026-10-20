import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { FullAvailabilityCalendar } from '../components/doctor/FullAvailabilityCalendar';
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
  ToggleLeft,
  ToggleRight,
  Phone,
  GraduationCap,
  Briefcase
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user, token } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultationAppt, setConsultationAppt] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'availability'
  const [showOffDutyModal, setShowOffDutyModal] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);

  // Consultation Form
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [dosageInstructions, setDosageInstructions] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchDoctorData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Queue
      const resQueue = await fetch('/api/appointments/queue', { headers });
      const dataQueue = await resQueue.json();
      if (dataQueue.success) {
        setQueue(dataQueue.queue || []);
      }

      // 2. Fetch Doctor Schedules & Duty status via /api/doctors/my/schedules
      const resSched = await fetch('/api/doctors/my/schedules', { headers });
      const dataSched = await resSched.json();
      if (dataSched.success && dataSched.schedules) {
        setSchedules(dataSched.schedules);
        if (dataSched.doctor) {
          setIsOnDuty(dataSched.doctor.is_on_duty === 1);
        }
      } else {
        // Fallback using assistant_id
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
      console.error('Failed to fetch doctor dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, [token, user]);

  const handleDutyButtonClick = () => {
    if (isOnDuty) {
      // Opening confirmation info modal to prevent accidental misclicks
      setShowOffDutyModal(true);
    } else {
      // Turning ON duty directly
      executeDutyChange(true);
    }
  };

  const executeDutyChange = async (targetStatus) => {
    setTogglingDuty(true);
    try {
      const res = await fetch('/api/doctors/duty-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_on_duty: targetStatus })
      });
      const data = await res.json();
      if (data.success) {
        setIsOnDuty(targetStatus);
      } else {
        alert(data.message || 'Error updating duty status.');
      }
    } catch (err) {
      alert('Error updating duty status');
    } finally {
      setTogglingDuty(false);
      setShowOffDutyModal(false);
    }
  };

  const handleToggleDaySchedule = async (scheduleId, currentAvailable) => {
    const updated = !currentAvailable;
    try {
      await fetch(`/api/doctors/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_available: updated })
      });
      setSchedules((prev) =>
        prev.map((s) => (s.schedule_id === scheduleId ? { ...s, is_available: updated ? 1 : 0 } : s))
      );
    } catch (err) {
      alert('Error updating schedule slot.');
    }
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchDoctorData();
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
          dosage_instructions: dosageInstructions.trim() || 'Follow general healthy habits.'
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

  const profile = user?.profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-maroon p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isOnDuty ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-300 text-slate-800'
              }`}
            >
              {isOnDuty ? '● ON DUTY & ACCEPTING PATIENTS' : '○ OFF DUTY'}
            </span>
            <span className="text-xs text-amber-200">EARIST Medical Directorate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
            Specialization: <strong className="text-white">{profile.specialization || 'Clinical Medicine'}</strong> •{' '}
            Station: <strong className="text-white">{profile.room_number || 'Main Clinic Rm 101'}</strong>
          </p>
        </div>

        {/* Duty Status Quick Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={handleDutyButtonClick}
            disabled={togglingDuty}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isOnDuty
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnDuty ? 'Set to OFF DUTY' : 'Set to ON DUTY'}</span>
          </button>
          <button
            onClick={fetchDoctorData}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Navigation Tabs: Queue vs Availability Calendar */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-white text-earist-dark shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Patient Queue ({queue.filter((q) => q.status !== 'Completed').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('availability')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'availability'
              ? 'bg-white text-earist-dark shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>Duty & Availability Calendar</span>
        </button>
      </div>

      {/* TAB 1: Patient Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Active Consultation Queue
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Students and staff waiting for medical triage, examination, or clearance.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {queue.length} Total Registered
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <span className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 mt-2 font-medium">Loading queue data...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Patient Queue is Clear</h3>
              <p className="text-xs text-slate-500 mt-1">No pending or ongoing consultations at this time.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {queue.map((appt) => {
                const isOngoing = appt.status === 'OnGoing';
                const isSevere = appt.symptom_severity === 'Severe';
                return (
                  <motion.div
                    key={appt.appointment_id}
                    whileHover={{ y: -3 }}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs transition-all ${
                      isSevere
                        ? 'border-rose-400 ring-2 ring-rose-500/10 bg-rose-50/15'
                        : isOngoing
                        ? 'border-blue-400 ring-2 ring-blue-500/10 bg-blue-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-earist-dark bg-slate-100 px-2 py-0.5 rounded">
                          {appt.reference_code}
                        </span>
                        <Badge status={appt.status} />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          {appt.patient_type === 'student' ? (
                            <GraduationCap className="w-4 h-4 text-earist-crimson" />
                          ) : (
                            <Briefcase className="w-4 h-4 text-amber-600" />
                          )}
                          <h4 className="font-extrabold text-slate-900 text-base">
                            {appt.patient_name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          ID: <span className="font-mono text-slate-900 font-bold">{appt.id_number}</span> •{' '}
                          {appt.department} {appt.year_section && `(${appt.year_section})`}
                        </p>
                      </div>

                      {/* Symptoms & Severity Card */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 text-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-500 text-[10px] uppercase">Severity:</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSevere
                                ? 'bg-rose-100 text-rose-800'
                                : appt.symptom_severity === 'Moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {appt.symptom_severity || 'Mild'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 text-[10px] uppercase block">
                            Reported Symptoms:
                          </span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {appt.symptoms || appt.reason || 'General checkup'}
                          </p>
                        </div>
                        {appt.allergies && appt.allergies !== 'None' && (
                          <div className="pt-1 text-[11px] text-rose-700 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Allergies: {appt.allergies}
                          </div>
                        )}
                      </div>

                      {/* Contact & Schedule */}
                      <div className="text-xs space-y-1 text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>{appt.appointment_date}</span>
                          <span className="text-slate-400">•</span>
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{appt.time_slot}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{appt.contact_number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                      {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                        <div className="grid grid-cols-2 gap-2">
                          {appt.status !== 'OnGoing' ? (
                            <button
                              onClick={() => handleUpdateStatus(appt.appointment_id, 'OnGoing')}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                            >
                              Call Patient
                            </button>
                          ) : (
                            <span className="py-2 px-3 text-center text-xs font-bold text-blue-700 bg-blue-100 rounded-xl">
                              In Consultation
                            </span>
                          )}
                          <button
                            onClick={() => openConsultation(appt)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 transition-all shadow-xs"
                          >
                            Prescribe & End
                          </button>
                        </div>
                      )}
                      {appt.status === 'Completed' && (
                        <button
                          onClick={() => openConsultation(appt)}
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          View / Edit Medical Slip
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Full Monthly Availability & Time Slot Calendar */}
      {activeTab === 'availability' && (
        <FullAvailabilityCalendar token={token} user={user} />
      )}

      {/* Consultation Room Modal */}
      {consultationAppt && (
        <Modal
          isOpen={!!consultationAppt}
          onClose={() => setConsultationAppt(null)}
          title={`Clinical Examination & Prescription`}
          subtitle={`Patient: ${consultationAppt.patient_name} (${consultationAppt.id_number}) • Ref: ${consultationAppt.reference_code}`}
        >
          <form onSubmit={handleCompleteConsultation} className="space-y-4">
            {/* Student Reported Symptoms Review */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
              <span className="font-bold text-slate-400 text-[10px] uppercase block">
                Student's Chief Complaint:
              </span>
              <p className="font-bold text-slate-900">{consultationAppt.symptoms}</p>
              {consultationAppt.allergies && consultationAppt.allergies !== 'None' && (
                <p className="text-rose-700 font-bold text-[11px]">
                  Allergies: {consultationAppt.allergies}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Diagnosis & Triage Assessment *
              </label>
              <textarea
                rows={2}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
                placeholder="e.g. Acute tension headache secondary to eye fatigue; vital signs normal..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-emerald-600" />
                Prescription (Rx) Medications
              </label>
              <textarea
                rows={2}
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="e.g. Paracetamol 500mg, Oral Rehydration Salts, Cetirizine 10mg..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dosage & Administration Instructions
              </label>
              <textarea
                rows={2}
                value={dosageInstructions}
                onChange={(e) => setDosageInstructions(e.target.value)}
                placeholder="e.g. Take 1 tablet every 6 hours as needed for headache. Drink at least 2L of water daily."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConsultationAppt(null)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="w-2/3 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
              >
                {updating ? 'Saving...' : 'Discharge Patient & Generate Slip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Off-Duty Confirmation Info Modal (Avoid Misclicks) */}
      {showOffDutyModal && (
        <Modal
          isOpen={showOffDutyModal}
          onClose={() => setShowOffDutyModal(false)}
          title="Confirm Setting Station to Off-Duty"
          subtitle="EARIST Medical Attendance Protection"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-sm text-amber-950">Are you sure you want to go OFF DUTY?</h4>
                <p className="text-amber-800 leading-relaxed">
                  Setting your status to <strong>Off Duty</strong> will immediately pause direct student appointments for your station and mark your clinic room as temporarily closed.
                </p>
                <div className="bg-amber-100/60 p-2.5 rounded-xl space-y-1 text-amber-900 font-medium">
                  <p>• Students will not see your station available for booking.</p>
                  <p>• Existing appointments in your queue will remain intact.</p>
                  <p>• You can easily toggle back <strong>On Duty</strong> at any time.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOffDutyModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel / Keep On-Duty
              </button>
              <button
                type="button"
                disabled={togglingDuty}
                onClick={() => executeDutyChange(false)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {togglingDuty ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    <span>Yes, Set to Off-Duty</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
