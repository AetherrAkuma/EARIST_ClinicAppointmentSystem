import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Clock,
  Calendar,
  FileText,
  Pill,
  Stethoscope,
  Activity,
  AlertCircle,
  Thermometer,
  HeartPulse,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const PatientHistoryModal = ({ isOpen, onClose, idNumber, patientName }) => {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && idNumber) {
      fetchHistory();
    }
  }, [isOpen, idNumber]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/appointments/patient-history/${encodeURIComponent(idNumber)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not load patient history.');
      }
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch clinic history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Clinical History — ${patientName || 'Patient Record'}`}
      subtitle={`Student / Employee ID: ${idNumber || 'N/A'}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
        {/* Header Stats */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
            <UserCheck className="w-4 h-4 text-earist-crimson" />
            <span>ID: <strong className="font-mono text-slate-900">{idNumber}</strong></span>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-earist-crimson">
            {history.length} {history.length === 1 ? 'Recorded Visit' : 'Recorded Visits'}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-earist-crimson border-t-transparent rounded-full mx-auto" />
            <p className="text-xs font-medium">Retrieving medical archives...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No previous clinic consultations recorded.</p>
            <p className="text-xs text-slate-400">This patient has no completed prior appointments in the digital archives.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {history.map((record) => {
              const hasVitals =
                record.bp_systolic ||
                record.temperature ||
                record.pulse_rate ||
                record.spo2;

              return (
                <div
                  key={record.appointment_id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs space-y-3 transition-colors"
                >
                  {/* Top Bar: Date & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {record.appointment_date}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {record.time_slot ? record.time_slot.split(' - ')[0] : ''}
                        </span>
                        {record.is_walkin === 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                            Walk-In
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Attended by: <strong className="text-earist-dark">Dr. {record.doctor_first_name} {record.doctor_last_name}</strong> ({record.room_number || 'Rm 101'})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{record.reference_code}</span>
                      <Badge status={record.status} />
                    </div>
                  </div>

                  {/* Complaints */}
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wide block text-[10px]">
                      Chief Complaints:
                    </span>
                    <p className="font-semibold text-slate-800">
                      {record.symptoms || record.reason || 'General Medical Consultation'}
                    </p>
                  </div>

                  {/* Vitals if recorded */}
                  {hasVitals && (
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {record.bp_systolic && record.bp_diastolic && (
                        <span className="font-semibold flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-slate-400" />
                          BP: <strong>{record.bp_systolic}/{record.bp_diastolic}</strong> mmHg
                        </span>
                      )}
                      {record.temperature && (
                        <span className="font-semibold flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                          Temp: <strong>{record.temperature}°C</strong>
                        </span>
                      )}
                      {record.pulse_rate && (
                        <span className="font-semibold flex items-center gap-1">
                          Pulse: <strong>{record.pulse_rate}</strong> bpm
                        </span>
                      )}
                      {record.spo2 && (
                        <span className="font-semibold flex items-center gap-1">
                          SpO₂: <strong>{record.spo2}%</strong>
                        </span>
                      )}
                      {record.weight_kg && (
                        <span className="font-semibold">
                          Weight: <strong>{record.weight_kg}kg</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clinical Management / Diagnosis */}
                  {record.diagnosis && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wide block text-[10px]">
                        Clinical Management & Diagnosis:
                      </span>
                      <p className="font-medium text-slate-900">{record.diagnosis}</p>
                    </div>
                  )}

                  {/* Prescription */}
                  {record.prescription && record.prescription !== 'None' && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-950 space-y-1">
                      <span className="font-bold text-emerald-800 uppercase tracking-wide block text-[10px] flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-emerald-600" />
                        Prescription & Dosage:
                      </span>
                      <p className="font-bold">{record.prescription}</p>
                      {record.dosage_instructions && (
                        <p className="text-emerald-800/90 text-[11px] italic">
                          "{record.dosage_instructions}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </Modal>
  );
};

