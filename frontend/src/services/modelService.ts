import { apiClient, getApiErrorMessage } from '../config/api';

export interface ModelMetrics {
  model_name: string;
  model_version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  confusion_matrix: {
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
  };
  feature_importance: Array<{
    feature: string;
    importance: number;
  }>;
  training_date: string;
  metrics_source: string;
  error?: string;
}

export async function getModelMetrics(): Promise<ModelMetrics> {
  try {
    const { data } = await apiClient.get<ModelMetrics>('/model/metrics');
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load model metrics'));
  }
}
