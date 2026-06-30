import { apiClient, getApiErrorMessage } from '../config/api';
import type { DashboardResponse } from '../types/api';

export async function getDashboard(): Promise<DashboardResponse> {
  try {
    const { data } = await apiClient.get<DashboardResponse>('/dashboard');
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load dashboard data'));
  }
}
