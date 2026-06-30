import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Volume2, RefreshCw, Check, CheckCircle2, AlertCircle, 
  Sparkles, StopCircle, Trash2, Play, Square, ArrowRight, User, Globe, Bot, X
} from 'lucide-react';
import { LanguageCode } from '../types';

type VoiceState =
  | 'idle'
  | 'assistant_speaking'
  | 'ready_to_listen'
  | 'listening'
  | 'processing_audio'
  | 'transcribing'
  | 'understanding'
  | 'updating_profile'
  | 'asking_clarification'
  | 'form_complete'
  | 'error_microphone_denied'
  | 'error_voice_failed';

interface VoiceAssistantFormProps {
  currentLanguage: LanguageCode;
  onComplete: (completeData: any) => void;
  onClose: () => void;
  onUpdate?: (completeData: any) => void;
}

const LANGUAGES = [
  { code: 'English', label: 'English', locale: 'en-IN' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)', locale: 'hi-IN' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)', locale: 'te-IN' },
  { code: 'Tamil', label: 'Tamil (தமிழ்)', locale: 'ta-IN' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', locale: 'kn-IN' },
  { code: 'Malayalam', label: 'Malayalam (മലയാളം)', locale: 'ml-IN' },
  { code: 'Marathi', label: 'Marathi (मराठी)', locale: 'mr-IN' },
  { code: 'Bengali', label: 'Bengali (বাংলা)', locale: 'bn-IN' },
  { code: 'Gujarati', label: 'Gujarati (ગુજરાતી)', locale: 'gu-IN' },
  { code: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)', locale: 'pa-IN' },
  { code: 'Odia', label: 'Odia (ଓଡ଼ିଆ)', locale: 'or-IN' },
  { code: 'Urdu', label: 'Urdu (اردو)', locale: 'ur-IN' }
];

const SUGGESTED_RESPONSES: Record<string, Record<number, string[]>> = {
  "English": {
    1: ["My name is Lakshmi", "I am Ramesh Kumar", "Priya Sharma"],
    2: ["I am 32 years old", "Forty five years", "My age is 28"],
    3: ["Female", "I am a male", "Prefer not to say"],
    4: ["Telangana state Hyderabad district", "Moinabad block Rangareddy", "Karimnagar district Telangana"],
    5: ["Domestic worker", "I am a farmer", "Daily wage construction labor"],
    6: ["Ten thousand rupees per month", "My monthly income is twelve thousand", "Eight thousand only"],
    7: ["I am a woman and worker", "Student", "Senior citizen and farmer", "No groups"],
    8: ["Yes, I have both Aadhaar and bank account", "Yes, yes", "No, I do not have a bank account"]
  },
  "Telugu": {
    1: ["నా పేరు లక్ష్మి", "నా పేరు రమేష్ కుమార్", "ప్రియా శర్మ అని పిలుస్తారు"],
    2: ["ముప్పై రెండు సంవత్సరాలు", "నా వయస్సు నలభై ఐదు", "ఇరవై ఎనిమిది ఏళ్ళు"],
    3: ["మహిళ", "పురుషుడు", "చెప్పడానికి ఇష్టపడను"],
    4: ["తెలంగాణ రాష్ట్రం హైదరాబాద్ జిల్లా", "మోయినాబాద్ రంగారెడ్డి", "కరీంనగర్ జిల్లా తెలంగాణ"],
    5: ["ఇంటి పని చేస్తాను", "నేను ఒక రైతును", "భవన నిర్మాణ కూలీ పని"],
    6: ["నెలకి పది వేల రూపాయలు", "నా నెలసరి ఆదాయం పన్నెండు వేలు", "ఎనిమిది వేల రూపాయలు"],
    7: ["నేను ఒక మహిళను మరియు కార్మికురాలిని", "విద్యార్థిని", "నేను వృద్ధుడు మరియు రైతు", "ఏ గ్రూపు లేదు"],
    8: ["అవును, నాకు ఆధార్ మరియు బ్యాంక్ ఖాతా రెండు ఉన్నాయి", "అవును, ఉన్నాయి", "ఆధార్ ఉంది కానీ బ్యాంక్ ఖాతా లేదు"]
  },
  "Hindi": {
    1: ["मेरा नाम लक्ष्मी है", "मैं रमेश कुमार हूँ", "प्रिया शर्मा"],
    2: ["मेरी उम्र बत्तीस साल है", "पैंतालीस वर्ष", "अट्ठाइस साल का हूँ"],
    3: ["महिला", "पुरुष", "बताना नहीं चाहता"],
    4: ["तेलंगाना राज्य और हैदराबाद जिला", "मोइनाबाद रंगारेड्डी जिला", "करीमनगर तेलंगाना"],
    5: ["घर का काम करती हूँ", "मैं एक किसान हूँ", "दैनिक मजदूरी निर्माण कार्य"],
    6: ["दस हजार रुपये प्रति महीना", "मेरी मासिक आय बारह हजार है", "आठ हजार रुपये"],
    7: ["मैं एक महिला और मजदूर हूँ", "छात्र हूँ", "वरिष्ठ नागरिक और किसान", "किसी भी वर्ग से नहीं हूँ"],
    8: ["हाँ, मेरे पास आधार कार्ड और बैंक खाता दोनों हैं", "हाँ, बिल्कुल", "आधार है लेकिन बैंक खाता नहीं है"]
  }
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  age: "Age",
  gender: "Gender",
  state: "State",
  district: "District",
  occupation: "Occupation",
  monthly_income: "Monthly Income",
  is_student: "Is Student",
  is_farmer: "Is Farmer",
  is_worker: "Is Worker",
  is_woman: "Is Woman",
  is_senior_citizen: "Is Senior Citizen",
  is_migrant: "Is Migrant",
  is_disabled: "Is Person with Disability",
  has_aadhaar: "Has Aadhaar Card",
  has_bank_account: "Has Bank Account"
};

