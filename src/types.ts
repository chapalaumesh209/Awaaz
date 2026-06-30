export type LanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or' | 'ur';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  selectedLanguage: LanguageCode;
  consentGiven: boolean;
  role: 'citizen' | 'volunteer' | 'admin';
  createdAt: string;
}

export interface CitizenProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  location: string;
  state: string;
  primaryLanguage: LanguageCode;
  householdIncome: number;
  category: string; // e.g. SC, ST, OBC, General, Minority
  disabilityStatus: boolean;
  disabilityType?: string;
  existingDocuments: string[]; // e.g. ['aadhaar', 'ration_card']
  readinessScore: number;
  createdAt: string;
}

export interface SchemeRule {
  id: string;
  schemeId: string;
  field: string; // 'age', 'income', 'gender', 'state', 'disability', 'category'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_equal' | 'less_than_equal' | 'in' | 'exists';
  value: string; // string representation, e.g. "30" or "female" or "ration_card"
}

export interface Scheme {
  id: string;
  name: string;
  nameLocal?: string;
  description: string;
  descriptionLocal?: string;
  benefits: string;
  benefitsLocal?: string;
  department: string;
  category: string; // e.g. Business, Agriculture, Healthcare, Housing, Scholarship, Pension
  requiredDocuments: string[];
  referenceLink?: string;
  rules: SchemeRule[];
}

export interface EligibilityResult {
  schemeId: string;
  schemeName: string;
  matched: boolean;
  score: number; // 0 to 100
  missingRequirements: string[];
  reasoning: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  name: string;
  type: string; // 'aadhaar' | 'ration_card' | 'income_cert' | 'caste_cert' | 'pan_card' | 'voter_id' | 'disability_cert' | 'bank_passbook'
  status: 'verified' | 'pending' | 'missing' | 'rejected';
  uploadedAt?: string;
  ocrText?: string;
  ocrConfidence?: number;
  notes?: string;
}

export interface TrackingUpdate {
  date: string;
  status: string;
  comment: string;
}

export interface ApplicationRequest {
  id: string;
  userId: string;
  citizenName: string;
  itemType: 'scheme' | 'document' | 'grievance' | 'safety' | 'volunteer_support';
  itemId: string; // scheme ID or document ID or report ID
  itemName: string;
  submittedAt: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  trackingId: string;
  updates: TrackingUpdate[];
}

export interface VolunteerCase {
  id: string;
  requestId: string;
  citizenName: string;
  primaryLanguage: LanguageCode;
  category: string; // 'scheme_help' | 'document_help' | 'legal_aid' | 'safety_support'
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'assigned' | 'in_investigation' | 'resolved' | 'closed';
  assignedTo?: string; // Volunteer ID or name
  createdAt: string;
  updatedAt: string;
  notes: string;
  chatHistory: {
    sender: 'citizen' | 'volunteer' | 'ai';
    text: string;
    timestamp: string;
  }[];
}

export interface IncidentReport {
  id: string;
  userId: string;
  type: 'harassment' | 'discrimination' | 'civic_grievance' | 'scam';
  title: string;
  description: string;
  location: string;
  date: string;
  status: 'submitted' | 'under_review' | 'referred' | 'resolved';
  witnessCount: number;
  evidenceUrls: string[];
  isAnonymous: boolean;
  targetAuthority: string;
  anonymousId?: string;
  submittedAt: string;
}

export interface GramSabhaMeeting {
  id: string;
  title: string;
  date: string;
  location: string;
  agenda: string;
  budgetAllocated: string;
  panchayatName: string;
}

export interface DocumentCamp {
  id: string;
  title: string;
  date: string;
  location: string;
  officers: string;
  schemesTargeted: string;
}

export interface FeedbackRecord {
  id: string;
  userId: string;
  rating: number;
  feedbackText: string;
  module: string;
  createdAt: string;
}
