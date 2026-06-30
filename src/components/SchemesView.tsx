import React, { useState, useEffect } from 'react';
import { SCHEMES, evaluateEligibility } from '../data/schemes';
import { CitizenProfile, Scheme, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { generateVoiceEligibilityEvaluation } from '../lib/aiService';
import { 
  Search, SlidersHorizontal, CheckCircle, AlertTriangle, ArrowRight, 
  BookOpen, Mic, Volume2, Square, Sparkles, RefreshCw, X, Check, HelpCircle 
} from 'lucide-react';

interface SchemesViewProps {
  currentLanguage: LanguageCode;
  onNavigate: (route: string, params?: Record<string, string>) => void;
}

export const SchemesView: React.FC<SchemesViewProps> = ({ currentLanguage, onNavigate }) => {
  const [activeProfile, setActiveProfile] = useState<CitizenProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Voice checker states
  const [showVoiceCheck, setShowVoiceCheck] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(8).fill(''));
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  const voiceQuestions = [
    "What is your full name?",
    "What is your age in years?",
    "What is your gender? (e.g. Female, Male, or Other)",
    "What is your primary occupation?",
    "What is your estimated annual household income?",
    "Which social category or caste do you belong to? (General, OBC, SC, or ST)",
    "What is your current district/location in Telangana?",
    "Do you or anyone in your household have a physical or visual disability?"
  ];

  // Prepopulated mock voice inputs based on typical profiles to make the simulated voice input feel highly realistic and seamless
  const mockVoiceTranscripts = [
    "Ramesh Kumar",
    "42 years old",
    "Male",
    "Agriculture tenant farmer",
    "48000 rupees per year",
    "SC category",
    "Moinabad block Rangareddy",
    "No, no disability"
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const profile = await dbClient.getProfile();
    setActiveProfile(profile);
  };

  const handleStartVoiceCheck = () => {
    setShowVoiceCheck(true);
    setCurrentQuestionIdx(0);
    setAnswers(Array(8).fill(''));
    setEvaluationResult(null);
  };

  const handleRecordVoice = () => {
    setIsRecording(true);
    // Simulate speech-to-text writing a realistic transcript after 1.5s
    setTimeout(() => {
      const updated = [...answers];
      updated[currentQuestionIdx] = mockVoiceTranscripts[currentQuestionIdx];
      setAnswers(updated);
      setIsRecording(false);
    }, 1800);
  };

  const handleNextQuestion = () => {
    if (!answers[currentQuestionIdx].trim()) {
      alert("Please speak or write your answer to proceed.");
      return;
    }
    if (currentQuestionIdx < 7) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      handleEvaluateVoiceAnswers();
    }
  };

  const handleEvaluateVoiceAnswers = async () => {
    setVoiceLoading(true);
    try {
      const response = await generateVoiceEligibilityEvaluation(answers, currentLanguage);
      setEvaluationResult(response);
    } catch (err) {
      console.error(err);
    } finally {
      setVoiceLoading(false);
    }
  };

  const categories = ['All', 'Business', 'Agriculture', 'Healthcare', 'Housing', 'Scholarship', 'Pension'];

  const filteredSchemes = SCHEMES.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 bg-[#FDFBF7] text-[#1A2E2A]" id="schemes-view">
      
      {/* View Header with Editorial Aesthetic */}
      <div className="border-b-2 border-[#E8E2D6] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold text-teal-600 uppercase tracking-widest font-sans mb-1">
            Empowerment • Social Welfare • Verification
          </span>
          <h2 className="font-serif text-4xl font-bold tracking-tight text-teal-900 leading-tight">
            Government Schemes & Entitlements
          </h2>
          <p className="text-sm text-gray-600 font-serif italic mt-1.5 max-w-2xl">
            Browse list of seeded schemes. Eligibility calculations are evaluated instantly against your active profile.
          </p>
        </div>
        
        {/* Voice Checker Action Trigger */}
        <button
          onClick={handleStartVoiceCheck}
          className="bg-teal-900 hover:bg-teal-950 text-white px-5 py-3 rounded-2xl flex items-center space-x-2.5 text-xs font-bold font-sans shadow-md border border-teal-800 transition-all active:scale-95 shrink-0"
        >
          <Mic className="h-4.5 w-4.5 text-teal-300 animate-pulse" />
          <span>AWAAZ AI 8-Question Voice Checker</span>
        </button>
      </div>

      {/* Voice Eligibility Checker Section */}
      {showVoiceCheck && (
        <div className="bg-teal-950 text-white rounded-[32px] p-6 mb-8 border border-teal-800 relative shadow-lg">
          <button 
            onClick={() => setShowVoiceCheck(false)}
            className="absolute top-5 right-5 text-teal-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {!evaluationResult ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-teal-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-teal-300">AWAAZ Interactive AI Scheme Audit</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-teal-300 font-mono">
                  <span>Question {currentQuestionIdx + 1} of 8</span>
                  <span>{Math.round(((currentQuestionIdx + 1) / 8) * 100)}% Answered</span>
                </div>
                <div className="w-full bg-teal-900 h-1.5 rounded-full">
                  <div className="bg-teal-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIdx + 1) / 8) * 100}%` }} />
                </div>
              </div>

              {/* Active question */}
              <div className="space-y-4">
                <h3 className="font-serif text-2xl font-bold text-white leading-snug">
                  "{voiceQuestions[currentQuestionIdx]}"
                </h3>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleRecordVoice}
                    disabled={isRecording || voiceLoading}
                    className={`px-5 py-3 rounded-xl text-xs font-bold font-sans flex items-center justify-center space-x-2 transition-all active:scale-95 ${
                      isRecording 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-teal-800 hover:bg-teal-700 text-teal-100'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4 fill-white animate-spin" />
                        <span>Listening... Speak Now</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        <span>Simulate Voice Response</span>
                      </>
                    )}
                  </button>

                  <input
                    type="text"
                    value={answers[currentQuestionIdx]}
                    onChange={(e) => {
                      const updated = [...answers];
                      updated[currentQuestionIdx] = e.target.value;
                      setAnswers(updated);
                    }}
                    placeholder="Speak using the button or type your answer here..."
                    className="flex-1 bg-teal-900/50 border border-teal-800 rounded-xl px-4 py-3 text-xs text-white placeholder-teal-300/50 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                  />
                </div>

                {isRecording && (
                  <div className="flex items-center space-x-1.5 text-[10px] text-teal-300 animate-pulse">
                    <Volume2 className="h-4 w-4 text-teal-400" />
                    <span>Capturing dynamic voice frequencies and transcribing in Real Time...</span>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center border-t border-teal-900 pt-4">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                  className="px-4 py-2 border border-teal-800 text-teal-300 hover:text-white rounded-lg text-xs font-bold font-sans disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={voiceLoading}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-teal-950 rounded-lg text-xs font-extrabold font-sans flex items-center space-x-1"
                >
                  {voiceLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Evaluating Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>{currentQuestionIdx === 7 ? "Submit & Check Eligibility" : "Next Question"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-teal-900 pb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  <h3 className="font-serif text-xl font-bold">Your AI Eligibility Evaluation Report</h3>
                </div>
                <button
                  onClick={handleStartVoiceCheck}
                  className="px-3.5 py-1.5 border border-teal-800 text-teal-300 hover:text-white rounded-lg text-[10px] font-bold font-mono uppercase flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Restart Check</span>
                </button>
              </div>

              <div className="bg-teal-900/40 border border-teal-800 rounded-2xl p-5 text-xs space-y-4 leading-relaxed font-sans text-teal-100">
                <p className="whitespace-pre-line text-xs font-medium">
                  {evaluationResult}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowVoiceCheck(false)}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-teal-950 font-extrabold text-xs rounded-xl transition-all"
                >
                  Continue Browsing Schemes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Category Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-10">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-teal-700/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes by name or department..."
            className="w-full bg-white border border-[#E8E2D6] rounded-2xl pl-11 pr-4 py-3 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full shrink-0 scrollbar-none">
          <SlidersHorizontal className="h-4 w-4 text-teal-800/50 mr-1 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-serif font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                  : 'bg-white border-[#E8E2D6] text-gray-700 hover:bg-[#F3F0E9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Schemes Grid with high contrast, editorial look */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="schemes-grid">
        {filteredSchemes.map((scheme) => {
          // Calculate eligibility dynamically!
          let eligible = false;
          let score = 0;
          let reasoning = '';
          
          if (activeProfile) {
            const eligibility = evaluateEligibility(scheme, activeProfile);
            eligible = eligibility.matched;
            score = eligibility.score;
            reasoning = eligibility.reasoning;
          }

          return (
            <div
              key={scheme.id}
              onClick={() => onNavigate('scheme-detail', { id: scheme.id })}
              className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs hover:border-teal-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-teal-800 font-extrabold bg-[#ECFDF5] px-2.5 py-1 rounded-md border border-teal-100">
                    {scheme.category}
                  </span>
                  
                  {/* Dynamic Eligibility Tag */}
                  {eligible ? (
                    <span className="flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-[#ECFDF5] border border-emerald-200 px-3 py-1 rounded-full">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{score}% Qualified</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs font-bold text-amber-800 bg-[#FFFBEB] border border-amber-200 px-3 py-1 rounded-full">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{score}% Match</span>
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-xl font-bold text-teal-950 group-hover:text-teal-700 transition-colors leading-snug">
                  {scheme.name}
                </h3>
                <span className="text-[10px] text-gray-500 font-medium block mt-1 font-sans uppercase tracking-wider">{scheme.department}</span>

                <p className="text-gray-600 text-xs mt-3.5 line-clamp-2 leading-relaxed font-serif italic">
                  {currentLanguage === 'hi' && scheme.descriptionLocal ? scheme.descriptionLocal : scheme.description}
                </p>

                {/* Benefits highlight */}
                <div className="mt-4 bg-[#F3F0E9]/60 rounded-2xl p-4 border border-[#E8E2D6]/70">
                  <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">Estimated Benefits</span>
                  <p className="text-xs text-teal-950 font-bold mt-1 line-clamp-1 font-serif italic">
                    {currentLanguage === 'hi' && scheme.benefitsLocal ? scheme.benefitsLocal : scheme.benefits}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#E8E2D6] mt-5 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-serif">Required docs: <span className="font-semibold text-teal-900 uppercase">{scheme.requiredDocuments.join(', ').replace('_', ' ')}</span></span>
                <button
                  type="button"
                  className="flex items-center space-x-1 text-xs font-serif font-bold text-teal-700 group-hover:translate-x-1 transition-transform"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>
          );
        })}

        {filteredSchemes.length === 0 && (
          <div className="col-span-full bg-white rounded-[24px] border border-dashed border-[#E8E2D6] py-16 px-4 text-center">
            <BookOpen className="h-12 w-12 text-teal-800/40 mx-auto mb-4" />
            <h4 className="font-serif text-lg font-bold text-teal-950">No matching schemes found</h4>
            <p className="text-xs text-gray-500 font-serif italic mt-1.5">Try modifying your search queries or category filters.</p>
          </div>
        )}
      </div>

    </div>
  );
};
export default SchemesView;
