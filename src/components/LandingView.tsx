import React from 'react';
import { LANGUAGES } from '../data/languages';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode, UserProfile } from '../types';
import { Shield, Sparkles, ArrowRight, Landmark, Users2, BadgeCheck } from 'lucide-react';

interface LandingViewProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onNavigate: (route: string) => void;
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

  const enterCitizenMode = () => {
    setRole('citizen');
    // If they haven't agreed to privacy consent, direct them to consent page first
    if (!activeUser.consentGiven) {
      onNavigate('consent');
    } else {
      onNavigate('home');
    }
  };

  const enterVolunteerMode = () => {
    setRole('volunteer');
    onNavigate('volunteer');
  };

  const enterAdminMode = () => {
    setRole('admin');
    onNavigate('admin');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-radial from-teal-50/50 via-warm-white to-gray-50/20" id="landing-container">
      
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-4 py-8 sm:py-16 text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center space-x-1.5 self-center rounded-full bg-teal-50 border border-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-xs mb-6">
          <Shield className="h-3.5 w-3.5 text-teal-600" />
          <span>Official Public Entitlements & Grievance Portal: Voice, Safety & Welfare</span>
        </div>

        {/* Display Typography */}
        <h1 className="font-serif text-5xl sm:text-7xl font-extrabold tracking-tight text-teal-700 mb-2 leading-tight">
          {t.brandName || "AWAAZ  आवाज़"}
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
            <span>Volunteer Portal</span>
          </button>

          <button
            onClick={enterAdminMode}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-base py-4 px-8 shadow-sm hover:bg-gray-50 transition-all duration-200 active:scale-95"
            id="enter-admin-btn"
          >
            <span>Admin Hub</span>
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
              <span className="text-xs text-gray-400 font-medium">Gram Panchayats</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">12,200+</span>
              <span className="text-xs text-gray-400 font-medium">Volunteers Active</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">18 Lakhs+</span>
              <span className="text-xs text-gray-400 font-medium">Entitlements Disbursed</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-extrabold text-gray-900">99.8%</span>
              <span className="text-xs text-gray-400 font-medium">Safe Grievance Audit</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default LandingView;
