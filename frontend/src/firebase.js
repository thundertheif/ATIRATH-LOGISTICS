// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ 1. Import Storage

const firebaseConfig = {
  apiKey: "AIzaSyABsw7HBOpdWu-8sBbxLZ-vPMMIiRcRcMs",
  authDomain: "atirath-logistics.firebaseapp.com",
  projectId: "atirath-logistics",
  storageBucket: "atirath-logistics.firebasestorage.app",
  messagingSenderId: "439441863879",
  appId: "1:439441863879:web:42faf068af80e1488a3ae2",
  measurementId: "G-HVMGRRCQJJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Exports
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ 2. Export Storage instance
export default app;