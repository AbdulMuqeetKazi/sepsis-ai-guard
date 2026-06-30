import { apiClient, getApiErrorMessage } from '../config/api';
import type {
  AgentContextPayload,
  AgentTextResponse,
  FeedbackPayload,
  FeedbackResponse,
  PredictionContextPayload,
} from '../types/api';

export async function explain(context: AgentContextPayload): Promise<AgentTextResponse> {
  try {
    const { data } = await apiClient.post<AgentTextResponse>('/agent/explain', context);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to generate explanation'));
  }
}

export async function summary(context: AgentContextPayload): Promise<AgentTextResponse> {
  try {
    const { data } = await apiClient.post<AgentTextResponse>('/agent/summary', context);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to generate summary'));
  }
}

export async function chat(
  message: string,
  patientId: string | null | undefined,
  context: PredictionContextPayload,
): Promise<AgentTextResponse> {
  try {
    const { data } = await apiClient.post<AgentTextResponse>('/agent/chat', {
      message,
      patient_id: patientId,
      prediction_context: context,
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Assistant request failed'));
  }
}

export async function voiceQuery(
  message: string,
  patientId: string | null | undefined,
  context: PredictionContextPayload,
): Promise<AgentTextResponse> {
  try {
    const { data } = await apiClient.post<AgentTextResponse>('/agent/voice-query', {
      message,
      patient_id: patientId,
      prediction_context: context,
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Voice query failed'));
  }
}
