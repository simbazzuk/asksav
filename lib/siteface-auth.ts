import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type SiteFacePlan = "FREE" | "VIC_PLUS" | "VIC_PRO";

export type SiteFaceEntitlements = {
  monthlyAnalyses: number | "FAIR_USE";
  savedItems: number | "UNLIMITED";
  fullMarketEvidence: boolean;
  valueHistory: boolean;
  valueAlerts: boolean;
  sellingTools: "NONE" | "LIMITED" | "FULL";
};

export type SiteFaceUserRecord = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: SiteFacePlan;
  entitlements: SiteFaceEntitlements;
  analysisCount: number;
};

export const PLAN_ENTITLEMENTS: Record<SiteFacePlan, SiteFaceEntitlements> = {
  FREE: {
    monthlyAnalyses: 5,
    savedItems: 5,
    fullMarketEvidence: false,
    valueHistory: false,
    valueAlerts: false,
    sellingTools: "NONE",
  },
  VIC_PLUS: {
    monthlyAnalyses: 50,
    savedItems: 100,
    fullMarketEvidence: true,
    valueHistory: true,
    valueAlerts: false,
    sellingTools: "LIMITED",
  },
  VIC_PRO: {
    monthlyAnalyses: "FAIR_USE",
    savedItems: "UNLIMITED",
    fullMarketEvidence: true,
    valueHistory: true,
    valueAlerts: true,
    sellingTools: "FULL",
  },
};

function requiredConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

export function firebaseConfigured() {
  const config = requiredConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getSiteFaceFirebaseApp() {
  if (!firebaseConfigured()) {
    throw new Error(
      "Firebase authentication is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local."
    );
  }
  return getApps().length ? getApp() : initializeApp(requiredConfig());
}

export function getSiteFaceAuth() {
  return getAuth(getSiteFaceFirebaseApp());
}

export function getSiteFaceDb() {
  return getFirestore(getSiteFaceFirebaseApp());
}

export async function ensureSiteFaceUserRecord(user: User) {
  const db = getSiteFaceDb();
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      plan: "FREE",
      entitlements: PLAN_ENTITLEMENTS.FREE,
      analysisCount: 0,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    lastLoginAt: serverTimestamp(),
  });
}

export async function getSiteFaceUserRecord(user: User): Promise<SiteFaceUserRecord> {
  await ensureSiteFaceUserRecord(user);
  const snapshot = await getDoc(doc(getSiteFaceDb(), "users", user.uid));
  const data = snapshot.data() || {};

  const plan = (data.plan || "FREE") as SiteFacePlan;
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    plan,
    entitlements: (data.entitlements || PLAN_ENTITLEMENTS[plan]) as SiteFaceEntitlements,
    analysisCount: Number(data.analysisCount || 0),
  };
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getSiteFaceAuth(), provider);
  await ensureSiteFaceUserRecord(credential.user);
  return credential.user;
}

export async function registerWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(getSiteFaceAuth(), email, password);
  await ensureSiteFaceUserRecord(credential.user);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getSiteFaceAuth(), email, password);
  await ensureSiteFaceUserRecord(credential.user);
  return credential.user;
}

export async function logoutSiteFace() {
  await signOut(getSiteFaceAuth());
}

export { onAuthStateChanged };
