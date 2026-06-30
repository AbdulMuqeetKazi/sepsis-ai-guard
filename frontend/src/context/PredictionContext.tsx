import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PatientInput, PredictionResponse } from '../types/api';

export interface PredictionSession {
  patientCode?: string;
  formData: PatientInput;
  result: PredictionResponse;
  abnormalFeatures: string[];
  geminiExplanation?: string;
  geminiExplanationSource?: 'gemini' | 'fallback';
  geminiSummary?: string;
  geminiSummarySource?: 'gemini' | 'fallback';
}

interface PredictionContextValue {
  session: PredictionSession | null;
  setSession: (session: PredictionSession | null) => void;
  assistantContext: {
    patientId?: string;
    risk_level: string;
    sepsis_probability: number;
    abnormal_features: string[];
  } | null;
}

const PredictionContext = createContext<PredictionContextValue | undefined>(undefined);

export function PredictionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PredictionSession | null>(null);

  const assistantContext = useMemo(() => {
    if (!session) return null;
    return {
      patientId: session.patientCode,
      risk_level: session.result.risk_level,
      sepsis_probability: session.result.sepsis_probability,
      abnormal_features: session.abnormalFeatures,
    };
  }, [session]);

  const value = useMemo(
    () => ({ session, setSession, assistantContext }),
    [session, assistantContext],
  );

  return (
    <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>
  );
}

export function usePredictionSession() {
  const context = useContext(PredictionContext);
  if (!context) {
    throw new Error('usePredictionSession must be used within PredictionProvider');
  }
  return context;
}
