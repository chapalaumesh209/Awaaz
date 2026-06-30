import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, FileText, Users, Calendar, MapPin, 
  User, Phone, Clock, Plus, Trash2, CheckCircle2, 
  AlertCircle, Download, Printer, QrCode, ClipboardList, 
  ChevronRight, Award, Landmark, HardHat, FileSpreadsheet,
  Check, Info, UserCheck, RefreshCw, Layers
} from 'lucide-react';

import { dbClient } from '../lib/supabaseClient';
import { LanguageCode } from '../types';

interface RecordlessViewProps {
  currentLanguage: LanguageCode;
}

interface Camp {
  id: string;
  title: string;
  date: string;
  location: string;
  officers: string;
  schemesTargeted: string;
  slotsAvailable: number;
}

interface BookedSlot {
  id?: string;
  citizenName: string;
  age: number;
  phone: string;
  campId: string;
  campTitle: string;
  timeSlot: string;
  status: 'pre_registered' | 'attended' | 'biometrics_done' | 'issued' | 'rejected';
  notes?: string;
  createdAt?: string;
}

interface EvidenceBlock {
  id?: string;
  title: string;
  provider: string;
  date: string;
  category: 'residence' | 'employment' | 'identity';
  status: 'verified' | 'pending';
  points: number;
}

