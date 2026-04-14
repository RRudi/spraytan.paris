import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAEK1NeUrS-4VXtYSGcWMOxbpg64n3DIuk",
  authDomain: "spraytan-c3749.firebaseapp.com",
  projectId: "spraytan-c3749",
  messagingSenderId: "565380712828",
  appId: "1:565380712828:web:c255c8c6b1777ebaef3cf9",
  measurementId: "G-NY4R77THN5"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
