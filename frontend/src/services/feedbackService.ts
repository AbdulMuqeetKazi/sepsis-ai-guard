import { apiClient, getApiErrorMessage } from '../config/api';
import type { FeedbackListResponse, FeedbackPayload, FeedbackResponse } from '../types/api';

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  try {
    const { data } = await apiClient.post<FeedbackResponse>('/feedback', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to submit feedback'));
  }
}

export async function getFeedback(limit = 20): Promise<FeedbackListResponse> {
  try {
    const { data } = await apiClient.get<FeedbackListResponse>('/feedback', {
      params: { limit },
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch feedback history'));
  }
}