const VOICE_STATE_LABELS: Record<VoiceState, string> = {
  idle: 'READY',
  assistant_speaking: 'ASSISTANT SPEAKING',
  ready_to_listen: 'TAP TO SPEAK',
  listening: 'LISTENING',
  processing_audio: 'PROCESSING',
  transcribing: 'TRANSCRIBING',
  understanding: 'UNDERSTANDING',
  updating_profile: 'PROFILE UPDATED',
  asking_clarification: 'PLEASE REPEAT',
  form_complete: 'FORM COMPLETE',
  error_microphone_denied: 'MIC DENIED',
  error_voice_failed: 'ERROR — RETRY'
};

const VOICE_STATE_COLORS: Record<VoiceState, string> = {
  idle: 'bg-gray-700 text-gray-100',
  assistant_speaking: 'bg-teal-800 text-teal-100',
  ready_to_listen: 'bg-emerald-700 text-emerald-100',
  listening: 'bg-red-700 text-red-100',
  processing_audio: 'bg-amber-700 text-amber-100',
  transcribing: 'bg-blue-700 text-blue-100',
  understanding: 'bg-purple-700 text-purple-100',
  updating_profile: 'bg-emerald-700 text-emerald-100',
  asking_clarification: 'bg-orange-700 text-orange-100',
  form_complete: 'bg-teal-900 text-teal-100',
  error_microphone_denied: 'bg-red-900 text-red-100',
  error_voice_failed: 'bg-red-800 text-red-100'
};

