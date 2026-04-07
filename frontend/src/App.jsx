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
import HospitalManagement from './views/admin/HospitalManagement';
import MinistryDashboard from './views/ministry/MinistryDashboard';
import ProfilePage from './views/admin/ProfilePage';
import ReceptDashboard from './views/auth/ReceptDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

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
          <ProtectedRoute allowedRoles={['admin']}>
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
        <Route path="/admin/hospitals" element={
          <ProtectedRoute allowedRoles={['admin', 'ministry_admin', 'district_admin', 'hospital_admin']}>
            <HospitalManagement />
          </ProtectedRoute>
        } />

        {/* Profile - accessible to all authenticated users */}
        <Route path="/admin/profile" element={
          <ProtectedRoute allowedRoles={[]}>
            <ProfilePage />
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
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
