import {
  UserProfile,
  CitizenProfile,
  Scheme,
  UserDocument,
  ApplicationRequest,
  VolunteerCase,
  IncidentReport,
  GramSabhaMeeting,
  DocumentCamp,
  FeedbackRecord,
  LanguageCode
} from '../types';

import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

// =========================================================================
// API CLIENT INTEGRATED WITH GOOGLE FIREBASE/FIRESTORE BACKEND
// =========================================================================

class FullStackClient {
  private localProfiles: Record<string, CitizenProfile> = {};
  private localDocs: UserDocument[] = [];
  private localRequests: ApplicationRequest[] = [];
  private localCases: VolunteerCase[] = [];
  private localReports: IncidentReport[] = [];
  private localMeetings: GramSabhaMeeting[] = [];
  private localCamps: DocumentCamp[] = [];
  private localFeedbacks: FeedbackRecord[] = [];
  
  private activeUser: UserProfile = {
    id: 'user-default',
    name: '',
    selectedLanguage: 'en',
    consentGiven: false,
    role: 'citizen',
    createdAt: new Date().toISOString()
  };

  constructor() {
    this.initializeInMemoryFallbacks();
    this.initializeAuthListener();
  }

  // Set up Firebase Auth real-time sync
  private initializeAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Authenticated user found
        const updatedUser: UserProfile = {
          ...this.activeUser,
          id: user.uid,
          name: user.displayName || this.activeUser.name || 'Citizen Verified',
          consentGiven: this.activeUser.consentGiven || true
        };
        this.activeUser = updatedUser;
        localStorage.setItem('haqsetu_user_profile', JSON.stringify(this.activeUser));
        
