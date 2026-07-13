import React, { useState } from 'react';
import { Flame, User, Lock, Mail, Sparkles, Check, ArrowRight, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs
} from 'firebase/firestore';

interface AuthScreenProps {
  onAuthSuccess: (token: string, profile: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sign In States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / Reset States
  const [resetUsername, setResetUsername] = useState('');
  const [resetDisplayName, setResetDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Sign Up Additional States
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState('Female');
  const [lookingFor, setLookingFor] = useState('everyone');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('Creative');
  const [mbti, setMbti] = useState('ENFP');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Coffee', 'Design']);

  // Helper to find account in Firestore by direct username ID or profile/display name
  const findAccountByHandle = async (handle: string) => {
    const lowercaseHandle = handle.toLowerCase().trim().replace(/^@/, '');
    if (!lowercaseHandle) return null;

    // 1. Try direct lookup first (fastest)
    const docRef = doc(db, 'accounts', lowercaseHandle);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { username: lowercaseHandle, data: docSnap.data() };
    }

    // 2. Scan accounts for display name or secondary username matching
    try {
      const accountsCol = collection(db, 'accounts');
      const querySnapshot = await getDocs(accountsCol);
      let found: { username: string; data: any } | null = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const profileName = data.profile?.name?.toLowerCase().trim();
        const uName = data.username?.toLowerCase().trim();
        if (profileName === lowercaseHandle || uName === lowercaseHandle) {
          found = { username: doc.id, data };
        }
      });
      if (found) return found;
    } catch (err) {
      console.warn("Error scanning accounts:", err);
    }

    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    const lowercaseUsername = resetUsername.toLowerCase().trim().replace(/^@/, '');
    if (!lowercaseUsername) {
      setError("Please enter a valid username.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch account from Firestore (supports direct username or display name)
      const foundAccount = await findAccountByHandle(lowercaseUsername);

      if (!foundAccount) {
        throw new Error(`The username or display name '@${lowercaseUsername}' does not exist.`);
      }

      const { username: finalUsername, data: accountData } = foundAccount;
      const profile = accountData.profile;

      // 2. Security challenge: display name verification (case-insensitive)
      if (!profile || !profile.name || profile.name.toLowerCase().trim() !== resetDisplayName.toLowerCase().trim()) {
        throw new Error("Verification failed. The display name does not match our records for this username.");
      }

      // 3. Display name matches! Update password in Firestore
      const docRef = doc(db, 'accounts', finalUsername);
      await setDoc(docRef, {
        ...accountData,
        passwordHash: newPassword
      });

      // 4. Update password on server DB to keep them in sync
      try {
        await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: finalUsername, password: newPassword })
        });
      } catch (syncErr) {
        console.warn("Failed to sync reset password with server DB:", syncErr);
      }

      // 5. Success!
      setResetSuccess("Your password has been successfully reset! Switching to Sign In...");
      
      // Clear form
      setResetUsername('');
      setResetDisplayName('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      // Switch mode back to signin after delay
      setTimeout(() => {
        setMode('signin');
        setResetSuccess(null);
      }, 3000);

    } catch (err: any) {
      console.warn("Password reset info/error:", err.message || err);
      setError(err.message || "An error occurred during password reset.");
    } finally {
      setLoading(false);
    }
  };

  const availableInterests = [
    'Design', 'Coffee', 'Music', 'Reading', 'Art', 'Coding', 'Travel', 
    'Nature', 'Photography', 'Yoga', 'Cooking', 'Astrology', 'Cinema', 'Fitness'
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Support using "@" prefix for usernames (e.g. "@john" -> "john") and normalize
    const lowercaseUsername = username.toLowerCase().trim().replace(/^@/, '');
    let finalUsername = lowercaseUsername;
    
    // Construct a valid email address without invalid characters (like spaces) for Firebase Auth.
    // The "@" is for the username handle, not an email. We normalize the local part.
    const safeEmailLocalPart = lowercaseUsername.replace(/[^a-z0-9._+-]/g, '');
    let email = `${safeEmailLocalPart || 'user'}@aura.com`;

    try {
      let finalProfile: UserProfile;

      if (mode === 'signin') {
        // --- SIGN IN FLOW ---
        // 1. Verify if username exists in Firestore first (supports direct username or display name)
        const foundAccount = await findAccountByHandle(lowercaseUsername);

        if (!foundAccount) {
          throw new Error(`The username ID '@${lowercaseUsername}' is not registered yet. Please complete registration below!`);
        }

        const { username: matchedUsername, data: accountData } = foundAccount;
        finalUsername = matchedUsername;
        finalProfile = accountData.profile;

        // Construct safe email based on actual registered username ID
        const matchedSafeLocalPart = finalUsername.replace(/[^a-z0-9._+-]/g, '');
        email = `${matchedSafeLocalPart || 'user'}@aura.com`;

        // 2. Try to sign in with Firebase Authentication
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          // If the auth fails, but the entered password matches Firestore's passwordHash,
          // it might be a newly reset password that hasn't synced to Auth yet.
          if (accountData.passwordHash === password) {
            // User exists in Firestore with this password. Register/sync them in Auth on-the-fly!
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                console.warn("Auth user exists with a different password, bypassing and using Firestore credentials.");
              } else {
                throw createErr;
              }
            }
          } else {
            // It's a real password mismatch!
            throw new Error('Incorrect password. Please try again or click "Forgot password?" to reset.');
          }
        }

      } else {
        // --- SIGN UP / REGISTRATION FLOW ---
        // 1. Check if username is already taken in Firestore first
        const docRef = doc(db, 'accounts', lowercaseUsername);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          throw new Error('Username already exists. Please choose a different one.');
        }

        // 2. Create Firebase Auth user
        await createUserWithEmailAndPassword(auth, email, password);

        // 3. Prepare the new profile object
        finalProfile = {
          id: `user_${lowercaseUsername}_${Date.now()}`,
          name: name.trim(),
          age: parseInt(age) || 24,
          gender,
          lookingFor,
          bio: bio.trim() || "Exploring connections on Aura.",
          occupation: occupation.trim() || "Professional",
          interests: selectedInterests,
          mbti,
          personalityAnswers: {
            social: 0,
            creative: 0,
            planning: 0,
            energy: 0,
            convention: 0
          },
          isVerified: false,
          verificationStatus: "unverified",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
          isPremium: false,
          subscriptionPlan: "none",
          subscriptionExpiresAt: 0,
          blockedUserIds: [],
          reportedUserIds: [],
          pushNotificationsEnabled: true,
        };

        // 4. Create the full account document in Firestore
        const newAccount = {
          id: `acc_${lowercaseUsername}`,
          username: lowercaseUsername,
          passwordHash: password, // For backward compatibility
          profile: finalProfile,
          swipes: {},
          matches: [],
          messages: []
        };

        await setDoc(docRef, newAccount);
      }

      // 5. Save credentials and trigger success
      localStorage.setItem('aura_token', `token_${finalUsername}`);
      localStorage.setItem('aura_username', finalUsername);
      onAuthSuccess(`token_${finalUsername}`, finalProfile);

    } catch (err: any) {
      console.warn("Auth warning:", err.message || err);
      let errMsg = err.message || 'Authentication failed.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        errMsg = 'The username is not registered.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password is too weak. Must be at least 6 characters.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Username is already registered.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const mbtiTypes = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP'
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="auth-screen-container">
      {/* Decorative ambient blurred backgrounds */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-linear-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <Flame className="w-6 h-6 fill-current" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black font-display tracking-tight bg-linear-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
          {mode === 'signin' 
            ? 'Sign in to Aura' 
            : mode === 'signup' 
              ? 'Create your Aura account' 
              : 'Reset Your Password'}
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {mode === 'signin' 
            ? 'Connect intentionally. Experience verified depth.' 
            : mode === 'signup'
              ? 'Unveil your real personality profile & discover compatible minds.'
              : 'Verifiable security challenge based on your profile details.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <motion.div 
          layout
          className="bg-white dark:bg-neutral-900 py-8 px-4 shadow-sm border border-neutral-100 dark:border-neutral-800 sm:rounded-3xl sm:px-10"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-3 text-left" id="auth-error-box">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-800 dark:text-red-450">Authentication Failed</h4>
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3 text-left" id="auth-success-box">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-450">Success</h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 leading-relaxed">{resetSuccess}</p>
              </div>
            </div>
          )}

          <form className="space-y-6 text-left" onSubmit={mode === 'forgot_password' ? handleResetPassword : handleSubmit}>
            {/* Common Account Fields */}
            {mode !== 'forgot_password' ? (
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label htmlFor="username" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Username ID
                  </label>
                  <div className="mt-1.5 relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                      <User className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="yourname"
                      className="block w-full pl-11 pr-4 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setError(null);
                        }}
                        className="text-[11px] font-bold text-pink-600 hover:text-pink-500 transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                      <Lock className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-12 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 stroke-[2]" />
                      ) : (
                        <Eye className="h-4 w-4 stroke-[2]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label htmlFor="reset-username" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Username ID
                  </label>
                  <div className="mt-1.5 relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                      <User className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="reset-username"
                      name="reset-username"
                      type="text"
                      required
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="yourname"
                      className="block w-full pl-11 pr-4 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reset-displayname" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Your Profile's Preferred Display Name
                  </label>
                  <div className="mt-1.5 relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                      <Sparkles className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="reset-displayname"
                      name="reset-displayname"
                      type="text"
                      required
                      value={resetDisplayName}
                      onChange={(e) => setResetDisplayName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="block w-full pl-11 pr-4 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                    To verify your identity, enter the exact display name configured on your profile (case-insensitive).
                  </p>
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="mt-1.5 relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                      <Lock className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="new-password"
                      name="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-12 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 focus:outline-none transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 stroke-[2]" />
                      ) : (
                        <Eye className="h-4 w-4 stroke-[2]" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="mt-1.5 relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                      <Lock className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-12 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Registration-Only Detailed Profile Fields */}
            {mode === 'signup' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6 pt-4 border-t border-neutral-100 dark:border-neutral-800"
              >
                <h3 className="text-xs font-black text-neutral-900 dark:text-neutral-150 tracking-tight uppercase">Dating Profile Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Preferred Display Name
                    </label>
                    <input
                      type="text"
                      required={mode === 'signup'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Age
                    </label>
                    <input
                      type="number"
                      required={mode === 'signup'}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min="18"
                      max="100"
                      className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition"
                    >
                      <option value="Female" className="bg-white dark:bg-neutral-900">Female</option>
                      <option value="Male" className="bg-white dark:bg-neutral-900">Male</option>
                      <option value="Non-binary" className="bg-white dark:bg-neutral-900">Non-binary</option>
                      <option value="Transgender" className="bg-white dark:bg-neutral-900">Transgender</option>
                      <option value="Genderfluid" className="bg-white dark:bg-neutral-900">Genderfluid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Looking For
                    </label>
                    <select
                      value={lookingFor}
                      onChange={(e) => setLookingFor(e.target.value)}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition"
                    >
                      <option value="everyone" className="bg-white dark:bg-neutral-900">Everyone</option>
                      <option value="Female" className="bg-white dark:bg-neutral-900">Women</option>
                      <option value="Male" className="bg-white dark:bg-neutral-900">Men</option>
                      <option value="Non-binary" className="bg-white dark:bg-neutral-900">Non-binary minds</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Occupation / Vibe
                    </label>
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Artist"
                      className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Myers-Briggs MBTI
                    </label>
                    <select
                      value={mbti}
                      onChange={(e) => setMbti(e.target.value)}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition"
                    >
                      {mbtiTypes.map(type => (
                        <option key={type} value={type} className="bg-white dark:bg-neutral-900">{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Bio (Intentional Self-Expression)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What represents your true essence? Tell us what you appreciate in others."
                    className="mt-1.5 block w-full px-4 py-2.5 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-100 transition resize-none"
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Appreciated Interests (Select up to 5)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableInterests.map(interest => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            isSelected 
                              ? 'bg-pink-500 text-white shadow-xs' 
                              : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-750 border border-neutral-200/50 dark:border-neutral-700/50'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          <span>{interest}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 dark:bg-linear-to-r dark:from-pink-500 dark:to-rose-600 dark:hover:from-pink-600 dark:hover:to-rose-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer shadow-sm hover:shadow-md disabled:bg-neutral-350 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                id="auth-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </span>
                ) : (
                  <>
                    <span>
                      {mode === 'signin' 
                        ? 'Sign In to Aura' 
                        : mode === 'signup' 
                          ? 'Register Profile' 
                          : 'Reset Password'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
 
          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
            {mode === 'forgot_password' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setResetSuccess(null);
                }}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-350 transition cursor-pointer"
                id="auth-mode-toggle"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="text-xs font-bold text-pink-600 hover:text-pink-500 transition cursor-pointer"
                id="auth-mode-toggle"
              >
                {mode === 'signin' 
                  ? "Don't have an account? Complete Registration" 
                  : 'Already have an account? Sign In'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
