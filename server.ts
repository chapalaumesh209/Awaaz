import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// GEMINI SDK LAZY INITIALIZATION
// ==========================================
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Gemini API Client successfully initialized.");
    } else {
      console.log("No valid GEMINI_API_KEY found. Falling back to intelligent mock engine.");
    }
  }
  return aiClient;
}

// ==========================================
// SEEDED STATEFUL DATABASE
// ==========================================
interface DBState {
  profiles: Record<string, any>;
  documents: any[];
  requests: any[];
  cases: any[];
  reports: any[];
  feedback: any[];
}

const db: DBState = {
  profiles: {
    'user-default': {
      id: 'user-default',
      name: '',
      age: 30,
      gender: 'female',
      occupation: '',
      location: '',
      state: '',
      primaryLanguage: 'en',
      householdIncome: 0,
      category: 'General',
      disabilityStatus: false,
      existingDocuments: [],
      readinessScore: 50,
      createdAt: new Date().toISOString()
    }
  },
  documents: [],
  requests: [],
  cases: [],
  reports: [],
  feedback: []
};

// Seed standard meetings and camps (static)
const MEETINGS = [
  {
    id: 'meet-1',
    title: "Gram Sabha Budget Allocations & Swachh Bharat Scheme Review",
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    location: "Moinabad Panchayat Hall",
    agenda: "Allocation of funds for drainage construction, solar street lighting setup, and auditing local MNREGA job cards.",
    budgetAllocated: "₹12,45,000",
    panchayatName: "Moinabad Gram Panchayat"
  },
  {
    id: 'meet-2',
    title: "Women Empowerment, Digital Literacy & Security Council Meeting",
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    location: "Kondapur Block Community Centre",
    agenda: "Setting up women vigilance groups, explaining state girl child security schemes, and distribution of smart devices.",
    budgetAllocated: "₹4,50,000",
    panchayatName: "Kondapur Panchayat"
  }
];

const CAMPS = [
  {
    id: 'camp-1',
    title: "Moinabad Civic Mega Document Enrollment & Identity Camp",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    location: "Panchayat High School Ground, Moinabad",
    officers: "District Tahsildar, UIDAI Enrollment Officers, Bank Correspondents",
    schemesTargeted: "Aadhaar updates, Income Certificate on-spot issuances, PM SVANidhi applications"
  }
];

// ==========================================
// REST DATABASE ENDPOINTS
// ==========================================

app.get('/api/profiles', (req, res) => {
  const userId = (req.query.userId as string) || 'user-default';
  const profile = db.profiles[userId] || null;
  res.json({ profile });
});

app.post('/api/profiles', (req, res) => {
  const profile = req.body;
  if (!profile.id) {
    profile.id = 'user-' + Math.floor(100000 + Math.random() * 900000);
  }
  db.profiles[profile.id] = profile;
  res.json({ profile });
});

app.get('/api/documents', (req, res) => {
  const userId = (req.query.userId as string) || 'user-default';
  const docs = db.documents.filter(d => d.userId === userId);
  res.json({ documents: docs });
});

app.post('/api/documents', (req, res) => {
  const doc = req.body;
  db.documents.push(doc);
  res.json({ document: doc });
});

app.patch('/api/documents/status', (req, res) => {
  const { id, status } = req.body;
  const doc = db.documents.find(d => d.id === id);
  if (doc) {
    doc.status = status;
  }
  res.json({ success: true });
});

app.get('/api/requests', (req, res) => {
  const userId = (req.query.userId as string) || 'user-default';
  const userRequests = db.requests.filter(r => r.userId === userId);
  res.json({ requests: userRequests });
});

app.post('/api/requests', (req, res) => {
  const request = req.body;
  db.requests.push(request);
  res.json({ request });
});

app.get('/api/cases', (req, res) => {
  res.json({ cases: db.cases });
});

app.post('/api/cases', (req, res) => {
  const volCase = req.body;
  db.cases.push(volCase);
  res.json({ case: volCase });
});

app.patch('/api/cases/update', (req, res) => {
  const { id, updates } = req.body;
  const idx = db.cases.findIndex(c => c.id === id);
  if (idx !== -1) {
    db.cases[idx] = { ...db.cases[idx], ...updates, updatedAt: new Date().toISOString() };
    res.json({ case: db.cases[idx] });
  } else {
    res.status(404).json({ error: "Case not found" });
  }
});

