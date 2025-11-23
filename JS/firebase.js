
// Tu configuración de la aplicación web de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAzApqK19HsnUaxwtoPRNGiusVZyAzE92Q",
  authDomain: "terapiavr.firebaseapp.com",
  projectId: "terapiavr",
  storageBucket: "terapiavr.firebasestorage.app",
  messagingSenderId: "781812647028",
  appId: "1:781812647028:web:1344a3055f6df08f703d21"
};

//const app = firebase.initializeApp(firebaseConfig);
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
window.db = firebase.firestore();

// No necesitas 'export' aquí porque este script ya no será un módulo.
