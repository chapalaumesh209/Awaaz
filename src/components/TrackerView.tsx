import React, { useState, useEffect } from 'react';
import { ApplicationRequest, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { generateGrievanceFollowUp } from '../lib/aiService';
import { 
  Activity, Calendar, ShieldCheck, ChevronRight, MessageSquare, 
  Clock, CheckCircle, RefreshCw, AlertCircle, Sparkles, Inbox 
} from 'lucide-react';

interface TrackerViewProps {
  currentLanguage: LanguageCode;
}

export const TrackerView: React.FC<TrackerViewProps> = ({ currentLanguage }) => {
  const [requests, setRequests] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Escalation AI state
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [escalationResult, setEscalationResult] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = dbClient.subscribeToRequests((list) => {
      setRequests(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const list = await dbClient.getRequests();
      setRequests(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'referred':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'resolved':
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted': return 'Submitted';
      case 'in_progress': return 'In Progress';
      case 'referred': return 'Referred';
      case 'resolved':
      case 'approved': return 'Resolved';
      default: return status;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8" id="tracker-view">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-8">
        <div>
          <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
            My Requests Tracker
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Track filed schemes, secure report complaints, or physical support logs in real time.
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 text-teal-800 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tracker requests queue */}
      <div className="space-y-4" id="tracker-queue">
        {requests.map((req) => {
          const isExpanded = expandedRequestId === req.id;
          return (
            <div
              key={req.id}
              className="bg-white border border-teal-100/50 rounded-3xl p-5 shadow-xs hover:border-teal-300 transition-all cursor-pointer"
              onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
            >
              
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${
                    req.itemType === 'scheme' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-sans text-sm font-bold text-gray-900 leading-tight">
                      {req.itemName}
                    </h3>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-semibold mt-1">
                      <span>Tracking ID: <span className="text-gray-700 font-bold">{req.trackingId}</span></span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Filed: {new Date(req.submittedAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                  <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border ${getStatusStyle(req.status)}`}>
                    {getStatusLabel(req.status)}
                  </span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-5 border-t border-gray-100 pt-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Milestones Pipeline */}
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Progress Timeline</span>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-gray-100">
                      
                      {/* Submission milestone */}
                      <div className="relative before:absolute before:left-[-22px] before:top-1 before:h-2.5 before:w-2.5 before:rounded-full before:bg-teal-600">
                        <span className="block text-xs font-bold text-gray-800">Application Filed Securely</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Logged in AWAAZ central database repository.</p>
                      </div>

                      {/* Volunteer verification milestone */}
                      <div className={`relative before:absolute before:left-[-22px] before:top-1 before:h-2.5 before:w-2.5 before:rounded-full ${
                        (req.status !== 'submitted' && req.status !== 'pending') ? 'before:bg-teal-600' : 'before:bg-gray-200'
                      }`}>
                        <span className="block text-xs font-bold text-gray-800">Assigned to Local Panchayat Volunteer</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Assigned to nearby volunteer Anjali to review income certificate criteria.</p>
                      </div>

                      {/* Final milestone */}
                      <div className={`relative before:absolute before:left-[-22px] before:top-1 before:h-2.5 before:w-2.5 before:rounded-full ${
                        (req.status === 'resolved' || req.status === 'approved') ? 'before:bg-emerald-600' : 'before:bg-gray-200'
                      }`}>
                        <span className="block text-xs font-bold text-gray-800">Verification & Disbursal Cleared</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Official sanction letter uploaded to your digital wallet.</p>
                      </div>

                    </div>
                  </div>

                  {/* Comments log */}
                  {req.updates && req.updates.length > 0 && (
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-3">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Officer Audit logs</span>
                      {req.updates.map((up, i) => (
                        <div key={i} className="flex justify-between items-start text-xs border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                          <div>
                            <span className="block font-bold text-gray-800">{up.status}</span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">{up.comment}</span>
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono shrink-0 ml-2">{up.date}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Direct Volunteer chat assist */}
                  <div className="flex items-center space-x-3 bg-teal-50/40 p-3.5 rounded-2xl border border-teal-100/50 mb-3">
                    <div className="bg-teal-100 text-teal-800 p-2 rounded-xl shrink-0">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-teal-950">Need to modify something?</span>
                      <p className="text-[10px] text-teal-800/80 mt-0.5">
                        Ask volunteer caseworker assigned to this tracking ID to help fix typos.
                      </p>
                    </div>
                  </div>

                  {/* AI Grievance Follow-up Bot & RTI Generator */}
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/40 space-y-3">
                    <div className="flex items-start space-x-2.5">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold text-amber-950">Is this application delayed?</span>
                        <p className="text-[10px] text-amber-800/80 mt-0.5">
                          If this application goes unanswered beyond standard timelines, escalate instantly using our **AI Grievance Follow-up Bot**.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setEscalatingId(req.id);
                          setEscalationResult('');
                          try {
                            const result = await generateGrievanceFollowUp(
                              req.itemName,
                              req.trackingId,
                              req.submittedAt || new Date().toLocaleDateString(),
                              req.updates || [],
                              currentLanguage
                            );
                            setEscalationResult(result);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setEscalatingId(null);
                          }
                        }}
                        className="flex-1 py-2 bg-white border border-amber-200 text-amber-900 rounded-xl text-[10px] font-bold hover:bg-amber-100/50 transition-all flex items-center justify-center space-x-1"
                      >
                        {escalatingId === req.id ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-700" />
                            <span>Generating RTI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                            <span>Generate RTI Appeal</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setEscalatingId(req.id);
                          setEscalationResult('');
                          try {
                            const result = await generateGrievanceFollowUp(
                              req.itemName,
                              req.trackingId,
                              req.submittedAt || new Date().toLocaleDateString(),
                              req.updates || [],
                              currentLanguage
                            );
                            setEscalationResult(result);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setEscalatingId(null);
                          }
                        }}
                        className="flex-1 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-bold hover:bg-amber-700 transition-all flex items-center justify-center space-x-1"
                      >
                        {escalatingId === req.id ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                            <span>Drafting WhatsApp...</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp Escalation</span>
                          </>
                        )}
                      </button>
                    </div>

                    {escalatingId === req.id && (
                      <div className="text-[10px] text-amber-700 animate-pulse font-bold">Drafting formal legal files...</div>
                    )}

                    {escalationResult && escalatingId !== req.id && (
                      <div className="bg-white p-3 rounded-xl border border-amber-200 text-[10px] font-mono whitespace-pre-line text-gray-800 leading-relaxed max-h-[180px] overflow-y-auto">
                        <div className="flex justify-between items-center mb-1.5 border-b pb-1 border-gray-100">
                          <span className="font-sans font-bold text-amber-950 uppercase text-[9px]">Escalation Copy</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(escalationResult);
                              alert("📋 Copied escalation draft to clipboard!");
                            }}
                            className="text-[9px] text-teal-700 font-bold font-sans underline"
                          >
                            Copy text
                          </button>
                        </div>
                        <p>{escalationResult}</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 py-12 px-4 text-center">
            <Inbox className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h4 className="font-sans text-sm font-bold text-gray-700">No requests filed yet</h4>
            <p className="text-xs text-gray-400 mt-1">
              Visit the 'Government Schemes' dashboard, qualify, and file an application to track it here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
export default TrackerView;
