import { PlusCircle, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, DemoNotice, ErrorBanner, LoadingState } from '../components/common/UiPrimitives';
import { PageHeader } from '../components/layout/PageHeader';
import * as patientService from '../services/patientService';
import type { PatientRecord } from '../types/api';

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    patientService
      .getPatients()
      .then((data) => setPatients(data.patients))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading patients…" />;

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title="Patients"
        description="Registered patient profiles from the backend."
        action={
          <Link
            to="/predict"
            className="flex items-center gap-2 rounded-lg bg-[#00478d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00386f]"
          >
            <PlusCircle size={15} /> New Prediction
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      <Card className="p-5">
        {patients.length === 0 ? (
          <DemoNotice message="No patients returned from backend yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs text-slate-500">
                  <th className="py-3 pr-4">Patient ID</th>
                  <th className="py-3 pr-4">Age</th>
                  <th className="py-3 pr-4">Gender</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.patient_id} className="border-b border-[#E2E8F0]/60">
                    <td className="py-3 pr-4 font-medium text-slate-900">{patient.patient_id}</td>
                    <td className="py-3 pr-4 text-slate-600">{patient.age ?? 'Not available'}</td>
                    <td className="py-3 pr-4 text-slate-600">{patient.gender ?? 'Not available'}</td>
                    <td className="py-3">
                      <Link to="/history" className="text-xs font-medium text-[#00478d] hover:underline">
                        View history
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
