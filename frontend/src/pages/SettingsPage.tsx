import { LogOut, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { Card, SafetyDisclaimer, StatusDot } from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../hooks/useAuth';
import * as healthService from '../services/healthService';

export default function SettingsPage() {
  const { user, signOut, firebaseConfigured } = useAuth();
  const [backendOnline, setBackendOnline] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    healthService
      .check()
      .then((data) => {
        setBackendOnline(data.status === 'healthy');
        setModelLoaded(data.model_loaded);
      })
      .catch(() => {
        setBackendOnline(false);
        setModelLoaded(false);
      });
  }, []);

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Settings" description="Account, backend status, and app information." />

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">User Profile</h3>
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName ?? 'User'} className="h-12 w-12 rounded-full" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00478d]/10 text-sm font-semibold text-[#00478d]">
              {user?.displayName?.[0] ?? 'U'}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">{user?.displayName ?? 'Clinician'}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Firebase Authentication</span>
            <span className="text-sm font-medium text-slate-900">
              {firebaseConfigured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Backend URL</span>
            <span className="max-w-[220px] truncate text-sm font-medium text-slate-900">{API_BASE_URL}</span>
          </div>
          <StatusDot online={backendOnline} label="Backend API" />
          <StatusDot online={modelLoaded} label="ML Model" />
          <StatusDot online={backendOnline} label="Gemini Assistant (via backend)" />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">App Information</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p><strong className="text-slate-900">Project:</strong> SepsisAI Guard</p>
          <p><strong className="text-slate-900">Title:</strong> Sepsis Prediction Using Machine Learning with Agentic AI</p>
          <p><strong className="text-slate-900">Subtitle:</strong> An Intelligent Clinical Decision Support System for Early Sepsis Risk Detection</p>
        </div>
      </Card>

      <Card className="border-blue-200 bg-blue-50 p-5">
        <div className="flex gap-2">
          <Shield size={15} className="mt-0.5 text-[#00478d]" />
          <SafetyDisclaimer />
        </div>
      </Card>

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
      >
        <LogOut size={15} /> Logout
      </button>
    </div>
  );
}
