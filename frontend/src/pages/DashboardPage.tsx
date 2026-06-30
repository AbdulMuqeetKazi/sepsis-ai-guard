import {
  AlertTriangle,
  Bell,
  Bot,
  BrainCircuit,
  Cpu,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  DemoNotice,
  ErrorBanner,
  LoadingState,
  RiskBadge,
} from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import * as alertService from '../services/alertService';
import * as dashboardService from '../services/dashboardService';
import * as healthService from '../services/healthService';
import * as patientService from '../services/patientService';
import type { AlertRecord, DashboardResponse, HealthResponse, PatientRecord } from '../types/api';
import { formatDateTime } from '../utils/formatters';
import { formatProbability, normalizeRiskLevel } from '../utils/riskUtils';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const nextErrors: string[] = [];

      const [dashboardResult, healthResult, patientsResult, alertsResult] = await Promise.allSettled([
        dashboardService.getDashboard(),
        healthService.check(),
        patientService.getPatients(),
        alertService.getAlerts(5),
      ]);

      if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
      else nextErrors.push(dashboardResult.reason.message);

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      else nextErrors.push(healthResult.reason.message);

      if (patientsResult.status === 'fulfilled') setPatients(patientsResult.value.patients);
      else nextErrors.push(patientsResult.reason.message);

      if (alertsResult.status === 'fulfilled') setAlerts(alertsResult.value.alerts);
      else nextErrors.push(alertsResult.reason.message);

      setErrors(nextErrors);
      setLoading(false);
    };

    load();
  }, []);

  const riskDistribution = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    alerts.forEach((alert) => {
      const level = normalizeRiskLevel(String(alert.risk_level ?? alert.severity ?? 'low'));
      counts[level] += 1;
    });
    return [
      { name: 'Low', value: counts.low, color: '#22C55E' },
      { name: 'Medium', value: counts.medium, color: '#FACC15' },
      { name: 'High', value: counts.high, color: '#F97316' },
      { name: 'Critical', value: counts.critical, color: '#EF4444' },
    ];
  }, [alerts]);

  const aiInsight =
    alerts[0]?.message ??
    'No live alert insight available yet. Run a prediction to generate risk monitoring data.';

  if (loading) return <LoadingState message="Loading dashboard…" />;

  const stats = dashboard?.stats ?? {};
  const highRiskCount = alerts.filter((alert) =>
    ['high', 'critical'].includes(normalizeRiskLevel(String(alert.risk_level ?? alert.severity ?? ''))),
  ).length;

  const kpis = [
    {
      label: 'Total Patients',
      value: String(stats.total_patients ?? patients.length ?? 0),
      icon: Users,
      color: 'text-[#00478d]',
      bg: 'bg-blue-50',
    },
    {
      label: 'Predictions Recorded',
      value: String(stats.total_predictions ?? 'Not available'),
      icon: BrainCircuit,
      color: 'text-[#006970]',
      bg: 'bg-teal-50',
    },
    {
      label: 'High Risk Cases',
      value: String(highRiskCount),
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Critical Alerts',
      value: String(
        alerts.filter((alert) => normalizeRiskLevel(String(alert.severity ?? alert.risk_level ?? '')) === 'critical')
          .length,
      ),
      icon: Bell,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Model Status',
      value: health?.model_loaded ? 'Loaded' : 'Unavailable',
      icon: Cpu,
      color: health?.model_loaded ? 'text-green-600' : 'text-red-600',
      bg: health?.model_loaded ? 'bg-green-50' : 'bg-red-50',
    },
    {
      label: 'Gemini Assistant',
      value: health?.status === 'healthy' ? 'Backend Ready' : 'Check Backend',
      icon: Bot,
      color: 'text-[#006970]',
      bg: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clinical Dashboard"
        description="Overview of patients, predictions, alerts, and system status."
      />

      {errors.length > 0 && (
        <ErrorBanner message={`Some dashboard data could not be loaded: ${errors.join(' · ')}`} />
      )}

      <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#006970]/10">
            <Bot size={18} className="text-[#006970]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI Live Insight</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{aiInsight}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-4">
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-800">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-900">Risk Distribution</h3>
          <p className="mb-4 text-xs text-slate-500">Based on recent alerts</p>
          {riskDistribution.some((item) => item.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {riskDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {riskDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                    <span className="text-slate-500">{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <DemoNotice message="No alert risk distribution available yet." />
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Patients</h3>
            <Link to="/history" className="text-xs font-medium text-[#00478d] hover:underline">
              View all
            </Link>
          </div>
          {patients.length === 0 ? (
            <DemoNotice message="No patients returned from backend yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-left text-slate-500">
                    <th className="py-2 pr-4">Patient ID</th>
                    <th className="py-2 pr-4">Age</th>
                    <th className="py-2 pr-4">Gender</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.slice(0, 5).map((patient) => (
                    <tr key={patient.patient_id} className="border-b border-[#E2E8F0]/60">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{patient.patient_id}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{patient.age ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{patient.gender ?? '—'}</td>
                      <td className="py-2.5 text-slate-500">Registered</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Alerts</h3>
            <Link to="/alerts" className="text-xs font-medium text-[#00478d] hover:underline">
              Open console
            </Link>
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <DemoNotice message="No alerts available from backend." />
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id ?? alert.message}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                >
                  <div className="flex items-center gap-2">
                    <RiskBadge riskLevel={String(alert.risk_level ?? alert.severity ?? 'Medium Risk')} />
                    <span className="text-xs text-slate-500">{formatDateTime(alert.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">{alert.message}</p>
                  {alert.sepsis_probability != null && (
                    <p className="mt-1 text-xs font-medium text-slate-900">
                      Probability: {formatProbability(alert.sepsis_probability)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">System Status</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-slate-500">Backend</span>
              <span className="font-medium text-slate-900">{health?.status ?? 'Unknown'}</span>
            </div>
            <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-slate-500">Model</span>
              <span className="font-medium text-slate-900">
                {dashboard?.model?.name ?? health?.model_name ?? 'Unknown'}{' '}
                {dashboard?.model?.version ?? health?.model_version ?? ''}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-slate-500">Supabase</span>
              <span className="font-medium text-slate-900">
                {dashboard?.supabase_configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Storage</span>
              <span className="font-medium text-slate-900">{stats.storage ?? 'Unknown'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
