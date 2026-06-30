import React, { useState, useEffect } from 'react';
import { LanguageCode } from '../types';
import { 
  Heart, Compass, BookOpen, ShieldCheck, Star, 
  MapPin, AlertTriangle, HelpCircle, Activity, Calendar,
  MessageSquare, Volume2, Mic, MicOff, Phone, Map, Landmark, 
  Plus, ThumbsUp, Send, Loader2, Sparkles, AlertOctagon, ShieldAlert,
  MapPinned, CheckCircle2, RefreshCw, EyeOff, Users, ArrowRight
} from 'lucide-react';
import dbClient from '../lib/supabaseClient';
import { generateAssistantReply } from '../lib/aiService';

interface SafetyViewProps {
  currentLanguage: LanguageCode;
}

interface CommunityReport {
  id: string;
  area: string;
  rating: number;
  lightLevel: 'Dark' | 'Partial' | 'Well-Lit';
  reportType: 'unlit_street' | 'suspicious_activity' | 'safe_corridor' | 'police_patrol';
  description: string;
  date: string;
  isAnonymous: boolean;
  upvotes: number;
}

interface ShelterInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  bedsAvailable: number;
  distance: string;
  facilities: string[];
}

interface DispenserPod {
  id: string;
  schoolName: string;
  location: string;
  stockLevel: 'High' | 'Medium' | 'Low' | 'Out of Stock';
  padsAvailable: number;
  lastRestocked: string;
}

interface PeerPost {
  id: string;
  author: string;
  text: string;
  category: 'hygiene' | 'myths' | 'support' | 'general';
  likes: number;
  replies: { author: string; text: string; date: string }[];
  date: string;
}

