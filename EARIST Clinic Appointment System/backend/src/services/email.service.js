const nodemailer = require('nodemailer');

// Create reusable transporter if SMTP credentials are provided in environment
let transporter = null;

function getTransporter() {
  const host = process.env.SMTP_HOST || (process.env.BREVO_SMTP_KEY ? 'smtp-relay.brevo.com' : null);
  const user = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

  if (!transporter && host && user && pass) {
    transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user, pass }
    });
  }
  return transporter;
}

/**
 * Dispatch an email via Brevo REST API if API Key is configured
 */
async function sendViaBrevoApi({ to, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey.includes('your_brevo_api_key_here') || apiKey.trim() === '') return null;

  try {
    const fromEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@uplift.ragetech.dev';
    const fromName = process.env.BREVO_SENDER_NAME || 'EARIST e-Clinic';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`[Email Service - Brevo API] Sent to ${to} (MessageID: ${data.messageId})`);
      return { success: true, messageId: data.messageId, mode: 'brevo_api' };
    } else {
      console.error(`[Email Service - Brevo API Error]`, data);
      return { success: false, error: data.message, mode: 'brevo_api_error' };
    }
  } catch (err) {
    console.error(`[Email Service - Brevo API Fetch Error]:`, err.message);
    return { success: false, error: err.message, mode: 'brevo_api_error' };
  }
}

/**
 * Send an official appointment confirmation & ticket pass email to the patient
 * @param {Object} details
 * @param {string} details.email
 * @param {string} details.reference_code
 * @param {string} details.patient_name
 * @param {string} details.id_number
 * @param {string} details.patient_type
 * @param {string} details.department
 * @param {string} details.appointment_date
 * @param {string} details.time_slot
 * @param {string} details.service_type
 * @param {string} details.doctor_name
 * @param {string} details.room_number
 * @param {string} details.symptoms
 */
