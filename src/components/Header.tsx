import React, { useState } from 'react';
import { LANGUAGES } from '../data/languages';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode, UserProfile } from '../types';
import { Shield, Languages, UserCheck, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { AwaazLogo } from './AwaazLogo';
import { useTranslation } from '../contexts/TranslationContext';

interface HeaderProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  activeUser: UserProfile;
  setRole: (role: UserProfile['role']) => void;
  onNavigate: (route: string, params?: Record<string, string>) => void;
  currentRoute: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  setLanguage,
  activeUser,
  setRole,
  onNavigate,
  currentRoute,
  onLogout
}) => {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const { t } = useTranslation();

  const triggerSos = () => {
    setSosActive(true);
    // Simulate loud panic siren or safety logging
    setTimeout(() => setSosActive(false), 5000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-teal-100 bg-white/95 backdrop-blur-md shadow-xs" id="awaaz-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Brand Logo & Slogan */}
        <div 
          className="flex cursor-pointer items-center py-1" 
          onClick={() => onNavigate('landing')}
          id="brand-section"
        >
          <img src="/logo.png" alt="Awaaz Logo" className="h-[52px] w-auto hover:scale-105 transition-all duration-300" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Quick SOS Trigger */}
          <button
            onClick={triggerSos}
            className={`flex items-center space-x-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all sm:px-4 sm:py-2 ${
              sosActive 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 border border-red-200'
            }`}
            id="quick-sos-btn"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden xs:inline">{t("QUICK SOS")}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative" id="lang-selector">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex h-9 items-center space-x-1 rounded-xl border border-teal-100 bg-teal-50/50 px-2.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
            >
              <Languages className="h-4 w-4 text-teal-700" />
              <span>{LANGUAGES.find(l => l.code === currentLanguage)?.nativeName || "English"}</span>
            </button>
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-48 max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-teal-50 transition-colors ${
                      currentLanguage === lang.code ? 'bg-teal-50 text-teal-900' : 'text-gray-700'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Switcher Button */}
          <div className="relative flex items-center space-x-2" id="role-switcher-container">
            <button
              onClick={() => {
                const nextRole = activeUser.role === 'citizen' ? 'volunteer' : activeUser.role === 'volunteer' ? 'admin' : 'citizen';
                if (nextRole === 'citizen') {
                  setRole('citizen');
                  onNavigate('home');
                } else if (nextRole === 'volunteer') {
                  if (activeUser.id !== 'user-default' && activeUser.role === 'volunteer') {
                    setRole('volunteer');
                    onNavigate('volunteer');
                  } else {
                    onNavigate('auth', { role: 'volunteer' });
                  }
                } else if (nextRole === 'admin') {
                  if (activeUser.id !== 'user-default' && activeUser.role === 'admin') {
                    setRole('admin');
                    onNavigate('admin');
                  } else {
                    onNavigate('auth', { role: 'admin' });
                  }
                }
              }}
              className="flex h-9 items-center space-x-1.5 rounded-xl bg-teal-800 px-3 text-xs font-semibold text-white hover:bg-teal-950 active:scale-95"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">
                {activeUser.role === 'citizen' ? t('Citizen') : activeUser.role === 'volunteer' ? t('Volunteer') : t('Admin')}
              </span>
            </button>

            {/* Logout button for authenticated sessions */}
            {activeUser.id !== 'user-default' && (
              <button
                onClick={onLogout}
                className="flex h-9 items-center justify-center rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 px-3 text-xs font-bold active:scale-95 transition-all"
                title="Sign Out Session"
              >
                <LogOut className="h-4 w-4 mr-1 sm:mr-0 md:mr-1" />
                <span className="hidden md:inline">{t('Sign Out')}</span>
              </button>
            )}
          </div>

        </div>

      </div>

                  {/* SOS Alert Modal/Toast */}
      {sosActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="relative overflow-hidden bg-[#FDFBF7] border-2 border-red-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-300">
            {/* Elegant Red Border accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-red-600" />

            {/* Header Content */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-50 p-2 rounded-xl text-red-600 border border-red-100 shrink-0">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-base font-bold text-red-800 uppercase tracking-wide">
                  {t('QUICK SOS ACTIVE')}
                </h2>
                <p className="text-[10px] text-gray-500 font-sans tracking-wide">
                  {t('Emergency protocols initiated')}
                </p>
              </div>
            </div>

            {/* Simulated steps */}
            <div className="space-y-2.5 bg-[#F9F6F0] border border-[#E8E2D6] rounded-xl p-4 mb-4 text-xs text-gray-700">
              <div className="flex items-start space-x-2">
                <span className="text-red-600 font-bold">•</span>
                <p>{t('Silent alert sent to Panchayat Volunteers')}</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-red-600 font-bold">•</span>
                <p>{t('Mock location dispatched to trusted circle')}</p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-[#F9F6F0] border border-[#E8E2D6] rounded-lg p-2 text-center">
                <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">{t('GPS Link')}</span>
                <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">{t('Active')}</span>
              </div>
              <div className="bg-[#F9F6F0] border border-[#E8E2D6] rounded-lg p-2 text-center">
                <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">{t('Audio')}</span>
                <span className="text-red-600 text-[10px] font-bold uppercase tracking-wider animate-pulse">{t('Rec')}</span>
              </div>
              <div className="bg-[#F9F6F0] border border-[#E8E2D6] rounded-lg p-2 text-center">
                <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">{t('Contacts')}</span>
                <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider">{t('Alerted')}</span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setSosActive(false)}
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 active:scale-95 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-all shadow-sm"
            >
              {t('Cancel Distress Alert')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
export default Header;
