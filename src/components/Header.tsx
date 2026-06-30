import React, { useState } from 'react';
import { LANGUAGES } from '../data/languages';
import { TRANSLATIONS } from '../data/translations';
import { LanguageCode, UserProfile } from '../types';
import { Shield, Languages, UserCheck, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  activeUser: UserProfile;
  setRole: (role: UserProfile['role']) => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  setLanguage,
  activeUser,
  setRole,
  onNavigate,
  currentRoute
}) => {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];

  const triggerSos = () => {
    setSosActive(true);
    // Simulate loud panic siren or safety logging
    alert("⚠️ QUICK SOS TRIGGERED! \n\n1. Simulating silent notification to local Panchayat Volunteers...\n2. Simulating SMS alert to trusted contacts with current mock GPS coordinates...\n3. Safety log hs-sos-493 registered.");
    setTimeout(() => setSosActive(false), 5000);
  };

  const triggerQuickExit = () => {
    // Instantly navigate to a neutral, safe page like Google search or weather
    window.location.href = "https://www.google.com/search?q=india+weather";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-teal-100 bg-white/95 backdrop-blur-md shadow-xs" id="awaaz-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Brand Logo & Slogan */}
        <div 
          className="flex cursor-pointer items-center space-x-3" 
          onClick={() => onNavigate('landing')}
          id="brand-section"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs font-serif font-extrabold text-2xl italic hover:scale-105 transition-all">
            A
          </div>
          <div>
            <span className="block font-serif text-lg font-bold tracking-tight text-teal-900 sm:text-xl leading-tight">
              {t.brandName || "AWAAZ  आवाज़"}
            </span>
            <span className="block text-[10px] font-bold tracking-widest text-teal-600 uppercase">
              {t.slogan || "Voice, Safety & Social Access"}
            </span>
          </div>
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
            <span className="hidden xs:inline">{t.quickSOS || "QUICK SOS"}</span>
          </button>

          {/* Quick Exit Trigger */}
          <button
            onClick={triggerQuickExit}
            className="flex items-center space-x-1 rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 sm:px-4 sm:py-2"
            id="quick-exit-btn"
            title="Instantly exit to a safe tab"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">{t.quickExit || "QUICK EXIT"}</span>
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
          <div className="relative" id="role-switcher">
            <button
              onClick={() => {
                const nextRole = activeUser.role === 'citizen' ? 'volunteer' : activeUser.role === 'volunteer' ? 'admin' : 'citizen';
                setRole(nextRole);
                if (nextRole === 'citizen') {
                  onNavigate('home');
                } else if (nextRole === 'volunteer') {
                  onNavigate('volunteer');
                } else {
                  onNavigate('admin');
                }
              }}
              className="flex h-9 items-center space-x-1.5 rounded-xl bg-teal-800 px-3 text-xs font-semibold text-white hover:bg-teal-950 active:scale-95"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">
                {activeUser.role === 'citizen' ? 'Citizen' : activeUser.role === 'volunteer' ? 'Volunteer' : 'Admin'}
              </span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
export default Header;
