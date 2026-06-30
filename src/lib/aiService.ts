import { LanguageCode, CitizenProfile, Scheme } from '../types';

export interface OcrResult {
  documentType: string;
  extractedName?: string;
  extractedId?: string;
  extractedDetails?: Record<string, string>;
  confidence: number;
}

export interface ExtractedProfileFields {
  name?: string;
  age?: number;
  gender?: string;
  occupation?: string;
  location?: string;
  state?: string;
  householdIncome?: number;
  category?: string;
}

export async function generateAssistantReply(
  message: string,
  history: { sender: 'citizen' | 'volunteer' | 'ai'; text: string }[],
  language: LanguageCode
): Promise<string> {
  try {
    const response = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, language }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
  } catch (e) {
    console.error("AI service error, using mock fallback:", e);
  }

  // Frontend Fallback
  return getMockAssistantReply(message, language);
}

export async function extractProfileFields(text: string): Promise<ExtractedProfileFields> {
  try {
    const response = await fetch('/api/ai/extract-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.fields;
    }
  } catch (e) {
    console.error("AI service error, using mock fallback:", e);
  }

  return getMockExtractedFields(text);
}

export async function explainScheme(scheme: Scheme, language: LanguageCode): Promise<string> {
  try {
    const response = await fetch('/api/ai/explain-scheme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheme, language }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
  } catch (e) {
    console.error("AI service error, using mock fallback:", e);
  }

  return getMockSchemeExplanation(scheme, language);
}

export async function generateNextSteps(scheme: Scheme, profile: CitizenProfile, language: LanguageCode): Promise<string[]> {
  try {
    const response = await fetch('/api/ai/next-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheme, profile, language }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.steps;
    }
  } catch (e) {
    console.error("AI service error, using mock fallback:", e);
  }

  return getMockNextSteps(scheme, profile, language);
}

export async function generateGrievanceDraft(
  type: string,
  description: string,
  location: string,
  targetAuthority: string,
  language: LanguageCode
): Promise<string> {
  try {
    const response = await fetch('/api/ai/grievance-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, description, location, targetAuthority, language }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
  } catch (e) {
    console.error("AI service error, using mock fallback:", e);
  }

  return getMockGrievanceDraft(type, description, location, targetAuthority, language);
}

export async function mockOcrDocument(documentName: string, citizenName?: string, base64Data?: string): Promise<OcrResult> {
  try {
    const response = await fetch('/api/ai/ocr-mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentName, citizenName, base64Data }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.result;
    }
  } catch (e) {
    console.error("AI service error, using mock fallback:", e);
  }

  return getMockOcrResult(documentName, citizenName);
}

// ==========================================
// STATIC FRONTEND MOCK FALLBACKS (MANDATORY)
// ==========================================

function getMockAssistantReply(message: string, language: LanguageCode): string {
  const lowercaseMsg = message.toLowerCase();
  
  if (language === 'hi') {
    if (lowercaseMsg.includes('योजना') || lowercaseMsg.includes('मदद')) {
      return "नमस्ते! मैं आपकी पात्रता और विभिन्न योजनाओं जैसे पीएम विश्वकर्मा, पीएम स्वनिधि और जननी सुरक्षा योजना के बारे में मदद कर सकता हूँ। अपनी पात्रता जांचने के लिए 'योजनाएं' अनुभाग पर जाएं या मुझे अपनी उम्र, पेशा और आय बताएं।";
    }
    return "धन्यवाद आपका सवाल पूछने के लिए। मैं हकसेतु AI सहायक हूँ। मैं आपको सरकारी योजनाओं, आवश्यक दस्तावेजों, महिलाओं की सुरक्षा और आपके अधिकारों को समझने में मदद कर सकता हूँ। कृपया अपना प्रश्न विस्तार से बताएं।";
  }

  if (language === 'te') {
    if (lowercaseMsg.includes('పథకం') || lowercaseMsg.includes('సహాయం')) {
      return "నమస్తే! పీఎం విశ్వకర్మ, పీఎం స్వనిధి మరియు జనని సురక్ష యోజన వంటి పథకాలకు మీ అర్హతను పరిశీలించడంలో నేను మీకు సహాయపడగలను. మీ వయస్సు, వృత్తి మరియు ఆదాయం వివరాలను తెలియజేయండి.";
    }
    return "హక్సేతు AI సహాయకుడిని సంప్రదించినందుకు ధన్యవాదాలు. ప్రభుత్వ పథకాలు, పత్రాల సహాయం, మహిళల రక్షణ మరియు స్థానిక గ్రామ సభల సమస్యలపై నేను మీకు మార్గదర్శకత్వం చేయగలను. మీ సమస్యను వివరించండి.";
  }

  if (language === 'ur') {
    return "السلام علیکم! میں حق سیتو کا معاون کار ہوں۔ میں آپ کی سرکاری اسکیموں، شناختی دستاویزات کی تیاری، خواتین کی حفاظت اور مقامی پنچایت کے امور میں رہنمائی کر سکتا ہوں۔ آپ کیا جاننا چاہتے ہیں؟";
  }

  // Default English mocks
  if (lowercaseMsg.includes('scheme') || lowercaseMsg.includes('eligibility') || lowercaseMsg.includes('apply')) {
    return "I can certainly help you find government schemes! Based on typical criteria: For street vendors, PM SVANidhi offers collateral-free loans. For traditional artisans, PM Vishwakarma provides training and toolkit aids of ₹15,000. For healthcare support, Ayushman Bharat gives cover of up to ₹5 Lakhs per family. Let me know your age, occupation, and household income to refine your matches.";
  }
  if (lowercaseMsg.includes('document') || lowercaseMsg.includes('aadhaar') || lowercaseMsg.includes('ration') || lowercaseMsg.includes('pan')) {
    return "Identity documents are crucial for accessing government benefits. Common missing requirements are Income Certificates, Caste Certificates, or Local Address Proofs. Awaaz has a built-in OCR mock uploader in 'Documents' tab to verify details instantly and point out corrections. I can also help you draft formal request letters.";
  }
  if (lowercaseMsg.includes('safety') || lowercaseMsg.includes('emergency') || lowercaseMsg.includes('police')) {
    return "Your safety is paramount. Awaaz features a dedicated Women Safety module offering: Safe Route options, legal companion drafts, menstrual health guidance, and a QUICK SOS button that logs simulated alerts. Let me know if you want me to explain any women-focused legal rights or schemes.";
  }
  return "Hello! I am your Awaaz AI Assistant, supporting Voice, Safety, and Social Access. I can help you translate government rules, explain schemes in simple terms, evaluate your readiness score, scan documents, or draft local grievances. How can I assist you today?";
}

function getMockExtractedFields(text: string): ExtractedProfileFields {
  const lowercase = text.toLowerCase();
  const fields: ExtractedProfileFields = {
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

function getMockSchemeExplanation(scheme: Scheme, language: LanguageCode): string {
  if (language === 'hi') {
    return `**${scheme.name} (पीएम योजना)**: यह योजना मुख्य रूप से उन लोगों की मदद करने के लिए है जिन्हें वित्तीय सहायता की आवश्यकता है। इसके लाभों में डायरेक्ट कैश ट्रांसफर, वित्तीय सहायता और ट्रेनिंग शामिल हैं। आवश्यक दस्तावेज़: ${scheme.requiredDocuments.join(', ').toUpperCase()}। आप इस योजना के लिए पात्रता की जांच हमारे 'पात्रता' इंजन से कर सकते हैं।`;
  }
  if (language === 'te') {
    return `**${scheme.name} (ప్రభుత్వ పథకం)**: ఈ పథకం ముఖ్యంగా తక్కువ ఆదాయం గల వర్గాలకు సహాయం చేయడానికి రూపొందించబడింది. దీని కింద లబ్ధిదారులకు ఆర్థిక సహాయం మరియు శిక్షణ లభిస్తుంది. అవసరమైన పత్రాలు: ${scheme.requiredDocuments.join(', ').toUpperCase()}।`;
  }
  return `**${scheme.name} Simplified**: This program is spearheaded by the **${scheme.department}**. It's designed specifically for qualified applicants to receive direct financial aids, collateral-free credit, or subsidies. 

**Core Objective**:
- Eliminate middle-agents by transferring payouts directly to bank accounts.
- Reduce high-interest debt cycles for families.
- Empower local communities with standard toolkits and certificates.

**What you need**: A verified identity (${scheme.requiredDocuments.join(', ').toUpperCase()}) and matching occupational/income profiles. Awaaz AI suggests checking your readiness score before applying!`;
}

function getMockNextSteps(scheme: Scheme, profile: CitizenProfile, language: LanguageCode): string[] {
  const commonSteps = [
    "Verify that your Aadhar Name matches exactly with your Bank Passbook.",
    "Visit the local Common Service Centre (CSC) or Panchayat office with physical copies.",
    "Submit a copy of your verified mobile number linked with Aadhaar.",
    "Track the physical submission reference number using the Awaaz Tracker."
  ];

  if (scheme.id === 'pm-svanidhi') {
    return [
      "Obtain a Letter of Recommendation (LoR) or vendor ID from your local Municipality/Municipal Corporation.",
      "Submit an application on the PM SVANidhi portal or visit a nearby Public Sector Bank.",
      "Link your bank account with any UPI app (GPay/PhonePe) to qualify for transaction cashbacks.",
      ...commonSteps
    ];
  }

  if (scheme.id === 'pm-vishwakarma') {
    return [
      "Visit the Gram Panchayat or Urban Local Body (ULB) login for PM Vishwakarma registration.",
      "Complete the three-stage verification process: Panchayat/ULB review, District-level review, and Executive Committee approval.",
      "Join the 5 to 7 days basic skill training course to claim the ₹15,000 toolkit voucher.",
      ...commonSteps
    ];
  }

  return commonSteps;
}

function getMockGrievanceDraft(
  type: string,
  description: string,
  location: string,
  targetAuthority: string,
  language: LanguageCode
): string {
  const dateStr = new Date().toLocaleDateString();
  
  if (language === 'hi') {
    return `सेवा में,
श्रीमन् ${targetAuthority || 'ग्राम पंचायत अधिकारी'},
${location || 'स्थानीय पंचायत कार्यालय'}

विषय: ${type === 'discrimination' ? 'भेदभाव / सामाजिक बहिष्करण' : 'नागरिक शिकायत / सेवा में कमी'} के संबंध में।

महोदय,
सविनय निवेदन है कि मैं ${location} का निवासी हूँ। मैं आपका ध्यान इस गंभीर समस्या की ओर आकर्षित करना चाहता हूँ:
"${description}"

यह मामला नागरिक अधिकारों और सामाजिक सुरक्षा योजनाओं के निष्पक्ष क्रियान्वयन से संबंधित है।

कृपया इस विषय की तत्काल जांच करवाएं और आवश्यक सुधारात्मक कदम उठाएं।

धन्यवाद।
भवदीय/भवदीया,
(नागरिक की ओर से हकसेतु AI द्वारा जनरेटेड प्रारूप)`;
  }

  if (language === 'te') {
    return `గౌరవనీయులైన ${targetAuthority || 'గ్రామ పంచాయతీ అధికారి'} గారికి,
${location || 'స్థానిక కార్యాలయం'}

విషయం: ${type === 'discrimination' ? 'సామాజిక వివక్షత / సేవల నిరాకరణ' : 'పౌర సమస్య'} నివారణ కొరకు అభ్యర్థన.

అయ్యా/అమ్మ,
నేను ${location} నివాసిని. నా ప్రొఫైల్ ఆధారంగా ఈ క్రింది సమస్యను మీ దృష్టికి తీసుకురావాలనుకుంటున్నాను:
"${description}"

ఈ సమస్య పౌరుల సామాజिक రక్షణ పథకాల పొందుదలకు ఆటంకంగా మారింది. దయచేసి దీనిపై త్వరగా చర్యలు తీసుకోగలరు.

కృతజ్ఞతలతో,
భవదీయుడు/భవదీయురాలు`;
  }

  return `To,
The ${targetAuthority || 'Block Development Officer (BDO) / Gram Panchayat Secretary'},
Office of local governance, ${location || 'District Administration Office'}

Date: ${dateStr}

Subject: Formal Grievance regarding ${type.toUpperCase().replace('_', ' ')} at ${location || 'Local ward'}.

Respected Sir/Madam,

I am writing to draw your attention to a critical grievance regarding ${type.replace('_', ' ')} that is impacting local access to entitlements and civic rights. 

**Details of the Grievance**:
"${description}"

**Location of Occurrence**: ${location}

This issue severely undermines the transparency, equity, and public trust built around government social safety programs.

Therefore, I kindly request your office to launch an official inquiry, inspect the reported site, and implement necessary corrections to resolve this matter at the earliest.

Thank you.

Sincerely,
Citizen of India
(Drafted securely via Awaaz AI Gateway - Anonymous Reference ID: AW-${Math.floor(100000 + Math.random() * 900000)})`;
}

function getMockOcrResult(documentName: string, citizenName?: string): OcrResult {
  const normalized = documentName.toLowerCase();
  const finalName = citizenName || 'Citizen Verified';
  
  if (normalized.includes('aadhaar') || normalized.includes('आधार')) {
    return {
      documentType: 'Aadhaar Card',
      extractedName: finalName,
      extractedId: 'XXXX XXXX 8943',
      extractedDetails: {
        'Date of Birth': '12/04/1994',
        'Gender': 'Female',
        'Address': 'H No. 4-12, Gachibowli, Hyderabad, Telangana - 500032',
        'Verification State': 'Linked with Mobile (XXXXXX4928)'
      },
      confidence: 96
    };
  }

  if (normalized.includes('ration') || normalized.includes('राशन')) {
    return {
      documentType: 'Ration Card (FSC)',
      extractedName: 'Ramesh Kumar',
      extractedId: 'RATION-TE-548943',
      extractedDetails: {
        'Card Category': 'BPL (Below Poverty Line)',
        'State': 'Andhra Pradesh',
        'Family Members Registered': '4 Members',
        'Monthly Allocation': '20kg Rice, 2kg Sugar'
      },
      confidence: 92
    };
  }

  if (normalized.includes('income') || normalized.includes('आय')) {
    return {
      documentType: 'Income Certificate',
      extractedName: 'Anitha Goud',
      extractedId: 'INC-TS-2026-90432',
      extractedDetails: {
        'Annual Household Income': '₹80,000',
        'Date of Issue': '15/01/2026',
        'Issuing Authority': 'Tahsildar, Rangareddy District',
        'Validity': 'Valid up to 14/01/2027'
      },
      confidence: 94
    };
  }

  if (normalized.includes('disability') || normalized.includes('दिव्यांग')) {
    return {
      documentType: 'UDID (Disability Certificate)',
      extractedName: 'Kiran Jadhav',
      extractedId: 'MH-24-0004921',
      extractedDetails: {
        'Disability Category': 'Locomotor Disability',
        'Percentage of Disability': '55% Permanent',
        'State': 'Maharashtra',
        'Issuing Hospital': 'District Civil Hospital, Pune'
      },
      confidence: 97
    };
  }

  return {
    documentType: 'General Government Card / Certificate',
    extractedName: 'Citizenship Name Verified',
    extractedId: 'ID-' + Math.floor(100000 + Math.random() * 900000),
    extractedDetails: {
      'Date scanned': new Date().toLocaleDateString(),
      'OCR Notes': 'Document metadata extracted. Quality matches digital standard, valid for scheme submission.'
    },
    confidence: 88
  };
}
