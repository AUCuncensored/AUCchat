import './App.css';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { getFirestore, addDoc, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useState, useRef, useEffect } from 'react';

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA1lLcOaksGy8cfCwyJ5FtFWCjzPDvw99U",
    authDomain: "chat-b5581.firebaseapp.com",
    projectId: "chat-b5581",
    storageBucket: "chat-b5581.appspot.com",
    messagingSenderId: "948633881450",
    appId: "1:948633881450:web:3da8bb44dbec2de4097313",
    measurementId: "G-3LXHLKT9WP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function App() {
    const [user] = useAuthState(auth);

    return (
        <div className="App">
            <header className="App-header">
                {user ? <SignOut /> : null}
            </header>
            <section>
                {user ? <ChatRoom /> : <SignIn />}
            </section>
            {/* Mobile Sign Out Button */}
            {user && <MobileSignOut />}
        </div>
    );
}

function MobileSignOut() {
    return (
        <button className="mobile-signout-button" onClick={() => auth.signOut()}>
            Sign Out
        </button>
    );
}

function SignIn() {
    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const handleAnonymousSignIn = async () => {
        try {
            await signInAnonymously(auth);
            console.log("Signed in anonymously");
        } catch (error) {
            console.error("Error signing in anonymously:", error);
        }
    };

    return (
        <>
        <img src={require('./logo.png')} alt="Logo" className="logo" />
        <div className="login-buttons-container">
            <button onClick={signInWithGoogle}>Sign in with Google!</button>
            <button onClick={handleAnonymousSignIn}>Sign in anonymously!</button>
        </div>
        </>
    );
}

function SignOut() {
    return (
        <button className="sign-out-button" onClick={() => auth.signOut()}>
            Sign Out
        </button>
    );
}

function ChatRoom() {
    const messagesRef = collection(firestore, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt'), limit(25));
    const [messages] = useCollectionData(messagesQuery, { idField: 'id' });
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null); // Ref to the end of messages

    // Scroll to the bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            console.error("User is not authenticated");
            return;
        }

        const { uid, photoURL } = auth.currentUser;

        try {
            await addDoc(messagesRef, {
                text: newMessage,
                createdAt: serverTimestamp(),
                uid,
                photoURL
            });
            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <>
            <div className="messages-container">
                {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
                <div ref={messagesEndRef} /> {/* Reference for scrolling */}
            </div>
            <form onSubmit={sendMessage} className="message-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message..." // Updated placeholder text
                />
                <button type="submit" className="send-button">🕊️</button> {/* Dove emoji */}
            </form>
        </>
    );
}

function ChatMessage(props) {
    const { text, uid, photoURL } = props.message;

    // Determine user display info
    let userDisplay;

    if (photoURL) {
        // Logged-in user with a profile picture
        userDisplay = <img src={photoURL} alt="User" className="profile-image" />;
    } else {
        // Anonymous user
        userDisplay = (
            <span className="anonymous-image">?</span>
        );
    }

    return (
        <div className="ChatMessage">
            <strong>{userDisplay}</strong>: {text}
        </div>
    );
}

export default App;
