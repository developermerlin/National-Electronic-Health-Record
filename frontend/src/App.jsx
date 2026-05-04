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
import ReceptionistAppointments from './views/receptionist/ReceptionistAppointments';
import DoctorQueue from './views/doctor/DoctorQueue';
import DoctorDashboard from './views/doctor/DoctorDashboard';
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
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin']}>
            <PatientList />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/patients/register" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin']}>
            <PatientRegister />
          </ProtectedRoute>
        } />
        <Route path="/receptionist/appointments" element={
          <ProtectedRoute allowedRoles={['admin', 'receptionist', 'hospital_admin']}>
            <ReceptionistAppointments />
          </ProtectedRoute>
        } />

        {/* Doctor Routes */}
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor/queue" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin', 'hospital_admin']}>
            <DoctorQueue />
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
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
