import { BrainCircuit, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, ErrorBanner, LoadingState } from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import { usePredictionSession } from '../context/PredictionContext';
import * as agentService from '../services/agentService';
import * as patientService from '../services/patientService';
import * as predictionService from '../services/predictionService';
import type { PatientInput } from '../types/api';
import {
  deriveAbnormalFeatures,
  EMPTY_PATIENT_FORM,
  parseNumericField,
} from '../utils/vitalsUtils';

const sections = ['Patient Details', 'Vital Signs', 'Laboratory Values', 'Clinical Severity Scores'];

type FormState = PatientInput & { patientCode: string };

// ---------------------------------------------------------------------------
// Clinical Reference Values — sourced exclusively from "Feature normal value.txt"
// ---------------------------------------------------------------------------
const REFERENCE_GROUPS = [
  {
    group: 'Vital Signs',
    items: [
      { label: 'Heart Rate', ref: '60–100 bpm' },
      { label: 'Respiratory Rate', ref: '12–20 /min' },
      { label: 'Temperature', ref: '~36.1–37.2 °C' },
      { label: 'Systolic BP', ref: '90–119 mmHg' },
      { label: 'Diastolic BP', ref: '60–79 mmHg' },
      { label: 'MAP', ref: '~70–100 mmHg' },
      { label: 'SpO₂', ref: '95–100%' },
    ],
  },
  {
    group: 'Laboratory Values',
    items: [
      { label: 'WBC Count', ref: '4.5–11.0 ×10⁹/L' },
      { label: 'Platelet Count', ref: '150–400 ×10⁹/L' },
      { label: 'Hemoglobin', ref: 'Male: 13.8–17.2 g/dL\nFemale: 12.1–15.1 g/dL' },
      { label: 'Lactate', ref: '~0.5–2.0 mmol/L' },
      { label: 'Creatinine', ref: 'Male: 0.7–1.3 mg/dL\nFemale: 0.5–0.95 mg/dL' },
      { label: 'Bilirubin', ref: '<1.2 mg/dL' },
      { label: 'Blood Urea Nitrogen', ref: '6–20 mg/dL' },
      { label: 'Glucose', ref: 'Fasting: 70–99 mg/dL' },
    ],
  },
  {
    group: 'Blood Gas / Metabolic',
    items: [
      { label: 'pH Level', ref: '7.35–7.45' },
      { label: 'PaO₂', ref: '75–100 mmHg' },
      { label: 'PaCO₂', ref: '35–45 mmHg' },
    ],
  },
  {
    group: 'Clinical Severity Scores',
    items: [
      { label: 'SOFA Score', ref: '0\nHigher score = greater organ dysfunction' },
      { label: 'qSOFA Score', ref: '0\n≥2 = concerning threshold' },
      { label: 'GCS Score', ref: 'Normal: 15' },
    ],
  },
  {
    group: 'Other Measurements',
    items: [
      { label: 'Urine Output', ref: 'Adequate: ≥0.5 mL/kg/hr' },
      { label: 'Shock Index', ref: '~0.5–0.7 (resting)' },
      // age, gender, icu_los not provided in reference file
      { label: 'Age', ref: 'Reference not provided' },
      { label: 'Gender', ref: 'Reference not provided' },
      { label: 'ICU Length of Stay', ref: 'Reference not provided' },
    ],
  },
];

