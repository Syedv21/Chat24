// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBfJ959KNi3Emm1dH82q_U0oAPcO8-H8GM",
  authDomain: "chart-7c76c.firebaseapp.com",
  projectId: "chart-7c76c",
  storageBucket: "chart-7c76c.appspot.com",
  messagingSenderId: "628372199409",
  appId: "1:628372199409:web:698aa47c4ab87ffcf65650"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const elements = {
  loginScreen: document.getElementById("loginScreen"),
  chatUI: document.getElementById("chatUI"),
  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  loginBtn: document.getElementById("loginBtn"),
  messagesDiv: document.getElementById("messages"),
  messageInput: document.getElementById("messageInput"),
  sendButton: document.getElementById("sendButton"),
  darkModeToggle: document.getElementById("darkModeToggle")
};

// Dark Mode Toggle
elements.darkModeToggle.addEventListener("click", toggleDarkMode);

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
  const icon = document.body.classList.contains("dark-mode") ? "sun" : "moon";
  elements.darkModeToggle.innerHTML = `<i class="fas fa-${icon}"></i>`;
}

// Authentication
elements.loginBtn.addEventListener("click", handleLogin);

async function handleLogin() {
  const email = elements.emailInput.value;
  const password = elements.passwordInput.value;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    elements.loginScreen.style.display = "none";
    elements.chatUI.style.display = "flex";
    loadMessages();
  } catch (error) {
    console.error("Login error:", error);
    alert(`Login failed: ${error.message}`);
  }
}

// Message Handling
elements.sendButton.addEventListener("click", sendMessage);
elements.messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message || !auth.currentUser) return;

  try {
    await db.collection("messages").add({
      text: message,
      sender: auth.currentUser.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    elements.messageInput.value = "";
  } catch (error) {
    console.error("Send message error:", error);
    alert("Failed to send message. Please try again.");
  }
}

// Load and Display Messages
function loadMessages() {
  db.collection("messages")
    .orderBy("timestamp")
    .onSnapshot(handleSnapshot, handleError);
}

function handleSnapshot(snapshot) {
  elements.messagesDiv.innerHTML = "";
  snapshot.forEach(doc => {
    const msg = doc.data();
    displayMessage(msg, doc.id);
  });
  scrollToBottom();
}

function displayMessage(msg, id) {
  const isYou = msg.sender === auth.currentUser?.email;
  const messageElement = document.createElement("div");
  messageElement.className = `message ${isYou ? "your-message" : "their-message"}`;
  
  const time = msg.timestamp?.toDate().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  messageElement.innerHTML = `
    <div class="message-text">${msg.text}</div>
    <div class="message-meta">
      <span class="message-time">${time || 'Now'}</span>
      ${isYou ? `<span class="read-receipt">${msg.read ? '✓✓ Read' : '✓ Sent'}</span>` : ''}
    </div>
  `;
  
  elements.messagesDiv.appendChild(messageElement);
}

// Read Receipts
auth.onAuthStateChanged(user => {
  if (user) {
    db.collection("messages")
      .where("read", "==", false)
      .where("sender", "!=", user.email)
      .onSnapshot(snapshot => {
        snapshot.forEach(async doc => {
          await db.collection("messages").doc(doc.id).update({ read: true });
        });
      }, handleError);
  }
});

// Helper Functions
function scrollToBottom() {
  elements.messagesDiv.scrollTop = elements.messagesDiv.scrollHeight;
}

function handleError(error) {
  console.error("Firebase error:", error);
}

// Initialize
auth.onAuthStateChanged(user => {
  if (user) {
    elements.loginScreen.style.display = "none";
    elements.chatUI.style.display = "flex";
    loadMessages();
  }
});
// Read Receipts Implementation
function setupReadReceipts() {
  if (!auth.currentUser) return;

  // Listen for new messages
  db.collection("messages")
    .where("sender", "==", auth.currentUser.uid)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          monitorReceiptStatus(change.doc);
        }
      });
    });

  // Update receipts when viewing messages
  db.collection("messages")
    .where("sender", "!=", auth.currentUser.uid)
    .where("read", "==", false)
    .onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        db.collection("messages").doc(doc.id).update({
          read: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    });
}

function monitorReceiptStatus(messageDoc) {
  const messageId = messageDoc.id;
  const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
  
  if (!messageElement) return;

  const receiptIcons = messageElement.querySelectorAll('.receipt-icon');

  // Initial state (sent)
  receiptIcons[0].classList.add('delivered');
  receiptIcons[1].classList.remove('read');

  // Listen for read status updates
  const unsubscribe = messageDoc.ref.onSnapshot(doc => {
    const data = doc.data();
    
    if (data.read) {
      // Update UI to show read status
      receiptIcons[0].classList.add('delivered');
      receiptIcons[1].classList.add('read');
      
      // Optional: Show read time
      if (data.readAt) {
        const readTime = data.readAt.toDate().toLocaleTimeString();
        messageElement.querySelector('.message-time').textContent += ` · Read ${readTime}`;
      }
      
      // Stop listening after message is read
      unsubscribe();
    }
  });
}

// Initialize when user logs in
auth.onAuthStateChanged(user => {
  if (user) {
    setupReadReceipts();
  }
});