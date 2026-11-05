import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Calendar, Clock, Stethoscope, AlertCircle, CheckCircle2, ChevronRight, User } from 'lucide-react';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const RescheduleModal = ({ isOpen, onClose, appointment, onRescheduleSuccess }) => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch doctors on modal open
  useEffect(() => {
    if (!isOpen || !appointment) return;

    setErrorMessage('');
    setSuccessMessage('');
    setSelectedDoctorId(String(appointment.assistant_id || ''));
    setSelectedDate('');
    setSelectedSlot('');
    setReason('');

    setLoadingDoctors(true);
    fetch('/api/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.doctors) {
          const activeDocs = data.doctors.filter((d) => d.is_active === 1);
          setDoctors(activeDocs);
          if (activeDocs.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(String(activeDocs[0].assistant_id));
          }
        }
      })
      .catch((err) => console.error('Error fetching doctors:', err))
      .finally(() => setLoadingDoctors(false));
  }, [isOpen, appointment]);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot('');
      return;
    }

    setLoadingSlots(true);
    setSelectedSlot('');
    fetch(`/api/doctors/${selectedDoctorId}/available-slots?date=${encodeURIComponent(selectedDate)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.slots) {
          setAvailableSlots(data.slots);
          if (data.slots.length > 0) {
            setSelectedSlot(data.slots[0]);
          }
        } else {
          setAvailableSlots([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching slots:', err);
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctorId, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) {
      setErrorMessage('Please select a new appointment date and time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/appointments/${encodeURIComponent(appointment.reference_code)}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_date: selectedDate,
          time_slot: selectedSlot,
          assistant_id: selectedDoctorId,
          reschedule_reason: reason.trim() || 'Schedule adjustment by patient'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Reschedule request failed.');
      }

      setSuccessMessage(data.message || 'Appointment successfully rescheduled!');
      if (onRescheduleSuccess) {
        setTimeout(() => {
          onRescheduleSuccess(data.appointment);
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!appointment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Clinic Appointment"
      subtitle={`Ticket Pass: ${appointment.reference_code} — ${appointment.patient_name}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Reschedule Failed</strong>
              {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Current Booking Summary Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <span className="font-bold uppercase tracking-wider text-slate-500 block">Current Booking</span>
          <div className="text-slate-800 font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-earist-crimson" />
            {appointment.appointment_date} at {appointment.time_slot}
          </div>
          <p className="text-slate-600">
            Attending Physician: <strong>Dr. {appointment.doctor_first_name} {appointment.doctor_last_name}</strong> ({appointment.room_number || 'Main Clinic'})
          </p>
        </div>

        {/* New Doctor Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Attending Physician
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            disabled={loadingDoctors}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
          >
            {doctors.map((d) => (
              <option key={d.assistant_id} value={d.assistant_id}>
                Dr. {d.first_name} {d.last_name} — {d.specialization} ({d.room_number})
              </option>
            ))}
          </select>
        </div>

        {/* New Date Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            New Appointment Date
          </label>
          <input
            type="date"
            required
            min={getTodayString()}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson bg-white"
          />
        </div>

        {/* Available Time Slots */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Available Time Slot Window
          </label>
          {loadingSlots ? (
            <div className="py-4 text-center text-xs text-slate-500 font-medium">
              Checking doctor schedule and available slots...
            </div>
          ) : !selectedDate ? (
            <p className="text-xs text-slate-500 italic">Please select a date first to view open consultation windows.</p>
          ) : availableSlots.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              No available consultation slots for this date. The doctor may be fully booked or off-duty. Please choose another date.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {availableSlots.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer min-h-[44px] flex items-center justify-center ${
                    selectedSlot === slot
                      ? 'bg-earist-crimson text-white border-earist-crimson shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {slot.split(' - ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reason for Rescheduling */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Reason for Rescheduling (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Conflict with class schedule or unwell to travel"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Keep Original Date
          </button>
          <button
            type="submit"
            disabled={submitting || !selectedDate || !selectedSlot}
            className="w-full sm:flex-1 py-3.5 rounded-xl text-sm font-bold text-white earist-gradient hover:brightness-105 shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? 'Confirming Reschedule...' : 'Confirm Reschedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

