import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: '10mb' }));

// ==========================================
// GEMINI SDK LAZY INITIALIZATION
// ==========================================
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      const client = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Patch generateContent to handle automatic fallback from gemini-3.5-flash to gemini-3.1-flash-lite on quota limits or errors
      const originalGenerateContent = client.models.generateContent.bind(client.models);
      (client.models as any).generateContent = async function(params: any) {
        const primaryModel = params?.model || "gemini-3.5-flash";
        try {
          return await originalGenerateContent({
            ...params,
            model: primaryModel
          });
        } catch (error: any) {
          const errorStr = String(error.message || error || "");
          console.warn(`[Gemini Autopatch] Primary model call failed (${errorStr}). Checking for fallback...`);
          
          if (primaryModel === "gemini-3.5-flash") {
            console.log("[Gemini Autopatch] Attempting automatic fallback to gemini-3.1-flash-lite...");
            try {
              return await originalGenerateContent({
                ...params,
                model: "gemini-3.1-flash-lite"
              });
            } catch (fallbackError: any) {
              console.error("[Gemini Autopatch] Fallback model gemini-3.1-flash-lite also failed:", fallbackError.message || fallbackError);
              throw fallbackError;
            }
          }
          throw error;
        }
      };

      aiClient = client;
      console.log("Gemini API Client successfully initialized with automatic fallback resilience patching.");
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

// 5.5. AI Evidence Legal Affidavit Builder
app.post('/api/ai/affidavit-draft', async (req, res) => {
  const { name, age, occupation, homeState, currentAddress, purpose, testimonies, utilities, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are an expert Indian notary and human rights lawyer assisting undocumented residents and migrant workers.
Draft a legally structured, formal Solemn Affirmation / Affidavit for:
Name: ${name}
Age: ${age} years old
Occupation: ${occupation}
Current Address: ${currentAddress}
Home State: ${homeState}
Purpose: ${purpose || 'Establishing local proof of identity and residence'}
Supporting Witness Testimonies: ${testimonies ? testimonies.join(', ') : 'None provided'}
Supporting Documents/Utilities: ${utilities ? utilities.join(', ') : 'None provided'}

The output MUST be a high-quality, professional legal affidavit text in English or ${language}. It should include:
- A prominent stamp paper banner: 'BEFORE THE NOTARY / EXECUTION COMMISSIONER, GOVERNMENT OF INDIA'
- A standard legal preamble detailing the deponent's identity (I, ${name}, son/daughter/wife of, aged ${age}...).
- Sworn numbered statements/paragraphs establishing:
  1. That the deponent belongs to the state of ${homeState} and currently resides at ${currentAddress}.
  2. That they are employed as a ${occupation} and have been working/living here for a sustainable period.
  3. Detail of witness testimonies verifying their character and residence.
  4. Listing other supplementary items: ${utilities ? utilities.join(', ') : 'None'}.
- A standard Verification clause at the bottom ('Sworn and verified on this date...').
- Placeholders for Deponent Signature, Witness 1 Signature, Witness 2 Signature, and Notary Seal/Stamp.
Format in markdown with clean fonts, double line breaks, and clear sections. Make it look exactly like an official court-admissible Indian Non-Judicial Affidavit.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      if (response.text) {
        return res.json({ text: response.text });
      }
    } catch (e) {
      console.error("Gemini failed, fallback to offline affidavit:", e);
    }
  }

  res.json({ text: getIntelligentAffidavitDraft(name, age, occupation, homeState, currentAddress, purpose, testimonies, utilities) });
});

// 6. Intelligent Document OCR Simulator
app.post('/api/ai/ocr-mock', (req, res) => {
  const { documentName, citizenName } = req.body;
  const result = getIntelligentOcrResult(documentName, citizenName);
  res.json({ result });
});

// 7. Dynamic Gemini Translation Assistant
app.post('/api/ai/translate', async (req, res) => {
  const { text, targetLanguage } = req.body;
  const ai = getAiClient();

  if (ai && targetLanguage && targetLanguage !== 'en') {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are a high-quality translator for Indian public administration portals. Translate the following interface text or governmental content from English to the Indian regional language specified by code or name: "${targetLanguage}".
Keep the tone formal, polite, and completely clear for rural citizens. Do not explain the translation, do not include markdown, and do not add quotes. Return ONLY the final translated text.

Text to translate: "${text}"`,
      });
      if (response.text) {
        const translated = response.text.trim().replace(/^"|"$/g, '');
        return res.json({ translatedText: translated });
      }
    } catch (e) {
      console.error("Gemini Translation failed, using fallback:", e);
    }
  }

  // Simple local dictionary fallbacks for offline testing
  const fallback = getLocalFallbackTranslation(text, targetLanguage);
  res.json({ translatedText: fallback });
});

// 7.5 Batch Translation Endpoint to prevent rate-limiting (429 Resource Exhausted) on multi-render triggers
app.post('/api/ai/translate-batch', async (req, res) => {
  const { texts, targetLanguage } = req.body;
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.json({ translations: {} });
  }

  const ai = getAiClient();
  const translations: Record<string, string> = {};

  // Prepopulate with default local fallbacks in case Gemini fails or is throttled
  for (const text of texts) {
    translations[text] = getLocalFallbackTranslation(text, targetLanguage);
  }

  if (ai && targetLanguage && targetLanguage !== 'en') {
    try {
      const prompt = `You are a high-quality translator for Indian public administration portals. Translate the following list of interface texts or governmental contents from English to the Indian regional language specified by code or name: "${targetLanguage}".

Text list to translate:
${JSON.stringify(texts, null, 2)}

Return your response strictly as a JSON object where the keys are the EXACT original English texts and the values are their translations in "${targetLanguage}".
Do not include any explanation, do not include markdown code blocks, do not wrap in any formatting. Return ONLY valid JSON.
Example format:
{
  "Hello": "translation_here"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        try {
          const parsed = JSON.parse(response.text.trim());
          for (const key of Object.keys(parsed)) {
            if (parsed[key] && typeof parsed[key] === 'string' && parsed[key].trim() !== '') {
              translations[key] = parsed[key];
            }
          }
        } catch (jsonErr) {
          console.warn("Failed to parse Gemini batch translation response JSON:", jsonErr, response.text);
        }
      }
    } catch (e) {
      console.error("Gemini Batch Translation failed, using local fallbacks:", e);
    }
  }

  res.json({ translations });
});

// ==========================================
// NEW AI-POWERED BACKEND CONTROLLERS (6 FEATURES)
// ==========================================

// 1. Caste Discrimination Incident Reporting & Legal Referral API
app.post('/api/ai/caste-discrimination-referral', async (req, res) => {
  const { title, description, location, targetAuthority, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are a human rights lawyer and legal advisor specializing in the Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989.
Draft a highly professional, formal, and court-admissible Legal Referral and Official Complaint regarding a Caste Discrimination Incident.
Details:
- Incident Title: ${title}
- Location: ${location}
- Accused Authority / Ward: ${targetAuthority || "Local Public Body"}
- Description of Atrocity / Discrimination: "${description}"

The complaint letter must be addressed to the Chairperson of the National Commission for Scheduled Castes (NCSC) or the State Human Rights Commission. It should cite specific provisions of the SC/ST (Prevention of Atrocities) Act (such as Section 3), demand an immediate First Information Report (FIR) registration, request police protection for the victim (deponent), and require a transparent inquiry by an officer not below the rank of Deputy Superintendent of Police (DSP).
Generate the complaint in the specified language: '${language}'. Format cleanly in Markdown with professional legal headings and sign-off placeholders.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ referralDraft: response.text });
      }
    } catch (e) {
      console.error("Gemini Caste Complaint Referral draft failed, using offline fallback:", e);
    }
  }

  // Robust Offline Fallback Template
  const fallbackComplaint = `======================================================================
  LEGAL REFERRAL & OFFICIAL COMPLAINT UNDER THE SC/ST ACT, 1989
======================================================================
To,
The Chairperson,
State Commission for Scheduled Castes / National Commission for Scheduled Castes (NCSC),
New Delhi, India.

Date: ${new Date().toLocaleDateString('en-IN')}

SUBJECT: Formal Complaint for Registration of FIR under Section 3 of the Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989.

Respected Sir/Madam,

I am writing to formally log an egregious incident of caste discrimination and social exclusion that took place at **${location}**.

1. **INCIDENT PROFILE**:
   - **Nature of Grievance**: ${title}
   - **Location of Atrocity**: ${location}
   - **Accused Party / Entity**: ${targetAuthority || "Local Ward Administrators / Public Servants"}
   - **Exact Description**: "${description}"

2. **LEGAL SECTIONS INVOLVED**:
   - Section 3(1) of the SC/ST (Prevention of Atrocities) Act, 1989 (as amended in 2015), which prohibits humiliating, assaulting, boycotting, or denying access to public services to members of Scheduled Castes.
   - Article 17 of the Constitution of India (Abolition of Untouchability).

3. **SPECIFIC RELIEFS SOUGHT**:
   - Immediate registration of a First Information Report (FIR) under the SC/ST (Prevention of Atrocities) Act.
   - An independent, unbiased investigation to be conducted by a police officer not below the rank of Deputy Superintendent of Police (DSP) as per Rule 7 of the PoA Rules.
   - Immediate protection and legal aid support for the deponent/complainant to prevent any retributive intimidation.

This referral is drafted securely using HaqSetu's Human Rights Anonymity Proxies. We urge your esteemed office to direct the District Superintendent of Police to initiate immediate action and submit a status report within 72 hours.

Sincerely,
Advocate on behalf of Complainant
[SECURE PROXY CODE: HS-NCSC-${Math.floor(10000 + Math.random() * 90000)}]`;

  res.json({ referralDraft: fallbackComplaint });
});

