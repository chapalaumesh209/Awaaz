import React, { useState, useEffect } from 'react';
import { LANGUAGES } from '../data/languages';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode, UserProfile } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { 
  Shield, Sparkles, ArrowRight, Landmark, Users2, BadgeCheck, 
  Star, MessageSquare, Info, Settings, Lightbulb,
  Volume2, FileCheck, Lock, Languages, HeartHandshake
} from 'lucide-react';

interface LandingViewProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onNavigate: (route: string, params?: Record<string, string>) => void;
  activeUser: UserProfile;
  setRole: (role: UserProfile['role']) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  currentLanguage,
  setLanguage,
  onNavigate,
  activeUser,
  setRole
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];

  const [localTrans, setLocalTrans] = useState<Record<string, string>>({});
  const translatingKeys = React.useRef<Set<string>>(new Set());

  // Load the complete translation dictionary from Firestore once per language change
  useEffect(() => {
    if (currentLanguage === 'en') {
      setLocalTrans({});
      translatingKeys.current.clear();
      return;
    }

    translatingKeys.current.clear();
    dbClient.getTranslationsForLanguage(currentLanguage, TRANSLATIONS[currentLanguage] || {})
      .then((existingTranslations) => {
        if (existingTranslations) {
          TRANSLATIONS[currentLanguage] = {
            ...TRANSLATIONS[currentLanguage],
            ...existingTranslations
          };
          setLocalTrans(existingTranslations);
        }
      })
      .catch((err) => {
        console.warn("Firestore pre-load translations failed:", err);
      });
  }, [currentLanguage]);

  // Real-time asynchronous background translator powered by Gemini and Firestore
  const triggerAsyncTranslation = async (key: string, englishText: string) => {
    if (currentLanguage === 'en') return;
    if (translatingKeys.current.has(key)) return;
    translatingKeys.current.add(key);

    try {
      const translated = await dbClient.translateTextDynamically(englishText, currentLanguage);
      if (translated && translated !== englishText) {
        const updatedDict = {
          ...(TRANSLATIONS[currentLanguage] || {}),
          [key]: translated
        };
        TRANSLATIONS[currentLanguage] = updatedDict;
        setLocalTrans(prev => ({ ...prev, [key]: translated }));

        // Save back to Firestore
        await dbClient.saveTranslationsForLanguage(currentLanguage, updatedDict);
      }
    } catch (err) {
      console.error("Failed dynamic translation in LandingView:", err);
    }
  };

  const translate = (key: string, englishText: string): string => {
    if (currentLanguage === 'en') return englishText;
    if (localTrans[key]) return localTrans[key];
    
    const glob = TRANSLATIONS[currentLanguage] || {};
    if (glob[key]) return glob[key];

    // Trigger translate in background
    triggerAsyncTranslation(key, englishText);
    return englishText;
  };

  const [feedbackCategory, setFeedbackCategory] = useState<string>('schemes');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);
  const [feedbacks, setFeedbacks] = useState<Array<{ id: number, name: string, category: string, text: string, rating: number, date: string }>>([
    { id: 1, name: "Arjun Singh", category: "AI Schemes Advisor", text: "Extremely helpful tool! Let me find out my Vishwakarma scheme eligibility in Hindi instantly.", rating: 5, date: "2026-06-28" },
    { id: 2, name: "Sita Marandi", category: "Women Safety & Support", text: "The emergency SOS and the safe-route indicators give us peace of mind when returning late from work.", rating: 5, date: "2026-06-29" },
    { id: 3, name: "Priya Das", category: "Identity Wallet", text: "Digital OCR locker is awesome. Easy scanning of my ration card on my basic phone.", rating: 4, date: "2026-06-29" }
  ]);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    const newFeedback = {
      id: Date.now(),
      name: activeUser.name || "Anonymous Citizen",
      category: feedbackCategory === 'schemes' ? "AI Schemes Advisor" : feedbackCategory === 'safety' ? "Women Safety & Support" : feedbackCategory === 'identity' ? "Identity Wallet" : "Civic Voice & Gram Sabha",
      text: feedbackText,
      rating: feedbackRating,
      date: new Date().toISOString().split('T')[0]
    };
    setFeedbacks([newFeedback, ...feedbacks]);
    setFeedbackText('');
    setFeedbackSuccess(true);
    setTimeout(() => setFeedbackSuccess(false), 5000);
  };

  const enterCitizenMode = () => {
    // If they are already a logged-in user or guest, go to consent/home
    if (activeUser.id !== 'user-default') {
      setRole('citizen');
      if (!activeUser.consentGiven) {
        onNavigate('consent');
      } else {
        onNavigate('home');
      }
    } else {
      // Otherwise go to auth to choose login / sign up / guest
      onNavigate('auth', { role: 'citizen' });
    }
  };

  const enterVolunteerMode = () => {
    if (activeUser.id !== 'user-default' && activeUser.role === 'volunteer') {
      onNavigate('volunteer');
    } else {
      onNavigate('auth', { role: 'volunteer' });
    }
  };

  const enterAdminMode = () => {
    if (activeUser.id !== 'user-default' && activeUser.role === 'admin') {
      onNavigate('admin');
    } else {
      onNavigate('auth', { role: 'admin' });
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-radial from-teal-50/50 via-warm-white to-gray-50/20" id="landing-container">
      
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-4 py-8 sm:py-16 text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center space-x-1.5 self-center rounded-full bg-teal-50 border border-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs mb-6">
          <Shield className="h-3.5 w-3.5 text-teal-600" />
          <span>{translate('portalSubTitle', 'Official Public Entitlements & Grievance Portal: Voice, Safety & Welfare')}</span>
        </div>

        {/* Display Typography */}
        <h1 className="font-serif text-5xl sm:text-7xl font-extrabold tracking-tight text-teal-700 mb-2 leading-tight">
          AWAAZ
        </h1>
        
        <p className="font-serif italic text-lg sm:text-2xl font-semibold text-gray-700 tracking-wide mb-6">
          {t.slogan || "Voice, Safety & Social Access"}
        </p>

        <p className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg mb-8 leading-relaxed">
          {t.tagline || "Empowering Indian citizens to access entitlements, secure identity documents, obtain safe transit, and connect with volunteers."}
        </p>

        {/* 12 Indian Languages Bento Grid */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
            {t.selectLanguage || "Select Your Language"}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-w-4xl mx-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`group flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 text-center ${
                  currentLanguage === lang.code
                    ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-105'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-teal-200 hover:bg-teal-50/30'
                }`}
              >
                <span className="text-sm font-semibold tracking-wide">{lang.name}</span>
                <span className={`text-[10px] mt-0.5 ${currentLanguage === lang.code ? 'text-teal-100' : 'text-gray-400'}`}>
                  {lang.nativeName}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto mb-16">
          
          <button
            onClick={enterCitizenMode}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-teal-600 text-white font-semibold text-base py-4 px-12 shadow-lg shadow-teal-600/20 hover:bg-teal-700 hover:shadow-xl transition-all duration-200 active:scale-95 group"
            id="enter-citizen-btn"
          >
            <span>{t.getStarted || "Get Started as Citizen"}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>

        </div>

        {/* National Welfare Impact Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-100 pt-10 max-w-4xl mx-auto text-left">
          <div className="flex items-center space-x-3">
            <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">4,500+</span>
              <span className="text-xs text-gray-400 font-medium">{translate('panchayatsLabel', 'Gram Panchayats')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">12,200+</span>
              <span className="text-xs text-gray-400 font-medium">{translate('volunteersLabel', 'Volunteers Active')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">18 Lakhs+</span>
              <span className="text-xs text-gray-400 font-medium">{translate('disbursedLabel', 'Entitlements Disbursed')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">99.8%</span>
              <span className="text-xs text-gray-400 font-medium">{translate('safeAuditLabel', 'Safe Grievance Audit')}</span>
            </div>
          </div>
        </div>

        {/* Numbered Complete App Info, Features, Functionality & Feedback */}
        <div className="mt-20 border-t border-teal-100 pt-16 max-w-5xl mx-auto px-4 text-left font-sans" id="awaaz-app-info-section">
          
          {/* 1. Top Hero Summary Card */}
          <div className="bg-gradient-to-br from-teal-900 via-teal-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden mb-12">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-800/60 text-teal-100 border border-teal-700/50">
                  <Sparkles className="h-3 w-3 mr-1 text-teal-300" />
                  AWAAZ Platform Overview
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                  {translate('appOverviewTitle', 'Application Overview, Core Features & Feedback Hub')}
                </h2>
                <p className="text-teal-100/80 text-sm leading-relaxed max-w-xl">
                  {translate('appOverviewDesc', 'Explore the exhaustive capabilities, operational workflow, and community feedback mechanisms of the AWAAZ application below.')}
                </p>
              </div>
              <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold font-serif text-teal-200">12</div>
                  <div className="text-[10px] text-teal-100/70 font-semibold uppercase tracking-wider mt-1">Languages</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold font-serif text-teal-200">Voice</div>
                  <div className="text-[10px] text-teal-100/70 font-semibold uppercase tracking-wider mt-1">Assisted</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold font-serif text-teal-200">Offline</div>
                  <div className="text-[10px] text-teal-100/70 font-semibold uppercase tracking-wider mt-1">First</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Complete Application Information Impact Card */}
          <div className="bg-white border border-teal-100/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden mb-12 border-l-4 border-l-teal-600">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="bg-teal-50 p-3 rounded-2xl text-teal-700 shrink-0">
                <BadgeCheck className="h-8 w-8" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-teal-600 tracking-wider">01</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  <h3 className="font-serif text-xl font-bold text-teal-950">
                    {translate('appInfoTitle', 'Complete Application Information')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
                  {translate('appInfoDesc', 'AWAAZ (आवाज़) is an offline-first, multilingual, and voice-assisted digital access engine designed specifically for marginalized populations, migrant laborers, stateless communities, and women in rural India. Built to bypass complex red-tape barriers, the application ensures that language barriers, lack of physical records, and access limitations do not prevent citizens from obtaining their fundamental social rights, security resources, and government subsidies.')}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-semibold rounded-lg border border-teal-100/50">Offline-first</span>
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-semibold rounded-lg border border-teal-100/50">Multilingual</span>
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-semibold rounded-lg border border-teal-100/50">Voice-assisted</span>
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] font-semibold rounded-lg border border-teal-100/50">Citizen access</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Core System Features Grid */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">02</span>
              <h3 className="font-serif text-2xl font-bold text-teal-950">
                {translate('systemFeaturesTitle', 'Core System Features')}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              {/* Feature 1 */}
              <div className="md:col-span-2 bg-gradient-to-b from-white to-teal-50/20 border border-teal-100/40 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-teal-50 text-teal-700 p-2.5 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                      <Volume2 className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-300">01</span>
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('feature1Title', 'AI Entitlements Screening')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('feature1Desc', 'Diagnose eligibility across 10+ premium Central Government of India welfare schemes instantly via voice in local dialects.')}</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="md:col-span-2 bg-gradient-to-b from-white to-emerald-50/20 border border-emerald-100/40 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-300">02</span>
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('feature2Title', 'Paperless Documents Cabinet')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('feature2Desc', 'Interactive OCR engine extracts, verifies, and stores Aadhaar, Ration, and income credentials safely.')}</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="md:col-span-2 bg-gradient-to-b from-white to-purple-50/20 border border-purple-100/40 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-purple-50 text-purple-700 p-2.5 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                      <Lock className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-300">03</span>
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('feature3Title', 'Stateless Identity Wallet & Legal Affidavits')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('feature3Desc', 'Biometric digital trust scoring and automated generation of court-grade pre-notary affidavits for recordless citizens.')}</p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="md:col-span-3 bg-gradient-to-b from-white to-rose-50/20 border border-rose-100/40 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                      <Shield className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-300">04</span>
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('feature4Title', 'Women Safety & Helpdesk')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('feature4Desc', 'Crowdsourced safe route planning, local Gram Panchayat panic sirens, and menstrual hygiene health desks.')}</p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="md:col-span-3 bg-gradient-to-b from-white to-amber-50/20 border border-amber-100/40 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-amber-50 text-amber-700 p-2.5 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                      <Users2 className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-300">05</span>
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('feature5Title', 'Civic Voice & Gram Sabha Hub')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('feature5Desc', 'Review localized development funds, join digital town halls, or play the Gram Sabha education board game.')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. System Functionality & User Workflow (Visual Timeline) */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-8">
              <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">03</span>
              <h3 className="font-serif text-2xl font-bold text-teal-950">
                {translate('workflowTitle', 'System Functionality & User Workflow')}
              </h3>
            </div>

            {/* Timeline wrapper */}
            <div className="relative">
              {/* Connecting line for desktop timeline */}
              <div className="hidden md:block absolute top-1/2 left-4 right-4 h-0.5 bg-teal-100/70 -translate-y-1/2 z-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                {/* Step 1 */}
                <div className="bg-white border border-teal-100/50 rounded-2xl p-5 relative flex flex-col items-center text-center shadow-xs">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white text-xs font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md">
                    1
                  </div>
                  <div className="bg-teal-50 text-teal-700 p-3 rounded-full mt-2 mb-4">
                    <Languages className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('workflow1Title', 'Select Script & Dialect')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('workflow1Desc', 'The platform automatically translates its entire visual and conversational layer to your selected regional tongue.')}</p>
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-teal-100/50 rounded-2xl p-5 relative flex flex-col items-center text-center shadow-xs">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white text-xs font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md">
                    2
                  </div>
                  <div className="bg-teal-50 text-teal-700 p-3 rounded-full mt-2 mb-4">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('workflow2Title', 'Perform AI Self-Assessment')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('workflow2Desc', 'Provide basic inputs (profession, income tier, gender) using easy voice prompts to determine eligible schemes.')}</p>
                </div>

                {/* Step 3 */}
                <div className="bg-white border border-teal-100/50 rounded-2xl p-5 relative flex flex-col items-center text-center shadow-xs">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white text-xs font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md">
                    3
                  </div>
                  <div className="bg-teal-50 text-teal-700 p-3 rounded-full mt-2 mb-4">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('workflow3Title', 'Submit to Verified Panchayat Volunteers')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('workflow3Desc', 'Local accredited NGO volunteers review, co-sign, and process applications on behalf of offline citizens.')}</p>
                </div>

                {/* Step 4 */}
                <div className="bg-white border border-teal-100/50 rounded-2xl p-5 relative flex flex-col items-center text-center shadow-xs">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white text-xs font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md">
                    4
                  </div>
                  <div className="bg-teal-50 text-teal-700 p-3 rounded-full mt-2 mb-4">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-teal-950 mb-2">{translate('workflow4Title', 'State-Engine Tracking')}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{translate('workflow4Desc', 'Your application receives a digital reference token to track updates up to final disbursal.')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Citizen Feedback & Governance Audit */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">04</span>
              <h3 className="font-serif text-2xl font-bold text-teal-950">
                {translate('feedbackTitle', 'Citizen Feedback & Governance Audit')}
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Feedback Form Card */}
              <div className="lg:col-span-5 bg-white border-2 border-teal-600/30 rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute -top-10 -right-10 bg-teal-50 w-24 h-24 rounded-full -z-0 opacity-40"></div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-teal-50 text-teal-700 p-2 rounded-xl">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-teal-950">{translate('feedbackTitle', 'Citizen Feedback & Governance Audit')}</h4>
                      <p className="text-[11px] text-gray-500 font-medium">{translate('feedbackSubtitle', 'Submit your live Panchayat feedback and help improve corruption-free delivery, usability, and feature quality.')}</p>
                    </div>
                  </div>

                  <form onSubmit={handleFeedbackSubmit} className="space-y-4 pt-2">
                    {/* Step 1: Category */}
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                        {translate('feedbackStep1', 'Step 1: Select Application Module / Category')}
                      </label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full text-xs border border-teal-100 rounded-xl p-3 bg-teal-50/30 text-teal-900 font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      >
                        <option value="schemes">{translate('optSchemes', 'AI Schemes Advisor')}</option>
                        <option value="safety">{translate('optSafety', 'Women Safety & Support')}</option>
                        <option value="identity">{translate('optIdentity', 'Identity Wallet & Documents')}</option>
                        <option value="civic">{translate('optCivic', 'Civic Voice & Gram Sabha')}</option>
                      </select>
                    </div>

                    {/* Step 2: Rating */}
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                        {translate('feedbackStep2', 'Step 2: Provide Your Rating (1 to 5 Stars)')}
                      </label>
                      <div className="flex items-center space-x-2 bg-teal-50/25 p-3 rounded-xl border border-teal-50">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="hover:scale-125 transition-transform duration-150"
                            >
                              <Star 
                                className={`h-6 w-6 ${
                                  star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-teal-800 ml-2">({feedbackRating}/5 {translate('feedbackStars', 'Stars')})</span>
                      </div>
                    </div>

                    {/* Step 3: Text */}
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                        {translate('feedbackStep3', 'Step 3: Write Your Message / Experience')}
                      </label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={translate('feedbackTextPlaceholder', 'Enter details regarding corruption-free delivery, usability or feature suggestions...')}
                        rows={3}
                        className="w-full text-xs border border-teal-100 rounded-xl p-3 bg-teal-50/30 text-teal-950 placeholder-teal-800/40 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        required
                      ></textarea>
                    </div>

                    {/* Step 4 Button */}
                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{translate('feedbackBtnText', 'Register Citizen Feedback')}</span>
                    </button>

                    <p className="text-[10px] text-gray-400 text-center font-medium">
                      “Your feedback helps improve service delivery and local accountability.”
                    </p>

                    {feedbackSuccess && (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3 text-xs text-center font-bold animate-bounce">
                        ✓ {translate('feedbackSuccessMsg', 'Thank you! Your feedback has been registered and audited securely.')}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Existing Panchayat Audits Reviews */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-teal-50/30 rounded-3xl p-5 border border-teal-100/50">
                  <h4 className="font-serif text-md font-bold text-teal-950 mb-4 flex items-center space-x-2">
                    <Lightbulb className="h-4 w-4 text-teal-700" />
                    <span>{translate('activeFeedbacksTitle', 'Registered Panchayat Audits & Citizen Feedback Reviews')} ({feedbacks.length})</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {feedbacks.map((f, index) => (
                      <div key={f.id} className="bg-white border border-teal-100/30 rounded-2xl p-4 shadow-xs relative hover:shadow-xs transition-shadow duration-200">
                        <div className="absolute top-4 right-4 bg-teal-50 text-teal-700 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                          No. {index + 1}
                        </div>
                        <span className="block text-[9px] uppercase tracking-wider font-extrabold text-teal-600 mb-1">{f.category}</span>
                        <p className="text-xs font-medium text-gray-700 mb-3 italic">"{f.text}"</p>
                        
                        <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                          <div>
                            <span className="block text-[10px] font-bold text-gray-900">{f.name}</span>
                            <span className="text-[8px] text-gray-400 font-medium">{f.date}</span>
                          </div>
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-2.5 w-2.5 ${s <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Why This Matters mini strip */}
          <div className="border-t border-teal-100/60 pt-8 mt-12">
            <h4 className="text-center font-serif text-lg font-bold text-teal-950 mb-6">Why This Matters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-teal-100/40 rounded-xl p-4 text-center hover:border-teal-200/60 transition-colors">
                <span className="block text-xs font-bold text-teal-900 mb-1">For citizens without records</span>
                <span className="text-[11px] text-gray-500">Provide legal validation and digital security credentials instantly.</span>
              </div>
              <div className="bg-white border border-teal-100/40 rounded-xl p-4 text-center hover:border-teal-200/60 transition-colors">
                <span className="block text-xs font-bold text-teal-900 mb-1">For women seeking safety</span>
                <span className="text-[11px] text-gray-500">Enable panic alerts, safety health desks, and crowd-routed maps.</span>
              </div>
              <div className="bg-white border border-teal-100/40 rounded-xl p-4 text-center hover:border-teal-200/60 transition-colors">
                <span className="block text-xs font-bold text-teal-900 mb-1">For workers needing schemes</span>
                <span className="text-[11px] text-gray-500">Secure automated state-engine eligibility checks effortlessly.</span>
              </div>
              <div className="bg-white border border-teal-100/40 rounded-xl p-4 text-center hover:border-teal-200/60 transition-colors">
                <span className="block text-xs font-bold text-teal-900 mb-1">For villages needing voice</span>
                <span className="text-[11px] text-gray-500">Engage transparent civic budgeting audit forums directly.</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default LandingView;
