import {
  Activity,
  ArrowRight,
  BarChart2,
  Bell,
  Bot,
  BrainCircuit,
  CheckCircle,
  HeartPulse,
  History,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafetyDisclaimer } from '../components/common/UiPrimitives';

export default function LandingPage() {
  const features = [
    {
      icon: BrainCircuit,
      title: 'ML Sepsis Prediction',
      desc: 'Academic prototype using a trained ML model for early sepsis risk scoring from vitals and labs.',
    },
    {
      icon: Bot,
      title: 'Gemini Clinical Assistant',
      desc: 'Backend-powered explanations, summaries, and scoped chat for clinical decision support.',
    },
    {
      icon: Bell,
      title: 'Real-Time Alerts',
      desc: 'High and critical risk notifications for timely clinical review.',
    },
    {
      icon: History,
      title: 'Patient History',
      desc: 'Track registered patients and available alert context from the backend.',
    },
    {
      icon: MessageSquare,
      title: 'Clinical Feedback',
      desc: 'Submit outcome feedback for clinical audit and future model improvement.',
    },
    {
      icon: BarChart2,
      title: 'Model Performance',
      desc: 'Review model status and clearly labelled training or demo metrics.',
    },
  ];

  const workflow = [
    { step: '01', label: 'Enter Vitals', icon: HeartPulse },
    { step: '02', label: 'ML Prediction', icon: BrainCircuit },
    { step: '03', label: 'Gemini Explanation', icon: Bot },
    { step: '04', label: 'Alert', icon: Bell },
    { step: '05', label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9ff] font-[Inter,sans-serif]">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00478d]">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900">SepsisAI Guard</span>
              <p className="text-xs text-slate-500">Clinical Decision Support</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Login
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-[#00478d] px-4 py-2 text-sm font-medium text-white hover:bg-[#00386f]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
            Academic clinical decision-support prototype for early sepsis risk detection
          </div>
          <h1 className="font-['Hanken_Grotesk',Inter,sans-serif] text-5xl leading-tight font-bold tracking-tight text-slate-900">
            Early Sepsis Risk Detection
            <br />
            <span className="text-[#00478d]">with Agentic AI Clinical Support</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Sepsis Prediction Using Machine Learning with Agentic AI — an intelligent clinical
            decision-support system for early sepsis risk detection.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-lg bg-[#00478d] px-6 py-3 font-medium text-white hover:bg-[#00386f]"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-[#E2E8F0] px-6 py-3 font-medium text-slate-800 hover:bg-slate-50"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-['Hanken_Grotesk',Inter,sans-serif] text-3xl font-bold text-slate-900">
              Clinical AI Capabilities
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Purpose-built tools for sepsis risk monitoring in a final-year academic prototype.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#00478d]/10">
                  <Icon size={18} className="text-[#00478d]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-['Hanken_Grotesk',Inter,sans-serif] text-3xl font-bold text-slate-900">
            How It Works
          </h2>
          <p className="text-slate-600">Enter Vitals → ML Prediction → Gemini Explanation → Alert → Feedback</p>
        </div>
        <div className="flex flex-col items-center justify-center md:flex-row">
          {workflow.map(({ step, label, icon: Icon }, index) => (
            <div key={step} className="flex flex-col items-center md:flex-row">
              <div className="flex flex-col items-center p-4 text-center">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#00478d]/20 bg-[#00478d]/10">
                  <Icon size={22} className="text-[#00478d]" />
                </div>
                <span className="text-xs font-bold text-[#00478d]">{step}</span>
                <span className="text-sm font-semibold text-slate-900">{label}</span>
              </div>
              {index < workflow.length - 1 && (
                <ArrowRight size={18} className="my-2 rotate-90 text-slate-400 md:my-0 md:rotate-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <Shield size={18} className="mt-0.5 flex-shrink-0 text-[#00478d]" />
          <SafetyDisclaimer />
        </div>
      </div>

      <footer className="border-t border-[#E2E8F0] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <span className="text-sm text-slate-500">© 2026 SepsisAI Guard — Final-year academic project</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle size={14} className="text-green-500" />
            Decision-support prototype only
          </span>
        </div>
      </footer>
    </div>
  );
}
