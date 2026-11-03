import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Search, Calendar, Clock, Stethoscope, MapPin, CheckCircle2, Printer, AlertCircle, FileText, ArrowRight, XCircle } from 'lucide-react';

export const TrackAppointmentModal = ({ isOpen, onClose, onReschedule, initialQuery = '' }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const performSearch = async (targetQuery) => {
    const q = (targetQuery !== undefined ? targetQuery : query || '').trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setActionNotice('');
    setAppointment(null);

    try {
      const res = await fetch(`/api/appointments/track/${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No appointment found.');
      }
      setAppointment(data.appointment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    performSearch(query);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialQuery && initialQuery.trim()) {
        setQuery(initialQuery.trim());
        performSearch(initialQuery.trim());
      }
    } else {
      setError('');
      setActionNotice('');
    }
  }, [isOpen, initialQuery]);

  const handleCancelAppointment = async () => {
    if (!appointment) return;
    if (!window.confirm(`Are you sure you want to cancel this clinic appointment (${appointment.reference_code})?`)) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.appointment_id}/cancel`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        setAppointment((prev) => ({ ...prev, status: 'Cancelled' }));
        setActionNotice('Your clinic appointment has been cancelled.');
      } else {
        alert(data.message || 'Error cancelling appointment.');
      }
    } catch (err) {
      alert('Error cancelling appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleClick = () => {
    if (!appointment || !onReschedule) return;
    onReschedule(appointment);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setActionNotice('');
        onClose();
      }}
      title="Track Your Clinic Appointment & Medical Slip"
      subtitle="Enter your Reference Code (e.g. EAR-XXXX), ID Number, or Registered Email"
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. EAR-2026-A109, Student ID, or Registered Email"
              required
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs shrink-0 flex items-center gap-2 cursor-pointer transition-colors"
          >
            {loading ? 'Searching...' : 'Track Ticket'}
          </button>
        </form>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {actionNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Appointment Ticket Result */}
        {appointment && (
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/70 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-earist-crimson bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                  {appointment.patient_type === 'student'
                    ? 'Student'
                    : appointment.patient_type === 'outsource_extension'
                    ? 'Outsource / Extension'
                    : 'Academic / Non-Academic'}
                </span>
                <h4 className="text-lg font-bold text-slate-900 mt-2">
                  {appointment.patient_name}
                </h4>
                <p className="text-sm text-slate-500 font-mono mt-0.5">
                  ID: {appointment.id_number} • {appointment.department} {appointment.year_section && `(${appointment.year_section})`}
                </p>
                {appointment.email && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Email: {appointment.email}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-extrabold text-slate-900 block">
                  {appointment.reference_code}
                </span>
                <Badge status={appointment.status} className="mt-1" />
              </div>
            </div>

            {/* Live Queue Position Card (shown for today's active appointments) */}
            {appointment.is_today && ['Approved', 'OnGoing'].includes(appointment.status) && (
              <div
                className={`p-4 rounded-xl border text-sm ${
                  appointment.status === 'OnGoing'
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                {appointment.status === 'OnGoing' ? (
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-emerald-900 uppercase tracking-wider text-xs">
                        Now Serving Inside Consultation Room
                      </span>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        Dr. {appointment.doctor_first_name} {appointment.doctor_last_name} is actively consulting with you.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl earist-gradient text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-xs">
                        <span className="text-[10px] uppercase tracking-tighter text-amber-200">Queue</span>
                        <span className="text-lg font-extrabold leading-none">#{appointment.queue_position || 1}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                          Live Clinic Queue Position
                        </span>
                        <p className="text-sm text-slate-700 mt-0.5">
                          {appointment.patients_ahead === 0 ? (
                            <strong className="text-emerald-700">You are next in line! Please wait near {appointment.room_number || 'Room 101'}.</strong>
                          ) : (
                            <span>
                              <strong>{appointment.patients_ahead} patient{appointment.patients_ahead > 1 ? 's' : ''}</strong> ahead of you today (Est. wait: ~{appointment.patients_ahead * 15} mins)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule & Station */}
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs font-bold text-slate-400 block uppercase">Appointment Time</span>
                <div className="font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  {appointment.appointment_date}
                </div>
                <div className="text-slate-600 text-xs flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  {appointment.time_slot}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs font-bold text-slate-400 block uppercase">Assigned Medical Station</span>
                <div className="font-bold text-earist-dark mt-1 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-earist-crimson" />
                  Dr. {appointment.doctor_first_name} {appointment.doctor_last_name}
                </div>
                <div className="text-slate-600 text-xs flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {appointment.room_number || 'Main Clinic Rm 101'}
                </div>
              </div>
            </div>

            {/* Reported Symptoms */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Reported Symptoms</span>
              <p className="font-medium text-slate-800 mt-1">
                {appointment.symptoms || appointment.reason || 'General health consultation'}
              </p>
            </div>

            {/* Prescription & Medical Notes if Completed */}
            {appointment.status === 'Completed' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Clinical Diagnosis: {appointment.diagnosis || 'Patient cleared.'}
                </div>
                {appointment.prescription && (
                  <div className="text-emerald-950 font-medium pt-1 border-t border-emerald-200/80">
                    <p className="font-bold">Prescription (Rx): {appointment.prescription}</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Instructions: {appointment.dosage_instructions || 'Take as advised.'}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="mt-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Official Clearance Slip
                </button>
              </div>
            )}

            {/* Active Appointment Actions (Reschedule & Cancel) */}
            {appointment.status === 'Approved' && (
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleRescheduleClick}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-earist-dark bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  Reschedule Date / Time
                </button>
                <button
                  type="button"
                  onClick={handleCancelAppointment}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
