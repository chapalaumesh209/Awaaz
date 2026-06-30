import React, { useState, useEffect } from 'react';
import { VolunteerCase, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { generateAssistantReply } from '../lib/aiService';
import { 
  ArrowLeft, CheckCircle, MessageSquare, Bot, Sparkles, Send, 
  Calendar, MapPin, User, Save, RefreshCw, Compass 
} from 'lucide-react';

interface VolunteerCaseDetailViewProps {
  currentLanguage: LanguageCode;
  caseId: string;
  onNavigate: (route: string) => void;
}

export const VolunteerCaseDetailView: React.FC<VolunteerCaseDetailViewProps> = ({
  currentLanguage,
  caseId,
  onNavigate
}) => {
  const [caseObj, setCaseObj] = useState<VolunteerCase | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Chat message input states
  const [chatInput, setChatInput] = useState('');
  
  // AI Copilot recommendations states
  const [aiCopilotText, setAiCopilotText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  const loadCaseDetails = async () => {
    setLoading(true);
    try {
      const casesList = await dbClient.getVolunteerCases();
      const match = casesList.find(c => c.id === caseId);
      if (match) {
        setCaseObj(match);
        setNotes(match.notes);
        loadAiCopilot(match);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Triggers Gemini helper to analyze case notes & generate field guidelines
  const loadAiCopilot = async (cs: VolunteerCase) => {
    setAiLoading(true);
    setAiCopilotText('');
    try {
      const prompt = `You are an AI admin copilot assisting a local Panchayat volunteer. 
Analyze this citizen situation: "${cs.notes}". Primary language: '${cs.primaryLanguage}'. 
Output exactly: 
1. 3 Recommended welfare schemes.
2. 3 Specific document field audits required.
Keep it extremely compact, helpful, and under 100 words.`;
      
      const reply = await generateAssistantReply(prompt, [], 'en');
      setAiCopilotText(reply);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Status transitions
  const handleStatusChange = async (newStatus: 'new' | 'assigned' | 'in_investigation' | 'resolved' | 'closed') => {
    if (!caseObj) return;
    try {
      const updated = await dbClient.updateCase(caseObj.id, { status: newStatus });
      setCaseObj(updated);
      alert(`💼 Case status transitioned to: ${newStatus.toUpperCase()}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Save notes updates
  const handleSaveNotes = async () => {
    if (!caseObj) return;
    try {
      const updated = await dbClient.updateCase(caseObj.id, { notes });
      setCaseObj(updated);
      alert("✅ Case notes saved securely in administrative tracking systems.");
    } catch (e) {
      console.error(e);
    }
  };

  // Submit mock chat message
  const handleSendChat = async () => {
    if (!chatInput.trim() || !caseObj) return;
    
    const updatedHistory = [
      ...caseObj.chatHistory,
      { sender: 'volunteer', text: chatInput, timestamp: 'Just now' }
    ];

    try {
      const updated = await dbClient.updateCase(caseObj.id, { chatHistory: updatedHistory });
      setCaseObj(updated);
      setChatInput('');
    } catch (e) {
      console.error(e);
    }
  };

  if (!caseObj) {
    return (
      <div className="py-12 px-4 text-center">
        <span className="text-gray-400">Loading case details...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8" id="case-detail-view">
      
      {/* Back button */}
      <button
        onClick={() => onNavigate('volunteer')}
        className="flex items-center space-x-1 text-xs font-bold text-teal-700 hover:text-teal-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Queue</span>
      </button>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Citizen profile details and Notes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Case details Card */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-mono tracking-wider text-teal-700 font-extrabold bg-teal-50 px-2.5 py-1 rounded-md">
                Case ID: {caseObj.id}
              </span>
              <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-md">
                {caseObj.priority} priority
              </span>
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-sans text-lg font-bold text-gray-900">{caseObj.citizenName}</h3>
                <span className="block text-[10px] text-gray-400 font-medium">Primary Language: <span className="text-teal-700 uppercase font-bold">{caseObj.primaryLanguage}</span></span>
              </div>
            </div>

            {/* Status change actions */}
            <div className="border-t border-b border-gray-100 py-4 my-4">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Transition Case Status</span>
              <div className="flex flex-wrap gap-2">
                {(['assigned', 'in_investigation', 'resolved', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      caseObj.status === st 
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs' 
                        : 'bg-white border-gray-100 text-gray-600 hover:bg-teal-50/50'
                    }`}
                  >
                    Mark {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Citizen Complaint/Request Narrative</span>
              <p className="text-xs text-gray-700 leading-relaxed font-semibold bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100">
                {caseObj.notes}
              </p>
            </div>
          </div>

          {/* Chat log & history */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <h4 className="font-sans text-base font-bold text-gray-900 mb-4 flex items-center space-x-1.5">
              <MessageSquare className="h-5 w-5 text-teal-700" />
              <span>Inter-Panchayat Communication thread</span>
            </h4>

            <div className="space-y-4 max-h-[220px] overflow-y-auto mb-4 bg-gray-50/30 p-3 rounded-2xl border border-gray-100">
              {caseObj.chatHistory.map((ch, i) => {
                const isAi = ch.sender === 'ai';
                const isCitizen = ch.sender === 'citizen';
                return (
                  <div key={i} className={`flex ${isCitizen ? 'justify-start' : isAi ? 'justify-center' : 'justify-end'}`}>
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                      isAi 
                        ? 'bg-amber-50 text-amber-900 border border-amber-100/50 text-center font-bold font-mono text-[9px]' 
                        : isCitizen 
                        ? 'bg-white border border-teal-100/50 text-gray-700 font-semibold' 
                        : 'bg-teal-600 text-white font-bold'
                    }`}>
                      <span>{ch.text}</span>
                      <span className="block text-[8px] text-gray-400 mt-1 font-mono text-right">{ch.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Log a call or type message to citizen..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
              <button
                onClick={handleSendChat}
                className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Internal administrative case notes */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs space-y-4">
            <h4 className="font-sans text-base font-bold text-gray-900">Internal Audit Field Notes</h4>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
            <button
              onClick={handleSaveNotes}
              className="px-5 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save Internal Notes</span>
            </button>
          </div>

        </div>

        {/* Right Column: AI administrative copilot recommendations */}
        <div className="space-y-6">
          <div className="bg-teal-950 text-white rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-teal-900 pb-3">
              <Bot className="h-5 w-5 text-teal-400 animate-pulse" />
              <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">AI Case Companion</span>
            </div>

            {aiLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-teal-900 rounded-sm w-full" />
                <div className="h-3 bg-teal-900 rounded-sm w-5/6" />
                <div className="h-3 bg-teal-900 rounded-sm w-2/3" />
              </div>
            ) : (
              <p className="text-xs text-teal-100/80 leading-relaxed font-mono whitespace-pre-line">
                {aiCopilotText}
              </p>
            )}
          </div>

          {/* Local camp indicator map */}
          <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-1.5">
              <Compass className="h-4.5 w-4.5 text-teal-700 animate-spin" />
              <h4 className="font-sans text-sm font-bold text-gray-900">Coordinate with Camps</h4>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              If this case requires on-spot Tahsildar identity clearance, coordinate with the next live camp session in Moinabad Block.
            </p>
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl">
              <span className="block text-xs font-bold text-gray-800">Enrollment Camp #49</span>
              <span className="block text-[9px] text-gray-400 font-medium mt-1">Date: Monday 10:00 AM • High School Ground</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default VolunteerCaseDetailView;
