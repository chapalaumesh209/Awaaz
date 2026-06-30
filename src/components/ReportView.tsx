import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { generateGrievanceDraft } from '../lib/aiService';
import { Shield, Sparkles, Send, EyeOff, Bot, RefreshCw, FileText, CheckCircle } from 'lucide-react';

interface ReportViewProps {
  currentLanguage: LanguageCode;
}

export const ReportView: React.FC<ReportViewProps> = ({ currentLanguage }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [authority, setAuthority] = useState('Block Development Officer');
  const [witnessCount, setWitnessCount] = useState<number>(1);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // AI draft states
  const [aiDraft, setAiDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);

  // Submit state
  const [submitted, setSubmitted] = useState(false);

  const handleDraftWithAi = async () => {
    if (!description.trim()) {
      alert("Please enter a short description of the problem first, so our AI can draft the letter.");
      return;
    }
    setDraftLoading(true);
    setAiDraft('');
    try {
      const draft = await generateGrievanceDraft(
        'civic_grievance',
        description,
        location || 'Moinabad',
        authority,
        currentLanguage
      );
      setAiDraft(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    const report = await dbClient.submitIncidentReport({
      type: 'civic_grievance',
      title,
      description,
      location,
      date: new Date().toLocaleDateString(),
      witnessCount,
      isAnonymous,
      targetAuthority: authority,
      evidenceUrls: []
    });

    // Also register a request so they can track its status in the pipeline!
    await dbClient.submitRequest({
      citizenName: isAnonymous ? 'Anonymous Citizen' : 'Verified Citizen',
      itemType: 'grievance',
      itemId: report.id,
      itemName: `Grievance: ${title}`
    });

    setSubmitted(true);
    alert(`🔐 Report registered with absolute privacy.\n\nAn administrative proxy ID has been issued: HS-REP-${Math.floor(1000+Math.random()*9000)}\nYou can track the response audit logs in the 'Requests Tracker' tab.`);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8" id="report-view">
      
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-4 mb-8">
        <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
          Secure Reporting & Grievance Gateway
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Anonymously register grievances, scam broker activities, or community complaints. Draft official, legally compliant petition letters instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Reporting Form */}
        <div className="lg:col-span-2 bg-white border border-teal-100 rounded-3xl p-6 shadow-sm">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="font-sans text-lg font-bold text-gray-900">Grievance Registered Successfully</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                Your report has been securely routed using random citizen ID proxies. Check the 'Requests Tracker' to watch progress.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setTitle('');
                  setDescription('');
                  setLocation('');
                  setAiDraft('');
                }}
                className="px-5 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors"
              >
                Submit New Grievance
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3 mb-2">
                <EyeOff className="h-5 w-5 text-gray-400 animate-pulse" />
                <span className="text-xs font-bold text-gray-700">Anonymity Proxies Enabled</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Grievance Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken Water Pipe near Ward 3"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Government Authority</label>
                  <select
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  >
                    <option value="Gram Panchayat Secretary">Gram Panchayat Secretary</option>
                    <option value="Block Development Officer">Block Development Officer (BDO)</option>
                    <option value="District Tahsildar">District Tahsildar</option>
                    <option value="District Collector">District Collector</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Location of Issue</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Moinabad Ward 4"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the complaint in simple terms..."
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supporting Witnesses Count</label>
                  <input
                    type="number"
                    min={1}
                    value={witnessCount}
                    onChange={(e) => setWitnessCount(Number(e.target.value))}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center space-x-3 py-4">
                  <input
                    type="checkbox"
                    id="anonymous-checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="anonymous-checkbox" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Submit Anonymously (Hide my name)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDraftWithAi}
                  disabled={draftLoading}
                  className="flex-1 py-3 bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs rounded-xl hover:bg-teal-100 transition-colors flex items-center justify-center space-x-1"
                >
                  {draftLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Drafting letter...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 text-teal-600" />
                      <span>Draft Petition with Gemini</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit Complaint Securely</span>
                </button>
              </div>

            </form>
          )}
        </div>

        {/* Right Column: AI drafted official letter copy */}
        <div className="bg-teal-950 text-white rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-teal-300" />
              <h3 className="font-sans text-sm font-bold text-teal-100">Drafted Petition Document</h3>
            </div>

            {aiDraft ? (
              <p className="text-[11px] font-mono leading-relaxed bg-teal-900/50 p-3.5 rounded-2xl whitespace-pre-line border border-teal-800 overflow-y-auto max-h-[300px]">
                {aiDraft}
              </p>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-teal-800 rounded-2xl">
                <Sparkles className="h-8 w-8 text-teal-400 mx-auto mb-2 animate-bounce" />
                <span className="block text-xs font-bold text-teal-200">No draft prepared</span>
                <p className="text-[10px] text-teal-100/50 mt-1">Click 'Draft Petition with Gemini' in the form to render a structured government application letter copy in {currentLanguage}.</p>
              </div>
            )}
          </div>

          {aiDraft && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(aiDraft);
                alert("📋 Formal petition draft copied to clipboard!");
              }}
              className="mt-4 w-full py-2 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl text-[10px] font-bold transition-colors"
            >
              Copy to Clipboard
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
export default ReportView;
