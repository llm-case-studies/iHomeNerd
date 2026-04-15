import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CommandCenter from './CommandCenter';

/**
 * When served from the local iHomeNerd backend (localhost:17777),
 * the app goes straight to the Command Center.
 *
 * The landing page (LandingPage.tsx) is deployed separately to
 * ihomenerd.com on IONOS — see /landing/ for that build.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
