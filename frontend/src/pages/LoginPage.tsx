import { Activity, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ErrorBanner, SafetyDisclaimer } from '../components/common/UiPrimitives';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { user, loading, firebaseConfigured, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff] text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="hidden w-2/5 flex-col justify-between bg-[#00478d] p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Activity size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-white">SepsisAI Guard</span>
        </div>
        <div>
          <h2 className="text-3xl leading-tight font-semibold text-white">
            Intelligent Clinical Decision Support for Early Sepsis Risk Detection
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-blue-100">
            Academic prototype combining machine learning prediction with a backend Gemini clinical
            assistant for explanations, summaries, and scoped chat support.
          </p>
        </div>
        <SafetyDisclaimer compact />
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00478d]">
              <Activity size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">SepsisAI Guard</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Sign in to continue</h2>
          <p className="mt-1 mb-8 text-sm text-slate-500">
            Secure Google authentication for the clinical dashboard
          </p>

          {!firebaseConfigured && (
            <ErrorBanner message="Firebase is not configured. Add your Firebase public keys to frontend/.env" />
          )}

          {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

          <button
            type="button"
            disabled={!firebaseConfigured || submitting}
            onClick={handleGoogleSignIn}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {submitting ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <div className="mt-8 flex gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <Shield size={15} className="mt-0.5 flex-shrink-0 text-[#00478d]" />
            <p className="text-xs leading-relaxed text-blue-800">
              Authorized clinical personnel only. Gemini API keys and Supabase secrets remain on the
              backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