async function sendAppointmentConfirmationEmail(details) {
  const {
    email,
    reference_code,
    patient_name,
    id_number,
    patient_type,
    department,
    appointment_date,
    time_slot,
    service_type,
    doctor_name,
    room_number,
    symptoms
  } = details;

  if (!email || !email.includes('@')) {
    console.log(`[Email Service] Skipped: No valid email provided for ${reference_code}`);
    return { success: false, message: 'Invalid or missing email' };
  }

  const categoryLabel =
    patient_type === 'student'
      ? 'EARIST Student'
      : patient_type === 'outsource_extension'
      ? 'Outsource / Extension Personnel'
      : 'Academic / Non-Academic Personnel';

  const fromAddress = process.env.SMTP_FROM || process.env.BREVO_SENDER_EMAIL || '"EARIST e-Clinic" <no-reply@uplift.ragetech.dev>';
  const subject = `EARIST Clinic Appointment Confirmation — Ticket #${reference_code}`;

  const cleanDoctor = (doctor_name || 'Assigned Officer').replace(/^Dr\.?\s+/i, '').trim();
  const doctorDisplay = cleanDoctor.toLowerCase() === 'assigned officer' ? 'Assigned Officer' : `Dr. ${cleanDoctor}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>EARIST Clinic Ticket</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #800020; padding: 28px 24px; color: #ffffff; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #fde68a; }
        .body { padding: 28px 24px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #fcd34d; }
        .ref-box { background: #f8fafc; border: 2px dashed #800020; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
        .ref-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
        .ref-code { font-family: monospace; font-size: 28px; font-weight: 800; color: #580016; letter-spacing: 2px; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .details-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
        .details-label { color: #64748b; font-weight: 600; width: 38%; }
        .details-value { color: #0f172a; font-weight: 700; }
        .notice { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin-top: 24px; font-size: 12px; color: #166534; line-height: 1.5; }
        .footer { padding: 20px 24px; background: #f1f5f9; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>EARIST CLINIC APPOINTMENT CONFIRMATION</h1>
          <p>Health & Wellness Services Directorate • Manila Campus</p>
        </div>
        <div class="body">
          <div style="text-align: center;">
            <span class="badge">Official Consultation Pass</span>
            <h2 style="margin: 12px 0 6px; font-size: 18px; color: #0f172a;">Appointment Confirmed</h2>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Hello <strong>${patient_name}</strong>, your clinic consultation request has been recorded into the official Daily Clinic Visit Logsheet.
            </p>
          </div>

          <div class="ref-box">
            <div class="ref-label">Your Tracking & Reference Code</div>
            <div class="ref-code">${reference_code}</div>
            <p style="margin: 8px 0 0; font-size: 11px; color: #64748b;">
              Present this code at the clinic triage desk on your arrival date.
            </p>
          </div>

          <table class="details-table">
            <tr>
              <td class="details-label">Patient Name:</td>
              <td class="details-value">${patient_name}</td>
            </tr>
            <tr>
              <td class="details-label">ID Number:</td>
              <td class="details-value">${id_number}</td>
            </tr>
            <tr>
              <td class="details-label">Visitor Classification:</td>
              <td class="details-value">${categoryLabel}</td>
            </tr>
            <tr>
              <td class="details-label">College / Department:</td>
              <td class="details-value">${department || 'N/A'}</td>
            </tr>
            <tr>
              <td class="details-label">Scheduled Date:</td>
              <td class="details-value">${appointment_date}</td>
            </tr>
            <tr>
              <td class="details-label">Arrival Window:</td>
              <td class="details-value">${time_slot}</td>
            </tr>
            <tr>
              <td class="details-label">Consultation Service:</td>
              <td class="details-value">${service_type}</td>
            </tr>
            <tr>
              <td class="details-label">Attending Medical Officer:</td>
              <td class="details-value">${doctorDisplay} (${room_number || 'Main Clinic Rm 101'})</td>
            </tr>
            <tr>
              <td class="details-label">Reported Complaints:</td>
              <td class="details-value">${symptoms || 'General Consultation'}</td>
            </tr>
          </table>

          <div class="notice">
            <strong>Arrival Reminder:</strong> Please proceed directly to the Ground Floor Main Administration Clinic Wing at Nagtahan, Sampaloc during your scheduled consultation window. You can also track your live ticket and queue status anytime on the EARIST Clinic Portal using this Reference Code or your registered ID/Email.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;"><strong>Eulogio "Amang" Rodriguez Institute of Science and Technology</strong></p>
          <p style="margin: 0;">Nagtahan St., Sampaloc, City of Manila • Trunkline: (02) 8716-6273 Ext. 104</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Try Brevo REST API if API Key configured
  if (process.env.BREVO_API_KEY) {
    const apiResult = await sendViaBrevoApi({ to: email, subject, htmlContent });
    if (apiResult && apiResult.success) return apiResult;
  }

  // 2. Try SMTP Transporter (Brevo SMTP relay or custom host)
  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject: subject,
        html: htmlContent
      });
      console.log(`[Email Service - SMTP] Sent confirmation email to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.error(`[Email Service - SMTP] Delivery Error for ${email}:`, err.message);
      return { success: false, error: err.message, mode: 'smtp_error' };
    }
  } else {
    // Graceful fallback mode: log preview to console so booking continues smoothly without SMTP configuration
    console.log(`========================================================================`);
    console.log(`[EMAIL SERVICE - LOG MODE (Configure Brevo / SMTP in .env for live dispatch)]`);
    console.log(`To: ${email}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`Patient: ${patient_name} (${id_number})`);
    console.log(`Tracking Reference Code: ${reference_code}`);
    console.log(`Appointment: ${appointment_date} at ${time_slot} with ${doctorDisplay}`);
    console.log(`========================================================================`);
    return { success: true, mode: 'logged' };
  }
}

/**
 * Send an OTP verification code to verify email authenticity before booking
 * @param {string} email
 * @param {string} otpCode
 */
async function sendOtpVerificationEmail(email, otpCode) {
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Invalid or missing email' };
  }

  const subject = `Your EARIST Clinic Verification Code: ${otpCode}`;
  const fromAddress = process.env.SMTP_FROM || process.env.BREVO_SENDER_EMAIL || '"EARIST e-Clinic" <no-reply@uplift.ragetech.dev>';

  const cleanDoctor = (doctor_name || 'Assigned Officer').replace(/^Dr\.?\s+/i, '').trim();
  const doctorDisplay = cleanDoctor.toLowerCase() === 'assigned officer' ? 'Assigned Officer' : `Dr. ${cleanDoctor}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Clinic Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #800020; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">
        EARIST HEALTH SERVICES DIRECTORATE
      </h1>
      <p style="color: #fde68a; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">
        Email Authenticity Verification
      </p>
    </div>
    <div style="padding: 28px 24px; text-align: center;">
      <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
        You requested a verification code to schedule an appointment at the EARIST Campus Clinic. Use the code below to complete your booking:
      </p>
      <div style="display: inline-block; background-color: #fffbeb; border: 2px dashed #d97706; border-radius: 12px; padding: 14px 28px; margin-bottom: 20px;">
        <span style="font-family: monospace, Courier; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #800020;">
          ${otpCode}
        </span>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0;">
        This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
    <div style="background-color: #f1f5f9; padding: 16px 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
      EARIST Manila Campus • Nagtahan, Sampaloc, Manila • Data Privacy Act Compliant
    </div>
  </div>
</body>
</html>
  `;

  // 1. Try Brevo REST API if API Key configured
  if (process.env.BREVO_API_KEY) {
    const apiResult = await sendViaBrevoApi({ to: email, subject, htmlContent });
    if (apiResult && apiResult.success) return apiResult;
  }

  // 2. Try SMTP Transporter (Brevo SMTP relay or custom host)
  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html: htmlContent
      });
      console.log(`[Email Service - SMTP] Sent OTP email to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.error(`[Email Service - SMTP] Delivery Error for OTP to ${email}:`, err.message);
      return { success: false, error: err.message, mode: 'smtp_error' };
    }
  } else {
    console.log(`========================================================================`);
    console.log(`[EMAIL SERVICE - LOG MODE (Configure Brevo / SMTP in .env for live dispatch)]`);
    console.log(`To: ${email}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`Verification Code (OTP): [ ${otpCode} ] (Valid for 10 minutes)`);
    console.log(`========================================================================`);
    return { success: true, mode: 'logged' };
  }
}


/**
 * Send an official consultation discharge summary & prescription email to the patient
 * @param {Object} details
 */
async function sendPrescriptionEmail(details) {
  const {
    email,
    reference_code,
    patient_name,
    id_number,
    patient_type,
    department,
    course,
    year_section,
    doctor_name,
    doctor_specialization,
    room_number,
    appointment_date,
    time_slot,
    service_type,
    symptoms,
    symptom_severity,
    allergies,
    reason,
    bp_systolic,
    bp_diastolic,
    temperature,
    pulse_rate,
    respiratory_rate,
    spo2,
    weight_kg,
    diagnosis,
    prescription,
    dosage_instructions
  } = details;

  if (!email || !email.includes('@')) {
    console.log(`[Email Service] Skipped prescription email: No valid email provided for ${reference_code}`);
    return { success: false, message: 'Invalid or missing email' };
  }

  const categoryLabel =
    patient_type === 'student'
      ? 'EARIST Student'
      : patient_type === 'outsource_extension'
      ? 'Outsource / Extension Personnel'
      : patient_type === 'faculty_staff'
      ? 'Faculty & Academic Personnel'
      : 'Academic / Non-Academic Personnel';

  const fromAddress = process.env.SMTP_FROM || process.env.BREVO_SENDER_EMAIL || '"EARIST Health Services Clinic" <no-reply@uplift.ragetech.dev>';
  const subject = `EARIST Clinic Consultation Summary & Prescription — Ref #${reference_code}`;

  const cleanDoctor = (doctor_name || 'Attending Physician').replace(/^Dr\.?\s+/i, '').trim();
  const doctorDisplay = cleanDoctor.toLowerCase() === 'attending physician' ? 'Attending Physician' : `Dr. ${cleanDoctor}`;

  // Format vitals display
  const bpStr = (bp_systolic && bp_diastolic) ? `${bp_systolic}/${bp_diastolic} mmHg` : null;
  const tempStr = (temperature !== null && temperature !== undefined && temperature !== '') ? `${temperature} °C` : null;
  const hrStr = (pulse_rate !== null && pulse_rate !== undefined && pulse_rate !== '') ? `${pulse_rate} bpm` : null;
  const spo2Str = (spo2 !== null && spo2 !== undefined && spo2 !== '') ? `${spo2}%` : null;
  const rrStr = (respiratory_rate !== null && respiratory_rate !== undefined && respiratory_rate !== '') ? `${respiratory_rate} cpm` : null;
  const wtStr = (weight_kg !== null && weight_kg !== undefined && weight_kg !== '') ? `${weight_kg} kg` : null;

  const hasVitals = bpStr || tempStr || hrStr || spo2Str || rrStr || wtStr;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>EARIST Clinic Consultation Summary & Prescription</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #800020; padding: 28px 24px; color: #ffffff; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 12px; color: #fde68a; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 28px 24px; }
        .badge-success { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #86efac; }
        .ref-box { background: #f8fafc; border: 2px dashed #800020; border-radius: 12px; padding: 16px 20px; margin: 18px 0; text-align: center; }
        .ref-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
        .ref-code { font-family: monospace; font-size: 26px; font-weight: 800; color: #800020; letter-spacing: 2px; }
        .section-header { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #800020; margin: 24px 0 10px; border-bottom: 2px solid #fee2e2; padding-bottom: 6px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .details-table td { padding: 9px 4px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
        .details-label { color: #64748b; font-weight: 600; width: 36%; }
        .details-value { color: #0f172a; font-weight: 700; }
        .vitals-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; }
        .vitals-table th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; text-align: center; }
        .vitals-table td { padding: 10px 10px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: center; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; }
        .vitals-table td:last-child { border-right: none; }
        .rx-card { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 18px 20px; margin: 18px 0; }
        .rx-badge { display: inline-block; background: #15803d; color: #ffffff; font-weight: 900; font-size: 16px; padding: 2px 10px; border-radius: 6px; margin-bottom: 10px; }
        .rx-meds { font-family: monospace, Courier, sans-serif; font-size: 14px; font-weight: 700; color: #0f172a; background: #ffffff; padding: 14px 16px; border-radius: 8px; border: 1px solid #bbf7d0; line-height: 1.6; white-space: pre-wrap; margin-bottom: 14px; }
        .dosage-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin-top: 10px; }
        .dosage-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1d4ed8; margin-bottom: 6px; }
        .dosage-text { font-size: 13px; color: #1e3a8a; font-weight: 600; line-height: 1.5; margin: 0; white-space: pre-wrap; }
        .diagnosis-card { background: #fafaf9; border-left: 4px solid #800020; border-radius: 4px 8px 8px 4px; padding: 12px 16px; margin: 12px 0 16px; }
        .advisory-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px 16px; margin-top: 24px; font-size: 12px; color: #9f1239; line-height: 1.5; }
        .signature-section { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: table; width: 100%; }
        .sig-left { display: table-cell; vertical-align: bottom; font-size: 11px; color: #64748b; }
        .sig-right { display: table-cell; vertical-align: bottom; text-align: right; }
        .sig-name { font-size: 15px; font-weight: 800; color: #800020; margin: 0; }
        .sig-title { font-size: 11px; color: #475569; margin: 2px 0 0; }
        .footer { padding: 18px 24px; background: #f1f5f9; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>EARIST CLINICAL CONSULTATION SUMMARY & PRESCRIPTION</h1>
          <p>Health & Wellness Services Directorate • Manila Campus</p>
        </div>
        <div class="body">
          <div style="text-align: center;">
            <span class="badge-success">✓ Consultation Completed & Recorded</span>
            <h2 style="margin: 12px 0 6px; font-size: 18px; color: #0f172a;">Medical Logsheet & Prescription Pass</h2>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Dear <strong>${patient_name}</strong>, your clinical consultation has concluded. Below is your official prescription, dosage guidelines, vital signs, and discharge instructions.
            </p>
          </div>

          <div class="ref-box">
            <div class="ref-label">Clinical Encounter Tracking Code</div>
            <div class="ref-code">${reference_code}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Date of Encounter: <strong>${appointment_date}</strong> (${time_slot})
            </div>
          </div>

          <!-- Section 1: Patient Details -->
          <div class="section-header">Patient Identification</div>
          <table class="details-table">
            <tr>
              <td class="details-label">Patient Name:</td>
              <td class="details-value">${patient_name}</td>
            </tr>
            <tr>
              <td class="details-label">Student / Employee ID:</td>
              <td class="details-value">${id_number}</td>
            </tr>
            <tr>
              <td class="details-label">Classification:</td>
              <td class="details-value">${categoryLabel}</td>
            </tr>
            <tr>
              <td class="details-label">College / Department:</td>
              <td class="details-value">${department || 'N/A'}${course ? ` • ${course}` : ''}${year_section ? ` (${year_section})` : ''}</td>
            </tr>
            <tr>
              <td class="details-label">Reported Complaints:</td>
              <td class="details-value">${symptoms || reason || 'Campus Clinic Visit'}</td>
            </tr>
            <tr>
              <td class="details-label">Known Allergies:</td>
              <td class="details-value" style="color: ${allergies && allergies.toLowerCase() !== 'none' ? '#b91c1c' : '#0f172a'}; font-weight: 700;">
                ${allergies && allergies.trim() ? allergies : 'No known drug allergies reported'}
              </td>
            </tr>
          </table>

          <!-- Section 2: Clinical Vitals if present -->
          ${hasVitals ? `
          <div class="section-header">Recorded Vital Signs (Triage Assessment)</div>
          <table class="vitals-table">
            <tr>
              ${bpStr ? '<th>Blood Pressure</th>' : ''}
              ${tempStr ? '<th>Temperature</th>' : ''}
              ${hrStr ? '<th>Heart / Pulse</th>' : ''}
              ${spo2Str ? '<th>Oxygen (SpO2)</th>' : ''}
              ${wtStr ? '<th>Weight</th>' : ''}
              ${rrStr ? '<th>Resp. Rate</th>' : ''}
            </tr>
            <tr>
              ${bpStr ? `<td>${bpStr}</td>` : ''}
              ${tempStr ? `<td>${tempStr}</td>` : ''}
              ${hrStr ? `<td>${hrStr}</td>` : ''}
              ${spo2Str ? `<td>${spo2Str}</td>` : ''}
              ${wtStr ? `<td>${wtStr}</td>` : ''}
              ${rrStr ? `<td>${rrStr}</td>` : ''}
            </tr>
          </table>
          ` : ''}

          <!-- Section 3: Diagnosis & Clinical Management -->
          <div class="section-header">Clinical Management & Interventions</div>
          <div class="diagnosis-card">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #800020; margin-bottom: 4px;">Attending Officer's Assessment & Clinical Notes:</div>
            <div style="font-size: 13px; color: #1c1917; font-weight: 600; line-height: 1.5;">${diagnosis || 'Clinically evaluated. Fit for regular campus and academic activities.'}</div>
          </div>

          <!-- Section 4: Official Prescription (Rx) -->
          <div class="section-header">Prescription & Dispensed Medications</div>
          <div class="rx-card">
            <span class="rx-badge">℞</span>
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #166534; margin-bottom: 6px;">Medicines Issued / Prescribed:</div>
            <div class="rx-meds">${prescription || 'No oral/topical medications prescribed during this visit.'}</div>

            <div class="dosage-card">
              <div class="dosage-title">📋 Dosage, Administration & Post-Care Instructions:</div>
              <p class="dosage-text">${dosage_instructions || 'Rest adequately, maintain sufficient hydration, and adhere to standard preventive hygiene.'}</p>
            </div>
          </div>

          <!-- Medical Advisory Notice -->
          <div class="advisory-box">
            <strong>⚠️ Medical Advisory & Precautions:</strong><br />
            • Take all dispensed medications strictly as directed. Do not exceed recommended dosages.<br />
            • If you experience adverse reactions (e.g., skin rash, swelling, nausea, dizziness) or if symptoms persist/worsen, report back to the EARIST Clinic immediately or go to the nearest emergency medical facility.<br />
            • Keep this digital consultation receipt and prescription for your medical records.
          </div>

          <!-- Section 5: Attending Doctor Signature & Clinic Info -->
          <div class="signature-section">
            <div class="sig-left">
              Service: <strong>${service_type || 'General Medical Consultation'}</strong><br />
              Location: <strong>${room_number || 'Main Clinic Rm 101'}</strong><br />
              Encounter Status: <strong>Completed & Logged</strong>
            </div>
            <div class="sig-right">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Attending Health Officer:</div>
              <p class="sig-name">${doctorDisplay}</p>
              <p class="sig-title">${doctor_specialization || 'EARIST Health Services Directorate'}</p>
            </div>
          </div>
        </div>

        <div class="footer">
          EARIST Manila Campus • Nagtahan, Sampaloc, Manila • Tel: (02) 8716-6273 / Clinic Ext. 104<br />
          Official Campus Health Portal • Compliant with Republic Act No. 10173 (Data Privacy Act of 2012)
        </div>
      </div>
    </body>
    </html>
  `;

  function logPrescriptionToConsole(mode) {
    console.log('\n========================================================================');
    console.log(`💊 [EARIST CLINIC] OFFICIAL PRESCRIPTION & DISCHARGE EMAIL [${mode}]`);
    console.log(`📧 Patient Recipient : ${patient_name} (${id_number}) <${email}>`);
    console.log(`🏢 College / Dept    : ${department || 'N/A'}`);
    console.log(`👨‍⚕️ Attending Doctor  : ${doctorDisplay} (${room_number || 'Main Clinic Rm 101'})`);
    console.log(`🎫 Tracking Code     : ${reference_code}`);
    console.log(`📋 Chief Complaints  : ${symptoms || reason || 'General Clinic Consultation'}`);
    console.log(`⚠️ Allergies         : ${allergies || 'No known allergies reported'}`);
    if (bp_systolic || temperature || pulse_rate || spo2) {
      console.log(`🩺 Vitals Recorded   : BP: ${bp_systolic ? `${bp_systolic}/${bp_diastolic} mmHg` : 'N/A'} | Temp: ${temperature ? `${temperature}°C` : 'N/A'} | HR: ${pulse_rate ? `${pulse_rate} bpm` : 'N/A'} | SpO2: ${spo2 ? `${spo2}%` : 'N/A'}`);
    }
    console.log(`🏥 Clinical Diagnosis: ${diagnosis || 'Clinically evaluated'}`);
    console.log(`💊 Prescription (Rx) : ${prescription || 'None prescribed'}`);
    console.log(`📝 Dosage & Post-Care: ${dosage_instructions || 'Follow general healthy habits'}`);
    console.log('========================================================================\n');
  }

  // 1. Try Brevo REST API if configured
  if (process.env.BREVO_API_KEY) {
    const apiResult = await sendViaBrevoApi({ to: email, subject, htmlContent });
    if (apiResult && apiResult.success) {
      logPrescriptionToConsole('Brevo REST API');
      return apiResult;
    }
  }

  // 2. Try SMTP Transporter
  const activeTransporter = getTransporter();
  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html: htmlContent
      });
      console.log(`[Email Service - SMTP] Sent prescription email to ${email} (MessageID: ${info.messageId})`);
      logPrescriptionToConsole('SMTP Relay');
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.error(`[Email Service - SMTP] Delivery Error for prescription to ${email}:`, err.message);
      logPrescriptionToConsole('SMTP Error - Console Fallback');
      return { success: false, error: err.message, mode: 'smtp_error' };
    }
  } else {
    logPrescriptionToConsole('Console Log Mode (Configure Brevo / SMTP in .env for live dispatch)');
    return { success: true, mode: 'logged' };
  }
}

module.exports = {
  sendAppointmentConfirmationEmail,
  sendOtpVerificationEmail,
  sendPrescriptionEmail
};
