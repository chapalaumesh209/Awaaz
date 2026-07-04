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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative overflow-hidden bg-slate-950 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.35)] rounded-3xl p-8 max-w-lg w-full animate-in zoom-in-95 duration-300">
            {/* Warning Glow Effect in background */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-600/20 rounded-full blur-3xl" />

            {/* Glowing Red Header Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse" />

            {/* Header Content */}
            <div className="flex flex-col items-center text-center mb-6">
              {/* Pulsing Radar Ring Icon */}
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-red-500/40 animate-pulse" />
                <div className="relative bg-gradient-to-br from-red-600 to-orange-600 p-4 rounded-full text-white shadow-lg shadow-red-500/30">
                  <AlertTriangle className="h-8 w-8 stroke-[2.5]" />
                </div>
              </div>
              
              <h2 className="text-2xl font-black tracking-wider text-red-500 uppercase font-sans animate-pulse">
                {t('QUICK SOS TRIGGERED!')}
              </h2>
              <p className="text-xs text-red-200/60 font-semibold tracking-widest uppercase mt-1">
                {t('Emergency Assistance Activated')}
              </p>
            </div>

            {/* Interactive progress steps with simulated animations */}
            <div className="space-y-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-6">
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-200/90 font-medium">
                  {t('Simulating silent notification to local Panchayat Volunteers...')}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-orange-200/90 font-medium">
                  {t('Simulating SMS alert to trusted contacts with current mock GPS coordinates...')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-3">
                <span className="text-slate-500 font-mono">LOG_ID: hs-sos-493</span>
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  {t('Transmitting')}
                </span>
              </div>
            </div>

            {/* Pulsing Status Badges Grid */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{t('GPS Link')}</span>
                <span className="text-emerald-400 text-xs font-black uppercase tracking-wider animate-pulse">{t('Active')}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{t('Audio Rec')}</span>
                <span className="text-red-400 text-xs font-black uppercase tracking-wider animate-pulse">{t('Recording')}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{t('Responders')}</span>
                <span className="text-orange-400 text-xs font-black uppercase tracking-wider">{t('Alerted')}</span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setSosActive(false)}
              className="w-full py-3.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 active:scale-95 text-white font-bold text-sm rounded-xl tracking-wider uppercase transition-all shadow-lg shadow-red-950/50"
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
