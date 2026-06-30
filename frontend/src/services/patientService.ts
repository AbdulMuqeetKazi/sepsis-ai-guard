import { apiClient, getApiErrorMessage } from '../config/api';
import type { PatientInput, PatientRecord } from '../types/api';

export async function getPatients(): Promise<{ count: number; patients: PatientRecord[] }> {
  try {
    const { data } = await apiClient.get<{ count: number; patients: PatientRecord[] }>('/patients');
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load patients'));
  }
}

export async function createPatient(payload: PatientInput): Promise<PatientRecord> {
  try {
    const { data } = await apiClient.post<PatientRecord>('/patients', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to save patient'));
  }
}

export async function getPatient(patientId: string): Promise<PatientRecord> {
  try {
    const { data } = await apiClient.get<PatientRecord>(`/patients/${patientId}`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load patient'));
  }
}