app.get('/api/reports', (req, res) => {
  res.json({ reports: db.reports });
});

app.post('/api/reports', (req, res) => {
  const report = req.body;
  db.reports.push(report);
  res.json({ report });
});

app.get('/api/meetings', (req, res) => {
  res.json({ meetings: MEETINGS });
});

app.get('/api/camps', (req, res) => {
  res.json({ camps: CAMPS });
});

app.post('/api/feedback', (req, res) => {
  const fb = req.body;
  db.feedback.push(fb);
  res.json({ feedback: fb });
});

// ==========================================
// SERVER-SIDE AI CONTROLLER (GEMINI + MOCK)
// ==========================================

// 1. Unified AI Voice & Text Assistant
app.post('/api/ai/assistant', async (req, res) => {
  const { message, history, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const systemInstruction = `You are Awaaz Voice Agent, a multilingual voice-first civic assistant for India.
Your highest priority is to help people who cannot type, cannot read well, or do not know how to navigate digital apps.

The user may be:
* Illiterate
* Low-literacy
* Elderly
* Rural
* A migrant worker
* A daily wage worker
* A domestic worker
* A woman seeking safety/support
* A student
* A farmer
* A person with disability
* Someone uncomfortable with English or complex government language

Your job is to speak naturally, slowly, respectfully, and clearly in the user’s selected language.
Selected language is: '${language}'.

Important voice-first rule:
The user should be able to complete the entire journey by speaking only.
Do not depend on typing.
Do not ask the user to read long text.
Do not give long paragraphs.
Speak in short, simple sentences.
Ask only one question at a time.
Wait for the user’s answer before asking the next question.

Core behavior:
1. Greet the user in the selected language.
2. Ask what help they need.
3. Understand the user’s intent.
4. Guide them step by step.
5. Ask only necessary questions.
6. Extract useful information from spoken answers.
7. Confirm what you understood.
8. Help the user complete the task.
9. If the user is confused, simplify.
10. If the user is in danger or distress, prioritize safety and human support.

Tone:
* Respectful
* Calm
* Supportive
* Non-judgmental
* Simple
* Patient
* Human-like
* Trustworthy

Do not sound robotic.
Do not use complicated government words.
Do not use English if the user selected another language, except for scheme names or official terms that cannot be translated.

Voice output style:
* Short sentences
* Simple words
* One instruction at a time
* Friendly confirmation
* Clear next step

Examples:
Instead of saying: “Please provide your demographic and socioeconomic eligibility information.”
Say: “Please tell me your age.”

Instead of saying: “Your application readiness score is insufficient due to missing documentation.”
Say: “You are almost ready. One document is still missing.”

Important safety rule:
For women safety, domestic violence, discrimination, or emergency-related conversations:
* Be calm and discreet.
* Do not blame the user.
* Do not ask unnecessary personal questions.
* Ask if they are safe right now.
* Offer volunteer or trusted contact support.
* Suggest using the Quick Exit button if needed.
* If there is immediate danger, tell the user to contact local emergency services or a trusted person nearby.

Important legal/government rule:
Do not guarantee scheme approval.
Do not say the user will definitely receive benefits.
Say: “Based on the details you shared, you may be eligible.”
Final approval depends on official government rules and verification.

Important AI rule:
You must not blindly decide government scheme eligibility.
Eligibility should be calculated by the application’s rule engine.
Your role is to:
* Ask questions
* Extract profile information
* Explain schemes
* Explain documents
* Generate next steps
* Help the user understand what to do

When eligibility is needed, collect the required details and return structured data for the rule engine.

Main voice onboarding flow (Ask these questions one by one):
Question 1: “What is your name?”
Question 2: “How old are you?”
Question 3: “What is your gender?”
Question 4: “Which state and district do you live in?”
Question 5: “What work do you do?”
Question 6: “How much do you earn in one month, approximately?”
Question 7: “Are you a student, farmer, worker, senior citizen, migrant worker, or person with disability?”
Question 8: “Do you have Aadhaar and a bank account?”

After collecting answers, confirm: “Here is what I understood. Please tell me if anything is wrong.”
Then summarize: Name, Age, Gender, Location, Occupation, Income, User group, Aadhaar status, Bank account status.
If something is missing, ask only that missing question.

Intent categories: Classify user message into:
* scheme_help, document_help, women_safety, legal_support, discrimination_report, civic_voice, volunteer_help, application_tracking, grievance_followup, general_question, emergency_or_distress, unknown

Output format:
Always return valid JSON. Do not return markdown. Do not return extra explanation outside JSON.

JSON structure:
{
"language": "${language}",
"intent": "detected_intent",
"stage": "current_stage",
"speak": "Short voice response in the selected language",
"display_text": "Same meaning as speak, suitable for screen display",
"next_question": "Next question to ask, if any",
"extracted_data": {
"name": null,
"age": null,
"gender": null,
"state": null,
"district": null,
"occupation": null,
"monthly_income": null,
"user_groups": [],
"has_aadhaar": null,
"has_bank_account": null,
"help_type": null,
"document_type": null,
"report_type": null,
"location": null,
"urgency": null
},
"missing_fields": [],
"suggested_actions": [],
"requires_rule_engine": false,
"requires_document_upload": false,
"requires_volunteer": false,
"requires_emergency_support": false,
"confidence": 0.0
}`;

      // Format previous chat history for Gemini
      const contents = history.map((h: any) => ({
        role: h.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: { 
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        try {
          const parsed = JSON.parse(response.text.trim());
          return res.json({ 
            text: parsed.display_text || parsed.speak,
            responseJson: parsed 
          });
        } catch (err) {
          return res.json({ text: response.text });
        }
      }
    } catch (e) {
      console.error("Gemini Assistant call failed, running mock engine:", e);
    }
  }

  // Smart Context-Aware Mock Generator fallback (runs server-side)
  const text = getIntelligentMockReply(message, language);
  res.json({ text });
});

// 2. Intelligent Citizen Conversation Profile Extractor
app.post('/api/ai/extract-profile', async (req, res) => {
  const { text } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Parse this conversational text from an Indian citizen and extract profile attributes. 
Return ONLY a valid JSON object matching these fields: name, age, gender, occupation, location, state, householdIncome, category. 
If a field is missing, omit it or set it to null. Do not include markdown code blocks.

Text: "${text}"`,
        config: { responseMimeType: "application/json" }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json({ fields: parsed });
      }
    } catch (e) {
      console.error("Gemini Extract Profile failed:", e);
    }
  }

  // Backend local parsing fallback
  const parsed = getIntelligentExtractedFields(text);
  res.json({ fields: parsed });
});

// 3. Scheme Explainer API
app.post('/api/ai/explain-scheme', async (req, res) => {
  const { scheme, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Explain the scheme "${scheme.name}" in simple, comforting terms for a citizen speaking '${language}'. 
Describe: 1. Who is it for? 2. What are the key benefits? 3. Which documents are required? 
Keep it friendly and structured with clean bullet points. Under 150 words.`,
      });
      if (response.text) {
        return res.json({ text: response.text });
      }
    } catch (e) {}
  }

  res.json({ text: getIntelligentSchemeExplanation(scheme, language) });
});

