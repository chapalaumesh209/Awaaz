import React, { useState, useEffect } from 'react';
import { LANGUAGES } from '../data/languages';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode, UserProfile } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { 
  Shield, Sparkles, ArrowRight, Landmark, Users2, BadgeCheck, 
  Star, MessageSquare, Info, Settings, Lightbulb 
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
          {t.brandName || "AWAAZ आवाज"}
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
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-teal-600 text-white font-semibold text-base py-4 px-8 shadow-lg shadow-teal-600/20 hover:bg-teal-700 hover:shadow-xl transition-all duration-200 active:scale-95 group"
            id="enter-citizen-btn"
          >
            <span>{t.getStarted || "Get Started as Citizen"}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={enterVolunteerMode}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-teal-900 text-white font-semibold text-base py-4 px-8 shadow-lg shadow-teal-900/20 hover:bg-teal-950 transition-all duration-200 active:scale-95"
            id="enter-volunteer-btn"
          >
            <span>{translate('volunteerPortalBtn', 'Volunteer Portal')}</span>
          </button>

          <button
            onClick={enterAdminMode}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-base py-4 px-8 shadow-sm hover:bg-gray-50 transition-all duration-200 active:scale-95"
            id="enter-admin-btn"
          >
            <span>{translate('adminHubBtn', 'Admin Hub')}</span>
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
          
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-teal-950 mb-3">
              {translate('appOverviewTitle', 'Application Overview, Core Features & Feedback Hub')}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm leading-relaxed">
              {translate('appOverviewDesc', 'Explore the exhaustive capabilities, operational workflow, and community feedback mechanisms of the AWAAZ application below.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Column 1: App Info & Core Features */}
            <div className="space-y-8">
              <div>
                <h3 className="flex items-center space-x-2 text-lg font-bold text-teal-900 border-b border-teal-100 pb-2 mb-4">
                  <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">1</span>
                  <span>{translate('appInfoTitle', 'Complete Application Information')}</span>
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {translate('appInfoDesc', 'AWAAZ (आवाज़) is an offline-first, multilingual, and voice-assisted digital access engine designed specifically for marginalized populations, migrant laborers, stateless communities, and women in rural India. Built to bypass complex red-tape barriers, the application ensures that language barriers, lack of physical records, and access limitations do not prevent citizens from obtaining their fundamental social rights, security resources, and government subsidies.')}
                </p>
              </div>

              <div>
                <h3 className="flex items-center space-x-2 text-lg font-bold text-teal-900 border-b border-teal-100 pb-2 mb-4">
                  <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">2</span>
                  <span>{translate('systemFeaturesTitle', 'Core System Features')}</span>
                </h3>
                <ol className="space-y-3 text-sm text-gray-600 list-decimal pl-5 font-medium">
                  <li>
                    <strong className="text-teal-950">{translate('feature1Title', 'AI Entitlements Screening')}:</strong> 
                    <span className="font-normal block text-xs text-gray-500 mt-0.5">{translate('feature1Desc', 'Diagnose eligibility across 12+ premium central/state welfare schemes instantly via voice in local dialects.')}</span>
                  </li>
                  <li>
                    <strong className="text-teal-950">{translate('feature2Title', 'Paperless Documents Cabinet')}:</strong> 
                    <span className="font-normal block text-xs text-gray-500 mt-0.5">{translate('feature2Desc', 'Interactive OCR engine extracts, verifies, and stores Aadhaar, Ration, and income credentials safely.')}</span>
                  </li>
                  <li>
                    <strong className="text-teal-950">{translate('feature3Title', 'Stateless Identity Wallet & Legal Affidavits')}:</strong> 
                    <span className="font-normal block text-xs text-gray-500 mt-0.5">{translate('feature3Desc', 'Biometric digital trust scoring and automated generation of court-grade pre-notary affidavits for recordless citizens.')}</span>
                  </li>
                  <li>
                    <strong className="text-teal-950">{translate('feature4Title', 'Women Safety & Helpdesk')}:</strong> 
                    <span className="font-normal block text-xs text-gray-500 mt-0.5">{translate('feature4Desc', 'Crowdsourced safe route planning, local Gram Panchayat panic sirens, and menstrual hygiene health desks.')}</span>
                  </li>
                  <li>
                    <strong className="text-teal-950">{translate('feature5Title', 'Civic Voice & Gram Sabha Hub')}:</strong> 
                    <span className="font-normal block text-xs text-gray-500 mt-0.5">{translate('feature5Desc', 'Review localized development funds, join digital town halls, or play the Gram Sabha education board game.')}</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Column 2: System Functionality & Interactive Feedback Form */}
            <div className="space-y-8">
              <div>
                <h3 className="flex items-center space-x-2 text-lg font-bold text-teal-900 border-b border-teal-100 pb-2 mb-4">
                  <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">3</span>
                  <span>{translate('workflowTitle', 'System Functionality & User Workflow')}</span>
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-teal-600 font-bold font-mono text-xs mt-1">3.1.</span>
                    <div>
                      <strong className="text-gray-900 block">{translate('workflow1Title', 'Select Script & Dialect')}</strong>
                      <span className="text-xs text-gray-500">{translate('workflow1Desc', 'The platform automatically translates its entire visual and conversational layer to your selected regional tongue.')}</span>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-teal-600 font-bold font-mono text-xs mt-1">3.2.</span>
                    <div>
                      <strong className="text-gray-900 block">{translate('workflow2Title', 'Perform AI Self-Assessment')}</strong>
                      <span className="text-xs text-gray-500">{translate('workflow2Desc', 'Provide basic inputs (profession, income tier, gender) using easy voice prompts to determine eligible schemes.')}</span>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-teal-600 font-bold font-mono text-xs mt-1">3.3.</span>
                    <div>
                      <strong className="text-gray-900 block">{translate('workflow3Title', 'Submit to Verified Panchayat Volunteers')}</strong>
                      <span className="text-xs text-gray-500">{translate('workflow3Desc', 'Local accredited NGO volunteers review, co-sign, and process applications on behalf of offline citizens.')}</span>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-teal-600 font-bold font-mono text-xs mt-1">3.4.</span>
                    <div>
                      <strong className="text-gray-900 block">{translate('workflow4Title', 'State-Engine Tracking')}</strong>
                      <span className="text-xs text-gray-500">{translate('workflow4Desc', 'Your application receives a digital reference token to track updates up to final disbursal.')}</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="flex items-center space-x-2 text-lg font-bold text-teal-900 border-b border-teal-100 pb-2 mb-4">
                  <span className="bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">4</span>
                  <span>{translate('feedbackTitle', 'Citizen Feedback & Governance Audit')}</span>
                </h3>
                
                {/* Form starts here */}
                <form onSubmit={handleFeedbackSubmit} className="bg-white border border-teal-100 rounded-2xl p-5 shadow-xs space-y-4">
                  <p className="text-xs text-teal-950 font-bold uppercase tracking-wider mb-2">{translate('feedbackSubtitle', 'Submit Your Live Panchayat Feedback:')}</p>
                  
                  {/* Step 1: Category */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      {translate('feedbackStep1', 'Step 1: Select Application Module / Category')}
                    </label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50/55 text-gray-800 font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="schemes">{translate('optSchemes', 'AI Schemes Advisor')}</option>
                      <option value="safety">{translate('optSafety', 'Women Safety & Support')}</option>
                      <option value="identity">{translate('optIdentity', 'Identity Wallet & Documents')}</option>
                      <option value="civic">{translate('optCivic', 'Civic Voice & Gram Sabha')}</option>
                    </select>
                  </div>

                  {/* Step 2: Rating */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      {translate('feedbackStep2', 'Step 2: Provide Your Rating (1 to 5 Stars)')}
                    </label>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star 
                            className={`h-5 w-5 ${
                              star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                            }`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-teal-800 ml-2">({feedbackRating}/5 {translate('feedbackStars', 'Stars')})</span>
                    </div>
                  </div>

                  {/* Step 3: Text */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      {translate('feedbackStep3', 'Step 3: Write Your Message / Experience')}
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={translate('feedbackTextPlaceholder', 'Enter details regarding corruption-free delivery, usability or feature suggestions...')}
                      rows={3}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50/55 text-gray-800 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      required
                    ></textarea>
                  </div>

                  {/* Step 4: Submit Button */}
                  <div>
                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{translate('feedbackBtnText', 'Step 4: Register Citizen Feedback')}</span>
                    </button>
                  </div>

                  {feedbackSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3 text-xs text-center font-bold animate-pulse">
                      ✓ {translate('feedbackSuccessMsg', 'Thank you! Your feedback has been registered and audited securely.')}
                    </div>
                  )}
                </form>

              </div>
            </div>

          </div>

          {/* Render Active Community Feedbacks in Numbers */}
          <div className="mt-12 bg-teal-50/40 rounded-3xl p-6 border border-teal-100/50">
            <h4 className="font-serif text-lg font-bold text-teal-950 mb-4 flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-teal-700" />
              <span>{translate('activeFeedbacksTitle', 'Registered Panchayat Audits & Citizen Feedback Reviews')} ({feedbacks.length})</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {feedbacks.map((f, index) => (
                <div key={f.id} className="bg-white border border-teal-100/30 rounded-2xl p-4 shadow-xs relative">
                  <div className="absolute top-4 right-4 bg-teal-50 text-teal-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                    No. {index + 1}
                  </div>
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-teal-600 mb-1">{f.category}</span>
                  <p className="text-xs font-medium text-gray-800 mb-3 italic">"{f.text}"</p>
                  
                  <div className="flex items-center justify-between border-t border-gray-50 pt-2">
                    <div>
                      <span className="block text-[11px] font-bold text-gray-900">{f.name}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{f.date}</span>
                    </div>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
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
  );
};
export default LandingView;
