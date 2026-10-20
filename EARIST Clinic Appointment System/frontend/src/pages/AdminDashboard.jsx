import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import {
  Shield,
  Users,
  CalendarCheck,
  Stethoscope,
  Download,
  Search,
  Activity,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'users'
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resMetrics, resUsers, resAppts] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/appointments', { headers })
      ]);

      const dataMetrics = await resMetrics.json();
      const dataUsers = await resUsers.json();
      const dataAppts = await resAppts.json();

      if (dataMetrics.success) setMetrics(dataMetrics.metrics);
      if (dataUsers.success) setUsersList(dataUsers.users);
      if (dataAppts.success) setAppointmentsList(dataAppts.appointments);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDownloadCsv = () => {
    fetch('/api/admin/export', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earist_clinic_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  const filteredAppointments = appointmentsList.filter((a) => {
    const q = searchTerm.toLowerCase();
    const patientName = (a.patient_name || `${a.patient_first_name || ''} ${a.patient_last_name || ''}`).toLowerCase();
    const doctorName = `${a.doctor_first_name || ''} ${a.doctor_last_name || ''}`.toLowerCase();
    const service = (a.service_type || '').toLowerCase();
    const idNum = (a.id_number || a.patient_id_number || '').toLowerCase();
    const refCode = (a.reference_code || '').toLowerCase();
    const dept = (a.department || '').toLowerCase();
    const symptoms = (a.symptoms || '').toLowerCase();

    return (
      patientName.includes(q) ||
      doctorName.includes(q) ||
      service.includes(q) ||
      idNum.includes(q) ||
      refCode.includes(q) ||
      dept.includes(q) ||
      symptoms.includes(q)
    );
  });

  const filteredUsers = usersList.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.id_number || '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-maroon p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
              Clinic Administration & Health Services
            </span>
            <span className="text-xs text-amber-200">Directorate Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Health Analytics & Control
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
            Administrator: <strong className="text-white">{user?.first_name} {user?.last_name}</strong> • Nagtahan, Sampaloc Campus
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-earist-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-amber-950 shadow-md shadow-amber-950/20 transition-all hover:scale-[1.02]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV Log
          </button>
        </div>
      </motion.div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Consultations</span>
            <div className="p-2 rounded-lg bg-red-50 text-earist-crimson">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.totalAppointments || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">All recorded campus visits</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Today's Visits</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">
            {metrics?.todayVisits || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Scheduled for today</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Student Patients</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.studentVisits || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Direct student bookings</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Faculty & Staff</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.facultyVisits || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Staff clinic visits</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Duty Medical Staff</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.onDutyDoctors || 0} <span className="text-sm font-medium text-slate-400">/ {metrics?.totalDoctors || 0}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Doctors currently on-duty</p>
        </div>
      </div>

      {/* Tabs and Management Tables */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Tabs & Search */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'appointments'
                  ? 'bg-white text-earist-dark shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Appointments ({appointmentsList.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-white text-earist-dark shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Campus Users Directory ({usersList.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'users' && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
              >
                <option value="all">All Roles</option>
                <option value="patient">Students</option>
                <option value="assistant">Doctors / Assistants</option>
                <option value="admin">Administrators</option>
              </select>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === 'appointments' ? 'Search patient, ID, ref code...' : 'Search name or ID...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Appointments Table */}
        {activeTab === 'appointments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ref & Date</th>
                  <th className="py-3 px-4">Patient / Student</th>
                  <th className="py-3 px-4">Course / Section / Dept</th>
                  <th className="py-3 px-4">Reported Symptoms</th>
                  <th className="py-3 px-4">Doctor & Station</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Diagnosis / Rx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No matching clinic appointments found.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => (
                    <tr key={appt.appointment_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <span className="font-mono font-bold text-earist-crimson bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {appt.reference_code || `APP-${appt.appointment_id}`}
                        </span>
                        <div className="mt-1 text-slate-900">{appt.appointment_date}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{appt.time_slot}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {appt.patient_name || `${appt.patient_first_name || ''} ${appt.patient_last_name || ''}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: <strong className="text-slate-800">{appt.id_number || appt.patient_id_number || 'N/A'}</strong>
                        </div>
                        <span className="inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {appt.patient_type === 'faculty_staff' ? 'Faculty/Staff' : 'Student'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs text-slate-600">
                        {appt.course && (
                          <div className="font-bold text-slate-800 text-[11px] truncate" title={appt.course}>
                            {appt.course}
                          </div>
                        )}
                        {appt.year_section && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Yr & Sec: {appt.year_section}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 truncate" title={appt.department}>
                          {appt.department}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 truncate" title={appt.symptoms}>
                          {appt.symptoms || appt.reason || 'General Checkup'}
                        </div>
                        {appt.symptom_severity && (
                          <span
                            className={`inline-block mt-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              appt.symptom_severity === 'Severe'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : appt.symptom_severity === 'Moderate'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {appt.symptom_severity} Severity
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-earist-dark">
                          Dr. {appt.doctor_first_name} {appt.doctor_last_name}
                        </div>
                        <div className="text-[10px] text-slate-500">{appt.room_number || 'Room 101'}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge status={appt.status} />
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {appt.diagnosis ? (
                          <span title={appt.diagnosis} className="font-medium text-emerald-800">
                            {appt.diagnosis}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending consultation</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Users Directory Table */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">ID Number</th>
                  <th className="py-3 px-4">Department / Field</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === 'admin'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : u.role === 'assistant'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {u.role === 'assistant' ? 'Doctor / Staff' : u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {u.id_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {u.specialization || u.department || 'General'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {u.contact_number || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {u.created_at ? u.created_at.split(' ')[0] : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
