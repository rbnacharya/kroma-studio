// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, onSnapshot } from "firebase/firestore";
import { UserProfile } from "../types";

// TODO: REPLACE WITH YOUR FIREBASE CONFIGURATION
// You can get this from the Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyD-PLACEHOLDER-KEY-FOR-DEMO", 
  authDomain: "kroma-studio.firebaseapp.com",
  projectId: "kroma-studio",
  storageBucket: "kroma-studio.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
// Note: In a real environment, we'd wrap this in a try-catch or ensure config is valid.
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase not configured correctly. Using mock mode for UI demonstration.");
}

export const signInWithGoogle = async () => {
  if (!auth) {
    // MOCK LOGIN FOR DEMO IF FIREBASE IS NOT CONFIGURED
    const mockUser = {
      uid: 'mock-user-' + Date.now(),
      email: 'demo@kromastudio.com',
      displayName: 'Kroma Director',
    };
    localStorage.setItem('kroma_mock_user', JSON.stringify(mockUser));
    return mockUser;
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
};

export const signOut = async () => {
  if (!auth) {
    localStorage.removeItem('kroma_mock_user');
    return;
  }
  await firebaseSignOut(auth);
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  if (!db) {
    // MOCK DATA STREAM
    const initialProfile: UserProfile = {
      uid,
      email: 'demo@kromastudio.com',
      displayName: 'Kroma Director',
      credits: 50, // Starter credits
      plan: 'free'
    };
    callback(initialProfile);
    return () => {};
  }

  const userRef = doc(db, "users", uid);
  
  return onSnapshot(userRef, async (docSnap: any) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      // Create default profile for new user
      const newProfile: UserProfile = {
        uid,
        email: auth.currentUser?.email || null,
        displayName: auth.currentUser?.displayName || null,
        credits: 50, // Free 50 credits on signup
        plan: 'free'
      };
      await setDoc(userRef, newProfile);
      callback(newProfile);
    }
  });
};

export const deductCredits = async (uid: string, amount: number) => {
  if (!db) return true; // Mock mode always succeeds

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  
  if (snap.exists()) {
    const currentCredits = snap.data().credits || 0;
    if (currentCredits >= amount) {
      await updateDoc(userRef, {
        credits: increment(-amount)
      });
      return true;
    }
  }
  return false;
};

export const addCredits = async (uid: string, amount: number) => {
    if (!db) return; // Mock
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        credits: increment(amount)
    });
}