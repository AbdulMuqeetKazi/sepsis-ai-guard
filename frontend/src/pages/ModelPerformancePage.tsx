import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Card,
  DemoNotice,
  ErrorBanner,
  LoadingState,
} from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import * as dashboardService from '../services/dashboardService';
import * as modelService from '../services/modelService';
import type { DashboardResponse } from '../types/api';
import type { ModelMetrics } from '../services/modelService';

const formatValue = (val: number | undefined) => {
  if (val === undefined || isNaN(val)) return 'Not Available';
  return (val * 100).toFixed(1) + '%';
};

export default function ModelPerformancePage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardService.getDashboard(),
      modelService.getModelMetrics()
    ])
      .then(([dashData, metricsData]) => {
        setDashboard(dashData);
        setMetrics(metricsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading model performance…" />;

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Model Performance"
        description="Backend model status and evaluation metrics."
      />

      {error && <ErrorBanner message={error} />}

      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Model Loaded</p>
            <p className="text-sm font-semibold text-slate-900">
              {dashboard?.model?.loaded ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Model Name</p>
            <p className="text-sm font-semibold text-slate-900">
              {dashboard?.model?.name ?? 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Model Version</p>
            <p className="text-sm font-semibold text-slate-900">
              {dashboard?.model?.version ?? 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Predictions Stored</p>
            <p className="text-sm font-semibold text-slate-900">
              {dashboard?.stats?.total_predictions ?? 'Not available'}
            </p>
          </div>
        </div>
      </Card>

      {!metrics || metrics.error ? (
        <DemoNotice message="Metrics not available." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Accuracy', val: metrics.accuracy },
              { label: 'Precision', val: metrics.precision },
              { label: 'Recall (Sensitivity)', val: metrics.recall },
              { label: 'F1 Score', val: metrics.f1_score },
              { label: 'ROC-AUC', val: metrics.roc_auc },
            ].map(({ label, val }) => (
              <Card key={label} className="p-4">
                <p className="text-2xl font-bold text-[#00478d]">{formatValue(val)}</p>
                <p className="mt-1 text-xs font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{metrics.metrics_source}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#00478d]" style={{ width: `${(val ?? 0) * 100}%` }} />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Confusion Matrix ({metrics.metrics_source})</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'True Positive', val: metrics.confusion_matrix?.true_positive },
                  { label: 'True Negative', val: metrics.confusion_matrix?.true_negative },
                  { label: 'False Positive', val: metrics.confusion_matrix?.false_positive },
                  { label: 'False Negative', val: metrics.confusion_matrix?.false_negative },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-lg font-bold text-slate-900">{val ?? 'N/A'}</p>
                    <p className="text-xs font-semibold text-slate-700">{label}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Feature Importance ({metrics.metrics_source})</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart 
                  data={(metrics.feature_importance || []).map(d => ({
                    ...d,
                    feature: d.feature.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                  }))} 
                  layout="vertical" 
                  margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={140} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#00478d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      <Card className="border-amber-200 bg-amber-50/50 p-5">
        <div className="flex gap-3">
          <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
          <p className="text-sm leading-relaxed text-slate-700">
            Recall is prioritized because missing true sepsis cases is clinically dangerous. 
          </p>
        </div>
      </Card>
    </div>
  );
}
