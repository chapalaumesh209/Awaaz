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
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
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
  where,
  onSnapshot
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
  
  // Translation batch queue to prevent 429 rate limit exceptions on simultaneous requests
  private translationQueue: Array<{
    text: string;
    targetLanguageCode: LanguageCode;
    resolve: (value: string) => void;
    reject: (reason?: any) => void;
  }> = [];
  private translationTimeout: any = null;
  
  private activeUser: UserProfile = {
    id: 'user-default',
    name: '',
    selectedLanguage: 'en',
    consentGiven: false,
    role: 'citizen',
    createdAt: new Date().toISOString()
  };

  private sanitizeUserProfile(user: UserProfile): any {
    return {
      id: user.id || 'unknown',
      name: user.name || 'Citizen',
      selectedLanguage: user.selectedLanguage || 'en',
      consentGiven: user.consentGiven !== undefined ? user.consentGiven : true,
      role: user.role || 'citizen',
      createdAt: user.createdAt || new Date().toISOString()
    };
  }

  constructor() {
    this.initializeInMemoryFallbacks();
    this.initializeAuthListener();
  }

  // Set up Firebase Auth real-time sync
  private initializeAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.isAnonymous) {
          return;
        }
        let name = user.displayName || 'Citizen';
        let role: 'citizen' | 'volunteer' | 'admin' = 'citizen';
        let selectedLanguage: LanguageCode = 'en';
        let consentGiven = true;
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) name = data.name;
            if (data.role) role = data.role;
            if (data.selectedLanguage) selectedLanguage = data.selectedLanguage;
            if (data.consentGiven !== undefined) consentGiven = data.consentGiven;
          }
        } catch (e) {
          console.warn("Could not retrieve user info from Firestore on auth change:", e);
        }

        const updatedUser: UserProfile = {
          id: user.uid,
          name,
          selectedLanguage,
          consentGiven,
          role,
          createdAt: user.metadata.creationTime || new Date().toISOString()
        };
        this.activeUser = updatedUser;
        localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
      } else {
        // Automatically sign in anonymously to satisfy security rules constraints
        signInAnonymously(auth).catch((err) => {
          console.log("Anonymous authentication is disabled or restricted in this environment (optional feature):", err.message || err);
        });
      }
    });
  }

  private async syncUserProfileToFirestore(user: UserProfile) {
    try {
      const docRef = doc(db, 'users', user.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, this.sanitizeUserProfile(user));
      }
    } catch (e) {
      console.warn("User settings profile synchronization deferred:", e);
    }
  }

  // Active User Configuration
  getActiveUser(): UserProfile {
    const saved = localStorage.getItem('awaaz_user_profile');
    if (saved) {
      try {
        this.activeUser = JSON.parse(saved);
      } catch (e) {}
    }
    return this.activeUser;
  }

  setActiveUser(user: Partial<UserProfile>) {
    this.activeUser = { ...this.activeUser, ...user };
    localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
    
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
        selectedLanguage: this.activeUser.selectedLanguage || 'en',
        consentGiven: true,
        role: 'citizen',
        createdAt: user.metadata.creationTime || new Date().toISOString()
      };
      this.activeUser = updatedUser;
      localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
      
      try {
        await setDoc(doc(db, 'users', user.uid), this.sanitizeUserProfile(updatedUser));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
      }
      return updatedUser;
    } catch (e) {
      console.error("Google Authentication failed:", e);
      throw e;
    }
  }

  // Real Email Signup for Citizens
  async signUpWithEmail(email: string, password: string, name: string): Promise<UserProfile> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      await updateProfile(user, { displayName: name });
      
      const updatedUser: UserProfile = {
        id: user.uid,
        name: name,
        selectedLanguage: this.activeUser.selectedLanguage || 'en',
        consentGiven: true,
        role: 'citizen',
        createdAt: user.metadata.creationTime || new Date().toISOString()
      };
      
      this.activeUser = updatedUser;
      localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
      
      try {
        await setDoc(doc(db, 'users', user.uid), this.sanitizeUserProfile(updatedUser));
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
      }
      return updatedUser;
    } catch (e) {
      console.error("Email signup failed:", e);
      throw e;
    }
  }

  // Real Email Sign-in for Citizens
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      let name = user.displayName || 'Citizen';
      let role: 'citizen' | 'volunteer' | 'admin' = 'citizen';
      let selectedLanguage: LanguageCode = 'en';
      let consentGiven = true;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) name = data.name;
          if (data.role) role = data.role;
          if (data.selectedLanguage) selectedLanguage = data.selectedLanguage;
          if (data.consentGiven !== undefined) consentGiven = data.consentGiven;
        }
      } catch (e) {
        console.warn("Could not retrieve user info from Firestore on login:", e);
      }

      const updatedUser: UserProfile = {
        id: user.uid,
        name,
        selectedLanguage,
        consentGiven,
        role,
        createdAt: user.metadata.creationTime || new Date().toISOString()
      };
      
      this.activeUser = updatedUser;
      localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
      return updatedUser;
    } catch (e) {
      console.error("Email sign-in failed:", e);
      throw e;
    }
  }

  // Dummy Login for Volunteer
  async signInAsVolunteer(email: string, password: string): Promise<UserProfile> {
    if (email === 'volunteer@awaaz.org' && password === 'volunteer123') {
      const updatedUser: UserProfile = {
        id: 'volunteer-default',
        name: 'Panchayat Volunteer',
        selectedLanguage: this.activeUser.selectedLanguage,
        consentGiven: true,
        role: 'volunteer',
        createdAt: new Date().toISOString()
      };
      this.activeUser = updatedUser;
      localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
      return updatedUser;
    } else {
      throw new Error("Invalid Volunteer credentials! Use: volunteer@awaaz.org / volunteer123");
    }
  }

  // Dummy Login for Admin
  async signInAsAdmin(email: string, password: string): Promise<UserProfile> {
    if (email === 'admin@awaaz.org' && password === 'admin123') {
      const updatedUser: UserProfile = {
        id: 'admin-default',
        name: 'Panchayat Administrator',
        selectedLanguage: this.activeUser.selectedLanguage,
        consentGiven: true,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      this.activeUser = updatedUser;
      localStorage.setItem('awaaz_user_profile', JSON.stringify(this.activeUser));
      return updatedUser;
    } else {
      throw new Error("Invalid Admin credentials! Use: admin@awaaz.org / admin123");
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      localStorage.removeItem('awaaz_user_profile');
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
    if (user.id === 'user-default' || !auth.currentUser) {
      return this.localProfiles[user.id] || null;
    }
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

    if (user.id === 'user-default' || !auth.currentUser) {
      this.localProfiles[user.id] = payload;
      this.setActiveUser({ name: profile.name });
      return payload;
    }

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

  // -------------------------------------------------------------
  // Recordless & Migrant Worker Support (Slots & Evidence Wallet)
  // -------------------------------------------------------------
  private localSlots: any[] = [];
  private localEvidence: any[] = [];

  async getBookedSlots(): Promise<any[]> {
    const user = this.getActiveUser();
    if (user.id === 'user-default' || !auth.currentUser) {
      return this.localSlots;
    }
    try {
      const q = query(collection(db, 'slots'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'slots');
    }
    return this.localSlots;
  }

  async saveBookedSlot(slot: any): Promise<any> {
    const slotId = 'slot-' + Math.floor(100000 + Math.random() * 900000);
    const payload = {
      ...slot,
      id: slotId,
      createdAt: new Date().toISOString()
    };
    const user = this.getActiveUser();
    if (user.id === 'user-default' || !auth.currentUser) {
      this.localSlots.push(payload);
      return payload;
    }
    try {
      await setDoc(doc(db, 'slots', slotId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `slots/${slotId}`);
    }
    this.localSlots.push(payload);
    return payload;
  }

  async updateBookedSlotStatus(slotId: string, status: string, notes?: string): Promise<void> {
    const user = this.getActiveUser();
    if (user.id === 'user-default' || !auth.currentUser) {
      const slot = this.localSlots.find(s => s.id === slotId);
      if (slot) {
        slot.status = status;
        if (notes) slot.notes = notes;
      }
      return;
    }
    try {
      const docRef = doc(db, 'slots', slotId);
      const updateData: any = { status };
      if (notes) updateData.notes = notes;
      await updateDoc(docRef, updateData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `slots/${slotId}`);
    }
  }

  async getEvidenceBlocks(): Promise<any[]> {
    const user = this.getActiveUser();
    if (user.id === 'user-default' || !auth.currentUser) {
      return this.localEvidence.filter(e => e.userId === user.id);
    }
    try {
      const q = query(collection(db, 'evidence'), where('userId', '==', user.id));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'evidence');
    }
    return this.localEvidence.filter(e => e.userId === user.id);
  }

  async saveEvidenceBlock(evidence: any): Promise<any> {
    const user = this.getActiveUser();
    const evidenceId = 'ev-' + Math.floor(100000 + Math.random() * 900000);
    const payload = {
      ...evidence,
      id: evidenceId,
      userId: user.id,
      createdAt: new Date().toISOString()
    };
    if (user.id === 'user-default' || !auth.currentUser) {
      this.localEvidence.push(payload);
      return payload;
    }
    try {
      await setDoc(doc(db, 'evidence', evidenceId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `evidence/${evidenceId}`);
    }
    this.localEvidence.push(payload);
    return payload;
  }

  // Scanned Certificates & ID Proofs with Firestore
  async getDocuments(): Promise<UserDocument[]> {
    const user = this.getActiveUser();
    if (user.id === 'user-default' || !auth.currentUser) {
      return this.localDocs.filter(d => d.userId === user.id);
    }
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

    if (user.id === 'user-default' || !auth.currentUser) {
      this.localDocs.push(payload);
      return payload;
    }

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
    if (!auth.currentUser) {
      const idx = this.localDocs.findIndex(d => d.id === docId);
      if (idx !== -1) {
        this.localDocs[idx].status = status;
      }
      return;
    }
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
    if (user.id === 'user-default' || !auth.currentUser) {
      return this.localRequests.filter(r => r.userId === user.id || r.citizenName === user.name);
    }
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

  subscribeToRequests(callback: (requests: ApplicationRequest[]) => void): () => void {
    const user = this.getActiveUser();
    if (user.id === 'user-default' || !auth.currentUser) {
      const interval = setInterval(() => {
        callback(this.localRequests.filter(r => r.userId === user.id || r.citizenName === user.name));
      }, 1000);
      return () => clearInterval(interval);
    }

    const q = query(collection(db, 'requests'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: ApplicationRequest[] = [];
      snapshot.forEach((doc) => {
        reqs.push(doc.data() as ApplicationRequest);
      });
      callback(reqs);
    }, (error) => {
      console.error("Error listening to real-time requests:", error);
    });

    return unsubscribe;
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
          comment: `Application submitted successfully via AWAAZ Gateway.`
        }
      ]
    } as ApplicationRequest;

    if (user.id === 'user-default' || !auth.currentUser) {
      this.localRequests.push(payload);
      // Auto-create volunteer case for all requests/applications
      await this.createVolunteerCase({
        requestId: payload.id,
        citizenName: payload.citizenName || user.name || 'Citizen',
        primaryLanguage: user.selectedLanguage,
        category: request.itemType === 'grievance' ? 'legal_aid' : request.itemType === 'scheme' ? 'scheme_help' : 'document_help',
        priority: request.itemType === 'grievance' ? 'high' : 'medium',
        notes: `Citizen submitted request for ${request.itemType === 'scheme' ? 'Scheme approval' : 'Casework support'}: "${request.itemName}"`
      });
      return payload;
    }

    try {
      await setDoc(doc(db, 'requests', requestId), payload);

      // Auto-create volunteer case for all requests/applications
      await this.createVolunteerCase({
        requestId: payload.id,
        citizenName: payload.citizenName || user.name || 'Citizen',
        primaryLanguage: user.selectedLanguage,
        category: request.itemType === 'grievance' ? 'legal_aid' : request.itemType === 'scheme' ? 'scheme_help' : 'document_help',
        priority: request.itemType === 'grievance' ? 'high' : 'medium',
        notes: `Citizen submitted request for ${request.itemType === 'scheme' ? 'Scheme approval' : 'Casework support'}: "${request.itemName}"`
      });
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
          text: `AWAAZ Volunteer Assist initiated. I am analyzing the case requirements based on the user's submitted documents and eligibility scores.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    } as VolunteerCase;

    if (!auth.currentUser) {
      this.localCases.push(payload);
      return payload;
    }

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
    if (!auth.currentUser) {
      return this.localCases;
    }
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
    const applyRequestUpdates = async (currentCase: VolunteerCase) => {
      if (!currentCase.requestId) return;

      if (!auth.currentUser) {
        const reqIdx = this.localRequests.findIndex(r => r.id === currentCase.requestId);
        if (reqIdx !== -1) {
          const currentReq = this.localRequests[reqIdx];
          let newReqStatus = currentReq.status;
          const newReqUpdates = [...(currentReq.updates || [])];

          if (updates.status && updates.status !== currentCase.status) {
            if (updates.status === 'assigned') {
              newReqStatus = 'in_progress';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Assigned',
                comment: `Assigned to Panchayat Volunteer caseworker.`
              });
            } else if (updates.status === 'in_investigation') {
              newReqStatus = 'in_progress';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'In Progress',
                comment: `Caseworker is auditing credentials and eligibility criteria.`
              });
            } else if (updates.status === 'resolved') {
              newReqStatus = 'approved';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Resolved',
                comment: `Case verified and approved! Official benefits cleared for disbursal.`
              });
            } else if (updates.status === 'closed') {
              newReqStatus = 'approved';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Closed',
                comment: `Case completed and closed.`
              });
            }
          }

          if (updates.chatHistory && updates.chatHistory.length > currentCase.chatHistory.length) {
            const lastMsg = updates.chatHistory[updates.chatHistory.length - 1];
            if (lastMsg.sender === 'volunteer') {
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Caseworker Update',
                comment: lastMsg.text
              });
            }
          }

          this.localRequests[reqIdx] = {
            ...currentReq,
            status: newReqStatus,
            updates: newReqUpdates
          };
        }
        return;
      }

      try {
        const reqRef = doc(db, 'requests', currentCase.requestId);
        const reqSnap = await getDoc(reqRef);
        if (reqSnap.exists()) {
          const currentReq = reqSnap.data() as ApplicationRequest;
          let newReqStatus = currentReq.status;
          const newReqUpdates = [...(currentReq.updates || [])];

          if (updates.status && updates.status !== currentCase.status) {
            if (updates.status === 'assigned') {
              newReqStatus = 'in_progress';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Assigned',
                comment: `Assigned to Panchayat Volunteer caseworker.`
              });
            } else if (updates.status === 'in_investigation') {
              newReqStatus = 'in_progress';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'In Progress',
                comment: `Caseworker is auditing credentials and eligibility criteria.`
              });
            } else if (updates.status === 'resolved') {
              newReqStatus = 'approved';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Resolved',
                comment: `Case verified and approved! Official benefits cleared for disbursal.`
              });
            } else if (updates.status === 'closed') {
              newReqStatus = 'approved';
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Closed',
                comment: `Case completed and closed.`
              });
            }
          }

          if (updates.chatHistory && updates.chatHistory.length > currentCase.chatHistory.length) {
            const lastMsg = updates.chatHistory[updates.chatHistory.length - 1];
            if (lastMsg.sender === 'volunteer') {
              newReqUpdates.push({
                date: new Date().toLocaleDateString(),
                status: 'Caseworker Update',
                comment: lastMsg.text
              });
            }
          }

          await updateDoc(reqRef, {
            status: newReqStatus,
            updates: newReqUpdates
          });
        }
      } catch (e) {
        console.warn("Could not sync case updates to corresponding application request in Firestore:", e);
      }
    };

    if (!auth.currentUser) {
      const idx = this.localCases.findIndex(c => c.id === caseId);
      if (idx !== -1) {
        const currentCase = this.localCases[idx];
        await applyRequestUpdates(currentCase);
        this.localCases[idx] = { ...this.localCases[idx], ...updates, updatedAt: new Date().toISOString() };
        return this.localCases[idx];
      }
      throw new Error("Case not found");
    }
    try {
      const docRef = doc(db, 'cases', caseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentCase = docSnap.data() as VolunteerCase;
        await applyRequestUpdates(currentCase);
        const updated = { 
          ...currentCase, 
          ...updates, 
          updatedAt: new Date().toISOString() 
        } as VolunteerCase;
        await setDoc(docRef, updated);
        
        const idx = this.localCases.findIndex(c => c.id === caseId);
        if (idx !== -1) {
          this.localCases[idx] = updated;
        }
        return updated;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `cases/${caseId}`);
    }

    const idx = this.localCases.findIndex(c => c.id === caseId);
    if (idx !== -1) {
      const currentCase = this.localCases[idx];
      await applyRequestUpdates(currentCase);
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

    if (user.id === 'user-default' || !auth.currentUser) {
      // Auto log request tracker item
      await this.submitRequest({
        citizenName: report.isAnonymous ? 'Anonymous' : user.name,
        itemType: 'grievance',
        itemId: payload.id,
        itemName: `Secure Grievance: ${report.title}`
      });

      this.localReports.push(payload);
      return payload;
    }

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
    if (!auth.currentUser) {
      return this.localReports;
    }
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
    if (!auth.currentUser) {
      return this.localMeetings;
    }
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
    if (!auth.currentUser) {
      return this.localCamps;
    }
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
    if (!auth.currentUser) {
      return this.localSchemes.length > 0 ? this.localSchemes : (await import('../data/schemes')).SCHEMES;
    }
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

    if (!auth.currentUser) {
      this.localSchemes = [payload, ...this.localSchemes];
      return payload;
    }

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
    if (!auth.currentUser) {
      this.localSchemes = this.localSchemes.filter(s => s.id !== id);
      return;
    }
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

    if (user.id === 'user-default' || !auth.currentUser) {
      this.localFeedbacks.push(payload);
      return payload;
    }

    try {
      await setDoc(doc(db, 'feedback', feedbackId), payload);
      return payload;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `feedback/${feedbackId}`);
    }

    this.localFeedbacks.push(payload);
    return payload;
  }

  // Real Firestore translation dictionary loading/saving
  async getTranslationsForLanguage(langCode: LanguageCode, defaultTranslations: Record<string, string>): Promise<Record<string, string>> {
    try {
      const docRef = doc(db, 'translations', langCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Record<string, string>;
        // Safely merge with defaults - only override if stored value is non-empty and not equal to key/english unless specified
        const merged = { ...defaultTranslations };
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'string' && val.trim() !== '') {
            merged[key] = val;
          }
        }
        return merged;
      } else {
        // Seed Firestore with localTranslations for this language
        await setDoc(docRef, defaultTranslations);
        return defaultTranslations;
      }
    } catch (e) {
      console.warn(`Firestore getTranslations failed for ${langCode}, using local fallback:`, e);
      return defaultTranslations;
    }
  }

  async saveTranslationsForLanguage(langCode: LanguageCode, translations: Record<string, string>): Promise<void> {
    try {
      const docRef = doc(db, 'translations', langCode);
      await setDoc(docRef, translations, { merge: true });
    } catch (e) {
      console.warn(`Firestore saveTranslations failed for ${langCode}:`, e);
    }
  }

  // Translate dynamically using Gemini API on server, then persist to Firestore!
  // Utilizes a debounced batching mechanism to gather all simultaneous requests and translate them in a single batch.
  async translateTextDynamically(text: string, targetLanguageCode: LanguageCode): Promise<string> {
    if (!text || text.trim() === '' || targetLanguageCode === 'en') {
      return text;
    }

    return new Promise<string>((resolve, reject) => {
      this.translationQueue.push({ text, targetLanguageCode, resolve, reject });
      this.scheduleBatchTranslation();
    });
  }

  private scheduleBatchTranslation() {
    if (this.translationTimeout) {
      clearTimeout(this.translationTimeout);
    }
    this.translationTimeout = setTimeout(() => {
      this.processBatchTranslation();
    }, 150);
  }

  private async processBatchTranslation() {
    const queue = [...this.translationQueue];
    this.translationQueue = [];
    if (queue.length === 0) return;

    // Group items by target language
    const groups: Record<string, typeof queue> = {};
    for (const item of queue) {
      const lang = item.targetLanguageCode;
      if (!groups[lang]) {
        groups[lang] = [];
      }
      groups[lang].push(item);
    }

    for (const [lang, items] of Object.entries(groups)) {
      try {
        // Collect unique texts to translate
        const uniqueTexts = Array.from(new Set(items.map(item => item.text)));

        const response = await fetch('/api/ai/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: uniqueTexts, targetLanguage: lang }),
        });

        if (response.ok) {
          const data = await response.json();
          const translations = data.translations || {};

          // Resolve all promises for this language group with their translations
          for (const item of items) {
            const translated = translations[item.text] || item.text;
            item.resolve(translated);
          }
        } else {
          // If the batch endpoint failed, resolve with original texts
          for (const item of items) {
            item.resolve(item.text);
          }
        }
      } catch (err) {
        console.error(`Batch translation failed for ${lang}:`, err);
        for (const item of items) {
          item.resolve(item.text);
        }
      }
    }
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