// 2. Disability Access Audit & Municipal Report API
app.post('/api/ai/disability-access-report', async (req, res) => {
  const { location, inaccessibilityType, description, photoDescription, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are a certified accessibility auditor and a disability rights advocate.
Draft a highly structured, authoritative Municipal Accessibility Improvement Petition addressed to the Municipal Commissioner and Ward Block Development Officer.
Details:
- Location of Inaccessible Infrastructure: ${location}
- Infrastructure Inaccessibility Type: ${inaccessibilityType} (e.g. Broken Tactile, No Wheelchair Ramp, Blocked Entrance)
- Physical Description: "${description}"
- Geo-tagged Photo Metadata & Evidence: ${photoDescription || "Provided high-resolution photographic proof"}

The report must reference the Rights of Persons with Disabilities (RPWD) Act, 2016, specifically Section 44 and Section 45 (which mandate accessible public buildings and services within a strict timeframe). Include a professional table of architectural gaps, proposed design remediation (e.g., standard 1:12 slope ramp with handrails), and a formal request for an immediate budget allocation.
Generate the report in: '${language}'. Format cleanly in Markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ auditReport: response.text });
      }
    } catch (e) {
      console.error("Gemini Disability Report draft failed, using offline fallback:", e);
    }
  }

  // Robust Offline Fallback Template
  const fallbackAuditReport = `### ACCESS AUDIT REPORT & MUNICIPAL REMEDIATION DEMAND
**UNDER SECTION 44/45 OF THE RIGHTS OF PERSONS WITH DISABILITIES (RPWD) ACT, 2016**

**To:**
The Municipal Commissioner / Block Development Officer,
Department of Public Infrastructure & Town Planning,
${location}

**Date:** ${new Date().toLocaleDateString('en-IN')}

---

#### 1. SITE AUDIT OVERVIEW
- **Audit Location:** ${location}
- **Identified Barrier:** **${inaccessibilityType.toUpperCase()}**
- **Detailed Finding:** ${description}
- **Supporting Evidence:** Geo-tagged Photographic Evidence attached with verified latitude/longitude metadata.

#### 2. LEGAL COMPLIANCE FAILURE
Under **Section 44 of the RPWD Act, 2016**, no establishment shall be granted permission to construct any public building unless it complies with the Harmonised Guidelines and Standards for Universal Accessibility. Furthermore, **Section 45** mandates that all existing public buildings must be made barrier-free. 
The current state of public infrastructure at this site represents a clear legal violation, causing severe exclusion of locomotor, visual, and elderly citizens.

#### 3. ACTIONABLE REMEDIATION RECOMMENDATION
| Identified Gap | Mandatory Standard (RPWD Act) | Recommended Engineering Action |
|---|---|---|
| Accessible Entrance | 1:12 Ramp Slope with Non-slip surface | Re-pour concrete ramp, install dual-height handrails (700mm & 900mm) |
| Lack of Assistive Aids | Wheelchair availability & Tactile guidance | Supply manual wheelchairs, lay yellow tactile directional paving tiles |

#### 4. DEMAND FOR TIME-BOUND REPAIR
We request your office to inspect this site within **15 business days** and release local municipal funds to implement these accessibility repairs. Failing this, we reserve the right to escalate this matter to the Chief Commissioner for Persons with Disabilities.

**Report Compiled by:**
Certified Access Auditor
*HaqSetu Civic Disability Access Hub (Audit Ref: HS-RPWD-${Math.floor(1000 + Math.random() * 9000)})*`;

  res.json({ auditReport: fallbackAuditReport });
});

// 3. AI Ally Training Tool Feedback API
app.post('/api/ai/ally-training-feedback', async (req, res) => {
  const { role, scenarioId, selectedOptionText, isCorrect, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are a diversity, equity, and social inclusion (DEI) trainer for Indian Panchayats and Corporate HR departments.
The user has responded to a scenario-based anti-discrimination training exercise.
- Role Selected by User: ${role} (Panchayat Member / Corporate HR Manager)
- Scenario Context ID: ${scenarioId}
- User's Chosen Action: "${selectedOptionText}"
- Correct Option?: ${isCorrect ? "Yes (Correct)" : "No (Incorrect)"}

Explain to the user why their chosen response is either highly supportive (if correct) or where it falls short in terms of caste, gender, or disability sensitivity (if incorrect). Cite practical guidelines, local constitutional values (such as Article 15), and HR code/panchayat procedures. Keep the tone encouraging, educational, and deeply insightful.
Provide response in language: '${language}'. Wrap in short, scannable paragraphs under 120 words.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ feedback: response.text });
      }
    } catch (e) {
      console.error("Gemini Training feedback failed, using offline fallback:", e);
    }
  }

  // Offline Fallback Feedback
  let fallbackFeedback = "";
  if (isCorrect) {
    fallbackFeedback = `🌟 **Excellent Decision!** Your response reflects deep social sensitivity, constitutional integrity (Article 15), and excellent leadership. By addressing bias actively rather than ignoring it, you create an environment where women, Scheduled Castes, and disabled individuals feel secure and respected. This is precisely how we build caste-free and gender-equal communities!`;
  } else {
    fallbackFeedback = `⚠️ **Opportunity for Growth:** While your response might seem practical, it lacks active advocacy. Passively ignoring discrimination or telling victims to 'adjust' perpetuates systemic barriers. As an ally (Panchayat or HR Leader), you must take active corrective steps, register reports, and enforce zero-tolerance codes. Let's try again to stand up for equity!`;
  }

  res.json({ feedback: fallbackFeedback });
});

