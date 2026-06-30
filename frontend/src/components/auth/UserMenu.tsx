import { LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    signOut();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName ?? 'User'} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00478d]/10">
            <User size={16} className="text-[#00478d]" />
          </div>
        )}
        <div className="hidden text-left md:block">
          <p className="text-xs font-semibold text-slate-900">{user.displayName ?? 'Clinician'}</p>
          <p className="max-w-[160px] truncate text-xs text-slate-500">{user.email}</p>
        </div>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-lg">
            <div className="border-b border-[#E2E8F0] px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{user.displayName ?? 'Clinician'}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
