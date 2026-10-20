import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Search, Calendar, Clock, Stethoscope, MapPin, CheckCircle2, Printer, AlertCircle, FileText } from 'lucide-react';

export const TrackAppointmentModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setAppointment(null);

    try {
      const res = await fetch(`/api/appointments/track/${encodeURIComponent(query.trim())}`);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Track Your Clinic Appointment & Medical Slip"
      subtitle="Enter your Reference Code (e.g. EAR-XXXX) or Student ID Number"
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. EAR-2026-A109 or 234-0000M"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson uppercase font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-xs shrink-0 flex items-center gap-1.5"
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

        {/* Appointment Ticket Result */}
        {appointment && (
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-earist-crimson bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {appointment.patient_type === 'student' ? 'Student Patient' : 'Faculty / Staff'}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 mt-1">
                  {appointment.patient_name}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {appointment.id_number} • {appointment.department} {appointment.year_section && `(${appointment.year_section})`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {appointment.reference_code}
                </span>
                <Badge status={appointment.status} className="mt-1" />
              </div>
            </div>

            {/* Schedule & Station */}
            <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Appointment Time</span>
                <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  {appointment.appointment_date}
                </div>
                <div className="text-slate-600 text-[11px] flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {appointment.time_slot}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Assigned Medical Station</span>
                <div className="font-bold text-earist-dark mt-0.5 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-earist-crimson" />
                  Dr. {appointment.doctor_first_name} {appointment.doctor_last_name}
                </div>
                <div className="text-slate-600 text-[11px] flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
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
                  className="mt-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Official Clearance Slip
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