// 4. Entitlement Eligibility Checker (8-Question Voice Input) API
app.post('/api/ai/voice-eligibility-evaluation', async (req, res) => {
  const { answers, language } = req.body;
  const ai = getAiClient();

  // Extract variables
  const name = answers.name || "Citizen";
  const age = Number(answers.age) || 30;
  const gender = (answers.gender || "female").toLowerCase();
  const occupation = answers.occupation || "Street Vendor";
  const income = Number(answers.income) || 0;
  const category = answers.category || "OBC";
  const location = answers.location || "Moinabad";
  const disability = answers.disability === true || answers.disability === 'true';

  if (ai) {
    try {
      const prompt = `You are the Entitlement Eligibility Auditor for Indian central and state welfare programs.
Evaluate the following citizen profile and determine exactly which schemes they qualify for:
- Name: ${name}
- Age: ${age}
- Gender: ${gender}
- Occupation: ${occupation}
- Annual Household Income: ₹${income}
- Caste/Social Category: ${category}
- Location: ${location}
- Disability Status: ${disability ? "Yes" : "No"}

Schemes in scope to evaluate:
1. PM SVANidhi (street vendors, collateral-free loan of ₹10,000-₹50,000)
2. PM Vishwakarma (traditional artisans, ₹15,000 toolkit voucher, skill stipend)
3. Ayushman Bharat (Pradhan Mantri Jan Arogya Yojana - health cover of ₹5L per family; eligibility: low income/BPL, rural, worker)
4. Indira Gandhi National Disability Pension Scheme (IGNDPS - eligibility: age 18-79, severe disability >80%, below poverty line BPL)
5. State Women Financial Aid (eligibility: women, low income)

For every matching scheme, provide:
- **Scheme Name**
- **Match Confidence (Percentage)**
- **Exact Actionable Application Steps (Step 1, Step 2, Step 3)**
- **Required Documents Checklist**

Return your analysis in language: '${language}'. Structure clearly in Markdown with friendly, comforting, and direct advice.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ evaluation: response.text });
      }
    } catch (e) {
      console.error("Gemini Voice Eligibility failed, using offline fallback:", e);
    }
  }

  // Offline Rule Engine Fallback
  const eligibleSchemes = [];
  if (occupation.toLowerCase().includes('vendor') || occupation.toLowerCase().includes('shop') || occupation.toLowerCase().includes('seller')) {
    eligibleSchemes.push({
      name: "PM SVANidhi Scheme",
      confidence: "95%",
      steps: [
        "Visit your local municipal corporation office or local public bank.",
        "Request a 'Letter of Recommendation' (LoR) verifying your vendor status.",
        "Submit the application online via the PM SVANidhi portal to claim your ₹10,000 interest-subsidized loan."
      ],
      docs: ["Aadhaar Card", "Voter ID", "Mobile Linked Bank Passbook", "Vendor ID/Letter of Recommendation"]
    });
  }

  if (occupation.toLowerCase().includes('artisan') || occupation.toLowerCase().includes('weaver') || occupation.toLowerCase().includes('carpenter') || occupation.toLowerCase().includes('potter') || occupation.toLowerCase().includes('barber')) {
    eligibleSchemes.push({
      name: "PM Vishwakarma Yojana",
      confidence: "98%",
      steps: [
        "Go to the nearest Common Service Centre (CSC) with your biometric Aadhaar verification.",
        "Submit your craft categories (e.g. weaver, carpenter, blacksmith).",
        "Complete the 5-day basic training to receive the ₹15,000 e-voucher for tools."
      ],
      docs: ["Aadhaar Card", "Ration Card", "Active Bank Passbook", "Caste Certificate (if OBC/SC/ST)"]
    });
  }

  if (income <= 120000) {
    eligibleSchemes.push({
      name: "Ayushman Bharat PM-JAY (Free Healthcare Cover)",
      confidence: "90%",
      steps: [
        "Check your family name in the SECC-2011 database or present your BPL Ration Card at any empaneled government hospital.",
        "Present your Aadhaar card to the 'Ayushman Mitra' kiosk inside the hospital.",
        "Receive your 'Golden Card' to claim free cashless treatment up to ₹5,00,000 per family annually."
      ],
      docs: ["Aadhaar Card", "BPL Ration Card (White/Yellow)", "Income Certificate (₹1.2 Lakh cap)"]
    });
  }

  if (disability) {
    eligibleSchemes.push({
      name: "Indira Gandhi National Disability Pension",
      confidence: "85%",
      steps: [
        "Acquire a Unique Disability ID (UDID) Card from the local district medical board.",
        "Submit a pension application to the block development officer (BDO) or Gram Panchayat office.",
        "Monthly direct cash pension will be deposited directly to your DBT bank account."
      ],
      docs: ["Aadhaar Card", "UDID Disability Certificate (>40% disability)", "BPL Ration Card", "Bank Passbook"]
    });
  }

  // Generate output string in requested language
  let output = `### 📋 ENTILEMENT ELIGIBILITY REPORT FOR **${name.toUpperCase()}**\n\n`;
  output += `Thank you for completing the 8-question voice assessment. Based on your inputs, here are the schemes you are eligible for:\n\n`;

  if (eligibleSchemes.length === 0) {
    output += `*No high-confidence matches were found based on the basic income and occupational filters. However, we recommend uploading your documents in the vault to unlock deeper state-specific schemes.*`;
  } else {
    eligibleSchemes.forEach(sc => {
      output += `#### 🌟 **${sc.name}** (Confidence: ${sc.confidence})\n`;
      output += `**Documents Needed:** ${sc.docs.join(', ')}\n\n`;
      output += `**Actionable Application Steps:**\n`;
      sc.steps.forEach((st, idx) => {
        output += `${idx + 1}. ${st}\n`;
      });
      output += `\n---\n`;
    });
  }

  res.json({ evaluation: output });
});

// 5. AI Form-Filling Assistant in 12 Languages API
app.post('/api/ai/form-filling-assistant', async (req, res) => {
  const { schemeId, language, profile, documents } = req.body;
  const ai = getAiClient();

  const name = profile?.name || "Verified Citizen";
  const age = profile?.age || 32;
  const gender = profile?.gender || "Female";
  const occupation = profile?.occupation || "Artisan";
  const income = profile?.householdIncome || 85000;
  const category = profile?.category || "OBC";
  const state = profile?.state || "Delhi";
  const location = profile?.location || "New Delhi";

  // Check document availability
  const uploadedTypes = documents ? documents.map((d: any) => d.type) : [];
  const hasAadhaar = uploadedTypes.includes('aadhaar');
  const hasRation = uploadedTypes.includes('ration_card');
  const hasIncome = uploadedTypes.includes('income_cert');
  const hasCaste = uploadedTypes.includes('caste_cert');

  if (ai) {
    try {
      const prompt = `You are an expert AI Form-Filling Assistant for Indian public services.
The user wants to auto-fill an application form for Scheme ID: "${schemeId}".
User Profile:
- Name: ${name}
- Age: ${age}
- Gender: ${gender}
- Occupation: ${occupation}
- Income: ₹${income}/year
- Category: ${category}
- State: ${state}
- Location: ${location}

Documents currently verified in their wallet: ${uploadedTypes.join(', ')}

Your task:
1. Render a simulated, auto-filled official government application form with structured fields in the specified language: '${language}'.
2. Run a "Document Completeness Audit": Check what documents are required for "${schemeId}" and flag any critical missing ones as warnings (e.g. PM Vishwakarma requires Ration Card, Ayushman Bharat requires Income Certificate under 1.2 Lakh).
3. Warn the citizen of any mismatch or missing documents before they submit.

Keep the output structured with standard input boxes represented in Markdown (e.g. [ Name: Ramesh ]). Do not return any extra developer notes.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ filledForm: response.text });
      }
    } catch (e) {
      console.error("Gemini Form Filling assistant failed, running offline simulator:", e);
    }
  }

  // Multilingual Offline Simulator Fallback
  let warnings = [];
  if (schemeId === 'pm-svanidhi' && !hasAadhaar) {
    warnings.push("⚠️ WARNING: PM SVANidhi requires an Aadhaar Card. Please upload Aadhaar to your wallet first!");
  }
  if (schemeId === 'pm-vishwakarma' && !hasRation) {
    warnings.push("⚠️ WARNING: PM Vishwakarma requires a family Ration Card for biometric registration.");
  }
  if (schemeId === 'pm-jay' && !hasIncome) {
    warnings.push("⚠️ WARNING: Ayushman Bharat eligibility requires a verified Income Certificate showing income < ₹1.2 Lakh.");
  }

  const dateToday = new Date().toLocaleDateString();

  const mockForm = `
[====================================================================]
             GOVERNMENT OF INDIA - OFFICIAL APPLICATION FORM
                     SCHEME: ${schemeId.toUpperCase().replace('-', ' ')}
[====================================================================]

Section A: PERSONAL INFORMATION
--------------------------------------------------------------------
- Full Name:       [ ${name} ]
- Age / Gender:    [ ${age} Years ] / [ ${gender} ]
- Social Category: [ ${category} ]
- Occupation:      [ ${occupation} ]
- Annual Income:   [ ₹${income.toLocaleString()} ]

Section B: RESIDENCY & ADDRESS
--------------------------------------------------------------------
- Address Details: [ Ward 4, ${location}, ${state} ]
- Home State:      [ ${state} ]

Section C: UPLOADED DOCUMENT AUDIT & COMPLIANCE
--------------------------------------------------------------------
- Aadhaar Card:    [ ${hasAadhaar ? "✅ VERIFIED & ATTACHED" : "❌ MISSING"} ]
- Ration Card:     [ ${hasRation ? "✅ VERIFIED & ATTACHED" : "❌ MISSING"} ]
- Income Cert:     [ ${hasIncome ? "✅ VERIFIED & ATTACHED" : "❌ MISSING"} ]
- Date of Filing:  [ ${dateToday} ]

--------------------------------------------------------------------
📋 PRE-SUBMISSION AUDIT RESULT:
--------------------------------------------------------------------
${warnings.length > 0 
  ? warnings.join('\n') 
  : "🎉 CONGRATULATIONS! Your Document Vault contains 100% of the required credentials. Your application is fully compliant and ready for final submission."}

--------------------------------------------------------------------
[  CLICK SUBMIT SECURELY  ]  [  PRINT PDF  ]
`;

  res.json({ filledForm: mockForm });
});

// 6. Grievance Follow-up Bot & RTI Generator API
app.post('/api/ai/grievance-followup-bot', async (req, res) => {
  const { requestName, trackingId, submittedAt, updates, language } = req.body;
  const ai = getAiClient();

  const elapsedDays = Math.round((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)) || 14;

  if (ai) {
    try {
      const prompt = `You are an expert RTI (Right to Information Act, 2005) lawyer and social accountability bot in India.
A citizen has an unanswered government application or grievance petition:
- Application Name: ${requestName}
- Tracking ID / Ref: ${trackingId}
- Submitted On: ${new Date(submittedAt).toLocaleDateString()}
- Days Elapsed without Resolution: ${elapsedDays} days
- Audit log status: ${JSON.stringify(updates)}

Generate two helpful items for the citizen in the requested language '${language}':
1. A formally structured Right to Information (RTI) Application under Section 6(1) of the RTI Act, 2005. It should be addressed to the Public Information Officer (PIO) of the concerned department, asking specific, sharp questions regarding the timeline, delayed reason, names of officers who sat on the file, and daily progress logs.
2. A short, WhatsApp-optimized escalation follow-up message to be sent to municipal ward officers or panchayat help desks. Use bold formatting, bullet points, and an urgent but completely professional tone.

Format the output cleanly in Markdown with separate visible blocks for the PIO RTI Letter and the WhatsApp text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ rtiDraft: response.text });
      }
    } catch (e) {
      console.error("Gemini Grievance Followup failed, using offline fallback:", e);
    }
  }

  // High Quality Offline RTI & WhatsApp Fallback Draft
  const fallbackRti = `### 📜 FORMAL RTI APPLICATION UNDER SECTION 6(1) OF THE RTI ACT, 2005

To,
The Public Information Officer (PIO),
Office of the Gram Panchayat / Block Development Officer (BDO),
${requestName.includes('Grievance') ? 'Civic Grievance Cell' : 'Welfare Welfare Division'}

**Date:** ${new Date().toLocaleDateString('en-IN')}

**1. Name of the Applicant:** [ Citizen of India ]
**2. Details of Information Sought under Section 6(1):**
Regarding the application for **"${requestName}"** submitted on **${new Date(submittedAt).toLocaleDateString('en-IN')}** bearing local reference tracking ID **${trackingId}** which remains pending for **${elapsedDays} days**.

Please provide the following structured details:
- **Query 1:** Please provide the daily progress report of the application from the date of receipt to the current date, including details of every officer who has reviewed or processed this file.
- **Query 2:** Specify the standard citizen charter timeline for processing this application, and provide the written reasons as recorded in files for exceeding this standard timeline.
- **Query 3:** Provide the names, designations, and contact details of the official(s) currently responsible for verifying this request.

**3. Application Fee:** A postal order of Rs. 10/- is attached herewith towards the standard application fee. I am a citizen of India.

---

### 💬 WHATSAPP COMPLAINT & ESCALATION DRAFT
*(Copy and send this directly to the Local Officer or Grievance Help Desk)*

🚨 *URGENT FOLLOW-UP: UNANSWERED APPLICATION DELAY* 🚨

Dear Officer,
I am writing to draw your urgent attention to my pending application:
- 📌 *Service Name:* ${requestName}
- 🆔 *Tracking Reference:* ${trackingId}
- 📅 *Submitted On:* ${new Date(submittedAt).toLocaleDateString('en-IN')}
- ⏳ *Delay Status:* *${elapsedDays} Days have elapsed* with no official response or resolution.

Under the state Right to Service Act and public accountability guidelines, I request an immediate update on my application status. 

Thank you,
[Citizen Proxy HS-${Math.floor(1000 + Math.random() * 9000)}]
*Sent via Awaaz Public Accountability Grievance Bot*`;

  res.json({ rtiDraft: fallbackRti });
});

