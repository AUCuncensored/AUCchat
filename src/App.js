import './App.css';
import { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { getFirestore, addDoc, collection, query, orderBy, limit, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

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
    const [displayName, setDisplayName] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fetchDisplayName = async (uid) => {
            const userDoc = await getDoc(doc(firestore, 'users', uid));
            if (userDoc.exists()) {
                setDisplayName(userDoc.data().displayName);
                localStorage.setItem('displayName', userDoc.data().displayName); // Save display name to local storage
            }
        };

        if (user) {
            if (user.providerData.some(provider => provider.providerId === 'google.com')) {
                setDisplayName(user.displayName);
            } else {
                const uid = localStorage.getItem('anonymousUserUid') || user.uid;
                localStorage.setItem('anonymousUserUid', uid);
                const savedName = localStorage.getItem('displayName');
                if (savedName) {
                    setDisplayName(savedName);
                } else {
                    fetchDisplayName(uid);
                }
            }
        }
    }, [user]);

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            setIsMobileMenuOpen(false); // Close menu after sign out
            setDisplayName(null); // Clear displayName state after signing out
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(prevState => !prevState);
    };

    const handleChangeName = () => {
        localStorage.removeItem('displayName');
        setDisplayName(null);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="App">
            <header className="App-header">
                {user && (
                    <>
                        <div className="desktop-signout-container">
                            <button className="sign-out-button" onClick={handleSignOut}>
                                Log Out
                            </button>
                            {auth.currentUser && !auth.currentUser.providerData.some(provider => provider.providerId === 'google.com') && (
                                <button className="change-name-button" onClick={handleChangeName}>
                                    Change Name
                                </button>
                            )}
                        </div>
                        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
                            ☰
                        </div>
                        {isMobileMenuOpen && (
                            <div className="dropdown-content active">
                                <button className="mobile-signout-button" onClick={handleSignOut}>
                                    Log Out
                                </button>
                                {auth.currentUser && !auth.currentUser.providerData.some(provider => provider.providerId === 'google.com') && (
                                    <button className="change-name-button" onClick={handleChangeName}>
                                        Change Name
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </header>
            <section>
                {user ? (
                    displayName ? (
                        <ChatRoom displayName={displayName} setDisplayName={setDisplayName} />
                    ) : (
                        !user.providerData.some(provider => provider.providerId === 'google.com') && (
                            <SetDisplayName user={user} onSetDisplayName={setDisplayName} />
                        )
                    )
                ) : (
                    <SignIn />
                )}
            </section>
        </div>
    );
}

function SetDisplayName({ user, onSetDisplayName }) {
    const [nameInput, setNameInput] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nameInput.trim()) {
            const uid = user.uid;
            try {
                await setDoc(doc(firestore, 'users', uid), {
                    displayName: nameInput.trim()
                });
                localStorage.setItem('displayName', nameInput.trim());
                onSetDisplayName(nameInput.trim());
            } catch (error) {
                console.error("Error saving display name:", error);
            }
        }
    };

    return (
        <div className="set-display-name">
            <h3>Choose a Display Name</h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                />
                <button type="submit">Set Name</button>
            </form>
        </div>
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
            const result = await signInAnonymously(auth);
            const uid = result.user.uid;
            localStorage.setItem('anonymousUserUid', uid);
        } catch (error) {
            console.error("Error signing in anonymously:", error);
        }
    };

    return (
        <div className="sign-in-container">
            <img src={require('./logo.png')} alt="Logo" className="logo" />
            <div className="login-buttons-container">
                <button className="login-button" onClick={signInWithGoogle}>Sign in with Google!</button>
                <button className="login-button" onClick={handleAnonymousSignIn}>Sign in anonymously!</button>
            </div>
        </div>
    );
}

function ChatRoom({ displayName }) {
    const messagesRef = collection(firestore, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt'), limit(25));
    const [messages] = useCollectionData(messagesQuery, { idField: 'id' });
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [dropdownUser, setDropdownUser] = useState(null);

    useEffect(() => {
        if (messages) {
            console.log("Fetched messages:", messages);
        }
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownUser && !event.target.closest('.user-dropdown') && !event.target.closest('.profile-image')) {
                setDropdownUser(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownUser]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage || !newMessage.trim()) {
            console.warn("Cannot send a blank message.");
            return;
        }

        if (!auth.currentUser) {
            console.error("User is not authenticated");
            return;
        }

        const { uid, photoURL } = auth.currentUser;
        const profilePicture = photoURL || displayName.charAt(0).toUpperCase();

        try {
            await addDoc(messagesRef, {
                text: newMessage,
                createdAt: serverTimestamp(),
                uid,
                photoURL: profilePicture,
                displayName: displayName
            });

            console.log("Message sent:", newMessage);
            setNewMessage("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "40px";
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleInputChange = (e) => {
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
        setNewMessage(e.target.value);
    };

    const characterCount = newMessage.length;

    const handleProfileClick = (user) => {
        setDropdownUser(user);
    };

    return (
        <>
            <div className="messages-container">
                {messages && messages.map(msg => (
                    <ChatMessage key={msg.id} message={msg} onProfileClick={() => handleProfileClick(msg)} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="message-form">
                <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Message..."
                    maxLength="500"
                    rows="1"
                    className="message-input"
                />
                <button type="submit" className="send-button">🕊️</button>
            </form>
            <div className="character-counter">{characterCount} / 500</div>
            {dropdownUser && (
    <div className="user-dropdown active">
        <div className="user-dropdown-container">
            {dropdownUser.photoURL && dropdownUser.photoURL.startsWith("http") ? (
                <img src={dropdownUser.photoURL} alt="User" className="profile-image" />
            ) : (
                <span className="anonymous-image">{dropdownUser.photoURL || dropdownUser.displayName.charAt(0).toUpperCase()}</span>
            )}
            <p>{dropdownUser.displayName}</p>
        </div>
    </div>
)}

        </>
    );
}

function ChatMessage({ message, onProfileClick }) {
    const { text, photoURL, createdAt } = message;

    const userDisplay = photoURL && photoURL.startsWith("http")
        ? <img src={photoURL} alt="User" className="profile-image" onClick={onProfileClick} />
        : <span className="anonymous-image" onClick={onProfileClick}>{photoURL || "?"}</span>;

    const messageTime = createdAt
        ? new Date(createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "Sending...";

    return (
        <div className="ChatMessage">
            {userDisplay}
            <div>
                <span>{text}</span>
                <span className="timestamp">{messageTime}</span>
            </div>
        </div>
    );
}

export default App;
