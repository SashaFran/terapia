// src/firebase/firebase.tsx
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzApqK19HsnUaxwtoPRNGiusVZyAzE92Q",
  authDomain: "terapiavr.firebaseapp.com",
  projectId: "terapiavr",
  storageBucket: "terapiavr.firebasestorage.app",
  messagingSenderId: "781812647028",
  appId: "1:781812647028:web:1344a3055f6df08f703d21"
};

const app = initializeApp(firebaseConfig);

// Asegúrate de que digan "export const"
export const auth = getAuth(app);
export const db = getFirestore(app);
