import { ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, ErrorBanner } from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import * as feedbackService from '../services/feedbackService';

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

      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Previous Feedback</h3>
        <p className="text-sm text-slate-500">
          Previous feedback history is not available from the backend yet. Pending endpoint.
        </p>
      </Card>
    </div>
  );
}
