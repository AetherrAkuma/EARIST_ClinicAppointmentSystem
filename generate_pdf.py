import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.pdfgen import canvas

# Palette
MAROON = colors.HexColor("#7B1113")
DARK_MAROON = colors.HexColor("#580C0D")
GOLD = colors.HexColor("#D97706")
LIGHT_GOLD = colors.HexColor("#FEF3C7")
DARK_SLATE = colors.HexColor("#1E293B")
SLATE = colors.HexColor("#334155")
MUTED_SLATE = colors.HexColor("#64748B")
BG_LIGHT = colors.HexColor("#F8FAFC")
BG_ALT = colors.HexColor("#F1F5F9")
BORDER_COLOR = colors.HexColor("#CBD5E1")
WHITE = colors.HexColor("#FFFFFF")
TAG_PK = colors.HexColor("#7B1113")
TAG_FK = colors.HexColor("#1D4ED8")
TAG_NEW = colors.HexColor("#B45309")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED_SLATE)
        width, height = self._pagesize

        # Running header (from page 2 onwards)
        if self._pageNumber > 1:
            self.drawString(36, height - 28, "EARIST Health Services — Clinic Appointment System | Database Data Dictionary")
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(36, height - 32, width - 36, height - 32)

        # Running footer (all pages)
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(36, 32, width - 36, 32)
        
        self.drawString(36, 22, "Eulogio \"Amang\" Rodriguez Institute of Science and Technology (EARIST - Manila) • Confidential Technical Spec")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(width - 36, 22, page_str)
        self.restoreState()


