import {
  Activity,
  BarChart2,
  Bell,
  Bot,
  History,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/predict', icon: PlusCircle, label: 'New Prediction' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
  { to: '/model-performance', icon: BarChart2, label: 'Model Performance' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-full w-64 flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-200 lg:relative lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-[#E2E8F0] px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00478d]">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">SepsisAI Guard</p>
            <p className="text-xs text-slate-500">Clinical AI</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#00478d]/10 text-[#00478d]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#E2E8F0] px-3 py-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
            <p className="mb-1 font-semibold">Decision Support Only</p>
            <p>Final clinical decisions remain with qualified healthcare professionals.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
