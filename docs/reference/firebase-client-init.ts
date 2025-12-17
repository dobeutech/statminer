// src/lib/firebase/firebase-client.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

// Functions
export const functions = getFunctions(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Analytics (client-side only)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;

// src/lib/firebase/firestore-service.ts

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase-client';
import { 
  ChatMessage, 
  Dataset, 
  Citation, 
  UserSession,
  APIKey 
} from '@/types';

export class FirestoreService {
  // User Management
  async createUser(userId: string, userData: any) {
    return setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async getUser(userId: string) {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  // Session Management
  async createSession(session: UserSession) {
    return setDoc(doc(db, 'sessions', session.id), {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async getUserSessions(userId: string, limitCount = 10) {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateSession(sessionId: string, messages: ChatMessage[]) {
    return updateDoc(doc(db, 'sessions', sessionId), {
      messages,
      updatedAt: serverTimestamp(),
    });
  }

  // API Key Management (encrypted)
  async saveApiKeys(userId: string, apiKeys: Record<string, string>) {
    // In production, encrypt these keys before storing
    return setDoc(doc(db, 'apiKeys', userId), {
      keys: apiKeys,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  async getApiKeys(userId: string): Promise<Record<string, string>> {
    const docRef = doc(db, 'apiKeys', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().keys : {};
  }

  // Dataset Management
  async createDataset(dataset: Dataset) {
    return setDoc(doc(db, 'datasets', dataset.id), {
      ...dataset,
      metadata: {
        ...dataset.metadata,
        created: serverTimestamp(),
        updated: serverTimestamp(),
      }
    });
  }

  async getDataset(datasetId: string): Promise<Dataset | null> {
    const docRef = doc(db, 'datasets', datasetId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      ...data,
      metadata: {
        ...data.metadata,
        created: data.metadata.created.toDate(),
        updated: data.metadata.updated.toDate(),
      }
    } as Dataset;
  }

  async getUserDatasets(userId: string) {
    const q = query(
      collection(db, 'datasets'),
      where('ownerId', '==', userId),
      orderBy('metadata.updated', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async deleteDataset(datasetId: string) {
    return deleteDoc(doc(db, 'datasets', datasetId));
  }

  // Citation Management
  async saveCitation(citation: Citation) {
    return setDoc(doc(db, 'citations', citation.id), {
      ...citation,
      accessDate: Timestamp.fromDate(citation.accessDate),
      createdAt: serverTimestamp(),
    });
  }

  async getUserCitations(userId: string, limitCount = 50) {
    const q = query(
      collection(db, 'citations'),
      where('userId', '==', userId),
      orderBy('accessDate', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        accessDate: data.accessDate.toDate(),
        id: doc.id,
      } as Citation;
    });
  }

  // Database Configurations (cached)
  async getDatabaseConfigs() {
    const querySnapshot = await getDocs(collection(db, 'databaseConfigs'));
    return querySnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data();
      return acc;
    }, {} as Record<string, any>);
  }
}

export const firestoreService = new FirestoreService();

// src/lib/firebase/auth-service.ts

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase-client';
import { firestoreService } from './firestore-service';

export class AuthService {
  // Sign in with Google
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await this.handleUserLogin(result.user);
      return result.user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  // Sign in with GitHub
  async signInWithGitHub() {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      await this.handleUserLogin(result.user);
      return result.user;
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      throw error;
    }
  }

  // Sign in with email/password
  async signInWithEmail(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await this.handleUserLogin(result.user);
      return result.user;
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }

  // Sign up with email/password
  async signUpWithEmail(email: string, password: string, displayName?: string) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Create user profile in Firestore
      await firestoreService.createUser(user.uid, {
        email: user.email,
        displayName: displayName || user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(),
      });
      
      return user;
    } catch (error) {
      console.error('Sign-up error:', error);
      throw error;
    }
  }

  // Handle user login (create/update profile)
  private async handleUserLogin(user: User) {
    const existingUser = await firestoreService.getUser(user.uid);
    
    if (!existingUser) {
      await firestoreService.createUser(user.uid, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  // Auth state observer
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }
}

export const authService = new AuthService();