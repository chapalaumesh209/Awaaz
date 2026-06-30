import React, { useState, useEffect } from 'react';
import { GramSabhaMeeting, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { 
  Landmark, Calendar, MapPin, Scale, Award, 
  HelpCircle, Check, X, ShieldCheck, Trophy, LandmarkIcon 
} from 'lucide-react';

interface CivicVoiceViewProps {
  currentLanguage: LanguageCode;
}

export const CivicVoiceView: React.FC<CivicVoiceViewProps> = ({ currentLanguage }) => {
  const [meetings, setMeetings] = useState<GramSabhaMeeting[]>([]);
  const [gameStep, setGameStep] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    const list = await dbClient.getGramSabhaMeetings();
    setMeetings(list);
  };

  // Panchayat budget figures
  const budgetAllocation = [
    { category: 'Sewage & Drainage Systems', allocated: 450000, spent: 390000, color: 'bg-teal-600' },
    { category: 'Village Primary Schools', allocated: 350000, spent: 345000, color: 'bg-emerald-600' },
    { category: 'Women Healthcare & ANM Clinics', allocated: 250000, spent: 180000, color: 'bg-teal-800' },
    { category: 'Solar Street Lights', allocated: 150000, spent: 148000, color: 'bg-amber-600' }
  ];

  // Panchayat Learning Game Questions
  const gameQuestions = [
    {
      q: "Under the MNREGA rural employment guarantee act, how many days of guaranteed physical work is a rural household entitled to annually?",
      options: [
        "50 Days of work",
        "100 Days of guaranteed work",
        "150 Days of work",
        "No limit"
      ],
      correctIdx: 1,
      explanation: "MNREGA legal codes guarantee exactly 100 days of manual wage employment per financial year to registered adult household members."
    },
    {
      q: "Who is authorized to call and chair the local Gram Sabha assembly to audit village developmental budgets?",
      options: [
        "District Police Superintendent",
        "The Panchayat Sarpanch or Secretary",
        "Any private land contractor",
        "Only the MLA"
      ],
      correctIdx: 1,
      explanation: "The village Panchayat Sarpanch or authorized administrative Executive Secretary is legally responsible for scheduling and chairing Gram Sabhas."
    },
    {
      q: "What is the maximum yearly income eligibility cap for a family to claim BPL (Below Poverty Line) Ration card entitlements in most Indian states?",
      options: [
        "₹1,20,000 per year",
        "₹5,00,000 per year",
        "No income cap",
        "₹10,000 per year"
      ],
      correctIdx: 0,
      explanation: "Typically, family incomes must stay under ₹1.2 Lakhs (with state variations) to legally claim BPL subsidized grains."
    }
  ];

  const handleAnswerClick = (idx: number) => {
    if (answered) return;
    setSelectedAnswerIdx(idx);
    setAnswered(true);
    if (idx === gameQuestions[gameStep].correctIdx) {
      setGameScore(gameScore + 10);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswerIdx(null);
    setAnswered(false);
    if (gameStep < gameQuestions.length - 1) {
      setGameStep(gameStep + 1);
    } else {
      // Loop or restart
      setGameStep(0);
      setGameScore(0);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="civic-voice-view">
      
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-4 mb-8">
        <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
          Civic Voice & Gram Sabha Hub
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Review Gram Panchayat budgets, RSVP for upcoming assemblies, or play our Panchayat rights learning board game!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Assemblies and Budgets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upcoming Gram Sabhas list */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-teal-700" />
              <h3 className="font-sans text-base font-bold text-gray-900">Gram Sabha Schedules</h3>
            </div>

            <div className="space-y-4">
              {meetings.map((m) => (
                <div key={m.id} className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-sans text-sm font-bold text-teal-950 leading-snug">{m.title}</h4>
                    <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2 py-1 rounded-md shrink-0">{m.panchayatName}</span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    <span className="font-bold text-gray-800">Agenda:</span> {m.agenda}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] font-semibold text-gray-500 pt-1">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>{m.date}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{m.location}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Landmark className="h-3.5 w-3.5 text-gray-400" />
                      <span>Budget: {m.budgetAllocated}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panchayat budget visual bar charts */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center space-x-2 mb-4">
              <LandmarkIcon className="h-5 w-5 text-teal-700" />
              <h3 className="font-sans text-base font-bold text-gray-900">Panchayat Fund Allocations (FY 2026)</h3>
            </div>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Live audit trackers showing how Gram Panchayat funds are split across development segments.
            </p>

            <div className="space-y-4">
              {budgetAllocation.map((bud, i) => {
                const ratio = Math.round((bud.spent / bud.allocated) * 100);
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>{bud.category}</span>
                      <span className="font-bold">₹{bud.spent.toLocaleString()} / ₹{bud.allocated.toLocaleString()} ({ratio}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`${bud.color} h-full rounded-full`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Civic Board Game */}
        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center space-x-1.5">
                <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
                <h3 className="font-sans text-sm font-bold text-gray-900">Panchayat Wisdom Game</h3>
              </div>
              <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
                Score: {gameScore}
              </span>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
              Test your knowledge of standard citizens rights and earn digital honor titles!
            </p>

            {/* MCQ Card */}
            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 space-y-4">
              <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">Question {gameStep + 1} of 3</span>
              <p className="text-xs font-bold text-gray-800 leading-relaxed">
                {gameQuestions[gameStep].q}
              </p>

              <div className="space-y-2">
                {gameQuestions[gameStep].options.map((opt, idx) => {
                  let btnStyle = 'bg-white border-gray-100 text-gray-700 hover:border-teal-300';
                  if (answered) {
                    if (idx === gameQuestions[gameStep].correctIdx) {
                      btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold';
                    } else if (idx === selectedAnswerIdx) {
                      btnStyle = 'bg-red-50 border-red-200 text-red-950';
                    } else {
                      btnStyle = 'bg-white border-gray-100 text-gray-400 opacity-60';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => handleAnswerClick(idx)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {answered && idx === gameQuestions[gameStep].correctIdx && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation display */}
              {answered && (
                <div className="mt-4 bg-teal-50/50 p-3 rounded-xl border border-teal-100/50 text-[10px] text-teal-900 leading-relaxed font-semibold">
                  {gameQuestions[gameStep].explanation}
                </div>
              )}
            </div>
          </div>

          {answered && (
            <button
              onClick={handleNextQuestion}
              className="mt-6 w-full py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1"
            >
              <span>{gameStep === gameQuestions.length - 1 ? 'Restart Game' : 'Next Question'}</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
export default CivicVoiceView;
