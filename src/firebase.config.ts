// IMPORTANT: Replace this with your actual Firebase project configuration
// FIX: Use Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD3fFi5nlsvBI0D39g5SO7QHfUExyI1hA0",
    authDomain: "gen-lang-client-0476798024.firebaseapp.com",
    projectId: "gen-lang-client-0476798024",
    storageBucket: "gen-lang-client-0476798024.firebasestorage.app",
    messagingSenderId: "1008715947367",
    appId: "1:1008715947367:web:e3eaf08140d8992149e3c2",
    measurementId: "G-BGNFNLP3EP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export instances of Firebase services
export const db = firebase.firestore();
export const auth = firebase.auth();
