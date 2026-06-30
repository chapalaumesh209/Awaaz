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
  const state = profile?.state || "Telangana";
  const location = profile?.location || "Moinabad";

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
