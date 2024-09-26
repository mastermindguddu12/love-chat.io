import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';

const firebaseConfig = {
  apiKey: "AIzaSyBrcvGYxSokJDNdVbHurV660DAVsOBC1Ic",
  authDomain: "love-chat-d0d63.firebaseapp.com",
  databaseURL: "https://love-chat-d0d63-default-rtdb.firebaseio.com",
  projectId: "love-chat-d0d63",
  storageBucket: "love-chat-d0d63.appspot.com",
  messagingSenderId: "136678490864",
  appId: "1:136678490864:web:dfd927dc43c5118738f835"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            window.location.href = 'chatlist.html';
        })
        .catch((error) => {
            console.error('Login failed:', error);
        });
});
