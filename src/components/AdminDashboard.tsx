import React, { useState, useEffect } from 'react';
import { Scheme, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { SCHEMES } from '../data/schemes';
import { 
  BarChart, Landmark, Settings, Users2, ShieldCheck, 
  Trash2, Plus, Save, BookOpen, AlertCircle, Sparkles 
} from 'lucide-react';

interface AdminDashboardProps {
  currentLanguage: LanguageCode;
  onNavigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentLanguage, onNavigate }) => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  
  // New scheme creation states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('Business');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>(['aadhaar']);

  // Eligibility rules states
  const [rules, setRules] = useState<{ field: string; operator: string; value: string }[]>([
    { field: 'age', operator: 'greater_than_equal', value: '18' }
  ]);

  useEffect(() => {
    loadAdminSchemes();
  }, []);

  const loadAdminSchemes = async () => {
    // In our backend client, get custom + default schemes
    const customList = await dbClient.getSchemes();
    // Merge or overwrite
    const merged = [...customList];
    setSchemes(merged);
  };

  const handleDocSelection = (doc: string) => {
    if (requiredDocs.includes(doc)) {
      setRequiredDocs(requiredDocs.filter(d => d !== doc));
    } else {
      setRequiredDocs([...requiredDocs, doc]);
    }
  };

  const handleAddRuleRow = () => {
    setRules([...rules, { field: 'householdIncome', operator: 'less_than_equal', value: '150000' }]);
  };

  const handleRemoveRuleRow = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleRuleChange = (idx: number, key: string, val: string) => {
    const updated = [...rules];
    (updated[idx] as any)[key] = val;
    setRules(updated);
  };

  const handlePublishScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newScheme: Omit<Scheme, 'id'> = {
      name,
      department,
      category,
      description,
      benefits,
      requiredDocuments: requiredDocs,
      rules: rules.map(r => ({
        field: r.field as any,
        operator: r.operator as any,
        value: r.value
      }))
    };

    try {
      const saved = await dbClient.saveScheme(newScheme);
      
      // Add to schemes local state
      setSchemes([saved, ...schemes]);

      // Reset form
      setName('');
      setDepartment('');
      setDescription('');
      setBenefits('');
      setRequiredDocs(['aadhaar']);
      setRules([{ field: 'age', operator: 'greater_than_equal', value: '18' }]);
      setShowCreateForm(false);
      
      alert(`🎉 New Welfare Scheme published successfully!\n\n"${newScheme.name}" is now live in the global citizen catalog. Switch roles to Citizen Mode to verify live rule matches.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteScheme = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this government scheme? Citizens will lose immediate access.");
    if (confirmDelete) {
      await dbClient.deleteScheme(id);
      setSchemes(schemes.filter(s => s.id !== id));
      alert("✅ Scheme deleted from catalog.");
    }
  };

  // Static analytics figures
  const adminMetrics = [
    { title: 'Citizen Registrations', count: '4,528+', desc: 'Direct biometric proxy profiles logged', icon: <Users2 className="h-5 w-5" /> },
    { title: 'Grievance Resolution', count: '98.4%', desc: 'Complaints fully investigated', icon: <ShieldCheck className="h-5 w-5" /> },
    { title: 'Welfare Disbursed', count: '₹18.4 Lakhs', desc: 'Through direct benefit channels', icon: <Landmark className="h-5 w-5" /> }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="admin-dashboard">
      
      {/* View Header */}
      <div className="border-b border-gray-100 pb-4 mb-8">
        <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
          Admin Impact & Scheme Desk
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Monitor village registrations, analyze regional welfare disbursements, and manage the master schemes directory.
        </p>
      </div>

      {/* Analytics metrics grids */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {adminMetrics.map((met, i) => (
          <div key={i} className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs flex items-start space-x-3.5">
            <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600 shrink-0">
              {met.icon}
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-gray-900 leading-tight">{met.count}</span>
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">{met.title}</span>
              <span className="block text-[10px] text-gray-400 mt-1 leading-normal font-medium">{met.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column layout: Scheme CRUD vs regional charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Scheme CRUD listing and form */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-teal-700" />
                <h3 className="font-sans text-lg font-bold text-gray-900">Government Schemes Catalog</h3>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Publish New Scheme</span>
              </button>
            </div>

            {/* CREATE SCHEME FORM */}
            {showCreateForm && (
              <form onSubmit={handlePublishScheme} className="bg-gray-50/50 rounded-2xl p-5 border border-teal-100/50 mb-6 space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-200 pb-3 mb-2">
                  <Sparkles className="h-4 w-4 text-teal-600 animate-spin" />
                  <span className="text-xs font-bold text-teal-950">Publish Live Welfare Program</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Scheme Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Central India Weaver toolkit grant"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Handlooms & Textiles Ministry"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    >
                      <option value="Business">Business</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Scholarship">Scholarship</option>
                      <option value="Pension">Pension</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estimated Benefits</label>
                    <input
                      type="text"
                      required
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      placeholder="e.g. ₹15,000 cash grant & support kit"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Detailed Description</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide simple parameters for citizens to read..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                {/* Identity papers selector checkboxes */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Required Identity Papers</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['aadhaar', 'ration_card', 'voter_id', 'income_cert', 'caste_cert', 'disability_cert'].map((doc) => {
                      const selected = requiredDocs.includes(doc);
                      return (
                        <button
                          key={doc}
                          type="button"
                          onClick={() => handleDocSelection(doc)}
                          className={`p-2 rounded-xl text-center text-[10px] uppercase font-bold border transition-all ${
                            selected ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-gray-200 text-gray-500'
                          }`}
                        >
                          {doc.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Eligibility rule rows */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Target Eligibility Rules</label>
                    <button
                      type="button"
                      onClick={handleAddRuleRow}
                      className="text-[10px] font-extrabold text-teal-600 hover:text-teal-800 flex items-center space-x-0.5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Rule Parameter</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {rules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={rule.field}
                          onChange={(e) => handleRuleChange(idx, 'field', e.target.value)}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
                        >
                          <option value="age">Age</option>
                          <option value="householdIncome">Household Income</option>
                          <option value="gender">Gender (male/female)</option>
                          <option value="state">State</option>
                        </select>

                        <select
                          value={rule.operator}
                          onChange={(e) => handleRuleChange(idx, 'operator', e.target.value)}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
                        >
                          <option value="greater_than_equal">≥</option>
                          <option value="less_than_equal">≤</option>
                          <option value="equals">=</option>
                        </select>

                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => handleRuleChange(idx, 'value', e.target.value)}
                          placeholder="value"
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:outline-hidden animate-none"
                        />

                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRuleRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700"
                  >
                    Publish Program Live
                  </button>
                </div>

              </form>
            )}

            {/* SCHEME LIST WITH DELETE TRASH ACTIONS */}
            <div className="space-y-3">
              {schemes.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-teal-200 transition-colors">
                  <div className="min-w-0 pr-4">
                    <span className="block text-xs font-bold text-gray-900 truncate">{s.name}</span>
                    <span className="block text-[10px] text-gray-400 capitalize">{s.category} • {s.department}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteScheme(s.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl shrink-0 transition-colors"
                    title="Delete Scheme Program"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column: Visual Horizontal analytics of Applied programs */}
        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs space-y-6">
          <div>
            <div className="flex items-center space-x-1.5 border-b border-gray-100 pb-3 mb-4">
              <BarChart className="h-5 w-5 text-teal-700 animate-pulse" />
              <h3 className="font-sans text-base font-bold text-gray-900">Top Schemes Applied</h3>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Distribution metrics based on live submitted claims logged through AWAAZ gateways.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                <span>PM Vishwakarma</span>
                <span className="font-bold">450 claims</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full" style={{ width: '90%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                <span>PM SVANidhi</span>
                <span className="font-bold">320 claims</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-teal-700 h-full rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                <span>Ayushman Bharat</span>
                <span className="font-bold">280 claims</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full" style={{ width: '55%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                <span>Pradhan Mantri Awas</span>
                <span className="font-bold">140 claims</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '30%' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default AdminDashboard;
