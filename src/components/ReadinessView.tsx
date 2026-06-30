import React, { useState, useEffect } from 'react';
import { CitizenProfile, DocumentCamp, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { 
  Award, ShieldAlert, CheckCircle2, MapPin, Calendar, Users2, 
  ChevronRight, ArrowRight, Compass 
} from 'lucide-react';

interface ReadinessViewProps {
  currentLanguage: LanguageCode;
  onNavigate: (route: string) => void;
}

export const ReadinessView: React.FC<ReadinessViewProps> = ({ currentLanguage, onNavigate }) => {
  const [activeProfile, setActiveProfile] = useState<CitizenProfile | null>(null);
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [verifiedDocs, setVerifiedDocs] = useState<string[]>([]);
  const [camps, setCamps] = useState<DocumentCamp[]>([]);

  useEffect(() => {
    loadReadinessData();
  }, []);

  const loadReadinessData = async () => {
    const profile = await dbClient.getProfile();
    setActiveProfile(profile);

    const campsList = await dbClient.getDocumentCamps();
    setCamps(campsList);

    if (profile) {
      const allDocs = [
        { type: 'aadhaar', label: 'Aadhaar Card' },
        { type: 'ration_card', label: 'Ration Card' },
        { type: 'voter_id', label: 'Voter ID' },
        { type: 'pan_card', label: 'PAN Card' },
        { type: 'income_cert', label: 'Income Certificate' },
        { type: 'caste_cert', label: 'Caste Certificate' },
        { type: 'bank_passbook', label: 'Bank Passbook' },
        { type: 'disability_cert', label: 'Disability Certificate (UDID)' }
      ];

      const verified = allDocs.filter(d => profile.existingDocuments.includes(d.type)).map(d => d.label);
      const missing = allDocs.filter(d => !profile.existingDocuments.includes(d.type)).map(d => d.label);
      setVerifiedDocs(verified);
      setMissingDocs(missing);
    }
  };

  const score = activeProfile?.readinessScore || 70;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="readiness-view">
      
      {/* View Header */}
      <div className="border-b border-gray-100 pb-4 mb-8">
        <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
          Application Readiness Scorecard
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Review your overall welfare preparation rating. Higher scores guarantee instant payouts and zero rejections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Dynamic Radial Meter and Checklist */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Circular Meter Card */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center sm:justify-around gap-6">
            
            <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
              <svg className="absolute transform -rotate-90 h-full w-full">
                <circle
                  cx="88"
                  cy="88"
                  r="76"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="76"
                  stroke="#0d9488"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={477}
                  strokeDashoffset={477 - (477 * score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-extrabold text-teal-950 block">{score}%</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">Readiness</span>
              </div>
            </div>

            <div className="space-y-3 max-w-md">
              <div className="flex items-center space-x-1.5">
                <Award className="h-5 w-5 text-teal-600" />
                <h3 className="font-sans text-base font-bold text-teal-950">
                  {score >= 80 ? 'Welfare-Ready Tier' : score >= 60 ? 'Standard Preparation' : 'Requires Document Audits'}
                </h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your preparation score is evaluated by checking your age, state eligibility parameters, and verified papers in your wallet. A score above 80% represents extreme safety against government application rejections.
              </p>
              <button
                onClick={() => onNavigate('documents')}
                className="inline-flex items-center space-x-1 text-xs font-bold text-teal-600 hover:text-teal-800"
              >
                <span>Upload missing documents to boost score</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* Checklist: Verified vs Missing papers */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <h3 className="font-sans text-base font-bold text-gray-900 mb-4">Your Documentation Checklist</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Verified list */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verified Identity Papers</span>
                </span>
                {verifiedDocs.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-900">
                    {doc}
                  </div>
                ))}
                {verifiedDocs.length === 0 && <span className="text-xs text-gray-400 block px-1">No verified papers found yet.</span>}
              </div>

              {/* Missing list */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <ShieldAlert className="h-4 w-4 animate-pulse" />
                  <span>Missing Requirements</span>
                </span>
                {missingDocs.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/40 border border-amber-100 rounded-2xl text-xs font-bold text-amber-900">
                    {doc}
                  </div>
                ))}
                {missingDocs.length === 0 && <span className="text-xs text-emerald-600 block font-bold px-1">Congratulations! No missing documents.</span>}
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Close-by Document Camps */}
        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <Compass className="h-5 w-5 text-teal-700" />
            <h3 className="font-sans text-base font-bold text-gray-900">Nearby Document Camps</h3>
          </div>
          <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
            Visit these local Panchayat document enrollment kiosks to obtain missing caste, income, or disability certificates in 1 day on-the-spot.
          </p>

          <div className="space-y-4">
            {camps.map((camp) => (
              <div key={camp.id} className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl space-y-3 hover:border-teal-200 transition-colors">
                <h4 className="font-sans text-xs font-bold text-teal-950 leading-relaxed">{camp.title}</h4>
                
                <div className="space-y-1.5 text-[10px] font-semibold text-gray-500">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>{camp.date}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="truncate">{camp.location}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users2 className="h-3.5 w-3.5 text-gray-400" />
                    <span className="truncate">{camp.officers}</span>
                  </div>
                </div>

                <div className="bg-teal-50/50 p-2 rounded-lg border border-teal-100/30">
                  <span className="block text-[9px] text-teal-800 font-extrabold uppercase tracking-wider">Targeted Benefits</span>
                  <span className="block text-[9px] text-gray-500 font-medium mt-0.5">{camp.schemesTargeted}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
export default ReadinessView;
