export type RiskLevelKey = 'low' | 'medium' | 'high' | 'critical';

const RISK_COLORS: Record<RiskLevelKey, string> = {
  low: '#22C55E',
  medium: '#FACC15',
  high: '#F97316',
  critical: '#EF4444',
};

const RISK_BADGE_CLASSES: Record<RiskLevelKey, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export function normalizeRiskLevel(riskLevel: string): RiskLevelKey {
  const value = riskLevel.toLowerCase();
  if (value.includes('critical')) return 'critical';
  if (value.includes('high')) return 'high';
  if (value.includes('medium')) return 'medium';
  return 'low';
}

export function getRiskColor(riskLevel: string): string {
  return RISK_COLORS[normalizeRiskLevel(riskLevel)];
}

export function getRiskBadgeClass(riskLevel: string): string {
  return RISK_BADGE_CLASSES[normalizeRiskLevel(riskLevel)];
}

export function formatProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function getRiskLabel(riskLevel: string): string {
  const key = normalizeRiskLevel(riskLevel);
  return `${key.charAt(0).toUpperCase()}${key.slice(1)} Risk`;
}
