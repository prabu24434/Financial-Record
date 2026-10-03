// Firebase SDK v10 Modular via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// GANTI KONFIGURASI DI BAWAH INI DENGAN DATA DARI FIREBASE CONSOLE KAMU
const firebaseConfig = {
  apiKey: "AIzaSyAmq0gvNLqOnns10hUxN-kI91PcG_NhvJY",
  authDomain: "financial-record-f5430.firebaseapp.com",
  projectId: "financial-record-f5430",
  storageBucket: "financial-record-f5430.firebasestorage.app",
  messagingSenderId: "384514075974",
  appId: "1:384514075974:web:740e1c719d34458719c947"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
};