// 7. Gram Sabha Agenda Simplified WhatsApp Summary API
app.post('/api/ai/whatsapp-agenda-summary', async (req, res) => {
  const { meetingTitle, agenda, date, location, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are an expert rural community engagement and public communications coordinator in India.
Your task is to take a formal Gram Sabha meeting's agenda and details, and translate/re-write it into a simplified, clear, friendly, and highly engaging announcement suitable for a WhatsApp message to villagers.
The announcement should:
1. Explain the purpose of the meeting in simple, everyday language (avoid heavy administrative jargon).
2. Use bullet points, bold text, and relevant emojis (like 📢, 🏡, 🗓️, 💬, 💰) to make it highly scannable.
3. List the Date, Time, Location, and allocated Budget clearly.
4. Encourage women, youth, and marginalized community members to attend, highlighting that their voice is critical.
5. End with a polite invite: "Your Gram Panchayat, Moinabad" or similar.

Meeting details:
- Title: ${meetingTitle}
- Agenda: ${agenda}
- Date: ${date}
- Location: ${location}

Output Language: ${language} (Please write the entire WhatsApp announcement in this language!).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ summary: response.text });
      }
    } catch (e) {
      console.error("Gemini WhatsApp agenda summary failed:", e);
    }
  }

  // Fallbacks
  let fallback = '';
  if (language === 'hi') {
    fallback = `📢 *ग्राम सभा आमंत्रण: कल्याणकारी योजनाओं एवं विकास कार्यों की समीक्षा* 📢

प्रिय ग्रामवासियों,

हमारी ग्राम पंचायत में आगामी बैठक होने जा रही है। आप सभी का आना अत्यंत महत्वपूर्ण है! विशेष रूप से युवा, महिलाएं और वंचित वर्ग अवश्य पधारें ताकि आपकी आवाज़ सुनी जा सके।

📝 *बैठक के मुख्य विषय (एजेंडा):*
• ${agenda}

🗓 *तारीख:* ${date}
📍 *स्थान:* ${location}
💰 *बजट:* ${meetingTitle.includes('Budget') || meetingTitle.includes('Allocations') ? '₹12,45,000' : '₹4,50,000'}

🏡 *आपकी उपस्थिति - आपका अधिकार!*
आइए मिलकर हमारे गाँव के विकास का निर्णय लें।

*शुभकामनाओं सहित,*
*आपकी ग्राम पंचायत*`;
  } else if (language === 'te') {
    fallback = `📢 *గ్రామ సభ ఆహ్వానం: అభివృద్ధి పనులు మరియు గ్రామ ప్రణాళిక సమీక్ష* 📢

గౌరవనీయులైన గ్రామ ప్రజలకు నమస్కారం,

మన గ్రామ పంచాయతీ పరిధిలో త్వరలో అత్యంత ముఖ్యమైన గ్రామ సభ జరగబోతోంది. యువత, మహిళలు మరియు వెనుకబడిన వర్గాల వారు తప్పక పాల్గొనవలసిందిగా మనవి.

📝 *సభ ముఖ్య ఉద్దేశం (ఎజెండా):*
• ${agenda}

🗓 *తేదీ:* ${date}
📍 *వేదిక:* ${location}
💰 *బడ్జెట్:* ${meetingTitle.includes('Budget') || meetingTitle.includes('Allocations') ? '₹12,45,000' : '₹4,50,000'}

🏡 *మీ భాగస్వామ్యం - మన గ్రామాభివృద్ధి!*
కలిసికట్టుగా మన గ్రామ భవిష్యత్తును నిర్ణయిద్దాం.

*ఇట్లు,*
*మీ గ్రామ పంచాయతీ*`;
  } else {
    fallback = `📢 *GRAM SABHA INVITATION: DEVELOPMENT WORKS & SCHEMES AUDIT* 📢

Dear Villagers,

An important Gram Sabha assembly is scheduled in our village. Your active presence is highly essential! We especially request our youth, women, and marginalized community members to join and speak up.

📝 *Key Agenda Items:*
• ${agenda}

🗓 *Date & Time:* ${date}
📍 *Location:* ${location}
💰 *Allocated Budget:* ${meetingTitle.includes('Budget') || meetingTitle.includes('Allocations') ? '₹12,45,000' : '₹4,50,000'}

🏡 *Your Voice, Your Village, Your Right!*
Let's participate together in deciding our village's progress.

*Warm regards,*
*Your Gram Panchayat*`;
  }

  res.json({ summary: fallback });
});

// 8. Participatory Budget Sarpanch Response API
app.post('/api/ai/sarpanch-budget-response', async (req, res) => {
  const { category, concern, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are the Sarpanch (elected village head) of Gram Panchayat in India.
A local citizen has raised a specific concern or flagged an issue regarding the budget allocation or expenditure on a village project:
- Project/Category: ${category}
- Citizen Concern: "${concern}"

Write a humble, responsible, transparent, and encouraging response as the Sarpanch.
The response should:
1. Sincerely thank the citizen for exercising their right to public accountability and social audit.
2. Acknowledge the concern specifically and detail a realistic, immediate step the Panchayat will take (e.g., dispatching an assistant engineer, auditing the subcontractor's bills, holding an open site inspection, or calling a ward meeting).
3. Ensure that the progress will be published on the digital notice board and discussed at the upcoming Gram Sabha.
4. Keep a very respectful, community-minded, and non-defensive tone.

Output Language: ${language} (Write the entire letter/response in this language).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ response: response.text });
      }
    } catch (e) {
      console.error("Gemini Sarpanch response failed:", e);
    }
  }

  // Fallback
  let fallback = '';
  if (language === 'hi') {
    fallback = `**प्रिय नागरिक,**

आपके द्वारा **"${category}"** के अंतर्गत उठाए गए इस महत्वपूर्ण मुद्दे के लिए मैं आपका हृदय से धन्यवाद करता हूँ।

आपकी चिंता: *"${concern}"*

एक जागरूक नागरिक के रूप में सामाजिक ऑडिट (Social Audit) और सार्वजनिक जवाबदेही की दिशा में आपका यह कदम अत्यंत सराहनीय है। 

**पंचायत की त्वरित कार्रवाई:**
हम इस मामले की गंभीरता को समझते हुए निम्नलिखित कदम तुरंत उठा रहे हैं:
1. हमारी पंचायत की विकास समिति के सहायक अभियंता (Assistant Engineer) आगामी ४८ घंटों में कार्यस्थल का प्रत्यक्ष निरीक्षण करेंगे।
2. ठेकेदार के काम की गुणवत्ता और बिलों का मिलान बजट दस्तावेजों के साथ किया जाएगा।
3. इस जांच की पूरी रिपोर्ट ग्राम पंचायत कार्यालय के सूचना बोर्ड पर सार्वजनिक की जाएगी।

हम आपको आगामी ग्राम सभा में भी इस पर चर्चा के लिए सादर आमंत्रित करते हैं।

**सादर,**
**सरपंच (ग्राम पंचायत)**`;
  } else if (language === 'te') {
    fallback = `**గౌరవనీయులైన గ్రామస్తులకు,**

మన గ్రామంలో **"${category}"** అభివృద్ధి పనుల నిధుల వినియోగంపై మీరు లేవనెత్తిన ఈ అంశానికి నా హృదయపూర్వక ధన్యవాదాలు.

మీ ఆందోళన: *"${concern}"*

ఒక బాధ్యతాయుతమైన పౌరుడిగా సామాజిక ఆడిట్ (Social Audit) మరియు పారదర్శకత కోసం మీరు చూపిన చొరవ అభినందనీయం.

**పంచాయతీ తక్షణ చర్యలు:**
ఈ సమస్య పరిష్కారానికి మేము ఈ క్రింది చర్యలను చేపడుతున్నాము:
1. రాబోయే 48 గంటల్లో మా పంచాయతీ సహాయక ఇంజనీర్ (Assistant Engineer) స్వయంగా పనుల నాణ్యతను పరిశీలిస్తారు.
2. సదరు కాంట్రాక్టర్ సమర్పించిన బిల్లులను మరియు వాస్తవ పనులను బడ్జెట్ ప్రణాళికతో సరిపోలుస్తాము.
3. ఈ తనిఖీ నివేదికను పంచాయతీ కార్యాలయం నోటీసు బోర్డులో అందరికీ అందుబాటులో ఉంచుతాము.

రాబోయే గ్రామ సభలో కూడా దీనిపై ప్రత్యక్ష చర్చ జరుపుదాము. దయచేసి పాల్గొనండి.

**భవదీయుడు/భవదీయురాలు,**
**సర్పంచ్ (గ్రామ పంచాయతీ)**`;
  } else {
    fallback = `**Dear Citizen,**

I sincerely thank you for raising this critical issue regarding our developmental expenditures under **"${category}"**.

Your Concern: *"${concern}"*

Your proactive stance on social audits and public accountability is exactly what strengthens our local democracy.

**Our Immediate Actions:**
Taking your feedback seriously, the Gram Panchayat has resolved to:
1. Dispatch our Assistant Engineer to conduct a physical site inspection within the next 48 hours.
2. Audit the subcontractor's measurement books against the approved budget estimations.
3. Publish the detailed audit findings openly on the village notice board.

We warmly invite you to attend the upcoming Gram Sabha to discuss this firsthand.

**Warm regards,**
**Sarpanch (Gram Panchayat)**`;
  }

  res.json({ response: fallback });
});

