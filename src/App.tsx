import React, { useState, useEffect } from 'react';
import { LanguageCode, UserProfile } from './types';
import { dbClient } from './lib/supabaseClient';
import { TRANSLATIONS } from './data/translations';

// Core Subcomponents
import Header from './components/Header';
import LandingView from './components/LandingView';
import ConsentView from './components/ConsentView';
import CitizenDashboard from './components/CitizenDashboard';
import AiAssistantView from './components/AiAssistantView';
import SchemesView from './components/SchemesView';
import SchemeDetailView from './components/SchemeDetailView';
import DocumentsView from './components/DocumentsView';
import ReadinessView from './components/ReadinessView';
import TrackerView from './components/TrackerView';
import SupportView from './components/SupportView';
import SafetyView from './components/SafetyView';
import RecordlessView from './components/RecordlessView';
import ReportView from './components/ReportView';
import CivicVoiceView from './components/CivicVoiceView';
import VolunteerDashboard from './components/VolunteerDashboard';
import VolunteerCaseDetailView from './components/VolunteerCaseDetailView';
import AdminDashboard from './components/AdminDashboard';
import AuthView from './components/AuthView';

// Bottom Nav Icons for Mobile Citizen Flow
import { 
  Home, Award, Bot, FileText, ClipboardList, 
  MapPin, AlertOctagon, Heart, Users, ShieldAlert, Scale, ShieldCheck, HeartPulse, Volume2
} from 'lucide-react';

