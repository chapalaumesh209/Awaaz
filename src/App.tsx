import React, { useState, useEffect } from 'react';
import { LanguageCode, UserProfile } from './types';
import { dbClient } from './lib/supabaseClient';
import { TRANSLATIONS } from './data/translations';
import { BrowserRouter as Router, useNavigate, useLocation } from 'react-router-dom';
import { TranslationProvider, useTranslation } from './contexts/TranslationContext';

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
import AdminSeedView from './components/AdminSeedView';
import AuthView from './components/AuthView';

// Bottom Nav Icons for Mobile Citizen Flow
import { 
  Home, Award, Bot, FileText, ClipboardList, 
  MapPin, AlertOctagon, Heart, Users, ShieldAlert, Scale, ShieldCheck, HeartPulse, Volume2
} from 'lucide-react';

function AppContent() {
  const { currentLanguage, setLanguage, t } = useTranslation();
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = location.pathname === '/' ? 'landing' : location.pathname.substring(1);
  const routeParams = Object.fromEntries(new URLSearchParams(location.search).entries());

  
  
  const [activeUser, setActiveUser] = useState<UserProfile>(() => dbClient.getActiveUser());
  const [sosActive, setSosActive] = useState(false);

  // Load active user on start
  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = async () => {
    const user = dbClient.getActiveUser();
    if (user) {
      setActiveUser(user);
      setLanguage(user.selectedLanguage);
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
      setLanguage(profile.primaryLanguage);
    }
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
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
    navigate('/home');
  };

  const handleNavigate = (route: string, params: Record<string, string> = {}) => {
    let path = route === 'landing' ? '/' : `/${route}`;
    if (Object.keys(params).length > 0) {
      const search = new URLSearchParams(params).toString();
      path += `?${search}`;
    }
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await dbClient.logout();
    const newUser = dbClient.getActiveUser();
    setActiveUser(newUser);
    handleNavigate('home');
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
            onAgree={handleConsentAgree}
            onCancel={() => handleNavigate('landing')}
          />
        );
      case 'auth':
        return (
          <CitizenDashboard
            onNavigate={handleNavigate}
            onProfileUpdated={handleProfileUpdated}
          />
        );
      case 'home':
        return (
          <CitizenDashboard
            onNavigate={handleNavigate}
            onProfileUpdated={handleProfileUpdated}
          />
        );
      case 'assistant':
        return <AiAssistantView />;
      case 'schemes':
        return <SchemesView onNavigate={handleNavigate} />;
      case 'scheme-detail':
        return (
          <SchemeDetailView
            schemeId={routeParams.id || 'pm-vishwakarma'}
            currentLanguage={currentLanguage}
            onNavigate={handleNavigate}
          />
        );
      case 'documents':
        return <DocumentsView onProfileUpdated={handleProfileUpdated} />;
      case 'readiness':
        return <ReadinessView onNavigate={handleNavigate} />;
      case 'tracker':
        return <TrackerView />;
      case 'support':
        return <SupportView />;
      case 'safety':
        return <SafetyView />;
      case 'recordless':
        return <RecordlessView />;
      case 'report':
        return <ReportView />;
      case 'civic':
        return <CivicVoiceView />;
      
      // Volunteer views
      case 'volunteer':
        return <VolunteerDashboard onNavigate={handleNavigate} />;
      case 'volunteer-case-detail':
        return (
          <VolunteerCaseDetailView
            caseId={routeParams.id || 'case-101'}
            onNavigate={handleNavigate}
          />
        );

      // Admin views
      case 'admin':
        return <AdminDashboard onNavigate={handleNavigate} />;
      case 'admin-seed-companion':
        return <AdminSeedView onNavigate={handleNavigate} />;

      default:
        return (
          <div className="py-20 text-center">
            <span className="text-gray-400">View not found.</span>
          </div>
        );
    }
  };

  const isCitizenMode = activeUser.role === 'citizen';
  const showNav = currentRoute !== 'landing' && currentRoute !== 'consent';

  return (
    <div className="min-h-screen bg-warm-white flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900" id="awaaz-root">
      
      {/* Top Header Row */}
      <Header
        setLanguage={handleLanguageChange}
        activeUser={activeUser}
        setRole={handleRoleChange}
        onNavigate={handleNavigate}
        currentRoute={currentRoute}
        onLogout={handleLogout}
        sosActive={sosActive}
        onSosTrigger={() => setSosActive(true)}
      />

      {/* Main Viewport Container */}
      <main className={`flex-1 pb-24 sm:pb-8 ${showNav && isCitizenMode ? 'sm:pl-24' : ''}`}>
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
              <span className="text-[9px] mt-1 font-bold">{t('Schemes')}</span>
            </button>

            <button
              onClick={() => handleNavigate('documents')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'documents' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">{t('Documents')}</span>
            </button>

            <button
              onClick={() => handleNavigate('recordless')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'recordless' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">{t('Identity')}</span>
            </button>

            <button
              onClick={() => handleNavigate('tracker')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'tracker' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">{t('Tracker')}</span>
            </button>

            <button
              onClick={() => handleNavigate('safety')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'safety' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <HeartPulse className="h-5 w-5 text-teal-600" />
              <span className="text-[9px] mt-1 font-bold">{t('Safety')}</span>
            </button>

            <button
              onClick={() => handleNavigate('civic')}
              className={`flex flex-col items-center justify-center flex-none py-1 text-center transition-colors min-w-[56px] ${
                currentRoute === 'civic' ? 'text-teal-700 font-extrabold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Volume2 className="h-5 w-5" />
              <span className="text-[9px] mt-1 font-bold">{t('Civic')}</span>
            </button>

          </div>
        </div>
      )}

      {/* DESKTOP DESK RAIL INDICATOR (Subtle side float panel on wider screens for easy desktop nav) */}
      {showNav && isCitizenMode && (
        <div 
          className="hidden sm:flex fixed left-4 top-20 w-16 bg-white/95 border border-teal-100 rounded-3xl shadow-md flex-col items-center py-6 space-y-4 z-40"
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

      {/* SOS Alert Modal Box */}
      {sosActive && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Header info */}
            <div className="text-center mb-6">
              <div className="inline-flex bg-red-50 border border-red-100 rounded-full p-3.5 mb-3 animate-pulse">
                <ShieldAlert className="h-8 w-8 text-red-600 animate-bounce" />
              </div>
              <h2 className="font-serif text-2xl font-extrabold text-red-800 tracking-tight">
                {t('DISTRESS SOS ACTIVE')}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Emergency protocols initiated successfully
              </p>
            </div>

            {/* Status indicators */}
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 mb-6 space-y-3">
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs text-red-950 font-bold">{t('Silent alert sent to Panchayat Volunteers')}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-xs text-red-950 font-bold">{t('Mock location dispatched to trusted circle')}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <p className="text-xs text-red-950 font-bold">{t('Audio recording active')}</p>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 text-center">
                <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider">{t('GPS Link')}</span>
                <span className="text-emerald-600 text-xs font-extrabold uppercase mt-0.5 block">{t('Active')}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 text-center">
                <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider">{t('Audio')}</span>
                <span className="text-red-600 text-xs font-extrabold uppercase mt-0.5 block animate-pulse">{t('Rec')}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 text-center">
                <span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider">{t('Contacts')}</span>
                <span className="text-teal-700 text-xs font-extrabold uppercase mt-0.5 block">{t('Alerted')}</span>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setSosActive(false)}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/10 tracking-widest uppercase transition-all duration-150"
            >
              {t('Cancel Distress Alert')}
            </button>

            <p className="text-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-4">
              {t('Stay Safe • Help is on the way')}
            </p>

          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <TranslationProvider>
        <AppContent />
      </TranslationProvider>
    </Router>
  );
}