const TTS_TRANSLATIONS: Record<string, Record<string, string>> = {
  "English": {
    greet: "Hello. I will help you fill the form. You only need to speak. First, what is your full name?",
    q1: "What is your full name?",
    q2: "Thank you. Now, what is your age in years?",
    q3: "Got it. What is your gender?",
    q4: "Which state and district do you live in?",
    q5: "What is your main job or occupation?",
    q6: "What is your monthly income in rupees?",
    q7: "Do you belong to any groups like student, farmer, worker, senior citizen, woman, migrant, or disabled?",
    q8: "Do you have an Aadhaar card and a bank account?",
    confirm: "I have filled your form. Is this information correct?",
    success: "Excellent. Your form is complete and has been saved successfully!"
  },
  "Telugu": {
    greet: "నమస్కారం. నేను మీకు ఫారమ్ నింపడానికి సహాయం చేస్తాను. మీరు మాట్లాడితే సరిపోతుంది. మొదటిగా, మీ పూర్తి పేరు ఏమిటి?",
    q1: "మీ పూర్తి పేరు ఏమిటి?",
    q2: "ధన్యవాదాలు. ఇప్పుడు, మీ వయస్సు ఎంత?",
    q3: "సరే. మీ లింగం ఏమిటి?",
    q4: "మీరు ఏ రాష్ట్రం మరియు జిల్లాలో నివసిస్తున్నారు?",
    q5: "మీ ప్రధాన వృత్తి లేదా ఉద్యోగం ఏమిటి?",
    q6: "మీ నెలవారీ ఆదాయం ఎంత?",
    q7: "మీరు విద్యార్థి, రైతు, కార్మికుడు, మహిళ, వృద్ధుడు, వలస కూలీ, లేదా వికలాంగుడు వంటి గ్రూపులకు చెందినవారా?",
    q8: "మీకు ఆధార్ కార్డ్ మరియు బ్యాంక్ ఖాతా ఉన్నాయా?",
    confirm: "నేను మీ వివరాలను సేకరించాను. ఈ వివరాలు సరైనవేనా?",
    success: "చాలా సంతోషం. మీ ఫారమ్ విజయవంతంగా పూర్తయింది మరియు సేవ్ చేయబడింది!"
  },
  "Hindi": {
    greet: "नमस्ते। मैं आपको फॉर्म भरने में मदद करूँगा। आपको केवल बोलना है। सबसे पहले, आपका पूरा नाम क्या है?",
    q1: "आपका पूरा नाम क्या है?",
    q2: "धन्यवाद। अब, आपकी उम्र कितनी साल है?",
    q3: "ठीक है। आपका लिंग क्या है?",
    q4: "आप किस राज्य और जिले में रहते हैं?",
    q5: "आपका मुख्य काम या पेशा क्या है?",
    q6: "आपकी मासिक आय कितनी रुपये है?",
    q7: "क्या आप छात्र, किसान, मजदूर, महिला, वरिष्ठ नागरिक, प्रवासी या विकलांग वर्ग से हैं?",
    q8: "क्या आपके पास आधार कार्ड और बैंक खाता है?",
    confirm: "मैंने आपका फॉर्म भर दिया है। क्या यह जानकारी सही है?",
    success: "बहुत बढ़िया। आपका फॉर्म सफलतापूर्वक पूरा हो गया है और सुरक्षित कर लिया गया है!"
  }
};

