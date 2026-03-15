import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import AuthLayout from './components/shared/AuthLayout'
import ErrorBoundary from './components/shared/ErrorBoundary'
import LoadingSpinner from './components/shared/LoadingSpinner'
import ProtectedRoute from './components/shared/ProtectedRoute'
import { ROLES } from './constants'
import CreateStudentAccount from './pages/provost/CreateStudentAccount'
import HallClosureSchedule from './pages/provost/HallClosureSchedule'
import PaymentHistory from './pages/provost/PaymentHistory'
import ProvostDashboard from './pages/provost/ProvostDashboard'
import ViewAccountsPasswords from './pages/provost/ViewAccountsPasswords'
import HallMasterPage from './pages/public/HallMasterPage'
import ProvostLoginPage from './pages/public/ProvostLoginPage'
import StaffLoginPage from './pages/public/StaffLoginPage'
import StudentLoginPage from './pages/public/StudentLoginPage'
import StaffCreateAccount from './pages/staff/StaffCreateAccount'
import StaffDashboard from './pages/staff/StaffDashboard'
import StaffHallClosure from './pages/staff/StaffHallClosure'
import StaffPaymentHistory from './pages/staff/StaffPaymentHistory'
import ChangePassword from './pages/student/ChangePassword'
import ContactPage from './pages/student/ContactPage'
import HelpPage from './pages/student/HelpPage'
import StudentHome from './pages/student/StudentHome'
import StudentProfile from './pages/student/StudentProfile'

const PaymentSlipGenerator = lazy(() => import('./pages/staff/PaymentSlipGenerator'))
const StudentPayments = lazy(() => import('./pages/student/StudentPayments'))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
        <Route path="/" element={<Navigate to="/halls" replace />} />
        <Route path="/halls" element={<HallMasterPage />} />
        <Route path="/admin/login" element={<ProvostLoginPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/hall/:hallId/login" element={<StudentLoginPage />} />

        <Route
          path="/provost/*"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROVOST]} redirectTo="/admin/login" />
          }
        >
          <Route element={<AuthLayout role={ROLES.PROVOST} />}>
            <Route path="dashboard" element={<ProvostDashboard />} />
            <Route path="create-account" element={<CreateStudentAccount />} />
            <Route path="accounts" element={<ViewAccountsPasswords />} />
            <Route path="hall-closure" element={<HallClosureSchedule />} />
            <Route path="payment-history" element={<PaymentHistory />} />
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route
          path="/staff/*"
          element={<ProtectedRoute allowedRoles={[ROLES.STAFF]} redirectTo="/staff/login" />}
        >
          <Route element={<AuthLayout role={ROLES.STAFF} />}>
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="create-account" element={<StaffCreateAccount />} />
            <Route
              path="payment-generator"
              element={
                <Suspense fallback={<LoadingSpinner variant="inline" label="Loading payment generator..." />}>
                  <PaymentSlipGenerator />
                </Suspense>
              }
            />
            <Route path="hall-closure" element={<StaffHallClosure />} />
            <Route path="payment-history" element={<StaffPaymentHistory />} />
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT]} redirectTo="/halls" />
          }
        >
          <Route element={<AuthLayout role={ROLES.STUDENT} />}>
            <Route path="home" element={<StudentHome />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route
              path="payments"
              element={
                <Suspense fallback={<LoadingSpinner variant="inline" label="Loading payment details..." />}>
                  <StudentPayments />
                </Suspense>
              }
            />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>
          <Route path="*" element={<Navigate to="home" replace />} />
        </Route>

          <Route path="*" element={<Navigate to="/halls" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
