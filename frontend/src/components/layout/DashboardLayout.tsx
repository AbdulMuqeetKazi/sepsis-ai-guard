import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import * as healthService from '../../services/healthService';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/predict': 'New Prediction',
  '/patients': 'Patients',
  '/history': 'Patient History',
  '/alerts': 'Alerts Console',
  '/assistant': 'AI Assistant',
  '/feedback': 'Clinical Feedback',
  '/model-performance': 'Model Performance',
  '/settings': 'Settings',
  '/predict/result': 'Prediction Result',
};

export function DashboardLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    healthService
      .check()
      .then((data) => setBackendOnline(data.status === 'healthy'))
      .catch(() => setBackendOnline(false));
  }, []);

  const title = titles[location.pathname] ?? 'SepsisAI Guard';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9f9ff]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          backendOnline={backendOnline}
          geminiOnline={backendOnline}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