        // Sync core profile to Firestore
        await this.syncUserProfileToFirestore(updatedUser);
      } else {
        // Automatically sign in anonymously to satisfy security rules constraints
        signInAnonymously(auth).catch((err) => {
          console.warn("Anonymous registration skipped or failed:", err);
        });
      }
    });
  }

  private async syncUserProfileToFirestore(user: UserProfile) {
    try {
      const docRef = doc(db, 'users', user.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          id: user.id,
          name: user.name || 'Citizen',
          selectedLanguage: user.selectedLanguage,
          consentGiven: user.consentGiven,
          role: user.role,
          createdAt: user.createdAt || new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("User settings profile synchronization deferred:", e);
    }
  }

  // Active User Configuration
  getActiveUser(): UserProfile {
    const saved = localStorage.getItem('haqsetu_user_profile');
    if (saved) {
      try {
        this.activeUser = JSON.parse(saved);
      } catch (e) {}
    }
    return this.activeUser;
  }

  setActiveUser(user: Partial<UserProfile>) {
    this.activeUser = { ...this.activeUser, ...user };
    localStorage.setItem('haqsetu_user_profile', JSON.stringify(this.activeUser));
    
    // Sync to Firestore if signed in
    if (auth.currentUser) {
      this.syncUserProfileToFirestore(this.activeUser);
    }
  }

  // Google Login Integration
  async signInWithGoogle(): Promise<UserProfile> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const updatedUser: UserProfile = {
        id: user.uid,
        name: user.displayName || 'Citizen',
        selectedLanguage: this.activeUser.selectedLanguage,
        consentGiven: true,
        role: this.activeUser.role,
        createdAt: new Date().toISOString()
      };
      this.activeUser = updatedUser;
      localStorage.setItem('haqsetu_user_profile', JSON.stringify(this.activeUser));
      
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      return updatedUser;
    } catch (e) {
      console.error("Google Authentication failed:", e);
      throw e;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      localStorage.removeItem('haqsetu_user_profile');
      this.activeUser = {
        id: 'user-default',
        name: '',
        selectedLanguage: 'en',
        consentGiven: false,
        role: 'citizen',
        createdAt: new Date().toISOString()
      };
    } catch (e) {
      console.error("Authentication sign-out failed:", e);
    }
  }

  // Profile Management with Firestore
  async getProfile(): Promise<CitizenProfile | null> {
    const user = this.getActiveUser();
    try {
      const docRef = doc(db, 'profiles', user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CitizenProfile;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `profiles/${user.id}`);
    }
    return this.localProfiles[user.id] || null;
  }

  async saveProfile(profile: Omit<CitizenProfile, 'id' | 'createdAt'>): Promise<CitizenProfile> {
    const user = this.getActiveUser();
    const payload: CitizenProfile = {
      ...profile,
      id: user.id,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'profiles', user.id);
      await setDoc(docRef, payload);
      
      // Also update the active user's visual identity name
      this.setActiveUser({ name: profile.name });
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `profiles/${user.id}`);
    }

    this.localProfiles[user.id] = payload;
    return payload;
  }

  // Scanned Certificates & ID Proofs with Firestore
  async getDocuments(): Promise<UserDocument[]> {
    const user = this.getActiveUser();
    try {
      const q = query(collection(db, 'documents'), where('userId', '==', user.id));
      const querySnapshot = await getDocs(q);
      const docs: UserDocument[] = [];
      querySnapshot.forEach((doc) => {
        docs.push(doc.data() as UserDocument);
      });
      return docs;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'documents');
    }
    return this.localDocs.filter(d => d.userId === user.id);
  }

  async saveDocument(userDoc: Omit<UserDocument, 'id' | 'userId'>): Promise<UserDocument> {
    const user = this.getActiveUser();
    const docId = 'doc-' + Math.floor(100000 + Math.random() * 900000);
    const payload: UserDocument = {
      ...userDoc,
      id: docId,
      userId: user.id,
      uploadedAt: new Date().toISOString()
    } as UserDocument;

    try {
      await setDoc(doc(db, 'documents', docId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `documents/${docId}`);
    }

    this.localDocs.push(payload);
    return payload;
  }

  async updateDocumentStatus(docId: string, status: UserDocument['status']): Promise<void> {
    try {
      const docRef = doc(db, 'documents', docId);
      await updateDoc(docRef, { status });
      return;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `documents/${docId}`);
    }
    const idx = this.localDocs.findIndex(d => d.id === docId);
    if (idx !== -1) {
      this.localDocs[idx].status = status;
    }
  }

  // Application Tracking Requests with Firestore
  async getRequests(): Promise<ApplicationRequest[]> {
    const user = this.getActiveUser();
    try {
      const q = query(collection(db, 'requests'), where('userId', '==', user.id));
      const querySnapshot = await getDocs(q);
      const reqs: ApplicationRequest[] = [];
      querySnapshot.forEach((doc) => {
        reqs.push(doc.data() as ApplicationRequest);
      });
      return reqs;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'requests');
    }
    return this.localRequests.filter(r => r.userId === user.id || r.citizenName === user.name);
  }

  async submitRequest(request: Omit<ApplicationRequest, 'id' | 'userId' | 'submittedAt' | 'status' | 'trackingId' | 'updates'>): Promise<ApplicationRequest> {
    const user = this.getActiveUser();
    const trackingId = 'HS-' + Math.floor(100000 + Math.random() * 900000);
    const requestId = 'req-' + Math.floor(100000 + Math.random() * 900000);
    const payload: ApplicationRequest = {
      ...request,
      id: requestId,
      userId: user.id,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      trackingId,
      updates: [
        {
          date: new Date().toLocaleDateString(),
          status: 'Submitted',
          comment: `Application submitted successfully via HaqSetu Gateway.`
        }
      ]
    } as ApplicationRequest;

    try {
      await setDoc(doc(db, 'requests', requestId), payload);

      // Auto-create volunteer case if it is a volunteer request or if urgent safety
      if (request.itemType === 'volunteer_support' || request.itemType === 'grievance') {
        await this.createVolunteerCase({
          requestId: payload.id,
          citizenName: payload.citizenName,
          primaryLanguage: user.selectedLanguage,
          category: request.itemType === 'grievance' ? 'legal_aid' : 'scheme_help',
          priority: request.itemType === 'grievance' ? 'high' : 'medium',
          notes: `Citizen requested urgent hands-on assistance regarding: "${request.itemName}"`
        });
      }
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `requests/${requestId}`);
    }

    this.localRequests.push(payload);
    return payload;
  }

  // Active Volunteer Caseworks with Firestore
  async createVolunteerCase(volCase: Omit<VolunteerCase, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'chatHistory'>): Promise<VolunteerCase> {
    const caseId = 'case-' + Math.floor(100000 + Math.random() * 900000);
    const payload: VolunteerCase = {
      ...volCase,
      id: caseId,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatHistory: [
        {
          sender: 'ai',
          text: `HaqSetu Volunteer Assist initiated. I am analyzing the case requirements based on the user's submitted documents and eligibility scores.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    } as VolunteerCase;

    try {
      await setDoc(doc(db, 'cases', caseId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `cases/${caseId}`);
    }

    this.localCases.push(payload);
    return payload;
  }

  async getVolunteerCases(): Promise<VolunteerCase[]> {
    try {
      const q = query(collection(db, 'cases'));
      const querySnapshot = await getDocs(q);
      const cases: VolunteerCase[] = [];
      querySnapshot.forEach((doc) => {
        cases.push(doc.data() as VolunteerCase);
      });
      return cases;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'cases');
    }
    return this.localCases;
  }

  async updateCase(caseId: string, updates: Partial<VolunteerCase>): Promise<VolunteerCase> {
    try {
      const docRef = doc(db, 'cases', caseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const updated = { 
          ...docSnap.data(), 
          ...updates, 
          updatedAt: new Date().toISOString() 
        } as VolunteerCase;
        await setDoc(docRef, updated);
        return updated;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `cases/${caseId}`);
    }

    const idx = this.localCases.findIndex(c => c.id === caseId);
    if (idx !== -1) {
      this.localCases[idx] = { ...this.localCases[idx], ...updates, updatedAt: new Date().toISOString() };
      return this.localCases[idx];
    }
    throw new Error("Case not found");
  }

  // Grievances & Security Incidents with Firestore
  async submitIncidentReport(report: Omit<IncidentReport, 'id' | 'userId' | 'submittedAt' | 'status' | 'anonymousId'>): Promise<IncidentReport> {
    const user = this.getActiveUser();
    const anonId = report.isAnonymous ? 'ANON-' + Math.floor(100000 + Math.random() * 900000) : undefined;
    const reportId = 'rep-' + Math.floor(100000 + Math.random() * 900000);
    const payload: IncidentReport = {
      ...report,
      id: reportId,
      userId: user.id,
      anonymousId: anonId,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    } as IncidentReport;

    try {
      await setDoc(doc(db, 'reports', reportId), payload);
      
      // Auto log request tracker item
      await this.submitRequest({
        citizenName: report.isAnonymous ? 'Anonymous' : user.name,
        itemType: 'grievance',
        itemId: payload.id,
        itemName: `Secure Grievance: ${report.title}`
      });

      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `reports/${reportId}`);
    }

    this.localReports.push(payload);
    return payload;
  }

  async getIncidentReports(): Promise<IncidentReport[]> {
    try {
      const q = query(collection(db, 'reports'));
      const querySnapshot = await getDocs(q);
      const reports: IncidentReport[] = [];
      querySnapshot.forEach((doc) => {
        reports.push(doc.data() as IncidentReport);
      });
      return reports;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'reports');
    }
    return this.localReports;
  }

  // Gram Sabhas & Scheduled Camps with Firestore Lookups
  async getGramSabhaMeetings(): Promise<GramSabhaMeeting[]> {
    try {
      const q = query(collection(db, 'meetings'));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const meetings: GramSabhaMeeting[] = [];
        querySnapshot.forEach((doc) => {
          meetings.push(doc.data() as GramSabhaMeeting);
        });
        return meetings;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'meetings');
    }
    return this.localMeetings;
  }

  async getDocumentCamps(): Promise<DocumentCamp[]> {
    try {
      const q = query(collection(db, 'camps'));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const camps: DocumentCamp[] = [];
        querySnapshot.forEach((doc) => {
          camps.push(doc.data() as DocumentCamp);
        });
        return camps;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'camps');
    }
    return this.localCamps;
  }

  // Welfare Schemes Database
  private localSchemes: Scheme[] = [];

  async getSchemes(): Promise<Scheme[]> {
    try {
      const q = query(collection(db, 'schemes'));
      const querySnapshot = await getDocs(q);
      const customSchemes: Scheme[] = [];
      querySnapshot.forEach((doc) => {
        customSchemes.push(doc.data() as Scheme);
      });
      const defaultSchemes = (await import('../data/schemes')).SCHEMES;
      return [...customSchemes, ...defaultSchemes];
    } catch (e) {}
    return this.localSchemes.length > 0 ? this.localSchemes : (await import('../data/schemes')).SCHEMES;
  }

  async saveScheme(scheme: Omit<Scheme, 'id'>): Promise<Scheme> {
    const schemeId = 'scheme-custom-' + Math.floor(1000 + Math.random() * 9000);
    const payload: Scheme = {
      ...scheme,
      id: schemeId
    } as Scheme;

    try {
      await setDoc(doc(db, 'schemes', schemeId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `schemes/${schemeId}`);
    }

    this.localSchemes = [payload, ...this.localSchemes];
    return payload;
  }

  async deleteScheme(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'schemes', id));
      return;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `schemes/${id}`);
    }
    this.localSchemes = this.localSchemes.filter(s => s.id !== id);
  }

  // User Feedbacks with Firestore
  async submitFeedback(feedback: Omit<FeedbackRecord, 'id' | 'userId' | 'createdAt'>): Promise<FeedbackRecord> {
    const user = this.getActiveUser();
    const feedbackId = 'fb-' + Math.floor(100000 + Math.random() * 900000);
    const payload: FeedbackRecord = {
      ...feedback,
      id: feedbackId,
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'feedback', feedbackId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `feedback/${feedbackId}`);
    }

    this.localFeedbacks.push(payload);
    return payload;
  }

  // Seeding the Client's Local Memory with Real Demo Personas & States
  private initializeInMemoryFallbacks() {
    this.localProfiles['user-default'] = {
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
    };

    this.localDocs = [];
    this.localRequests = [];
    this.localCases = [];

    this.localMeetings = [
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

    this.localCamps = [
      {
        id: 'camp-1',
        title: "Moinabad Civic Mega Document Enrollment & Identity Camp",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        location: "Panchayat High School Ground, Moinabad",
        officers: "District Tahsildar, UIDAI Enrollment Officers, Bank Correspondents",
        schemesTargeted: "Aadhaar updates, Income Certificate on-spot issuances, PM SVANidhi applications"
      }
    ];
  }
}

export const dbClient = new FullStackClient();
export default dbClient;