export default function App() {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [currentRoute, setCurrentRoute] = useState<string>('landing');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const [translationsTrigger, setTranslationsTrigger] = useState<number>(0);

  // Pre-load all cached translations from Firestore when language changes
  useEffect(() => {
    if (currentLanguage === 'en') return;

    dbClient.getTranslationsForLanguage(currentLanguage, TRANSLATIONS[currentLanguage] || {})
      .then((existingTranslations) => {
        if (existingTranslations) {
          TRANSLATIONS[currentLanguage] = {
            ...TRANSLATIONS[currentLanguage],
            ...existingTranslations
          };
          setTranslationsTrigger(prev => prev + 1);
        }
      })
      .catch((err) => {
        console.warn("App.tsx translation preload error:", err);
      });
  }, [currentLanguage]);
  
  const [activeUser, setActiveUser] = useState<UserProfile>({
    id: 'user-default',
    name: '',
    role: 'citizen',
    selectedLanguage: 'en',
    consentGiven: false
  });

  // Load active user on start
  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = async () => {
    const user = dbClient.getActiveUser();
    if (user) {
      setActiveUser(user);
      setCurrentLanguage(user.selectedLanguage);
    }
  };

  // Sync profile update (triggered when profile or persona changes)
  const handleProfileUpdated = async () => {
    const profile = await dbClient.getProfile();
    const sessionUser = dbClient.getActiveUser();
    if (profile && sessionUser) {
      setActiveUser({
        ...activeUser,
        name: profile.name,
        selectedLanguage: profile.primaryLanguage,
        consentGiven: true
      });
      setCurrentLanguage(profile.primaryLanguage);
    }
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    dbClient.setActiveUser({ selectedLanguage: lang });
    setActiveUser(prev => ({ ...prev, selectedLanguage: lang }));
  };

  const handleRoleChange = (role: UserProfile['role']) => {
    dbClient.setActiveUser({ role });
    setActiveUser(prev => ({ ...prev, role }));
  };

  const handleConsentAgree = () => {
    dbClient.setActiveUser({ consentGiven: true });
    setActiveUser(prev => ({ ...prev, consentGiven: true }));
    setCurrentRoute('home');
  };

  const handleNavigate = (route: string, params: Record<string, string> = {}) => {
    setCurrentRoute(route);
    setRouteParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await dbClient.logout();
    setActiveUser({
      id: 'user-default',
      name: '',
      role: 'citizen',
      selectedLanguage: currentLanguage,
      consentGiven: false
    });
    handleNavigate('landing');
  };

  // Render main screen component based on current state
  const renderView = () => {
    switch (currentRoute) {
      case 'landing':
        return (
          <LandingView
            currentLanguage={currentLanguage}
            setLanguage={handleLanguageChange}
            onNavigate={handleNavigate}
            activeUser={activeUser}
            setRole={handleRoleChange}
          />
        );
      case 'consent':
        return (
          <ConsentView
            currentLanguage={currentLanguage}
            onAgree={handleConsentAgree}
            onCancel={() => handleNavigate('landing')}
          />
        );
      case 'auth':
        return (
          <AuthView
            currentLanguage={currentLanguage}
            initialRole={(routeParams.role as UserProfile['role']) || 'citizen'}
            onAuthSuccess={(user) => {
              setActiveUser(user);
              if (user.selectedLanguage) {
                setCurrentLanguage(user.selectedLanguage);
              }
              if (user.role === 'citizen') {
                if (!user.consentGiven) {
                  handleNavigate('consent');
                } else {
                  handleNavigate('home');
                }
              } else if (user.role === 'volunteer') {
                handleNavigate('volunteer');
              } else if (user.role === 'admin') {
                handleNavigate('admin');
              }
            }}
            onNavigateBack={() => handleNavigate('landing')}
          />
        );
      case 'home':
        return (
          <CitizenDashboard
            currentLanguage={currentLanguage}
            onNavigate={handleNavigate}
            onProfileUpdated={handleProfileUpdated}
          />
        );
      case 'assistant':
        return <AiAssistantView currentLanguage={currentLanguage} />;
      case 'schemes':
        return <SchemesView currentLanguage={currentLanguage} onNavigate={handleNavigate} />;
      case 'scheme-detail':
        return (
          <SchemeDetailView
            currentLanguage={currentLanguage}
            schemeId={routeParams.id || 'pm-vishwakarma'}
            onNavigate={handleNavigate}
          />
        );
      case 'documents':
        return <DocumentsView currentLanguage={currentLanguage} onProfileUpdated={handleProfileUpdated} />;
      case 'readiness':
        return <ReadinessView currentLanguage={currentLanguage} onNavigate={handleNavigate} />;
      case 'tracker':
        return <TrackerView currentLanguage={currentLanguage} />;
      case 'support':
        return <SupportView currentLanguage={currentLanguage} />;
      case 'safety':
        return <SafetyView currentLanguage={currentLanguage} />;
      case 'recordless':
        return <RecordlessView currentLanguage={currentLanguage} />;
      case 'report':
        return <ReportView currentLanguage={currentLanguage} />;
      case 'civic':
        return <CivicVoiceView currentLanguage={currentLanguage} />;
      
      // Volunteer views
      case 'volunteer':
        return <VolunteerDashboard currentLanguage={currentLanguage} onNavigate={handleNavigate} />;
      case 'volunteer-case-detail':
        return (
          <VolunteerCaseDetailView
            currentLanguage={currentLanguage}
            caseId={routeParams.id || 'case-101'}
            onNavigate={handleNavigate}
          />
        );

      // Admin views
      case 'admin':
        return <AdminDashboard currentLanguage={currentLanguage} onNavigate={handleNavigate} />;

      default:
        return (
          <div className="py-20 text-center">
            <span className="text-gray-400">View not found.</span>
          </div>
        );
    }
  };

  const isCitizenMode = activeUser.role === 'citizen';
  const showNav = currentRoute !== 'landing' && currentRoute !== 'consent' && currentRoute !== 'auth';

  return (
    <div className="min-h-screen bg-warm-white flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900" id="awaaz-root">
      
      {/* Top Header Row */}
      <Header
        currentLanguage={currentLanguage}
        setLanguage={handleLanguageChange}
        activeUser={activeUser}
        setRole={handleRoleChange}
        onNavigate={handleNavigate}
        currentRoute={currentRoute}
        onLogout={handleLogout}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 pb-24 sm:pb-8">
        {renderView()}
      </main>

      {/* MOBILE CITIZEN PORTAL NAVIGATION BAR (Bottom tab-rail styled exquisitely) */}
      {showNav && isCitizenMode && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-100/40 bg-white/95 backdrop-blur-md shadow-lg sm:hidden"
          id="mobile-nav-bar"
        >
          <div className="flex h-16 items-center justify-start px-4 overflow-x-auto flex-nowrap scrollbar-none space-x-4">
            
            <button
              onClick={() => handleNavigate('home')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'home' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">Home</span>
            </button>

            <button
              onClick={() => handleNavigate('assistant')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'assistant' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Bot className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">AI Help</span>
            </button>

            <button
              onClick={() => handleNavigate('schemes')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'schemes' || currentRoute === 'scheme-detail' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Award className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">Schemes</span>
            </button>

            <button
              onClick={() => handleNavigate('documents')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'documents' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">Documents</span>
            </button>

            <button
              onClick={() => handleNavigate('recordless')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'recordless' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">Identity</span>
            </button>

            <button
              onClick={() => handleNavigate('tracker')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'tracker' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">Tracker</span>
            </button>

            <button
              onClick={() => handleNavigate('safety')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'safety' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <HeartPulse className="h-5 w-5 text-teal-600" />
              <span className="text-[9px] mt-1 font-bold">Safety</span>
            </button>

            <button
              onClick={() => handleNavigate('civic')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'civic' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Volume2 className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">Civic</span>
            </button>

          </div>
        </div>
      )}

      {/* DESKTOP DESK RAIL INDICATOR (Subtle side float panel on wider screens for easy desktop nav) */}
      {showNav && isCitizenMode && (
        <div 
          className="hidden sm:flex fixed left-4 top-20 bottom-20 w-16 bg-white/95 border border-teal-100 rounded-3xl shadow-md flex-col items-center py-6 space-y-4 z-40 overflow-y-auto scrollbar-none"
          id="desktop-side-rail"
        >
          <button
            onClick={() => handleNavigate('home')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'home' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Dashboard Home"
          >
            <Home className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('assistant')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'assistant' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="AI Assistant"
          >
            <Bot className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('schemes')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'schemes' || currentRoute === 'scheme-detail' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Entitlements"
          >
            <Award className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('documents')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'documents' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Documents Cabinet"
          >
            <FileText className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('recordless')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'recordless' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Identity Wallet & Affidavits"
          >
            <ShieldCheck className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('tracker')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'tracker' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Application Tracker"
          >
            <ClipboardList className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('safety')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'safety' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Safety & SOS support"
          >
            <HeartPulse className="h-5 w-5" />
          </button>

          <button
            onClick={() => handleNavigate('civic')}
            className={`p-3 rounded-2xl hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              currentRoute === 'civic' ? 'bg-teal-50 text-teal-700' : 'text-gray-400'
            }`}
            title="Civic Voice & Gram Sabha Hub"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>
      )}

    </div>
  );
}