export const VoiceAssistantForm: React.FC<VoiceAssistantFormProps> = ({
  currentLanguage,
  onComplete,
  onClose,
  onUpdate
}) => {
  // Map initial language code to our 12 assistant languages
  const getInitialLanguage = (): string => {
    if (currentLanguage === 'te') return 'Telugu';
    if (currentLanguage === 'hi') return 'Hindi';
    if (currentLanguage === 'ta') return 'Tamil';
    if (currentLanguage === 'kn') return 'Kannada';
    if (currentLanguage === 'ml') return 'Malayalam';
    if (currentLanguage === 'mr') return 'Marathi';
    if (currentLanguage === 'bn') return 'Bengali';
    if (currentLanguage === 'gu') return 'Gujarati';
    if (currentLanguage === 'pa') return 'Punjabi';
    if (currentLanguage === 'or') return 'Odia';
    if (currentLanguage === 'ur') return 'Urdu';
    return 'English';
  };

  const [selectedLanguage, setSelectedLanguage] = useState<string>(getInitialLanguage());
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [action, setAction] = useState<string>('ask_question');
  const [speakText, setSpeakText] = useState<string>('');
  const [displayText, setDisplayText] = useState<string>('');
  const [userInputText, setUserInputText] = useState<string>('');
  const [needsClarification, setNeedsClarification] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const lastAudioBase64Ref = useRef<string | null>(null);
  
  // Stored form states
  const [completeFormData, setCompleteFormData] = useState<any>({
    full_name: null,
    age: null,
    gender: null,
    state: null,
    district: null,
    occupation: null,
    monthly_income: null,
    is_student: false,
    is_farmer: false,
    is_worker: false,
    is_woman: false,
    is_senior_citizen: false,
    is_migrant: false,
    is_disabled: false,
    has_aadhaar: null,
    has_bank_account: null
  });

  const [missingFields, setMissingFields] = useState<string[]>(
    ["full_name", "age", "gender", "state", "district", "occupation", "monthly_income", "has_aadhaar", "has_bank_account"]
  );

  // Audio wave and recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatLog, setChatLog] = useState<Array<{ sender: 'assistant' | 'user'; text: string; lang: string }>>([]);

  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutIdRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize and welcome on mount
  useEffect(() => {
    handleVoiceAgentTurn(null, '');
    
    return () => {
      cleanupVoiceResources();
    };
  }, []);

  const cleanupVoiceResources = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    window.speechSynthesis.cancel();
  };

  // Real voice recording via browser MediaRecorder API
  const startRealRecording = async () => {
    // If already recording, stop
    if (isRecording) {
      stopRealRecording();
      return;
    }

    // Only allow recording when ready
    if (voiceState !== 'ready_to_listen' && voiceState !== 'idle' && voiceState !== 'error_voice_failed' && voiceState !== 'asking_clarification') {
      return;
    }

    // Cancel any current assistant speech
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSynthesizing(false);

    let speechTranscript = '';
    try {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        const matchedLang = LANGUAGES.find(l => l.code === selectedLanguage);
        recognition.lang = matchedLang ? matchedLang.locale : 'en-IN';
        
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          console.log("Browser SpeechRecognition transcribed:", text);
          speechTranscript = text;
        };
        
        recognition.onerror = (e: any) => {
          console.warn("Browser SpeechRecognition error:", e);
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        
        setTimeout(() => {
          handleVoiceAgentTurn(audioBlob, speechTranscript);
        }, 400);
      };

      mediaRecorder.start(250); // collect data every 250ms
      setIsRecording(true);
      setVoiceState('listening');

      setupSilenceDetection(stream);

      // Auto-stop after 30 seconds
      timeoutIdRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setVoiceState('processing_audio');
        }
      }, 30000);

    } catch (err: any) {
      console.error("Microphone permission denied or hardware error:", err);
      setIsRecording(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceState('error_microphone_denied');
        setDisplayText('Microphone permission is needed for voice help. Please allow mic permission in your browser settings and try again.');
      } else {
        setVoiceState('error_voice_failed');
        setDisplayText('Could not access microphone. Please check your device settings.');
      }
    }
  };

  const stopRealRecording = () => {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsRecording(false);
    setVoiceState('processing_audio');
  };

  // Automatic silence detection
  const setupSilenceDetection = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastActiveTime = Date.now();
      let hasSpoken = false;

      audioContextRef.current = audioContext;

      const checkSilence = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }

        const speechThreshold = 35;
        const now = Date.now();

        if (maxVal > speechThreshold) {
          lastActiveTime = now;
          hasSpoken = true;
        } else {
          const silentDuration = now - lastActiveTime;
          if (hasSpoken && silentDuration > 2000) {
            console.log('Silence detected: auto-stopping recording.');
            stopRealRecording();
            return;
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkSilence);
      };

      animationFrameRef.current = requestAnimationFrame(checkSilence);
    } catch (e) {
      console.error('Failed to setup silence detection:', e);
    }
  };

  // Play Sarvam TTS base64 audio
  const playBase64Audio = (base64String: string, text: string) => {
    try {
      lastAudioBase64Ref.current = base64String;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      const audioUrl = `data:audio/wav;base64,${base64String}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onplay = () => {
        setIsSynthesizing(true);
        setVoiceState('assistant_speaking');
      };

      audio.onended = () => {
        setIsSynthesizing(false);
        setVoiceState('ready_to_listen');
        activeAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsSynthesizing(false);
        handleTextToSpeech(text);
      };

      audio.play().catch(() => {
        setIsSynthesizing(false);
        handleTextToSpeech(text);
      });
    } catch (e) {
      setIsSynthesizing(false);
      handleTextToSpeech(text);
    }
  };

  // Browser speech synthesis fallback
  const handleTextToSpeech = (text: string, langOverride?: string) => {
    if (!('speechSynthesis' in window)) {
      setVoiceState('ready_to_listen');
      return;
    }
    window.speechSynthesis.cancel();
    setVoiceState('assistant_speaking');

    const activeLang = langOverride || selectedLanguage;
    const matchedLang = LANGUAGES.find(l => l.code === activeLang);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = matchedLang ? matchedLang.locale : 'en-IN';

    const voices = window.speechSynthesis.getVoices();
    const desiredVoice = voices.find(v => v.lang.startsWith(utterance.lang.substring(0, 2)));
    if (desiredVoice) utterance.voice = desiredVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setIsSynthesizing(true);
      setVoiceState('assistant_speaking');
    };
    utterance.onend = () => {
      setIsSynthesizing(false);
      setVoiceState('ready_to_listen');
    };
    utterance.onerror = () => {
      setIsSynthesizing(false);
      setVoiceState('ready_to_listen');
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("speechSynthesis.speak failed synchronously:", e);
      setIsSynthesizing(false);
      setVoiceState('ready_to_listen');
    }
  };

  // Main voice agent turn — STT + Gemini + TTS pipeline
  const runClientSideSimulator = (transcript: string, activeLang: string) => {
    console.log("Running client-side simulator with user response:", transcript, "language:", activeLang);
    const updatedFormData = { ...completeFormData };
    const lower = transcript.toLowerCase();

    // Heuristics for the 8 questions
    if (currentQuestionNumber === 1 && transcript.trim()) {
      updatedFormData.full_name = transcript.replace(/my name is|నా పేరు|मेरा नाम है|मेरा नाम/gi, "").trim();
    } else if (currentQuestionNumber === 2 && transcript.trim()) {
      const num = parseInt(transcript.match(/\d+/)?.[0] || "30");
      updatedFormData.age = num;
    } else if (currentQuestionNumber === 3 && transcript.trim()) {
      if (lower.includes("fem") || lower.includes("woman") || lower.includes("మహిళ") || lower.includes("महिला")) {
        updatedFormData.gender = "Female";
      } else {
        updatedFormData.gender = "Male";
      }
    } else if (currentQuestionNumber === 4 && transcript.trim()) {
      updatedFormData.state = "Telangana";
      updatedFormData.district = transcript.replace(/telangana|delhi|district|రాష్ట్రం|జిల్లా|राज्य/gi, "").trim() || "Hyderabad";
    } else if (currentQuestionNumber === 5 && transcript.trim()) {
      updatedFormData.occupation = transcript;
    } else if (currentQuestionNumber === 6 && transcript.trim()) {
      const num = parseInt(transcript.match(/\d+/)?.[0] || "10000");
      updatedFormData.monthly_income = num;
    } else if (currentQuestionNumber === 7 && transcript.trim()) {
      updatedFormData.is_student = lower.includes("student") || lower.includes("విద్యార్థి") || lower.includes("छात्र");
      updatedFormData.is_farmer = lower.includes("farmer") || lower.includes("రైతు") || lower.includes("किसान");
      updatedFormData.is_worker = lower.includes("worker") || lower.includes("కూలీ") || lower.includes("मजदूर");
      updatedFormData.is_woman = lower.includes("woman") || lower.includes("మహిళ") || lower.includes("महिला") || updatedFormData.gender === "Female";
      updatedFormData.is_senior_citizen = lower.includes("senior") || lower.includes("vridh") || lower.includes("వృద్ధుడు") || lower.includes("बुजुर्ग");
      updatedFormData.is_migrant = lower.includes("migrant") || lower.includes("వలస") || lower.includes("प्रवासी");
      updatedFormData.is_disabled = lower.includes("disabled") || lower.includes("विकलांग") || lower.includes("వికలాంగుడు");
    } else if (currentQuestionNumber === 8 && transcript.trim()) {
      updatedFormData.has_aadhaar = lower.includes("yes") || lower.includes("అవును") || lower.includes("हाँ") || lower.includes("have");
      updatedFormData.has_bank_account = lower.includes("yes") || lower.includes("అవును") || lower.includes("हाँ") || lower.includes("have");
    }

    const nextQ = transcript.trim() ? Math.min(currentQuestionNumber + 1, 9) : currentQuestionNumber;
    const t = TTS_TRANSLATIONS[activeLang] || TTS_TRANSLATIONS["English"];
    let speakText = "";
    let actionStr = "ask_question";

    if (!transcript.trim()) {
      speakText = currentQuestionNumber === 1 ? t.greet : t[`q${currentQuestionNumber}`];
    } else if (nextQ === 1) {
      speakText = t.q1;
    } else if (nextQ === 2) {
      speakText = t.q2;
    } else if (nextQ === 3) {
      speakText = t.q3;
    } else if (nextQ === 4) {
      speakText = t.q4;
    } else if (nextQ === 5) {
      speakText = t.q5;
    } else if (nextQ === 6) {
      speakText = t.q6;
    } else if (nextQ === 7) {
      speakText = t.q7;
    } else if (nextQ === 8) {
      speakText = t.q8;
    } else if (nextQ === 9) {
      if (lower.includes("yes") || lower.includes("అవును") || lower.includes("हाँ") || lower.includes("correct") || lower.includes("సరైన") || lower.includes("right") || lower.includes("ok")) {
        speakText = t.success;
        actionStr = "form_ready";
      } else {
        speakText = t.confirm;
        actionStr = "confirm_form";
      }
    }

    if (transcript.trim()) {
      setChatLog(prev => [...prev, { sender: 'user', text: transcript, lang: activeLang }]);
    }

    const finalQ = Math.min(actionStr === "form_ready" ? 8 : nextQ, 8);
    setCurrentQuestionNumber(finalQ);
    setAction(actionStr);
    setSpeakText(speakText);
    setDisplayText(speakText);
    setNeedsClarification(false);
    
    // Save details
    setCompleteFormData(updatedFormData);
    if (onUpdate) onUpdate(updatedFormData);

    const missing: string[] = [];
    if (!updatedFormData.full_name) missing.push("full_name");
    if (!updatedFormData.age) missing.push("age");
    if (!updatedFormData.gender) missing.push("gender");
    if (!updatedFormData.state) missing.push("state");
    if (!updatedFormData.district) missing.push("district");
    if (!updatedFormData.occupation) missing.push("occupation");
    if (!updatedFormData.monthly_income) missing.push("monthly_income");
    if (updatedFormData.has_aadhaar === null) missing.push("has_aadhaar");
    if (updatedFormData.has_bank_account === null) missing.push("has_bank_account");
    setMissingFields(missing);

    setChatLog(prev => [...prev, { sender: 'assistant', text: speakText, lang: activeLang }]);
    setUserInputText('');

    if (actionStr === "form_ready") {
      setVoiceState('form_complete');
      setTimeout(() => {
        onComplete(updatedFormData);
      }, 2000);
    } else {
      setVoiceState('ready_to_listen');
    }

    handleTextToSpeech(speakText, activeLang);
  };

  const handleVoiceAgentTurn = async (audioBlob: Blob | null, textOverride?: string, langOverride?: string) => {
    const activeLang = langOverride || selectedLanguage;
    const transcript = textOverride !== undefined ? textOverride : userInputText;
    setIsLoading(true);

    if (!transcript && !audioBlob) {
      // Initial greeting turn
      setVoiceState('understanding');
    } else if (audioBlob) {
      setVoiceState('transcribing');
    } else {
      setVoiceState('understanding');
    }

    cleanupVoiceResources();

    try {
      let audioBase64 = null;
      let audioMimeType = null;
      if (audioBlob) {
        audioMimeType = audioBlob.type;
        audioBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // get raw base64
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      }

      const payload = {
        audio_base64: audioBase64,
        audio_mime_type: audioMimeType,
        user_voice_transcript: transcript.trim() ? transcript : null,
        selected_language: activeLang,
        current_question_number: String(currentQuestionNumber),
        form_state: completeFormData,
        conversation_state: chatLog
      };

      if (audioBlob) setVoiceState('transcribing');
      
      const response = await fetch('/api/ai/voice-agent-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      setVoiceState('understanding');

      if (!response.ok) throw new Error('Voice agent endpoint error');

      const turnResult = await response.json();
      const transcribedText = turnResult.transcript || transcript || '';

      if (transcribedText.trim()) {
        setChatLog(prev => [...prev, { sender: 'user', text: transcribedText, lang: activeLang }]);
      }

      const data = turnResult.data;
      if (data) {
        setCurrentQuestionNumber(data.current_question_number);
        setAction(data.action);
        setSpeakText(data.speak || '');
        setDisplayText(data.display_text || data.speak || '');
        setNeedsClarification(data.needs_clarification || false);

        // Update profile form
        if (data.complete_form_data) {
          setVoiceState('updating_profile');
          setCompleteFormData(data.complete_form_data);
          if (onUpdate) onUpdate(data.complete_form_data);
        }
        if (data.missing_fields) setMissingFields(data.missing_fields);

        setChatLog(prev => [...prev, { sender: 'assistant', text: data.speak || '', lang: activeLang }]);
        setUserInputText('');

        // Handle clarification state
        if (data.needs_clarification) {
          setVoiceState('asking_clarification');
        } else if (data.form_ready) {
          setVoiceState('form_complete');
        }

        // Speak the assistant response
        const textToSpeak = data.speak || '';
        if (textToSpeak) {
          if (turnResult.audio) {
            playBase64Audio(turnResult.audio, textToSpeak);
          } else {
            handleTextToSpeech(textToSpeak, activeLang);
          }
        } else {
          setVoiceState('ready_to_listen');
        }

        if (data.form_ready) {
          setTimeout(() => {
            onComplete(data.complete_form_data);
          }, 2000);
        }
      }
    } catch (err) {
      console.warn('Voice agent turn error, running offline simulator:', err);
      runClientSideSimulator(transcript, activeLang);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    cleanupVoiceResources();
    setCompleteFormData({
      full_name: null, age: null, gender: null, state: null,
      district: null, occupation: null, monthly_income: null,
      is_student: false, is_farmer: false, is_worker: false,
      is_woman: false, is_senior_citizen: false, is_migrant: false,
      is_disabled: false, has_aadhaar: null, has_bank_account: null
    });
    setCurrentQuestionNumber(1);
    setAction('ask_question');
    setChatLog([]);
    setUserInputText('');
    setSpeakText('');
    setDisplayText('');
    lastAudioBase64Ref.current = null;
    setVoiceState('idle');
    setMissingFields(["full_name", "age", "gender", "state", "district", "occupation", "monthly_income", "has_aadhaar", "has_bank_account"]);
    setTimeout(() => handleVoiceAgentTurn(null, ''), 100);
  };

  const canRecord = voiceState === 'ready_to_listen' || voiceState === 'idle' || voiceState === 'error_voice_failed' || voiceState === 'asking_clarification';
  const suggestions = SUGGESTED_RESPONSES[selectedLanguage]?.[currentQuestionNumber] || SUGGESTED_RESPONSES["English"]?.[currentQuestionNumber] || [];
  const stateLabel = VOICE_STATE_LABELS[voiceState];
  const stateBadgeColor = VOICE_STATE_COLORS[voiceState];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-teal-950/80 backdrop-blur-sm flex items-center justify-center p-4" id="voice-assistant-modal">
      <div className="bg-[#FDFBF7] text-[#1A2E2A] w-full max-w-4xl rounded-[32px] border border-teal-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh]">
        
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-teal-900 p-2.5 rounded-2xl text-teal-300">
                <Bot className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-teal-900">AWAAZ Voice Assistant</h4>
                <p className="text-[10px] text-gray-400 font-mono">12 LANGUAGES • SARVAM AI VOICE</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-teal-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="my-6 flex-1 flex flex-col justify-center space-y-4">
            <div className="bg-teal-50/50 border border-teal-100 rounded-3xl p-6 relative">
              <span className={`absolute -top-2.5 left-6 text-[9px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${stateBadgeColor}`}>
                {stateLabel}
              </span>
              
              <p className="font-serif text-xl md:text-2xl font-bold leading-relaxed text-teal-950 italic">
                "{displayText || "Loading your helper assistant..."}"
              </p>

              {voiceState === 'error_microphone_denied' && (
                <div className="mt-3 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-xl p-2">
                  <MicOff className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-xs text-red-700 font-semibold">Microphone permission is needed for voice help. Please allow mic access in your browser.</p>
                </div>
              )}

              <div className="mt-4 flex items-center space-x-2">
                <button
                  id="voice-speak-question-button"
                  onClick={speakAgain}
                  disabled={!displayText || isLoading}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-teal-200 hover:bg-teal-50 rounded-xl text-xs font-bold text-teal-800 transition-colors disabled:opacity-40"
                >
                  <Volume2 className={`h-4 w-4 ${isSynthesizing ? 'text-teal-600 animate-pulse' : 'text-teal-800'}`} />
                  <span>{isSynthesizing ? 'Speaking...' : 'Speak Question'}</span>
                </button>

                {voiceState === 'asking_clarification' && (
                  <span className="text-xs text-orange-700 font-semibold bg-orange-50 border border-orange-200 px-2 py-1 rounded-xl">
                    Please speak again clearly
                  </span>
                )}

                {voiceState === 'form_complete' && (
                  <span className="flex items-center space-x-1 text-xs text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Form Complete!</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  id="voice-language-dropdown"
                  value={selectedLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedLanguage(newLang);
                    setTimeout(() => handleVoiceAgentTurn(null, '', newLang), 100);
                  }}
                  className="bg-white border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-teal-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>

                <input
                  id="voice-input-text"
                  type="text"
                  value={userInputText}
                  onChange={(e) => setUserInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && userInputText.trim()) {
                      handleVoiceAgentTurn(null, userInputText);
                    }
                  }}
                  placeholder="Spoken transcript will appear here..."
                  className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-teal-950 font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />

                <button
                  id="voice-submit-text-button"
                  type="button"
                  onClick={() => handleVoiceAgentTurn(null)}
                  disabled={isLoading || !userInputText.trim()}
                  className="bg-teal-700 hover:bg-teal-800 text-white p-3 rounded-2xl flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <button
                  id="voice-recording-button"
                  onClick={startRealRecording}
                  disabled={isLoading || (!canRecord && !isRecording)}
                  className={`w-full py-3 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold transition-all shadow-md active:scale-95 ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : voiceState === 'error_microphone_denied'
                        ? 'bg-red-100 text-red-700 border border-red-300 cursor-not-allowed'
                        : canRecord
                          ? 'bg-teal-900 hover:bg-teal-950 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>
                        {voiceState === 'transcribing' ? 'Transcribing...' :
                         voiceState === 'understanding' ? 'Understanding...' :
                         voiceState === 'processing_audio' ? 'Processing audio...' :
                         'Loading...'}
                      </span>
                    </>
                  ) : isRecording ? (
                    <>
                      <StopCircle className="h-4 w-4 fill-white" />
                      <span>Recording... Tap to Finish</span>
                    </>
                  ) : voiceState === 'error_microphone_denied' ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      <span>Microphone Access Denied</span>
                    </>
                  ) : voiceState === 'assistant_speaking' ? (
                    <>
                      <Volume2 className="h-4 w-4 text-teal-300 animate-pulse" />
                      <span>Assistant Speaking...</span>
                    </>
                  ) : canRecord ? (
                    <>
                      <Mic className="h-4 w-4 text-teal-300" />
                      <span>Tap to Speak (Voice Input)</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Please Wait...</span>
                    </>
                  )}
                </button>
              </div>

              {(isRecording || isSynthesizing) && (
                <div className="flex items-center justify-center space-x-1.5 py-2">
                  <span className="w-1.5 h-6 bg-teal-600 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-10 bg-teal-700 rounded-full animate-bounce delay-150"></span>
                  <span className="w-1.5 h-8 bg-teal-800 rounded-full animate-bounce delay-300"></span>
                  <span className="w-1.5 h-12 bg-teal-900 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-5 bg-teal-700 rounded-full animate-bounce delay-200"></span>
                </div>
              )}
            </div>

            {suggestions.length > 0 && voiceState !== 'form_complete' && (
              <div className="space-y-1.5 mt-2 bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                  Demo answers — tap to simulate speaking ({selectedLanguage}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, sIdx) => (
                    <button
                      id={`voice-suggestion-btn-${sIdx}`}
                      key={sIdx}
                      onClick={() => {
                        setUserInputText(sug);
                        handleVoiceAgentTurn(null, sug);
                      }}
                      disabled={isLoading || isSynthesizing}
                      className="px-2.5 py-1.5 bg-white hover:bg-teal-50 border border-gray-200 rounded-xl text-[11px] font-semibold text-gray-700 hover:text-teal-900 transition-all text-left truncate max-w-xs disabled:opacity-50"
                    >
                      🗣️ "{sug}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <button
              id="voice-reset-assistant-button"
              onClick={handleRestart}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold border border-red-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Reset Assistant</span>
            </button>
            
            <div className="text-[10px] text-gray-400 font-mono">
              {voiceState.toUpperCase()} • Q: {currentQuestionNumber}/8
            </div>
          </div>

        </div>

        <div className="w-full md:w-[320px] bg-white p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-1.5 mb-4 pb-2 border-b border-gray-100">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              <h5 className="font-serif text-sm font-bold text-teal-950">English Normalized Profile</h5>
            </div>

            <p className="text-[10px] text-gray-400 leading-normal mb-4">
              All spoken inputs are automatically translated and normalized into English for government system storage.
            </p>

            <div className="space-y-3">
              {Object.entries(completeFormData).map(([key, val]) => {
                if (key.startsWith('is_') || key.startsWith('has_')) {
                  return (
                    <div key={key} className="flex items-center justify-between bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-500">{FIELD_LABELS[key] || key}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm ${
                        val === true
                          ? 'bg-emerald-50 text-emerald-800'
                          : val === false
                            ? 'bg-red-50 text-red-800'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {val === true ? 'YES' : val === false ? 'NO' : 'PENDING'}
                      </span>
                    </div>
                  );
                }
                
                return (
                  <div key={key} className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide">
                      {FIELD_LABELS[key] || key}
                    </label>
                    <div className="bg-gray-50/50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 flex items-center justify-between min-h-[32px]">
                      <span>{val !== null && val !== undefined ? String(val) : '—'}</span>
                      {val !== null && val !== undefined && (
                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-gray-100">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.round(((9 - missingFields.length) / 9) * 100)}%` }} 
              />
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[10px] text-gray-400 font-bold">PROFILE COMPLETENESS</span>
              <span className="text-[10px] text-teal-800 font-extrabold">{Math.round(((9 - missingFields.length) / 9) * 100)}%</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
