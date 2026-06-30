import React, { useState } from 'react';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode } from '../types';
import { ShieldAlert, Check, Lock, ShieldCheck, EyeOff } from 'lucide-react';

interface ConsentViewProps {
  currentLanguage: LanguageCode;
  onAgree: () => void;
  onCancel: () => void;
}

export const ConsentView: React.FC<ConsentViewProps> = ({
  currentLanguage,
  onAgree,
  onCancel
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
  const [agreedLocal, setAgreedLocal] = useState(false);
  const [agreedVolunteer, setAgreedVolunteer] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50/50 p-4" id="consent-container">
      <div className="bg-white rounded-3xl border border-teal-100 max-w-xl w-full p-6 sm:p-8 shadow-xl relative overflow-hidden">
        
        {/* Top visual graphic banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

        {/* Header Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-6">
          <ShieldAlert className="h-6 w-6" />
        </div>

        {/* Content */}
        <h2 className="font-sans text-2xl font-bold text-gray-900 mb-3 tracking-tight">
          {t.consentTitle || "Your Privacy Matters"}
        </h2>
        
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          {t.consentDesc || "HaqSetu AI uses local rules to verify your government scheme eligibility and secure access. All data, demographic profiles, and reports are treated with extreme state-level safety safeguards."}
        </p>

        {/* Bullet points of assurance */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5 bg-teal-50 p-1 rounded-md text-teal-600">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800">Local Decentralized State</h4>
              <p className="text-xs text-gray-500 mt-0.5">Your profile parameters reside strictly inside local cache or secure servers. Omit sensitive details anytime.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="mt-0.5 bg-emerald-50 p-1 rounded-md text-emerald-600">
              <EyeOff className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800">Zero-Trace Anonymous Mode</h4>
              <p className="text-xs text-gray-500 mt-0.5">Reporting discrimination, scams, or domestic complaints operates with random ID proxies. Your identity stays hidden.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="mt-0.5 bg-teal-50 p-1 rounded-md text-teal-600">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800">Volunteer Verification Safety</h4>
              <p className="text-xs text-gray-500 mt-0.5">Case workers verify missing identity papers only when you explicitly submit a 'Volunteer Help' form.</p>
            </div>
          </div>
        </div>

        {/* Checkbox triggers */}
        <div className="space-y-3 mb-8 border-t border-gray-100 pt-6">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedLocal}
              onChange={(e) => setAgreedLocal(e.target.checked)}
              className="mt-1 h-4 w-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs font-semibold text-gray-700">
              I consent to locally storing my profile details to automate eligibility calculations.
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedVolunteer}
              onChange={(e) => setAgreedVolunteer(e.target.checked)}
              className="mt-1 h-4 w-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs font-semibold text-gray-700">
              I consent to sharing my requests with local Panchayat volunteers only if I explicitly trigger 'Seek Help'.
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            {t.denyConsent || "Cancel"}
          </button>
          
          <button
            onClick={onAgree}
            disabled={!agreedLocal}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all text-white flex items-center justify-center space-x-2 ${
              agreedLocal 
                ? 'bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/10' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            id="agree-consent-btn"
          >
            <Check className="h-4 w-4" />
            <span>{t.acceptConsent || "I Consent & Agree"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default ConsentView;