// 4. Practical Step Generator API
app.post('/api/ai/next-steps', async (req, res) => {
  const { scheme, profile, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate 4 specific, actionable, local next steps for ${profile.name} (a ${profile.age}yo ${profile.occupation} in ${profile.location}, ${profile.state}) to apply for "${scheme.name}" in language '${language}'. 
Format your output as a simple JSON string array. No code blocks.`,
        config: { responseMimeType: "application/json" }
      });
      if (response.text) {
        const steps = JSON.parse(response.text.trim());
        return res.json({ steps });
      }
    } catch (e) {}
  }

  res.json({ steps: getIntelligentNextSteps(scheme, profile, language) });
});

// 5. Formal Grievance Letter Drafter
app.post('/api/ai/grievance-draft', async (req, res) => {
  const { type, description, location, targetAuthority, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Draft a formal grievance letter in language '${language}' regarding: ${description}. 
Target authority: ${targetAuthority || 'Block Development Officer'}. 
Location: ${location}. 
The letter should be polite, structured, and compliant with standard Indian local administration petition layouts.`,
      });
      if (response.text) {
        return res.json({ text: response.text });
      }
    } catch (e) {}
  }

  res.json({ text: getIntelligentGrievanceDraft(type, description, location, targetAuthority, language) });
});

