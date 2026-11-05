import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { WalkInModal } from '../components/doctor/WalkInModal';
import { PatientHistoryModal } from '../components/doctor/PatientHistoryModal';
import { formatDoctorName } from '../utils/formatters';
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
  CheckCircle,
  UserPlus,
  Edit3,
  Key,
  History,
  UserCheck,
  UserX
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

  // Staff Management State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [addStaffForm, setAddStaffForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    id_number: '',
    contact_number: '',
    specialization: 'General Campus Medicine',
    room_number: 'Clinic Rm 101',
    initial_password: 'earist2026!'
  });
  const [editingStaff, setEditingStaff] = useState(null);
  const [resetPwStaff, setResetPwStaff] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('earist2026!');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  // Walk-In and History Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [historyPatient, setHistoryPatient] = useState(null);

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

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffSubmitting(true);
    setStaffError('');
    setStaffSuccess('');

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addStaffForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create staff member.');
      }

      setStaffSuccess(`Staff member created! Initial password: ${data.initial_password}`);
      setShowAddStaffModal(false);
      setAddStaffForm({
        first_name: '',
        last_name: '',
        email: '',
        id_number: '',
        contact_number: '',
        specialization: 'General Campus Medicine',
        room_number: 'Clinic Rm 101',
        initial_password: 'earist2026!'
      });
      fetchAdminData();
    } catch (err) {
      setStaffError(err.message || 'Error creating staff account.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setStaffSubmitting(true);
    setStaffError('');

    try {
      const res = await fetch(`/api/admin/staff/${editingStaff.assistant_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: editingStaff.first_name,
          last_name: editingStaff.last_name,
          contact_number: editingStaff.contact_number,
          id_number: editingStaff.id_number,
          specialization: editingStaff.specialization,
          room_number: editingStaff.room_number,
          is_on_duty: editingStaff.is_on_duty,
          is_active: editingStaff.is_active
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update staff station.');
      }

      setEditingStaff(null);
      fetchAdminData();
    } catch (err) {
      setStaffError(err.message || 'Error updating staff.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwStaff) return;
    setStaffSubmitting(true);
    setStaffError('');

    try {
      const res = await fetch(`/api/admin/staff/${resetPwStaff.assistant_id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPasswordInput.trim() || 'earist2026!' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      alert(`Password successfully reset! Provide the staff member with the new password: ${newPasswordInput.trim() || 'earist2026!'}`);
      setResetPwStaff(null);
    } catch (err) {
      setStaffError(err.message || 'Error resetting password.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleToggleStaffActive = async (astId, currentActive) => {
    try {
      const res = await fetch(`/api/admin/staff/${astId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: currentActive ? 0 : 1 })
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error toggling staff status:', err);
    }
  };

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
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'updates'
                  ? 'bg-white text-earist-dark shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 text-earist-crimson" />
              <span>System Updates & OTA</span>
              {updateInfo?.updateAvailable && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          {activeTab !== 'updates' && (
            <div className="flex flex-wrap items-center gap-3">
              {activeTab === 'appointments' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowWalkInModal(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#800020] text-white hover:brightness-105 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    title="Intake acute walk-in patient at clinic desk"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Walk-In Patient</span>
                  </button>

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
                </>
              )}

              {activeTab === 'users' && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffError('');
                    setShowAddStaffModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#800020] text-white hover:brightness-105 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Clinic Staff</span>
                </button>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson w-56 sm:w-64"
                />
              </div>
            </div>
          )}
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-earist-crimson bg-red-50 px-2.5 py-1 rounded-md border border-red-200 text-xs">
                              {appt.reference_code || `APP-${appt.appointment_id}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setHistoryPatient({ idNumber: appt.id_number, patientName: appt.patient_name })}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-earist-dark transition-colors cursor-pointer"
                              title="View Patient Full Clinic History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                            {formatDoctorName(appt.doctor_first_name, appt.doctor_last_name)}
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
                  <th className="py-4 px-5 text-right">Station Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
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

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        {u.role === 'assistant' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffError('');
                                setEditingStaff({ ...u });
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Edit Doctor Station & Specialization"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setStaffError('');
                                setResetPwStaff(u);
                                setNewPasswordInput('earist2026!');
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reset Staff Password"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-700" />
                              <span>Reset PW</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStaffActive(u.assistant_id, u.is_active === 1)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                u.is_active === 1
                                  ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-800 border-emerald-200 hover:border-rose-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}
                              title={u.is_active === 1 ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                            >
                              {u.is_active === 1 ? 'Active' : 'Inactive'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Primary Directorate Account</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: System Updates & OTA Management Panel */}
        {activeTab === 'updates' && (
          <div className="p-6 sm:p-8 space-y-8">
            {/* System Status Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Current Version
                </span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                  v{systemVersion?.version || '1.0.0'}
                </span>
                <span className="text-xs text-emerald-700 font-semibold mt-0.5 block">
                  ● Production Build
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Commit
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-900 text-lg">
                  <GitCommit className="w-4 h-4 text-earist-crimson" />
                  <span>{systemVersion?.shortHash || 'c0692ca'}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium block truncate mt-0.5">
                  {systemVersion?.commitDate ? systemVersion.commitDate.split(' ')[0] : 'Recent'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Branch & Remote
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 text-base">
                  <GitBranch className="w-4 h-4 text-amber-600" />
                  <span>{systemVersion?.branch || 'master'}</span>
                </div>
                <span className="text-xs text-slate-500 block truncate mt-0.5">
                  Remote: {systemVersion?.remote || 'origin'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Database Snapshot
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-900 text-base">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>Automatic</span>
                </div>
                <span className="text-xs text-slate-500 block truncate mt-0.5">
                  Target: /backend/backups/
                </span>
              </div>
            </div>

            {/* Error or Success Alerts */}
            {updateError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">OTA Update Error</h4>
                  <p className="text-xs sm:text-sm mt-0.5 text-rose-700">{updateError}</p>
                </div>
              </div>
            )}

            {updateSuccess && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-base">System Updated Successfully!</h4>
                    <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                      New commit compiled. All active user sessions are receiving the reload prompt.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Reload Portal
                </button>
              </div>
            )}

            {/* Main Remote Update Controls Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-earist-crimson" />
                    <span>Over-The-Air (OTA) Remote Update Center</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Check remote GitHub repository for new commits, review the changelog, and apply updates with zero downtime.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdates || applyingUpdate}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#800020] hover:bg-[#68001a] text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdates ? 'Checking Remote...' : 'Check for Updates'}</span>
                </button>
              </div>

              {/* Status Display */}
              {updateInfo && !updateInfo.updateAvailable && (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      System is Up to Date
                    </span>
                    <span className="text-xs text-slate-500">
                      Local commit <code className="font-mono font-semibold">{updateInfo.currentCommit}</code> matches remote branch{' '}
                      <code className="font-mono font-semibold">{updateInfo.branch}</code>. Last checked: {new Date(updateInfo.lastChecked).toLocaleTimeString()}.
                    </span>
                  </div>
                </div>
              )}

              {/* Update Available Box */}
              {updateInfo && updateInfo.updateAvailable && (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-950 uppercase tracking-wide">
                        Incoming Release Ready
                      </span>
                      <h4 className="text-xl font-extrabold text-slate-900 mt-2">
                        {updateInfo.commitsBehind} New Commit(s) on Remote Master
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Upgrades local system from commit <code className="font-mono font-bold">{updateInfo.currentCommit}</code> to{' '}
                        <code className="font-mono font-bold text-earist-dark">{updateInfo.remoteCommit}</code>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyUpdate}
                      disabled={applyingUpdate}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                      <span>{applyingUpdate ? 'Applying Update...' : 'Apply Update Now'}</span>
                    </button>
                  </div>

                  {/* Incoming Changelog List */}
                  {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-amber-200/80">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Changelog Preview:
                      </span>
                      <div className="bg-white rounded-xl border border-amber-200 divide-y divide-slate-100 overflow-hidden text-xs">
                        {updateInfo.changelog.map((c, idx) => (
                          <div key={idx} className="p-3 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="font-mono font-bold text-earist-crimson bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0">
                                {c.hash}
                              </span>
                              <span className="font-semibold text-slate-800">{c.message}</span>
                            </div>
                            <span className="text-slate-400 shrink-0 font-medium">
                              {c.author} • {c.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Update Logs Terminal */}
              {(applyingUpdate || updateLogs.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                    <Terminal className="w-4 h-4 text-slate-500" />
                    <span>Update Execution Console</span>
                  </div>
                  <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl space-y-1.5 max-h-56 overflow-y-auto border border-slate-800 shadow-inner">
                    {updateLogs.map((log, i) => (
                      <div key={i} className="leading-relaxed">
                        {log}
                      </div>
                    ))}
                    {applyingUpdate && (
                      <div className="text-amber-300 animate-pulse flex items-center gap-2 pt-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing next step...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Architecture Safety Guarantees */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm text-slate-600">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>Over-The-Air Safety Architecture</span>
              </h4>
              <ul className="grid sm:grid-cols-2 gap-3 pt-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Automatic Database Snapshot:</strong> Pre-update backup copies SQLite to <code className="font-mono text-xs">/backend/backups/</code> prior to code modifications.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Clean Working Tree Guarantee:</strong> Local modified tracked files are verified prior to pulling to avoid merge conflicts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Automated Asset Compilation:</strong> Compiles fresh React bundles with Vite before marking the update complete.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Live Client Notification:</strong> All active sessions (patients, triage, doctors) automatically surface a non-intrusive reload banner.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <Modal
          isOpen={showAddStaffModal}
          onClose={() => setShowAddStaffModal(false)}
          title="Register New Clinic Medical Officer / Staff"
          subtitle="Create an authorized clinic doctor account with pre-seeded appointment shifts"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleAddStaff} className="space-y-4 text-sm">
            {staffError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria"
                  value={addStaffForm.first_name}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santos"
                  value={addStaffForm.last_name}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  placeholder="dr.santos@earist.edu.ph"
                  value={addStaffForm.email}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee / Medical ID</label>
                <input
                  type="text"
                  placeholder="MED-2026-015"
                  value={addStaffForm.id_number}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, id_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinic Room / Station *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Clinic Rm 103"
                  value={addStaffForm.room_number}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, room_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specialization / Department</label>
                <input
                  type="text"
                  placeholder="e.g. General Medicine, Dental Health"
                  value={addStaffForm.specialization}
                  onChange={(e) => setAddStaffForm({ ...addStaffForm, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
              <input
                type="text"
                placeholder="earist2026!"
                value={addStaffForm.initial_password}
                onChange={(e) => setAddStaffForm({ ...addStaffForm, initial_password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">Defaults to earist2026! if left empty.</span>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#800020] hover:bg-[#68001a] shadow-xs transition-colors cursor-pointer"
              >
                {staffSubmitting ? 'Registering...' : 'Register Staff Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <Modal
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          title={`Edit Station — Dr. ${editingStaff.first_name} ${editingStaff.last_name}`}
          subtitle={`Employee ID: ${editingStaff.id_number || 'N/A'}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateStaff} className="space-y-4 text-sm">
            {staffError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {staffError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Clinic Room Number</label>
              <input
                type="text"
                value={editingStaff.room_number || ''}
                onChange={(e) => setEditingStaff({ ...editingStaff, room_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
              <input
                type="text"
                value={editingStaff.specialization || ''}
                onChange={(e) => setEditingStaff({ ...editingStaff, specialization: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
              <input
                type="text"
                value={editingStaff.contact_number || ''}
                onChange={(e) => setEditingStaff({ ...editingStaff, contact_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#800020] hover:bg-[#68001a] shadow-xs cursor-pointer"
              >
                {staffSubmitting ? 'Saving...' : 'Save Station Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetPwStaff && (
        <Modal
          isOpen={!!resetPwStaff}
          onClose={() => setResetPwStaff(null)}
          title={`Reset Staff Password — Dr. ${resetPwStaff.first_name} ${resetPwStaff.last_name}`}
          subtitle={`Account Email: ${resetPwStaff.email}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleResetPassword} className="space-y-4 text-sm">
            {staffError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {staffError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Temporary Password</label>
              <input
                type="text"
                required
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-earist-crimson/20 focus:border-earist-crimson"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Share this new password with the medical officer so they can log in to their consultation dashboard.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetPwStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer"
              >
                {staffSubmitting ? 'Resetting...' : 'Confirm Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Acute Walk-In Intake Modal for Admin */}
      {showWalkInModal && (
        <WalkInModal
          isOpen={showWalkInModal}
          onClose={() => setShowWalkInModal(false)}
          currentDoctorId={1}
          onSuccess={() => {
            fetchAdminData();
          }}
        />
      )}

      {/* Patient Past Visit History Modal */}
      {historyPatient && (
        <PatientHistoryModal
          isOpen={!!historyPatient}
          onClose={() => setHistoryPatient(null)}
          idNumber={historyPatient.idNumber}
          patientName={historyPatient.patientName}
        />
      )}
    </div>
  );
};
