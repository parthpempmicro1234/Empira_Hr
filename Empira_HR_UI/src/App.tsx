import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import NotFound from './pages/NotFound.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Welcome from './pages/Welcome'
import MyProfile from './pages/MyProfile.jsx'
import Me from './pages/Me.jsx'
import Inbox from './pages/inbox/Inbox.jsx'
import MyTeam from './pages/team/MyTeam.jsx'
import OrganizationRoutes from './pages/organization/OrganizationRoutes'
import AppLayout from './layouts/AppLayout.jsx'
import { isAuthenticated } from './services/storage'

function isAuthed() {
  return isAuthenticated()
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="me" element={<Navigate to="/me/attendance" replace />} />
        <Route path="me/*" element={<Me />} />
        <Route path="inbox" element={<Navigate to="/inbox/take-action" replace />} />
        <Route path="inbox/*" element={<Inbox />} />
        <Route path="team" element={<MyTeam />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="org/*" element={<OrganizationRoutes />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