// 6. Intelligent Document OCR Simulator
app.post('/api/ai/ocr-mock', (req, res) => {
  const { documentName, citizenName } = req.body;
  const result = getIntelligentOcrResult(documentName, citizenName);
  res.json({ result });
});


// ==========================================
// INTELLIGENT SERVER FALLBACK IMPLEMENTATIONS
// ==========================================

function getIntelligentMockReply(message: string, language: string): string {
  const lowercase = message.toLowerCase();
  if (language === 'hi') {
    return `नमस्ते! आपकी सहायता के लिए धन्यवाद। मुझे यह समझ आया कि आप सरकारी कल्याणकारी सुविधाओं और दस्तावेजों के बारे में जानना चाहते हैं। हकसेतु एआई आपके प्रोफाइल के आधार पर पीएम विश्वकर्मा और पीएम स्वनिधि के लिए सही मार्गदर्शन कर सकता है। क्या आप चाहते हैं कि मैं आपके लिए पात्रता की गणना करूँ?`;
  }
  if (language === 'te') {
    return `నమస్తే! హక్సేతు సహాయకుడితో మాట్లాడినందుకు సంతోషం. మీ ప్రొఫైల్ ఆధారంగా మేము పత్రాలు తనిఖీ చేసి, పథకాలకు ఉన్న అర్హతను మరియు ఉచిత స్వయంసేవ సహాయాన్ని అందించగలము. మీ సమస్యను నాతో పంచుకోండి.`;
  }
  return `Thank you for your message. As your HaqSetu AI assistant, I can simplify Indian administrative terms. Currently, I see you are evaluating scheme matches. You can register your profile details or upload certificates in the documents dashboard to let our rule-engine check exact fits instantly. We respect your voice, safety, and access. Let me know what specific questions you have!`;
}