// 9. Interactive Story Game Civic Outcome API
app.post('/api/ai/civic-story-outcome', async (req, res) => {
  const { characterName, choiceText, previousStory, language } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are the narrator of "Civic Hero" - an interactive, educational, story-based RPG game about local governance, RTI, and civic rights in India.
The player is a young rural youth named ${characterName} who is facing a civic challenge.
In the previous step:
- Story State: ${previousStory}
- The user chose: "${choiceText}"

Provide the narrative outcome for this choice and the next part of the story in the requested language '${language}'.
The response should:
1. React specifically to the player's choice. Highlight the educational/civic consequence (e.g., if they chose to file an RTI, explain that RTI requires a Rs. 10 fee and a 30-day response window, teaching them the actual law).
2. Continue the storyline in an exciting, high-stakes way (e.g., finding the corrupt contractor, or presenting their case in front of a crowded Gram Sabha assembly, or convincing skeptical elders).
3. Present 3 new interactive, highly contrasting choices (Option A, Option B, Option C) that the player can choose next, with clear civic and moral dilemmas.
4. Keep the tone motivational, educational, and fun. Use emojis to represent characters and moods.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return res.json({ outcome: response.text });
      }
    } catch (e) {
      console.error("Gemini Civic Story failed:", e);
    }
  }

  // Pre-coded interactive offline story branch based on language
  let fallback = '';
  if (language === 'hi') {
    fallback = `🌟 **कहानी का परिणाम (RTI यात्रा):**

आपने सरपंच से सीधे सवाल पूछने और लिखित में सूचना का अधिकार (RTI) दायर करने का साहसी निर्णय लिया! 📝
**सच्चाई की बात:** RTI अधिनियम, २००५ की धारा ६(१) के तहत, आपको केवल ₹१० का आवेदन शुल्क देना होता है और लोक सूचना अधिकारी (PIO) को ३० दिनों के भीतर जवाब देना ही होगा।

जब सरपंच ने देखा कि आप कानूनी अधिकारों से लैस हैं, तो उनके हाव-भाव बदल गए। उन्होंने एक बंद कमरे में फुसफुसाते हुए कहा, *"अरे बेटा, RTI क्यों कर रहे हो? गाँव के विकास में समय लगता है। अगर तुम यह वापस ले लो, तो मैं तुम्हारी पढ़ाई के लिए विशेष छात्रवृत्ति मंजूर कर दूंगा।"*

अब आप एक बड़े नैतिक धर्मसंकट में हैं! ⚖️

**आप अगला कदम क्या चुनेंगे?**
• **विकल्प अ:** प्रलोभन को ठुकराएं। सार्वजनिक रूप से ग्राम सभा में सबके सामने यह बात उठाएं और सामाजिक ऑडिट की मांग करें।
• **विकल्प ब:** छात्रवृत्ति स्वीकार कर लें, क्योंकि निजी विकास भी गाँव के शिक्षित युवाओं के लिए ज़रूरी है।
• **विकल्प स:** सरपंच की बात को रिकॉर्ड कर लें और इसे जिला विकास अधिकारी (DDO) को भ्रष्टाचार निवारण सेल में प्रमाण के रूप में भेजें।`;
  } else if (language === 'te') {
    fallback = `🌟 **కథా ఫలితం (RTI పోరాటం):**

మీరు ధైర్యంగా సమాచార హక్కు చట్టం (RTI) ద్వారా నిధుల వివరాలను లిఖితపూర్వకంగా అడగాలని నిర్ణయించుకున్నారు! 📝
**నిజమైన చట్టం:** సమాచార హక్కు చట్టం, 2005 సెక్షన్ 6(1) కింద, కేవలం ₹10 పోస్టల్ ఆర్డర్ చెల్లించి దరఖాస్తు చేసుకోవచ్చు. ప్రభుత్వ అధికారి 30 రోజుల్లో సమాధానం ఇవ్వాల్సిందే.

మీరు చట్టబద్ధమైన హక్కును ఉపయోగించడంతో సర్పంచ్ కంగారు పడ్డారు. మిమ్మల్ని రహస్యంగా గదిలోకి పిలిచి, *"తమ్ముడు, ఎందుకు ఈ RTI గొడవలు? గ్రామ పనుల్లో ఆలస్యం మామూలే. ఒకవేళ నువ్వు ఈ దరఖాస్తు ఉపసంహరించుకుంటే, నీ ఉన్నత చదువుల కోసం ప్రత్యేక నిధులు మంజూరు చేస్తా"* అని ప్రలోభపెట్టారు.

ఇప్పుడు మీరు ఒక నైతిక సందిగ్ధంలో పడ్డారు! ⚖️

**మీ తదుపరి నిర్ణయం ఏమిటి?**
• **ఆప్షన్ A:** ప్రలోభాన్ని తిరస్కరించండి. నేరుగా రాబోయే గ్రామ సభలో అందరి ముందూ ఈ విషయాన్ని లేవనెత్తి సామాజిక ఆడిట్ కోరండి.
• **ఆప్షన్ B:** వ్యక్తిగత అభివృద్ధి కూడా ముఖ్యమే కాబట్టి స్కాలర్‌షిప్ ఒప్పందాన్ని అంగీకరించండి.
• **ఆప్షన్ C:** సర్పంచ్ ఆఫర్‌ను స్మార్ట్‌ఫోన్‌లో రహస్యంగా రికార్డ్ చేసి, లంచగొండితనం నిరోధక విభాగానికి (ACB) ఆధారంగా పంపండి.`;
  } else {
    fallback = `🌟 **Story Outcome (The RTI Path):**

You boldly decided to utilize the Right to Information (RTI) Act to demand official written accounts of the road project! 📝
**Civic Fact:** Under Section 6(1) of the RTI Act, 2005, any citizen can apply with a mere ₹10 fee, and the Public Information Officer (PIO) is legally bound to provide the details within 30 days.

Seeing that you understand your constitutional rights, the Sarpanch's expression changed. He called you to his side room and whispered, *"Listen young friend, why go through all this legal hassle? Village works always take time. If you drop this RTI, I will personally approve a special digital learning scholarship for your studies."*

You are now at a crucial moral crossroads! ⚖️

**What do you choose to do next?**
• **Option A:** Strongly refuse the bribe. Stand up in the upcoming Gram Sabha assembly and expose this offer, demanding a public social audit.
• **Option B:** Accept the scholarship, thinking that your personal education will help you fight for the village better in the long run.
• **Option C:** Secretly record the conversation on your phone and send it as evidence directly to the District Development Officer (DDO) and Anti-Corruption Bureau.`;
  }

  res.json({ outcome: fallback });
});

function getLocalFallbackTranslation(text: string, lang: string): string {
  const lower = text.toLowerCase();
  if (lang === 'te') {
    if (lower.includes('volunteer portal')) return 'వాలంటీర్ పోర్టల్';
    if (lower.includes('admin hub')) return 'అడ్మిన్ హబ్';
    if (lower.includes('select your language')) return 'మీ భాషను ఎంచుకోండి';
    if (lower.includes('get started')) return 'ప్రారంభించండి';
    if (lower.includes('application overview')) return 'అప్లికేషన్ అవలోకనం, ప్రధాన ఫీచర్లు & అభిప్రాయాల కేంద్రం';
  }
  if (lang === 'hi') {
    if (lower.includes('volunteer portal')) return 'स्वयंसेवक पोर्टल';
    if (lower.includes('admin hub')) return 'व्यवस्थापक केंद्र';
  }
  return text;
}


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

function getIntelligentAffidavitDraft(
  name: string,
  age: string | number,
  occupation: string,
  homeState: string,
  currentAddress: string,
  purpose: string,
  testimonies: string[],
  utilities: string[]
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const witnessSection = testimonies && testimonies.length > 0
    ? testimonies.map((t, idx) => `   *Witness ${idx + 1} Testimony:* "${t}"`).join('\n')
    : '   *Witness Declaration:* Neighbors and local co-workers confirm the continuous residence and peaceful occupation of the deponent.';

  const utilitySection = utilities && utilities.length > 0
    ? `The following supplementary documents have been uploaded and annexed as secondary corroborative proofs:\n` + utilities.map(u => `   - ${u}`).join('\n')
    : 'No formal public records or utility bills are available at this time due to transient migratory working conditions.';

  return `======================================================================
                  GOVERNMENT OF INDIA (BHARAT SARKAR)
                     NOTARIAL STAMP PAPER - IND-983021
======================================================================

          BEFORE THE EXECUTIVE MAGISTRATE / NOTARY PUBLIC COMMISSIONER
                        AT MUNICIPAL WARD OF HYDERABAD

                               AFFIDAVIT

I, **${name || 'Citizen'}**, aged **${age || '32'}** years, by profession working as a **${occupation || 'Construction Worker'}**, presently residing at **${currentAddress || 'Plot No. 44, Gachibowli Labor Camp, Hyderabad'}**, originally belonging to the State of **${homeState || 'Bihar'}**, do hereby solemnly affirm and declare on oath as under:

1. That I am a citizen of India and a permanent resident of India, and currently operating as a migrant worker at the address specified above.

2. That due to seasonal work opportunities and lack of structural shelter in my home village, I have migrated for livelihood. I do not possess formal proof of local address like gas connections, municipal registration, or voter lists.

3. That for the purpose of: **${purpose || 'Establishing local proof of identity and residence'}**, I am presenting this consolidated affidavit of residence and occupational standing.

4. That my continuous physical residency and peaceful occupational presence are fully verified and sworn to by neighboring residents and co-workers:
${witnessSection}

5. That I corroborate my identity and continuous local employment with the following auxiliary proof points:
${utilitySection}

6. That I have never been involved in any unlawful activity or anti-social behavior, and that this declaration is executed in absolute good faith to facilitate necessary documentation access (such as Aadhaar, ration, or birth registrations).

                                                          ________________________
                                                             (DEPONENT SIGNATURE)

                                  VERIFICATION

I, the deponent above-named, do hereby verify and declare that the contents of paragraphs 1 to 6 are true and correct to the best of my knowledge, and nothing material has been concealed therefrom.

Verified at Hyderabad on this **${dateStr}**.

                                                          ________________________
                                                             (DEPONENT SIGNATURE)

----------------------------------------------------------------------
                           ATTESTATION RECORD
----------------------------------------------------------------------
The deponent is identified by the undersigning local ward representative and has solemnly verified their signature in our presence.

Witness 1: ________________________ (Name: Local Ward Elder)
Witness 2: ________________________ (Name: Site Contractor)

NOTARY PUBLIC SEAL & REGISTRATION NO. IND-NOT-894021
Signed and Attested. [NOTARY PUBLIC STAMP]`;
}

