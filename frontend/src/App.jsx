import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ResidentDashboard from './pages/ResidentDashboard';
import LanguageSwitcher from './components/LanguageSwitcher';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ResidentDashboard />} />
          {/* Fallback to landing page for 404s for now */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <LanguageSwitcher />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