function getIntelligentExtractedFields(text: string): any {
  const lowercase = text.toLowerCase();
  const fields: any = {
    name: '',
    age: 30,
    gender: 'female',
    occupation: '',
    location: '',
    state: '',
    householdIncome: 0,
    category: 'General'
  };

  // 1. Try to extract Name
  const nameMatch = text.match(/(?:i am|my name is|मैं|నా పేరు|నేను|naam)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i) || text.match(/(?:i am|my name is|मैं|నా పేరు|నేను|naam)\s+(\S+)/i);
  if (nameMatch) {
    fields.name = nameMatch[1].trim();
  } else {
    const words = text.match(/[A-Z][a-z]+/g);
    if (words && words.length > 0 && !['I', 'My', 'Hyderabad', 'Telangana', 'Andhra', 'Pradesh', 'India'].includes(words[0])) {
      fields.name = words[0];
    }
  }

  // 2. Try to extract Age
  const ageMatch = text.match(/\b([1-9][0-9])\b/);
  if (ageMatch) {
    fields.age = parseInt(ageMatch[1]);
  }

  // 3. Try to extract Gender
  if (lowercase.includes('female') || lowercase.includes('woman') || lowercase.includes('महिला') || lowercase.includes('స్త్రీ') || lowercase.includes('devi')) {
    fields.gender = 'female';
  } else if (lowercase.includes('male') || lowercase.includes('man') || lowercase.includes('पुरुष') || lowercase.includes('పురుషుడు')) {
    fields.gender = 'male';
  }

  // 4. Try to extract Income
  const incomeMatch = text.match(/\b([1-9][0-9]{3,6})\b/);
  if (incomeMatch) {
    fields.householdIncome = parseInt(incomeMatch[1]);
  } else {
    const lakhMatch = text.match(/\b([1-9](?:\.[0-9]+)?)\s*(?:lakh|लाख|లక్ష)/i);
    if (lakhMatch) {
      fields.householdIncome = parseFloat(lakhMatch[1]) * 100000;
    }
  }

  // 5. Try to extract Occupation
  if (lowercase.includes('worker') || lowercase.includes('कामगार') || lowercase.includes('పనిమనిషి')) {
    fields.occupation = 'Domestic worker';
  } else if (lowercase.includes('vendor') || lowercase.includes('दुकानदार') || lowercase.includes('వ్యాపారి') || lowercase.includes('seller')) {
    fields.occupation = 'Street vendor';
  } else if (lowercase.includes('student') || lowercase.includes('छात्र') || lowercase.includes('విద్యార్థి')) {
    fields.occupation = 'Student';
  } else if (lowercase.includes('farmer') || lowercase.includes('किसान') || lowercase.includes('రైతు')) {
    fields.occupation = 'Farmer';
  } else if (lowercase.includes('weaver') || lowercase.includes('artisan') || lowercase.includes('कारीगर') || lowercase.includes('నేత కార్మికుడు')) {
    fields.occupation = 'Artisan';
  }

  // 6. Try to extract Location & State
  if (lowercase.includes('hyderabad') || lowercase.includes('హైదరాబాద్')) {
    fields.location = 'Hyderabad';
    fields.state = 'Telangana';
  } else if (lowercase.includes('vijayawada') || lowercase.includes('విజయవాడ')) {
    fields.location = 'Vijayawada';
    fields.state = 'Andhra Pradesh';
  } else if (lowercase.includes('moinabad') || lowercase.includes('మొయినాబాద్')) {
    fields.location = 'Moinabad';
    fields.state = 'Telangana';
  } else if (lowercase.includes('mumbai') || lowercase.includes('पुणे') || lowercase.includes('pune')) {
    fields.location = lowercase.includes('mumbai') ? 'Mumbai' : 'Pune';
    fields.state = 'Maharashtra';
  } else {
    const states = ['Telangana', 'Andhra Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Bihar', 'Uttar Pradesh', 'Rajasthan', 'Gujarat'];
    for (const s of states) {
      if (lowercase.includes(s.toLowerCase())) {
        fields.state = s;
        break;
      }
    }
  }

  // 7. Try to extract Caste/Category
  if (lowercase.includes('obc') || lowercase.includes('ओबीसी')) {
    fields.category = 'OBC';
  } else if (lowercase.includes('sc') || lowercase.includes('अनुसूचित जाति')) {
    fields.category = 'SC';
  } else if (lowercase.includes('st') || lowercase.includes('अनुसूचित जनजाति')) {
    fields.category = 'ST';
  } else if (lowercase.includes('general') || lowercase.includes('सामान्य')) {
    fields.category = 'General';
  }

  return fields;
}

function getIntelligentSchemeExplanation(scheme: any, language: string): string {
  return `This is ${scheme.name}. Highly targeted towards public welfare, managed directly by the central/state department. Required certificates: ${scheme.requiredDocuments.join(', ').toUpperCase()}. Fill your profile to check matches.`;
}

function getIntelligentNextSteps(scheme: any, profile: any, language: string): string[] {
  return [
    `Confirm Aadhaar number link to ${profile.phone || 'mobile'}.`,
    `File application directly on official ${scheme.name} website.`,
    `Track submission using physical receipt code on the HaqSetu Tracker.`
  ];
}

function getIntelligentGrievanceDraft(type: string, description: string, location: string, targetAuthority: string, language: string): string {
  return `To, The ${targetAuthority || 'Panchayat Officer'}\n\nGrievance regarding: ${description}\nLocation: ${location}\n\nRespected Sir/Madam,\n\nWe request your immediate intervention.\n\nThank you.\nHS-Citizen`;
}

function getIntelligentOcrResult(documentName: string, citizenName?: string): any {
  const normalized = documentName.toLowerCase();
  const finalName = citizenName || 'Citizen Verified';
  if (normalized.includes('aadhaar')) {
    return {
      documentType: 'Aadhaar Card',
      extractedName: finalName,
      extractedId: 'XXXX XXXX 8943',
      extractedDetails: {
        'Date of Birth': '12/04/1994',
        'Gender': 'Female',
        'Address': 'H No. 4-12, Gachibowli, Hyderabad, Telangana'
      },
      confidence: 96
    };
  }
  return {
    documentType: 'ID Document',
    extractedName: finalName,
    extractedId: 'ID-' + Math.floor(10000 + Math.random() * 90000),
    extractedDetails: {
      'Scan Date': new Date().toLocaleDateString()
    },
    confidence: 90
  };
}

// ==========================================
// VITE OR STATIC FILE MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
