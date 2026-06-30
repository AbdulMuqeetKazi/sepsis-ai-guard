import { apiClient, getApiErrorMessage } from '../config/api';
import type { HealthResponse } from '../types/api';

export async function check(): Promise<HealthResponse> {
  try {
    const { data } = await apiClient.get<HealthResponse>('/health');
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Health check failed'));
  }
}
