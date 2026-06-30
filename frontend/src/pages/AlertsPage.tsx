import { AlertTriangle, Bot, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  DemoNotice,
  ErrorBanner,
  LoadingState,
  RiskBadge,
  SourceBadge,
} from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import { usePredictionSession } from '../context/PredictionContext';
import * as agentService from '../services/agentService';
import * as alertService from '../services/alertService';
import type { AlertRecord } from '../types/api';
import { formatDateTime, formatPercent } from '../utils/formatters';
import { normalizeRiskLevel } from '../utils/riskUtils';

export default function AlertsPage() {
  const { assistantContext } = usePredictionSession();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<{ text: string; source: string } | null>(null);
  const [chatReply, setChatReply] = useState<{ text: string; source: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    alertService
      .getAlerts(20)
      .then((data) => setAlerts(data.alerts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (alerts.length === 0) return;
    const topAlert = alerts[0];
    agentService
      .summary({
        patient_id: topAlert.patient_id,
        risk_level: String(topAlert.risk_level ?? topAlert.severity ?? 'High Risk'),
        sepsis_probability: topAlert.sepsis_probability ?? 0.7,
        abnormal_features: [],
      })
      .then((response) =>
        setAiSummary({ text: response.summary ?? 'Summary unavailable.', source: response.source }),
      )
      .catch(() => setAiSummary(null));
  }, [alerts]);

  const handleAskAi = async (alert: AlertRecord) => {
    setChatLoading(true);
    setChatReply(null);
    try {
      const response = await agentService.chat(
        `Explain this alert and why clinical review may be needed for patient ${alert.patient_id ?? 'unknown'}.`,
        alert.patient_id,
        {
          risk_level: String(alert.risk_level ?? alert.severity ?? 'High Risk'),
          sepsis_probability: alert.sepsis_probability ?? 0.7,
          abnormal_features: [],
        },
      );
      setChatReply({ text: response.reply ?? 'No reply returned.', source: response.source });
    } catch (err) {
      setChatReply({
        text: err instanceof Error ? err.message : 'Assistant unavailable',
        source: 'fallback',
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleMarkReviewed = async (alertId: string) => {
    try {
      await alertService.markAlertReviewed(alertId);
      setAlerts(alerts.map(a => 
        (a.id === alertId || (a as any).alert_id === alertId || (a as any).uuid === alertId)
          ? { ...a, status: 'reviewed' }
          : a
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as reviewed');
    }
  };

  if (loading) return <LoadingState message="Loading alerts…" />;

  const criticalAlerts = alerts.filter(
    (alert) => normalizeRiskLevel(String(alert.severity ?? alert.risk_level ?? '')) === 'critical',
  );
  const highAlerts = alerts.filter(
    (alert) => normalizeRiskLevel(String(alert.severity ?? alert.risk_level ?? '')) === 'high',
  );

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Alerts Console"
        description="Live clinical alerts from the backend alert service."
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total Alerts</p>
          <p className="text-2xl font-bold text-slate-900">{alerts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Critical Alerts</p>
          <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">High Risk Alerts</p>
          <p className="text-2xl font-bold text-orange-600">{highAlerts.length}</p>
        </Card>
      </div>

      {aiSummary && (
        <Card className="border-teal-200 bg-teal-50/40 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Bot size={16} className="text-[#006970]" />
            <h3 className="text-sm font-semibold text-slate-900">AI Unit Summary</h3>
            <SourceBadge source={aiSummary.source} />
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{aiSummary.text}</p>
        </Card>
      )}

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <DemoNotice message="No alerts returned from backend." />
        ) : (
          alerts.map((alert) => {
            const risk = String(alert.risk_level ?? alert.severity ?? 'Medium Risk');
            const level = normalizeRiskLevel(risk);
            return (
              <Card key={alert.id ?? alert.message} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        level === 'critical' ? 'bg-red-100' : 'bg-orange-100'
                      }`}
                    >
                      <AlertTriangle size={15} className={level === 'critical' ? 'text-red-600' : 'text-orange-600'} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          Patient {alert.patient_id ?? 'Unknown'}
                        </span>
                        <RiskBadge riskLevel={risk} />
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {alert.status ?? 'open'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{alert.message}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatDateTime(alert.created_at)}
                        </span>
                        {alert.sepsis_probability != null && (
                          <span>Probability: {formatPercent(alert.sepsis_probability)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAskAi(alert)}
                      className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                    >
                      Ask AI
                    </button>
                    <Link
                      to="/assistant"
                      className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open Assistant
                    </Link>
                    <button
                      type="button"
                      disabled={alert.status === 'reviewed'}
                      onClick={() => handleMarkReviewed(alert.id ?? (alert as any).alert_id ?? (alert as any).uuid)}
                      className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {alert.status === 'reviewed' ? 'Reviewed' : 'Mark Reviewed'}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {chatLoading && <LoadingState message="Asking AI assistant…" />}
      {chatReply && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Assistant Reply</h3>
            <SourceBadge source={chatReply.source} />
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{chatReply.text}</p>
        </Card>
      )}

      {assistantContext && (
        <DemoNotice message="Current prediction context is available in the AI Assistant page." />
      )}
    </div>
  );
}
