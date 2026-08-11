export interface PatientInput {
  age?: number | null;
  gender?: string | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  temperature?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  map?: number | null;
  spo2?: number | null;
  wbc_count?: number | null;
  platelet_count?: number | null;
  hemoglobin?: number | null;
  lactate?: number | null;
  creatinine?: number | null;
  bilirubin?: number | null;
  blood_urea_nitrogen?: number | null;
  glucose?: number | null;
  ph_level?: number | null;
  pao2?: number | null;
  paco2?: number | null;
  sofa_score?: number | null;
  qsofa_score?: number | null;
  gcs_score?: number | null;
  urine_output?: number | null;
  shock_index?: number | null;
  icu_los?: number | null;
}

export interface PatientRecord extends PatientInput {
  patient_id: string;
}

export interface PredictionRequest extends PatientInput {
  patient_id?: string | null;
}

export interface PredictionResponse {
  sepsis_probability: number;
  risk_level: string;
  prediction: number;
  explanation: string[];
  recommendation: string;
  agent_summary: Record<string, unknown>;
  model_version: string;
  patient_uuid?: string | null;
  vitals_id?: string | null;
  prediction_id?: string | null;
  alert_id?: string | null;
}

export interface AlertRecord {
  id?: string;
  patient_id?: string;
  prediction_id?: string;
  alert_type?: string;
  severity?: string;
  message?: string;
  status?: string;
  created_at?: string;
  risk_level?: string;
  sepsis_probability?: number;
}

export interface DashboardResponse {
  app: string;
  version: string;
  model: {
    loaded: boolean;
    name: string;
    version: string;
  };
  stats: {
    total_patients?: number;
    total_predictions?: number;
    total_alerts?: number;
    total_feedback?: number;
    storage?: string;
  };
  supabase_configured: boolean;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  model_loaded: boolean;
  model_name: string;
  model_version: string;
  supabase_configured: boolean;
}

export interface AgentTextResponse {
  success: boolean;
  source: 'gemini' | 'fallback';
  explanation?: string;
  summary?: string;
  reply?: string;
}

export interface FeedbackPayload {
  prediction_id: string;
  actual_result: string | boolean;
  doctor_comment?: string | null;
  is_prediction_correct: boolean;
}

export interface FeedbackResponse {
  status: string;
  message: string;
  feedback_id: string;
}

export interface FeedbackRecord {
  id: string;
  prediction_id: string;
  actual_result?: string | null;
  doctor_comment?: string | null;
  is_prediction_correct?: boolean | null;
  created_at?: string | null;
}

export interface FeedbackListResponse {
  feedback: FeedbackRecord[];
  count: number;
}

export interface AgentContextPayload {
  patient_id?: string | null;
  risk_level: string;
  sepsis_probability: number;
  vitals?: Record<string, unknown>;
  abnormal_features?: string[];
}

export interface PredictionContextPayload {
  risk_level: string;
  sepsis_probability: number;
  abnormal_features?: string[];
}
