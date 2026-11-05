import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  UserPlus,
  Activity,
  HeartPulse,
  Thermometer,
  AlertTriangle,
  ArrowRight,
  Clock,
  Stethoscope,
  Building2,
  Phone,
  User,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const WalkInModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentDoctorId,
  doctors = []
}) => {
  const { token, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [patientType, setPatientType] = useState('student');
  const [patientName, setPatientName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [department, setDepartment] = useState('College of Computing Studies');
  const [course, setCourse] = useState('');
  const [yearSection, setYearSection] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState('Moderate');
  const [allergies, setAllergies] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    currentDoctorId || (doctors.length > 0 ? doctors[0].assistant_id : '')
  );

  // Vital Signs
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Vitals Warnings
  const tempNum = parseFloat(temperature);
  const sysNum = parseInt(bpSystolic, 10);
  const diaNum = parseInt(bpDiastolic, 10);
  const spo2Num = parseInt(spo2, 10);

  const hasFever = !isNaN(tempNum) && tempNum >= 37.8;
  const hasHypertension = (!isNaN(sysNum) && sysNum >= 140) || (!isNaN(diaNum) && diaNum >= 90);
  const hasHypoxemia = !isNaN(spo2Num) && spo2Num < 95;

  const handleSubmit = async (serveImmediately) => {
    setError('');

    if (!patientName.trim()) {
      setError('Patient Full Name is required.');
      return;
    }
    if (!idNumber.trim()) {
      setError('Student / Employee ID Number is required.');
      return;
    }
    if (!department.trim()) {
      setError('College or Department is required.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        patient_type: patientType,
        patient_name: patientName.trim(),
        id_number: idNumber.trim().toUpperCase(),
        department: department.trim(),
        course: course.trim() || null,
        year_section: yearSection.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender,
        contact_number: contactNumber.trim() || 'N/A',
        email: email.trim().toLowerCase() || null,
        symptoms: symptoms.trim() || 'Acute Walk-In Evaluation',
        symptom_severity: symptomSeverity,
        allergies: allergies.trim() || 'None',
        assistant_id: selectedDoctorId || currentDoctorId || 1,
        serve_immediately: serveImmediately,
        bp_systolic: bpSystolic ? parseInt(bpSystolic, 10) : null,
        bp_diastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        pulse_rate: pulseRate ? parseInt(pulseRate, 10) : null,
        spo2: spo2 ? parseInt(spo2, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null
      };

      const res = await fetch('/api/appointments/walk-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to register walk-in patient.');
      }

      onSuccess(
        {
          appointment_id: data.appointment_id,
          reference_code: data.reference_code,
          patient_name: payload.patient_name,
          patient_type: payload.patient_type,
          id_number: payload.id_number,
          department: payload.department,
          course: payload.course,
          year_section: payload.year_section,
          age: payload.age,
          gender: payload.gender,
          contact_number: payload.contact_number,
          email: payload.email,
          symptoms: payload.symptoms,
          symptom_severity: payload.symptom_severity,
          allergies: payload.allergies,
          status: data.status,
          bp_systolic: payload.bp_systolic,
          bp_diastolic: payload.bp_diastolic,
          temperature: payload.temperature,
          pulse_rate: payload.pulse_rate,
          spo2: payload.spo2,
          weight_kg: payload.weight_kg,
          is_walkin: 1
        },
        serveImmediately
      );
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while saving the walk-in record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acute Walk-In & Triage Registration"
      subtitle="Immediate intake for students, faculty, or outsource personnel arriving in the clinic"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-sm max-h-[75vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Visitor Classification Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Visitor Classification *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'student', label: 'Student' },
              { id: 'academic_non_academic', label: 'Academic / Staff' },
              { id: 'outsource_extension', label: 'Outsource / Ext.' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPatientType(t.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  patientType === t.id
                    ? 'bg-earist-crimson text-white border-earist-crimson shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Identity & Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Student / Employee ID Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 234-0000M"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              College / Department *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. College of Computing Studies"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Course & Year/Section (if Student)
            </label>
            <input
              type="text"
              placeholder="e.g. BSME 3-A"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                placeholder="20"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contact Phone Number
            </label>
            <input
              type="text"
              placeholder="09123456789"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            />
          </div>
        </div>

        {/* Complaints & Triage */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Chief Complaints / Present Symptoms *
          </label>
          <textarea
            rows={2}
            required
            placeholder="e.g. High fever, chills, dizziness, vomiting during class, severe dysmenorrhea..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Acuity / Severity
            </label>
            <select
              value={symptomSeverity}
              onChange={(e) => setSymptomSeverity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            >
              <option value="Mild">Mild (Non-urgent checkup)</option>
              <option value="Moderate">Moderate (Discomfort, needs bed rest)</option>
              <option value="Severe">Severe (Urgent intervention / high distress)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Known Allergies (if any)
            </label>
            <input
              type="text"
              placeholder="e.g. Penicillin, Aspirin, None"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
            />
          </div>
        </div>

        {/* Baseline Vital Signs */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-earist-crimson" />
              Baseline Vital Signs (Optional at Intake)
            </span>
            <span className="text-[11px] text-slate-500 italic">May also be entered during consultation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">BP (Systolic)</label>
              <input
                type="number"
                placeholder="120"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">BP (Diastolic)</label>
              <input
                type="number"
                placeholder="80"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Temp (°C)</label>
              <input
                type="number"
                step="0.1"
                placeholder="36.8"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Heart Rate</label>
              <input
                type="number"
                placeholder="75 bpm"
                value={pulseRate}
                onChange={(e) => setPulseRate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">SpO₂ (%)</label>
              <input
                type="number"
                placeholder="98 %"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>
          </div>

          {/* Real-time Vitals Alerts */}
          {(hasFever || hasHypertension || hasHypoxemia) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {hasFever && (
                <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-900 border border-red-200 text-xs font-bold flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-red-700" />
                  Fever Detected ({temperature}°C)
                </span>
              )}
              {hasHypertension && (
                <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-amber-700" />
                  Elevated Blood Pressure ({bpSystolic}/{bpDiastolic})
                </span>
              )}
              {hasHypoxemia && (
                <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-purple-700" />
                  Low Oxygen Saturation ({spo2}%)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Dual submit */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              Add to Waiting Queue
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white earist-gradient hover:brightness-105 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Stethoscope className="w-4 h-4" />
              Serve Immediately
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

