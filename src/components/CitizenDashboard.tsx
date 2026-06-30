import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../data/translations';
import { CitizenProfile, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { extractProfileFields } from '../lib/aiService';
import { VoiceAssistantForm } from './VoiceAssistantForm';
import { 
  Bot, Award, FileText, Activity, ShieldAlert, AlertCircle, Sparkles, UserCheck, CheckCircle2,
  PhoneCall, HeartPulse, Scale, Check, User, CheckCircle, ChevronRight, MessageSquare, ShieldCheck, Mic
} from 'lucide-react';

interface CitizenDashboardProps {
  currentLanguage: LanguageCode;
  onNavigate: (route: string) => void;
  onProfileUpdated: () => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  currentLanguage,
  onNavigate,
  onProfileUpdated
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  
  // Local states for the profile form
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState('female');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState('Delhi');
  const [income, setIncome] = useState<number>(100000);
  const [category, setCategory] = useState('OBC');
  const [disability, setDisability] = useState(false);
  const [disabilityType, setDisabilityType] = useState('');
  const [existingDocs, setExistingDocs] = useState<string[]>([]);
  
  // AI assist text for profile extraction
  const [aiText, setAiText] = useState('');
  const [aiExtracting, setAiExtracting] = useState(false);

  // Stats
  const [readinessScore, setReadinessScore] = useState(70);
  const [matchedSchemesCount, setMatchedSchemesCount] = useState(0);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);

  // Load profile from database client
  useEffect(() => {
    loadActiveProfile();
  }, []);

  const loadActiveProfile = async () => {
    const profile = await dbClient.getProfile();
    if (profile) {
      setName(profile.name);
      setAge(profile.age);
      setGender(profile.gender);
      setOccupation(profile.occupation);
      setLocation(profile.location);
      setState(profile.state);
      setIncome(profile.householdIncome);
      setCategory(profile.category);
      setDisability(profile.disabilityStatus);
      setDisabilityType(profile.disabilityType || '');
      setExistingDocs(profile.existingDocuments);
      setReadinessScore(profile.readinessScore);
      
      // Calculate dynamic stats
      calculateDashboardStats(profile);
    }
  };

  const calculateDashboardStats = async (profile: CitizenProfile) => {
    // Read tracker requests count
    const requests = await dbClient.getRequests();
    setActiveRequestsCount(requests.length);

    // Calculate schemes matched
    const { SCHEMES, evaluateEligibility } = await import('../data/schemes');
    let matches = 0;
    for (const scheme of SCHEMES) {
      const eligibility = evaluateEligibility(scheme, profile);
      if (eligibility.matched) matches++;
    }
    setMatchedSchemesCount(matches);
  };

  // AI profile autofill helper
  const handleAiAutofill = async () => {
    if (!aiText.trim()) return;
    setAiExtracting(true);
    try {
      const extracted = await extractProfileFields(aiText);
      if (extracted.name) setName(extracted.name);
      if (extracted.age) setAge(extracted.age);
      if (extracted.gender) setGender(extracted.gender);
      if (extracted.occupation) setOccupation(extracted.occupation);
      if (extracted.location) setLocation(extracted.location);
      if (extracted.state) setState(extracted.state);
      if (extracted.householdIncome) setIncome(extracted.householdIncome);
      if (extracted.category) setCategory(extracted.category);
      
      alert("✨ AWAAZ AI successfully extracted profile fields from your text! Review and click Save Profile.");
    } catch (e) {
      console.error(e);
    } finally {
      setAiExtracting(false);
    }
  };

  // Handle incremental updates from the multilingual voice form filling assistant
  const handleVoiceFormUpdate = async (completeData: any) => {
    if (completeData) {
      if (completeData.full_name) setName(completeData.full_name);
      if (completeData.age) setAge(Number(completeData.age));
      if (completeData.gender) setGender(completeData.gender.toLowerCase());
      if (completeData.occupation) setOccupation(completeData.occupation);
      if (completeData.district) setLocation(completeData.district);
      if (completeData.state) setState(completeData.state);
      if (completeData.monthly_income) setIncome(Number(completeData.monthly_income) * 12);
      
      const matchedDocs = [];
      if (completeData.has_aadhaar) matchedDocs.push('aadhaar');
      if (completeData.has_bank_account) matchedDocs.push('bankPassbook');
      if (matchedDocs.length > 0) {
        setExistingDocs(matchedDocs);
      }

      const existing = await dbClient.getProfile();

      const updatedProfile: CitizenProfile = {
        id: existing?.id || 'demo-citizen-id',
        primaryLanguage: existing?.primaryLanguage || currentLanguage,
        createdAt: existing?.createdAt || new Date().toISOString(),
        name: completeData.full_name || name,
        age: Number(completeData.age) || age,
        gender: completeData.gender ? completeData.gender.toLowerCase() : gender,
        occupation: completeData.occupation || occupation,
        location: completeData.district || location,
        state: completeData.state || state,
        householdIncome: completeData.monthly_income ? Number(completeData.monthly_income) * 12 : income,
        category: category,
        disabilityStatus: disability,
        disabilityType: disabilityType,
        existingDocuments: matchedDocs.length > 0 ? matchedDocs : existingDocs,
        readinessScore: 95
      };

      await dbClient.saveProfile(updatedProfile);
      setReadinessScore(95);
      calculateDashboardStats(updatedProfile);
      onProfileUpdated();
    }
  };

  // Handle completion from the multilingual voice form filling assistant
  const handleVoiceFormComplete = async (completeData: any) => {
    if (completeData) {
      if (completeData.full_name) setName(completeData.full_name);
      if (completeData.age) setAge(Number(completeData.age));
      if (completeData.gender) setGender(completeData.gender.toLowerCase());
      if (completeData.occupation) setOccupation(completeData.occupation);
      if (completeData.district) setLocation(completeData.district);
      if (completeData.state) setState(completeData.state);
      if (completeData.monthly_income) setIncome(Number(completeData.monthly_income) * 12);
      
      const matchedDocs = [];
      if (completeData.has_aadhaar) matchedDocs.push('aadhaar');
      if (completeData.has_bank_account) matchedDocs.push('bankPassbook');
      if (matchedDocs.length > 0) {
        setExistingDocs(matchedDocs);
      }

      const existing = await dbClient.getProfile();

      // Automatically construct and save the profile
      const updatedProfile: CitizenProfile = {
        id: existing?.id || 'demo-citizen-id',
        primaryLanguage: existing?.primaryLanguage || currentLanguage,
        createdAt: existing?.createdAt || new Date().toISOString(),
        name: completeData.full_name || name,
        age: Number(completeData.age) || age,
        gender: completeData.gender ? completeData.gender.toLowerCase() : gender,
        occupation: completeData.occupation || occupation,
        location: completeData.district || location,
        state: completeData.state || state,
        householdIncome: completeData.monthly_income ? Number(completeData.monthly_income) * 12 : income,
        category: category,
        disabilityStatus: disability,
        disabilityType: disabilityType,
        existingDocuments: matchedDocs.length > 0 ? matchedDocs : existingDocs,
        readinessScore: 95
      };

      await dbClient.saveProfile(updatedProfile);
      setReadinessScore(95);
      calculateDashboardStats(updatedProfile);
      onProfileUpdated();
      alert("🎉 Multilingual Voice Assistant successfully completed and saved your application form details!");
    }
    setIsVoiceAssistantOpen(false);
  };

  // Save manually modified profile details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate simple dynamic readiness score based on how many documents you have out of 8 common docs
    const docRatio = existingDocs.length / 8;
    const computedReadiness = Math.round(50 + docRatio * 50);

    const saved = await dbClient.saveProfile({
      name,
      age: Number(age),
      gender,
      occupation,
      location,
      state,
      householdIncome: Number(income),
      category,
      disabilityStatus: disability,
      disabilityType: disability ? disabilityType : undefined,
      existingDocuments: existingDocs,
      readinessScore: computedReadiness,
      primaryLanguage: currentLanguage
    });

    dbClient.setActiveUser({
      name: saved.name
    });

    setReadinessScore(computedReadiness);
    calculateDashboardStats(saved);
    onProfileUpdated();
    
    alert("✅ Profile updated successfully in AWAAZ database! Schemes matching has been refreshed.");
  };

  // Toggle checklist of documents
  const handleDocCheckbox = (docType: string) => {
    if (existingDocs.includes(docType)) {
      setExistingDocs(existingDocs.filter(d => d !== docType));
    } else {
      setExistingDocs([...existingDocs, docType]);
    }
  };

  const documentOptions = [
    { type: 'aadhaar', label: 'Aadhaar Card' },
    { type: 'ration_card', label: 'Ration Card' },
    { type: 'voter_id', label: 'Voter ID Card' },
    { type: 'pan_card', label: 'PAN Card' },
    { type: 'income_cert', label: 'Income Certificate' },
    { type: 'caste_cert', label: 'Caste Certificate' },
    { type: 'bank_passbook', label: 'Bank Passbook' },
    { type: 'disability_cert', label: 'Disability Certificate (UDID)' }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="citizen-dashboard">
      
      {/* 1. Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 border-b border-gray-100 pb-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl italic font-semibold text-teal-700 tracking-tight">
            {t.welcome || "Welcome"}, {name || "Citizen"}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Primary Language: <span className="text-teal-700 capitalize font-bold">{currentLanguage}</span> • Location: <span className="font-semibold text-gray-700">{location || 'India'}</span>
          </p>
        </div>

        {/* Quick Emergency / Support numbers */}
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <a href="tel:112" className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-extrabold border border-red-100 hover:bg-red-100">
            <PhoneCall className="h-3.5 w-3.5" />
            <span>{t.nationalEmergency || "National Emergency (112)"}</span>
          </a>
          <a href="tel:1091" className="flex items-center space-x-1 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-extrabold border border-rose-100 hover:bg-rose-100">
            <PhoneCall className="h-3.5 w-3.5" />
            <span>{t.womenHelpline || "Women Helpline (1091)"}</span>
          </a>
        </div>
      </div>

      {/* 3. Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" id="stats-bento">
        
        {/* Application Readiness Score Card */}
        <div 
          onClick={() => onNavigate('readiness')}
          className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs cursor-pointer hover:border-teal-300 transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600">
              <Award className="h-5 w-5" />
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <span className="block text-2xl font-extrabold text-gray-900">{readinessScore}%</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1 block">
            {t.appReadiness || "Application Readiness"}
          </span>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${readinessScore}%` }} />
          </div>
        </div>

        {/* Matched Schemes Card */}
        <div 
          onClick={() => onNavigate('schemes')}
          className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs cursor-pointer hover:border-teal-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <span className="block text-2xl font-extrabold text-gray-900">{matchedSchemesCount} {matchedSchemesCount === 1 ? (t.schemeMatchSingle || "Scheme Matched") : (t.schemeMatchPlural || "Schemes Matched")}</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1 block">
            {t.schemesEntitlements || "Eligible Schemes"}
          </span>
          <p className="text-[10px] text-gray-400 font-medium mt-3">{t.clickToExplore || "Click to explore eligibility rules & benefits"}</p>
        </div>

        {/* My Requests Tracker Card */}
        <div 
          onClick={() => onNavigate('tracker')}
          className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs cursor-pointer hover:border-teal-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <span className="block text-2xl font-extrabold text-gray-900">{activeRequestsCount} {t.active || "Active"}</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1 block">
            {t.myRequestsTracker || "My Requests Tracker"}
          </span>
          <p className="text-[10px] text-gray-400 font-medium mt-3">{t.liveTrackingDesc || "Live tracking reference and volunteer notes"}</p>
        </div>

      </div>

      {/* 4. Two Column Layout: AI Extraction & Manual Form vs Quick Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: AI Extraction & Profile Form */}
        <div className="lg:col-span-2 bg-white border border-teal-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <User className="h-5 w-5 text-teal-700" />
            <h3 className="font-sans text-lg font-bold text-gray-900">{t.yourProfile || "Your Eligibility Profile Credentials"}</h3>
          </div>

          {/* Voice-First Interactive Form-Filling Assistant Banner */}
          <div className="mb-6 bg-gradient-to-r from-teal-900 to-teal-950 p-5 rounded-2xl border border-teal-800 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-800/20 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center space-x-3.5">
                <div className="bg-teal-800 p-3 rounded-xl text-teal-300 animate-pulse shrink-0">
                  <Mic className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                    {t.voiceAssistantTitle || "AWAAZ Multi-lingual Voice Assistant"}
                    <span className="bg-amber-400 text-teal-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      {t.voiceAssistantBadge || "VOICE FIRST"}
                    </span>
                  </h4>
                  <p className="text-xs text-teal-100 mt-1 leading-relaxed max-w-md">
                    {t.voiceAssistantDesc || "Don't want to type? Tap the button to fill your entire form in seconds simply by talking in any of the 12 regional languages!"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceAssistantOpen(true)}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 active:scale-95 text-teal-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer shrink-0"
                id="start-voice-assistant-btn"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-950" />
                <span>{t.voiceAssistantBtn || "Start Voice Assistant"}</span>
              </button>
            </div>
          </div>

          {/* AI Autofill Prompt Assist */}
          <div className="mb-6 bg-teal-50/40 p-4 rounded-2xl border border-teal-100/50">
            <div className="flex items-center space-x-1.5 mb-2">
              <Bot className="h-4 w-4 text-teal-700" />
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">{t.autofillAi || "Autofill Profile with Gemini AI"}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {t.autofillDesc || "Describe your background in a few words and our AI extraction utility will auto-populate your age, state, job, and income!"}
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={t.autofillPlaceholder || "Example: I am Lakshmi, a 32 years old domestic worker in Hyderabad making 90,000 yearly."}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAiAutofill}
                disabled={aiExtracting}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors flex items-center space-x-1 whitespace-nowrap"
              >
                {aiExtracting ? (
                  <span>{t.extracting || "Extracting..."}</span>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span>{t.autofillBtn || "Autofill"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.fullName || "Full Name"}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.age || "Age (Years)"}</label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.gender || "Gender"}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  <option value="male">{t.male || "Male (पुरुष)"}</option>
                  <option value="female">{t.female || "Female (महिला)"}</option>
                  <option value="other">{t.other || "Other (अन्य)"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.occupation || "Primary Occupation"}</label>
                <input
                  type="text"
                  required
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  placeholder="e.g. Domestic worker, Street vendor, Student, Farmer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.state || "State"}</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.location || "Village/Town/City"}</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.income || "Annual Household Income (₹)"}</label>
                <input
                  type="number"
                  required
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.caste || "Social Category (Caste)"}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                  <option value="OBC">Other Backward Class (OBC)</option>
                  <option value="General">General Category</option>
                  <option value="Minority">Religious Minority</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 py-2">
                <input
                  type="checkbox"
                  id="disability-checkbox"
                  checked={disability}
                  onChange={(e) => setDisability(e.target.checked)}
                  className="h-4 w-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="disability-checkbox" className="text-xs font-bold text-gray-700 cursor-pointer">
                  {t.disability || "Person with Disability (दिव्यांग स्थिति)"}
                </label>
              </div>

              {disability && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.disabilityType || "Type of Disability"}</label>
                  <input
                    type="text"
                    value={disabilityType}
                    onChange={(e) => setDisabilityType(e.target.value)}
                    placeholder="e.g. Locomotor, Visual impairment"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Checklist of Existing identity papers */}
            <div className="border-t border-gray-100 pt-5">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3">{t.papersHave || "Which Identity Papers do you currently have?"}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {documentOptions.map((opt) => {
                  const hasDoc = existingDocs.includes(opt.type);
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleDocCheckbox(opt.type)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        hasDoc 
                          ? 'bg-teal-50 border-teal-200 text-teal-900 font-semibold' 
                          : 'bg-white border-gray-100 text-gray-500'
                      }`}
                    >
                      <span className="text-[10px] uppercase truncate">{opt.label}</span>
                      {hasDoc && <Check className="h-3 w-3 text-teal-600 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-600/10"
            >
              {t.saveProfile || "Save Profile Credentials & Re-evaluate Schemes"}
            </button>

          </form>
        </div>

        {/* Right Column: Quick Feature Modules Links */}
        <div className="space-y-4">
          
          {/* Universal AI Assistant Quick Promo */}
          <div 
            onClick={() => onNavigate('assistant')}
            className="cursor-pointer bg-teal-950 text-white rounded-3xl p-5 shadow-sm hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-teal-900 text-teal-300 p-2.5 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-300 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold">Ask AWAAZ AI Assistant</h4>
            <p className="text-xs text-teal-100/70 mt-1 leading-relaxed">
              Ask any government rule question, document steps, or get instant voice help in your preferred language!
            </p>
          </div>

          {/* Scheme Eligibility Finder Quick promo */}
          <div 
            onClick={() => onNavigate('schemes')}
            className="cursor-pointer bg-white border border-teal-100 rounded-3xl p-5 shadow-xs hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                <Award className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold text-gray-900">{t.schemesEntitlements || "Schemes & Entitlements"}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Scan through 10 seed schemes. Filter by category, learn criteria, and apply through rule-based matching.
            </p>
          </div>

          {/* OCR Documents wallet */}
          <div 
            onClick={() => onNavigate('documents')}
            className="cursor-pointer bg-white border border-teal-100 rounded-3xl p-5 shadow-xs hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold text-gray-900">{t.documentsIdentity || "Documents & Identity"}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Test out our simulated OCR scanning tool! Scan and verify Aadhaar, Ration, or Income slips in real time.
            </p>
          </div>

          {/* Women Safety advisor */}
          <div 
            onClick={() => onNavigate('safety')}
            className="cursor-pointer bg-white border border-teal-100 rounded-3xl p-5 shadow-xs hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-teal-50 text-teal-600 p-2.5 rounded-xl">
                <HeartPulse className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold text-gray-900">{t.womenSafety || "Women Safety & Support"}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Explore safety safe-route advisors, AI legal rights companion, and menstrual welfare help desks.
            </p>
          </div>

          {/* Secure reporting */}
          <div 
            onClick={() => onNavigate('report')}
            className="cursor-pointer bg-white border border-teal-100 rounded-3xl p-5 shadow-xs hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold text-gray-900">{t.secureReporting || "Secure Reporting Gateway"}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Anonymously report scam brokers, caste discrimination, or public asset complaints securely.
            </p>
          </div>

          {/* Civic Voice Gram Sabha */}
          <div 
            onClick={() => onNavigate('civic')}
            className="cursor-pointer bg-white border border-teal-100 rounded-3xl p-5 shadow-xs hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-teal-50 text-teal-600 p-2.5 rounded-xl">
                <Scale className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold text-gray-900">{t.civicVoice || "Civic Voice & Gram Sabha"}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Review local budget allocations, track meetings, or play the fun Panchayat learning board game!
            </p>
          </div>

          {/* Identity & Recordless Support */}
          <div 
            onClick={() => onNavigate('recordless')}
            className="cursor-pointer bg-teal-50 border border-teal-100 rounded-3xl p-5 shadow-xs hover:translate-y-[-2px] transition-transform group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-teal-600 text-white p-2.5 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-sans text-base font-bold text-teal-950">Identity & Notary Support</h4>
            <p className="text-xs text-teal-900/80 mt-1 leading-relaxed">
              NGO pre-registration portals, biometric wallet trust scores, and AI court-grade legal affidavit builders for migrant and stateless families.
            </p>
          </div>

        </div>

      </div>

      {isVoiceAssistantOpen && (
        <VoiceAssistantForm
          currentLanguage={currentLanguage}
          onUpdate={handleVoiceFormUpdate}
          onComplete={handleVoiceFormComplete}
          onClose={() => setIsVoiceAssistantOpen(false)}
        />
      )}

    </div>
  );
};
export default CitizenDashboard;
