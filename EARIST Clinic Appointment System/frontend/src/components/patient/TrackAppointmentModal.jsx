import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { TicketQRCode } from '../common/TicketQRCode';
import { RescheduleModal } from './RescheduleModal';
import { downloadICSFile } from '../../utils/calendar';
import {
  Search,
  Calendar,
  Clock,
  Stethoscope,
  MapPin,
  CheckCircle2,
  Printer,
  AlertCircle,
  FileText,
  ArrowRight,
  XCircle,
  QrCode
} from 'lucide-react';

export const TrackAppointmentModal = ({ isOpen, onClose, onReschedule, initialQuery = '' }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

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
    const reason = window.prompt(
      `Are you sure you want to cancel this clinic appointment (${appointment.reference_code})?\n\nOptional: Please state your reason for cancellation:`
    );
    if (reason === null) return; // User pressed Cancel

    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.appointment_id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: reason.trim() || 'Cancelled by patient' })
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

  const handleCheckIn = async () => {
    if (!appointment) return;
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/appointments/${encodeURIComponent(appointment.reference_code)}/check-in`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_number: appointment.id_number })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Check-in failed');
      }
      setAppointment(data.appointment);
      setActionNotice(data.message || 'Check-in successful! Please proceed to the clinic waiting area.');
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleRescheduleClick = () => {
    if (!appointment) return;
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSuccess = (updatedAppointment) => {
    setIsRescheduleOpen(false);
    setAppointment(updatedAppointment);
    setActionNotice(`Appointment successfully rescheduled to ${updatedAppointment.appointment_date} (${updatedAppointment.time_slot})!`);
  };

  return (
    <>
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
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. EAR-2026-A109, Student ID, or Email"
              required
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs shrink-0 flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
            {appointment.is_today && ['Approved', 'CheckedIn', 'OnGoing'].includes(appointment.status) && (
              <div
                className={`p-4 rounded-xl border text-sm ${
                  appointment.status === 'OnGoing'
                    ? 'bg-emerald-50 border-emerald-300'
                    : appointment.status === 'CheckedIn'
                    ? 'bg-teal-50 border-teal-300'
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
                ) : appointment.status === 'CheckedIn' ? (
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-teal-900 uppercase tracking-wider text-xs">
                        Checked In • Waiting in Clinic Lobby
                      </span>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        Your arrival is confirmed. Please take a seat outside Room {appointment.room_number || '101'}.
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

            {/* Prompt: Self Check-In if Scheduled Today and Not Yet Checked In */}
            {appointment.is_today && appointment.status === 'Approved' && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-teal-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Are you at the clinic reception area?
                  </h4>
                  <p className="text-xs text-teal-800 mt-0.5">
                    Confirm your physical arrival to join the doctor's active waiting room queue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {checkingIn ? 'Checking in...' : 'I Have Arrived (Self Check-In)'}
                </button>
              </div>
            )}

            {/* Schedule, Station & QR */}
            <div className="grid sm:grid-cols-3 gap-3 text-sm text-slate-700 items-center">
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

              {/* QR Code Pass */}
              <div className="p-2 rounded-xl bg-white border border-slate-200 flex justify-center items-center">
                <TicketQRCode 
                  value={appointment.reference_code}
                  size={85}
                  label="Scan at Clinic"
                />
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

            {/* Active Appointment Actions (Calendar, Reschedule & Cancel) */}
            {['Approved', 'CheckedIn'].includes(appointment.status) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => downloadICSFile(appointment)}
                  className="py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Add to Calendar
                </button>
                <button
                  type="button"
                  onClick={handleRescheduleClick}
                  className="py-2.5 rounded-xl text-xs font-bold text-earist-dark bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Reschedule Date / Time
                </button>
                <button
                  type="button"
                  onClick={handleCancelAppointment}
                  disabled={cancelling}
                  className="py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
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

    {/* Dedicated Reschedule Modal */}
    <RescheduleModal
      isOpen={isRescheduleOpen}
      onClose={() => setIsRescheduleOpen(false)}
      appointment={appointment}
      onRescheduleSuccess={handleRescheduleSuccess}
    />
  </>
);
};
