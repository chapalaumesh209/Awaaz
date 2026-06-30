import React, { useState, useRef, useEffect } from 'react';
import { LanguageCode } from '../types';
import { generateAssistantReply } from '../lib/aiService';
import { TRANSLATIONS } from '../data/translations';
import { Bot, Send, User, Mic, Sparkles, AlertCircle, Volume2, MicOff, Languages } from 'lucide-react';

interface AiAssistantViewProps {
  currentLanguage: LanguageCode;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ currentLanguage }) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];

  const [messages, setMessages] = useState<{ sender: 'citizen' | 'ai'; text: string; timestamp: string }[]>([
    {
      sender: 'ai',
      text: t.botWelcome || "Namaste! I am AWAAZ  आवाज़, your universal multilingual voice companion. I can help explain complex scheme details, guide your missing documents checklist, or draft official panchayat grievance petitions. Ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    // Update or initialize the welcome message in the chosen language
    const welcomeText = t.botWelcome || "Namaste! I am AWAAZ  आवाज़, your universal multilingual companion. Ask me anything!";
    setMessages(prev => {
      if (prev.length === 0) {
        return [{
          sender: 'ai',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
      }
      const updated = [...prev];
      if (updated[0] && updated[0].sender === 'ai') {
        updated[0] = {
          ...updated[0],
          text: welcomeText
        };
      }
      return updated;
    });
  }, [currentLanguage]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage = {
      sender: 'citizen' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Map previous message history to match service formats
      const history = messages.map(m => ({
        sender: m.sender === 'ai' ? 'ai' as const : 'citizen' as const,
        text: m.text
      }));

      const reply = await generateAssistantReply(textToSend, history, currentLanguage);
      
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInputSimulate = () => {
    setIsListening(true);
    // Simulate speech-to-text translating voice commands based on selected language
    let voiceTriggers = [
      "Am I eligible for PM SVANidhi?",
      "How can I apply for PM Vishwakarma?",
      "Where is the nearest document camp in Moinabad?",
      "Draft a letter complaining about sewage block in my street."
    ];

    if (currentLanguage === 'hi') {
      voiceTriggers = [
        "क्या मैं पीएम स्वनिधि के लिए पात्र हूँ?",
        "मैं पीएम विश्वकर्मा के लिए कैसे आवेदन कर सकता हूँ?",
        "मोइनाबाद में निकटतम दस्तावेज़ शिविर कहाँ है?",
        "मेरी सड़क में सीवेज ब्लॉक की शिकायत करने वाला पत्र तैयार करें।"
      ];
    } else if (currentLanguage === 'te') {
      voiceTriggers = [
        "నేను పిఎం స్వనిధికి అర్హురాలినా?",
        "నేను పిఎం విశ్వకర్మ కోసం ఎలా దరఖాస్తు చేసుకోవాలి?",
        "మొయినాబాద్‌లో సమీప పత్రాల శిబిరం ఎక్కడ ఉంది?",
        "మా వీధిలో డ్రైనేజీ సమస్యపై ఫిర్యాదు పత్రం తయారు చేయి."
      ];
    }
    
    const randomTrigger = voiceTriggers[Math.floor(Math.random() * voiceTriggers.length)];
    
    setTimeout(() => {
      setIsListening(false);
      handleSend(randomTrigger);
    }, 2500);
  };

  const questionsMap: Record<string, { text: string; label: string }[]> = {
    en: [
      { text: "What is PM Vishwakarma?", label: "PM Vishwakarma" },
      { text: "Help me check SVANidhi eligibility", label: "SVANidhi Match" },
      { text: "What documents are needed for Ayushman Bharat?", label: "Ayushman Docs" },
      { text: "Draft a letter to District Collector", label: "Grievance Draft" }
    ],
    hi: [
      { text: "पीएम विश्वकर्मा योजना क्या है?", label: "पीएम विश्वकर्मा" },
      { text: "पीएम स्वनिधि पात्रता की जांच करें", label: "स्वनिधि मैच" },
      { text: "आयुष्मान भारत के लिए क्या दस्तावेज चाहिए?", label: "आयुष्मान दस्तावेज" },
      { text: "जिला कलेक्टर को पत्र का मसौदा बनाएं", label: "शिकायत मसौदा" }
    ],
    te: [
      { text: "పిఎం విశ్వకర్మ అంటే ఏమిటి?", label: "పిఎం విశ్వకర్మ" },
      { text: "పిఎం స్వనిధి అర్హతను తనిఖీ చేయి", label: "స్వనిధి మ్యాచ్" },
      { text: "ఆయుష్మాన్ భారత్ కోసం ఏ పత్రాలు కావాలి?", label: "ఆయుష్మాన్ పత్రాలు" },
      { text: "జిల్లా కలెక్టర్‌కు వినతిపత్రం రాయండి", label: "ఫిర్యాదు పత్రం" }
    ]
  };

  const quickQuestions = questionsMap[currentLanguage] || questionsMap['en'];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 h-[calc(100vh-5rem)] flex flex-col bg-[#FDFBF7]" id="ai-assistant-view">
      
      {/* View Header with Editorial Aesthetic */}
      <div className="border-b-2 border-[#E8E2D6] pb-4 mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="bg-teal-950 p-3 rounded-2xl text-teal-400">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-teal-900">{t.aiCompanion || "Universal AI Companion"}</h2>
            <p className="text-xs text-gray-500 font-serif italic mt-0.5">
              Voice-optimized Gemini agent in <span className="text-teal-700 capitalize font-bold font-sans not-italic">{currentLanguage}</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-serif font-bold text-teal-800 bg-[#F3F0E9] border border-[#DED9CE] px-3.5 py-2 rounded-xl">
          <Languages className="h-4 w-4 text-teal-700" />
          <span>{t.voiceGateway || "Multilingual Voice Gateway Active"}</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-[24px] border border-[#E8E2D6] p-5 space-y-5 mb-5 min-h-[250px] shadow-xs">
        {messages.map((m, index) => {
          const isAi = m.sender === 'ai';
          return (
            <div key={index} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex items-start space-x-3 max-w-[85%] ${isAi ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
                
                {/* Avatar Icon */}
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold shrink-0 shadow-xs ${
                  isAi ? 'bg-teal-950 text-teal-400' : 'bg-teal-100 text-teal-800 font-sans'
                }`}>
                  {isAi ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                </div>

                {/* Message Box */}
                <div>
                  <div className={`p-4.5 rounded-[20px] text-xs leading-relaxed font-serif shadow-xs ${
                    isAi 
                      ? 'bg-[#FDFBF7] border border-[#E8E2D6] text-teal-950 rounded-tl-sm' 
                      : 'bg-teal-700 text-white rounded-tr-sm italic font-semibold'
                  }`}>
                    {/* Preserve line breaks for AI generated letters */}
                    <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                  </div>
                  <span className="block text-[9px] text-gray-400 mt-1.5 font-mono px-1">
                    {m.timestamp}
                  </span>
                </div>

              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-950 text-teal-400 shrink-0">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="bg-[#FDFBF7] border border-[#E8E2D6] rounded-2xl p-4 shadow-xs flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-teal-700 animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-teal-700 animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 rounded-full bg-teal-700 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        {isListening && (
          <div className="flex justify-end">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 shadow-xs flex items-center space-x-2 animate-pulse font-serif italic text-xs">
              <Mic className="h-4.5 w-4.5 animate-spin text-red-600" />
              <span>Listening & translating voice... Speak now</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Triggers Grid */}
      <div className="mb-5">
        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest font-sans mb-2">
          {t.suggestedInquiries || "Suggested Inquiries"}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q.text)}
              className="p-3 rounded-xl border border-[#E8E2D6] bg-white text-teal-950 hover:bg-[#F3F0E9] text-left text-xs font-serif font-bold transition-all truncate"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input controls */}
      <div className="flex items-center space-x-2.5 border-2 border-teal-600 bg-white p-2 rounded-2xl focus-within:ring-1 focus-within:ring-teal-500 mb-8 shadow-xs">
        <button
          onClick={handleVoiceInputSimulate}
          disabled={loading || isListening}
          className={`h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-teal-800 hover:bg-[#F3F0E9] transition-colors ${
            isListening ? 'bg-red-100 text-red-700 animate-pulse' : ''
          }`}
          title="Simulate Voice Input"
        >
          <Mic className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder={t.typeOrDictate || "Type or dictate questions in Hindi, Telugu, Urdu, Marathi or English..."}
          className="flex-1 text-xs bg-transparent border-none outline-none focus:outline-none font-serif text-teal-950"
          disabled={loading || isListening}
        />

        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || loading || isListening}
          className="h-11 w-11 shrink-0 flex items-center justify-center bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
export default AiAssistantView;
