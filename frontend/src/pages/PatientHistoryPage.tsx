import { Bot, Eye, PlusCircle, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  DemoNotice,
  ErrorBanner,
  LoadingState,
  RiskBadge,
} from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import * as alertService from '../services/alertService';
import * as patientService from '../services/patientService';
import type { AlertRecord, PatientRecord } from '../types/api';
import { formatDateTime, safeValue } from '../utils/formatters';
import { normalizeRiskLevel } from '../utils/riskUtils';

export default function PatientHistoryPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([patientService.getPatients(), alertService.getAlerts(20)]).then(
      ([patientsResult, alertsResult]) => {
        if (patientsResult.status === 'fulfilled') setPatients(patientsResult.value.patients);
        if (alertsResult.status === 'fulfilled') setAlerts(alertsResult.value.alerts);

        const errors = [patientsResult, alertsResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => (result as PromiseRejectedResult).reason.message);
        if (errors.length) setError(errors.join(' · '));
        setLoading(false);
      },
    );
  }, []);

  const rows = useMemo(() => {
    return patients.map((patient) => {
      const relatedAlert = alerts.find((alert) => alert.patient_id === patient.patient_id);
      const riskLevel = relatedAlert?.risk_level ?? relatedAlert?.severity ?? 'Not available';
      return { patient, relatedAlert, riskLevel };
    });
  }, [patients, alerts]);

  const filtered = rows.filter(({ patient, riskLevel }) => {
    const matchesSearch =
      patient.patient_id.toLowerCase().includes(search.toLowerCase()) ||
      String(patient.gender ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' || normalizeRiskLevel(String(riskLevel)) === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingState message="Loading patient history…" />;

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader
        title="Patient History"
        description="Available patient records and linked alert context from the backend."
        action={
          <Link
            to="/predict"
            className="flex items-center gap-2 rounded-lg bg-[#00478d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00386f]"
          >
            <PlusCircle size={15} /> New Patient
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient ID or gender…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  filter === value
                    ? 'bg-[#00478d] text-white'
                    : 'border border-[#E2E8F0] text-slate-600 hover:bg-slate-50'
                }`}
              >
                {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <DemoNotice message="No matching patients found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs text-slate-500">
                  <th className="py-3 pr-4">Patient ID</th>
                  <th className="py-3 pr-4">Age</th>
                  <th className="py-3 pr-4">Gender</th>
                  <th className="py-3 pr-4">Alert / Risk</th>
                  <th className="py-3 pr-4">Last Prediction</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ patient, relatedAlert, riskLevel }) => (
                  <tr key={patient.patient_id} className="border-b border-[#E2E8F0]/60">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-700">{patient.patient_id}</td>
                    <td className="py-3 pr-4 text-slate-600">{safeValue(patient.age)}</td>
                    <td className="py-3 pr-4 text-slate-600">{safeValue(patient.gender)}</td>
                    <td className="py-3 pr-4">
                      {riskLevel === 'Not available' ? (
                        <span className="text-xs text-slate-500">Not available</span>
                      ) : (
                        <RiskBadge riskLevel={String(riskLevel)} />
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {relatedAlert?.created_at
                        ? formatDateTime(relatedAlert.created_at)
                        : 'Pending endpoint'}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <Link
                          to="/predict/result"
                          className="flex items-center gap-1 rounded border border-[#00478d]/30 px-2 py-1 text-xs text-[#00478d] hover:bg-[#00478d]/10"
                        >
                          <Eye size={11} /> View Details
                        </Link>
                        <Link
                          to="/assistant"
                          className="flex items-center gap-1 rounded border border-teal-200 px-2 py-1 text-xs text-teal-700 hover:bg-teal-50"
                        >
                          <Bot size={11} /> Ask AI
                        </Link>
                        <Link
                          to="/alerts"
                          className="flex items-center gap-1 rounded border border-orange-200 px-2 py-1 text-xs text-orange-700 hover:bg-orange-50"
                        >
                          View Alerts
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
