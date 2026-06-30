import React, { useState, useEffect } from 'react';
import { CitizenProfile, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { ShieldCheck, Users, Hand, Send, Check } from 'lucide-react';

interface SupportViewProps {
  currentLanguage: LanguageCode;
}

export const SupportView: React.FC<SupportViewProps> = ({ currentLanguage }) => {
  const [activeProfile, setActiveProfile] = useState<CitizenProfile | null>(null);
  const [category, setCategory] = useState('scheme_help');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const p = await dbClient.getProfile();
    setActiveProfile(p);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    // Create a new request in tracking DB
    const request = await dbClient.submitRequest({
      citizenName: activeProfile.name,
      itemType: 'volunteer_support',
      itemId: 'vol-' + Math.floor(1000 + Math.random() * 9000),
      itemName: `${category === 'scheme_help' ? 'Scheme Filing Help' : category === 'document_help' ? 'Missing Documents Assist' : 'Emergency Aid'}`
    });

    // Also spawn a live Case in the volunteer dashboard database!
    await dbClient.createVolunteerCase({
      requestId: request.id,
      citizenName: activeProfile.name,
      primaryLanguage: currentLanguage,
      category,
      priority,
      notes
    });

    setSubmitted(true);
    setNotes('');
    alert(`🙋 Volunteer case successfully queued!\n\nA local Panchayat helper is reviewing your request for ${category.replace('_', ' ')}. They will contact you shortly.`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8" id="support-view">
      
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-4 mb-8">
        <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
          Request Volunteer Handholding
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Having trouble with documents, forms, or language? Connect with verified local Panchayat volunteers who will visit you to complete applications.
        </p>
      </div>

      <div className="bg-white border border-teal-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        
        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="font-sans text-xl font-bold text-gray-900">Request Dispatched Successfully!</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Your ticket has been logged in the Panchayat Volunteer queue. A nearby volunteer will verify your file details and contact you.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex items-center space-x-2.5 border-b border-gray-100 pb-4 mb-4">
              <Users className="h-5 w-5 text-teal-600" />
              <h3 className="font-sans text-base font-bold text-gray-800">Support Enrollment Form</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">What do you need help with?</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  <option value="scheme_help">Scheme Eligibility & Application Filing</option>
                  <option value="document_help">Identity Papers Correction (Aadhaar/Ration Card)</option>
                  <option value="caste_income_help">Income/Caste Certificate filing</option>
                  <option value="disability_udid">Disability UDID registration</option>
                  <option value="other_support">Other Direct Administrative Help</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  <option value="low">Standard Priority</option>
                  <option value="medium">Medium Priority (Need help in 3-4 days)</option>
                  <option value="high">High Priority (Urgent requirement, close deadline)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Explain your situation in simple words</label>
              <textarea
                required
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: I want to apply for PM Vishwakarma, but I do not have a registered income certificate. I need a volunteer to help file the Tahsildar forms."
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Privacy note */}
            <div className="bg-teal-50/30 p-4 rounded-2xl border border-teal-100/50">
              <span className="block text-xs font-bold text-teal-950">Safety Statement</span>
              <p className="text-[10px] text-teal-800/80 mt-1 leading-relaxed">
                By clicking Submit, your profile credentials (name, location, phone) will be shared with the certified, verified Panchayat Volunteer assigned to your ward. No bank secrets or biometric data is ever collected.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-600/10 flex items-center justify-center space-x-1"
            >
              <Send className="h-4 w-4" />
              <span>Dispatch Request to Volunteer Queue</span>
            </button>

          </form>
        )}

      </div>

    </div>
  );
};
export default SupportView;
