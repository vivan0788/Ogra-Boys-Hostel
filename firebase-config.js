import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Apne Firebase Console se credentials yahan enter karein:
const firebaseConfig = {
  apiKey: "AIzaSyAcYk-65XBGLocXpaUdptUezZtKeVrDRVg",
  authDomain: "bit-class-hub.firebaseapp.com",
  projectId: "bit-class-hub",
  storageBucket: "bit-class-hub.firebasestorage.app",
  messagingSenderId: "878096723759",
  appId: "1:878096723759:web:af8687819aefc9edad7bda"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, setDoc, getDocs, updateDoc, onSnapshot, query, orderBy };
