/**
 * Utility functions for generating Calendar events (.ics) and direct Google Calendar links
 * for EARIST Clinic Appointments.
 */

function parseTimeSlot(dateStr, timeSlotStr) {
  // Typical slot format: "08:30 AM - 09:00 AM" or "01:00 PM - 01:30 PM"
  const parts = timeSlotStr.split('-').map(s => s.trim());
  const startPart = parts[0] || '08:00 AM';
  const endPart = parts[1] || '08:30 AM';

  function toDate(dStr, tStr) {
    const [time, period] = tStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = dStr.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes || 0, 0);
  }

  const startDate = toDate(dateStr, startPart);
  const endDate = toDate(dateStr, endPart);
  return { startDate, endDate };
}

function formatICSDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

export function generateICSContent(appointment) {
  const {
    reference_code,
    patient_name,
    id_number,
    appointment_date,
    time_slot,
    service_type,
    doctor_first_name,
    doctor_last_name,
    room_number
  } = appointment;

  const { startDate, endDate } = parseTimeSlot(appointment_date, time_slot || '08:30 AM - 09:00 AM');
  const dtStart = formatICSDate(startDate);
  const dtEnd = formatICSDate(endDate);
  const dtStamp = formatICSDate(new Date());

  const docName = doctor_first_name && doctor_last_name 
    ? `Dr. ${doctor_first_name} ${doctor_last_name}` 
    : 'Attending Clinic Physician';
  const room = room_number || 'Main Clinic Rm 101';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EARIST Health Services Directorate//Clinic Appointment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reference_code}@earist.edu.ph`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:EARIST Clinic Appointment (${reference_code})`,
    `DESCRIPTION:Patient: ${patient_name} (${id_number})\\nPhysician: ${docName}\\nService: ${service_type || 'Consultation'}\\nReference Ticket: ${reference_code}`,
    `LOCATION:EARIST Health Services Directorate, ${room}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Your EARIST Clinic Appointment is in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadICSFile(appointment) {
  const ics = generateICSContent(appointment);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `EARIST-Appointment-${appointment.reference_code}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(appointment) {
  const {
    reference_code,
    patient_name,
    id_number,
    appointment_date,
    time_slot,
    service_type,
    doctor_first_name,
    doctor_last_name,
    room_number
  } = appointment;

  const { startDate, endDate } = parseTimeSlot(appointment_date, time_slot || '08:30 AM - 09:00 AM');
  const dtStart = formatICSDate(startDate);
  const dtEnd = formatICSDate(endDate);

  const docName = doctor_first_name && doctor_last_name 
    ? `Dr. ${doctor_first_name} ${doctor_last_name}` 
    : 'Attending Clinic Physician';
  const room = room_number || 'Main Clinic Rm 101';

  const title = encodeURIComponent(`EARIST Clinic Appointment: ${docName}`);
  const details = encodeURIComponent(
    `Reference Code: ${reference_code}\nPatient: ${patient_name} (${id_number})\nService: ${service_type || 'Consultation'}\nStation: ${room}`
  );
  const location = encodeURIComponent(`EARIST Health Services Directorate, ${room}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
}

