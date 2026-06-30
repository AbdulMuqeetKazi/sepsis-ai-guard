import type { ReactNode } from 'react';
import { getRiskBadgeClass, getRiskLabel, normalizeRiskLevel } from '../../utils/riskUtils';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#E2E8F0] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const key = normalizeRiskLevel(riskLevel);
  const dotColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRiskBadgeClass(riskLevel)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[key]}`} />
      {getRiskLabel(riskLevel)}
    </span>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function SourceBadge({ source }: { source?: 'gemini' | 'fallback' | string }) {
  const isGemini = source === 'gemini';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        isGemini ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'
      }`}
    >
      Source: {isGemini ? 'Gemini' : 'Fallback'}
    </span>
  );
}

export function SafetyDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-slate-600 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
      Decision-support only. Final clinical decisions remain with qualified healthcare
      professionals. This system does not diagnose, prescribe medicine, or replace clinical
      judgment.
    </p>
  );
}

export function StatusDot({ online, label }: { online: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-400'}`} />
      <span className="font-medium text-slate-500">{label}</span>
      <span className={`font-semibold ${online ? 'text-green-600' : 'text-red-500'}`}>
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

export function DemoNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Demo data: {message}
    </div>
  );
}
