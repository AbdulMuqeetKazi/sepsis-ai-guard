import { CheckCircle, Clock, MessageSquare, ThumbsDown, ThumbsUp, TrendingUp, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, ErrorBanner, LoadingState } from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import * as feedbackService from '../services/feedbackService';
import type { FeedbackRecord } from '../types/api';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function CorrectnessBadge({ value }: { value: boolean | null | undefined }) {
  if (value === true)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        <CheckCircle size={11} /> Correct
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle size={11} /> Incorrect
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
      Unknown
    </span>
  );
}

export default function FeedbackPage() {
  const location = useLocation();
  const initialPredictionId =
    (location.state as { predictionId?: string } | null)?.predictionId ?? '';

  const [predictionId, setPredictionId] = useState(initialPredictionId);
  const [actualResult, setActualResult] = useState('');
  const [doctorComment, setDoctorComment] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await feedbackService.getFeedback(20);
      setHistory(result.feedback);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load feedback history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    if (!predictionId.trim()) {
      setError('Prediction ID is required.');
      return;
    }
    if (!actualResult.trim()) {
      setError('Actual clinical outcome is required.');
      return;
    }
    if (isCorrect == null) {
      setError('Please indicate whether the prediction was correct.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await feedbackService.submitFeedback({
        prediction_id: predictionId.trim(),
        actual_result: actualResult.trim(),
        doctor_comment: doctorComment.trim() || null,
        is_prediction_correct: isCorrect,
      });
      setSuccess(`${response.message} (Feedback ID: ${response.feedback_id})`);
      // Reset form fields
      setPredictionId('');
      setActualResult('');
      setDoctorComment('');
      setIsCorrect(null);
      // Refresh history list
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Clinical Feedback"
        description="Submit outcome feedback for clinical audit and future model improvement."
      />

      <Card className="border-[#00478d]/20 bg-blue-50/50 p-5">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00478d]/10">
            <TrendingUp size={15} className="text-[#00478d]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Why feedback matters</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Feedback supports clinical audit and future model improvement. It does not automatically
              retrain the deployed model.
            </p>
          </div>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <Card className="p-6">
        <h3 className="mb-5 text-sm font-semibold text-slate-900">Submit Prediction Feedback</h3>
        <div className="max-w-2xl space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-800">Prediction ID</label>
            <input
              value={predictionId}
              onChange={(event) => setPredictionId(event.target.value)}
              placeholder="Paste prediction UUID from result page"
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00478d] focus:ring-2 focus:ring-[#00478d]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-800">Actual Clinical Outcome</label>
            <select
              value={actualResult}
              onChange={(event) => setActualResult(event.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm outline-none"
            >
              <option value="">Select outcome…</option>
              <option value="Sepsis confirmed">Sepsis confirmed</option>
              <option value="No sepsis">No sepsis</option>
              <option value="Infection without sepsis">Infection without sepsis</option>
              <option value="Other diagnosis">Other diagnosis</option>
              <option value="Outcome pending">Outcome pending</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-800">
              Was the prediction correct?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCorrect(true)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                  isCorrect === true
                    ? 'border-green-400 bg-green-100 text-green-700'
                    : 'border-[#E2E8F0] text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp size={14} /> Yes, Correct
              </button>
              <button
                type="button"
                onClick={() => setIsCorrect(false)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                  isCorrect === false
                    ? 'border-red-400 bg-red-100 text-red-700'
                    : 'border-[#E2E8F0] text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ThumbsDown size={14} /> No, Incorrect
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-800">Clinician Comment</label>
            <textarea
              rows={4}
              value={doctorComment}
              onChange={(event) => setDoctorComment(event.target.value)}
              placeholder="Describe the clinical outcome and any relevant context…"
              className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00478d] focus:ring-2 focus:ring-[#00478d]/20"
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="rounded-lg bg-[#00478d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00386f] disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </Card>

      {/* Feedback History */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Previous Feedback</h3>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
            className="text-xs font-medium text-[#00478d] hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {historyLoading && <LoadingState message="Loading feedback history…" />}

        {historyError && !historyLoading && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {historyError}
          </div>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquare size={32} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No feedback submitted yet</p>
            <p className="text-xs text-slate-400">
              Submitted feedback records will appear here after saving.
            </p>
          </div>
        )}

        {!historyLoading && !historyError && history.length > 0 && (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CorrectnessBadge value={record.is_prediction_correct} />
                    {record.actual_result && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                        {record.actual_result}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11} />
                    {formatDate(record.created_at)}
                  </span>
                </div>

                <p className="mb-1 font-mono text-xs text-slate-400">
                  Prediction ID: {record.prediction_id || '—'}
                </p>

                {record.doctor_comment && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    "{record.doctor_comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
