import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, MessageSquare, ChevronRight, X, Loader } from 'lucide-react';
import { fetchSuggestedInquiriesForScreen, queryUniversalCompanion, ScreenInquirySet } from '../lib/ai/universalCompanion';

interface SuggestedInquiriesProps {
  screenId: string;
  onQuerySelect?: (query: string, response: string) => void;
}

export const SuggestedInquiries: React.FC<SuggestedInquiriesProps> = ({ screenId, onQuerySelect }) => {
  const [inquirySet, setInquirySet] = useState<ScreenInquirySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInquiries = async () => {
      setLoading(true);
      try {
        const data = await fetchSuggestedInquiriesForScreen(screenId);
        setInquirySet(data);
      } catch (e) {
        console.error("Failed to load suggested inquiries", e);
      } finally {
        setLoading(false);
      }
    };
    loadInquiries();
  }, [screenId]);

  const handleInquiryClick = async (query: string) => {
    setActiveQuery(query);
    setAiResponse(null);
    setIsProcessing(true);
    
    try {
      const response = await queryUniversalCompanion(query);
      setAiResponse(response);
      if (onQuerySelect) {
        onQuerySelect(query, response);
      }
    } catch (e) {
      setAiResponse("I'm sorry, I couldn't process that request right now. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeResponse = () => {
    setActiveQuery(null);
    setAiResponse(null);
  };

  if (loading) {
    return (
      <div className="flex space-x-3 overflow-x-auto pb-4 pt-2 hide-scrollbar px-4 opacity-50">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-48 h-12 bg-gray-200 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!inquirySet || inquirySet.inquiries.length === 0) {
    return null; // Don't render if no inquiries for this screen
  }

  return (
    <div className="w-full relative z-10">
      {/* Active Response Overlay */}
      {activeQuery && (
        <div className="fixed inset-0 bg-teal-950/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-teal-50/50">
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-900 p-2 rounded-xl text-teal-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-teal-950">AI Companion</h4>
                  <p className="text-[10px] text-teal-700 font-semibold">{inquirySet.title}</p>
                </div>
              </div>
              <button 
                onClick={closeResponse}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4">
                <span className="inline-block px-3 py-1.5 bg-gray-100 rounded-2xl text-xs font-semibold text-gray-800">
                  {activeQuery}
                </span>
              </div>
              
              <div className="bg-teal-50/30 border border-teal-100 rounded-2xl p-4 flex gap-3">
                <Sparkles className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                {isProcessing ? (
                  <div className="flex items-center gap-2 text-teal-700 text-sm font-medium h-12">
                    <Loader className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-800 font-medium">
                    {aiResponse}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Carousel */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{inquirySet.title} suggestions</span>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="flex space-x-2.5 overflow-x-auto pb-4 pt-1 hide-scrollbar -mx-4 px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {inquirySet.inquiries.map((inq) => (
            <button
              key={inq.id}
              onClick={() => handleInquiryClick(inq.query)}
              className="snap-start flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-teal-100 hover:border-teal-300 hover:bg-teal-50 shadow-sm rounded-full transition-all group active:scale-95"
            >
              <MessageSquare className="h-3.5 w-3.5 text-teal-600 group-hover:text-teal-700" />
              <span className="text-xs font-semibold text-gray-700 group-hover:text-teal-900 whitespace-nowrap">
                {inq.label}
              </span>
            </button>
          ))}
          {/* Spacer for right padding in scrolling container */}
          <div className="w-1 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};
