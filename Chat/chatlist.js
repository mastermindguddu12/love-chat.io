// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, getDocs, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

// Initialize Firebase
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
const db = getFirestore(app);
let currentUser;

// Add Friend Functionality
document.getElementById('add-friend-btn').addEventListener('click', async () => {
    const friendEmail = document.getElementById('friend-email').value.trim();
    if (!friendEmail) {
        document.getElementById('add-friend-status').textContent = "Please enter a valid email.";
        return;
    }

    try {
        // Fetch user by email
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('email', '==', friendEmail));
        const querySnapshot = await getDocs(userQuery);

        if (querySnapshot.empty) {
            document.getElementById('add-friend-status').textContent = "User not found.";
            return;
        } else {
            const friendDoc = querySnapshot.docs[0];
            const friendData = friendDoc.data();
            const friendId = friendDoc.id;

            // Check if chat with this friend exists
            const chatsRef = collection(db, 'chats');
            const chatQuery = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
            const chatSnapshot = await getDocs(chatQuery);

            let chatExists = false;

            chatSnapshot.forEach((doc) => {
                const chatData = doc.data();
                const otherUserId = chatData.participants.find(uid => uid !== currentUser.uid);

                if (otherUserId === friendId) {
                    chatExists = true; // If chat exists
                }
            });

            // If chat exists
            if (chatExists) {
                document.getElementById('add-friend-status').textContent = "Friend already exists in your chat list.";
            } else {
                const chatId = currentUser.uid < friendId ? `${currentUser.uid}_${friendId}` : `${friendId}_${currentUser.uid}`;
                const chatDocRef = doc(db, 'chats', chatId);

                // Create a new chat document
                await setDoc(chatDocRef, {
                    participants: [currentUser.uid, friendId],
                    lastMessage: '',
                    lastMessageTimestamp: serverTimestamp(),
                    unread: true, // Optional: Mark as unread if you want
                    readBy: [] // Optional: Initialize readBy array
                });

                document.getElementById('add-friend-status').textContent = "Friend added successfully!";
                loadChatList(); // Reload chat list
            }
        }
    } catch (error) {
        document.getElementById('add-friend-status').textContent = "Error adding friend.";
        console.error("Error adding friend:", error);
    }
});

// Authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadChatList();
    } else {
        window.location.href = 'index.html'; // Redirect to login if not authenticated
    }
});

// Load chat list with unread message highlight
function loadChatList() {
    const chatListDiv = document.getElementById('chat-list');
    chatListDiv.innerHTML = '';

    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
        chatsRef,
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastMessageTimestamp', 'desc')
    );

    onSnapshot(chatsQuery, async (snapshot) => {
        chatListDiv.innerHTML = ''; // Clear chats on update

        for (const chatDoc of snapshot.docs) {
            const chatData = chatDoc.data();
            const chatId = chatDoc.id;

            const otherUserId = chatData.participants.find(uid => uid !== currentUser.uid);
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));

            if (!otherUserDoc.exists()) {
                console.log('User not found:', otherUserId);
                continue;
            }
            const otherUserData = otherUserDoc.data();

            // Create chat item
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');

            const profileImg = document.createElement('img');
            profileImg.src = otherUserData.dpUrl || 'default_profile.png';
            profileImg.alt = `${otherUserData.username}'s profile`;
            profileImg.width = 50;
            profileImg.height = 50;

            const chatInfo = document.createElement('div');
            chatInfo.classList.add('chat-info');

            const username = document.createElement('h3');
            username.textContent = otherUserData.username;

            const lastMessage = document.createElement('p');
            lastMessage.textContent = chatData.lastMessage || 'No messages yet.';

            const lastMessageTime = document.createElement('span');
            const lastMessageDate = chatData.lastMessageTimestamp ? chatData.lastMessageTimestamp.toDate().toLocaleTimeString() : '';
            lastMessageTime.textContent = lastMessageDate;
            lastMessageTime.style.float = 'right';

            if (chatData.unread && !chatData.readBy.includes(currentUser.uid)) {
                chatItem.style.backgroundColor = '#e6f7ff'; // Blue background for unread
            }

            chatInfo.appendChild(username);
            chatInfo.appendChild(lastMessage);
            chatInfo.appendChild(lastMessageTime);

            chatItem.appendChild(profileImg);
            chatItem.appendChild(chatInfo);

            chatItem.addEventListener('click', async () => {
                window.location.href = `chatbox.html?friendId=${otherUserId}`;
                await updateDoc(doc(db, 'chats', chatId), {
                    unread: false,
                    readBy: [...(chatData.readBy || []), currentUser.uid]
                });
            });

            chatListDiv.appendChild(chatItem);
        }
    });
}

// Update Chat List on New Messages
async function sendMessage(chatId, messageContent) {
    const chatDocRef = doc(db, 'chats', chatId);
    await updateDoc(chatDocRef, {
        lastMessage: messageContent,
        lastMessageTimestamp: serverTimestamp(),
        unread: true
    });

    loadChatList();
}
