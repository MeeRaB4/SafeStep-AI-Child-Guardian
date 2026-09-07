import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { GuardianProvider } from './context/GuardianContext';
import { LogoMark } from './components/Logo';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Kid from './pages/Kid';
import Dashboard from './pages/Dashboard';
import Activity from './pages/Activity';
import Alerts from './pages/Alerts';
import Assistant from './pages/Assistant';
import Reports from './pages/Reports';
import Devices from './pages/Devices';
import Settings from './pages/Settings';

function ProtectedApp() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <GuardianProvider key={user.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="activity" element={<Activity />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="reports" element={<Reports />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </GuardianProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LogoMark className="mx-auto h-14 w-14 animate-pulse" />
          <div className="mx-auto mt-3 h-1 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-400" />
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/kid" element={<Kid />} />
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/app" replace /> : <Signup />} />
      <Route path="/app/*" element={<ProtectedApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
