import React, { useState, useEffect } from 'react';
import { UserProfile, MatchProfile, Match } from './types';
import ProfileEdit from './components/ProfileEdit';
import VideoVerification from './components/VideoVerification';
import SwipeCard from './components/SwipeCard';
import ChatRoom from './components/ChatRoom';
import AuthScreen from './components/AuthScreen';
import SplashScreen from './components/SplashScreen';
import { Sparkles, MessageSquare, ShieldCheck, User, Compass, CheckCircle, Heart, Star, Flame, Loader2, RotateCcw, LogOut, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'chats' | 'verify' | 'profile'>('discover');
  const [token, setToken] = useState<string | null>(localStorage.getItem('aura_token'));
  
  // Dark Mode state initialization
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aura_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('aura_dark_mode', String(darkMode));
  }, [darkMode]);
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cards, setCards] = useState<MatchProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // App UI state
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [matchOverlay, setMatchOverlay] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial applet state
  const fetchState = async (authToken = token) => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const headers = { 'x-user-token': authToken };
      const [pRes, cRes, mRes] = await Promise.all([
        fetch('/api/profile', { headers }),
        fetch('/api/cards', { headers }),
        fetch('/api/matches', { headers })
      ]);

      if (pRes.ok) setProfile(await pRes.json());
      if (cRes.ok) setCards(await cRes.json());
      if (mRes.ok) setMatches(await mRes.json());
    } catch (err) {
      console.error("Error fetching state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchState(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // AuthSuccess handler
  const handleAuthSuccess = (newToken: string, newProfile: UserProfile) => {
    setToken(newToken);
    setProfile(newProfile);
  };

  // Sign out handler
  const handleSignOut = () => {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_username');
    setToken(null);
    setProfile(null);
    setActiveTab('discover');
    setActiveMatchId(null);
  };

  // Update profile handler
  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    if (!token) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-token': token
        },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Refresh matching cards since profile MBTI changed
        const cardsRes = await fetch('/api/cards', {
          headers: { 'x-user-token': token }
        });
        if (cardsRes.ok) setCards(await cardsRes.json());
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  // Reset Demo handler
  const handleResetDb = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/reset', { 
        method: 'POST',
        headers: { 'x-user-token': token }
      });
      if (res.ok) {
        await fetchState(token);
        setActiveTab('discover');
        setActiveMatchId(null);
      }
    } catch (err) {
      console.error("Error resetting demo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Video Verification callback
  const handleVerifyComplete = async () => {
    if (!token || !profile) return;
    try {
      const res = await fetch('/api/verify-video', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-token': token
        },
        body: JSON.stringify({ videoData: "simulated-liveness-payload" })
      });
      if (res.ok) {
        setProfile({
          ...profile,
          verificationStatus: 'verified',
          isVerified: true
        });
      }
    } catch (err) {
      console.error("Error committing video verification:", err);
    }
  };

  // Swipe Action
  const handleSwipe = async (cardId: string, direction: 'left' | 'right') => {
    if (!token) return;
    // Optimistically remove card
    setCards(prev => prev.filter(c => c.id !== cardId));

    try {
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-token': token
        },
        body: JSON.stringify({ profileId: cardId, direction })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isMatch && data.match) {
          // Trigger match modal overlay
          setMatchOverlay(data.match);
          // Reload matches
          const mRes = await fetch('/api/matches', {
            headers: { 'x-user-token': token }
          });
          if (mRes.ok) setMatches(await mRes.json());
        }
      }
    } catch (err) {
      console.error("Error swiping profile:", err);
    }
  };

  // Direct Spark Start Message Handler
  const handleStartChatWithIcebreaker = async (matchProfileId: string, text: string) => {
    if (!token) return;
    // 1. Swipe right on the profile optimistically to make it a match
    setCards(prev => prev.filter(c => c.id !== matchProfileId));
    
    try {
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-token': token
        },
        body: JSON.stringify({ profileId: matchProfileId, direction: 'right' })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Reload matches to register the matched profile
        const mRes = await fetch('/api/matches', {
          headers: { 'x-user-token': token }
        });
        if (mRes.ok) {
          const freshMatches = await mRes.json();
          setMatches(freshMatches);

          // Find the match object we just created
          const currentMatch = freshMatches.find((m: Match) => m.profile.id === matchProfileId);
          if (currentMatch) {
            // Send the custom icebreaker automatically!
            await fetch(`/api/chat/${currentMatch.id}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-user-token': token
              },
              body: JSON.stringify({ text }),
            });

            // Navigate to active chat
            setActiveMatchId(currentMatch.id);
            setActiveTab('chats');
          }
        }
      }
    } catch (err) {
      console.error("Error starting chat with icebreaker:", err);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!token) {
    return (
      <div className="relative min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
        {/* Floating Theme Toggle */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-md hover:scale-105 transition cursor-pointer flex items-center justify-center"
            title="Toggle Dark Mode"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-500 fill-indigo-500/20" />
            )}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center flex-col gap-3">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-sm font-semibold font-display text-neutral-600 dark:text-neutral-400">Booting Aura Connection Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-12 flex flex-col relative" id="applet-root">
      {/* Decorative Aura background colors */}
      <div className="absolute top-0 right-0 w-[45vw] h-[45vw] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[45vw] h-[45vw] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 py-3 sm:py-4 px-4 sm:px-6 sticky top-0 z-40 backdrop-blur-md/90 shadow-xs" id="applet-header">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-start">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-linear-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-pink-500/10">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <div className="text-left flex items-center gap-2">
              <div>
                <h1 className="text-base sm:text-lg font-black font-display tracking-tight leading-none bg-linear-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">AURA</h1>
                <span className="text-[8px] sm:text-[9px] font-bold text-pink-500 tracking-wider uppercase font-mono">Intentional & verified</span>
              </div>
              {profile?.isPremium && (
                <span className={`px-1.5 py-0.5 text-[8px] font-mono font-black uppercase rounded tracking-wider ${
                  profile.subscriptionPlan === 'infinite' 
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30' 
                    : 'bg-amber-100 text-amber-700 border border-amber-300'
                }`}>
                  {profile.subscriptionPlan === 'infinite' ? '👑 VIP' : '✦ GOLD'}
                </span>
              )}
            </div>
          </div>

          {/* Core App Navigation Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl w-full sm:w-auto" id="nav-tabs-deck">
              <button
                onClick={() => setActiveTab('discover')}
                className={`px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'discover' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
                id="tab-discover"
              >
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Discover</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('chats');
                  if (matches.length > 0 && !activeMatchId) {
                    setActiveMatchId(matches[0].id);
                  }
                }}
                className={`px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 relative cursor-pointer whitespace-nowrap ${
                  activeTab === 'chats' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
                id="tab-chats"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Chats</span>
                {matches.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 sm:top-1 sm:right-1 w-2 h-2 bg-pink-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'verify' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
                id="tab-verify"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Verify</span>
                {profile?.isVerified && (
                  <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 fill-current shrink-0" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'profile' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
                id="tab-profile"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Profile</span>
              </button>
            </div>

            {/* Header Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden sm:block p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 rounded-xl transition cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-500" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-400" />
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center justify-center p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 rounded-xl transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-8" id="applet-main-workspace">
        <AnimatePresence mode="wait">
          {activeTab === 'discover' && (
            <motion.div
              key="discover-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              {cards.length > 0 ? (
                <SwipeCard
                  card={cards[0]}
                  onSwipe={(direction) => handleSwipe(cards[0].id, direction)}
                  onStartChatWithIcebreaker={handleStartChatWithIcebreaker}
                />
              ) : (
                <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-4">
                  <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-850 text-neutral-400 dark:text-neutral-500 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 stroke-1" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold font-display text-neutral-900 dark:text-neutral-100">Deck Exhausted</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      You have reviewed all compatible profiles near you. Try modifying your slider quiz parameters in <strong className="text-neutral-800 dark:text-neutral-200">My Profile</strong> to discover new aligned connections!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium rounded-xl text-xs transition cursor-pointer"
                  >
                    Adjust Quiz Parameters
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'chats' && (
            <motion.div
              key="chats-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChatRoom
                matches={matches}
                activeMatchId={activeMatchId}
                onSelectMatch={(id) => setActiveMatchId(id)}
                onSendMessage={() => {}} // API is completely managed within ChatRoom itself
                onBackToMatches={() => setActiveMatchId(null)}
                userProfile={profile}
              />
            </motion.div>
          )}

          {activeTab === 'verify' && profile && (
            <motion.div
              key="verify-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <VideoVerification
                isVerified={profile.isVerified}
                status={profile.verificationStatus}
                onVerifyComplete={handleVerifyComplete}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && profile && (
            <motion.div
              key="profile-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <ProfileEdit
                profile={profile}
                onUpdate={handleUpdateProfile}
                onResetDb={handleResetDb}
                onSignOut={handleSignOut}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Match Overlay Dialogue Popup Modal */}
      <AnimatePresence>
        {matchOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
            id="match-overlay-modal"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-850 p-8 max-w-sm w-full text-center space-y-6 relative overflow-hidden shadow-2xl"
            >
              {/* Decorative sparkles */}
              <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-pink-500 to-rose-500" />
              
              <div className="space-y-2">
                <div className="mx-auto w-14 h-14 bg-pink-50 dark:bg-pink-950/30 text-pink-500 rounded-2xl flex items-center justify-center shadow-sm">
                  <Heart className="w-8 h-8 fill-current text-pink-500 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black font-display tracking-tight leading-tight text-neutral-900 dark:text-neutral-100">It's a Match!</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  You and <strong className="text-neutral-800 dark:text-neutral-200">{matchOverlay.profile.name}</strong> both selected right swiping. Aura's algorithm predicted a high affinity compatibility!
                </p>
              </div>

              {/* Profile image avatars */}
              <div className="flex items-center justify-center -space-x-4 py-2">
                <img
                  src={profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
                  alt="You"
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-neutral-900 shadow-md relative z-10"
                  referrerPolicy="no-referrer"
                />
                <img
                  src={matchOverlay.profile.avatarUrl}
                  alt={matchOverlay.profile.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-neutral-900 shadow-md relative z-20"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setActiveMatchId(matchOverlay.id);
                    setActiveTab('chats');
                    setMatchOverlay(null);
                  }}
                  className="w-full bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold py-3 rounded-2xl transition cursor-pointer text-xs"
                >
                  Initiate Intentional Chat
                </button>
                <button
                  onClick={() => setMatchOverlay(null)}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold py-3 rounded-2xl transition cursor-pointer text-xs"
                >
                  Keep Reviewing Minds
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
