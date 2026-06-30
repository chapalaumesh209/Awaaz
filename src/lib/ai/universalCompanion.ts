import { dbClient } from '../supabaseClient'; // using supabase Client for DB
import { INQUIRY_SETS } from '../firebase/seedUniversalCompanion';

export interface CompanionKnowledge {
  category: string;
  intent: string;
  query_pattern: string[];
  response_template: string;
}

export interface SuggestedInquiry {
  id: string;
  label: string;
  query: string;
}

export interface ScreenInquirySet {
  title: string;
  inquiries: SuggestedInquiry[];
}

export const fetchSuggestedInquiriesForScreen = async (screenId: string): Promise<ScreenInquirySet | null> => {
  console.log(`Fetching inquiries for screen: ${screenId}`);
  // In a real app we'd fetch from Firestore `suggested_inquiries` collection
  // For now, return from local INQUIRY_SETS fallback
  
  if (INQUIRY_SETS[screenId as keyof typeof INQUIRY_SETS]) {
    return INQUIRY_SETS[screenId as keyof typeof INQUIRY_SETS];
  }
  return null;
};

// Extremely simple mock matcher for demo purposes
// In reality, this would use an embeddings vector search or Dialogflow agent.
export const queryUniversalCompanion = async (query: string): Promise<string> => {
  console.log(`Companion processing query: ${query}`);
  
  // We'll mock a call to an AI endpoint or local search
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('scheme') || lowerQuery.includes('eligible')) {
    return "To find schemes, I need to know a bit about you. Tap 'Update Profile' on the Schemes page so I can ask you a few questions about your age, occupation, and location, and I will match you instantly.";
  }
  if (lowerQuery.includes('aadhaar')) {
    return "To get or update an Aadhaar card, visit your nearest Aadhaar Enrollment Centre or Common Service Centre (CSC). You will need Proof of Identity (like a PAN card) and Proof of Address (like a ration card).";
  }
  if (lowerQuery.includes('volunteer')) {
    return "If you need an escort to a government office or help filling out physical forms, go to the Citizen Dashboard and tap 'Request Volunteer'. A verified local NGO worker will be assigned to you.";
  }
  if (lowerQuery.includes('bribe') || lowerQuery.includes('corruption')) {
    return "It is illegal for officials to ask for bribes. You can record a voice complaint in the 'Civic Voice' section of AWAAZ. We will route it to the state Anti-Corruption Bureau anonymously.";
  }
  
  return "I'm still learning about that topic. You can check the Schemes tab or the Report section for more information on government services.";
};
