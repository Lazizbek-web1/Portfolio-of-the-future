// Contact form backend: each message becomes a document in the Firestore "messages" collection.
// firestore.rules only allows creating well-formed messages; read them in the Firebase console.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore-lite.js';

// Web config is public by design; access is controlled by firestore.rules.
const app = initializeApp({
  apiKey: 'AIzaSyCDYUf2yRok-jHgPeRgjyHC_Gxh_BXjEyk',
  authDomain: 'laziz-portfolio.firebaseapp.com',
  projectId: 'laziz-portfolio',
  storageBucket: 'laziz-portfolio.firebasestorage.app',
  messagingSenderId: '474318586254',
  appId: '1:474318586254:web:ab668c9429cbbc16e2e4df',
});
const db = getFirestore(app);

export function sendMessage({ name, email, message }) {
  return addDoc(collection(db, 'messages'), {
    name: name.trim().slice(0, 80),
    email: email.trim().slice(0, 120),
    message: message.trim().slice(0, 3000),
    page: location.href.slice(0, 200),
    createdAt: serverTimestamp(),
  });
}
