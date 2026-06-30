import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { seedUniversalCompanionKnowledge } from '../lib/firebase/seedUniversalCompanion';

interface AdminSeedViewProps {
  onNavigate?: (route: string) => void;
}

export const AdminSeedView: React.FC<AdminSeedViewProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ written: number; errors: string[] } | null>(null);

  const handleSeed = async () => {
    setStatus('loading');
    setResult(null);
    try {
      const res = await seedUniversalCompanionKnowledge();
      setResult({ written: res.written, errors: res.errors });
      setStatus(res.success ? 'success' : 'error');
    } catch (e: any) {
      setStatus('error');
      setResult({ written: 0, errors: [e.message || 'Unknown error'] });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-8 max-w-lg w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-teal-950 p-3 rounded-2xl text-teal-300">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-teal-950">Universal AI Companion</h2>
            <p className="text-xs text-gray-400 font-mono">ADMIN SEED PANEL</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-900">
            Admin Only: This will write all Universal AI Companion questions and Suggested Inquiry sets to Firebase Firestore.
            Uses fixed document IDs so it is safe to run multiple times without duplicating data.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700">What will be seeded:</h4>
          <ul className="text-xs text-gray-500 space-y-1 font-medium">
            <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-teal-500" /> 30+ Q&A documents in universal_ai_companion collection</li>
            <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-teal-500" /> 10 screen-based inquiry sets in suggested_inquiries collection</li>
            <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-teal-500" /> Covers: General, Schemes, Documents, Safety, Reporting, Civic, Volunteers, Tracker, Language, Emergency</li>
          </ul>
        </div>

        <button
          onClick={handleSeed}
          disabled={status === 'loading'}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
            status === 'loading'
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-teal-900 hover:bg-teal-950 text-white shadow-md'
          }`}
        >
          {status === 'loading' ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Seeding Firestore...</span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              <span>Seed Universal AI Companion</span>
            </>
          )}
        </button>

        {status === 'success' && result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-emerald-800 text-sm">Seed Complete!</span>
            </div>
            <p className="text-xs text-emerald-700">
              Successfully wrote <strong>{result.written}</strong> documents to Firestore.
              The Universal AI Companion knowledge base is ready.
            </p>
          </div>
        )}

        {status === 'error' && result && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-bold text-red-800 text-sm">Some errors occurred</span>
            </div>
            <p className="text-xs text-red-700">{result.written} documents written, {result.errors.length} errors.</p>
            {result.errors.slice(0, 3).map((err: string, i: number) => (
              <p key={i} className="text-[10px] text-red-600 font-mono">{err}</p>
            ))}
          </div>
        )}

        {onNavigate && (
          <button
            onClick={() => onNavigate('admin')}
            className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 font-semibold"
          >
            Back to Admin Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminSeedView;
