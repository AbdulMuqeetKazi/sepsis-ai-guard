import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AuthProvider } from '../context/AuthContext';
import { PredictionProvider } from '../context/PredictionContext';
import AIAssistantPage from '../pages/AIAssistantPage';
import AlertsPage from '../pages/AlertsPage';
import DashboardPage from '../pages/DashboardPage';
import FeedbackPage from '../pages/FeedbackPage';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import ModelPerformancePage from '../pages/ModelPerformancePage';
import NewPredictionPage from '../pages/NewPredictionPage';
import PatientHistoryPage from '../pages/PatientHistoryPage';
import PatientsPage from '../pages/PatientsPage';
import PredictionResultPage from '../pages/PredictionResultPage';
import SettingsPage from '../pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <PredictionProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/predict" element={<NewPredictionPage />} />
              <Route path="/predict/result" element={<PredictionResultPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/history" element={<PatientHistoryPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/assistant" element={<AIAssistantPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/model-performance" element={<ModelPerformancePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PredictionProvider>
    </AuthProvider>
  );
}
