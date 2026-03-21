import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB0dyO6negVltbdWagLSKhqXfHz-X6T0Ko",
  authDomain: "neon-tetris99.firebaseapp.com",
  databaseURL: "https://neon-tetris99-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "neon-tetris99",
  storageBucket: "neon-tetris99.firebasestorage.app",
  messagingSenderId: "337385210485",
  appId: "1:337385210485:web:cc766aa633f48480a12e3c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
