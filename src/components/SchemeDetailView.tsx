import React, { useState, useEffect } from 'react';
import { SCHEMES, evaluateEligibility } from '../data/schemes';
import { CitizenProfile, Scheme, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { explainScheme, generateNextSteps, generateAssistantReply, generateFilledForm } from '../lib/aiService';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle, Bot, Send, 
  BadgeAlert, ClipboardList, Check, UserCheck, ShieldCheck, Languages, Sparkles, RefreshCw, Eye 
} from 'lucide-react';

interface SchemeDetailViewProps {
  currentLanguage: LanguageCode;
  schemeId: string;
  onNavigate: (route: string) => void;
}

export const SchemeDetailView: React.FC<SchemeDetailViewProps> = ({
  currentLanguage,
  schemeId,
  onNavigate
}) => {
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [activeProfile, setActiveProfile] = useState<CitizenProfile | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  
  // Custom AI query box states
  const [customQuery, setCustomQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryReply, setQueryReply] = useState('');

  // Application submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVolunteerRequested, setIsVolunteerRequested] = useState(false);

  // Form filling assistant states
  const [showFormAssistant, setShowFormAssistant] = useState(false);
  const [selectedFormLang, setSelectedFormLang] = useState('English');
  const [fillLoading, setFillLoading] = useState(false);
  const [filledFormResult, setFilledFormResult] = useState<any>(null);
  const [scanSimulating, setScanSimulating] = useState(false);
  const [scanDocName, setScanDocName] = useState<string>('');

  const languages12 = [
    { code: 'English', label: 'English' },
    { code: 'Hindi', label: 'हिन्दी (Hindi)' },
    { code: 'Telugu', label: 'తెలుగు (Telugu)' },
    { code: 'Tamil', label: 'தமிழ் (Tamil)' },
    { code: 'Urdu', label: 'اردو (Urdu)' },
    { code: 'Marathi', label: 'मराठी (Marathi)' },
    { code: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'Malayalam', label: 'മലയാളം (Malayalam)' },
    { code: 'Bengali', label: 'বাংলা (Bengali)' },
    { code: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
    { code: 'Odia', label: 'ଓଡ଼ିଆ (Odia)' },
    { code: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' }
  ];

  useEffect(() => {
    const s = SCHEMES.find(sc => sc.id === schemeId);
    if (s) {
      setScheme(s);
      loadEligibilityAndAi(s);
    }
  }, [schemeId]);

  const loadEligibilityAndAi = async (s: Scheme) => {
    const profile = await dbClient.getProfile();
    setActiveProfile(profile);

    if (profile) {
      const el = evaluateEligibility(s, profile);
      setEligibility(el);

      // Load next steps
      const steps = await generateNextSteps(s, profile, currentLanguage);
      setNextSteps(steps);

      // Check if already applied or requested volunteer support
      try {
        const requests = await dbClient.getRequests();
        const hasApplied = requests.some(r => r.itemId === s.id && r.itemType === 'scheme');
        const hasRequestedVolunteer = requests.some(r => r.itemId === s.id && r.itemType === 'volunteer_support');
        if (hasApplied) {
          setIsSubmitted(true);
        }
        if (hasRequestedVolunteer) {
          setIsVolunteerRequested(true);
        }
      } catch (err) {
        console.error("Error loading user requests in SchemeDetailView:", err);
      }
    }

    // Load simple AI explanation
    setAiLoading(true);
    try {
      const exp = await explainScheme(s, currentLanguage);
      setAiExplanation(exp);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Handle custom query on scheme details
  const handleCustomQuerySubmit = async () => {
    if (!customQuery.trim() || !scheme) return;
    setQueryLoading(true);
    setQueryReply('');
    try {
      const fullPrompt = `Regarding government scheme: "${scheme.name}". Department: "${scheme.department}". 
Citizen is asking: "${customQuery}".
Briefly answer their question in their selected language: '${currentLanguage}'. Keep it helpful, clear, and under 80 words.`;
      const reply = await generateAssistantReply(fullPrompt, [], currentLanguage);
      setQueryReply(reply);
    } catch (e) {
      console.error(e);
    } finally {
      setQueryLoading(false);
    }
  };

  // Submit dynamic application request
  const handleApplyNow = async () => {
    if (!scheme || !activeProfile) return;
    setIsSubmitting(true);
    try {
      await dbClient.submitRequest({
        citizenName: activeProfile.name,
        itemType: 'scheme',
        itemId: scheme.id,
        itemName: `${scheme.name} Application`
      });
      setIsSubmitted(true);
      alert(`🎉 Application successfully filed!\n\nTracking Reference: HS-${Math.floor(100000+Math.random()*900000)}\nCheck progress under the 'Requests Tracker' tab.`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request hands-on support
  const handleRequestSupport = async () => {
    if (!scheme || !activeProfile) return;
    try {
      await dbClient.submitRequest({
        citizenName: activeProfile.name,
        itemType: 'volunteer_support',
        itemId: scheme.id,
        itemName: `Help with ${scheme.name}`
      });
      setIsVolunteerRequested(true);
      alert(`🙋 Support request logged! \n\nA local Panchayat volunteer has been assigned and will schedule a home visit to help you finish paperwork for ${scheme.name}. Check your Tracker tab.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoFillForm = async () => {
    if (!scheme) return;
    setFillLoading(true);
    setFilledFormResult(null);
    try {
      const documents = await dbClient.getDocuments();
      const profile = activeProfile || {
        name: 'Ramesh Kumar',
        age: 42,
        gender: 'Male',
        occupation: 'Agricultural tenant farmer',
        householdIncome: 48000,
        category: 'SC',
        disability: 'No',
        documents: []
      };
      
      const response = await generateFilledForm(
        scheme.id,
        selectedFormLang,
        profile,
        documents
      );
      setFilledFormResult(response);
    } catch (err) {
      console.error(err);
    } finally {
      setFillLoading(false);
    }
  };

  const handleSimulateScan = (docType: string) => {
    setScanSimulating(true);
    setScanDocName(docType);
    setTimeout(() => {
      setScanSimulating(false);
      alert(`📸 Simulated scan of ${docType.toUpperCase()} completed! Text coordinates read successfully, ready to auto-fill.`);
    }, 1500);
  };

  if (!scheme) {
    return (
      <div className="py-12 px-4 text-center">
        <span className="text-gray-400">Loading scheme parameters...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8" id="scheme-detail-view">
      
      {/* Back navigation */}
      <button
        onClick={() => onNavigate('schemes')}
        className="flex items-center space-x-1 text-xs font-bold text-teal-700 hover:text-teal-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Schemes</span>
      </button>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Scheme parameters & steps */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Card */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-teal-600 font-extrabold bg-teal-50 px-2 py-1 rounded-md">
              {scheme.category}
            </span>
            <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight mt-2">{scheme.name}</h2>
            <span className="text-xs text-gray-400 font-medium block mt-0.5">{scheme.department}</span>

            <p className="text-gray-600 text-sm mt-5 leading-relaxed">
              {scheme.description}
            </p>

            {/* Benefits box */}
            <div className="mt-6 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-100/50">
              <span className="block text-xs uppercase font-extrabold text-teal-900 tracking-wider">Benefits Overview</span>
              <p className="text-sm font-semibold text-teal-950 mt-1.5 leading-relaxed">{scheme.benefits}</p>
            </div>
          </div>

          {/* AI Next Steps Checklist */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center space-x-2 mb-4">
              <ClipboardList className="h-5 w-5 text-teal-700" />
              <h3 className="font-sans text-lg font-bold text-gray-900">Your Action Steps</h3>
            </div>
            <div className="space-y-3">
              {nextSteps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-extrabold">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rule-based Criteria Breakdown */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <h3 className="font-sans text-base font-bold text-gray-900 mb-4">Eligibility Parameter Checklist</h3>
            <div className="space-y-2">
              {scheme.rules.map((rule, index) => {
                let rulePassed = false;
                if (activeProfile) {
                  const val = (activeProfile as any)[rule.field];
                  if (rule.operator === 'greater_than_equal') rulePassed = Number(val) >= Number(rule.value);
                  else if (rule.operator === 'less_than_equal') rulePassed = Number(val) <= Number(rule.value);
                  else if (rule.operator === 'equals') rulePassed = String(val).toLowerCase() === rule.value.toLowerCase();
                  else if (rule.operator === 'in') rulePassed = rule.value.toLowerCase().split(',').includes(String(val).toLowerCase());
                }
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-600 capitalize">{rule.field.replace('householdIncome', 'Income')} requirement</span>
                    <span className={`text-xs font-extrabold flex items-center space-x-1 ${rulePassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {rulePassed ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Passed</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Needs Review</span>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: AI Explainer Box & Application Toggles */}
        <div className="space-y-6">
          
          {/* Eligibility Indicator Box */}
          {eligibility && (
            <div className={`p-5 rounded-3xl border shadow-xs ${
              isSubmitted
                ? 'bg-teal-50/50 border-teal-100 text-teal-900'
                : eligibility.matched 
                  ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' 
                  : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              <div className="flex items-center space-x-2 mb-3">
                {isSubmitted ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                ) : eligibility.matched ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <span className="font-sans text-sm font-bold uppercase tracking-wider">
                  {isSubmitted ? "Applied" : eligibility.matched ? "All Guidelines Met" : "Requires Attention"}
                </span>
              </div>
              <p className="text-xs leading-relaxed font-semibold">
                {isSubmitted 
                  ? "Your application has been filed successfully via the AWAAZ gateway. You can track its progress in the Tracker tab."
                  : eligibility.reasoning}
              </p>

              {/* Action Trigger Toggles */}
              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                {isSubmitted ? (
                  <button
                    disabled={true}
                    className="w-full py-3 bg-gray-100 border border-gray-200 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center justify-center space-x-1"
                  >
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    <span>Applied</span>
                  </button>
                ) : (
                  <button
                    onClick={handleApplyNow}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 font-bold text-xs rounded-xl text-white shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-1"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>{isSubmitting ? 'Filing Application...' : 'Apply via AWAAZ'}</span>
                  </button>
                )}

                <button
                  onClick={handleRequestSupport}
                  disabled={isSubmitted || isVolunteerRequested}
                  className={`w-full py-3 font-bold text-xs rounded-xl transition-all ${
                    isSubmitted || isVolunteerRequested
                      ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-teal-200 text-teal-800 hover:bg-teal-50/30 active:scale-95'
                  }`}
                >
                  {isVolunteerRequested ? 'Volunteer Requested' : 'Request Volunteer Handholding'}
                </button>
              </div>
            </div>
          )}

          {/* AI Simple Speech explainer card */}
          <div className="bg-teal-950 text-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Bot className="h-4 w-4 text-teal-400 animate-pulse" />
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wide">Gemini Quick Explainer</span>
            </div>
            {aiLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-teal-900 rounded-sm w-full" />
                <div className="h-3 bg-teal-900 rounded-sm w-3/4" />
              </div>
            ) : (
              <p className="text-xs text-teal-100/80 leading-relaxed font-medium">
                {aiExplanation}
              </p>
            )}
          </div>

          {/* Dynamic question box */}
          <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center space-x-1.5 mb-2">
              <HelpCircle className="h-4 w-4 text-teal-700" />
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">Ask custom scheme questions</span>
            </div>
            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
              Ask Gemini about specific parameters (e.g. "Do my sibling's earnings count?")
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Ask your query here..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
              <button
                onClick={handleCustomQuerySubmit}
                disabled={queryLoading}
                className="bg-teal-600 text-white p-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shrink-0"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>

            {queryLoading && (
              <div className="mt-3 text-[10px] text-gray-400 animate-pulse">Consulting Gemini rules...</div>
            )}

            {queryReply && (
              <div className="mt-3 bg-teal-50/50 p-3 rounded-2xl border border-teal-100/50 text-xs text-teal-950 font-medium whitespace-pre-line leading-relaxed">
                {queryReply}
              </div>
            )}
          </div>

          {/* AI Multilingual Form-Filling Assistant in 12 languages */}
          <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-1.5 border-b border-gray-100 pb-2">
              <Languages className="h-4.5 w-4.5 text-teal-700" />
              <h3 className="font-sans text-xs font-bold text-gray-900">AI Multilingual Form-Filling</h3>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Scan documents or use your digital vault to auto-fill official government registration forms in 12 languages. Missing documents are flagged instantly.
            </p>

            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-gray-500 uppercase">Select Target Language (12 options)</label>
              <select
                value={selectedFormLang}
                onChange={(e) => setSelectedFormLang(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              >
                {languages12.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <span className="block text-[9px] font-bold text-gray-500 uppercase">Scan Supporting Paperwork</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateScan('Aadhaar Card')}
                  className="p-2 border border-gray-200 rounded-xl text-[10px] font-bold hover:bg-gray-50 text-gray-600 flex items-center justify-center space-x-1"
                >
                  <span>📷 Scan Aadhaar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScan('Income Certificate')}
                  className="p-2 border border-gray-200 rounded-xl text-[10px] font-bold hover:bg-gray-50 text-gray-600 flex items-center justify-center space-x-1"
                >
                  <span>📷 Scan Income</span>
                </button>
              </div>
            </div>

            {scanSimulating && (
              <div className="text-[10px] text-teal-600 animate-pulse font-bold">Scanning and reading text coordinates from {scanDocName}...</div>
            )}

            <button
              onClick={handleAutoFillForm}
              disabled={fillLoading}
              className="w-full py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1"
            >
              {fillLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Auto-filling and Auditing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-teal-300 animate-pulse" />
                  <span>Auto-fill Form & Run Audit</span>
                </>
              )}
            </button>

            {filledFormResult && (
              <div className="bg-[#FDFBF7] p-3.5 rounded-2xl border border-teal-100 text-xs font-serif text-teal-950 space-y-3 whitespace-pre-line leading-relaxed max-h-[300px] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-1.5 border-teal-100/50">
                  <span className="font-sans font-bold text-[9px] uppercase tracking-wider text-teal-800">Auto-filled Form Audit</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(filledFormResult, null, 2));
                      alert("📋 Filled form copy copied to clipboard!");
                    }}
                    className="text-[9px] text-teal-700 underline font-sans font-semibold"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-[11px] font-mono whitespace-pre-wrap leading-normal text-gray-700">
                  {filledFormResult}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
export default SchemeDetailView;
