import { apiClient, getApiErrorMessage } from '../config/api';
import type { AlertRecord } from '../types/api';

export async function getAlerts(limit = 20): Promise<{ count: number; alerts: AlertRecord[] }> {
  try {
    const { data } = await apiClient.get<{ count: number; alerts: AlertRecord[] }>('/alerts', {
      params: { limit },
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load alerts'));
  }
}

export async function markAlertReviewed(alertId: string): Promise<{ success: boolean; status: string; message: string }> {
  try {
    const { data } = await apiClient.patch<{ success: boolean; status: string; message: string }>(`/alerts/${alertId}`, {
      status: 'reviewed',
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to mark alert as reviewed'));
  }
}

export async function resolveAlert(alertId: string): Promise<{ success: boolean; status: string; message: string }> {
  try {
    const { data } = await apiClient.patch<{ success: boolean; status: string; message: string }>(`/alerts/${alertId}`, {
      status: 'resolved',
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to resolve alert'));
  }
}