function ReferencePanel() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-[#00478d]/20 bg-blue-50/60 px-4 py-3">
        <Info size={14} className="flex-shrink-0 text-[#00478d]" />
        <p className="text-xs leading-relaxed text-slate-600">
          Reference ranges are provided for guidance only. They do not replace clinical judgment.
        </p>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white">
        <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Clinical Reference Values</h3>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {REFERENCE_GROUPS.map(({ group, items }) => (
            <div key={group} className="px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#00478d]">
                {group}
              </p>
              <div className="space-y-2">
                {items.map(({ label, ref }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-shrink-0 text-xs font-medium text-slate-700">
                      {label}
                    </span>
                    <span className="whitespace-pre-line text-right text-xs leading-relaxed text-slate-500">
                      {ref}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  unit,
  type = 'number',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-800">{label}</label>
      <div className="flex items-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-white focus-within:border-[#00478d] focus-within:ring-2 focus-within:ring-[#00478d]/20">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        {unit && (
          <span className="border-l border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs text-slate-500">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NewPredictionPage() {
  const navigate = useNavigate();
  const { setSession } = usePredictionSession();
  const [section, setSection] = useState(0);
  const [form, setForm] = useState<FormState>({ ...EMPTY_PATIENT_FORM, patientCode: 'P001' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const buildPayload = (): PatientInput => ({
    age: parseNumericField(String(form.age ?? '')),
    gender: form.gender || undefined,
    heart_rate: parseNumericField(String(form.heart_rate ?? '')),
    respiratory_rate: parseNumericField(String(form.respiratory_rate ?? '')),
    temperature: parseNumericField(String(form.temperature ?? '')),
    systolic_bp: parseNumericField(String(form.systolic_bp ?? '')),
    diastolic_bp: parseNumericField(String(form.diastolic_bp ?? '')),
    map: parseNumericField(String(form.map ?? '')),
    spo2: parseNumericField(String(form.spo2 ?? '')),
    wbc_count: parseNumericField(String(form.wbc_count ?? '')),
    platelet_count: parseNumericField(String(form.platelet_count ?? '')),
    hemoglobin: parseNumericField(String(form.hemoglobin ?? '')),
    lactate: parseNumericField(String(form.lactate ?? '')),
    creatinine: parseNumericField(String(form.creatinine ?? '')),
    bilirubin: parseNumericField(String(form.bilirubin ?? '')),
    blood_urea_nitrogen: parseNumericField(String(form.blood_urea_nitrogen ?? '')),
    glucose: parseNumericField(String(form.glucose ?? '')),
    ph_level: parseNumericField(String(form.ph_level ?? '')),
    pao2: parseNumericField(String(form.pao2 ?? '')),
    paco2: parseNumericField(String(form.paco2 ?? '')),
    sofa_score: parseNumericField(String(form.sofa_score ?? '')),
    qsofa_score: parseNumericField(String(form.qsofa_score ?? '')),
    gcs_score: parseNumericField(String(form.gcs_score ?? '')),
    urine_output: parseNumericField(String(form.urine_output ?? '')),
    shock_index: parseNumericField(String(form.shock_index ?? '')),
    icu_los: parseNumericField(String(form.icu_los ?? '')),
  });

  const handleSavePatient = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await patientService.createPatient(buildPayload());
      setSuccess(`Patient saved with ID ${saved.patient_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save patient');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPrediction = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = buildPayload();
      const result = await predictionService.predict({
        ...payload,
        patient_id: form.patientCode || undefined,
      });
      const abnormalFeatures = deriveAbnormalFeatures(payload);

      let geminiExplanation: string | undefined;
      let geminiExplanationSource: 'gemini' | 'fallback' | undefined;
      let geminiSummary: string | undefined;
      let geminiSummarySource: 'gemini' | 'fallback' | undefined;

      try {
        const [explainRes, summaryRes] = await Promise.all([
          agentService.explain({
            patient_id: form.patientCode,
            risk_level: result.risk_level,
            sepsis_probability: result.sepsis_probability,
            vitals: payload as Record<string, unknown>,
            abnormal_features: abnormalFeatures,
          }),
          agentService.summary({
            patient_id: form.patientCode,
            risk_level: result.risk_level,
            sepsis_probability: result.sepsis_probability,
            vitals: payload as Record<string, unknown>,
            abnormal_features: abnormalFeatures,
          }),
        ]);
        geminiExplanation = explainRes.explanation;
        geminiExplanationSource = explainRes.source;
        geminiSummary = summaryRes.summary;
        geminiSummarySource = summaryRes.source;
      } catch {
        // Prediction succeeded; Gemini enrichment is optional
      }

      setSession({
        patientCode: form.patientCode,
        formData: payload,
        result,
        abnormalFeatures,
        geminiExplanation,
        geminiExplanationSource,
        geminiSummary,
        geminiSummarySource,
      });
      navigate('/predict/result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Processing clinical data…" />;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Add Patient & Run Prediction"
        description="Enter clinical parameters to generate an ML sepsis risk assessment."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Two-column layout: form left, reference panel right */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Left — prediction form */}
        <div className="flex-1 min-w-0">
          <div className="mb-6 flex gap-0">
            {sections.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setSection(index)}
                className={`flex-1 border-b-2 py-2.5 text-xs font-medium transition-colors ${
                  section === index
                    ? 'border-[#00478d] text-[#00478d]'
                    : 'border-[#E2E8F0] text-slate-500 hover:text-slate-800'
                }`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">{sections[section]}</h3>

            {section === 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Patient ID"
                  value={form.patientCode}
                  onChange={(value) => updateField('patientCode', value)}
                  type="text"
                />
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-800">Gender</label>
                  <select
                    value={form.gender ?? ''}
                    onChange={(event) => updateField('gender', event.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Field label="Age" value={String(form.age ?? '')} onChange={(value) => updateField('age', value)} />
              </div>
            )}

            {section === 1 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Heart Rate" value={String(form.heart_rate ?? '')} onChange={(v) => updateField('heart_rate', v)} unit="bpm" />
                <Field label="Respiratory Rate" value={String(form.respiratory_rate ?? '')} onChange={(v) => updateField('respiratory_rate', v)} unit="/min" />
                <Field label="Temperature" value={String(form.temperature ?? '')} onChange={(v) => updateField('temperature', v)} unit="°C" />
                <Field label="Systolic BP" value={String(form.systolic_bp ?? '')} onChange={(v) => updateField('systolic_bp', v)} unit="mmHg" />
                <Field label="Diastolic BP" value={String(form.diastolic_bp ?? '')} onChange={(v) => updateField('diastolic_bp', v)} unit="mmHg" />
                <Field label="MAP" value={String(form.map ?? '')} onChange={(v) => updateField('map', v)} unit="mmHg" />
                <Field label="SpO₂" value={String(form.spo2 ?? '')} onChange={(v) => updateField('spo2', v)} unit="%" />
              </div>
            )}

            {section === 2 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="WBC Count" value={String(form.wbc_count ?? '')} onChange={(v) => updateField('wbc_count', v)} unit="×10⁹/L" />
                <Field label="Platelet Count" value={String(form.platelet_count ?? '')} onChange={(v) => updateField('platelet_count', v)} unit="×10⁹/L" />
                <Field label="Hemoglobin" value={String(form.hemoglobin ?? '')} onChange={(v) => updateField('hemoglobin', v)} unit="g/dL" />
                <Field label="Lactate" value={String(form.lactate ?? '')} onChange={(v) => updateField('lactate', v)} unit="mmol/L" />
                <Field label="Creatinine" value={String(form.creatinine ?? '')} onChange={(v) => updateField('creatinine', v)} unit="mg/dL" />
                <Field label="Bilirubin" value={String(form.bilirubin ?? '')} onChange={(v) => updateField('bilirubin', v)} unit="mg/dL" />
                <Field label="Blood Urea Nitrogen" value={String(form.blood_urea_nitrogen ?? '')} onChange={(v) => updateField('blood_urea_nitrogen', v)} unit="mg/dL" />
                <Field label="Glucose" value={String(form.glucose ?? '')} onChange={(v) => updateField('glucose', v)} unit="mg/dL" />
                <Field label="pH Level" value={String(form.ph_level ?? '')} onChange={(v) => updateField('ph_level', v)} />
                <Field label="PaO₂" value={String(form.pao2 ?? '')} onChange={(v) => updateField('pao2', v)} unit="mmHg" />
                <Field label="PaCO₂" value={String(form.paco2 ?? '')} onChange={(v) => updateField('paco2', v)} unit="mmHg" />
                <Field label="Urine Output" value={String(form.urine_output ?? '')} onChange={(v) => updateField('urine_output', v)} unit="mL/hr" />
                <Field label="Shock Index" value={String(form.shock_index ?? '')} onChange={(v) => updateField('shock_index', v)} />
                <Field label="ICU Length of Stay" value={String(form.icu_los ?? '')} onChange={(v) => updateField('icu_los', v)} unit="days" />
              </div>
            )}

            {section === 3 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="SOFA Score" value={String(form.sofa_score ?? '')} onChange={(v) => updateField('sofa_score', v)} unit="pts" />
                <Field label="qSOFA Score" value={String(form.qsofa_score ?? '')} onChange={(v) => updateField('qsofa_score', v)} unit="pts" />
                <Field label="GCS Score" value={String(form.gcs_score ?? '')} onChange={(v) => updateField('gcs_score', v)} unit="pts" />
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 md:col-span-2">
                  Scoring supports clinical context only. Final interpretation requires qualified clinician review.
                </div>
              </div>
            )}
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={section === 0}
              onClick={() => setSection(Math.max(0, section - 1))}
              className="text-sm font-medium text-slate-500 disabled:opacity-40"
            >
              ← Previous
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSavePatient}
                className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Save Patient
              </button>
              {section < sections.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setSection(section + 1)}
                  className="rounded-lg bg-[#00478d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00386f]"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRunPrediction}
                  className="flex items-center gap-2 rounded-lg bg-[#00478d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00386f]"
                >
                  <BrainCircuit size={15} /> Run Prediction
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right — Clinical Reference Values panel */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <ReferencePanel />
        </div>
      </div>
    </div>
  );
}
