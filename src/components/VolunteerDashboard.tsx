import React, { useState, useEffect } from 'react';
import { VolunteerCase, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { 
  Users2, MessageSquare, AlertTriangle, Filter, 
  ChevronRight, RefreshCw, Inbox, Compass 
} from 'lucide-react';

interface VolunteerDashboardProps {
  currentLanguage: LanguageCode;
  onNavigate: (route: string, params?: Record<string, string>) => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  currentLanguage,
  onNavigate
}) => {
  const [cases, setCases] = useState<VolunteerCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const list = await dbClient.getVolunteerCases();
      setCases(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchCat = filterCategory === 'All' || c.category === filterCategory;
    const matchPrior = filterPriority === 'All' || c.priority === filterPriority;
    return matchCat && matchPrior;
  });

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-100 font-extrabold animate-pulse';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100 font-bold';
      default: return 'bg-gray-50 text-gray-600 border-gray-100 font-medium';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'scheme_help': return 'Scheme Filing Support';
      case 'document_help': return 'Identity Papers Audit';
      default: return 'Direct Administrative Help';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="volunteer-dashboard">
      
      {/* Dashboard Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6 mb-8">
        <div>
          <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
            Panchayat Volunteer Case Desk
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Review and pick up pending citizen requests from your designated panchayat sectors.
          </p>
        </div>

        <button
          onClick={loadCases}
          disabled={loading}
          className="mt-4 md:mt-0 flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 text-teal-800 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Volunteer Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
          <span className="block text-2xl font-extrabold text-teal-900">{cases.length}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">Total Active Cases</span>
        </div>

        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
          <span className="block text-2xl font-extrabold text-amber-600">
            {cases.filter(c => c.status === 'new').length}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">Unassigned Queue</span>
        </div>

        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
          <span className="block text-2xl font-extrabold text-emerald-600">
            {cases.filter(c => c.status === 'resolved').length}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">Completed Audits</span>
        </div>
      </div>

      {/* Filters Desk */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-gray-50/50 border border-gray-100 p-4 rounded-2xl">
        <div className="flex items-center space-x-1 text-xs font-bold text-gray-500 mr-2">
          <Filter className="h-4 w-4" />
          <span>Filter Desk</span>
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
        >
          <option value="All">All Categories</option>
          <option value="scheme_help">Scheme Support</option>
          <option value="document_help">Identity Papers</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
        >
          <option value="All">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Standard Priority</option>
        </select>
      </div>

      {/* Case Grid list */}
      <div className="space-y-3" id="volunteer-cases-queue">
        {filteredCases.map((cs) => (
          <div
            key={cs.id}
            onClick={() => onNavigate('volunteer-case-detail', { id: cs.id })}
            className="bg-white border border-teal-100/50 hover:border-teal-300 rounded-3xl p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
          >
            <div className="flex items-start space-x-3.5">
              <div className="bg-teal-50 p-3 rounded-2xl text-teal-600 shrink-0">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-sans text-sm font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                    {cs.citizenName}
                  </h4>
                  <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-sm">
                    {cs.primaryLanguage}
                  </span>
                </div>
                <span className="block text-xs font-semibold text-gray-500 mt-1">
                  {getCategoryLabel(cs.category)}
                </span>
                <p className="text-xs text-gray-400 mt-2 line-clamp-1 max-w-xl font-medium">
                  Notes: {cs.notes}
                </p>
              </div>
            </div>

            {/* Badges & Actions */}
            <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${getPriorityStyle(cs.priority)}`}>
                {cs.priority} priority
              </span>

              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                cs.status === 'resolved' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : cs.status === 'assigned' 
                  ? 'bg-blue-50 text-blue-700 border-blue-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {cs.status}
              </span>

              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>

          </div>
        ))}

        {filteredCases.length === 0 && (
          <div className="bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 py-12 px-4 text-center">
            <Inbox className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h4 className="font-sans text-sm font-bold text-gray-700">No matching cases in queue</h4>
            <p className="text-xs text-gray-400 mt-1">Clear filters or refresh queue.</p>
          </div>
        )}
      </div>

    </div>
  );
};
export default VolunteerDashboard;
