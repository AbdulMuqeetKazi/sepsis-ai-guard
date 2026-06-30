import type { PatientInput } from '../types/api';

const THRESHOLDS = {
  heart_rate_high: 100,
  temperature_high: 38,
  systolic_bp_low: 90,
  map_low: 65,
  spo2_low: 94,
  lactate_high: 2,
  wbc_low: 4,
  wbc_high: 12,
  creatinine_high: 1.2,
  sofa_high: 2,
  qsofa_high: 2,
};

export function deriveAbnormalFeatures(vitals: PatientInput): string[] {
  const features: string[] = [];

  if (vitals.heart_rate != null && vitals.heart_rate > THRESHOLDS.heart_rate_high) {
    features.push('High heart rate');
  }
  if (vitals.temperature != null && vitals.temperature > THRESHOLDS.temperature_high) {
    features.push('High temperature');
  }
  if (vitals.systolic_bp != null && vitals.systolic_bp < THRESHOLDS.systolic_bp_low) {
    features.push('Low systolic blood pressure');
  }
  if (vitals.map != null && vitals.map < THRESHOLDS.map_low) {
    features.push('Low mean arterial pressure');
  }
  if (vitals.spo2 != null && vitals.spo2 < THRESHOLDS.spo2_low) {
    features.push('Low oxygen saturation');
  }
  if (vitals.lactate != null && vitals.lactate > THRESHOLDS.lactate_high) {
    features.push('High lactate');
  }
  if (
    vitals.wbc_count != null &&
    (vitals.wbc_count < THRESHOLDS.wbc_low || vitals.wbc_count > THRESHOLDS.wbc_high)
  ) {
    features.push('Abnormal white blood cell count');
  }
  if (vitals.creatinine != null && vitals.creatinine > THRESHOLDS.creatinine_high) {
    features.push('Elevated creatinine');
  }
  if (vitals.sofa_score != null && vitals.sofa_score >= THRESHOLDS.sofa_high) {
    features.push('Elevated SOFA score');
  }
  if (vitals.qsofa_score != null && vitals.qsofa_score >= THRESHOLDS.qsofa_high) {
    features.push('Elevated qSOFA score');
  }

  return features;
}

export function parseNumericField(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const EMPTY_PATIENT_FORM: PatientInput = {
  age: undefined,
  gender: undefined,
  heart_rate: undefined,
  respiratory_rate: undefined,
  temperature: undefined,
  systolic_bp: undefined,
  diastolic_bp: undefined,
  map: undefined,
  spo2: undefined,
  wbc_count: undefined,
  platelet_count: undefined,
  hemoglobin: undefined,
  lactate: undefined,
  creatinine: undefined,
  bilirubin: undefined,
  blood_urea_nitrogen: undefined,
  glucose: undefined,
  ph_level: undefined,
  pao2: undefined,
  paco2: undefined,
  sofa_score: undefined,
  qsofa_score: undefined,
  gcs_score: undefined,
  urine_output: undefined,
  shock_index: undefined,
  icu_los: undefined,
};
