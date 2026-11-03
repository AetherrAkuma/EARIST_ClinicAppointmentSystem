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
  Briefcase,
  GraduationCap,
  Building2,
  Filter,
  ArrowUpCircle,
  GitBranch,
  GitCommit,
  HardDrive,
  AlertTriangle,
  Terminal,
  CheckCircle
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'users' | 'updates'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'student' | 'academic_non_academic' | 'outsource_extension'
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // OTA Updates State
  const [systemVersion, setSystemVersion] = useState(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [updateLogs, setUpdateLogs] = useState([]);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

  const fetchSystemVersion = async () => {
    try {
      const res = await fetch('/api/system/version');
      const data = await res.json();
      if (data && data.success) {
        setSystemVersion(data);
      }
    } catch (e) {
      console.error('Failed to fetch system version:', e);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchSystemVersion();
  }, []);

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateError(null);
    try {
      const res = await fetch('/api/system/check-updates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setUpdateInfo(data);
        if (!data.success && data.error) {
          setUpdateError(data.error);
        }
      }
    } catch (err) {
      setUpdateError('Network error checking for updates from remote repository.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!window.confirm('Are you sure you want to apply this update now? The system will create an automatic database backup, pull the latest code, and compile frontend assets.')) {
      return;
    }

    setApplyingUpdate(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    setUpdateLogs(['Initiating Over-The-Air system update...']);

    try {
      const res = await fetch('/api/system/apply-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setUpdateSuccess(true);
        setUpdateLogs(data.logs || ['Update applied successfully.']);
        fetchSystemVersion();
        setUpdateInfo(null);
      } else {
        setUpdateError(data.message || 'Failed to apply update.');
      }
    } catch (err) {
      setUpdateError('Error executing update command on host.');
    } finally {
      setApplyingUpdate(false);
    }
  };

  const handleDownloadCsv = (cat = categoryFilter) => {
    const url = cat && cat !== 'all' ? `/api/admin/export?category=${cat}` : '/api/admin/export';
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export request failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const catSuffix = cat !== 'all' ? `_${cat.toUpperCase()}` : '_ALL_VISITS';
        a.download = `EARIST_Daily_Clinic_Visit_Logsheet${catSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => {
        console.error('Export error:', err);
        alert('Could not export clinic logsheet. Please verify your connection.');
      });
  };

  const getCategoryLabel = (type) => {
    if (type === 'student') return 'Student';
    if (type === 'outsource_extension') return 'Outsource / Extension';
    return 'Academic / Non-Academic';
  };

  const getCategoryBadgeClass = (type) => {
    if (type === 'student') return 'bg-red-50 text-earist-crimson border-red-200';
    if (type === 'outsource_extension') return 'bg-slate-100 text-slate-800 border-slate-300';
    return 'bg-amber-50 text-amber-900 border-amber-300';
  };

  const filteredAppointments = appointmentsList.filter((a) => {
    const matchCat =
      categoryFilter === 'all' ||
      a.patient_type === categoryFilter ||
      (categoryFilter === 'academic_non_academic' && a.patient_type === 'faculty_staff');

    const q = searchTerm.toLowerCase();
    const patientName = (a.patient_name || `${a.patient_first_name || ''} ${a.patient_last_name || ''}`).toLowerCase();
    const doctorName = `${a.doctor_first_name || ''} ${a.doctor_last_name || ''}`.toLowerCase();
    const service = (a.service_type || '').toLowerCase();
    const idNum = (a.id_number || a.patient_id_number || '').toLowerCase();
    const refCode = (a.reference_code || '').toLowerCase();
    const dept = (a.department || '').toLowerCase();
    const symptoms = (a.symptoms || '').toLowerCase();

    const matchSearch =
      patientName.includes(q) ||
      doctorName.includes(q) ||
      service.includes(q) ||
      idNum.includes(q) ||
      refCode.includes(q) ||
      dept.includes(q) ||
      symptoms.includes(q);

    return matchCat && matchSearch;
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
        className="bg-[#800020] border border-[#9e1b32] p-7 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 uppercase tracking-wider">
              EARIST Health Services Directorate
            </span>
            <span className="text-xs text-amber-200">Manila Campus Control Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Daily Clinic Visit Logsheet & Analytics
          </h1>
          <p className="text-sm text-amber-100/90 font-medium">
            Administrator: <strong className="text-white">{user?.first_name} {user?.last_name}</strong> • Nagtahan, Sampaloc, Manila
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
          <button
            onClick={() => handleDownloadCsv(categoryFilter)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              Export Logsheet (
              {categoryFilter === 'all'
                ? 'All'
                : categoryFilter === 'student'
                ? 'Students'
                : categoryFilter === 'outsource_extension'
                ? 'Outsource'
                : 'Staff'}
              )
            </span>
          </button>
        </div>
      </motion.div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Logsheet Visits</span>
            <div className="p-2 rounded-lg bg-red-50 text-earist-crimson">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.totalAppointments || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">All recorded campus visits</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Today's Visits</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">
            {metrics?.todayVisits || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Triage queue today</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Students</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.studentVisits || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Student consultations</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Academic / Staff</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.facultyVisits || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Faculty & personnel</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Duty Doctors</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {metrics?.onDutyDoctors || 0} <span className="text-sm font-medium text-slate-400">/ {metrics?.totalDoctors || 0}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Active clinic stations</p>
        </div>
      </div>

      {/* Tabs and Management Tables */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Tabs & Search */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'appointments'
                  ? 'bg-white text-earist-dark shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Clinic Visit Logsheet ({appointmentsList.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-earist-dark shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Campus Staff Directory ({usersList.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'appointments' && (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'student', label: 'Students' },
                  { id: 'academic_non_academic', label: 'Academic/Staff' },
                  { id: 'outsource_extension', label: 'Outsource/Ext.' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCategoryFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      categoryFilter === f.id
                        ? 'bg-white text-earist-dark shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logsheet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Daily Clinic Visit Logsheet Table */}
        {activeTab === 'appointments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                  <th className="py-4 px-5">Time & Date</th>
                  <th className="py-4 px-5">Ref Code</th>
                  <th className="py-4 px-5">Patient & Category</th>
                  <th className="py-4 px-5">Department / Unit</th>
                  <th className="py-4 px-5">Complaints (Symptoms/Requests)</th>
                  <th className="py-4 px-5">Management & Meds</th>
                  <th className="py-4 px-5">Attended By</th>
                  <th className="py-4 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No matching clinic visits recorded in logsheet.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => {
                    const isStudent = appt.patient_type === 'student';
                    const isOutsource = appt.patient_type === 'outsource_extension';

                    return (
                      <tr key={appt.appointment_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5 font-semibold text-slate-900 whitespace-nowrap">
                          <div>{appt.appointment_date}</div>
                          <span className="text-xs text-slate-500 font-normal">{appt.time_slot}</span>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="font-mono font-bold text-earist-crimson bg-red-50 px-2.5 py-1 rounded-md border border-red-200 text-xs">
                            {appt.reference_code || `APP-${appt.appointment_id}`}
                          </span>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {appt.patient_name || `${appt.patient_first_name || ''} ${appt.patient_last_name || ''}`}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            ID: <strong className="text-slate-800">{appt.id_number || appt.patient_id_number || 'N/A'}</strong>
                          </div>
                          <span className={`inline-block mt-1 text-xs font-bold uppercase px-2 py-0.5 rounded border ${getCategoryBadgeClass(appt.patient_type)}`}>
                            {getCategoryLabel(appt.patient_type)}
                          </span>
                        </td>

                        <td className="py-4 px-5 max-w-xs text-slate-600">
                          {appt.course && (
                            <div className="font-bold text-slate-800 text-xs truncate" title={appt.course}>
                              {appt.course}
                            </div>
                          )}
                          {appt.year_section && (
                            <div className="text-xs text-slate-500 font-mono">
                              Yr & Sec: {appt.year_section}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 truncate" title={appt.department}>
                            {appt.department}
                          </div>
                        </td>

                        <td className="py-4 px-5 max-w-xs">
                          <div className="font-bold text-slate-900 text-sm">
                            {appt.symptoms || appt.reason || 'General Consultation'}
                          </div>
                          {appt.symptom_severity && (
                            <span
                              className={`inline-block mt-1 text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
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

                        <td className="py-4 px-5 max-w-xs">
                          {appt.diagnosis ? (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-800 leading-snug">
                                {appt.diagnosis}
                              </p>
                              {appt.prescription && appt.prescription !== 'None' && (
                                <p className="text-xs font-bold text-emerald-700">
                                  Rx: {appt.prescription}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Pending clinical evaluation</span>
                          )}
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="font-bold text-earist-dark">
                            Dr. {appt.doctor_first_name} {appt.doctor_last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {appt.room_number || 'Clinic Rm 101'}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <Badge status={appt.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Users Directory */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                  <th className="py-4 px-5">Staff Member</th>
                  <th className="py-4 px-5">Role & Station</th>
                  <th className="py-4 px-5">Contact Details</th>
                  <th className="py-4 px-5">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                      No matching campus clinic staff found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          ID: {u.id_number || 'N/A'}
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span
                          className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-earist-crimson'
                          }`}
                        >
                          {u.role === 'admin' ? 'System Admin' : 'Medical Officer'}
                        </span>
                        {u.specialization && (
                          <div className="text-xs text-slate-600 mt-1">
                            {u.specialization} • {u.room_number || 'Rm 101'}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">{u.email}</div>
                        <div className="text-xs text-slate-500">{u.contact_number || 'N/A'}</div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        {u.is_on_duty === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            ON DUTY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            OFF DUTY
                          </span>
                        )}
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