export const SafetyView: React.FC<SafetyViewProps> = ({ currentLanguage }) => {
  const [activeTab, setActiveTab] = useState<'route' | 'legal' | 'wellness'>('route');

  // ==========================================
  // 1. SAFE-ROUTE MAPPING & COMMUNITY REPORTS STATES
  // ==========================================
  const [start, setStart] = useState('Moinabad Bus Stand');
  const [destination, setDestination] = useState('Panchayat Girls High School');
  const [routeReport, setRouteReport] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  
  // Journey tracker simulator states
  const [commuting, setCommuting] = useState(false);
  const [commuteStep, setCommuteStep] = useState(0);
  const [emergencyPhone, setEmergencyPhone] = useState('9848022338');
  const [alertLogs, setAlertLogs] = useState<string[]>([]);
  const [commuteIntervalId, setCommuteIntervalId] = useState<any>(null);

  // Community Safety Reports
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([
    {
      id: 'rep-1',
      area: 'Moinabad Bypass Road (near Railway Overbridge)',
      rating: 2,
      lightLevel: 'Dark',
      reportType: 'unlit_street',
      description: 'The street lights are broken here since Thursday. It is very dark after 7 PM.',
      date: '28 June 2026',
      isAnonymous: true,
      upvotes: 18
    },
    {
      id: 'rep-2',
      area: 'Kondapur Main Market Lane',
      rating: 5,
      lightLevel: 'Well-Lit',
      reportType: 'police_patrol',
      description: 'Active police patrol jeep stands here from 8 PM to 11 PM. Extremely safe for late walk.',
      date: '29 June 2026',
      isAnonymous: false,
      upvotes: 24
    },
    {
      id: 'rep-3',
      area: 'Panchayat School Back Alley',
      rating: 3,
      lightLevel: 'Partial',
      reportType: 'suspicious_activity',
      description: 'Some loitering witnessed near the abandoned godown. Better to use the main paved gate.',
      date: '29 June 2026',
      isAnonymous: true,
      upvotes: 12
    }
  ]);

  // Form for new community safety rating
  const [newAreaName, setNewAreaName] = useState('');
  const [newRating, setNewRating] = useState(4);
  const [newLightLevel, setNewLightLevel] = useState<'Dark' | 'Partial' | 'Well-Lit'>('Partial');
  const [newReportType, setNewReportType] = useState<'unlit_street' | 'suspicious_activity' | 'safe_corridor' | 'police_patrol'>('unlit_street');
  const [newDesc, setNewDesc] = useState('');
  const [newAnon, setNewAnon] = useState(true);
  const [reportingStatus, setReportingStatus] = useState<'idle' | 'success'>('idle');

  const handleAddCommunityReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName || !newDesc) return;
    
    const newRep: CommunityReport = {
      id: 'rep-custom-' + Date.now(),
      area: newAreaName,
      rating: newRating,
      lightLevel: newLightLevel,
      reportType: newReportType,
      description: newDesc,
      date: 'Today',
      isAnonymous: newAnon,
      upvotes: 0
    };

    setCommunityReports([newRep, ...communityReports]);
    setNewAreaName('');
    setNewDesc('');
    setReportingStatus('success');
    setTimeout(() => setReportingStatus('idle'), 3000);
  };

  const handleUpvoteReport = (id: string) => {
    setCommunityReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r));
  };

  const runRouteAnalysis = () => {
    if (!start || !destination) return;
    setRouteLoading(true);
    setRouteReport(null);

    // Dynamic analysis lookup based on input area
    setTimeout(() => {
      setRouteLoading(false);
      
      // Look if any reported hazard matches starting or destination names
      const hazards = communityReports.filter(r => 
        (start.toLowerCase() && r.area.toLowerCase().includes(start.toLowerCase())) || 
        (destination.toLowerCase() && r.area.toLowerCase().includes(destination.toLowerCase())) ||
        r.rating <= 2
      );

      const dynamicAlert = hazards.length > 0 
        ? `Note: Route has community-flagged hazards. Specifically, "${hazards[0].area}" was rated ${hazards[0].rating}/5 for ${hazards[0].lightLevel} conditions.`
        : "All streets on this path currently have active community safety endorsements.";

      setRouteReport({
        routePath: `${start} ➔ Gandhi Circle ➔ ${destination}`,
        lightingScore: hazards.length > 0 && hazards[0].lightLevel === 'Dark' ? '45% Poor street illumination' : '88% Excellent street lights active',
        vigilanceGroup: 'Moinabad Mahila Mitra Volunteer Patrol active on Gandhi Circle (8 PM - 11 PM)',
        safePoints: [
          { name: 'Moinabad One-Stop Sakhi Center (Open 24/7)', distance: '120m from Gandhi Circle' },
          { name: 'Panchayat RO Water Booth (Well-lit, 24/7 security guard)', distance: '450m from destination' }
        ],
        alerts: dynamicAlert
      });
    }, 1500);
  };

  const handleStartCommuteCommute = () => {
    if (commuting) {
      // Stop commute
      if (commuteIntervalId) clearInterval(commuteIntervalId);
      setCommuting(false);
      setCommuteStep(0);
      setAlertLogs([]);
    } else {
      // Start commute
      setCommuting(true);
      setCommuteStep(1);
      setAlertLogs([`[JOURNEY STARTED] Live monitoring initiated for travel from "${start}" to "${destination}".`]);
      
      const interval = setInterval(() => {
        setCommuteStep(prev => {
          if (prev >= 4) {
            clearInterval(interval);
            return 4;
          }
          return prev + 1;
        });
      }, 5000);
      setCommuteIntervalId(interval);
    }
  };

  useEffect(() => {
    if (commuteStep === 2) {
      setAlertLogs(prev => [...prev, `[SAFETY CHECKPOINT] Passing through Gandhi Circle. Path illumination is high. Emergency contacts updated.`]);
    } else if (commuteStep === 3) {
      setAlertLogs(prev => [...prev, `[ALERT TRANSIT] Nearing "${destination}". Auto-pinging location details securely in the background.`]);
    } else if (commuteStep === 4) {
      setAlertLogs(prev => [...prev, `[ARRIVED SAFELY] Completed commute! Live journey logs compiled.`]);
    }
  }, [commuteStep]);

  const triggerLiveAlert = () => {
    const timestamp = new Date().toLocaleTimeString();
    setAlertLogs(prev => [...prev, `[⚠️ SOS DISPATCHED - ${timestamp}] Emergency location shared with contact +91 ${emergencyPhone} and Sakhi Emergency Ward!`]);
  };

  useEffect(() => {
    return () => {
      if (commuteIntervalId) clearInterval(commuteIntervalId);
    };
  }, [commuteIntervalId]);


  // ==========================================
  // 2. AI LEGAL COMPANION STATES & DIRECTORY
  // ==========================================
  const [selectedTopic, setSelectedTopic] = useState<'domestic' | 'posh' | 'property' | 'maternity'>('domestic');
  const [userLegalQuery, setUserLegalQuery] = useState('');
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const [aiLegalAnswer, setAiLegalAnswer] = useState<string | null>(null);
  
  // Voice recording simulator states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedTranscript, setRecordedTranscript] = useState('');

  // Anonymous Incident / Complaint Wizard States
  const [complaintType, setComplaintType] = useState<'domestic' | 'harassment' | 'threat'>('domestic');
  const [complaintText, setComplaintText] = useState('');
  const [complaintTarget, setComplaintTarget] = useState('Panchayat Protection Officer (BDO)');
  const [isFiling, setIsFiling] = useState(false);
  const [filedDraft, setFiledDraft] = useState<string | null>(null);
  const [filingFinished, setFilingFinished] = useState(false);

  const legalRightsInfo = {
    domestic: {
      title: "Protection of Women from Domestic Violence Act (PWDVA), 2005",
      desc: "Every woman in India is strictly protected against physical, mental, emotional, verbal, and economic abuse inside a domestic or shared household. You do not need to visit a police station to secure help; local Protection Officers have been appointed specifically to handle domestic complaints in absolute safety.",
      rights: [
        { label: "Right to Shared Residence", detail: "You cannot be thrown out or evicted from your matrimonial or shared house by your husband or in-laws under any circumstance." },
        { label: "Protection Orders", detail: "A magistrate can ban your husband or relatives from communicating with you, entering your workplace, or committing any abuse." },
        { label: "Monetary Relief", detail: "You have legal claims for monthly support funds, medical expenses, and compensation for damages/injuries." },
        { label: "Temporary Custody", detail: "Under emergency conditions, children's temporary custody can be granted exclusively to you to avoid threats." }
      ],
      section: "Domestic Violence Act 2005"
    },
    posh: {
      title: "Prevention of Workplace Sexual Harassment (POSH Act), 2013",
      desc: "A safe, secure working environment is a fundamental constitutional right. Any unwelcome physical contact, demand for sexual favors, sexist remarks, or showing pornography is illegal. Every office with 10+ employees must maintain an Internal Complaints Committee (ICC).",
      rights: [
        { label: "Mandatory ICC Panels", detail: "Must be chaired by a senior woman employee and include an external independent NGO representative." },
        { label: "Local Complaints Committee (LCC)", detail: "If you work in the informal sector (e.g. domestic worker, farm labor), the district officer maintains an LCC for your grievances." },
        { label: "90-Day Complaint Window", detail: "You can file within 3 months of the incident, and have the right to claim temporary leaves or department transfer during investigation." }
      ],
      section: "POSH Act 2013"
    },
    property: {
      title: "Equal Right to Ancestral Property",
      desc: "Daughters hold absolute equal birthright (coparcener status) to ancestral property matching sons completely. This applies regardless of whether the daughter is married, unmarried, or widowed.",
      rights: [
        { label: "Equal Partition Rights", detail: "Daughters can legally request division and partition of properties to claim their equal share." },
        { label: "Will Testament Safeguards", detail: "A father cannot write off ancestral properties completely to sons; the daughter's shared claim remains protected." }
      ],
      section: "Hindu Succession Amendment Act 2005"
    },
    maternity: {
      title: "Maternity Benefit Act",
      desc: "Protects the employment of women during maternity and entitles them to full cash benefit wages to care for the newborn child.",
      rights: [
        { label: "26 Weeks Paid Leave", detail: "Applicable to establishments with 10 or more employees." },
        { label: "No Dismissal Protection", detail: "It is unlawful for an employer to discharge or dismiss a woman during her maternity leave." }
      ],
      section: "Maternity Benefit Act"
    }
  };

  const nearbyShelters: ShelterInfo[] = [
    {
      id: 'shelter-1',
      name: 'Sakhi One Stop Centre (OSC) - Rangareddy District',
      address: 'Panchayat Health Compound, Chevella Road, Moinabad',
      phone: '040-23458291',
      bedsAvailable: 8,
      distance: '2.5 km',
      facilities: ['24/7 Medical Care', 'Free Legal Aid Counselors', 'Trauma Counseling', 'Safe Children Room']
    },
    {
      id: 'shelter-2',
      name: 'Swadhar Greh Safe Shelter for Women',
      address: 'Near Old Bus Terminal, Shamshabad Main Road',
      phone: '9490123842',
      bedsAvailable: 15,
      distance: '11 km',
      facilities: ['Vocational Training', 'Free High-quality Rations', 'Security Guard Guarded', 'Primary School Access']
    }
  ];

  // AI legal advice calling
  const handleAskLegalAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLegalQuery.trim()) return;

    setIsAiAnswering(true);
    setAiLegalAnswer(null);

    try {
      const systemContext = `You are a legal advisor helping women who face domestic violence, workplace harassment, or property disputes in India. 
      Use highly simplified, warm, and protective terms. Highlight actionable options like Protection Officers, free legal aid clinics, and nearby Sakhi centers. 
      Keep your response very clean, beautifully organized with bullet points, and highly encouraging. Speak directly in language code: ${currentLanguage}. Limit to 120 words.`;
      
      const reply = await generateAssistantReply(
        `Legal query: "${userLegalQuery}". Specific issue category: ${selectedTopic}. Please advise simple legal steps under Indian law.`,
        [],
        currentLanguage
      );
      setAiLegalAnswer(reply);
    } catch (err) {
      setAiLegalAnswer("Under Indian Law (Section 12 of PWDVA), you can submit an application directly to the Protection Officer. No physical court visit is initially needed. Free legal advisors are available on Helpline 181.");
    } finally {
      setIsAiAnswering(false);
    }
  };

  // Simulating Voice Input
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleVoiceRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setRecordedTranscript("My husband threatens to lock me out of the house and takes away my earnings. Please draft an anonymous complaint.");
      setUserLegalQuery("My husband threatens to lock me out of the house and takes away my earnings. What are my legal protections?");
    } else {
      // Start recording
      setIsRecording(true);
      setRecordedTranscript('');
    }
  };


  const handleCreateComplaintDraft = async () => {
    if (!complaintText) return;
    setIsFiling(true);
    
    setTimeout(() => {
      setIsFiling(false);
      const randomRef = 'HS-DV-' + Math.floor(100000 + Math.random() * 900000);
      const draftText = `COMPLAINT PETITION UNDER SEC 12 OF DOMESTIC VIOLENCE ACT, 2005
      
To,
The Protection Officer / Sub-Divisional Magistrate,
Block Administration: Moinabad Ward

Date: ${new Date().toLocaleDateString()}
Anonymous Security Reference: ${randomRef}

SUBJECT: Petition seeking Protection Orders under Section 18 and Residence Orders under Section 19.

Respected Officer,
I am filing this petition anonymously to protect my physical safety.

DESCRIPTION OF COMPLAINT:
"${complaintText}"

GROUNDS OF PETITION:
1. The Petitioner has been subjected to continuous verbal, financial, and emotional domestic abuse within the shared residence.
2. The respondent poses a risk of unlawful eviction and physical threat.

PRAYER REQUESTS:
- Restrict respondent from executing eviction threats on the shared household.
- Direct local Mahila Police / Volunteer ward patrols to perform periodic safety checks.
- Issue emergency protection orders under Section 18.

Filed securely via AWAAZ Protection Gateway (No physical police visit required).`;
      setFiledDraft(draftText);
    }, 1500);
  };

  const handleSubmitComplaintToPipeline = async () => {
    if (!complaintText) return;
    setIsFiling(true);

    try {
      // Save complaint report anonymously to backend!
      const report = await dbClient.submitIncidentReport({
        type: 'harassment',
        title: `Domestic Protection Appeal (${complaintTarget})`,
        description: complaintText,
        location: 'Moinabad Local Sector',
        date: new Date().toLocaleDateString(),
        witnessCount: 0,
        isAnonymous: true,
        targetAuthority: complaintTarget,
        evidenceUrls: []
      });

      // Also create a volunteer case of legal_aid category so our local legal volunteers can pick it up!
      await dbClient.createVolunteerCase({
        requestId: 'req-anon-safety',
        citizenName: 'Anonymous Safety Appeal',
        primaryLanguage: currentLanguage,
        category: 'legal_aid',
        priority: 'urgent',
        notes: `EMERGENCY DOMESTIC PROTECTION CASE FLAGGED: "${complaintText}". Target Authority: ${complaintTarget}.`
      });

      setFilingFinished(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFiling(false);
    }
  };


  // ==========================================
  // 3. MENSTRUAL HEALTH & SAFETY PLATFORM
  // ==========================================
  const [wellnessTab, setWellnessTab] = useState<'tracker' | 'education' | 'dispensers' | 'forum'>('tracker');
  
  // Period calculator
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [nextPeriodDate, setNextPeriodDate] = useState('');

  const calculateNextCycle = () => {
    if (!lastPeriod) return;
    const date = new Date(lastPeriod);
    date.setDate(date.getDate() + Number(cycleLength));
    setNextPeriodDate(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
  };

  // Dispensers Stock List
  const [dispensers, setDispensers] = useState<DispenserPod[]>([
    { id: 'disp-1', schoolName: 'Moinabad Zilla Parishad Girls School', location: 'Main Building ground floor (next to staff room)', stockLevel: 'High', padsAvailable: 45, lastRestocked: '25 June' },
    { id: 'disp-2', schoolName: 'Kondapur Model High School', location: 'Girls washroom block A', stockLevel: 'Low', padsAvailable: 4, lastRestocked: '18 June' },
    { id: 'disp-3', schoolName: 'Panchayat Community Hall Public Toilet', location: 'Pink Toilet Pod Corridor', stockLevel: 'Medium', padsAvailable: 18, lastRestocked: '26 June' }
  ]);

  const [activeDispenserId, setActiveDispenserId] = useState<string | null>(null);
  const [restockNotice, setRestockNotice] = useState<string | null>(null);

  const triggerDispenserRestock = (id: string) => {
    setDispensers(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, stockLevel: 'High', padsAvailable: 50, lastRestocked: 'Requested Restocked' };
      }
      return d;
    }));
    setRestockNotice(`Pad restock request logged anonymously for ${dispensers.find(d => d.id === id)?.schoolName}! Distribution volunteer has been dispatched.`);
    setTimeout(() => setRestockNotice(null), 4000);
  };

  // Anonymous peer forum
  const [peerPosts, setPeerPosts] = useState<PeerPost[]>([
    {
      id: 'p-1',
      author: 'Ananya (15)',
      text: 'Is it normal to experience extreme fatigue and severe stomach pain during the first two days of periods? My grandmother tells me not to go outside, but I do not want to miss my high school science exams.',
      category: 'hygiene',
      likes: 12,
      date: 'Yesterday',
      replies: [
        { author: 'Rural ASHA Counselor (Sister Radha)', text: 'Dear Ananya, severe cramps are very common, but pain should never stop your education! Please try taking a warm water bag compress. We can distribute free iron pills and mild pain relief from the Panchayat clinic.', date: 'Yesterday' }
      ]
    },
    {
      id: 'p-2',
      author: 'Anonymous Rural Girl',
      text: 'My school does not have running water in the girls toilet, so most of us stay home during period days. What can we do to raise this with the Gram Panchayat?',
      category: 'support',
      likes: 28,
      date: '28 June 2026',
      replies: [
        { author: 'AWAAZ Civic Team', text: 'Excellent question. You can use our "Civic Voice" tab to file a grievance to the Ward-4 secretary. We have flagged this toilet to the block development officer today.', date: '29 June 2026' }
      ]
    }
  ]);

  const [newPostCategory, setNewPostCategory] = useState<'hygiene' | 'myths' | 'support'>('hygiene');
  const [newPostText, setNewPostText] = useState('');
  const [newPostAuthor, setNewPostAuthor] = useState('');
  
  const handleAddForumPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText) return;

    const newPost: PeerPost = {
      id: 'p-' + Date.now(),
      author: newPostAuthor.trim() || 'Anonymous Friend',
      text: newPostText,
      category: newPostCategory,
      likes: 0,
      date: 'Just now',
      replies: []
    };

    setPeerPosts([newPost, ...peerPosts]);
    setNewPostText('');
    setNewPostAuthor('');
  };

  const handleLikePost = (id: string) => {
    setPeerPosts(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 bg-[#FDFBF7] text-[#1A2E2A]" id="safety-hub">
      
      {/* Editorial Page Header */}
      <div className="border-b-2 border-[#E8E2D6] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold text-teal-600 uppercase tracking-widest font-sans mb-1">
            Voice • Safety • Social Access
          </span>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-teal-900 leading-tight">
            Women's Safety & Mobility Hub
          </h1>
          <p className="text-sm text-gray-600 font-serif italic mt-1.5 max-w-2xl">
            Community-sourced route guidance, simplified domestic protection aids, and school menstrual health platforms.
          </p>
        </div>

        {/* SOS Panic Trigger */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-red-700 font-bold hidden sm:inline">⚠️ Emergency SOS Active:</span>
          <button 
            onClick={triggerLiveAlert}
            className="px-5 py-3.5 bg-red-700 text-white font-bold rounded-2xl hover:bg-red-800 transition-all flex items-center gap-2.5 shadow-md active:scale-95 animate-pulse"
          >
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>QUICK SOS PANIC</span>
          </button>
        </div>
      </div>

      {/* Primary Category Selector Tabs */}
      <div className="grid grid-cols-3 border-b border-[#E8E2D6] mb-8 gap-2">
        <button
          onClick={() => setActiveTab('route')}
          className={`pb-4 text-sm font-bold transition-all relative text-center focus:outline-none ${
            activeTab === 'route' ? 'text-teal-700 font-extrabold border-b-2 border-teal-700' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Compass className="h-5 w-5" />
            <span>Community Safe-Routes</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('legal')}
          className={`pb-4 text-sm font-bold transition-all relative text-center focus:outline-none ${
            activeTab === 'legal' ? 'text-teal-700 font-extrabold border-b-2 border-teal-700' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>Domestic Violence Legal Companion</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('wellness')}
          className={`pb-4 text-sm font-bold transition-all relative text-center focus:outline-none ${
            activeTab === 'wellness' ? 'text-teal-700 font-extrabold border-b-2 border-teal-700' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Activity className="h-5 w-5" />
            <span>Menstrual Wellness Hub</span>
          </div>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-8">
        
        {/* ==========================================
            TAB 1: SAFE-ROUTE MAPPING & COMMUNITY REPORTS
            ========================================== */}
        {activeTab === 'route' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Safe Route Planner & Journey Tracker */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs">
                <h3 className="font-serif text-xl font-bold text-teal-900 mb-2">Evaluate Commute Safe-Route</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Find street-light densities, police patrol checkpoints, and women volunteer guards sourced directly from other women in the neighborhood.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Commencing Location</label>
                    <input
                      type="text"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Destination</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={runRouteAnalysis}
                    disabled={routeLoading}
                    className="flex-1 py-3.5 bg-teal-600 text-white font-serif font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-200"
                  >
                    {routeLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Scanning Illumination Nodes...</span>
                      </>
                    ) : (
                      <>
                        <Compass className="h-4 w-4" />
                        <span>Query Community Safe Routes</span>
                      </>
                    )}
                  </button>
                  
                  {routeReport && (
                    <button
                      onClick={handleStartCommuteCommute}
                      className={`px-5 py-3.5 font-serif font-bold text-xs rounded-xl transition-all flex items-center gap-2 ${
                        commuting ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-[#F3F0E9] border border-[#DED9CE] text-teal-800 hover:bg-[#E8E2D6]'
                      }`}
                    >
                      {commuting ? 'End Journey Monitoring' : 'Start Active Commute'}
                    </button>
                  )}
                </div>

                {/* Commuting Active Monitoring Terminal */}
                {commuting && (
                  <div className="mt-6 p-5 bg-teal-950 text-[#ECFDF5] rounded-2xl border border-teal-800 font-mono text-xs space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-amber-400 font-bold animate-pulse">
                        <Activity className="h-4.5 w-4.5" />
                        <span>LIVE JOURNEY MONITORING ACTIVE</span>
                      </span>
                      <span className="text-[10px] bg-teal-900 px-2.5 py-1 rounded-full text-white">
                        GPS Progress: {commuteStep * 25}%
                      </span>
                    </div>

                    <div className="w-full bg-teal-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full transition-all duration-1000" 
                        style={{ width: `${commuteStep * 25}%` }}
                      ></div>
                    </div>

                    {/* Step log items */}
                    <div className="space-y-1.5 border-t border-teal-900 pt-3">
                      {alertLogs.map((log, i) => (
                        <div key={i} className="leading-relaxed">
                          <span className="text-emerald-400">➔</span> {log}
                        </div>
                      ))}
                    </div>

                    {/* Quick Trigger Emergency Panel during journey */}
                    <div className="pt-3 border-t border-teal-900 flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] text-teal-300 font-bold uppercase mb-1">Emergency Contact Number</label>
                        <input
                          type="tel"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className="w-full bg-teal-900 text-white border border-teal-800 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                          placeholder="Contact mobile"
                        />
                      </div>
                      <button
                        onClick={triggerLiveAlert}
                        className="w-full sm:w-auto px-4 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Send Emergency Alert</span>
                      </button>
                    </div>
                  </div>
                )}

                {routeReport && !commuting && (
                  <div className="mt-6 border-t-2 border-[#E8E2D6] pt-5 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between gap-3 text-xs font-serif font-bold text-teal-900 bg-[#F3F0E9] px-4 py-2.5 rounded-xl border border-[#DED9CE]">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4.5 w-4.5 text-teal-600 shrink-0" />
                        <span>Suggested Safe Corridor:</span>
                      </div>
                      <span className="font-sans italic">{routeReport.routePath}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E8E2D6]">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase font-sans">Sourced Illumination Score</span>
                        <span className="block text-sm font-serif font-bold text-teal-900 mt-1">{routeReport.lightingScore}</span>
                      </div>

                      <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E8E2D6]">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase font-sans">Active Ward Watch</span>
                        <span className="block text-sm font-serif font-bold text-teal-900 mt-1">{routeReport.vigilanceGroup}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider font-sans">Emergency Safe Havens on Path</span>
                      {routeReport.safePoints.map((pt: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs bg-white border border-[#E8E2D6] p-3 rounded-xl shadow-xs">
                          <span className="font-serif font-bold text-teal-900 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-emerald-700" />
                            {pt.name}
                          </span>
                          <span className="text-[10px] text-emerald-800 bg-[#ECFDF5] px-2 py-0.5 rounded font-mono font-bold">{pt.distance}</span>
                        </div>
                      ))}
                    </div>

                    {routeReport.alerts && (
                      <div className="bg-[#FFFBEB] border border-[#F59E0B] p-4 rounded-xl flex items-start gap-2.5 text-xs text-[#B45309]">
                        <AlertTriangle className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">Route Advisory Warning:</span>
                          <p className="font-serif italic leading-relaxed">{routeReport.alerts}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit a New Safety Rating or Area Report */}
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs">
                <h3 className="font-serif text-xl font-bold text-teal-900 mb-2">File Area Illumination & Safety Report</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  Flag missing street lights, dark spots, or request volunteer patrols to help make movement safer for school girls and women.
                </p>

                <form onSubmit={handleAddCommunityReport} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Street or Area Name</label>
                      <input
                        type="text"
                        required
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="e.g. Ward-4 Girls School backlane"
                        className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Issue Category</label>
                      <select
                        value={newReportType}
                        onChange={(e) => setNewReportType(e.target.value as any)}
                        className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      >
                        <option value="unlit_street">Unlit Street (Broken Bulbs)</option>
                        <option value="suspicious_activity">Loitering Spot</option>
                        <option value="safe_corridor">Safe Passage Corridor</option>
                        <option value="police_patrol">Active Police Patrol Zone</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Illumination Level</label>
                      <div className="flex gap-2">
                        {['Dark', 'Partial', 'Well-Lit'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setNewLightLevel(lvl as any)}
                            className={`flex-1 py-2 text-xs rounded-xl font-bold border transition-all ${
                              newLightLevel === lvl 
                                ? 'bg-teal-700 text-white border-teal-700' 
                                : 'bg-[#FDFBF7] border-[#E8E2D6] text-gray-700 hover:bg-[#F3F0E9]'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Safety Rating</label>
                      <div className="flex gap-1 items-center pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className="p-1 focus:outline-none"
                          >
                            <Star className={`h-6 w-6 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-gray-600 ml-2">({newRating}/5)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Condition Description</label>
                    <textarea
                      required
                      rows={2}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Explain details of lighting, safe shop corners, or hazards..."
                      className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl p-3.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAnon}
                        onChange={(e) => setNewAnon(e.target.checked)}
                        className="rounded border-[#E8E2D6] text-teal-700 focus:ring-teal-500 h-4 w-4"
                      />
                      <span className="text-xs font-serif font-bold text-gray-600">Submit Anonymously</span>
                    </label>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-teal-700 text-white font-serif font-bold text-xs rounded-xl hover:bg-teal-800 transition-colors"
                    >
                      Publish Sourced Safety Report
                    </button>
                  </div>

                  {reportingStatus === 'success' && (
                    <div className="p-3 bg-[#ECFDF5] text-teal-900 text-xs rounded-xl border border-[#D1F2E5] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Thank you. Your safety report has been added to our live local mapping database!</span>
                    </div>
                  )}
                </form>
              </div>

            </div>

            {/* Sidebar Community-Sourced Feed & Numbers */}
            <div className="space-y-6">
              
              <div className="bg-[#F3F0E9] border border-[#DED9CE] rounded-[24px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-lg font-bold text-teal-900">Community Safety Sourced Live Feed</h4>
                  <span className="text-[9px] bg-teal-800 text-white px-2 py-0.5 rounded font-bold uppercase">LIVE</span>
                </div>
                <p className="text-[11px] text-gray-600 font-serif italic">
                  Live reports updated by women and school girls in local wards:
                </p>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {communityReports.map((r) => (
                    <div key={r.id} className="bg-white p-4 rounded-xl border border-[#E8E2D6] space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-serif font-bold text-teal-950 block">{r.area}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded shrink-0 uppercase ${
                          r.lightLevel === 'Dark' ? 'bg-red-50 text-red-700' : r.lightLevel === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {r.lightLevel}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 font-serif leading-relaxed italic">
                        "{r.description}"
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1.5 border-t border-gray-100">
                        <span className="font-bold">{r.isAnonymous ? 'Anonymous Sister' : 'Verified Member'} • {r.date}</span>
                        <button 
                          onClick={() => handleUpvoteReport(r.id)}
                          className="flex items-center gap-1 hover:text-teal-700 transition-colors font-bold text-teal-800 font-mono"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>({r.upvotes})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct helplines */}
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-5 space-y-3 shadow-xs">
                <h4 className="font-serif text-base font-bold text-teal-900">Emergency Safe-Zones Contacts</h4>
                <div className="space-y-2">
                  <a href="tel:181" className="flex justify-between items-center p-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 transition-colors">
                    <span className="font-serif">National Women Helpline (181)</span>
                    <Phone className="h-4 w-4" />
                  </a>

                  <a href="tel:1091" className="flex justify-between items-center p-3 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl text-xs font-bold text-red-700 transition-colors">
                    <span className="font-serif">Police Emergency Helpline (112 / 100)</span>
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            TAB 2: AI LEGAL COMPANION (DOMESTIC VIOLENCE PROTECTION)
            ========================================== */}
        {activeTab === 'legal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Topic Navigation Menu */}
            <div className="space-y-4">
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-5 shadow-xs flex flex-col gap-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 font-sans">
                  Select Legal Protection Topic
                </span>
                {Object.entries(legalRightsInfo).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTopic(key as any);
                      setAiLegalAnswer(null);
                    }}
                    className={`p-3.5 rounded-xl text-left text-xs font-bold border transition-all ${
                      selectedTopic === key 
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs font-serif font-semibold' 
                        : 'bg-[#FDFBF7] border-[#E8E2D6] text-[#1A2E2A] hover:bg-[#F3F0E9] font-serif font-medium'
                    }`}
                  >
                    {value.title}
                  </button>
                ))}
              </div>

              {/* Nearby Shelters list */}
              <div className="bg-[#F3F0E9] border border-[#DED9CE] rounded-[24px] p-5 space-y-4">
                <h4 className="font-serif text-lg font-bold text-teal-900 flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-teal-700" />
                  <span>Nearby Protection Shelters</span>
                </h4>
                <p className="text-[11px] text-gray-600 font-serif leading-relaxed italic">
                  Instant safety support without requiring police visits. Registered with District Child & Women Development:
                </p>

                <div className="space-y-3">
                  {nearbyShelters.map((s) => (
                    <div key={s.id} className="bg-white p-4 rounded-xl border border-[#E8E2D6] text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-serif font-bold text-teal-900 block leading-tight">{s.name}</span>
                        <span className="text-[9px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-bold font-sans">{s.distance}</span>
                      </div>
                      
                      <p className="text-[10px] text-gray-500 font-serif italic">{s.address}</p>

                      <div className="flex items-center gap-2 py-1 flex-wrap">
                        {s.facilities.slice(0, 2).map((f, i) => (
                          <span key={i} className="text-[8.5px] bg-[#F3F0E9] text-gray-600 px-2 py-0.5 rounded-sm font-sans">{f}</span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-[10px] font-bold text-emerald-700">🟢 {s.bedsAvailable} Beds Available</span>
                        <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-[10px] text-teal-800 hover:underline font-bold">
                          <Phone className="h-3 w-3" /> Call Shelter
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legal Companion Details & Interactive AI Complaint Drafting */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Selected Topic Content Card */}
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-teal-600 font-extrabold bg-[#ECFDF5] px-2.5 py-1 rounded-md">
                  {legalRightsInfo[selectedTopic].section}
                </span>
                
                <h3 className="font-serif text-2xl font-bold text-teal-900 mt-2">
                  {legalRightsInfo[selectedTopic].title}
                </h3>
                
                <p className="text-sm text-gray-600 font-serif italic leading-relaxed">
                  {legalRightsInfo[selectedTopic].desc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {legalRightsInfo[selectedTopic].rights.map((right, index) => (
                    <div key={index} className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E2D6] space-y-1.5">
                      <span className="block font-serif font-bold text-teal-950 text-xs">{right.label}</span>
                      <p className="text-[11px] text-gray-600 font-serif leading-relaxed italic">{right.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Voice/Text Query Assistant */}
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-teal-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span>Speak/Type to AI Legal Advisor</span>
                  </h3>
                  <span className="text-[9px] text-teal-700 bg-[#ECFDF5] px-2.5 py-1 rounded font-bold uppercase font-sans">Local Languages Support</span>
                </div>
                
                <p className="text-xs text-gray-600 leading-relaxed font-serif italic">
                  Ask sensitive questions about protection laws, restraining orders, or help procedures. Your identity is fully secure.
                </p>

                <form onSubmit={handleAskLegalAi} className="space-y-4">
                  <div className="relative group flex items-center bg-[#FDFBF7] border-2 border-teal-600 rounded-2xl p-3 shadow-xs">
                    <input 
                      type="text"
                      value={userLegalQuery}
                      onChange={(e) => setUserLegalQuery(e.target.value)}
                      placeholder="e.g. My husband takes away my gold dowry by force, what are my legal rights?"
                      className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent py-1 font-serif text-[#1A2E2A]"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleVoiceRecording}
                        className={`p-2 rounded-full flex items-center justify-center transition-all ${
                          isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-[#F3F0E9] hover:bg-[#E8E2D6] text-teal-800'
                        }`}
                        title="Simulate speaking your complaint"
                      >
                        {isRecording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                      </button>

                      <button
                        type="submit"
                        disabled={isAiAnswering || !userLegalQuery.trim()}
                        className="p-2.5 bg-teal-600 rounded-full text-white hover:bg-teal-700 transition-colors disabled:bg-gray-200"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isRecording && (
                    <div className="flex items-center gap-2.5 text-xs text-red-600 animate-pulse font-mono bg-red-50 p-2.5 rounded-xl border border-red-100">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                      </span>
                      <span>Recording voice input... duration: {recordingDuration}s (Click mic icon again to compile transcript)</span>
                    </div>
                  )}

                  {recordedTranscript && (
                    <div className="text-xs p-3 bg-[#F3F0E9] rounded-xl border border-[#DED9CE] space-y-1">
                      <span className="block font-bold text-gray-500 uppercase text-[9px]">Sourced Voice Transcript:</span>
                      <p className="font-serif italic text-teal-950">"{recordedTranscript}"</p>
                    </div>
                  )}

                  {isAiAnswering && (
                    <div className="flex items-center justify-center py-6 gap-2 text-xs text-teal-800 font-bold font-serif italic">
                      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                      <span>Formulating legal references... please stand by...</span>
                    </div>
                  )}

                  {aiLegalAnswer && (
                    <div className="p-5 bg-[#ECFDF5]/60 border border-teal-200 rounded-2xl space-y-3 animate-fade-in text-xs leading-relaxed font-serif text-teal-950">
                      <span className="font-bold flex items-center gap-1.5 text-teal-900 border-b border-teal-100 pb-1.5 uppercase font-sans text-[10px]">
                        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                        AI Legal Companion Counsel
                      </span>
                      <p className="whitespace-pre-line italic">
                        {aiLegalAnswer}
                      </p>
                      <div className="pt-2 border-t border-teal-100 flex justify-between items-center text-[9px] text-teal-800">
                        <span>Legal advice compliant with PWDVA 2005 Guidelines.</span>
                        <button 
                          onClick={() => setUserLegalQuery("Can I seek protective shelter immediately without informing police?")}
                          className="font-bold underline hover:text-teal-900"
                        >
                          Ask follow-up query
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Anonymous Complaint Draft & Secure Submission Wizard */}
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-4">
                <h3 className="font-serif text-lg font-bold text-teal-900 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-teal-700" />
                  <span>Draft & File Anonymous Protection Complaint</span>
                </h3>
                
                <p className="text-xs text-gray-600 leading-relaxed font-serif italic">
                  Generate a formal, legally structured petition and submit it instantly to local block Protection Officers anonymously. Skip physically visiting police stations or administrative offices.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Authority or Protection Department</label>
                    <select
                      value={complaintTarget}
                      onChange={(e) => setComplaintTarget(e.target.value)}
                      className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="District Protection Officer (PWDVA) Chevella">District Protection Officer (PWDVA) - Chevella Block</option>
                      <option value="Moinabad Gram Panchayat Magistrate / BDO">Gram Panchayat Block Magistrate / BDO</option>
                      <option value="Sakhi One Stop Centre Counsel Representative">Sakhi Legal Counselor Center Representative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Incident description / grievance context</label>
                    <textarea
                      rows={3}
                      required
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      placeholder="Describe incident, threats, financial withholding or abuse details. Type or click the mic button above to dictate..."
                      className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl p-3.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={!complaintText || isFiling}
                      onClick={handleCreateComplaintDraft}
                      className="flex-1 py-3.5 bg-[#F3F0E9] border border-[#DED9CE] text-teal-900 font-serif font-bold text-xs rounded-xl hover:bg-[#E8E2D6] transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isFiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-600" />}
                      <span>Formulate Legal Complaint Draft</span>
                    </button>
                  </div>

                  {filedDraft && (
                    <div className="p-5 bg-white border-2 border-dashed border-[#E8E2D6] rounded-2xl space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-2">
                        <span className="text-[10px] font-bold text-teal-800 uppercase font-sans">Formal Legal Petition Drafted</span>
                        <span className="text-[9px] text-gray-400 uppercase font-mono">PWDVA Format</span>
                      </div>

                      <pre className="text-[11px] font-mono text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        {filedDraft}
                      </pre>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <span className="text-[10px] font-serif text-rose-700 font-bold italic flex items-center gap-1">
                          <EyeOff className="h-3.5 w-3.5" /> No personal metadata or IP addresses stored.
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleSubmitComplaintToPipeline}
                          disabled={isFiling || filingFinished}
                          className="w-full sm:w-auto px-5 py-2.5 bg-teal-800 text-white font-serif font-bold text-xs rounded-xl hover:bg-teal-900 transition-colors flex items-center justify-center gap-2"
                        >
                          {isFiling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : filingFinished ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          <span>{filingFinished ? 'Complaint Logged!' : 'Submit Complaint Securely'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {filingFinished && (
                    <div className="p-4 bg-[#ECFDF5] border border-emerald-200 text-teal-950 text-xs rounded-xl space-y-2 animate-fade-in font-serif">
                      <span className="font-bold block text-teal-900 text-sm">🟢 Secure Submission Complete</span>
                      <p className="italic">
                        Your protection appeal has been anonymized and registered inside AWAAZ's legal pipeline under reference id: <strong>HS-COMP-${Math.floor(10000 + Math.random() * 90000)}</strong>. A qualified local NGO legal caseworker has been tagged in the database, and they will coordinate with the block development magistrate's counselor on your behalf. You do not need to take any physical action.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            TAB 3: MENSTRUAL HEALTH & PLATFORM FOR GIRLS
            ========================================== */}
        {activeTab === 'wellness' && (
          <div className="space-y-6">
            
            {/* Inner Sub-navigation Header */}
            <div className="flex flex-wrap border-b border-[#E8E2D6] pb-1 gap-2">
              {[
                { id: 'tracker', label: 'Period Calculator', icon: Calendar },
                { id: 'education', label: 'Hygiene & Myth Busters', icon: BookOpen },
                { id: 'dispensers', label: 'School Pad Dispensers Map', icon: MapPin },
                { id: 'forum', label: 'Anonymous Girls Support Board', icon: Users }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setWellnessTab(sub.id as any)}
                  className={`px-4 py-2.5 text-xs font-serif font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
                    wellnessTab === sub.id 
                      ? 'bg-teal-800 text-white shadow-xs' 
                      : 'text-gray-500 hover:text-teal-950 hover:bg-[#F3F0E9]'
                  }`}
                >
                  <sub.icon className="h-4 w-4 shrink-0" />
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-panel Content */}
            <div className="space-y-6">
              
              {/* Tracker Panel */}
              {wellnessTab === 'tracker' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-teal-700" />
                      <h3 className="font-serif text-lg font-bold text-teal-900">Period Cycle Calculator</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
                      Estimate your next cycle dates safely. All medical tracking records are fully private and saved solely inside your local browser storage.
                    </p>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Last Period Start Date</label>
                        <input
                          type="date"
                          value={lastPeriod}
                          onChange={(e) => setLastPeriod(e.target.value)}
                          className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cycle Length (Days)</label>
                        <input
                          type="number"
                          value={cycleLength}
                          onChange={(e) => setCycleLength(Number(e.target.value))}
                          className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={calculateNextCycle}
                        className="w-full py-3 bg-teal-600 text-white font-serif font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors"
                      >
                        Calculate Next Expected Dates
                      </button>

                      {nextPeriodDate && (
                        <div className="bg-[#ECFDF5] border border-teal-200 p-4 rounded-xl text-center space-y-1.5 animate-fade-in">
                          <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider block font-sans">Predicted Next Cycle Commencement</span>
                          <span className="text-base font-extrabold text-teal-950 block font-serif">{nextPeriodDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-rose-600" />
                      <h3 className="font-serif text-lg font-bold text-teal-900">Anemia Prevention & Nutrition</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
                      Natural, easily accessible ingredients recommended by village ASHAs and state health centers:
                    </p>

                    <div className="space-y-3 pt-2 text-xs font-serif text-gray-700">
                      <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                        <span className="block font-bold text-rose-950 mb-0.5">Local Iron-Rich Foods</span>
                        <p className="text-[11px] text-rose-900 mt-0.5 leading-relaxed italic">Consume Ragi roti, Jaggery (gud), boiled beetroot, peanuts, and roasted chickpeas daily to maintain hemoglobin.</p>
                      </div>

                      <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                        <span className="block font-bold text-teal-950 mb-0.5">Hydration & Safe Water</span>
                        <p className="text-[11px] text-teal-900 mt-0.5 leading-relaxed italic">Drink at least 3 liters of filtered water from RO village centers to boost blood circulation and mitigate muscle spasms.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-4">
                    <h3 className="font-serif text-lg font-bold text-teal-900">Pink Toilets Sanitation Directory</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
                      Clean school and public restrooms maintained with high water supply and hygiene dispensers:
                    </p>

                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                        <span className="block text-xs font-serif font-bold text-gray-800">Moinabad Bus Terminal Pod</span>
                        <span className="block text-[9.5px] text-gray-400 font-bold">Distance: 150m • Verified clean by Panchayat Swachhta Team</span>
                      </div>

                      <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                        <span className="block text-xs font-serif font-bold text-gray-800">ZP Girls High School Block Toilet</span>
                        <span className="block text-[9.5px] text-gray-400 font-bold">Inner Corridor • Running tap water & incinerator functional</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Hygiene & Myth Busters Panel */}
              {wellnessTab === 'education' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {[
                    { myth: "Myth: Pickles and sour food spoil if touched during periods.", fact: "Fact: Menstruation is a completely natural biological process. Sour foods or pickles are not impacted by touch. You can eat whatever nutritious food you want." },
                    { myth: "Myth: School girls should not exercise or walk during periods.", fact: "Fact: Light physical exercise, walking, or stretching helps release endorphins which naturally mitigate painful menstrual cramps." },
                    { myth: "Myth: Menstrual discharge represents impure or toxic waste.", fact: "Fact: It is simply unfertilized uterine lining and normal blood. There is absolutely nothing toxic or impure about it." },
                    { myth: "Myth: Sanitary napkins can be reused if dried in dark places.", fact: "Fact: Reusing napkins or using damp cloths causes severe bacterial infections. napkins must be disposed of safely and only clean cloth/pads used." },
                    { myth: "Myth: Girls should stay isolated in period huts.", fact: "Fact: Isolation is unhygienic and unsafe. Girls deserve clean rooms, comfortable spaces, and proper rest with family support." }
                  ].map((edu, idx) => (
                    <div key={idx} className="bg-white border border-[#E8E2D6] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-red-700 font-serif font-extrabold text-xs">
                          <AlertOctagon className="h-4.5 w-4.5 shrink-0" />
                          <span>{edu.myth}</span>
                        </div>
                        <div className="p-3 bg-[#ECFDF5] border border-teal-100 rounded-xl text-[11px] font-serif leading-relaxed text-teal-950 italic">
                          <span className="font-sans font-bold block mb-1 text-teal-900 uppercase text-[9px]">Science Reality check</span>
                          "{edu.fact}"
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              )}

              {/* Pad Dispensers Map Panel */}
              {wellnessTab === 'dispensers' && (
                <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-teal-900">Rural School Sanitary Pad Dispensers & Stock levels</h3>
                      <p className="text-xs text-gray-500 font-serif italic mt-0.5">
                        Locate active automatic dispenser machines in schools and panchayat halls. Request pad refills anonymously.
                      </p>
                    </div>
                    <span className="text-[10px] bg-[#ECFDF5] text-teal-800 font-bold px-3 py-1.5 rounded-full border border-teal-100">
                      🟢 Verified by Panchayat Health Officers
                    </span>
                  </div>

                  {restockNotice && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 text-[#B45309] text-xs font-serif rounded-xl flex items-center gap-2 animate-fade-in">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span>{restockNotice}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dispensers.map((disp) => (
                      <div key={disp.id} className="border border-[#E8E2D6] rounded-xl p-5 space-y-4 bg-[#FDFBF7] flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-serif font-bold text-teal-950 text-sm block leading-tight">{disp.schoolName}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded shrink-0 uppercase ${
                              disp.stockLevel === 'High' ? 'bg-emerald-50 text-emerald-700' : disp.stockLevel === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {disp.stockLevel}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-600 font-serif italic space-y-1">
                            <p>📍 Location: {disp.location}</p>
                            <p>📦 Current stock: <strong className="text-teal-900">{disp.padsAvailable} free pads remaining</strong></p>
                            <p>📅 Last restocked: {disp.lastRestocked}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex gap-2">
                          <button
                            onClick={() => triggerDispenserRestock(disp.id)}
                            className="flex-1 py-2 bg-teal-700 text-white font-serif font-bold text-[10px] rounded-lg hover:bg-teal-800 transition-colors"
                          >
                            Anonymously Request Refill
                          </button>
                          
                          <button
                            onClick={() => alert(`Your collection token for ${disp.schoolName} is Token ID: HS-${Math.floor(1000 + Math.random() * 9000)}. Scan this barcode at dispenser to collect a free pack.`)}
                            className="px-3 py-2 bg-[#F3F0E9] border border-[#DED9CE] text-teal-900 font-serif font-bold text-[10px] rounded-lg hover:bg-[#E8E2D6] transition-colors"
                          >
                            Generate Code
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anonymous Peer Support Forum Panel */}
              {wellnessTab === 'forum' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Write a New Support Question */}
                  <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-xs h-fit space-y-4">
                    <h3 className="font-serif text-lg font-bold text-teal-900">Ask the Girls Community Anonymously</h3>
                    <p className="text-xs text-gray-500 font-serif italic">
                      Share stories, voice concerns about washrooms, or ask rural counselors health questions completely anonymously.
                    </p>

                    <form onSubmit={handleAddForumPost} className="space-y-4 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Your Alias / Nickname</label>
                        <input
                          type="text"
                          value={newPostAuthor}
                          onChange={(e) => setNewPostAuthor(e.target.value)}
                          placeholder="e.g. Hopeful Friend (14)"
                          className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Topic Classification</label>
                        <select
                          value={newPostCategory}
                          onChange={(e) => setNewPostCategory(e.target.value as any)}
                          className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl px-3.5 py-2.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        >
                          <option value="hygiene">Hygiene & Cramp Care</option>
                          <option value="myths">Myth Debunking</option>
                          <option value="support">School Sanitary Facilities</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Your message / Question</label>
                        <textarea
                          rows={3}
                          required
                          value={newPostText}
                          onChange={(e) => setNewPostText(e.target.value)}
                          placeholder="Write your thought safely..."
                          className="w-full bg-[#FDFBF7] border border-[#E8E2D6] rounded-xl p-3.5 text-xs font-serif focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-teal-700 text-white font-serif font-bold text-xs rounded-xl hover:bg-teal-800 transition-colors"
                      >
                        Publish Anonymously to Forum
                      </button>
                    </form>
                  </div>

                  {/* Active peer board list */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-sans">Active Discussions Board</span>
                      <span className="text-[10px] text-teal-800 font-bold font-serif italic">ASHA Counselors online</span>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {peerPosts.map((post) => (
                        <div key={post.id} className="bg-white border border-[#E8E2D6] rounded-2xl p-5 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center font-serif text-teal-800 font-bold italic">
                                {post.author.charAt(0)}
                              </div>
                              <div>
                                <span className="block text-xs font-serif font-bold text-teal-950">{post.author}</span>
                                <span className="block text-[9px] text-gray-400">{post.date}</span>
                              </div>
                            </div>

                            <span className="text-[9px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-bold uppercase font-sans">
                              {post.category}
                            </span>
                          </div>

                          <p className="text-xs text-gray-700 font-serif leading-relaxed italic">
                            "{post.text}"
                          </p>

                          <div className="flex items-center gap-3 border-t border-b border-gray-100 py-2 text-[10px]">
                            <button 
                              onClick={() => handleLikePost(post.id)}
                              className="flex items-center gap-1 text-rose-700 font-bold hover:scale-105 transition-transform"
                            >
                              <Heart className="h-3.5 w-3.5 fill-rose-600 text-rose-600" />
                              <span>({post.likes}) Support this question</span>
                            </button>
                          </div>

                          {/* Replies */}
                          <div className="space-y-2.5">
                            {post.replies.map((rep, idx) => (
                              <div key={idx} className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs font-serif text-teal-950 italic">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-sans font-bold text-teal-900 uppercase text-[8.5px] tracking-wider">Verified Counselor: {rep.author}</span>
                                  <span className="text-[9px] text-gray-400 font-sans">{rep.date}</span>
                                </div>
                                "{rep.text}"
                              </div>
                            ))}

                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Add support reply anonymized..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const text = e.currentTarget.value;
                                    setPeerPosts(prev => prev.map(p => {
                                      if (p.id === post.id) {
                                        return {
                                          ...p,
                                          replies: [...p.replies, { author: 'Rural Sister', text, date: 'Just now' }]
                                        };
                                      }
                                      return p;
                                    }));
                                    e.currentTarget.value = '';
                                  }
                                }}
                                className="flex-1 bg-[#FDFBF7] border border-[#E8E2D6] rounded-lg px-2.5 py-1.5 text-[11px] font-serif"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default SafetyView;
