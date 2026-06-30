import React, { useState } from 'react';
import { dbClient } from '../lib/supabaseClient';
import { LanguageCode, UserProfile } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Shield, Mail, Lock, User, LogIn, ArrowRight, Check, AlertCircle } from 'lucide-react';

interface AuthViewProps {
  currentLanguage: LanguageCode;
  onAuthSuccess: (user: UserProfile) => void;
  onNavigateBack: () => void;
  initialRole?: UserProfile['role'];
}

export const AuthView: React.FC<AuthViewProps> = ({
  currentLanguage,
  onAuthSuccess,
  onNavigateBack,
  initialRole = 'citizen'
}) => {
  const [activeTab, setActiveTab] = useState<UserProfile['role']>(initialRole);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'citizen') {
        if (isRegister) {
          if (!name.trim()) throw new Error('Please enter your full name');
          const user = await dbClient.signUpWithEmail(email, password, name);
          onAuthSuccess(user);
        } else {
          const user = await dbClient.signInWithEmail(email, password);
          onAuthSuccess(user);
        }
      } else if (activeTab === 'volunteer') {
        const user = await dbClient.signInAsVolunteer(email, password);
        onAuthSuccess(user);
      } else if (activeTab === 'admin') {
        const user = await dbClient.signInAsAdmin(email, password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await dbClient.signInWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    const guestUser: UserProfile = {
      id: 'user-default',
      name: 'Guest Citizen',
      role: 'citizen',
      selectedLanguage: currentLanguage,
      consentGiven: false,
      createdAt: new Date().toISOString()
    };
    dbClient.setActiveUser(guestUser);
    onAuthSuccess(guestUser);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12 bg-radial from-teal-50/50 via-warm-white to-gray-50/20" id="auth-container">
      <div className="w-full max-w-md bg-white border border-teal-100 rounded-3xl p-6 sm:p-8 shadow-xl relative" id="auth-card">
        
        {/* Brand/Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md font-serif font-extrabold text-3xl italic mb-3">
            A
          </div>
          <h2 className="font-serif text-2xl font-extrabold text-teal-800">
            {t.brandName || "AWAAZ आवाज"}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Secure Role-Based Authentication Gateway
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('citizen');
              setIsRegister(false);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'citizen'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Citizen
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('volunteer');
              setIsRegister(false);
              setError('');
              setEmail('volunteer@awaaz.org');
              setPassword('volunteer123');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'volunteer'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Volunteer
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setIsRegister(false);
              setError('');
              setEmail('admin@awaaz.org');
              setPassword('admin123');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Admin Hub
          </button>
        </div>

        {/* Role-Specific Credential Notice Cards */}
        {activeTab === 'volunteer' && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl text-xs mb-5 flex items-start space-x-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Authorized Volunteer Portal</span>
              <p className="mt-0.5 text-gray-600 leading-relaxed">
                Use the pre-configured dummy credential to access assignments:
              </p>
              <div className="mt-1.5 font-mono text-[11px] bg-white/60 p-1.5 rounded-md border border-amber-100">
                <div>Email: <span className="font-bold text-amber-800">volunteer@awaaz.org</span></div>
                <div>Pass: <span className="font-bold text-amber-800">volunteer123</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="p-3 bg-indigo-50/80 border border-indigo-200 text-indigo-900 rounded-2xl text-xs mb-5 flex items-start space-x-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Administrative Control Hub</span>
              <p className="mt-0.5 text-gray-600 leading-relaxed">
                Log in with the pre-configured admin workspace credential:
              </p>
              <div className="mt-1.5 font-mono text-[11px] bg-white/60 p-1.5 rounded-md border border-indigo-100">
                <div>Email: <span className="font-bold text-indigo-800">admin@awaaz.org</span></div>
                <div>Pass: <span className="font-bold text-indigo-800">admin123</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Form Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold mb-5 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name field (Register only) */}
          {activeTab === 'citizen' && isRegister && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-bold text-gray-500 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 block">
              {activeTab === 'citizen' ? 'Email Address' : 'Sign-In Username'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                placeholder={activeTab === 'citizen' ? 'you@example.com' : 'credentials email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-xs transition-all active:scale-98 flex items-center justify-center space-x-2 ${
              activeTab === 'citizen'
                ? 'bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/10'
                : activeTab === 'volunteer'
                ? 'bg-teal-900 hover:bg-teal-950 shadow-md shadow-teal-900/10'
                : 'bg-gray-800 hover:bg-gray-900 shadow-md shadow-gray-800/10'
            }`}
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Register & Sign In' : 'Log In'}</span>
            <LogIn className="h-4 w-4" />
          </button>

          {/* Auth Toggles (Citizen only) */}
          {activeTab === 'citizen' && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-xs text-teal-600 font-bold hover:underline"
              >
                {isRegister ? 'Already have a profile? Sign In' : 'New to AWAAZ? Register Profile'}
              </button>
            </div>
          )}

          {/* Google SSO / Guest Controls for Citizens */}
          {activeTab === 'citizen' && (
            <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 border border-gray-200 rounded-xl text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
              >
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGuestContinue}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold text-[11px] rounded-xl transition-all"
              >
                Browse as Guest
              </button>
            </div>
          )}

        </form>

        <button
          onClick={onNavigateBack}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Return to Landing Page
        </button>

      </div>
    </div>
  );
};
export default AuthView;