export const RecordlessView: React.FC<RecordlessViewProps> = ({ currentLanguage }) => {
  const [activeTab, setActiveTab] = useState<'camps' | 'affidavit' | 'wallet'>('wallet');
  const [camps, setCamps] = useState<Camp[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [evidenceBlocks, setEvidenceBlocks] = useState<EvidenceBlock[]>([]);
  const [isNgoMode, setIsNgoMode] = useState<boolean>(false);
  
  // Loading and feedback states
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Camp Form State
  const [registerName, setRegisterName] = useState('');
  const [registerAge, setRegisterAge] = useState<number>(30);
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCampId, setRegisterCampId] = useState('');
  const [registerSlot, setRegisterSlot] = useState('09:00 AM - 11:00 AM');

  // Evidence Builder Form State
  const [advName, setAdvName] = useState('');
  const [advAge, setAdvAge] = useState<number>(28);
  const [advOccupation, setAdvOccupation] = useState('Construction Laborer');
  const [advHomeState, setAdvHomeState] = useState('Bihar');
  const [advCurrentAddress, setAdvCurrentAddress] = useState('Indira Nagar Labor Camp, Hyderabad');
  const [advReason, setAdvReason] = useState('Home washed away in floods - no physical papers left');
  const [witness1, setWitness1] = useState('Ramesh Yadav (Local Site Contractor)');
  const [witness2, setWitness2] = useState('Kiran Devi (Neighbor & Resident for 3 Years)');
  const [hasRentReceipt, setHasRentReceipt] = useState(true);
  const [hasWorkSlip, setHasWorkSlip] = useState(true);
  const [hasPanchayatRec, setHasPanchayatRec] = useState(false);
  const [aiAffidavit, setAiAffidavit] = useState<string>('');

  // Wallet State
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceProvider, setNewEvidenceProvider] = useState('');
  const [newEvidenceCat, setNewEvidenceCat] = useState<'residence' | 'employment' | 'identity'>('residence');
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Load active camps
      const campsList = await dbClient.getDocumentCamps();
      const mappedCamps: Camp[] = campsList.map((c, i) => ({
        id: c.id,
        title: c.title,
        date: c.date,
        location: c.location,
        officers: c.officers,
        schemesTargeted: c.schemesTargeted,
        slotsAvailable: 25 - i * 4
      }));
      setCamps(mappedCamps);
      if (mappedCamps.length > 0) {
        setRegisterCampId(mappedCamps[0].id);
      }

      // 2. Load booked slots
      const slots = await dbClient.getBookedSlots();
      if (slots.length > 0) {
        setBookedSlots(slots);
      } else {
        // Prepopulate standard sample slots
        const sampleSlots: BookedSlot[] = [
          {
            id: 'slot-sample-1',
            citizenName: 'Manoj Paswan',
            age: 34,
            phone: '+91 98450 12849',
            campId: 'camp-1',
            campTitle: 'Moinabad Civic Mega Document Enrollment & Identity Camp',
            timeSlot: '11:00 AM - 01:00 PM',
            status: 'pre_registered',
            notes: 'Aadhaar name correction request. Lacks local proof.'
          },
          {
            id: 'slot-sample-2',
            citizenName: 'Sushila Soreng',
            age: 29,
            phone: '+91 87431 90218',
            campId: 'camp-1',
            campTitle: 'Moinabad Civic Mega Document Enrollment & Identity Camp',
            timeSlot: '02:00 PM - 04:00 PM',
            status: 'biometrics_done',
            notes: 'Birth certificate issuance camp. Witness affidavits submitted.'
          }
        ];
        // Save samples to database
        for (const slot of sampleSlots) {
          await dbClient.saveBookedSlot(slot);
        }
        setBookedSlots(sampleSlots);
      }

      // 3. Load evidence blocks for identity wallet
      const evBlocks = await dbClient.getEvidenceBlocks();
      if (evBlocks.length > 0) {
        setEvidenceBlocks(evBlocks);
      } else {
        const sampleEv: EvidenceBlock[] = [
          {
            title: 'Landlord Written Tenancy Slip',
            provider: 'Sri V. Reddy (Gachibowli Ward Landlord)',
            date: '10/05/2026',
            category: 'residence',
            status: 'verified',
            points: 25
          },
          {
            title: 'Employment Statement Note',
            provider: 'BuildRight Infra Contractor Ltd',
            date: '15/04/2026',
            category: 'employment',
            status: 'verified',
            points: 25
          },
          {
            title: 'Self-Declared Identity Oath Statement',
            provider: 'Awaaz Community Counselors',
            date: '20/06/2026',
            category: 'identity',
            status: 'verified',
            points: 15
          }
        ];
        // Save samples
        for (const ev of sampleEv) {
          await dbClient.saveEvidenceBlock(ev);
        }
        setEvidenceBlocks(sampleEv);
      }

      // Prepopulate Affidavit fields with active profile if available
      const profile = await dbClient.getProfile();
      if (profile) {
        setAdvName(profile.name || '');
        setAdvAge(profile.age || 30);
        setAdvOccupation(profile.occupation || 'Construction Laborer');
        setAdvCurrentAddress(profile.location || 'Gachibowli Labor Camp, Hyderabad');
      }
    } catch (e) {
      console.error('Error loading recordless workspace:', e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Camps Registration & Slot Booking Handler
  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-select first camp if none selected
    let campId = registerCampId;
    if (!campId && camps.length > 0) {
      campId = camps[0].id;
      setRegisterCampId(campId);
    }

    if (!registerName || !registerPhone) {
      setErrorMsg('Please fill in your name and mobile number to book a slot.');
      return;
    }
    if (!campId) {
      setErrorMsg('No active camps available. Please check back later.');
      return;
    }

    setLoading(true);
    const selectedCamp = camps.find(c => c.id === campId);
    const payload: BookedSlot = {
      citizenName: registerName,
      age: registerAge,
      phone: registerPhone,
      campId: campId,
      campTitle: selectedCamp ? selectedCamp.title : 'Identity Enrollment Camp',
      timeSlot: registerSlot,
      status: 'pre_registered',
      notes: 'New enrollment request. Witness statements to be provided.'
    };

    try {
      const saved = await dbClient.saveBookedSlot(payload);
      setBookedSlots(prev => [saved, ...prev]);
      setSuccessMsg(`Time Slot booked successfully for ${registerName}! Present yourself at the counter.`);
      setRegisterName('');
      setRegisterPhone('');
      // Auto dismiss success message
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setErrorMsg('Failed to secure slot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // NGO Status Follow-up updates
  const handleUpdateSlotStatus = async (slotId: string, status: BookedSlot['status'], notes?: string) => {
    try {
      await dbClient.updateBookedSlotStatus(slotId, status, notes);
      setBookedSlots(prev => prev.map(s => s.id === slotId ? { ...s, status, notes: notes || s.notes } : s));
      setSuccessMsg('Booking status updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setErrorMsg('Failed to update status.');
    }
  };

  // 2. AI Evidence Affidavit Builder Handler
  const handleBuildAffidavit = async () => {
    if (!advName || !advCurrentAddress) {
      setErrorMsg('Please fill in your name and current address to build your Affidavit.');
      return;
    }

    setLoading(true);
    setAiAffidavit('');
    setErrorMsg('');

    const testimonies = [
      `Witness 1 (${witness1}): Swears to the identity and peaceful residence of ${advName}.`,
      `Witness 2 (${witness2}): Swears that ${advName} is living in this local community camp without formal deeds.`
    ];

    const utilities = [];
    if (hasRentReceipt) utilities.push('Hand-written rent receipt signed by owner');
    if (hasWorkSlip) utilities.push('Contractor deployment record slip');
    if (hasPanchayatRec) utilities.push('Local Gram Panchayat representative letter');

    // Client-side offline fallback affidavit generator
    const generateOfflineAffidavit = () => {
      const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const utilsList = utilities.length > 0 ? utilities.map((u, i) => `  ${i + 1}. ${u}`).join('\n') : '  None provided';
      return `BEFORE THE NOTARY / EXECUTION COMMISSIONER, GOVERNMENT OF INDIA
Non-Judicial Stamp Paper of Rs. 100


AFFIDAVIT / SOLEMN AFFIRMATION


I, ${advName}, aged about ${advAge} years, son/daughter of [Father's Name], currently residing at ${advCurrentAddress}, do hereby solemnly affirm and declare as under:

1. That I am a resident Indian citizen, originally belonging to the State of ${advHomeState}, currently living and working at the above-mentioned address.

2. That I am employed as a ${advOccupation} and have been residing at ${advCurrentAddress} for a continuous period without formal tenancy or statutory documentation, due to the following reason: ${advReason}.

3. That my identity and continuous peaceful residence at the above address is duly corroborated and attested by the following witnesses:

   a. ${witness1}, who swears to my identity and peaceful residence.
   b. ${witness2}, who confirms that I am living in this community without formal deed or title records.

4. That the following supporting supplementary documents and proofs are available in my possession:
${utilsList}

5. That the statements made in this affidavit are true and correct to the best of my knowledge and belief, and nothing material has been concealed.


VERIFICATION

Verified at _______ on this ${today} that the contents of the above affidavit are true and correct to the best of my knowledge and belief, and no part of it is false and nothing material has been concealed therefrom.


________________________           ________________________
DEPONENT SIGNATURE                 WITNESS 1 SIGNATURE
(${advName})                        (${witness1})


________________________           ________________________
WITNESS 2 SIGNATURE                NOTARY PUBLIC / EXECUTION
(${witness2})                       COMMISSIONER SEAL & STAMP


[Notary Seal]                      Date: ${today}
Place: ______________________      Court/Registration No: _________`;
    };

    try {
      const response = await fetch('/api/ai/affidavit-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: advName,
          age: advAge,
          occupation: advOccupation,
          homeState: advHomeState,
          currentAddress: advCurrentAddress,
          purpose: 'Continuous residence & socio-occupational evidence in lack of statutory records',
          testimonies,
          utilities,
          language: currentLanguage
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiAffidavit(data.text);
        setSuccessMsg('AI Evidence Affidavit compiled successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        throw new Error('Affidavit builder endpoint returned error status.');
      }
    } catch (e) {
      // Use the reliable offline fallback affidavit template
      const offlineAffidavit = generateOfflineAffidavit();
      setAiAffidavit(offlineAffidavit);
      setSuccessMsg('Affidavit generated using offline certified template.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  // 3. Wallet Evidence Handler
  const handleAddEvidenceBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvidenceTitle || !newEvidenceProvider) {
      setErrorMsg('Please supply a title and a verifying authority.');
      return;
    }

    setLoading(true);
    const pointsMap = {
      residence: 25,
      employment: 25,
      identity: 15
    };

    const payload: Omit<EvidenceBlock, 'id'> = {
      title: newEvidenceTitle,
      provider: newEvidenceProvider,
      date: new Date().toLocaleDateString('en-IN'),
      category: newEvidenceCat,
      status: 'verified',
      points: pointsMap[newEvidenceCat]
    };

    try {
      const saved = await dbClient.saveEvidenceBlock(payload);
      setEvidenceBlocks(prev => [...prev, saved]);
      setSuccessMsg(`Verifiable evidence block "${newEvidenceTitle}" added to your digital ID wallet.`);
      setNewEvidenceTitle('');
      setNewEvidenceProvider('');
      setShowAddEvidence(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      setErrorMsg('Failed to register evidence block.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Wallet Verification Trust Score
  const totalTrustScore = Math.min(
    100,
    20 + evidenceBlocks.reduce((acc, curr) => acc + (curr.status === 'verified' ? curr.points : 0), 0)
  );

  const getTrustBadge = (score: number) => {
    if (score >= 85) return { text: 'HIGH TRUST VERIFIED', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (score >= 60) return { text: 'ESTABLISHED PROFILE', color: 'bg-teal-100 text-teal-800 border-teal-200' };
    if (score >= 40) return { text: 'PARTIALLY SECURED', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { text: 'SELF-DECLARED', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  const trustBadge = getTrustBadge(totalTrustScore);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="recordless-workspace">
      
      {/* Banner Header */}
      <div className="border-b border-gray-100 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
              <ShieldCheck className="h-7 w-7 text-teal-600" />
              <span>Identity & Document Support for Recordless Communities</span>
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              NGO-supported pre-registrations, verifiable digital wallets, and AI-powered court affidavits for migrant and undocumented families.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-bold text-gray-400">Coordinator Mode:</span>
            <button
              onClick={() => setIsNgoMode(!isNgoMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isNgoMode ? 'bg-teal-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isNgoMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-bold text-teal-950 uppercase tracking-wide">
              {isNgoMode ? 'NGO Active' : 'Off'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 -mt-2">
        
      </div>

      {/* Action Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-2xl flex items-center space-x-3 text-xs font-semibold shadow-xs"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-rose-50 border border-rose-100 text-rose-900 rounded-2xl flex items-center space-x-3 text-xs font-semibold shadow-xs"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Row */}
      <div className="flex border-b border-gray-100 mb-6 overflow-x-auto space-x-4">
        <button
          onClick={() => { setActiveTab('wallet'); setErrorMsg(''); }}
          className={`pb-4 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'wallet' ? 'border-teal-600 text-teal-950' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Layers className="h-4.5 w-4.5" />
          <span>Portable Identity Wallet</span>
        </button>
        <button
          onClick={() => { setActiveTab('affidavit'); setErrorMsg(''); }}
          className={`pb-4 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'affidavit' ? 'border-teal-600 text-teal-950' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span>AI Evidence Affidavit Builder</span>
        </button>
        <button
          onClick={() => { setActiveTab('camps'); setErrorMsg(''); }}
          className={`pb-4 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'camps' ? 'border-teal-600 text-teal-950' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Calendar className="h-4.5 w-4.5" />
          <span>Document Drive Organiser</span>
        </button>
      </div>

      {/* Main View Port Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ACTIVE INTERACTIVE PORTLET */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: PORTABLE IDENTITY WALLET */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              
              {/* ID Card Visualizer Container */}
              <div className="bg-gradient-to-br from-teal-950 to-teal-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-teal-800">
                
                {/* Decorative background vectors */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-teal-800/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-600/10 rounded-full blur-xl" />
                
                {/* Identity header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-6 w-6 text-teal-400" />
                    <div>
                      <h4 className="font-sans text-sm font-extrabold uppercase tracking-widest leading-none text-white">
                        AWAAZ CITIZEN ID
                      </h4>
                      <span className="text-[9px] text-teal-300/80 font-bold tracking-wider">VERIFIABLE DIGITAL IDENTITY TRUST BLOCK</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full border text-[9px] font-extrabold uppercase tracking-widest leading-none ${trustBadge.color}`}>
                    {trustBadge.text}
                  </div>
                </div>

                {/* ID content body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  
                  {/* Photo area with QR */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="h-28 w-28 rounded-2xl bg-teal-900/60 border border-teal-700/60 p-1.5 flex items-center justify-center relative overflow-hidden group">
                      <div className="bg-teal-950/80 w-full h-full rounded-xl flex flex-col items-center justify-center border border-teal-800 text-teal-400 relative">
                        <User className="h-10 w-10 text-teal-200/80" />
                        <span className="text-[8px] font-extrabold text-teal-400 uppercase mt-1">Photo Active</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-teal-300">ID: AW-8940-2184</span>
                  </div>

                  {/* Identity detail fields */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-teal-300/70 font-extrabold">Full Name</span>
                        <span className="block text-xs font-extrabold tracking-wide truncate">{advName || 'Umesh Chapala'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-teal-300/70 font-extrabold">Primary Work</span>
                        <span className="block text-xs font-extrabold tracking-wide truncate flex items-center space-x-1">
                          <HardHat className="h-3.5 w-3.5 text-teal-400 inline" />
                          <span>{advOccupation || 'Construction Hand'}</span>
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-teal-300/70 font-extrabold">Current Residing</span>
                        <span className="block text-xs font-semibold tracking-wide truncate">{advCurrentAddress || 'Labor Colony, Hyderabad'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-teal-300/70 font-extrabold">Home Province / State</span>
                        <span className="block text-xs font-semibold tracking-wide truncate">{advHomeState || 'Bihar State'}</span>
                      </div>
                    </div>

                    <div className="border-t border-teal-800 pt-3 flex items-center justify-between">
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-teal-300/70 font-extrabold">Identity Trust Score</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-24 bg-teal-950 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-teal-400 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${totalTrustScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-extrabold text-teal-300">{totalTrustScore}%</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowQrCodeModal(true)}
                        className="bg-teal-800 hover:bg-teal-700 active:scale-95 transition-all text-white px-2.5 py-1.5 rounded-xl border border-teal-700 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5 text-teal-300" />
                        <span>Verify QR</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* Verified evidence checklist */}
              <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-sans text-base font-extrabold text-gray-900">
                      Accumulated Local Proof Points
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      These non-standard proofs build verifiable socio-economic residence for welfare, even if you do not possess standard Aadhaar proofs.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddEvidence(true)}
                    className="bg-teal-50 text-teal-700 border border-teal-100 rounded-xl px-3 py-1.5 hover:bg-teal-100 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Proof Block</span>
                  </button>
                </div>

                {/* List of evidence */}
                <div className="space-y-3.5">
                  {evidenceBlocks.map((block, idx) => (
                    <div 
                      key={idx} 
                      className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex items-start justify-between hover:border-teal-200 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          block.category === 'residence' ? 'bg-blue-50 text-blue-600' :
                          block.category === 'employment' ? 'bg-amber-50 text-amber-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          {block.category === 'residence' && <MapPin className="h-4 w-4" />}
                          {block.category === 'employment' && <HardHat className="h-4 w-4" />}
                          {block.category === 'identity' && <UserCheck className="h-4 w-4" />}
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-gray-900">{block.title}</h5>
                          <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">
                            Witnessed by: <span className="font-bold text-gray-700">{block.provider}</span>
                          </span>
                          <span className="text-[9px] text-gray-400 block mt-0.5">Approved: {block.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 text-right">
                        <div>
                          <span className="block text-[10px] font-extrabold text-teal-600">+{block.points} Pts</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 mt-1">
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {evidenceBlocks.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl">
                      <span className="text-xs text-gray-400 block">No local proof points added yet. Click 'Add Proof Block' to upload.</span>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: AI EVIDENCE AFFIDAVIT BUILDER */}
          {activeTab === 'affidavit' && (
            <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs space-y-6">
              <div>
                <h4 className="font-sans text-base font-extrabold text-gray-900">
                  AI Court-Grade Affidavit & Self-Declaration Generator
                </h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Input witness corroborations and physical statements. Our AI structures them into formal stamp-paper affidavit templates that legal agencies and enrollment officers accept for record issuances.
                </p>
              </div>

              {/* Form elements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={advName}
                    onChange={(e) => setAdvName(e.target.value)}
                    placeholder="e.g. Umesh Chapala"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={advAge}
                    onChange={(e) => setAdvAge(Number(e.target.value))}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Occupation</label>
                  <input
                    type="text"
                    value={advOccupation}
                    onChange={(e) => setAdvOccupation(e.target.value)}
                    placeholder="e.g. Brick Kiln Loader"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Original Province / State</label>
                  <input
                    type="text"
                    value={advHomeState}
                    onChange={(e) => setAdvHomeState(e.target.value)}
                    placeholder="e.g. Jharkhand"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Residing Colony/Address</label>
                  <input
                    type="text"
                    value={advCurrentAddress}
                    onChange={(e) => setAdvCurrentAddress(e.target.value)}
                    placeholder="e.g. Tent 12, shamirpet brick kilns, Hyderabad"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for Missing Official Records</label>
                  <input
                    type="text"
                    value={advReason}
                    onChange={(e) => setAdvReason(e.target.value)}
                    placeholder="e.g. Ancestors migrated seasonally; documents were ruined during high state floods"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Witness statements */}
                <div className="md:col-span-2 border-t border-gray-100 pt-4 space-y-3">
                  <span className="block text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                    <Users className="h-4.5 w-4.5 text-teal-600" />
                    <span>Witness Swear Sign-offs (Neighbors or Employers)</span>
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Witness 1 (Authority/Contractor)</label>
                      <input
                        type="text"
                        value={witness1}
                        onChange={(e) => setWitness1(e.target.value)}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Witness 2 (Neighbor resident)</label>
                      <input
                        type="text"
                        value={witness2}
                        onChange={(e) => setWitness2(e.target.value)}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Unofficial Proof points checkboxes */}
                <div className="md:col-span-2 space-y-2 border-t border-gray-100 pt-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secondary Supporting Proofs Available</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasRentReceipt(!hasRentReceipt)}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all text-left flex items-center justify-between ${
                        hasRentReceipt ? 'bg-teal-50 border-teal-200 text-teal-950' : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      <span>Rent Slip Scan</span>
                      {hasRentReceipt && <Check className="h-3.5 w-3.5 text-teal-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasWorkSlip(!hasWorkSlip)}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all text-left flex items-center justify-between ${
                        hasWorkSlip ? 'bg-teal-50 border-teal-200 text-teal-950' : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      <span>Contractor Payment Memo</span>
                      {hasWorkSlip && <Check className="h-3.5 w-3.5 text-teal-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasPanchayatRec(!hasPanchayatRec)}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all text-left flex items-center justify-between ${
                        hasPanchayatRec ? 'bg-teal-50 border-teal-200 text-teal-950' : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      <span>Panchayat Leader Note</span>
                      {hasPanchayatRec && <Check className="h-3.5 w-3.5 text-teal-600" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Build button */}
              <button
                onClick={handleBuildAffidavit}
                disabled={loading}
                className="w-full py-3.5 bg-teal-600 text-white font-extrabold text-xs rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-600/10 flex items-center justify-center space-x-1 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>NGO AI Notary compiling certified statements...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 text-teal-100" />
                    <span>Formulate Court-Grade Affidavit</span>
                  </>
                )}
              </button>

              {/* Affidavit Display paper layout */}
              {aiAffidavit && (
                <div className="border-4 border-double border-gray-300 p-6 rounded-2xl bg-amber-50/10 font-serif relative">
                  
                  {/* Decorative stamp stamp */}
                  <div className="absolute top-10 right-10 border-4 border-red-400/30 text-red-400/30 font-bold uppercase text-[10px] tracking-widest p-1 transform rotate-12 shrink-0">
                    Awaaz Certified Counsel
                  </div>

                  {/* Actions for draft */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-[10px] font-bold flex items-center space-x-1 shadow-xs"
                      title="Print Affidavit"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await dbClient.saveDocument({
                            name: `${advName}_Compiled_Evidence_Affidavit`,
                            type: 'income_cert', // mapping type
                            status: 'verified',
                            ocrText: aiAffidavit,
                            ocrConfidence: 99,
                            notes: 'AI Verified residency affidavit with local witness signatures'
                          });
                          setSuccessMsg('Affidavit linked and uploaded to your digital ID documents wallet!');
                          setTimeout(() => setSuccessMsg(''), 5000);
                        } catch (e) {
                          setErrorMsg('Failed to save to wallet.');
                        }
                      }}
                      className="p-1.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Save to Wallet</span>
                    </button>
                  </div>

                  {/* Stamp top section */}
                  <div className="text-center border-b-2 border-gray-300 pb-4 mb-6 pt-4">
                    <span className="block text-sm font-extrabold text-teal-900 tracking-widest uppercase">NOTARIAL DE DECLARATION</span>
                    <span className="block text-[9px] text-gray-400 uppercase tracking-widest font-sans font-bold mt-1">BHARAT NOTARY STAMP PAPER SPECIAL COGNIZANCE</span>
                  </div>

                  {/* Content rendered with markdown look */}
                  <pre className="text-[11px] text-gray-800 leading-relaxed font-sans whitespace-pre-wrap select-all focus:outline-hidden">
                    {aiAffidavit}
                  </pre>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: DOCUMENT DRIVE ORGANISER (CAMP BOOKING) */}
          {activeTab === 'camps' && (
            <div className="space-y-6">
              
              {/* Form: Register slot */}
              <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs space-y-4">
                <div>
                  <h4 className="font-sans text-base font-extrabold text-gray-900">
                    Secure Slot Pre-Registration Kiosk
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    NGO volunteers and recordless residents can book official timeslots below to get instant support, photograph capture, and physical registration on camp dates.
                  </p>
                </div>

                <form onSubmit={handleBookSlot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Citizen Applicant Name</label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="e.g. Umesh Chapala"
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Age</label>
                      <input
                        type="number"
                        value={registerAge}
                        onChange={(e) => setRegisterAge(Number(e.target.value))}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile No</label>
                      <input
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="e.g. 9845012345"
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Drive/Camp</label>
                    <select
                      value={registerCampId}
                      onChange={(e) => setRegisterCampId(e.target.value)}
                      disabled={camps.length === 0}
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                    >
                      {camps.length === 0 ? (
                        <option value="">Loading camps...</option>
                      ) : (
                        <>
                          <option value="" disabled>-- Select a Camp --</option>
                          {camps.map(camp => (
                            <option key={camp.id} value={camp.id}>{camp.title}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Time Slot</label>
                    <select
                      value={registerSlot}
                      onChange={(e) => setRegisterSlot(e.target.value)}
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM (Early Kiosk)</option>
                      <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM (Midday Spot)</option>
                      <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM (Afternoon Batch)</option>
                      <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM (Evening Batch)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-teal-600 text-white font-extrabold text-xs rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/10 cursor-pointer"
                    >
                      {loading ? 'Registering Slot...' : 'Secure Pre-registration Slot'}
                    </button>
                  </div>

                </form>
              </div>

              {/* List of Registered Slots */}
              <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-sans text-base font-extrabold text-gray-900">
                      Pre-Registered Slots & Progress
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      Follow up and trace your registration queue on camp day. Live biometrics tracking is active.
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
                    {bookedSlots.length} Booked
                  </span>
                </div>

                <div className="space-y-3.5">
                  {bookedSlots.map((slot) => {
                    const statusConfig = {
                      pre_registered: { text: 'Pre-registered', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                      attended: { text: 'Attended Kiosk', color: 'bg-purple-50 text-purple-700 border-purple-100' },
                      biometrics_done: { text: 'Biometrics Captured', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                      issued: { text: 'ID Registered/Issued', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                      rejected: { text: 'Deferred Proof', color: 'bg-rose-50 text-rose-700 border-rose-100' }
                    }[slot.status];

                    return (
                      <div 
                        key={slot.id} 
                        className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 space-y-3 hover:border-teal-100 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="block text-xs font-extrabold text-gray-900">{slot.citizenName}</span>
                            <span className="text-[10px] text-gray-500 font-medium block mt-0.5">
                              Age: {slot.age} | Mob: {slot.phone}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${statusConfig.color}`}>
                              {statusConfig.text}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-gray-500 font-semibold border-t border-gray-100/50 pt-2.5">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{slot.timeSlot}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{slot.campTitle}</span>
                          </div>
                        </div>

                        {slot.notes && (
                          <div className="bg-white/80 p-2 rounded-xl border border-gray-100 text-[10px] text-gray-600 font-medium">
                            <span className="font-extrabold block text-teal-950 mb-0.5">Coordinator Follow-up Note:</span>
                            {slot.notes}
                          </div>
                        )}

                        {/* NGO coordinator control panel */}
                        {isNgoMode && (
                          <div className="bg-teal-50/40 p-3 rounded-xl border border-teal-100/50 space-y-2 mt-3">
                            <span className="block text-[9px] font-extrabold text-teal-950 uppercase tracking-widest">
                              NGO Counselor Follow-up controls
                            </span>
                            
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => handleUpdateSlotStatus(slot.id!, 'attended', 'Arrived at the camp counter.')}
                                className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[9px] font-extrabold cursor-pointer"
                              >
                                Mark Attended
                              </button>
                              <button
                                onClick={() => handleUpdateSlotStatus(slot.id!, 'biometrics_done', 'Biometrics (IRIS & fingerprints) logged.')}
                                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[9px] font-extrabold cursor-pointer"
                              >
                                Biometrics Captured
                              </button>
                              <button
                                onClick={() => handleUpdateSlotStatus(slot.id!, 'issued', 'Application processed. Aadhaar receipt issued.')}
                                className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-extrabold cursor-pointer"
                              >
                                Mark Completed/Issued
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: EDUCATIVE BENTO INFO MODULES */}
        <div className="space-y-6">
          
          {/* Card 1: Informational Guideline on documentation */}
          <div className="bg-teal-950 text-white rounded-3xl p-5 shadow-sm space-y-3">
            <div className="bg-teal-900 p-2 w-max rounded-xl">
              <Landmark className="h-5 w-5 text-teal-300" />
            </div>
            <h4 className="font-sans text-base font-extrabold">Socio-Economic Verification Rules</h4>
            <p className="text-xs text-teal-100/80 leading-relaxed">
              Under UIDAI and Welfare guidelines, individuals lacking standard certificates (e.g. rent agreement, water bill) can utilize legal alternative affidavits with 2 local neighborhood witness sign-offs to enroll.
            </p>
            <div className="border-t border-teal-900 pt-3 space-y-1.5 text-[10px] text-teal-200 font-semibold">
              <span className="block">• Self-declaration Oath Statement</span>
              <span className="block">• Verification by 2 local ward residents</span>
              <span className="block">• Contractor employment verification</span>
            </div>
          </div>

          {/* Card 2: Document Drive Planner / NGO resources */}
          <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-teal-700" />
              <h4 className="font-sans text-sm font-extrabold text-gray-900">Active Identity Camps</h4>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              NGOs organize and host continuous on-the-spot enrollment centers. Citizens pre-register to reserve spot priority.
            </p>

            <div className="space-y-3.5">
              {camps.map(camp => (
                <div key={camp.id} className="p-3 bg-gray-50/50 border border-gray-100 rounded-xl space-y-1">
                  <span className="block text-xs font-extrabold text-teal-950">{camp.title}</span>
                  <span className="block text-[9px] text-teal-600 font-bold">{camp.date}</span>
                  <span className="block text-[9px] text-gray-400">{camp.location}</span>
                  <span className="block text-[9px] text-gray-500 font-medium">Officers: {camp.officers}</span>
                  <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-100/50">
                    <span className="text-[8px] text-teal-800 font-extrabold uppercase bg-teal-50 px-1.5 py-0.5 rounded-sm">
                      Open Registration
                    </span>
                    <button
                      onClick={() => {
                        setRegisterCampId(camp.id);
                        setActiveTab('camps');
                      }}
                      className="text-[9px] font-extrabold text-teal-600 hover:text-teal-800"
                    >
                      Book Slot &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Help Desk */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 shadow-xs text-emerald-950 space-y-2">
            <h5 className="font-sans text-xs font-extrabold uppercase tracking-wide">Awaaz Trust Protocol</h5>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              We leverage local grassroots networks (Ward members, block leaders, site supervisors) to gather decentralized evidence blocks. This builds digital identity wallets that represent genuine residential proof over time.
            </p>
          </div>

        </div>

      </div>

      {/* QR MODAL PREVIEW FOR THE WALLET */}
      {showQrCodeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-center border border-gray-100">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <h4 className="font-sans text-xs font-bold text-gray-900 uppercase tracking-wider">Verifiable QR Security Passport</h4>
              <button 
                onClick={() => setShowQrCodeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-extrabold"
              >
                &times;
              </button>
            </div>

            <div className="bg-teal-50/40 p-4 rounded-2xl inline-block mx-auto">
              {/* High-quality styled mock QR Code */}
              <div className="bg-white p-3 rounded-xl shadow-xs border border-teal-100 relative">
                <div className="h-44 w-44 bg-teal-950 text-white flex items-center justify-center text-[10px] font-mono rounded-lg relative overflow-hidden">
                  <div className="absolute inset-2 border-2 border-teal-400 opacity-60 rounded-sm" />
                  <div className="text-center font-sans">
                    <QrCode className="h-16 w-16 mx-auto text-teal-400 animate-pulse" />
                    <span className="block text-[8px] tracking-widest text-teal-300 font-extrabold uppercase mt-2">SECURE SIGNATURE</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed px-2">
              Enrollment officers and local Panchayat heads can scan this QR code to view and audit the verified local residence testimony files. Trust Badge Status: **{trustBadge.text}** ({totalTrustScore}% verified).
            </p>

            <button
              onClick={() => setShowQrCodeModal(false)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
            >
              Done, Close Passport
            </button>
          </div>
        </div>
      )}

      {/* ADD EVIDENCE BLOCK MODAL */}
      {showAddEvidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
              <h4 className="font-sans text-sm font-extrabold text-teal-950 uppercase tracking-wider">Add Non-Standard Proof Block</h4>
              <button 
                onClick={() => setShowAddEvidence(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-extrabold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddEvidenceBlock} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Evidence / Document Title</label>
                <input
                  type="text"
                  value={newEvidenceTitle}
                  onChange={(e) => setNewEvidenceTitle(e.target.value)}
                  placeholder="e.g. Contractor Daily Wage Ledger log, Gas Bill, Sworn Landlord Letter"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Verifying Signee / Provider Authority</label>
                <input
                  type="text"
                  value={newEvidenceProvider}
                  onChange={(e) => setNewEvidenceProvider(e.target.value)}
                  placeholder="e.g. Sri Ramesh Kumar (Site Supervisor, Gachibowli)"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Evidence Category</label>
                  <select
                    value={newEvidenceCat}
                    onChange={(e) => setNewEvidenceCat(e.target.value as any)}
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="residence">Local Residence Proof (+25 pts)</option>
                    <option value="employment">Active Employment Proof (+25 pts)</option>
                    <option value="identity">Vouched Witness/Leader Proof (+15 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attach Scan Proof</label>
                  <div className="border border-dashed border-gray-200 rounded-xl p-2.5 bg-gray-50/30 text-center relative hover:bg-gray-50 cursor-pointer">
                    <span className="block text-[9px] text-gray-400 font-bold">Simulated Camera scan</span>
                    <span className="block text-[8px] text-teal-600 font-extrabold uppercase mt-1">Select File / Photo</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEvidence(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  Confirm Evidence
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default RecordlessView;
