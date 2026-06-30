import { apiClient, getApiErrorMessage } from '../config/api';
import type { PredictionRequest, PredictionResponse } from '../types/api';

export async function predict(payload: PredictionRequest): Promise<PredictionResponse> {
  try {
    const { data } = await apiClient.post<PredictionResponse>('/predict', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Prediction request failed'));
  }
}
