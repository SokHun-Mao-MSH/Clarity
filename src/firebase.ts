import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

// Initialize Firebase from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

// Firestore Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export interface ProjectVersion {
  id: string;
  timestamp: Timestamp;
  code: string;
  prompt: string;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  framework?: string;
  language?: string;
  scope?: string;
  generatedCode?: string;
  userId: string;
  createdAt: Timestamp;
  versions?: ProjectVersion[];
}

// Firestore Helpers
export const projectsCollection = collection(db, 'projects');

export const createProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(projectsCollection, {
      ...project,
      createdAt: serverTimestamp(),
      versions: project.generatedCode ? [{
        id: crypto.randomUUID(),
        timestamp: Timestamp.now(),
        code: project.generatedCode,
        prompt: project.description
      }] : []
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'projects');
  }
};

export const updateProject = async (id: string, project: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => {
  try {
    const docRef = doc(db, 'projects', id);
    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.data() as Project;
    
    const updates: any = { ...project };
    
    if (project.generatedCode && project.generatedCode !== existingData.generatedCode) {
      const newVersion: ProjectVersion = {
        id: crypto.randomUUID(),
        timestamp: Timestamp.now(),
        code: project.generatedCode,
        prompt: project.description || existingData.description
      };
      updates.versions = [...(existingData.versions || []), newVersion];
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
  }
};

export const deleteProject = async (id: string) => {
  try {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
  }
};

export const getUserProjects = (userId: string, callback: (projects: Project[]) => void) => {
  const q = query(
    projectsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'projects');
  });
};
