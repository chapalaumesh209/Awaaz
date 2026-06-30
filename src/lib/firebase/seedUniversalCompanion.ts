import { dbClient } from '../supabaseClient'; // Mock client, keeping structure intact

const COMPANION_KNOWLEDGE = [
  // ... General / Onboarding ...
  {
    category: 'General',
    intent: 'greeting',
    query_pattern: ['hello', 'hi', 'namaste', 'start', 'help', 'what can you do', 'who are you'],
    response_template: "Namaste! I am the AWAAZ Universal Assistant. I can help you find government schemes, learn how to get documents like Aadhaar, report safety issues, or connect with local volunteers. What do you need help with today?"
  },
  {
    category: 'General',
    intent: 'capabilities',
    query_pattern: ['what do you do', 'how does this work', 'features', 'tell me about awaaz'],
    response_template: "AWAAZ gives you a single voice interface to the government. We offer 5 main services: 1. Scheme matching based on your profile. 2. Document guidance. 3. Safety reporting. 4. Civic voice recordings for local issues. 5. Volunteer matching."
  },

  // ... Schemes ...
  {
    category: 'Schemes',
    intent: 'find_schemes',
    query_pattern: ['find schemes', 'what schemes am i eligible for', 'government benefits', 'money', 'financial help'],
    response_template: "To find schemes, I need to know a bit about you. Tap 'Update Profile' so I can ask you a few questions about your age, occupation, and location, and I will match you instantly."
  },
  {
    category: 'Schemes',
    intent: 'scheme_pm_kisan',
    query_pattern: ['pm kisan', 'farmer scheme', 'agriculture money', '6000 rupees'],
    response_template: "PM-KISAN provides ₹6,000 per year to landholding farmer families. To apply, you need your Aadhaar, bank account details, and land record documents. You can apply at the Common Service Centre (CSC)."
  },
  {
    category: 'Schemes',
    intent: 'scheme_mgnrega',
    query_pattern: ['mgnrega', 'nrega', '100 days work', 'rural employment', 'daily wage'],
    response_template: "MGNREGA guarantees 100 days of wage employment in a financial year to rural households. You must be 18+ and live in a rural area. Register at your Gram Panchayat to get a Job Card."
  },
  {
    category: 'Schemes',
    intent: 'scheme_pm_matru_vandana',
    query_pattern: ['pmmvy', 'maternity benefit', 'pregnant', 'mother scheme', 'pregnancy money'],
    response_template: "Pradhan Mantri Matru Vandana Yojana (PMMVY) offers ₹5,000 for the first living child to pregnant women and lactating mothers to help with nutrition and wage loss."
  },

  // ... Documents ...
  {
    category: 'Documents',
    intent: 'get_aadhaar',
    query_pattern: ['how to get aadhaar', 'aadhaar card', 'lost aadhaar', 'update aadhaar'],
    response_template: "To get or update an Aadhaar card, visit your nearest Aadhaar Enrollment Centre or Common Service Centre (CSC). You will need Proof of Identity (like a PAN card) and Proof of Address (like a ration card)."
  },
  {
    category: 'Documents',
    intent: 'get_pan',
    query_pattern: ['how to get pan', 'pan card', 'tax card'],
    response_template: "You can apply for a PAN card online through the NSDL or UTIITSL website, or visit a local PAN center. You need an Aadhaar card and two passport photos."
  },
  {
    category: 'Documents',
    intent: 'get_ration_card',
    query_pattern: ['ration card', 'food card', 'pds', 'subsidized food'],
    response_template: "Ration cards are issued by the state government. You can apply at the local Food and Civil Supplies office or online via your state portal. You need Aadhaar and income proof."
  },
  {
    category: 'Documents',
    intent: 'get_voter_id',
    query_pattern: ['voter id', 'election card', 'epic', 'vote'],
    response_template: "You can register for a Voter ID online through the NVSP portal (voters.eci.gov.in) using Form 6, provided you are 18 years or older."
  },

  // ... Safety ...
  {
    category: 'Safety',
    intent: 'safety_emergency',
    query_pattern: ['help', 'emergency', 'danger', 'police', 'attacked', 'unsafe'],
    response_template: "If you are in immediate danger, please dial 112 (National Emergency Number) or 1091 (Women Helpline) immediately. If it's safe to do so, use the red SOS button on the AWAAZ Safety screen to alert nearby volunteers."
  },
  {
    category: 'Safety',
    intent: 'safety_report',
    query_pattern: ['report harassment', 'unsafe area', 'dark street', 'eve teasing'],
    response_template: "You can report unsafe areas anonymously on the AWAAZ Safety map. This data helps volunteers and local authorities improve street lighting and police patrols."
  },
  {
    category: 'Safety',
    intent: 'safety_domestic_violence',
    query_pattern: ['domestic violence', 'husband beating', 'abuse at home'],
    response_template: "You are not alone. Please call 1091 (Women Helpline) or 181 (Domestic Abuse Helpline). You can also request a confidential check-in from an AWAAZ volunteer via the Safety screen."
  },

  // ... Reporting ...
  {
    category: 'Reporting',
    intent: 'report_corruption',
    query_pattern: ['bribe', 'corruption', 'officer asking money', 'panchayat fraud'],
    response_template: "It is illegal for officials to ask for bribes. You can record a voice complaint in the 'Civic Voice' section of AWAAZ. We will route it to the state Anti-Corruption Bureau anonymously."
  },
  {
    category: 'Reporting',
    intent: 'report_infrastructure',
    query_pattern: ['broken road', 'no water', 'electricity cut', 'garbage'],
    response_template: "For civic issues like broken roads or water supply, use the 'Civic Voice' recorder. Describe the issue and location, and AWAAZ will transcribe and send it to your local municipal ward officer."
  },
  {
    category: 'Reporting',
    intent: 'report_child_labor',
    query_pattern: ['child labor', 'child marriage', 'kids working'],
    response_template: "Child labor and child marriage are severe crimes. Please call 1098 (Childline) immediately to report it. You can also log an anonymous tip in the AWAAZ reporting tab."
  },

  // ... Civic Voice ...
  {
    category: 'Civic',
    intent: 'civic_voice_how',
    query_pattern: ['what is civic voice', 'how to record', 'send voice to government'],
    response_template: "Civic Voice allows you to speak your community problems directly into the app in your local language. We transcribe it, summarize it in English, and submit it to the relevant local authorities on your behalf."
  },

  // ... Volunteers ...
  {
    category: 'Volunteers',
    intent: 'volunteer_request',
    query_pattern: ['need a volunteer', 'need help at office', 'someone to come with me'],
    response_template: "If you need an escort to a government office or help filling out physical forms, go to the Citizen Dashboard and tap 'Request Volunteer'. A verified local NGO worker will be assigned to you."
  },
  {
    category: 'Volunteers',
    intent: 'volunteer_become',
    query_pattern: ['how to volunteer', 'join ngo', 'help others'],
    response_template: "To become an AWAAZ volunteer, you must log in through the Volunteer Portal. Registration requires background verification by an affiliated NGO partner."
  },

  // ... Application Tracker ...
  {
    category: 'Tracker',
    intent: 'track_status',
    query_pattern: ['track application', 'status of scheme', 'where is my money'],
    response_template: "You can track your scheme applications on the Citizen Dashboard. Tap 'Active Applications' to see if your request is Pending, Approved, or Rejected."
  },

  // ... Language & Profile ...
  {
    category: 'Language',
    intent: 'change_language',
    query_pattern: ['speak hindi', 'change language', 'tamil', 'telugu', 'marathi'],
    response_template: "You can change the language at the top right of the screen. AWAAZ supports 12 languages including Hindi, Telugu, Tamil, Marathi, and Bengali."
  },
  {
    category: 'Profile',
    intent: 'delete_data',
    query_pattern: ['delete my profile', 'remove data', 'privacy'],
    response_template: "Your privacy is our priority. You can clear your profile data anytime by going to Settings and selecting 'Delete My Data'."
  }
];