def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=WHITE,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=LIGHT_GOLD,
        spaceAfter=6
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=MAROON,
        spaceBefore=14,
        spaceAfter=4
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=WHITE
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=WHITE
    )

    cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_SLATE
    )

    cell_code_style = ParagraphStyle(
        'TableCellCode',
        fontName='Courier-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=MAROON
    )

    cell_type_style = ParagraphStyle(
        'TableCellType',
        fontName='Courier-Bold',
        fontSize=7.2,
        leading=9,
        textColor=DARK_SLATE
    )

    cell_desc_style = ParagraphStyle(
        'TableCellDesc',
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=SLATE
    )

    story = []

    # 1. Header Banner Table
    banner_left = [
        Paragraph("EULOGIO \"AMANG\" RODRIGUEZ INSTITUTE OF SCIENCE &amp; TECHNOLOGY", title_style),
        Paragraph("Campus Health Services &bull; Clinic Appointment &amp; Triage System", subtitle_style),
        Paragraph("<b>DATABASE DATA DICTIONARY &amp; COMPLETE SCHEMA SPECIFICATION</b>", subtitle_style)
    ]
    banner_right = [
        Paragraph("<b>Database Engine:</b> SQLite (<code>node:sqlite</code>)", meta_val_style),
        Paragraph("<b>Database File:</b> <code>earist_clinic.db</code>", meta_val_style),
        Paragraph("<b>Schema Version:</b> 1.2 (With Data Type Lengths)", meta_val_style),
        Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}", meta_val_style)
    ]

    header_table = Table(
        [[banner_left, banner_right]],
        colWidths=[360, 180]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), MAROON),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, -1), 3, GOLD),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # 2. Executive Overview Box
    ov_data = [
        [
            Paragraph("<b>TOTAL TABLES:</b><br/>6 Relational Tables", cell_style),
            Paragraph("<b>DATA TYPE LENGTHS:</b><br/>Explicit Bounds on All Attributes", cell_style),
            Paragraph("<b>TRACKING ID DISPATCH:</b><br/><code>reference_code</code> + Email Placeholders", cell_style),
            Paragraph("<b>INTEGRITY RULES:</b><br/>Foreign Keys + Cascade Deletions", cell_style),
        ]
    ]
    ov_table = Table(ov_data, colWidths=[135, 135, 135, 135])
    ov_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(ov_table)
    story.append(Spacer(1, 12))

    # Helper function to generate clean table with Type (Length)
    def make_table(title, desc, headers, rows, col_widths, highlight_rows=None):
        if highlight_rows is None:
            highlight_rows = []

        content = []
        content.append(Paragraph(f"<b>{title}</b>", h1_style))
        content.append(Paragraph(f"<i>{desc}</i>", cell_desc_style))
        content.append(Spacer(1, 4))

        # Format rows with Paragraphs
        table_rows = []
        header_row = [Paragraph(f"<b>{h}</b>", table_header_style) for h in headers]
        table_rows.append(header_row)

        for r_idx, r in enumerate(rows):
            formatted_row = []
            for c_idx, val in enumerate(r):
                if c_idx == 0:
                    formatted_row.append(Paragraph(f"<b>{val}</b>", cell_code_style))
                elif c_idx == 1:
                    formatted_row.append(Paragraph(val, cell_type_style))
                elif c_idx == len(r) - 1:
                    formatted_row.append(Paragraph(val, cell_desc_style))
                else:
                    formatted_row.append(Paragraph(val, cell_style))
            table_rows.append(formatted_row)

        t = Table(table_rows, colWidths=col_widths, repeatRows=1)
        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), SLATE),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]

        # Alternating row background
        for i in range(1, len(table_rows)):
            bg = BG_ALT if i % 2 == 0 else WHITE
            t_style.append(('BACKGROUND', (0, i), (-1, i), bg))

        # Highlight rows
        for h_row in highlight_rows:
            t_style.append(('BACKGROUND', (0, h_row), (-1, h_row), LIGHT_GOLD))
            t_style.append(('LINEBEFORE', (0, h_row), (0, h_row), 2.5, GOLD))

        t.setStyle(TableStyle(t_style))
        content.append(t)
        content.append(Spacer(1, 10))
        return content

    # 1. users
    users_headers = ["Column Name", "Data Type (Length)", "Null?", "Constraints", "Default", "Description & Purpose"]
    users_rows = [
        ["id", "INTEGER (11)", "NO", "PK, AUTOINCREMENT", "None", "Unique internal user ID."],
        ["email", "VARCHAR (150)", "NO", "UNIQUE", "None", "Official EARIST institutional email for login."],
        ["password_hash", "VARCHAR (255)", "NO", "None", "None", "Bcrypt salted hash (cost factor 10) for secure login."],
        ["role", "VARCHAR (20)", "NO", "CHECK('assistant','admin')", "None", "Authorization role: 'assistant' (Doctor/Nurse), 'admin'."],
        ["first_name", "VARCHAR (100)", "NO", "None", "None", "Given name of clinic practitioner."],
        ["last_name", "VARCHAR (100)", "NO", "None", "None", "Surname of clinic practitioner."],
        ["id_number", "VARCHAR (30)", "YES", "None", "NULL", "Employee/Staff ID (e.g. MED-2026-008)."],
        ["contact_number", "VARCHAR (20)", "YES", "None", "NULL", "Mobile contact number or clinic extension."],
        ["created_at", "DATETIME (19)", "YES", "None", "CURRENT_TIMESTAMP", "User account registration timestamp."],
    ]
    story.extend(make_table(
        "1. Table: users",
        "Authentication credentials and authorization records for clinic medical staff and administrators.",
        users_headers, users_rows, [75, 75, 28, 92, 65, 205]
    ))

    # 2. assistants
    asst_headers = ["Column Name", "Data Type (Length)", "Null?", "Constraints", "Default", "Description & Purpose"]
    asst_rows = [
        ["assistant_id", "INTEGER (11)", "NO", "PK, AUTOINCREMENT", "None", "Unique primary key for doctor profile."],
        ["user_id", "INTEGER (11)", "NO", "FK, UNIQUE -> users(id)", "None", "Foreign key referencing users table (ON DELETE CASCADE)."],
        ["specialization", "VARCHAR (150)", "YES", "None", "NULL", "Clinical medical specialization (General Physician, Dental, etc.)."],
        ["room_number", "VARCHAR (50)", "YES", "None", "NULL", "Assigned physical station (e.g. Main Clinic Rm 101)."],
        ["is_on_duty", "TINYINT (1)", "YES", "CHECK (0 or 1)", "1", "Active duty flag: 1 = Currently on duty, 0 = Off duty."],
        ["is_active", "TINYINT (1)", "YES", "CHECK (0 or 1)", "1", "Active roster status flag: 1 = Active, 0 = Inactive."],
    ]
    story.extend(make_table(
        "2. Table: assistants",
        "Medical staff and doctor profile extensions (1-to-1 relationship with users).",
        asst_headers, asst_rows, [75, 75, 28, 105, 52, 205]
    ))

    story.append(PageBreak())

    # 3. doctor_schedules
    sched_headers = ["Column Name", "Data Type (Length)", "Null?", "Constraints", "Default", "Description & Purpose"]
    sched_rows = [
        ["schedule_id", "INTEGER (11)", "NO", "PK, AUTOINCREMENT", "None", "Unique recurring schedule window identifier."],
        ["assistant_id", "INTEGER (11)", "NO", "FK -> assistants", "None", "Foreign key referencing assistants(assistant_id)."],
        ["day_of_week", "VARCHAR (15)", "NO", "None", "None", "Day of clinic duty (Monday to Friday)."],
        ["start_time", "VARCHAR (10)", "NO", "None", "None", "Duty shift start time in 24-hr format (e.g. 08:00)."],
        ["end_time", "VARCHAR (10)", "NO", "None", "None", "Duty shift end time in 24-hr format (e.g. 12:00)."],
        ["max_slots", "INTEGER (5)", "YES", "None", "15", "Maximum patient capacity allowed per duty window."],
        ["is_available", "TINYINT (1)", "YES", "CHECK (0 or 1)", "1", "Schedule toggle: 1 = Active/Bookable, 0 = Inactive."],
    ]
    story.extend(make_table(
        "3. Table: doctor_schedules",
        "Weekly template schedules defining regular consultation shifts for medical practitioners.",
        sched_headers, sched_rows, [75, 75, 28, 92, 65, 205]
    ))

    # 4. doctor_custom_availability
    cust_headers = ["Column Name", "Data Type (Length)", "Null?", "Constraints", "Default", "Description & Purpose"]
    cust_rows = [
        ["id", "INTEGER (11)", "NO", "PK, AUTOINCREMENT", "None", "Unique primary key for schedule override."],
        ["assistant_id", "INTEGER (11)", "NO", "FK -> assistants", "None", "Foreign key referencing assistants(assistant_id)."],
        ["date", "VARCHAR (10)", "NO", "UNIQUE(asst, date)", "None", "Specific calendar date formatted as YYYY-MM-DD."],
        ["is_available", "TINYINT (1)", "YES", "CHECK (0 or 1)", "1", "0 = Doctor on leave / unavailable; 1 = Custom hours."],
        ["custom_times", "VARCHAR (255)", "YES", "None", "NULL", "JSON array/string defining custom slot hours."],
        ["notes", "TEXT (500)", "YES", "None", "NULL", "Administrative explanation (e.g. Official Training / Leave)."],
        ["created_at", "DATETIME (19)", "YES", "None", "CURRENT_TIMESTAMP", "Override record creation timestamp."],
    ]
    story.extend(make_table(
        "4. Table: doctor_custom_availability",
        "Date-specific schedule overrides (leaves, seminars, holiday blackouts, modified hours).",
        cust_headers, cust_rows, [75, 75, 28, 92, 65, 205]
    ))

    story.append(PageBreak())

    # 5. appointments (Highlight rows for tracking & email send)
    appt_headers = ["Column Name", "Data Type (Length)", "Null?", "Constraints", "Default", "Description & Purpose"]
    appt_rows = [
        ["appointment_id", "INTEGER (11)", "NO", "PK, AUTOINCREMENT", "None", "Unique primary key for appointment."],
        ["reference_code", "VARCHAR (25)", "NO", "UNIQUE", "None", "<b>Tracking ID (Reference Code):</b> Issued to patient (e.g. EAR-2026-A109) to track their appointment progress online."],
        ["patient_type", "VARCHAR (20)", "YES", "CHECK('student','faculty_staff')", "'student'", "Campus constituent category: 'student' or 'faculty_staff'."],
        ["patient_name", "VARCHAR (150)", "NO", "None", "None", "Full legal name of the patient."],
        ["id_number", "VARCHAR (30)", "NO", "None", "None", "Student Number (e.g. 234-0000M) or Faculty Employee ID."],
        ["department", "VARCHAR (150)", "NO", "None", "None", "College (e.g. College of Engineering) or Administrative Office."],
        ["course", "VARCHAR (150)", "YES", "None", "NULL", "Academic degree program (BSCpE, BSIT, etc., nullable for staff)."],
        ["year_section", "VARCHAR (20)", "YES", "None", "NULL", "Year level & section (e.g. 3-B)."],
        ["age", "INTEGER (3)", "YES", "None", "NULL", "Patient age in completed years."],
        ["gender", "VARCHAR (10)", "YES", "None", "NULL", "Gender identity ('Male', 'Female', 'Other')."],
        ["address", "VARCHAR (255)", "YES", "None", "NULL", "Residential / dormitory address in Metro Manila."],
        ["contact_number", "VARCHAR (20)", "NO", "None", "None", "Primary contact mobile number for notifications & triage."],
        ["patient_email", "VARCHAR (150)", "YES", "<b>[NEW PLACEHOLDER]</b>", "NULL", "<b>Patient Email Address:</b> Target email address where Tracking ID & appointment receipt are sent."],
        ["symptoms", "TEXT (1000)", "YES", "None", "NULL", "Self-reported symptoms and health complaints."],
        ["symptom_severity", "VARCHAR (15)", "YES", "CHECK('Mild','Moderate','Severe')", "'Mild'", "Preliminary triage priority rating."],
        ["allergies", "TEXT (255)", "YES", "None", "NULL", "Known drug or food allergies (e.g. Penicillin, Aspirin)."],
        ["medical_history", "TEXT (1000)", "YES", "None", "NULL", "Pre-existing chronic medical history or prior treatments."],
        ["assistant_id", "INTEGER (11)", "NO", "FK -> assistants", "None", "Foreign key referencing attending doctor."],
        ["appointment_date", "VARCHAR (10)", "NO", "None", "None", "Scheduled consultation date formatted as YYYY-MM-DD."],
        ["time_slot", "VARCHAR (30)", "NO", "None", "None", "Consultation time slot window (e.g. 09:00 AM - 09:30 AM)."],
        ["service_type", "VARCHAR (100)", "NO", "None", "None", "Clinical service requested (General Consultation, Dental, Clearance)."],
        ["status", "VARCHAR (20)", "YES", "CHECK('Pending','Approved','OnGoing','Completed','Cancelled')", "'Approved'", "Consultation workflow lifecycle state."],
        ["email_status", "VARCHAR (15)", "YES", "CHECK('Pending','Sent','Failed') <b>[NEW]</b>", "'Pending'", "<b>Tracking Email Dispatch Status:</b> Tracks whether tracking ID was delivered to patient's email."],
        ["email_sent_at", "DATETIME (19)", "YES", "<b>[NEW PLACEHOLDER]</b>", "NULL", "<b>Tracking Email Timestamp:</b> Date and time the tracking notification email was delivered."],
        ["reason", "TEXT (500)", "YES", "None", "NULL", "Patient's stated reason for campus clinic visit."],
        ["diagnosis", "TEXT (1000)", "YES", "None", "NULL", "Official medical diagnosis recorded by attending physician."],
        ["prescription", "TEXT (1000)", "YES", "None", "NULL", "Prescribed medications and pharmaceutical orders."],
        ["dosage_instructions", "TEXT (1000)", "YES", "None", "NULL", "Directions for medication administration and self-care."],
        ["created_at", "DATETIME (19)", "YES", "None", "CURRENT_TIMESTAMP", "Initial appointment submission timestamp."],
    ]
    story.extend(make_table(
        "5. Table: appointments",
        "Central consultation records, triage, diagnosis, prescriptions, and email tracking placeholders.",
        appt_headers, appt_rows, [78, 72, 26, 92, 62, 210],
        highlight_rows=[2, 13, 23, 24]
    ))

    story.append(PageBreak())

    # 6. email_notifications
    enotif_headers = ["Column Name", "Data Type (Length)", "Null?", "Constraints", "Default", "Description & Purpose"]
    enotif_rows = [
        ["notification_id", "INTEGER (11)", "NO", "PK, AUTOINCREMENT", "None", "Unique primary key for email dispatch log."],
        ["appointment_id", "INTEGER (11)", "NO", "FK -> appointments", "None", "Foreign key referencing parent appointment (ON DELETE CASCADE)."],
        ["recipient_email", "VARCHAR (150)", "NO", "None", "None", "Recipient email address receiving the tracking link and ticket."],
        ["subject", "VARCHAR (255)", "NO", "None", "None", "Email subject line (e.g. EARIST Clinic Confirmation - Ref: EAR-2026-A109)."],
        ["reference_code", "VARCHAR (25)", "NO", "None", "None", "The tracking reference code embedded in the message body."],
        ["template_name", "VARCHAR (50)", "YES", "None", "'appointment_tracking_id'", "Email template identifier for body rendering."],
        ["status", "VARCHAR (15)", "YES", "CHECK('Pending','Sent','Failed')", "'Pending'", "Delivery status: 'Pending' in outbox, 'Sent', or 'Failed'."],
        ["error_message", "TEXT (1000)", "YES", "None", "NULL", "Error diagnostics or SMTP server response if delivery failed."],
        ["sent_at", "DATETIME (19)", "YES", "None", "NULL", "Exact timestamp when email was transmitted."],
        ["created_at", "DATETIME (19)", "YES", "None", "CURRENT_TIMESTAMP", "Notification queue record creation timestamp."],
    ]
    story.extend(make_table(
        "6. Table: email_notifications [NEW OUTBOX DISPATCH LOG]",
        "Audit log and outbox queue tracking all automated confirmation emails and tracking code dispatches.",
        enotif_headers, enotif_rows, [75, 75, 28, 92, 65, 205],
        highlight_rows=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    ))

    # 7. Rules and Lookups Summary
    story.append(Paragraph("<b>Referential Integrity &amp; Operating Business Rules</b>", h1_style))
    rules_text = (
        "&bull; <b>Foreign Key Enforcement:</b> SQLite <code>PRAGMA foreign_keys = ON;</code> is initialized on every connection.<br/>"
        "&bull; <b>Data Type Length Constraints:</b> Attributes adhere to industry-standard maximum storage limits (e.g. <code>VARCHAR(150)</code> for institutional emails, <code>VARCHAR(25)</code> for tracking IDs, <code>TEXT(1000)</code> for clinical triage and diagnoses).<br/>"
        "&bull; <b>Cascade Deletions:</b> Deleting a medical practitioner cascades to all schedules, availability overrides, and appointments; deleting an appointment purges corresponding outbox notifications.<br/>"
        "&bull; <b>Globally Unique Tracking ID:</b> <code>reference_code</code> in <code>appointments</code> is enforced unique; formatted as <code>EAR-XXXX-XXX</code> ensuring conflict-free patient process tracking.<br/>"
        "&bull; <b>Capacity Throttling:</b> Maximum capacity of 5 patients per consultation slot (<code>MAX_SLOT_CAPACITY = 5</code>) ensures high clinical care standards and eliminates queue congestion.<br/>"
        "&bull; <b>Duplicate Booking Safeguard:</b> Patients are prevented from scheduling overlapping appointments on identical dates and time windows.<br/>"
        "&bull; <b>Email Outbox Processing:</b> The <code>email_notifications</code> table acts as an asynchronous outbox queue. Future background jobs (cron or worker) poll rows with <code>status = 'Pending'</code>, dispatch via SMTP/Nodemailer, and mark both <code>email_notifications.status = 'Sent'</code> and <code>appointments.email_status = 'Sent'</code> with timestamps."
    )
    rules_box = Table(
        [[Paragraph(rules_text, cell_style)]],
        colWidths=[540]
    )
    rules_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINELEFT', (0, 0), (-1, -1), 3, MAROON),
    ]))
    story.append(rules_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {output_path}")

if __name__ == '__main__':
    target = os.path.join(os.path.dirname(__file__), "EARIST_Clinic_Data_Dictionary.pdf")
    build_pdf(target)
