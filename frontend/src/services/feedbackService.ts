import { apiClient, getApiErrorMessage } from '../config/api';
import type { FeedbackPayload, FeedbackResponse } from '../types/api';

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  try {
    const { data } = await apiClient.post<FeedbackResponse>('/feedback', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to submit feedback'));
  }
}
