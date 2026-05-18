import { Route, Routes, BrowserRouter, Navigate } from 'react-router-dom';
import './App.css'
import Home from './views/Home';
import Login from './views/auth/Login';
import Logout from './views/auth/Logout';
import ForgotPassword from './views/auth/ForgotPassword';
import CreateNewPassword from './views/auth/CreateNewPassword';
import AdminDashboard from './views/admin/AdminDashboard';
import UserManagement from './views/admin/UserManagement';
import RoleManagement from './views/admin/RoleManagement';
import RegionManagement from './views/admin/RegionManagement';
import DistrictManagement from './views/admin/DistrictManagement';
import ChiefdomManagement from './views/admin/ChiefdomManagement';
import TownManagement from './views/admin/TownManagement';
import HospitalManagement from './views/admin/HospitalManagement';
import DepartmentManagement from './views/admin/DepartmentManagement';
import MinistryDashboard from './views/ministry/MinistryDashboard';
import ProfilePage from './views/admin/ProfilePage';
import ReceptDashboard from './views/auth/ReceptDashboard';
import PatientList from './views/receptionist/PatientList';
import PatientRegister from './views/receptionist/PatientRegister';
import PatientDetail from './views/receptionist/PatientDetail';
import ReceptionistAppointments from './views/receptionist/ReceptionistAppointments';
import Referrals from './views/receptionist/Referrals';
import DoctorQueue from './views/doctor/DoctorQueue';
import DoctorDashboard from './views/doctor/DoctorDashboard';
import DoctorAppointmentRequests from './views/doctor/DoctorAppointmentRequests';
import DoctorAvailability from './views/doctor/DoctorAvailability';
import DoctorCompletedAppointments from './views/doctor/DoctorCompletedAppointments';
import DoctorPatients from './views/doctor/DoctorPatients';
import PatientPortalDashboard from './views/patient/PatientPortalDashboard';
import PatientBookAppointment from './views/patient/PatientBookAppointment';
import NurseDashboard from './views/nurse/NurseDashboard';
import NurseTriage from './views/nurse/NurseTriage';
import TriageDashboard from './views/triage/TriageDashboard';
import HospitalAdminDashboard from './views/hospital_admin/HospitalAdminDashboard';
import MessagesPage from './views/messages/MessagesPage';
import LiveChatPage from './views/messages/LiveChatPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="spinner-border text-primary" role="status"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/create-new-password" element={<CreateNewPassword />} />

        {/* Hospital Admin Routes */}
        <Route path="/hospital-admin/dashboard" element={
          <ProtectedRoute allowedRoles={['hospital_admin', 'admin']}>
            <HospitalAdminDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'hospital_admin']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/roles" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RoleManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/regions" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin']}>
            <RegionManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/districts" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'district_admin']}>
            <DistrictManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/chiefdoms" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'district_admin']}>
            <ChiefdomManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/towns" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'district_admin']}>
            <TownManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/hospitals" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'district_admin', 'hospital_admin']}>
            <HospitalManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/departments" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'hospital_admin']}>
            <DepartmentManagement />
          </ProtectedRoute>
        } />

        {/* Profile - accessible to all authenticated users */}
        <Route path="/admin/profile" element={
          <ProtectedRoute allowedRoles={[]}>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* Messages - accessible to all authenticated users */}
        <Route path="/messages" element={
          <ProtectedRoute allowedRoles={[]}>
            <MessagesPage />
          </ProtectedRoute>
        } />

        {/* Live Chat - accessible to all authenticated users */}
        <Route path="/chat" element={
          <ProtectedRoute allowedRoles={[]}>
            <LiveChatPage />
          </ProtectedRoute>
        } />

        {/* Ministry Routes */}
        <Route path="/ministry/dashboard" element={
          <ProtectedRoute allowedRoles={['ministry_admin']}>
            <MinistryDashboard />
          </ProtectedRoute>
        } />

        {/* Receptionist Routes */}
        <Route path="/receptionist/dashboard" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist']}>
            <ReceptDashboard />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/patients" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin', 'nurse', 'triage']}>
            <PatientList />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/patients/register" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin', 'nurse', 'triage']}>
            <PatientRegister />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/patients/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin', 'doctor', 'nurse', 'triage']}>
            <PatientDetail />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/appointments" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin']}>
            <ReceptionistAppointments />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/referrals" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin', 'doctor', 'nurse']}>
            <Referrals />
          </ProtectedRoute>
        } />

        {/* Patient Portal Routes */}
        <Route path="/patient/dashboard" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientPortalDashboard />
          </ProtectedRoute>
        } />
        <Route path="/patient/book" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientBookAppointment />
          </ProtectedRoute>
        } />

        {/* Nurse Routes */}
        <Route path="/nurse/dashboard" element={
          <ProtectedRoute allowedRoles={['nurse', 'admin', 'hospital_admin']}>
            <NurseDashboard />
          </ProtectedRoute>
        } />
        <Route path="/nurse/triage" element={
          <ProtectedRoute allowedRoles={['nurse', 'admin', 'hospital_admin']}>
            <NurseDashboard />
          </ProtectedRoute>
        } />
        <Route path="/nurse/walkin" element={
          <ProtectedRoute allowedRoles={['nurse', 'triage', 'admin', 'hospital_admin']}>
            <NurseTriage />
          </ProtectedRoute>
        } />
        <Route path="/triage" element={
          <ProtectedRoute allowedRoles={['nurse', 'receptionist', 'triage', 'admin', 'hospital_admin']}>
            <TriageDashboard />
          </ProtectedRoute>
        } />

        {/* Doctor Routes */}
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor/appointment-requests" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorAppointmentRequests />
          </ProtectedRoute>
        } />
        <Route path="/doctor/availability" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorAvailability />
          </ProtectedRoute>
        } />
        <Route path="/doctor/queue" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorQueue />
          </ProtectedRoute>
        } />
        <Route path="/doctor/completed-appointments" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorCompletedAppointments />
          </ProtectedRoute>
        } />
        <Route path="/doctor/patients" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorPatients />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          toastStyle={{ padding: 0, background: 'transparent', boxShadow: 'none' }}
          bodyStyle={{ padding: 0, margin: 0 }}
        />
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
