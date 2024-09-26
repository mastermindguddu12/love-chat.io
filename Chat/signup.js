import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDSZ9h2VJgbZ3kJKI3O-oi77V7v3lBMTPI",
    authDomain: "chat-97a1f.firebaseapp.com",
    projectId: "chat-97a1f",
    storageBucket: "chat-97a1f.appspot.com",
    messagingSenderId: "1018335600385",
    appId: "1:1018335600385:web:486d93c117052289144500"
  };


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const profileImage = document.getElementById('profile-image').files[0];

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Upload profile image
        if (profileImage) {
            const storageRef = ref(storage, `profile_images/${user.uid}`);
            await uploadBytes(storageRef, profileImage);
            const profileImageUrl = await getDownloadURL(storageRef);

            // Update user profile with display name and profile picture
            await updateProfile(user, { displayName: username, photoURL: profileImageUrl });

            // Save user info in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                username: username,
                dpUrl: profileImageUrl
            });
        }

        window.location.href = 'chatlist.html';
    } catch (error) {
        console.error('Signup failed:', error);
    }
});
