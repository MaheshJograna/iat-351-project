// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyCHo78vhLtaDs_elNo5Urgkn8NIWdnlWns",
  authDomain: "iat-351-project.firebaseapp.com",
  projectId: "iat-351-project",
  storageBucket: "iat-351-project.firebasestorage.app",
  messagingSenderId: "1072484129170",
  appId: "1:1072484129170:web:8eb656fdb305e4c5bf494b"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
}); 
const db = getFirestore(app);

export { app, auth, db };