import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../common/Modal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Power,
  ShieldAlert,
  Info,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Sliders,
  ChevronDown,
  ChevronUp,
  Coffee,
  Check,
  Plus,
  Trash2
} from 'lucide-react';

// 48 time points in 24 hours (12:00 AM, 12:30 AM ... 11:30 PM)
const TIME_24H_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m of [0, 30]) {
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    TIME_24H_OPTIONS.push(
      `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
    );
  }
}

// 48 30-minute consultation slots across a 24-hour day
const ALL_24H_SLOTS = [];
for (let i = 0; i < TIME_24H_OPTIONS.length; i++) {
  const start = TIME_24H_OPTIONS[i];
  const nextIdx = (i + 1) % TIME_24H_OPTIONS.length;
  const end = TIME_24H_OPTIONS[nextIdx];
  ALL_24H_SLOTS.push(`${start} - ${end}`);
}

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return 0;
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + (minutes || 0);
};

// Generate active consultation slots for any shift (daytime, overnight, or 24-hour duty) minus breaks
const generate24HSlots = (startStr, endStr, breaksList = []) => {
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);

  let shiftSlots = [];

  if (startMin === endMin) {
    // 24-hour duty
    shiftSlots = [...ALL_24H_SLOTS];
  } else if (startMin < endMin) {
    // Normal shift within same calendar day
    shiftSlots = ALL_24H_SLOTS.filter((slot) => {
      const [s, e] = slot.split(' - ');
      const sMin = parseTimeToMinutes(s);
      let eMin = parseTimeToMinutes(e);
      if (e === '12:00 AM' && sMin > 0) eMin = 1440;
      return sMin >= startMin && eMin <= endMin;
    });
  } else {
    // Overnight shift crossing midnight (e.g. 10:00 PM to 06:00 AM)
    const eveningSlots = ALL_24H_SLOTS.filter((slot) => {
      const [s] = slot.split(' - ');
      const sMin = parseTimeToMinutes(s);
      return sMin >= startMin;
    });
    const morningSlots = ALL_24H_SLOTS.filter((slot) => {
      const [, e] = slot.split(' - ');
      let eMin = parseTimeToMinutes(e);
      if (e === '12:00 AM') eMin = 1440;
      return eMin <= endMin;
    });
    shiftSlots = [...eveningSlots, ...morningSlots];
  }

  // Filter out any slots that overlap with active breaks
  if (!breaksList || breaksList.length === 0) return shiftSlots;

  return shiftSlots.filter((slot) => {
    const [s, e] = slot.split(' - ');
    const sMin = parseTimeToMinutes(s);
    let eMin = parseTimeToMinutes(e);
    if (e === '12:00 AM' && sMin > 0) eMin = 1440;

    for (const b of breaksList) {
      if (!b.startTime || !b.endTime) continue;
      const bStartMin = parseTimeToMinutes(b.startTime);
      let bEndMin = parseTimeToMinutes(b.endTime);
      if (b.endTime === '12:00 AM' && bStartMin > 0) bEndMin = 1440;

      if (bStartMin < bEndMin) {
        if (sMin >= bStartMin && eMin <= bEndMin) return false;
      } else if (bStartMin > bEndMin) {
        if (sMin >= bStartMin || eMin <= bEndMin) return false;
      }
    }
    return true;
  });
};

export const FullAvailabilityCalendar = ({ token, user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected date modal for managing daily availability & custom time slots
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDayAvailable, setIsDayAvailable] = useState(true);
  const [shiftPreset, setShiftPreset] = useState('full_day'); // 'full_day' | 'morning' | 'afternoon' | 'night' | 'twentyfour' | 'custom'
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [breaks, setBreaks] = useState([
    { id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' }
  ]);
  const [activeSlots, setActiveSlots] = useState([]);
  const [showSlotCustomizer, setShowSlotCustomizer] = useState(false);
  const [viewAll24hInCustomizer, setViewAll24hInCustomizer] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [savingDay, setSavingDay] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Month formatting
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/my/calendar?month=${monthString}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCalendarData(data);
      }
    } catch (err) {
      console.error('Failed to load full doctor calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [monthString, token]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build calendar matrix
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  // Open day manager
  const openDayManager = (dayNumber, isCurrentMonth) => {
    if (!isCurrentMonth) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const dayName = new Date(year, month, dayNumber).toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

    const override = calendarData?.overrides?.[dateStr];
    const appts = calendarData?.appointmentsByDate?.[dateStr] || [];

    setSelectedDay({
      dateStr,
      dayNumber,
      dayName,
      isWeekend,
      appointments: appts
    });

    setShowSlotCustomizer(false);

    if (override) {
      setIsDayAvailable(override.is_available);
      let slots = override.custom_times || [];
      if (slots.length === 0 && override.is_available) {
        slots = generate24HSlots('08:00 AM', '05:00 PM', [
          { id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' }
        ]);
      }
      setActiveSlots(slots);
      setDayNotes(override.notes || '');

      // Detect preset
      if (slots.length === 16 && slots[0].startsWith('08:00 AM') && slots[slots.length - 1].endsWith('05:00 PM')) {
        setShiftPreset('full_day');
        setStartTime('08:00 AM');
        setEndTime('05:00 PM');
        setBreaks([{ id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' }]);
      } else if (slots.length === 8 && slots.every((s) => s.includes('AM'))) {
        setShiftPreset('morning');
        setStartTime('08:00 AM');
        setEndTime('12:00 PM');
        setBreaks([]);
      } else if (slots.length === 8 && slots.every((s) => s.includes('PM'))) {
        setShiftPreset('afternoon');
        setStartTime('01:00 PM');
        setEndTime('05:00 PM');
        setBreaks([]);
      } else {
        setShiftPreset('custom');
        if (slots.length > 0) {
          setStartTime(slots[0].split(' - ')[0]);
          setEndTime(slots[slots.length - 1].split(' - ')[1]);
        }
      }
    } else {
      setIsDayAvailable(!isWeekend);
      const defaultBreaks = [{ id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' }];
      setBreaks(defaultBreaks);
      setShiftPreset('full_day');
      setStartTime('08:00 AM');
      setEndTime('05:00 PM');
      setActiveSlots(generate24HSlots('08:00 AM', '05:00 PM', defaultBreaks));
      setDayNotes('');
    }
    setSaveSuccess(false);
  };

  // Shift preset handler
  const applyPreset = (preset) => {
    setShiftPreset(preset);
    let sTime = '08:00 AM';
    let eTime = '05:00 PM';
    let bList = [];

    if (preset === 'full_day') {
      sTime = '08:00 AM';
      eTime = '05:00 PM';
      bList = [{ id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' }];
    } else if (preset === 'morning') {
      sTime = '08:00 AM';
      eTime = '12:00 PM';
      bList = [];
    } else if (preset === 'afternoon') {
      sTime = '01:00 PM';
      eTime = '05:00 PM';
      bList = [];
    } else if (preset === 'night') {
      sTime = '10:00 PM';
      eTime = '06:00 AM';
      bList = [{ id: 'b-night', label: 'Night Meal / Rest', startTime: '02:00 AM', endTime: '03:00 AM' }];
    } else if (preset === 'twentyfour') {
      sTime = '12:00 AM';
      eTime = '12:00 AM';
      bList = [
        { id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' },
        { id: 'b-dinner', label: 'Dinner Break', startTime: '07:00 PM', endTime: '08:00 PM' }
      ];
    }

    setStartTime(sTime);
    setEndTime(eTime);
    setBreaks(bList);
    setActiveSlots(generate24HSlots(sTime, eTime, bList));
  };

  // Handle start time change
  const handleStartTimeChange = (newStart) => {
    setShiftPreset('custom');
    setStartTime(newStart);
    setActiveSlots(generate24HSlots(newStart, endTime, breaks));
  };

  // Handle end time change
  const handleEndTimeChange = (newEnd) => {
    setShiftPreset('custom');
    setEndTime(newEnd);
    setActiveSlots(generate24HSlots(startTime, newEnd, breaks));
  };

  // Multi-break handlers
  const handleAddBreak = () => {
    setShiftPreset('custom');
    const newBreak = {
      id: `b-${Date.now()}`,
      label: 'Break / Busy Period',
      startTime: '12:00 PM',
      endTime: '01:00 PM'
    };
    const updated = [...breaks, newBreak];
    setBreaks(updated);
    setActiveSlots(generate24HSlots(startTime, endTime, updated));
  };

  const handleUpdateBreak = (id, field, value) => {
    setShiftPreset('custom');
    const updated = breaks.map((b) => (b.id === id ? { ...b, [field]: value } : b));
    setBreaks(updated);
    setActiveSlots(generate24HSlots(startTime, endTime, updated));
  };

  const handleRemoveBreak = (id) => {
    setShiftPreset('custom');
    const updated = breaks.filter((b) => b.id !== id);
    setBreaks(updated);
    setActiveSlots(generate24HSlots(startTime, endTime, updated));
  };

  // Toggle single time slot in fine-tune drawer
  const toggleSlot = (slot) => {
    setShiftPreset('custom');
    if (activeSlots.includes(slot)) {
      setActiveSlots(activeSlots.filter((s) => s !== slot));
    } else {
      setActiveSlots(
        [...activeSlots, slot].sort((a, b) => {
          return parseTimeToMinutes(a.split(' - ')[0]) - parseTimeToMinutes(b.split(' - ')[0]);
        })
      );
    }
  };

  // Batch slot actions
  const selectAllSlots = () => {
    setShiftPreset('full_day');
    setStartTime('08:00 AM');
    setEndTime('05:00 PM');
    setActiveSlots([...STANDARD_TIME_SLOTS]);
  };
  const clearAllSlots = () => {
    setShiftPreset('custom');
    setActiveSlots([]);
  };
  const selectMorningOnly = () =>
    setActiveSlots(STANDARD_TIME_SLOTS.filter((s) => s.includes('AM')));
  const selectAfternoonOnly = () =>
    setActiveSlots(STANDARD_TIME_SLOTS.filter((s) => s.includes('PM')));

  // Save day availability
  const handleSaveDayAvailability = async (e) => {
    e.preventDefault();
    if (!selectedDay) return;

    setSavingDay(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/doctors/my/calendar-day', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDay.dateStr,
          is_available: isDayAvailable,
          custom_times: activeSlots,
          notes: dayNotes.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        await fetchCalendar();
        setTimeout(() => {
          setSelectedDay(null);
        }, 800);
      } else {
        alert(data.message || 'Failed to update day availability.');
      }
    } catch (err) {
      alert('Error updating day availability.');
    } finally {
      setSavingDay(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Calendar Header with Month Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-earist-crimson" />
            <span>Clinic Availability & Duty Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Interactive monthly calendar. Click any date to configure daily on/off duty and hourly consultation time slots.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold text-slate-900 whitespace-nowrap">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={fetchCalendar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Refresh Calendar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>On Duty / Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Off Duty / Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Patients Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span>Weekend (Closed)</span>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center text-xs font-extrabold text-slate-700 py-3 uppercase tracking-wider text-[11px]">
          <span className="text-rose-600">Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span className="text-slate-500">Sat</span>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const dayNum = idx - firstDayIndex + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
            const displayNum = isCurrentMonth
              ? dayNum
              : dayNum <= 0
              ? daysInPrevMonth + dayNum
              : dayNum - daysInMonth;

            const dateStr = isCurrentMonth
              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : null;

            const dayOfWeekIdx = idx % 7;
            const isWeekend = dayOfWeekIdx === 0 || dayOfWeekIdx === 6;

            const override = dateStr ? calendarData?.overrides?.[dateStr] : null;
            const appointments = dateStr ? calendarData?.appointmentsByDate?.[dateStr] || [] : [];

            // Determine availability status
            let isAvailable = !isWeekend;
            if (override) {
              isAvailable = override.is_available;
            }

            const isToday = dateStr === todayStr;

            return (
              <div
                key={idx}
                onClick={() => openDayManager(dayNum, isCurrentMonth)}
                className={`min-h-[105px] sm:min-h-[120px] p-2.5 sm:p-3 transition-all flex flex-col justify-between ${
                  isCurrentMonth
                    ? 'bg-white hover:bg-red-50/20 cursor-pointer group'
                    : 'bg-slate-50/60 opacity-40 cursor-default'
                } ${isToday ? 'bg-amber-50/30' : ''}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-xs font-extrabold rounded-full transition-transform ${
                      isToday
                        ? 'bg-earist-crimson text-white shadow-xs'
                        : isCurrentMonth
                        ? 'text-slate-800 group-hover:scale-110'
                        : 'text-slate-400'
                    }`}
                  >
                    {displayNum}
                  </span>

                  {isCurrentMonth && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isWeekend
                          ? 'bg-slate-300'
                          : isAvailable
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                      title={
                        isWeekend
                          ? 'Weekend'
                          : isAvailable
                          ? 'Available for consultations'
                          : 'Marked Off Duty'
                      }
                    />
                  )}
                </div>

                {/* Day Status Badges */}
                {isCurrentMonth && (
                  <div className="space-y-1 my-1">
                    {isWeekend ? (
                      <span className="text-[10px] font-bold text-slate-400 block truncate">
                        Weekend
                      </span>
                    ) : isAvailable ? (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 truncate">
                        <span>● On Duty</span>
                        {override?.custom_times && (
                          <span className="text-[9px] text-emerald-600 font-normal">
                            ({override.custom_times.length} slots)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 truncate">
                        <span>✕ Off Duty</span>
                      </div>
                    )}

                    {/* Booked Appointments Count */}
                    {appointments.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 truncate">
                        <User className="w-3 h-3 text-amber-600" />
                        <span>{appointments.length} Booked</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Hover affordance */}
                {isCurrentMonth && (
                  <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity block text-right font-medium">
                    Edit Slots →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Availability & Full Time Slots Manager Modal */}
      {selectedDay && (
        <Modal
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          title={`Clinic Availability & Time Slots`}
          subtitle={`${selectedDay.dayName}, ${selectedDay.dateStr}`}
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleSaveDayAvailability} className="space-y-5">
            {/* Master Day Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Day Schedule Status
                </span>
                <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {isDayAvailable ? 'Station is Available & Accepting Bookings' : 'Station is Marked OFF DUTY on this Date'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isDayAvailable
                    ? 'Students can schedule appointments during active time slots below.'
                    : 'Students cannot book appointments on this date.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDayAvailable(!isDayAvailable)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                  isDayAvailable
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isDayAvailable ? 'Active: Set Off Duty' : 'Off: Set On Duty'}</span>
              </button>
            </div>

            {/* Existing Booked Patients for this Day */}
            {selectedDay.appointments.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  Scheduled Consultations for this Day ({selectedDay.appointments.length})
                </span>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {selectedDay.appointments.map((appt) => (
                    <div
                      key={appt.appointment_id}
                      className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">{appt.patient_name}</span>
                        <span className="font-mono text-[10px] text-earist-crimson bg-red-50 px-1.5 rounded">
                          {appt.time_slot}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ID: {appt.id_number} • {appt.department}
                      </p>
                      <p className="text-[11px] text-slate-700 truncate" title={appt.symptoms}>
                        Symptoms: <strong>{appt.symptoms || appt.service_type}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Range & Shift Selection Section */}
            {isDayAvailable && (
              <div className="space-y-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-3">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-earist-crimson" />
                      24/7 Consultation Duty & Shift Schedule
                    </h5>
                    <p className="text-xs text-slate-500">
                      Configure any daytime, night, overnight, or 24-hour shift with customizable break periods.
                    </p>
                  </div>
                </div>

                {/* Shift Presets */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Shift Presets (24/7 Coverage)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('full_day')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        shiftPreset === 'full_day'
                          ? 'border-earist-crimson bg-red-50/70 text-earist-crimson ring-2 ring-earist-crimson/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold leading-tight">Full Day</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">8:00 AM – 5:00 PM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('morning')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        shiftPreset === 'morning'
                          ? 'border-earist-crimson bg-red-50/70 text-earist-crimson ring-2 ring-earist-crimson/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sunrise className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-bold leading-tight">Morning</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">8:00 AM – 12:00 PM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('afternoon')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        shiftPreset === 'afternoon'
                          ? 'border-earist-crimson bg-red-50/70 text-earist-crimson ring-2 ring-earist-crimson/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sunset className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-xs font-bold leading-tight">Afternoon</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">1:00 PM – 5:00 PM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('night')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        shiftPreset === 'night'
                          ? 'border-earist-crimson bg-red-50/70 text-earist-crimson ring-2 ring-earist-crimson/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-bold leading-tight">Night Shift</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">10:00 PM – 6:00 AM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('twentyfour')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        shiftPreset === 'twentyfour'
                          ? 'border-earist-crimson bg-red-50/70 text-earist-crimson ring-2 ring-earist-crimson/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-bold leading-tight">24-Hour Duty</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">All-Day Coverage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShiftPreset('custom')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        shiftPreset === 'custom'
                          ? 'border-earist-crimson bg-red-50/70 text-earist-crimson ring-2 ring-earist-crimson/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sliders className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs font-bold leading-tight">Custom 24/7</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">Pick exact hours</span>
                    </button>
                  </div>
                </div>

                {/* Duty Hours & Multi-Break Builder Card */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  {/* Shift Start & End Dropdowns */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-earist-crimson" />
                        Duty Shift Range
                      </span>
                      {parseTimeToMinutes(endTime) < parseTimeToMinutes(startTime) ? (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          🌙 Overnight Shift (crosses midnight into next morning)
                        </span>
                      ) : startTime === endTime ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          🚨 24-Hour Continuous Clinic Duty
                        </span>
                      ) : null}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1">Shift Begins At</span>
                        <select
                          value={startTime}
                          onChange={(e) => handleStartTimeChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson cursor-pointer"
                        >
                          {TIME_24H_OPTIONS.map((t) => (
                            <option key={`start-${t}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1">Shift Ends At</span>
                        <select
                          value={endTime}
                          onChange={(e) => handleEndTimeChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson cursor-pointer"
                        >
                          {TIME_24H_OPTIONS.map((t) => (
                            <option key={`end-${t}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Break & Custom Unavailability Builder */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        Breaks, Lunch, & Blocked Periods ({breaks.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddBreak}
                        className="text-[11px] font-bold text-earist-crimson hover:text-red-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Break / Blocked Time
                      </button>
                    </div>

                    {breaks.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>No breaks configured — duty hours will be fully open for student consultations.</span>
                        <button
                          type="button"
                          onClick={() => {
                            const lunch = [{ id: 'b-lunch', label: 'Lunch Break', startTime: '12:00 PM', endTime: '01:00 PM' }];
                            setBreaks(lunch);
                            setActiveSlots(generate24HSlots(startTime, endTime, lunch));
                          }}
                          className="text-earist-crimson font-bold hover:underline"
                        >
                          + Add Standard 12–1 PM Lunch
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {breaks.map((b) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap sm:flex-nowrap items-center gap-2 justify-between"
                          >
                            <input
                              type="text"
                              value={b.label}
                              onChange={(e) => handleUpdateBreak(b.id, 'label', e.target.value)}
                              placeholder="e.g. Lunch Break, Meeting, Rounds"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white flex-1 min-w-[130px] focus:outline-none focus:ring-1 focus:ring-earist-crimson"
                            />
                            <div className="flex items-center gap-1.5 text-xs">
                              <select
                                value={b.startTime}
                                onChange={(e) => handleUpdateBreak(b.id, 'startTime', e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
                              >
                                {TIME_24H_OPTIONS.map((t) => (
                                  <option key={`b-start-${b.id}-${t}`} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <span className="text-slate-400 font-bold">to</span>
                              <select
                                value={b.endTime}
                                onChange={(e) => handleUpdateBreak(b.id, 'endTime', e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
                              >
                                {TIME_24H_OPTIONS.map((t) => (
                                  <option key={`b-end-${b.id}-${t}`} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBreak(b.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Remove break"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Active Shift: <strong>{startTime}</strong> to <strong>{endTime}</strong> ({activeSlots.length} student appointment slots)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <span>{breaks.length} break window{breaks.length === 1 ? '' : 's'} excluded</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Fine-Tune Drawer for Specific Slot Block/Unblock */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSlotCustomizer(!showSlotCustomizer)}
                    className="flex items-center justify-between w-full p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-white/70 hover:bg-white text-xs font-bold text-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      Need to inspect or block a specific 30-min slot? (Fine-tune individual slots)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      {showSlotCustomizer ? 'Hide slots' : `View ${activeSlots.length} active slots`}
                      {showSlotCustomizer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>

                  {showSlotCustomizer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3.5 rounded-xl bg-white border border-slate-200 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Click any slot to activate or deactivate:
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {activeSlots.length} active
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewAll24hInCustomizer(!viewAll24hInCustomizer)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                              viewAll24hInCustomizer
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {viewAll24hInCustomizer ? 'Showing All 48 (24h)' : 'Show Full 24h Grid'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShiftPreset('custom');
                              setActiveSlots([...ALL_24H_SLOTS]);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                          >
                            All Active
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShiftPreset('custom');
                              setActiveSlots([]);
                            }}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const baseShiftSlots =
                          startTime === endTime
                            ? ALL_24H_SLOTS
                            : generate24HSlots(startTime, endTime, []);

                        const sourceSlots = viewAll24hInCustomizer
                          ? ALL_24H_SLOTS
                          : Array.from(new Set([...baseShiftSlots, ...activeSlots]));

                        const slotsToRender = sourceSlots.sort((a, b) => {
                          return parseTimeToMinutes(a.split(' - ')[0]) - parseTimeToMinutes(b.split(' - ')[0]);
                        });

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                            {slotsToRender.map((slot) => {
                              const isSelected = activeSlots.includes(slot);
                              const isBooked = selectedDay.appointments.some((a) => a.time_slot === slot);

                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => {
                                    setShiftPreset('custom');
                                    if (isSelected) {
                                      setActiveSlots(activeSlots.filter((s) => s !== slot));
                                    } else {
                                      setActiveSlots(
                                        [...activeSlots, slot].sort(
                                          (a, b) =>
                                            parseTimeToMinutes(a.split(' - ')[0]) -
                                            parseTimeToMinutes(b.split(' - ')[0])
                                        )
                                      );
                                    }
                                  }}
                                  className={`p-2 rounded-lg border text-left text-xs transition-all relative ${
                                    isBooked
                                      ? 'border-amber-300 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-300'
                                      : isSelected
                                      ? 'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold shadow-2xs hover:bg-emerald-100/70'
                                      : 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 line-through hover:opacity-100 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px]">{slot}</span>
                                    {isBooked ? (
                                      <span className="text-[8px] bg-amber-200 text-amber-900 px-1 rounded uppercase font-bold">
                                        Booked
                                      </span>
                                    ) : isSelected ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Duty / Station Notes (Optional)
              </label>
              <input
                type="text"
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                placeholder="e.g. Attending morning faculty meeting; afternoon clinic as scheduled."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingDay}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:opacity-95 shadow-md flex items-center justify-center gap-2"
              >
                {savingDay ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-earist-gold" />
                    <span>Save Availability for {selectedDay.dateStr}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