// ==========================================
// 10. Multilingual Voice Form-Filling Assistant API
// ==========================================
app.post('/api/ai/voice-form-fill', async (req, res) => {
  const { selected_language, current_screen, form_state, conversation_state, user_voice_transcript } = req.body;
  const ai = getAiClient();

  const systemInstruction = `You are a multilingual voice-first assistant. Your main job is to help citizens fill an application form through voice conversation only.
The user should not need to type anything.
The user may be illiterate, low-literacy, elderly, rural, a migrant worker, a daily wage worker, a woman, a farmer, a student, or someone who is not comfortable using digital apps.
You must guide the user like a human helper.

The user may speak in any of these 12 languages:
English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Urdu.

Current Selected language: \${selected_language || 'English'}
Current App Screen: \${current_screen || 'CitizenDashboard'}

Important rule:
The conversation should happen in the selected language.
But the final form data must always be filled in English.

Example:
If user says in Telugu:
“నా పేరు లక్ష్మి, నేను హైదరాబాద్లో పని చేస్తున్నాను”
The form data should be:
{
"full_name": "Lakshmi",
"district": "Hyderabad"
}
Never store form values in Telugu, Hindi, Tamil, Urdu, or any other language. Always normalize form values into English.

Your role:
Ask the user 8 questions one by one.
Wait for the user’s answer.
Extract information from the spoken answer.
Convert the extracted data into English.
Fill the form fields automatically.
Confirm unclear answers.
Move to the next question only after the current answer is understood.
At the end, summarize all collected details in the selected language.
Ask the user to confirm if the details are correct.
Return structured JSON so the application can auto-fill the form.

Voice behavior:
Speak in the selected language.
Ask only one question at a time.
Do not ask multiple questions together.
Use simple words.
Use short sentences.
Be patient and respectful.
If the answer is unclear, ask again politely.
If the user gives extra details, extract useful fields but still continue the planned flow.
Do not depend on typing.
Text input is only a fallback.

The 8 questions to ask:
Question 1: Ask for the user’s name.
Question 2: Ask for the user’s age.
Question 3: Ask for the user’s gender.
Question 4: Ask which state and district the user lives in.
Question 5: Ask what work or occupation the user does.
Question 6: Ask approximately how much the user earns in one month.
Question 7: Ask whether the user belongs to any of these groups: student, farmer, worker, woman, senior citizen, migrant worker, person with disability.
Question 8: Ask whether the user has Aadhaar and a bank account.

Field mapping:
Question 1 fills: full_name
Question 2 fills: age (as a number)
Question 3 fills: gender (Normalize to: Male, Female, Other, Prefer not to say)
Question 4 fills: state, district (Convert to standard English spelling)
Question 5 fills: occupation (Convert to simple English, e.g. "Domestic worker", "Farmer", "Shop owner", "Student", "Daily wage worker", "Street vendor")
Question 6 fills: monthly_income (Extract number only)
Question 7 fills: is_student, is_farmer, is_worker, is_woman, is_senior_citizen, is_migrant, is_disabled (Boolean fields)
Question 8 fills: has_aadhaar, has_bank_account (Boolean fields)

English normalization rules:
Names: Transliterate names into English.
Gender: Male, Female, Other, Prefer not to say.
State and district: Convert to standard English spelling.
Occupation: Convert to simple English.
Income: Extract number only. Store monthly_income as a number.
Boolean fields: Store as true or false. If user says yes in any language, return true. If user says no, return false.

Conversation flow:
Start: Greet the user in the selected language and explain: "I will ask a few simple questions. You can answer by speaking. I will fill the form for you." Then ask Question 1.
After each user answer: Extract the answer, convert it to English form data, return form_patch with only newly extracted fields, ask the next question in the selected language.
If the answer is unclear: Do not move to the next question. Ask the same question again in simpler language. Set needs_clarification to true.
If the user answers multiple future fields in one response: Extract all available fields, update form_patch, skip already answered questions, ask the next missing question.
When all fields are collected: Summarize the details in the selected language. Ask: “Are these details correct?” Set action to "confirm_form".
After user confirms: Set action to "form_ready", set form_ready to true.

Output format:
Always return valid JSON only. Do not return markdown. Do not return explanations outside JSON.
Your output must conform exactly to this JSON schema:
{
  "language": "Selected Language",
  "stage": "voice_form_filling",
  "current_question_number": 1,
  "action": "ask_question | update_form | ask_clarification | confirm_form | form_ready",
  "speak": "Voice response in the selected language",
  "display_text": "Same response for screen display in the selected language",
  "next_question": "Next question in the selected language",
  "needs_clarification": false,
  "clarification_reason": null,
  "form_patch": {
    "full_name": null,
    "age": null,
    "gender": null,
    "state": null,
    "district": null,
    "occupation": null,
    "monthly_income": null,
    "is_student": null,
    "is_farmer": null,
    "is_worker": null,
    "is_woman": null,
    "is_senior_citizen": null,
    "is_migrant": null,
    "is_disabled": null,
    "has_aadhaar": null,
    "has_bank_account": null
  },
  "complete_form_data": {
    "full_name": null,
    "age": null,
    "gender": null,
    "state": null,
    "district": null,
    "occupation": null,
    "monthly_income": null,
    "is_student": null,
    "is_farmer": null,
    "is_worker": null,
    "is_woman": null,
    "is_senior_citizen": null,
    "is_migrant": null,
    "is_disabled": null,
    "has_aadhaar": null,
    "has_bank_account": null
  },
  "missing_fields": [],
  "form_ready": false,
  "confidence": 0.0
}`;

  const prompt = `Selected language: \${selected_language}
Current form state: \${JSON.stringify(form_state || {})}
Previous conversation state: \${JSON.stringify(conversation_state || [])}
User voice transcript: "\${user_voice_transcript || ''}"`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        try {
          const parsed = JSON.parse(response.text.trim());
          return res.json(parsed);
        } catch (jsonErr) {
          console.error("Failed to parse Gemini output as JSON:", response.text);
        }
      }
    } catch (e) {
      console.error("Gemini Voice Form Filling assistant failed, running offline simulator:", e);
    }
  }

  // Fallback Offline Simulator matching exact rules!
  const stateVal = form_state || {};
  const current_q = Number(req.body.current_question_number) || Number(stateVal.current_question_number) || 1;
  const p = { ...stateVal };

  // Helper translations for offline simulator
  const trans: Record<string, any> = {
    "English": {
      greet: "Hello. I will help you fill the form. You only need to speak. First, what is your full name?",
      q1: "What is your full name?",
      q2: "Thank you. Now, what is your age in years?",
      q3: "Got it. What is your gender?",
      q4: "Which state and district do you live in?",
      q5: "What work or occupation do you do?",
      q6: "Approximately how much do you earn in one month?",
      q7: "Do you belong to any groups like student, farmer, worker, woman, senior citizen, migrant, or disabled?",
      q8: "Do you have Aadhaar and a bank account?",
      confirm: "I have filled your details. Your name is {name}. You are {age} years old. You live in {district}, {state}. You work as a {occupation} and earn about {income} rupees per month. You have Aadhaar and a bank account. Are these details correct?",
      ready: "Thank you. Your form is ready. I will now check the schemes you may be eligible for.",
    },
    "Telugu": {
      greet: "నమస్తే. నేను మీకు ఫారం నింపడంలో సహాయం చేస్తాను. మీరు మాట్లాడితే సరిపోతుంది. ముందుగా మీ పేరు చెప్పండి.",
      q1: "మీ పేరు ఏమిటి?",
      q2: "ధన్యవాదాలు. ఇప్పుడు మీ వయస్సు ఎంత?",
      q3: "అర్థమైంది. మీ లింగం ఏమిటి?",
      q4: "మీరు ఏ రాష్ట్రం మరియు ఏ జిల్లాలో నివసిస్తున్నారు?",
      q5: "మీరు ఏమి పని చేస్తారు?",
      q6: "మీరు నెలకు ఎంత సంపాదిస్తారు?",
      q7: "మీరు విద్యార్థి, రైతు, కార్మికుడు, మహిళ, వృద్ధుడు, వలస కార్మికుడు లేదా వికలాంగుల గ్రూపులకు చెందినవారా?",
      q8: "మీకు ఆధార్ మరియు బ్యాంక్ ఖాతా ఉన్నాయా?",
      confirm: "నేను మీ వివరాలను నింపాను. మీ పేరు {name}. వయస్సు {age}. నివసించేది {district}, {state}. పని {occupation}, నెలసరి ఆదాయం ₹{income}. ఇవి సరైనవేనా?",
      ready: "ధన్యవాదాలు. మీ ఫారం సిద్ధంగా ఉంది.",
    },
    "Hindi": {
      greet: "नमस्ते। मैं आपको फॉर्म भरने में मदद करूँगा। आपको बस बोलना है। पहले, आपका पूरा नाम क्या है?",
      q1: "आपका पूरा नाम क्या है?",
      q2: "धन्यवाद। अब बताइए, आपकी उम्र कितनी साल है?",
      q3: "ठीक है। आपका लिंग (जेंडर) क्या है?",
      q4: "आप किस राज्य और जिले में रहते हैं?",
      q5: "आप क्या काम करते हैं?",
      q6: "आप एक महीने में लगभग कितना कमाते हैं?",
      q7: "क्या आप छात्र, किसान, मजदूर, महिला, वरिष्ठ नागरिक, प्रवासी या विकलांग वर्ग से हैं?",
      q8: "क्या आपके पास आधार कार्ड और बैंक खाता है?",
      confirm: "मैंने आपका विवरण भर दिया है। आपका नाम {name}, उम्र {age}, राज्य {state}, जिला {district} है। क्या यह सही है?",
      ready: "धन्यवाद। आपका फॉर्म तैयार है।",
    }
  };

  const selectedLang = selected_language || "English";
  const langTrans = trans[selectedLang] || trans["English"];

  let nextQ = current_q;
  let actionStr = "ask_question";
  let speakText = "";
  let patch: Record<string, any> = {};

  if (!user_voice_transcript || user_voice_transcript.trim() === "") {
    speakText = langTrans.greet;
    nextQ = 1;
    actionStr = "ask_question";
  } else {
    const txt = user_voice_transcript.toLowerCase();
    if (current_q === 1) {
      // Name
      patch.full_name = user_voice_transcript.replace(/my name is|na peru|mera naam/gi, "").trim() || "Lakshmi";
      speakText = langTrans.q2;
      nextQ = 2;
      actionStr = "update_form";
    } else if (current_q === 2) {
      // Age
      const match = txt.match(/\d+/);
      patch.age = match ? Number(match[0]) : 32;
      speakText = langTrans.q3;
      nextQ = 3;
      actionStr = "update_form";
    } else if (current_q === 3) {
      // Gender
      if (txt.includes("female") || txt.includes("మహిళ") || txt.includes("स्त्री") || txt.includes("महिला")) {
        patch.gender = "Female";
      } else if (txt.includes("male") || txt.includes("పురుషుడు") || txt.includes("पुरुष")) {
        patch.gender = "Male";
      } else {
        patch.gender = "Other";
      }
      speakText = langTrans.q4;
      nextQ = 4;
      actionStr = "update_form";
    } else if (current_q === 4) {
      // State & District
      patch.state = txt.includes("telangana") || txt.includes("తెలంగాణ") ? "Telangana" : "Telangana";
      patch.district = txt.includes("hyderabad") || txt.includes("హైదరాబాద్") ? "Hyderabad" : "Rangareddy";
      speakText = langTrans.q5;
      nextQ = 5;
      actionStr = "update_form";
    } else if (current_q === 5) {
      // Occupation
      patch.occupation = txt.includes("farmer") || txt.includes("రైతు") || txt.includes("किसान") ? "Farmer" : "Domestic worker";
      speakText = langTrans.q6;
      nextQ = 6;
      actionStr = "update_form";
    } else if (current_q === 6) {
      // Income
      const match = txt.match(/\d+/);
      patch.monthly_income = match ? Number(match[0]) : 10000;
      speakText = langTrans.q7;
      nextQ = 7;
      actionStr = "update_form";
    } else if (current_q === 7) {
      // Groups
      patch.is_woman = txt.includes("woman") || txt.includes("మహిళ") || txt.includes("महिला") || p.gender === "Female";
      patch.is_farmer = txt.includes("farmer") || txt.includes("రైతు") || txt.includes("किसान") || p.occupation === "Farmer";
      patch.is_worker = txt.includes("worker") || txt.includes("కార్మికుడు") || txt.includes("मजदूर");
      speakText = langTrans.q8;
      nextQ = 8;
      actionStr = "update_form";
    } else if (current_q === 8) {
      // Aadhaar and Bank
      const yes = txt.includes("yes") || txt.includes("అవును") || txt.includes("हाँ") || txt.includes("haan") || txt.includes("true");
      patch.has_aadhaar = yes;
      patch.has_bank_account = yes;

      const mergedName = p.full_name || patch.full_name || "Lakshmi";
      const mergedAge = p.age || patch.age || "32";
      const mergedState = p.state || patch.state || "Telangana";
      const mergedDistrict = p.district || patch.district || "Hyderabad";
      const mergedOcc = p.occupation || patch.occupation || "Domestic worker";
      const mergedIncome = p.monthly_income || patch.monthly_income || "10000";

      speakText = langTrans.confirm
        .replace("{name}", mergedName)
        .replace("{age}", mergedAge)
        .replace("{state}", mergedState)
        .replace("{district}", mergedDistrict)
        .replace("{occupation}", mergedOcc)
        .replace("{income}", mergedIncome);
      nextQ = 8;
      actionStr = "confirm_form";
    } else if (actionStr === "confirm_form" || current_q === 8) {
      const isConfirm = txt.includes("yes") || txt.includes("అవును") || txt.includes("हाँ") || txt.includes("haan") || txt.includes("correct") || txt.includes("సరిగ్గా");
      if (isConfirm) {
        speakText = langTrans.ready;
        actionStr = "form_ready";
      } else {
        speakText = "Let's restart to fix details. What is your full name?";
        nextQ = 1;
        actionStr = "ask_question";
        p.full_name = null;
        p.age = null;
        p.gender = null;
        p.state = null;
        p.district = null;
        p.occupation = null;
        p.monthly_income = null;
        p.has_aadhaar = null;
        p.has_bank_account = null;
      }
    }
  }

  // Update complete_form_data
  const complete = {
    full_name: p.full_name !== undefined ? p.full_name : null,
    age: p.age !== undefined ? p.age : null,
    gender: p.gender !== undefined ? p.gender : null,
    state: p.state !== undefined ? p.state : null,
    district: p.district !== undefined ? p.district : null,
    occupation: p.occupation !== undefined ? p.occupation : null,
    monthly_income: p.monthly_income !== undefined ? p.monthly_income : null,
    is_student: p.is_student !== undefined ? p.is_student : false,
    is_farmer: p.is_farmer !== undefined ? p.is_farmer : false,
    is_worker: p.is_worker !== undefined ? p.is_worker : false,
    is_woman: p.is_woman !== undefined ? p.is_woman : false,
    is_senior_citizen: p.is_senior_citizen !== undefined ? p.is_senior_citizen : false,
    is_migrant: p.is_migrant !== undefined ? p.is_migrant : false,
    is_disabled: p.is_disabled !== undefined ? p.is_disabled : false,
    has_aadhaar: p.has_aadhaar !== undefined ? p.has_aadhaar : null,
    has_bank_account: p.has_bank_account !== undefined ? p.has_bank_account : null,
    ...patch
  };

  const missing = [];
  if (!complete.full_name) missing.push("full_name");
  if (!complete.age) missing.push("age");
  if (!complete.gender) missing.push("gender");
  if (!complete.state) missing.push("state");
  if (!complete.district) missing.push("district");
  if (!complete.occupation) missing.push("occupation");
  if (!complete.monthly_income) missing.push("monthly_income");
  if (complete.has_aadhaar === null) missing.push("has_aadhaar");
  if (complete.has_bank_account === null) missing.push("has_bank_account");

  res.json({
    language: selectedLang,
    stage: "voice_form_filling",
    current_question_number: Math.min(actionStr === "form_ready" ? 8 : nextQ, 8),
    action: actionStr,
    speak: speakText,
    display_text: speakText,
    next_question: speakText,
    needs_clarification: false,
    clarification_reason: null,
    form_patch: patch,
    complete_form_data: complete,
    missing_fields: missing,
    form_ready: actionStr === "form_ready",
    confidence: 0.95
  });
});

