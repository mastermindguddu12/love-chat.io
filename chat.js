import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBrcvGYxSokJDNdVbHurV660DAVsOBC1Ic",
    authDomain: "love-chat-d0d63.firebaseapp.com",
    databaseURL: "https://love-chat-d0d63-default-rtdb.firebaseio.com",
    projectId: "love-chat-d0d63",
    storageBucket: "love-chat-d0d63.appspot.com",
    messagingSenderId: "136678490864",
    appId: "1:136678490864:web:dfd927dc43c5118738f835"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth();

const chatMessagesDiv = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const typingStatusDiv = document.getElementById("typing-status");
const backButton = document.getElementById("back-button");

let chatId = "";
let currentUser = null;
let friendId = "";

// Format timestamp to 'hh:mm AM/PM'
function formatTimestamp(timestamp) {
    const date = timestamp.toDate();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12) || 12;
    
    return `${formattedHours}:${minutes} ${ampm}`;
}

// Get friend ID from URL parameters
function getFriendIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("friendId");
}

// Function to load chat messages
async function loadChatMessages(chatId) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

    onSnapshot(messagesQuery, (snapshot) => {
        chatMessagesDiv.innerHTML = "";  // Clear previous messages
        snapshot.forEach(doc => {
            const messageData = doc.data();
            const messageElement = document.createElement("div");
            const ticks = getMessageTicks(messageData.status);
            const timestamp = formatTimestamp(messageData.timestamp);

            const senderName = messageData.senderId === currentUser.uid ? "You" : friendId;

            messageElement.className = messageData.senderId === currentUser.uid ? "message-sent" : "message-received";
            
            messageElement.innerHTML = `
                <div class="message-content">
                    <b>${senderName}:</b> ${messageData.message}
                    <div class="message-meta">
                        <span class="tick">${ticks}</span> <span class="time">${timestamp}</span>
                    </div>
                </div>
            `;

            chatMessagesDiv.appendChild(messageElement);

            // Mark message as seen if friend reads it
            if (messageData.senderId !== currentUser.uid && messageData.status !== 'seen') {
                updateMessageStatus(chatId, doc.id, 'seen');
            }
        });

        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;  // Auto-scroll to the bottom
    });
}

// Function to get tick marks based on message status
function getMessageTicks(status) {
    if (status === 'sent') {
        return '✔'; // Single tick
    } else if (status === 'delivered') {
        return '✔✔'; // Double tick
    } else if (status === 'seen') {
        return '<span style="color: blue;">✔✔</span>'; // Blue double tick
    }
    return '';
}

// Function to send a message
async function sendMessage(chatId, message) {
    const messageData = {
        message,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "You",
        status: 'sent', // Initial status is "sent"
        timestamp: serverTimestamp(),
    };

    // Add message to Firestore
    const docRef = await addDoc(collection(db, "chats", chatId, "messages"), messageData);

    // Update the main chat document with the last message details
    await setDoc(doc(db, "chats", chatId), {
        participants: [currentUser.uid, friendId],
        lastMessage: message,
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSenderId: currentUser.uid
    }, { merge: true });

    // Clear the input after sending
    messageInput.value = "";

    // Remove typing status after sending
    updateTypingStatus(false);
}

// Update message status
async function updateMessageStatus(chatId, messageId, status) {
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), { status });
}

// Update typing status in Realtime Database
function updateTypingStatus(isTyping) {
    const typingRef = ref(rtdb, `chats/${chatId}/typing/${currentUser.uid}`);
    set(typingRef, isTyping);
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        friendId = getFriendIdFromUrl();

        // Generate or get chatId based on users
        chatId = currentUser.uid < friendId ? `${currentUser.uid}_${friendId}` : `${friendId}_${currentUser.uid}`;

        // Load friend details (profile pic, username)
        getFriendDetails(friendId);
        loadChatMessages(chatId);
        listenToTypingStatus();  // Listen for typing status
    } else {
        window.location.href = "index.html";  // Redirect if not logged in
    }
});

// Function to get friend details
async function getFriendDetails(friendId) {
    const userRef = doc(db, "users", friendId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        document.getElementById("profile-pic").src = userData.dpUrl || "default_profile.png";
        document.getElementById("username").textContent = userData.username;
        document.getElementById("status").textContent = userData.isOnline ? "Online" : "Offline";
    }
}

// Listen for typing status
function listenToTypingStatus() {
    const typingRef = ref(rtdb, `chats/${chatId}/typing/${friendId}`);
    onValue(typingRef, (snapshot) => {
        const isTyping = snapshot.val();
        typingStatusDiv.textContent = isTyping ? "Typing..." : "";
    });
}

// Detect typing in the message input
messageInput.addEventListener("input", () => {
    updateTypingStatus(messageInput.value.trim() !== "");
});

// Send message button click event
sendBtn.addEventListener("click", () => {
    const message = messageInput.value;
    if (message.trim()) {
        sendMessage(chatId, message);
    }
});

// Handle Enter key for sending message
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();  // Prevent newline
        sendBtn.click();
    }
});

// Back button event handler
backButton.addEventListener("click", () => {
    window.location.href = "chatlist.html";
});
