import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import SubnetListPage from './pages/SubnetListPage';
import IPListPage from './pages/IPListPage';
import UploadPage from './pages/UploadPage';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/subnets" replace /> : <AuthPage />}
      />
      <Route
        path="/subnets"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <SubnetListPage />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subnets/:subnetId/ips"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <IPListPage />
            </>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <UploadPage />
            </>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/subnets" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
