import React, { useState, useEffect } from 'react';
import { GramSabhaMeeting, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { 
  generateAllyTrainingFeedback,
  generateWhatsAppAgendaSummary,
  generateSarpanchBudgetResponse,
  generateCivicStoryOutcome
} from '../lib/aiService';
import { 
  Landmark, Calendar, MapPin, Scale, Award, 
  HelpCircle, Check, X, ShieldCheck, Trophy, LandmarkIcon, Users, Sparkles, RefreshCw, MessageSquare,
  Share2, MessageCircle, ThumbsUp, AlertTriangle, Send, Volume2, BookOpen, User, Play, ChevronDown, ChevronUp
} from 'lucide-react';

interface CivicVoiceViewProps {
  currentLanguage: LanguageCode;
}

export const CivicVoiceView: React.FC<CivicVoiceViewProps> = ({ currentLanguage }) => {
  const [meetings, setMeetings] = useState<GramSabhaMeeting[]>([]);
  
  // Game states
  const [gameStep, setGameStep] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  // AI Ally training states
  const [activeRightTab, setActiveRightTab] = useState<'ally' | 'game'>('game');
  const [trainingRole, setTrainingRole] = useState<'panchayat' | 'hr'>('panchayat');
  const [customResponseText, setCustomResponseText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState('');

  // 1. WhatsApp agenda summary states
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null); // maps to meeting ID
  const [whatsappSummaryText, setWhatsappSummaryText] = useState<Record<string, string>>({});
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null); // maps to meeting ID
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null); // maps to meeting ID
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  // 2. Gram Sabha digital feedback
  const [meetingFeedback, setMeetingFeedback] = useState<Record<string, Array<{ text: string; date: string }>>>({
    'm1': [
      { text: "Can we request that the drinking water filter be serviced before this meeting?", date: "2026-06-28" },
      { text: "We need an update on why the primary health center has no evening doctor.", date: "2026-06-29" }
    ]
  });
  const [newFeedbackTexts, setNewFeedbackTexts] = useState<Record<string, string>>({});

  // 3. Participatory Budget states
  const [expandedBudgetItem, setExpandedBudgetItem] = useState<number | null>(null);
  const [budgetVotes, setBudgetVotes] = useState<Record<number, number>>({ 0: 24, 1: 45, 2: 38, 3: 19 });
  const [budgetFlags, setBudgetFlags] = useState<Record<number, Array<{ id: string; concern: string; timestamp: string; response?: string }>>>({
    0: [
      { id: '1', concern: "The drainage pipes laid out near Lane 3 are leaking sewage onto the street.", timestamp: "2026-06-25", response: "Thank you for the audit. The assistant engineer inspected the site yesterday. The subcontractor has been ordered to seal the joints and secure the lining by Friday. Progress will be displayed on the public billboard." }
    ],
    1: [
      { id: '2', concern: "School paints have started peeling within 2 months of renovation. Poor material quality?", timestamp: "2026-06-27", response: "A formal quality check has been ordered. The school development committee will inspect the supplier's materials. No payment will be released until it is redone." }
    ]
  });
  const [newFlagTexts, setNewFlagTexts] = useState<Record<number, string>>({});
  const [flagSubmitting, setFlagSubmitting] = useState<Record<number, boolean>>({});

  // 4. Youth Civic Education Game states
  const [gameSubTab, setGameSubTab] = useState<'story' | 'quiz'>('story');
  const [charName, setCharName] = useState('Ravi');
  const [storyState, setStoryState] = useState<string>('');
  const [storyChoices, setStoryChoices] = useState<string[]>([]);
  const [storyHistory, setStoryHistory] = useState<Array<{ text: string; choice?: string }>>([]);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyScore, setStoryScore] = useState(10);
  const [storyCompleted, setStoryCompleted] = useState(false);

  const trainingScenarios = {
    panchayat: [
      {
        id: 'p1',
        title: "Caste Segregation in Assembly",
        scenario: "During a Gram Sabha assembly, a small group of influential landholding members demands that representatives from marginalized caste communities sit on the floor at the back, claiming it represents 'local social custom'.",
        options: [
          "Ask the marginalized representatives to comply temporarily to keep the peace and proceed with the meeting.",
          "Politely ignore the dispute and begin reading the budget, hoping the issue resolves itself.",
          "Firmly reject the demand, cite the constitutional prohibition of untouchability and discrimination, and ensure equal seating for all representatives."
        ],
        correctOptionIdx: 2
      },
      {
        id: 'p2',
        title: "Disability exclusion at Well",
        scenario: "A citizen with a visual impairment requests the Gram Panchayat to install concrete handrails and high-contrast brick edging near the central village drinking well. Traditionalists object, saying it wastes resources.",
        options: [
          "Advise the citizen's family members to accompany them always, rather than changing the infrastructure.",
          "Declare the request as a non-essential aesthetic project and defer fund allocation indefinitely.",
          "Approve the modifications immediately under the RPWD Act, emphasizing accessibility as a fundamental right of access to public resources."
        ],
        correctOptionIdx: 2
      }
    ],
    hr: [
      {
        id: 'h1',
        title: "Ignored Accommodations Complaint",
        scenario: "An employee who uses a wheelchair reports that company social retreats are routinely scheduled at an offsite venue with only step entrances. A manager responds: 'It's just a fun outing, they can skip it without professional impact.'",
        options: [
          "Agree with the manager, as retreats are not core billable hours.",
          "Quietly suggest the employee stay home and offer them a small food delivery voucher as compensation.",
          "Halt the venue booking, mandate that all company outings must occur at accessible venues, and educate managers on systemic exclusion."
        ],
        correctOptionIdx: 2
      }
    ]
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    const list = await dbClient.getGramSabhaMeetings();
    setMeetings(list);
  };

  const handleFetchAllyFeedback = async (optionSelectedText?: string) => {
    setFeedbackLoading(true);
    setFeedbackResult('');
    try {
      const selectedScenario = trainingScenarios[trainingRole][0];
      const answer = optionSelectedText || customResponseText;
      const isCorrect = optionSelectedText ? (selectedScenario.options[selectedScenario.correctOptionIdx] === optionSelectedText) : false;
      const feedback = await generateAllyTrainingFeedback(
        trainingRole,
        selectedScenario.id,
        answer,
        isCorrect,
        currentLanguage
      );
      setFeedbackResult(feedback);
    } catch (e) {
      console.error(e);
    } finally {
      setFeedbackLoading(false);
    }
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

  // WhatsApp summary helpers
  const handleGenerateWhatsAppSummary = async (meeting: GramSabhaMeeting) => {
    setLoadingSummary(meeting.id);
    try {
      const summary = await generateWhatsAppAgendaSummary(
        meeting.title,
        meeting.agenda,
        meeting.date,
        meeting.location,
        currentLanguage
      );
      setWhatsappSummaryText(prev => ({ ...prev, [meeting.id]: summary }));
    } catch (e) {
      console.error("WhatsApp Summary Error:", e);
    } finally {
      setLoadingSummary(null);
    }
  };

  const handleSimulateBroadcast = (meetingId: string) => {
    setBroadcastingId(meetingId);
    setTimeout(() => {
      setBroadcastingId(null);
      setBroadcastSuccess(meetingId);
      setTimeout(() => setBroadcastSuccess(null), 5000);
    }, 2000);
  };

  // Digital feedback helpers
  const handleAddFeedback = (meetingId: string) => {
    const text = newFeedbackTexts[meetingId];
    if (!text || !text.trim()) return;

    const newFeedback = {
      text: text.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    setMeetingFeedback(prev => ({
      ...prev,
      [meetingId]: [...(prev[meetingId] || []), newFeedback]
    }));

    setNewFeedbackTexts(prev => ({ ...prev, [meetingId]: '' }));
  };

  // Participatory budget helpers
  const handleVoteBudget = (idx: number) => {
    setBudgetVotes(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
  };

  const handleAddBudgetFlag = async (idx: number, category: string) => {
    const text = newFlagTexts[idx];
    if (!text || !text.trim()) return;

    setFlagSubmitting(prev => ({ ...prev, [idx]: true }));
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const sarpanchResp = await generateSarpanchBudgetResponse(category, text, currentLanguage);

      const newFlag = {
        id: Math.random().toString(),
        concern: text.trim(),
        timestamp,
        response: sarpanchResp
      };

      setBudgetFlags(prev => ({
        ...prev,
        [idx]: [...(prev[idx] || []), newFlag]
      }));

      setNewFlagTexts(prev => ({ ...prev, [idx]: '' }));
    } catch (e) {
      console.error("Budget flag submit error:", e);
    } finally {
      setFlagSubmitting(prev => ({ ...prev, [idx]: false }));
    }
  };

  // Civic story visual novel simulator helpers
  const handleStoryChoice = async (choice: string) => {
    setStoryLoading(true);
    try {
      const nextOutcome = await generateCivicStoryOutcome(
        charName,
        choice,
        storyState,
        currentLanguage
      );

      setStoryHistory(prev => [
        ...prev,
        { text: storyState, choice: choice }
      ]);

      setStoryState(nextOutcome);
      setStoryScore(prev => prev + 15);

      const lines = nextOutcome.split('\n');
      const newChoices: string[] = [];
      lines.forEach(line => {
        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().match(/^[A-C]\./) || line.trim().startsWith('Option')) {
          const cleanChoice = line.replace(/^[•\-\*\s]+/, '').replace(/^(Option|ఆప్షన్|विकल्प)\s+[A-Cअ-स]\s*:\s*/i, '').trim();
          if (cleanChoice && cleanChoice.length > 5) {
            newChoices.push(cleanChoice);
          }
        }
      });

      if (newChoices.length >= 2) {
        setStoryChoices(newChoices);
      } else {
        if (currentLanguage === 'te') {
          setStoryChoices([
            "పరిష్కారం కోసం సమస్యను మీడియాకు తెలియజేయండి.",
            "మరింత చట్టపరమైన సహకారం కోసం లాయర్‌ను సంప్రదించండి.",
            "గ్రామ సభలో ధైర్యంగా అందరి ముందూ ఈ విషయం ప్రస్తావించండి."
          ]);
        } else if (currentLanguage === 'hi') {
          setStoryChoices([
            "समस्या को सोशल मीडिया पर वायरल करके दबाव बनाएं।",
            "कानूनी मदद लेने के लिए अधिकार मंच के पास जाएं।",
            "पूरी पंचायत के सदस्यों के साथ खुली बैठक बुलाने का आग्रह करें।"
          ]);
        } else {
          setStoryChoices([
            "Expose the truth to local news reporters.",
            "Submit a formal petition with community signatures to the District Collector.",
            "Raise this matter peacefully in front of the Gram Panchayat meeting."
          ]);
        }
      }

      if (nextOutcome.toLowerCase().includes('congratulations') || nextOutcome.includes('विजेता') || nextOutcome.includes('గెలిచారు') || nextOutcome.toLowerCase().includes('completed') || storyHistory.length >= 4) {
        setStoryCompleted(true);
      }

    } catch (e) {
      console.error("Civic story progression error:", e);
    } finally {
      setStoryLoading(false);
    }
  };

  const resetStoryGame = () => {
    setStoryHistory([{ text: "Chapter 1: The Muddy Path of Moinabad" }]);
    setStoryScore(10);
    setStoryCompleted(false);
    if (currentLanguage === 'te') {
      setStoryState("మీరు మొయినాబాద్ గ్రామానికి చెందిన 21 సంవత్సరాల రవి. మీ పరిసరాలను ప్రాథమిక పాఠశాలకు కలిపే ప్రధాన రహదారి బురదమయంగా మారి, వర్షాకాలంలో పిల్లలు సురక్షితంగా ప్రయాణించడం అసాధ్యం అని గమనించారు. రహదారి అభివృద్ధికి పంచాయతీకి రూ. 15 లక్షలు వచ్చాయని విన్నారు, కానీ ఏమీ మారలేదు. మీరు ఏమి చేస్తారు?");
      setStoryChoices([
        "ఖాతాల వివరాలు అడగడానికి సమాచార హక్కు (RTI) దరఖాస్తును ఫైల్ చేయండి.",
        "సర్పంచ్ ఇంటికి నేరుగా వెళ్లి వివరణ అడగండి.",
        "యువతతో స్వచ్ఛంద శ్రమదానం చేసి రోడ్డు గుంతలను తాత్కాలికంగా పూడ్చండి."
      ]);
    } else if (currentLanguage === 'hi') {
      setStoryState("आप मोइनाबाद गाँव के 21 वर्षीय युवक रवि हैं। हाल ही में, आपने देखा कि आपके मोहल्ले को प्राथमिक विद्यालय से जोड़ने वाली मुख्य सड़क पूरी तरह से कीचड़ से भरी है, जिससे बच्चों के लिए बारिश के दौरान स्कूल जाना असंभव हो गया है। आपने सुना है कि पंचायत को सड़क विकास के लिए ₹15 लाख मिले थे, लेकिन कुछ नहीं बदला। आप क्या करेंगे?");
      setStoryChoices([
        "आधिकारिक खातों के विवरण का अनुरोध करने के लिए सूचना का अधिकार (RTI) आवेदन दायर करें।",
        "सीधे सरपंच के घर जाएं और व्यक्तिगत रूप से स्पष्टीकरण की मांग करें।",
        "गड्ढों को बजरी से अस्थायी रूप से भरने के लिए एक युवा स्वयंसेवक अभियान आयोजित करें।"
      ]);
    } else {
      setStoryState("You are Ravi, a 21-year-old youth from Moinabad village. Recently, you noticed that the major road connecting your neighborhood to the primary school is completely muddy and unpaved, making it impossible for children and elders to travel safely during the monsoons. You heard the Panchayat received Rs. 15 Lakhs for road development, but nothing has changed. What will you do?");
      setStoryChoices([
        "File a formal Right to Information (RTI) application to request official accounts.",
        "Go directly to the Sarpanch's house and demand an explanation in person.",
        "Organize a youth volunteer drive to temporarily fill the potholes with gravel."
      ]);
    }
  };

  useEffect(() => {
    resetStoryGame();
  }, [currentLanguage]);

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
              {meetings.map((m) => {
                const summary = whatsappSummaryText[m.id];
                const feedbackList = meetingFeedback[m.id] || [];
                const isBroadcasting = broadcastingId === m.id;
                const isBroadcastSuccess = broadcastSuccess === m.id;
                const fbText = newFeedbackTexts[m.id] || '';

                return (
                  <div key={m.id} className="bg-gray-50/50 border border-gray-100 p-5 rounded-2xl space-y-4 shadow-2xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <h4 className="font-sans text-sm font-bold text-teal-950 leading-snug">{m.title}</h4>
                        <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md shrink-0 inline-block">{m.panchayatName}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      <span className="font-bold text-gray-800">Agenda:</span> {m.agenda}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] font-semibold text-gray-500 pt-1 border-b border-gray-100 pb-3">
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
                        <span>Allocated: {m.budgetAllocated}</span>
                      </div>
                    </div>

                    {/* WhatsApp Platform Engagement */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleGenerateWhatsAppSummary(m)}
                          disabled={loadingSummary === m.id}
                          className="flex items-center space-x-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 px-3 py-1.5 rounded-xl text-[10.5px] font-bold transition-all disabled:opacity-50"
                        >
                          {loadingSummary === m.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5 text-teal-700" />
                          )}
                          <span>Generate WhatsApp Agenda Summary</span>
                        </button>
                      </div>

                      {summary && (
                        <div className="bg-[#E4F2E2]/60 border border-[#B3DDA7] rounded-2xl p-4.5 space-y-3 shadow-3xs">
                          <div className="flex items-center justify-between border-b border-[#B3DDA7]/40 pb-2">
                            <div className="flex items-center space-x-1.5">
                              <MessageCircle className="h-4 w-4 text-[#25D366]" />
                              <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">WhatsApp Preview (Simplified Bulletin)</span>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Translated to {currentLanguage.toUpperCase()}</span>
                          </div>

                          <div className="bg-[#DCF8C6] border border-[#C5EBA7] p-3 rounded-xl shadow-2xs font-sans text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {summary}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(summary);
                                setCopiedMeetingId(m.id);
                                setTimeout(() => setCopiedMeetingId(null), 3000);
                              }}
                              className="text-[10px] font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-3xs flex items-center space-x-1"
                            >
                              {copiedMeetingId === m.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <span>Copy Bulletin</span>
                              )}
                            </button>
                            <button
                              onClick={() => handleSimulateBroadcast(m.id)}
                              disabled={isBroadcasting}
                              className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg shadow-3xs flex items-center space-x-1 transition-all"
                            >
                              {isBroadcasting ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  <span>Broadcasting to 420 Villagers...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
                                  <span>Simulate Village Broadcast</span>
                                </>
                              )}
                            </button>
                          </div>

                          {isBroadcasting && (
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                          )}

                          {isBroadcastSuccess && (
                            <div className="bg-emerald-50 text-emerald-950 p-2.5 rounded-xl border border-emerald-200 text-[10px] font-semibold flex items-center space-x-1.5">
                              <Check className="h-4 w-4 text-emerald-600" />
                              <span>Success! SMS & WhatsApp broadcasts pushed to all registered Ward Sabhyas of Moinabad Panchayat.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Citizen Feedback Portal */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-[11px] font-extrabold text-teal-950 uppercase tracking-wide">Panchayat Feedback Board (Collect Direct Comments)</h5>
                      
                      {feedbackList.length > 0 && (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                          {feedbackList.map((fb, idx) => (
                            <div key={idx} className="bg-white border border-gray-100 p-2.5 rounded-xl space-y-1">
                              <div className="flex justify-between text-[9px] font-extrabold text-gray-400">
                                <span className="text-teal-800">Citizen Feedback HS-{idx + 32}</span>
                                <span>{fb.date}</span>
                              </div>
                              <p className="text-xs font-semibold text-gray-700 leading-normal">
                                "{fb.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fbText}
                          onChange={(e) => setNewFeedbackTexts(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Ask a question or submit feedback directly to the Sarpanch..."
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddFeedback(m.id);
                          }}
                        />
                        <button
                          onClick={() => handleAddFeedback(m.id)}
                          disabled={!fbText.trim()}
                          className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Participatory Budget Tracker */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <LandmarkIcon className="h-5 w-5 text-teal-700" />
                <h3 className="font-sans text-base font-bold text-gray-900">Participatory Budget Tracker (Real-Time)</h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">Live Citizen Audit</span>
            </div>
            
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Track developmental expenditure allocations. Vote to prioritize sectors or flag irregularities to trigger a legal audit inquiry from the Sarpanch.
            </p>

            <div className="space-y-4">
              {budgetAllocation.map((bud, i) => {
                const ratio = Math.round((bud.spent / bud.allocated) * 100);
                const isExpanded = expandedBudgetItem === i;
                const votes = budgetVotes[i] || 0;
                const flags = budgetFlags[i] || [];
                const flagInput = newFlagTexts[i] || '';
                const isSubmittingFlag = flagSubmitting[i] || false;

                return (
                  <div key={i} className="border border-gray-100 rounded-2xl p-4.5 space-y-3 bg-gray-50/20 hover:border-teal-100 transition-all">
                    
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedBudgetItem(isExpanded ? null : i)}
                      className="flex justify-between items-center cursor-pointer select-none"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-sans text-xs font-bold text-gray-800 hover:text-teal-900">{bud.category}</span>
                          {flags.length > 0 && (
                            <span className="bg-red-50 text-red-700 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-md border border-red-100 flex items-center space-x-0.5">
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                              <span>{flags.length} Flagged</span>
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between max-w-sm text-[10px] font-extrabold text-gray-400">
                          <span>₹{bud.spent.toLocaleString()} Spent / ₹{bud.allocated.toLocaleString()} Allocated</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 ml-4">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-500">
                          <span>{votes} votes</span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`${bud.color} h-full rounded-full transition-all duration-500`} style={{ width: `${ratio}%` }} />
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-gray-100/70 mt-3 space-y-4">
                        
                        {/* Interactive Toolbar */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-gray-500 uppercase">Interactive Actions:</span>
                          <button
                            onClick={() => handleVoteBudget(i)}
                            className="flex items-center space-x-1 bg-teal-50 hover:bg-teal-100 text-teal-900 px-3 py-1 rounded-xl font-bold transition-all"
                          >
                            <ThumbsUp className="h-3.5 w-3.5 text-teal-700" />
                            <span>Upvote Priority</span>
                          </button>
                        </div>

                        {/* Audit / Flagged Concerns */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Citizen Audit Concerns & Official Responses</h4>
                          
                          {flags.length > 0 ? (
                            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                              {flags.map((flag) => (
                                <div key={flag.id} className="bg-white border border-gray-100 p-3.5 rounded-xl space-y-2.5 shadow-3xs">
                                  <div className="flex items-start justify-between gap-1 text-[9px] font-bold text-gray-400">
                                    <span className="text-red-700 bg-red-50 border border-red-100/50 px-1.5 py-0.5 rounded-md flex items-center space-x-0.5">
                                      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                      <span>IRREGULARITY REPORT</span>
                                    </span>
                                    <span>{flag.timestamp}</span>
                                  </div>
                                  <p className="text-xs font-semibold text-gray-700 leading-normal">
                                    "{flag.concern}"
                                  </p>

                                  {flag.response ? (
                                    <div className="bg-[#FAF9F5] border border-amber-100 p-3 rounded-xl space-y-1.5 shadow-4xs">
                                      <div className="flex items-center space-x-1 border-b border-amber-100 pb-1">
                                        <Landmark className="h-3.5 w-3.5 text-amber-800" />
                                        <span className="text-[9.5px] font-extrabold uppercase text-amber-900">Gram Panchayat Sarpanch Official reply</span>
                                      </div>
                                      <p className="text-[11px] font-medium text-amber-950 whitespace-pre-line leading-relaxed">
                                        {flag.response}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-gray-400 italic">
                                      Inquiry initiated... awaiting Sarpanch response.
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10.5px] text-gray-400 italic">No irregularities flagged yet. If you notice leaks, subpar materials, or project delays, submit a concern below.</p>
                          )}

                          {/* Submit Concern Form */}
                          <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                            <label className="block text-[9px] font-bold text-gray-500 uppercase">Flag a public budget concern (Sends inquiry to Sarpanch):</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={flagInput}
                                onChange={(e) => setNewFlagTexts(prev => ({ ...prev, [i]: e.target.value }))}
                                placeholder="Describe the delay or suspected misuse of funds here..."
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddBudgetFlag(i, bud.category);
                                }}
                              />
                              <button
                                onClick={() => handleAddBudgetFlag(i, bud.category)}
                                disabled={isSubmittingFlag || !flagInput.trim()}
                                className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1"
                              >
                                {isSubmittingFlag ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Auditing...</span>
                                  </>
                                ) : (
                                  <span>Flag Concern</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

            {/* Right Column: AI Ally Discrimination Training / Board Game */}
        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          
          <div>
            {/* Header Tabs */}
            <div className="flex border-b border-gray-100 pb-2 mb-4 space-x-2">
              <button
                onClick={() => setActiveRightTab('ally')}
                className={`flex-1 py-1 text-center text-xs font-bold font-sans rounded-lg transition-all ${
                  activeRightTab === 'ally'
                    ? 'bg-teal-50 text-teal-950 font-extrabold border-b-2 border-b-teal-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                🤝 AI Ally Training
              </button>
              <button
                onClick={() => setActiveRightTab('game')}
                className={`flex-1 py-1 text-center text-xs font-bold font-sans rounded-lg transition-all ${
                  activeRightTab === 'game'
                    ? 'bg-teal-50 text-teal-950 font-extrabold border-b-2 border-b-teal-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                🏆 Wisdom Game
              </button>
            </div>

            {activeRightTab === 'ally' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-4.5 w-4.5 text-teal-700 animate-pulse" />
                    <span className="text-xs font-extrabold text-teal-950">AI Discrimination Ally Training</span>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Interactive legal scenarios teaching HR managers and local Panchayat leaders to recognize, intervene, and systemic respond to discrimination.
                </p>

                {/* Role Switcher */}
                <div className="flex rounded-xl bg-gray-50 p-1 border border-gray-100">
                  <button
                    onClick={() => {
                      setTrainingRole('panchayat');
                      setFeedbackResult('');
                      setCustomResponseText('');
                    }}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all ${
                      trainingRole === 'panchayat' 
                        ? 'bg-teal-700 text-white shadow-xs' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🏡 Panchayat Leader
                  </button>
                  <button
                    onClick={() => {
                      setTrainingRole('hr');
                      setFeedbackResult('');
                      setCustomResponseText('');
                    }}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all ${
                      trainingRole === 'hr' 
                        ? 'bg-teal-700 text-white shadow-xs' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🏢 Corporate HR
                  </button>
                </div>

                {/* Active Scenario Card */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] uppercase font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100/50 inline-block">
                    {trainingScenarios[trainingRole][0].title}
                  </span>
                  <p className="text-xs font-bold text-gray-800 leading-relaxed font-sans">
                    "{trainingScenarios[trainingRole][0].scenario}"
                  </p>

                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <span className="block text-[9px] font-bold text-gray-500 uppercase">Interactive response choices:</span>
                    {trainingScenarios[trainingRole][0].options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => {
                          setCustomResponseText(opt);
                          handleFetchAllyFeedback(opt);
                        }}
                        disabled={feedbackLoading}
                        className="w-full text-left p-2.5 border border-gray-200 bg-white rounded-xl text-xs font-semibold hover:border-teal-500 hover:bg-teal-50/20 text-gray-700 leading-relaxed transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase">Or, compose custom response:</label>
                    <textarea
                      value={customResponseText}
                      onChange={(e) => setCustomResponseText(e.target.value)}
                      placeholder="Compose how you would intervene, resolve, or mediate here..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleFetchAllyFeedback()}
                      disabled={feedbackLoading || !customResponseText.trim()}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
                    >
                      {feedbackLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Gemini Consulting guidelines...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Get Gemini AI Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Training Feedback report card */}
                {feedbackResult && (
                  <div className="bg-[#FDFBF7] p-3.5 rounded-2xl border border-teal-100 text-xs font-sans text-teal-950 space-y-1 leading-relaxed max-h-[180px] overflow-y-auto">
                    <div className="flex items-center space-x-1 border-b pb-1 mb-1 border-teal-100/50">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="font-sans font-bold text-[9px] uppercase text-teal-800">Gemini Expert Feedback</span>
                    </div>
                    <p className="whitespace-pre-line text-[11px] text-gray-700 leading-normal">
                      {feedbackResult}
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center space-x-1.5">
                    <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
                    <h3 className="font-sans text-sm font-bold text-gray-900">Panchayat Wisdom Game</h3>
                  </div>
                  <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
                    Score: {gameSubTab === 'quiz' ? gameScore : storyScore}
                  </span>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex rounded-xl bg-gray-50 p-1 border border-gray-100 mb-4">
                  <button
                    onClick={() => setGameSubTab('story')}
                    className={`flex-1 py-1 text-center text-[10px] font-bold rounded-lg transition-all ${
                      gameSubTab === 'story' 
                        ? 'bg-teal-700 text-white shadow-xs' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📖 Story RPG
                  </button>
                  <button
                    onClick={() => setGameSubTab('quiz')}
                    className={`flex-1 py-1 text-center text-[10px] font-bold rounded-lg transition-all ${
                      gameSubTab === 'quiz' 
                        ? 'bg-teal-700 text-white shadow-xs' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📋 Rights Quiz
                  </button>
                </div>

                {gameSubTab === 'quiz' ? (
                  <div>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
                      Test your knowledge of standard citizens rights and earn digital honor titles!
                    </p>

                    {/* MCQ Card */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 space-y-4">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">Question {gameStep + 1} of {gameQuestions.length}</span>
                      <p className="text-xs font-bold text-gray-800 leading-relaxed font-sans">
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
                              className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between leading-relaxed ${btnStyle}`}
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

                    {answered && (
                      <button
                        onClick={handleNextQuestion}
                        className="mt-6 w-full py-3 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1"
                      >
                        <span>{gameStep === gameQuestions.length - 1 ? 'Restart Game' : 'Next Question'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Roleplay as Ravi, a youth fighting for transparency and RTI road developments. Make choices and see outcomes.
                    </p>

                    {/* Character Name Form */}
                    {storyHistory.length <= 1 && (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase">Change Character Name:</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={charName}
                            onChange={(e) => setCharName(e.target.value)}
                            placeholder="Type Ravi, Priya..."
                            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          />
                          <button
                            onClick={resetStoryGame}
                            className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100"
                          >
                            Set Name
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Narrative Panel */}
                    <div className="bg-teal-50/20 border border-teal-100/50 rounded-2xl p-4.5 space-y-4">
                      
                      {/* Past Story Logs (Scrollable) */}
                      {storyHistory.length > 1 && (
                        <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1 border-b border-gray-100 pb-3 mb-2">
                          {storyHistory.map((item, index) => (
                            <div key={index} className="text-[10.5px] leading-relaxed">
                              {item.choice && (
                                <p className="text-teal-700 font-extrabold flex items-center space-x-1.5 bg-teal-50/60 px-2 py-1 rounded-md mb-1 inline-block">
                                  <span>↳ Selected choice: "{item.choice}"</span>
                                </p>
                              )}
                              <p className="text-gray-500 font-medium italic">
                                "{item.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                          <BookOpen className="h-4 w-4 text-teal-700" />
                          <span className="text-[10px] uppercase font-extrabold tracking-wide text-teal-800">Current Chapter Narrative</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                          {storyState || "Loading first chapter..."}
                        </p>
                      </div>

                      {/* Interactive Choices */}
                      {!storyCompleted ? (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <span className="block text-[9px] font-bold text-gray-500 uppercase">Make your choice to proceed:</span>
                          {storyChoices.map((choice, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleStoryChoice(choice)}
                              disabled={storyLoading}
                              className="w-full text-left p-3 border border-gray-200 bg-white hover:border-teal-500 hover:bg-teal-50/20 rounded-xl text-xs font-bold text-gray-700 leading-normal transition-all shadow-3xs"
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center space-y-2">
                          <Trophy className="h-7 w-7 text-amber-500 mx-auto animate-bounce" />
                          <h4 className="text-xs font-extrabold text-emerald-950 uppercase">Congratulations! RPG Completed!</h4>
                          <p className="text-[11px] font-semibold text-emerald-900 leading-relaxed">
                            You successfully finished {charName}'s civic rights and public accountability journey! You earned {storyScore} Honor Points.
                          </p>
                          <button
                            onClick={resetStoryGame}
                            className="mt-2 px-4 py-1.5 bg-emerald-600 text-white text-[10.5px] font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-3xs"
                          >
                            Restart Narrative
                          </button>
                        </div>
                      )}

                      {storyLoading && (
                        <div className="flex items-center justify-center space-x-2 py-3 bg-white/70 rounded-xl border border-teal-100">
                          <RefreshCw className="h-4 w-4 text-teal-700 animate-spin" />
                          <span className="text-xs font-bold text-teal-900">Gemini generating civic outcomes...</span>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>      </div>

      </div>

    </div>
  );
};
export default CivicVoiceView;
