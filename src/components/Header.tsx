import React, { useState } from 'react';
import { LANGUAGES } from '../data/languages';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode, UserProfile } from '../types';
import { Shield, Languages, UserCheck, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { AwaazLogo } from './AwaazLogo';
import { useTranslation } from '../contexts/TranslationContext';

interface HeaderProps {
  setLanguage: (lang: LanguageCode) => void;
  activeUser: UserProfile;
  setRole: (role: UserProfile['role']) => void;
  onNavigate: (route: string, params?: Record<string, string>) => void;
  currentRoute: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  setLanguage,
  activeUser,
  setRole,
  onNavigate,
  currentRoute,
  onLogout
}) => {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const { t, currentLanguage } = useTranslation();

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

                  {/* SOS Alert Full-Screen Modal */}
      {sosActive && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-red-950 animate-in fade-in duration-300">
          
          {/* Pulsing ring behind icon */}
          <div className="relative mb-8">
            <span className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping scale-150" />
            <div className="relative bg-red-700 border-4 border-red-400 rounded-full p-6 shadow-2xl">
              <AlertTriangle className="h-14 w-14 text-white animate-bounce" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-extrabold text-white uppercase tracking-widest mb-2 text-center drop-shadow-lg">
            {t('SOS ACTIVE')}
          </h1>
          <p className="text-red-200 text-sm font-semibold uppercase tracking-wider mb-10 text-center">
            {t('Emergency protocols initiated')}
          </p>

          {/* Action log */}
          <div className="w-full max-w-sm mx-auto bg-red-950/60 border border-red-700/50 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex items-center space-x-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <p className="text-sm text-red-100 font-medium">{t('Silent alert sent to Panchayat Volunteers')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <p className="text-sm text-red-100 font-medium">{t('Mock location dispatched to trusted circle')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <p className="text-sm text-red-100 font-medium">{t('Audio recording initiated')}</p>
            </div>
          </div>

          {/* Status grid */}
          <div className="flex items-center space-x-4 mb-10">
            <div className="bg-red-950/50 border border-red-700/40 rounded-xl px-5 py-3 text-center min-w-[90px]">
              <span className="block text-[10px] text-red-300 uppercase font-bold tracking-wider mb-1">{t('GPS Link')}</span>
              <span className="text-emerald-400 text-sm font-extrabold uppercase tracking-wider">{t('Active')}</span>
            </div>
            <div className="bg-red-950/50 border border-red-700/40 rounded-xl px-5 py-3 text-center min-w-[90px]">
              <span className="block text-[10px] text-red-300 uppercase font-bold tracking-wider mb-1">{t('Audio')}</span>
              <span className="text-red-300 text-sm font-extrabold uppercase tracking-wider animate-pulse">{t('Rec')}</span>
            </div>
            <div className="bg-red-950/50 border border-red-700/40 rounded-xl px-5 py-3 text-center min-w-[90px]">
              <span className="block text-[10px] text-red-300 uppercase font-bold tracking-wider mb-1">{t('Contacts')}</span>
              <span className="text-amber-400 text-sm font-extrabold uppercase tracking-wider">{t('Alerted')}</span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setSosActive(false)}
            className="bg-white text-red-800 font-extrabold text-sm px-12 py-4 rounded-2xl shadow-2xl uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all duration-200 border-2 border-red-200"
          >
            {t('Cancel Distress Alert')}
          </button>

          <p className="mt-6 text-red-400 text-[11px] font-semibold uppercase tracking-wider text-center">
            {t('Stay Safe • Help is on the way')}
          </p>
        </div>
      )}
    </header>
  );
};
export default Header;
