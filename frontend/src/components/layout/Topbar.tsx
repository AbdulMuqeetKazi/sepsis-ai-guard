import { Bell, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../auth/UserMenu';
import { StatusDot } from '../common/UiPrimitives';

export function Topbar({
  title,
  backendOnline,
  geminiOnline,
  onToggleSidebar,
}: {
  title: string;
  backendOnline?: boolean;
  geminiOnline?: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-4 border-r border-[#E2E8F0] pr-4 lg:flex">
          <StatusDot online={backendOnline ?? false} label="Backend" />
          <StatusDot online={geminiOnline ?? false} label="Gemini Assistant" />
        </div>
        <Link
          to="/alerts"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Alerts"
        >
          <Bell size={16} />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