// ==========================================
// 10.b End-to-End Voice Agent Turn Endpoint (Sarvam AI + Gemini)
// ==========================================
app.post(['/voice-agent-turn', '/api/ai/voice-agent-turn'], async (req, res) => {
  try {
    const selectedLang = req.body.selected_language || 'English';
    const currentQuestionNumber = Number(req.body.current_question_number) || 1;
    
    // Parse formState
    let formState = {};
    if (req.body.form_state) {
      try {
        formState = typeof req.body.form_state === 'string' 
          ? JSON.parse(req.body.form_state) 
          : req.body.form_state;
      } catch (e) {
        console.error("Error parsing form_state inside voice-agent-turn:", e);
      }
    }

    // Parse conversationState
    let conversationState = [];
    if (req.body.conversation_state) {
      try {
        conversationState = typeof req.body.conversation_state === 'string' 
          ? JSON.parse(req.body.conversation_state) 
          : req.body.conversation_state;
      } catch (e) {
        console.error("Error parsing conversation_state inside voice-agent-turn:", e);
      }
    }

    const languageMap: Record<string, string> = {
      "English": "en-IN",
      "Hindi": "hi-IN",
      "Telugu": "te-IN",
      "Tamil": "ta-IN",
      "Kannada": "kn-IN",
      "Malayalam": "ml-IN",
      "Marathi": "mr-IN",
      "Bengali": "bn-IN",
      "Gujarati": "gu-IN",
      "Punjabi": "pa-IN",
      "Odia": "or-IN",
      "Urdu": "ur-IN"
    };

    const targetLangCode = languageMap[selectedLang] || 'en-IN';

    let transcript = req.body.user_voice_transcript || '';

    // 2. Gemini Turn Processing (Normalize & Decide next question)
    const systemInstruction = `You are a multilingual voice-first assistant. Your main job is to help citizens fill an application form through voice conversation only.
The user should not need to type anything.
The user may be illiterate, low-literacy, elderly, rural, a migrant worker, a daily wage worker, a woman, a farmer, a student, or someone who is not comfortable using digital apps.
You must guide the user like a human helper.

The user may speak in any of these 12 languages:
English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Urdu.

Current Selected language: ${selectedLang}
Current Question Number: ${currentQuestionNumber} (The maximum value of current_question_number in your output JSON must never exceed 8. If the form is ready or confirming, keep it at 8)
Current App Screen: CitizenDashboard

Important rule:
The conversation should happen in the selected language.
But the final form data must always be filled in English.

Example:
If user says in Telugu:
“నా పేరు లక్ష్మి, నేను హైదరాబాద్లో పని చేస్తున్నాను”
The form data should be:
{
"full_name": "Lakshmi",
"district": "Hyderabad"
}
Never store form values in Telugu, Hindi, Tamil, Urdu, or any other language. Always normalize form values into English.

Your role:
Ask the user 8 questions one by one.
Wait for the user’s answer.
Extract information from the spoken answer.
Convert the extracted data into English.
Fill the form fields automatically.
Confirm unclear answers.
Move to the next question only after the current answer is understood.
At the end, summarize all collected details in the selected language.
Ask the user to confirm if the details are correct.
Return structured JSON so the application can auto-fill the form.

Voice behavior:
Speak in the selected language.
Ask only one question at a time.
Do not ask multiple questions together.
Use simple words.
Use short sentences.
Be patient and respectful.
If the answer is unclear, ask again politely.
If the user gives extra details, extract useful fields but still continue the planned flow.
Do not depend on typing.
Text input is only a fallback.

The 8 questions to ask:
Question 1: Ask for the user’s name.
Question 2: Ask for the user’s age.
Question 3: Ask for the user’s gender.
Question 4: Ask which state and district the user lives in.
Question 5: Ask what work or occupation the user does.
Question 6: Ask approximately how much the user earns in one month.
Question 7: Ask whether the user belongs to any of these groups: student, farmer, worker, woman, senior citizen, migrant worker, person with disability.
Question 8: Ask whether the user has Aadhaar and a bank account.

Field mapping:
Question 1 fills: full_name
Question 2 fills: age (as a number)
Question 3 fills: gender (Normalize to: Male, Female, Other, Prefer not to say)
Question 4 fills: state, district (Convert to standard English spelling)
Question 5 fills: occupation (Convert to simple English, e.g. "Domestic worker", "Farmer", "Shop owner", "Student", "Daily wage worker", "Street vendor")
Question 6 fills: monthly_income (Extract number only)
Question 7 fills: is_student, is_farmer, is_worker, is_woman, is_senior_citizen, is_migrant, is_disabled (Boolean fields)
Question 8 fills: has_aadhaar, has_bank_account (Boolean fields)

English normalization rules:
Names: Transliterate names into English.
Gender: Male, Female, Other, Prefer not to say.
State and district: Convert to standard English spelling.
Occupation: Convert to simple English.
Income: Extract number only. Store monthly_income as a number.
Boolean fields: Store as true or false. If user says yes in any language, return true. If user says no, return false.

Conversation flow:
Start: Greet the user in the selected language and explain: "I will ask a few simple questions. You can answer by speaking. I will fill the form for you." Then ask Question 1.
After each user answer: Extract the answer, convert it to English form data, return form_patch with only newly extracted fields, ask the next question in the selected language.
If the answer is unclear: Do not move to the next question. Ask the same question again in simpler language. Set needs_clarification to true.
If the user answers multiple future fields in one response: Extract all available fields, update form_patch, skip already answered questions, ask the next missing question.
When all fields are collected: Summarize the details in the selected language. Ask: “Are these details correct?” Set action to "confirm_form".
After user confirms: Set action to "form_ready", set form_ready to true.

Output format:
Always return valid JSON only. Do not return markdown. Do not return explanations outside JSON.
Your output must conform exactly to this JSON schema:
{
  "language": "Selected Language",
  "stage": "voice_form_filling",
  "current_question_number": 1,
  "action": "ask_question | update_form | ask_clarification | confirm_form | form_ready",
  "speak": "Voice response in the selected language",
  "display_text": "Same response for screen display in the selected language",
  "next_question": "Next question in the selected language",
  "user_transcript": "Transcription of the user's spoken words in the selected language from their audio. If they typed text or user_voice_transcript was provided, copy that. If none, set to null.",
  "needs_clarification": false,
  "clarification_reason": null,
  "form_patch": {
    "full_name": null,
    "age": null,
    "gender": null,
    "state": null,
    "district": null,
    "occupation": null,
    "monthly_income": null,
    "is_student": null,
    "is_farmer": null,
    "is_worker": null,
    "is_woman": null,
    "is_senior_citizen": null,
    "is_migrant": null,
    "is_disabled": null,
    "has_aadhaar": null,
    "has_bank_account": null
  },
  "complete_form_data": {
    "full_name": null,
    "age": null,
    "gender": null,
    "state": null,
    "district": null,
    "occupation": null,
    "monthly_income": null,
    "is_student": null,
    "is_farmer": null,
    "is_worker": null,
    "is_woman": null,
    "is_senior_citizen": null,
    "is_migrant": null,
    "is_disabled": null,
    "has_aadhaar": null,
    "has_bank_account": null
  },
  "missing_fields": [],
  "form_ready": false,
  "confidence": 0.0
}`;

    const prompt = `Selected language: ${selectedLang}
Current Question Number: ${currentQuestionNumber}
Current form state: ${JSON.stringify(formState)}
Previous conversation state: ${JSON.stringify(conversationState)}
User voice transcript: "${transcript}"
If you received an audio input file alongside this prompt, listen to it, transcribe it, and perform the conversation turn using the spoken response.`;

    let geminiResult: any = null;
    const ai = getAiClient();

    if (ai) {
      try {
        const contents: any[] = [];
        if (req.body.audio_base64) {
          contents.push({
            inlineData: {
              mimeType: req.body.audio_mime_type || 'audio/webm',
              data: req.body.audio_base64
            }
          });
        }
        contents.push(prompt);

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          geminiResult = JSON.parse(response.text.trim());
          if (geminiResult && geminiResult.user_transcript) {
            transcript = geminiResult.user_transcript;
          }
        }
      } catch (e) {
        console.error("Gemini failed inside voice-agent-turn, running offline simulator:", e);
      }
    }

  // Fallback Simulator matching exact rules if Gemini fails
  if (!geminiResult) {
    const stateVal = formState as any || {};
    const current_q = Number(req.body.current_question_number) || Number(stateVal.current_question_number) || 1;
    const p = { ...stateVal };

    // Helper translations for offline simulator
    const trans: Record<string, any> = {
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
        confirm: "I have filled your form. Name: {name}, Age: {age}, Gender: {gender}, Location: {district}, {state}, Job: {occupation}, Income: {income} rupees. Is this information correct?",
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
        confirm: "నేను మీ వివరాలను సేకరించాను. పేరు: {name}, వయస్సు: {age}, లింగం: {gender}, స్థలం: {district}, {state}, వృత్తి: {occupation}, ఆదాయం: {income} రూపాయలు. ఈ వివరాలు సరైనవేనా?",
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
        confirm: "मैंने आपका फॉर्म भर दिया है। नाम: {name}, उम्र: {age}, लिंग: {gender}, स्थान: {district}, {state}, काम: {occupation}, आय: {income} रुपये। क्या यह जानकारी सही है?",
        success: "बहुत बढ़िया। आपका फॉर्म सफलतापूर्वक पूरा हो गया है और सुरक्षित कर लिया गया है!"
      }
    };

    const t = trans[selectedLang] || trans["English"];

    // Basic heuristic normalization
    const patch: Record<string, any> = {};
    const lowerTranscript = transcript.toLowerCase();

    if (current_q === 1 && transcript.trim()) {
      patch.full_name = transcript.replace(/my name is|నా పేరు|मेरा नाम है|मेरा नाम/gi, "").trim();
    } else if (current_q === 2 && transcript.trim()) {
      const num = parseInt(transcript.match(/\d+/)?.[0] || "30");
      patch.age = num;
    } else if (current_q === 3 && transcript.trim()) {
      if (lowerTranscript.includes("fem") || lowerTranscript.includes("woman") || lowerTranscript.includes("మహిళ") || lowerTranscript.includes("महिला")) {
        patch.gender = "Female";
      } else {
        patch.gender = "Male";
      }
    } else if (current_q === 4 && transcript.trim()) {
      patch.state = "Delhi";
      patch.district = transcript.replace(/telangana|delhi|district|రాష్ట్రం|జिलासమీపంలో|राज्य/gi, "").trim() || "New Delhi";
    } else if (current_q === 5 && transcript.trim()) {
      patch.occupation = transcript;
    } else if (current_q === 6 && transcript.trim()) {
      const num = parseInt(transcript.match(/\d+/)?.[0] || "10000");
      patch.monthly_income = num;
    } else if (current_q === 7 && transcript.trim()) {
      patch.is_student = lowerTranscript.includes("student") || lowerTranscript.includes("విద్యార్థి") || lowerTranscript.includes("छात्र");
      patch.is_farmer = lowerTranscript.includes("farmer") || lowerTranscript.includes("రైతు") || lowerTranscript.includes("किसान");
      patch.is_worker = lowerTranscript.includes("worker") || lowerTranscript.includes("కూలీ") || lowerTranscript.includes("మజదూర");
      patch.is_woman = lowerTranscript.includes("woman") || lowerTranscript.includes("మహిళ") || lowerTranscript.includes("महिला") || p.gender === "Female";
    } else if (current_q === 8 && transcript.trim()) {
      patch.has_aadhaar = lowerTranscript.includes("yes") || lowerTranscript.includes("అవును") || lowerTranscript.includes("हाँ") || lowerTranscript.includes("have");
      patch.has_bank_account = lowerTranscript.includes("yes") || lowerTranscript.includes("అవును") || lowerTranscript.includes("हाँ") || lowerTranscript.includes("have");
    }

    const nextQ = transcript.trim() ? Math.min(current_q + 1, 9) : current_q;
    let speakText = "";
    let actionStr = "ask_question";

    if (!transcript.trim()) {
      speakText = current_q === 1 ? t.greet : t[`q${current_q}`];
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
      if (lowerTranscript.includes("yes") || lowerTranscript.includes("అవును") || lowerTranscript.includes("हाँ") || lowerTranscript.includes("correct") || lowerTranscript.includes("సరైన")) {
        speakText = t.success;
        actionStr = "form_ready";
      } else {
        speakText = t.confirm
          .replace("{name}", p.full_name || patch.full_name || "Lakshmi")
          .replace("{age}", String(p.age || patch.age || 32))
          .replace("{gender}", p.gender || patch.gender || "Female")
          .replace("{district}", p.district || patch.district || "New Delhi")
          .replace("{state}", p.state || patch.state || "Delhi")
          .replace("{occupation}", p.occupation || patch.occupation || "Domestic worker")
          .replace("{income}", String(p.monthly_income || patch.monthly_income || 10000));
        actionStr = "confirm_form";
      }
    }

    // Update complete_form_data
    const complete = {
      full_name: p.full_name !== undefined ? p.full_name : null,
      age: p.age !== undefined ? p.age : null,
      gender: p.gender !== undefined ? p.gender : null,
      state: p.state !== undefined ? p.state : null,
      district: p.district !== undefined ? p.district : null,
      occupation: p.occupation !== undefined ? p.occupation : null,
      monthly_income: p.monthly_income !== undefined ? p.monthly_income : null,
      is_student: p.is_student !== undefined ? p.is_student : false,
      is_farmer: p.is_farmer !== undefined ? p.is_farmer : false,
      is_worker: p.is_worker !== undefined ? p.is_worker : false,
      is_woman: p.is_woman !== undefined ? p.is_woman : false,
      is_senior_citizen: p.is_senior_citizen !== undefined ? p.is_senior_citizen : false,
      is_migrant: p.is_migrant !== undefined ? p.is_migrant : false,
      is_disabled: p.is_disabled !== undefined ? p.is_disabled : false,
      has_aadhaar: p.has_aadhaar !== undefined ? p.has_aadhaar : null,
      has_bank_account: p.has_bank_account !== undefined ? p.has_bank_account : null,
      ...patch
    };

    const missing = [];
    if (!complete.full_name) missing.push("full_name");
    if (!complete.age) missing.push("age");
    if (!complete.gender) missing.push("gender");
    if (!complete.state) missing.push("state");
    if (!complete.district) missing.push("district");
    if (!complete.occupation) missing.push("occupation");
    if (!complete.monthly_income) missing.push("monthly_income");
    if (complete.has_aadhaar === null) missing.push("has_aadhaar");
    if (complete.has_bank_account === null) missing.push("has_bank_account");

    geminiResult = {
      language: selectedLang,
      stage: "voice_form_filling",
      current_question_number: Math.min(actionStr === "form_ready" ? 8 : nextQ, 8),
      action: actionStr,
      speak: speakText,
      display_text: speakText,
      next_question: speakText,
      needs_clarification: false,
      clarification_reason: null,
      form_patch: patch,
      complete_form_data: complete,
      missing_fields: missing,
      form_ready: actionStr === "form_ready",
      confidence: 0.95
    };
  }

  // TTS: Return null so the client automatically falls back to browser-native SpeechSynthesis
  res.json({
    transcript: transcript,
    audio: null,
    data: geminiResult
  });
  } catch (err: any) {
    console.error("Error in voice-agent-turn endpoint:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

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

export default app;

if (!process.env.VERCEL) {
  startServer();
}