export const INQUIRY_SETS = {
  'CitizenDashboard': {
    title: 'Dashboard Help',
    inquiries: [
      { id: 'cd1', label: 'How do I update my profile?', query: 'How do I update my profile?' },
      { id: 'cd2', label: 'What is the volunteer service?', query: 'What is the volunteer service?' },
      { id: 'cd3', label: 'How do I track my applications?', query: 'How do I track my applications?' },
      { id: 'cd4', label: 'Change app language', query: 'Change app language' }
    ]
  },
  'SchemesView': {
    title: 'Scheme Assistance',
    inquiries: [
      { id: 'sv1', label: 'What am I eligible for?', query: 'What schemes am I eligible for?' },
      { id: 'sv2', label: 'PM Kisan details', query: 'Tell me about PM Kisan' },
      { id: 'sv3', label: 'MGNREGA details', query: 'Tell me about MGNREGA' },
      { id: 'sv4', label: 'Maternity benefits', query: 'What are the maternity benefits?' }
    ]
  },
  'SafetyView': {
    title: 'Safety Options',
    inquiries: [
      { id: 'saf1', label: 'How does SOS work?', query: 'How does the SOS button work?' },
      { id: 'saf2', label: 'Report unsafe area', query: 'How do I report an unsafe area?' },
      { id: 'saf3', label: 'Domestic violence help', query: 'I need help with domestic violence' },
      { id: 'saf4', label: 'Request safe escort', query: 'How do I request a safe escort?' }
    ]
  },
  'ReportView': {
    title: 'Reporting Guide',
    inquiries: [
      { id: 'rep1', label: 'How to get Aadhaar', query: 'How to get an Aadhaar card?' },
      { id: 'rep2', label: 'How to get Ration Card', query: 'How to get a Ration card?' },
      { id: 'rep3', label: 'Report corruption', query: 'How do I report an official asking for a bribe?' },
      { id: 'rep4', label: 'Report child labor', query: 'How do I report child labor?' }
    ]
  },
  'CivicVoiceView': {
    title: 'Civic Voice Help',
    inquiries: [
      { id: 'cv1', label: 'How to record an issue', query: 'How do I record a civic issue?' },
      { id: 'cv2', label: 'Who receives my recording?', query: 'Who receives my civic voice recording?' },
      { id: 'cv3', label: 'Report broken road', query: 'I want to report a broken road' },
      { id: 'cv4', label: 'Is this anonymous?', query: 'Are my civic voice recordings anonymous?' }
    ]
  },
  'AiAssistantView': {
    title: 'Ask the Companion',
    inquiries: [
      { id: 'ai1', label: 'What can you do?', query: 'What can you do?' },
      { id: 'ai2', label: 'Find financial help', query: 'Find financial help for me' },
      { id: 'ai3', label: 'Emergency numbers', query: 'What are the emergency numbers?' },
      { id: 'ai4', label: 'How does AWAAZ work?', query: 'How does AWAAZ work?' }
    ]
  }
};

export const seedUniversalCompanionKnowledge = async () => {
  console.log('Admin: Seeding Universal Companion Knowledge Base (Mock)');
  
  // Since we are not using a real backend here for this demo, 
  // we will just return a success state to the Admin panel.
  // In a real Firebase setup, we would loop through COMPANION_KNOWLEDGE and INQUIRY_SETS 
  // and dbClient.from('collection').insert().
  
  return {
    success: true,
    written: COMPANION_KNOWLEDGE.length + Object.keys(INQUIRY_SETS).length,
    errors: []
  };
};
