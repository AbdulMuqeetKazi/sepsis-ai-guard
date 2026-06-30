import { AlertTriangle, Bot, BrainCircuit, MessageSquare, Shield } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import {
  Card,
  RiskBadge,
  SafetyDisclaimer,
  SourceBadge,
} from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import { usePredictionSession } from '../context/PredictionContext';
import { formatProbability, getRiskColor, normalizeRiskLevel } from '../utils/riskUtils';

export default function PredictionResultPage() {
  const { session } = usePredictionSession();

  if (!session) {
    return <Navigate to="/predict" replace />;
  }

  const { result, formData, patientCode, abnormalFeatures, geminiExplanation, geminiExplanationSource, geminiSummary, geminiSummarySource } = session;
  const riskKey = normalizeRiskLevel(result.risk_level);
  const riskColor = getRiskColor(result.risk_level);

  const vitalsEntries = Object.entries(formData).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Prediction Result"
        description={`Patient ${patientCode ?? 'Unknown'} · Model ${result.model_version}`}
      />

      <div
        className="rounded-xl border-2 p-6"
        style={{ borderColor: riskColor, backgroundColor: `${riskColor}10` }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <AlertTriangle size={20} style={{ color: riskColor }} />
              <h2 className="text-lg font-bold text-slate-900">{result.risk_level}</h2>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              ML sepsis probability: <strong>{formatProbability(result.sepsis_probability)}</strong> · Binary
              prediction: {result.prediction === 1 ? 'Positive screen' : 'Negative screen'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge riskLevel={result.risk_level} />
              {result.alert_id ? (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Alert generated
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  No alert generated
                </span>
              )}
            </div>
          </div>

          <div
            className="flex h-28 w-28 items-center justify-center rounded-full border-8 bg-white"
            style={{ borderColor: riskColor }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: riskColor }}>
                {formatProbability(result.sepsis_probability)}
              </p>
              <p className="text-xs text-slate-500">probability</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BrainCircuit size={16} className="text-[#00478d]" />
            <h3 className="text-sm font-semibold text-slate-900">ML Explanation</h3>
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            {result.explanation.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bot size={16} className="text-[#006970]" />
            <h3 className="text-sm font-semibold text-slate-900">Gemini Clinical Insight</h3>
            {geminiExplanationSource && <SourceBadge source={geminiExplanationSource} />}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {geminiExplanation ??
              'Gemini explanation unavailable. The ML explanation and recommendation below remain available.'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bot size={16} className="text-[#006970]" />
          <h3 className="text-sm font-semibold text-slate-900">Clinical Summary</h3>
          {geminiSummarySource && <SourceBadge source={geminiSummarySource} />}
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          {geminiSummary ?? 'Summary unavailable from Gemini assistant.'}
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Abnormal Vitals & Labs</h3>
        {abnormalFeatures.length === 0 ? (
          <p className="text-sm text-slate-500">No abnormal features flagged from entered values.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {abnormalFeatures.map((feature) => (
              <div key={feature} className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm font-medium text-orange-800">
                {feature}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Entered Clinical Values</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {vitalsEntries.map(([key, value]) => (
            <div key={key} className="rounded-lg bg-[#F8FAFC] p-3">
              <p className="text-xs text-slate-500">{key.replace(/_/g, ' ')}</p>
              <p className="text-sm font-semibold text-slate-900">{String(value)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield size={15} className="text-[#00478d]" />
          <h3 className="text-sm font-semibold text-slate-900">Recommendation</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{result.recommendation}</p>
        <p className="mt-3 text-sm text-slate-600">
          {riskKey === 'critical' || riskKey === 'high'
            ? 'Immediate clinical review recommended.'
            : 'Suggested monitoring support only. Please verify patient condition with a qualified healthcare professional.'}
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Record IDs</h3>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p><span className="text-slate-500">patient_uuid:</span> {result.patient_uuid ?? 'Not available'}</p>
          <p><span className="text-slate-500">vitals_id:</span> {result.vitals_id ?? 'Not available'}</p>
          <p><span className="text-slate-500">prediction_id:</span> {result.prediction_id ?? 'Not available'}</p>
          <p><span className="text-slate-500">alert_id:</span> {result.alert_id ?? 'Not available'}</p>
        </div>
      </Card>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <SafetyDisclaimer />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/assistant"
          className="flex items-center gap-2 rounded-lg bg-[#00478d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00386f]"
        >
          <Bot size={15} /> Ask AI Assistant
        </Link>
        <Link
          to="/feedback"
          state={{ predictionId: result.prediction_id }}
          className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <MessageSquare size={15} /> Submit Feedback
        </Link>
      </div>
    </div>
  );
}
