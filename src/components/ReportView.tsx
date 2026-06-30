import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { generateGrievanceDraft, generateCasteReferral, generateDisabilityReport } from '../lib/aiService';
import { 
  Shield, Sparkles, Send, EyeOff, Bot, RefreshCw, FileText, 
  CheckCircle, ShieldAlert, Accessibility, MapPin, Camera, BarChart3, AlertOctagon 
} from 'lucide-react';
import { SuggestedInquiries } from './SuggestedInquiries';

interface ReportViewProps {
  currentLanguage: LanguageCode;
}

type ReportTab = 'civic' | 'caste_discrimination' | 'disability_audit';

export const ReportView: React.FC<ReportViewProps> = ({ currentLanguage }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('civic');

  // Generic & Civic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [authority, setAuthority] = useState('Block Development Officer');
  const [witnessCount, setWitnessCount] = useState<number>(1);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Disability Access Audit fields
  const [inaccessibilityType, setInaccessibilityType] = useState('No Wheelchair Ramp');
  const [photoSelected, setPhotoSelected] = useState('phc_entrance');
  const [photoDetails, setPhotoDetails] = useState('Step-entrance to Moinabad Primary Health Centre. (Latitude: 17.3851° N, Longitude: 78.4862° E)');

  // AI draft states
  const [aiDraft, setAiDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);

  // Submit state
  const [submitted, setSubmitted] = useState(false);

  // Policy Aggregation Hub Data (Aggregated Caste Discrimination metrics for advocacy)
  const aggregatedStats = {
    totalReports: 148,
    activeInvestigations: 39,
    firsRegistered: 84,
    legalReferralsDispatched: 112,
    byDistrict: [
      { name: 'Rangareddy', count: 54 },
      { name: 'Medchal', count: 32 },
      { name: 'Nalgonda', count: 41 },
      { name: 'Mahbubnagar', count: 21 },
    ]
  };

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setAiDraft('');
    setTitle('');
    setDescription('');
    setLocation('');
    setSubmitted(false);
  };

  const handleDraftWithAi = async () => {
    if (!description.trim()) {
      alert("Please enter a short description first, so our AI can draft the petition.");
      return;
    }
    setDraftLoading(true);
    setAiDraft('');
    try {
      if (activeTab === 'civic') {
        const draft = await generateGrievanceDraft(
          'civic_grievance',
          description,
          location || 'Moinabad',
          authority,
          currentLanguage
        );
        setAiDraft(draft);
      } else if (activeTab === 'caste_discrimination') {
        const draft = await generateCasteReferral(
          title || 'Caste-based Social Exclusion incident',
          description,
          location || 'Moinabad Ward 4',
          authority || 'National Commission for Scheduled Castes',
          currentLanguage
        );
        setAiDraft(draft);
      } else if (activeTab === 'disability_audit') {
        const draft = await generateDisabilityReport(
          location || 'Local Public Infrastructure',
          inaccessibilityType,
          description,
          photoDetails,
          currentLanguage
        );
        setAiDraft(draft);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert("Please describe the issue/incident.");
      return;
    }

    const typeMapping = {
      civic: 'civic_grievance',
      caste_discrimination: 'caste_discrimination',
      disability_audit: 'disability_access_audit'
    };

    const finalTitle = title || (activeTab === 'disability_audit' ? `Disability Barrier: ${inaccessibilityType}` : 'Incident Report');

    const report = await dbClient.submitIncidentReport({
      type: typeMapping[activeTab] as any,
      title: finalTitle,
      description,
      location: location || 'Moinabad',
      date: new Date().toLocaleDateString(),
      witnessCount,
      isAnonymous,
      targetAuthority: authority,
      evidenceUrls: activeTab === 'disability_audit' ? [photoSelected] : []
    });

    // Also register a request so they can track its status in the pipeline!
    await dbClient.submitRequest({
      citizenName: isAnonymous ? 'Anonymous Citizen' : 'Verified Citizen',
      itemType: 'grievance',
      itemId: report.id,
      itemName: `${activeTab === 'caste_discrimination' ? 'Caste Discrimination complaint' : activeTab === 'disability_audit' ? 'Disability Audit report' : 'Grievance'}: ${finalTitle}`
    });

    setSubmitted(true);
    alert(`🔐 Report successfully registered in the secure ledger.\n\nAn administrative proxy ID has been issued: HS-REP-${Math.floor(1000 + Math.random() * 9000)}\nYou can track the response progress and officer audit logs in the 'Tracker' tab.`);
  };

  const handlePhotoSelect = (photo: string) => {
    setPhotoSelected(photo);
    if (photo === 'phc_entrance') {
      setPhotoDetails('Step-entrance to Moinabad Primary Health Centre. (Latitude: 17.3851° N, Longitude: 78.4862° E)');
    } else if (photo === 'pavement_block') {
      setPhotoDetails('Broken tactile path and open sewage grid near Gram Panchayat High School. (Latitude: 17.3872° N, Longitude: 78.4891° E)');
    } else {
      setPhotoDetails('Non-standard, steep ramp without side rails at Government Sub-Registrar office. (Latitude: 17.3910° N, Longitude: 78.4795° E)');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8 text-[#1A2E2A]" id="report-view">
      
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-teal-900">Incident & Audit Reporting</h1>
        <p className="mt-1 text-sm text-gray-500 font-medium max-w-3xl">
          Secure, anonymous infrastructure for filing civic grievances, logging systemic discrimination for advocacy partners, and crowdsourcing accessibility audits. 
        </p>
      </div>

      <div className="mb-6 -mt-2">
        <SuggestedInquiries screenId="ReportView" />
      </div>

      {/* Primary Tabs selection */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto space-x-2 pb-1 scrollbar-none">
        <button
          onClick={() => handleTabChange('civic')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-t-xl transition-all border-t border-x border-transparent whitespace-nowrap ${
            activeTab === 'civic' 
              ? 'bg-white border-gray-200 text-teal-800 border-b-2 border-b-teal-600 font-extrabold' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          🏙️ Civic Grievance
        </button>
        <button
          onClick={() => handleTabChange('caste_discrimination')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-t-xl transition-all border-t border-x border-transparent whitespace-nowrap ${
            activeTab === 'caste_discrimination' 
              ? 'bg-white border-gray-200 text-teal-800 border-b-2 border-b-teal-600 font-extrabold' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          🛡️ Caste Discrimination Incident Portal
        </button>
        <button
          onClick={() => handleTabChange('disability_audit')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-t-xl transition-all border-t border-x border-transparent whitespace-nowrap ${
            activeTab === 'disability_audit' 
              ? 'bg-white border-gray-200 text-teal-800 border-b-2 border-b-teal-600 font-extrabold' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          ♿ Disability Access Audit & Remediation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Reporting Form */}
        <div className="lg:col-span-2 bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="font-sans text-lg font-bold text-gray-900">Report Registered Securely</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Your dossier has been registered safely in our civic accountability index using a random proxy identifier. Watch your assigned volunteer caseworkers trace resolutions on your **Tracker** tab.
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
                File Another Record
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-5">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2">
                  <EyeOff className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
                  <span className="text-xs font-bold text-gray-700">Awaaz Anonymity Layer Active</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="anon-checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded-md border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="anon-checkbox" className="text-xs font-extrabold text-teal-800 cursor-pointer">
                    Protect My Identity (Anonymous submission)
                  </label>
                </div>
              </div>

              {activeTab === 'caste_discrimination' && (
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-900 font-semibold leading-relaxed">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Prevention of Atrocities Act Safeguards:</strong> This portal securely channels complaints regarding caste segregation, physical abuse, or denied access to public amenities directly to Scheduled Caste Commission coordinators, utilizing secure non-traceable proxies.
                  </p>
                </div>
              )}

              {activeTab === 'disability_audit' && (
                <div className="bg-teal-50/50 border border-teal-100 p-4 rounded-2xl flex items-start space-x-2.5 text-xs text-teal-900 font-semibold leading-relaxed">
                  <Accessibility className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>RPWD Act, 2016 Mandates:</strong> Document broken or inaccessible public structures with physical audit descriptions. This system generates formal accessibility petitions sent to municipal engineering commissioners.
                  </p>
                </div>
              )}

              {/* Form Input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {activeTab !== 'disability_audit' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      {activeTab === 'caste_discrimination' ? 'Nature of Exclusion / Incident' : 'Grievance Title'}
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={activeTab === 'caste_discrimination' ? 'e.g. Social boycott at well site' : 'e.g. Leakage in primary tank'}
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Inaccessibility Type</label>
                    <select
                      value={inaccessibilityType}
                      onChange={(e) => setInaccessibilityType(e.target.value)}
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    >
                      <option value="No Wheelchair Ramp">No Wheelchair Ramp / Steep Steps</option>
                      <option value="Broken Tactile Pavement">Broken Tactile Pavement (Visual Handicap)</option>
                      <option value="Blocked Accessibility Entrance">Blocked Accessibility Entrance</option>
                      <option value="No Disabled-friendly Toilet">No Disabled-friendly Toilet</option>
                      <option value="No Lift / Elevator Access">No Lift / Elevator Access</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Exact Location of Occurrence</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Moinabad Ward 4, Panchayat Office"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

              </div>

              {/* Authority & Witnesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Action Authority</label>
                  <select
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  >
                    {activeTab === 'caste_discrimination' ? (
                      <>
                        <option value="National Commission for Scheduled Castes (NCSC)">National Commission for Scheduled Castes (NCSC)</option>
                        <option value="District Magistrate & Superintendent of Police">District Magistrate (DM) & Superintendent of Police (SP)</option>
                        <option value="State Human Rights Commission (SHRC)">State Human Rights Commission (SHRC)</option>
                      </>
                    ) : activeTab === 'disability_audit' ? (
                      <>
                        <option value="Municipal Commissioner & Ward Development Officer">Municipal Commissioner & Ward Development Officer</option>
                        <option value="State Commissioner for Persons with Disabilities">State Commissioner for Persons with Disabilities</option>
                        <option value="Public Works Department (PWD) Chief Engineer">Public Works Department (PWD) Chief Engineer</option>
                      </>
                    ) : (
                      <>
                        <option value="Gram Panchayat Secretary">Gram Panchayat Secretary</option>
                        <option value="Block Development Officer">Block Development Officer (BDO)</option>
                        <option value="District Tahsildar">District Tahsildar</option>
                        <option value="District Collector">District Collector</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supporting Witnesses / Citizens affected</label>
                  <input
                    type="number"
                    min={1}
                    value={witnessCount}
                    onChange={(e) => setWitnessCount(Number(e.target.value))}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

              </div>

              {/* Disability Geo-tagged Photo Selector */}
              {activeTab === 'disability_audit' && (
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-3">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase flex items-center space-x-1">
                    <Camera className="h-4 w-4 text-teal-700" />
                    <span>Geo-Tagged Photo Audit Reference</span>
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePhotoSelect('phc_entrance')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        photoSelected === 'phc_entrance' 
                          ? 'bg-teal-50 border-teal-400 text-teal-900' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      Step Entrance (PHC)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhotoSelect('pavement_block')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        photoSelected === 'pavement_block' 
                          ? 'bg-teal-50 border-teal-400 text-teal-900' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      Broken Tactile (School)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhotoSelect('steep_ramp')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        photoSelected === 'steep_ramp' 
                          ? 'bg-teal-50 border-teal-400 text-teal-900' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      Unsafe Ramp (Registrar)
                    </button>
                  </div>

                  <div className="text-[10px] text-gray-500 bg-teal-50/30 p-2.5 rounded-lg border border-teal-100/30 flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-teal-700" />
                    <span><strong>Verified Metadata:</strong> {photoDetails}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  {activeTab === 'caste_discrimination' 
                    ? 'Detailed Incident Narrative (Include specific behavior, exclusion details, or words used)' 
                    : activeTab === 'disability_audit' 
                    ? 'Infrastructural Deficit Narrative & Gaps Observed' 
                    : 'Grievance Description'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    activeTab === 'caste_discrimination' 
                      ? 'e.g. Members of the community were physically barred from drawing drinking water from the public ward tap by ward staff on grounds of social caste standing...'
                      : activeTab === 'disability_audit'
                      ? 'e.g. There is a 4-foot physical concrete flight of steps leading into the local dispensary with absolutely no lateral handrails or wheelchair ramp. Locomotor disabled citizens have to be carried inside manually...'
                      : 'Provide complete details of the civic service failure...'
                  }
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Form Submission Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDraftWithAi}
                  disabled={draftLoading}
                  className="flex-1 py-3 bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs rounded-xl hover:bg-teal-100 transition-colors flex items-center justify-center space-x-1.5"
                >
                  {draftLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating Petition...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
                      <span>
                        {activeTab === 'caste_discrimination' 
                          ? 'Draft Legal Atrocity Complaint' 
                          : activeTab === 'disability_audit' 
                          ? 'Compile RPWD Access Petition' 
                          : 'Draft Petition with Gemini'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {activeTab === 'caste_discrimination' 
                      ? 'Submit Atrocity Report Ledger' 
                      : activeTab === 'disability_audit' 
                      ? 'Submit Accessibility Audit' 
                      : 'Submit Grievance Securely'}
                  </span>
                </button>
              </div>

            </form>
          )}
        </div>

        {/* Right Column: AI drafted official letter copy & Data Aggregation policy chart */}
        <div className="space-y-6">
          
          {/* AI drafted petition text container */}
          <div className="bg-teal-950 text-white rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-teal-300" />
                <h3 className="font-sans text-sm font-bold text-teal-100">
                  {activeTab === 'caste_discrimination' 
                    ? 'Legal Complaint (SC/ST Act Frame)' 
                    : activeTab === 'disability_audit' 
                    ? 'Municipal Audit Petition (RPWD Frame)' 
                    : 'Drafted Petition Document'}
                </h3>
              </div>

              {aiDraft ? (
                <div className="text-[11px] font-mono leading-relaxed bg-teal-900/50 p-3.5 rounded-2xl whitespace-pre-line border border-teal-800 overflow-y-auto max-h-[350px]">
                  {aiDraft}
                </div>
              ) : (
                <div className="text-center py-12 px-4 border border-dashed border-teal-800 rounded-2xl">
                  <Sparkles className="h-8 w-8 text-teal-400 mx-auto mb-2 animate-bounce" />
                  <span className="block text-xs font-bold text-teal-200">No draft compiled</span>
                  <p className="text-[10px] text-teal-100/50 mt-1">
                    Describe your issue and click 'Draft' to generate a formal, legally structured complaint or petition document in {currentLanguage}.
                  </p>
                </div>
              )}
            </div>

            {aiDraft && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiDraft);
                  alert("📋 Document draft successfully copied to clipboard!");
                }}
                className="mt-4 w-full py-2.5 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl text-[10px] font-bold transition-colors"
              >
                Copy Petition Draft
              </button>
            )}
          </div>

          {/* Caste Discrimination Data Aggregation advocacy panel */}
          {activeTab === 'caste_discrimination' && (
            <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center space-x-2 mb-3 border-b border-gray-100 pb-2">
                <BarChart3 className="h-4.5 w-4.5 text-teal-700" />
                <h3 className="font-sans text-xs font-bold text-gray-900">Registered Incidents Hub (Policy Advocacy)</h3>
              </div>
              <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                Anonymous aggregated metric trends supplied directly to civil liberty coalitions and Scheduled Caste state administrators for systemic policy changes.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-teal-50/40 p-2.5 rounded-xl border border-teal-100/30 text-center">
                  <span className="text-lg font-extrabold text-teal-950 block">{aggregatedStats.totalReports}</span>
                  <span className="text-[9px] text-teal-800 font-bold uppercase">Total Logged</span>
                </div>
                <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/30 text-center">
                  <span className="text-lg font-extrabold text-emerald-950 block">{aggregatedStats.firsRegistered}</span>
                  <span className="text-[9px] text-emerald-800 font-bold uppercase">FIRs Registered</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">Reports by block / ward</span>
                {aggregatedStats.byDistrict.map((dist, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-600">
                      <span>{dist.name} block</span>
                      <span>{dist.count} cases</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1 rounded-full">
                      <div className="bg-teal-700 h-1 rounded-full" style={{ width: `${(dist.count / aggregatedStats.totalReports) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default ReportView;
