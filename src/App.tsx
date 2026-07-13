import React, { useState, useEffect } from 'react';
import { UserProfile, MatchProfile, Match } from './types';
import ProfileEdit from './components/ProfileEdit';
import VideoVerification from './components/VideoVerification';
import SwipeCard from './components/SwipeCard';
import ChatRoom from './components/ChatRoom';
import AuthScreen from './components/AuthScreen';
import SplashScreen from './components/SplashScreen';
import { Sparkles, MessageSquare, ShieldCheck, User, Compass, CheckCircle, Heart, Star, Flame, Loader2, RotateCcw, LogOut, Sun, Moon, Bell, ShieldAlert, Shield, X, Search, Filter, RefreshCw } from 'lucide-react';
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
  
  // Push Notification UI state
  const [pushNotification, setPushNotification] = useState<{ title: string; body: string; avatarUrl?: string; onClick?: () => void } | null>(null);

  const triggerPushNotification = (title: string, body: string, avatarUrl?: string, onClick?: () => void) => {
    // Only show if notifications are enabled on the user profile
    if (profile && profile.pushNotificationsEnabled === false) {
      return;
    }
    setPushNotification({ title, body, avatarUrl, onClick });
  };

  // Auto-dismiss push notification banner after 4.5s
  useEffect(() => {
    if (pushNotification) {
      const timer = setTimeout(() => {
        setPushNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [pushNotification]);

  // Simulate background matching activity / notification sparks
  const handleSimulatePush = () => {
    const presets = [
      {
        name: "Sophia, 24",
        bio: "Creative writer, coffee addict, vinyl enthusiast.",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        message: "Hey! Your personality profile is ENFP? That is such an amazing match! Let's chat! ✨"
      },
      {
        name: "Daniel, 26",
        bio: "Backyard astronomer, acoustic guitarist, baker.",
        avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
        message: "Spotted your vinyl records interest - what is your current rotation? 🎵"
      },
      {
        name: "Elena, 25",
        bio: "Museum curator, plant lover, weekend hiker.",
        avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
        message: "Loved your bio! Let's get coffee and explore the contemporary gallery? ☕"
      }
    ];
    
    const selected = presets[Math.floor(Math.random() * presets.length)];
    triggerPushNotification(
      `New Spark from ${selected.name}`,
      selected.message,
      selected.avatarUrl,
      () => {
        setActiveTab('chats');
      }
    );
  };

  // Handle user blocked or reported from ChatRoom or SwipeCard
  const handleUserBlockedOrReported = async (blockedProfileId: string) => {
    if (!token) return;
    try {
      // Re-fetch profile to sync blocked lists
      const pRes = await fetch('/api/profile', {
        headers: { 'x-user-token': token }
      });
      if (pRes.ok) {
        const updatedProfile = await pRes.json();
        setProfile(updatedProfile);
      }

      // Re-fetch matches
      const mRes = await fetch('/api/matches', {
        headers: { 'x-user-token': token }
      });
      if (mRes.ok) {
        const updatedMatches = await mRes.json();
        setMatches(updatedMatches);
        
        // If active chat partner is blocked, clear activeMatchId
        if (activeMatchId) {
          const isStillMatch = updatedMatches.some((m: any) => m.profile.id === blockedProfileId || m.id === blockedProfileId);
          if (!isStillMatch) {
            setActiveMatchId(null);
          }
        }
      }

      // Re-fetch card deck
      const cRes = await fetch('/api/cards', {
        headers: { 'x-user-token': token }
      });
      if (cRes.ok) setCards(await cRes.json());
      
      triggerPushNotification(
        "Action Confirmed", 
        "Profile successfully blocked and removed from matches."
      );
    } catch (err) {
      console.error("Error updating state after block:", err);
    }
  };
  
  // App UI state
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [matchOverlay, setMatchOverlay] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States for user search
  const [discoverMode, setDiscoverMode] = useState<'swipe' | 'search'>('swipe');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchGender, setSearchGender] = useState('everyone');
  const [searchMbti, setSearchMbti] = useState('');
  const [searchInterest, setSearchInterest] = useState('');
  const [searchResults, setSearchResults] = useState<(MatchProfile & { swiped?: 'left' | 'right' | null })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchProfile, setSelectedSearchProfile] = useState<MatchProfile | null>(null);
  const [searchCompatibilityReport, setSearchCompatibilityReport] = useState<string | null>(null);
  const [searchIcebreakers, setSearchIcebreakers] = useState<string[]>([]);
  const [searchReportState, setSearchReportState] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');

  const handleSearch = async () => {
    if (!token) return;
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (searchGender && searchGender !== 'everyone') params.append('gender', searchGender);
      if (searchMbti) params.append('mbti', searchMbti);
      if (searchInterest) params.append('interest', searchInterest);

      const res = await fetch(`/api/search?${params.toString()}`, {
        headers: { 'x-user-token': token }
      });
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Run search query in real-time as filters or text change
  useEffect(() => {
    if (activeTab === 'discover' && discoverMode === 'search' && token) {
      const delayDebounce = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery, searchGender, searchMbti, searchInterest, discoverMode, activeTab, token]);

  const handleSearchConnect = async (cardId: string, direction: 'left' | 'right') => {
    if (!token) return;
    
    // Update local search results state optimistically
    setSearchResults(prev => prev.map(p => p.id === cardId ? { ...p, swiped: direction } : p));
    
    // Also remove from matching card deck if present so they do not see it there
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
          
          // Reload matches list
          const mRes = await fetch('/api/matches', {
            headers: { 'x-user-token': token }
          });
          if (mRes.ok) setMatches(await mRes.json());
        }
      }
    } catch (err) {
      console.error("Error swiping from search:", err);
    }
  };

  const fetchSearchCompatibilityReport = async (matchId: string) => {
    setSearchReportState('loading');
    setSearchCompatibilityReport(null);
    setSearchIcebreakers([]);
    try {
      const res = await fetch(`/api/compatibility/${matchId}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      
      setSearchCompatibilityReport(data.report);
      setSearchIcebreakers(data.icebreakers || []);
      setSearchReportState('success');
    } catch (err) {
      console.error(err);
      setSearchReportState('failed');
    }
  };

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
    if (!token) return { success: false, error: "Not authenticated" };
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
        let currentToken = token;
        if (data.token) {
          localStorage.setItem('aura_token', data.token);
          setToken(data.token);
          currentToken = data.token;
        }
        if (data.username) {
          localStorage.setItem('aura_username', data.username);
        }
        // Refresh matching cards since profile MBTI changed
        const cardsRes = await fetch('/api/cards', {
          headers: { 'x-user-token': currentToken }
        });
        if (cardsRes.ok) setCards(await cardsRes.json());
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.error || "Failed to update profile." };
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      return { success: false, error: "Connection error. Please try again." };
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col lg:flex-row relative" id="applet-root">
      
      {/* 1. Desktop Left Sidebar Navigation (Sticky Sidebar on Desktop) */}
      <aside className="hidden lg:flex w-64 border-r border-neutral-150 dark:border-neutral-800 bg-white dark:bg-neutral-900 h-screen sticky top-0 flex-col justify-between p-6 shrink-0 z-40">
        <div className="space-y-8 text-left">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-linear-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-pink-500/10 shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-black font-display tracking-tight leading-none bg-linear-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">AURA</h1>
              <span className="text-[9px] font-bold text-pink-500 tracking-wider uppercase font-mono">Intentional & verified</span>
            </div>
          </div>

          {/* User profile information capsule */}
          {profile && (
            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/60">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/20 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{profile.name}</span>
                  {profile.isPremium && (
                    <span className="px-1 text-[8px] font-mono font-black uppercase rounded tracking-wider bg-amber-100 text-amber-700 shrink-0">✦</span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate font-mono">{profile.mbti} • {profile.occupation || "Product Designer"}</p>
              </div>
            </div>
          )}

          {/* Vertical Menu Items */}
          <nav className="flex flex-col gap-1.5" id="desktop-sidebar-nav">
            <button
              onClick={() => setActiveTab('discover')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'discover' 
                  ? 'bg-pink-500 text-white shadow-md font-extrabold' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-850'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Discover Match Deck</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('chats');
                if (matches.length > 0 && !activeMatchId) {
                  setActiveMatchId(matches[0].id);
                }
              }}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'chats' 
                  ? 'bg-pink-500 text-white shadow-md font-extrabold' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-850'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Inbox Messages</span>
              </div>
              {matches.length > 0 && (
                <span className="w-2 h-2 bg-pink-500 rounded-full shrink-0" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'verify' 
                  ? 'bg-pink-500 text-white shadow-md font-extrabold' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-850'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Liveness Verification</span>
              {profile?.isVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-current shrink-0 ml-auto" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-pink-500 text-white shadow-md font-extrabold' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-850'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>My Profile Settings</span>
            </button>
          </nav>
        </div>

        {/* Footer actions of Desktop Sidebar */}
        <div className="space-y-4">
          {/* Simulation Spark Trigger */}
          <button
            onClick={handleSimulatePush}
            className="w-full py-2.5 px-3 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/20 dark:hover:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-150 dark:border-pink-900/30 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs font-sans"
            title="Simulate background push match spark"
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>Simulate Push Spark</span>
          </button>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
            {/* Theme Selector */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl transition cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-500" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-400" />
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 p-2.5 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl transition cursor-pointer text-xs font-bold"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Page Layout Area (Header Navigation on Mobile, Sidebar layout on Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Decorative Aura background colors */}
        <div className="absolute top-0 right-0 w-[45vw] h-[45vw] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[45vw] h-[45vw] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header Navigation (Mobile & Tablet) */}
        <header className="lg:hidden bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 py-3 md:py-4 px-4 md:px-6 sticky top-0 z-40 backdrop-blur-md/90 shadow-xs" id="applet-header">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-start">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-linear-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-pink-500/10">
                <Flame className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              </div>
              <div className="text-left flex items-center gap-2">
                <div>
                  <h1 className="text-base md:text-lg font-black font-display tracking-tight leading-none bg-linear-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">AURA</h1>
                  <span className="text-[8px] md:text-[9px] font-bold text-pink-500 tracking-wider uppercase font-mono">Intentional & verified</span>
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
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="grid grid-cols-4 md:flex md:items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl w-full md:w-auto" id="nav-tabs-deck">
                <button
                  onClick={() => setActiveTab('discover')}
                  className={`px-2 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition flex items-center justify-start md:justify-center gap-1 md:gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeTab === 'discover' 
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  id="tab-discover"
                >
                  <Compass className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                  <span>Discover</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('chats');
                    if (matches.length > 0 && !activeMatchId) {
                      setActiveMatchId(matches[0].id);
                    }
                  }}
                  className={`px-2 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition flex items-center justify-start md:justify-center gap-1 md:gap-1.5 relative cursor-pointer whitespace-nowrap ${
                    activeTab === 'chats' 
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  id="tab-chats"
                >
                  <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                  <span>Chats</span>
                  {matches.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 md:top-1 md:right-1 w-2 h-2 bg-pink-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('verify')}
                  className={`px-2 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition flex items-center justify-start md:justify-center gap-1 md:gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeTab === 'verify' 
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  id="tab-verify"
                >
                  <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                  <span>Verify</span>
                  {profile?.isVerified && (
                    <CheckCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500 fill-current shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-2 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition flex items-center justify-start md:justify-center gap-1 md:gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeTab === 'profile' 
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                  id="tab-profile"
                >
                  <User className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                  <span>Profile</span>
                </button>
              </div>

              {/* Header Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="hidden md:block p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 rounded-xl transition cursor-pointer"
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
                className="hidden md:flex items-center justify-center p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 rounded-xl transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Container Workspace */}
        <main className={`flex-1 w-full mx-auto px-4 pt-6 md:pt-8 transition-all duration-300 ${activeTab === 'chats' ? 'max-w-7xl' : 'max-w-5xl'}`} id="applet-main-workspace">
        <AnimatePresence mode="wait">
          {activeTab === 'discover' && (
            <motion.div
              key="discover-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              {/* Discovery Mode Switcher Toggle */}
              <div className="flex justify-center max-w-md mx-auto" id="discover-mode-toggle-container">
                <div className="bg-neutral-150 dark:bg-neutral-800/80 p-1 rounded-2xl flex w-full border border-neutral-200/30 dark:border-neutral-700/30 shadow-xs">
                  <button
                    onClick={() => setDiscoverMode('swipe')}
                    className={`flex-grow py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      discoverMode === 'swipe'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                    }`}
                    id="discover-mode-swipe-btn"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-500 fill-current animate-pulse" />
                    <span>Spark Swiper</span>
                  </button>
                  <button
                    onClick={() => setDiscoverMode('search')}
                    className={`flex-grow py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      discoverMode === 'search'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                    }`}
                    id="discover-mode-search-btn"
                  >
                    <Search className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Explore & Search</span>
                  </button>
                </div>
              </div>

              {discoverMode === 'swipe' ? (
                /* Classic Swiper View */
                cards.length > 0 ? (
                  <SwipeCard
                    card={cards[0]}
                    onSwipe={(direction) => handleSwipe(cards[0].id, direction)}
                    onStartChatWithIcebreaker={handleStartChatWithIcebreaker}
                    onBlockUser={handleUserBlockedOrReported}
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
                )
              ) : (
                /* Enhanced Explore & Search View */
                <div className="space-y-6" id="search-explorer-workspace">
                  {/* Search and Filters Hub */}
                  <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-xs space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Search Bar */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search users by name, bio, occupation, or tag..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                          id="search-input-field"
                        />
                      </div>

                      {/* Interest Quick Filter Tag */}
                      <div className="relative md:w-64">
                        <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          value={searchInterest}
                          onChange={(e) => setSearchInterest(e.target.value)}
                          placeholder="Filter interest (e.g. Chess)"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                          id="search-interest-field"
                        />
                      </div>
                    </div>

                    {/* Horizontal Select Filters */}
                    <div className="flex flex-wrap gap-4 pt-1 items-center justify-between">
                      <div className="flex flex-wrap gap-4">
                        {/* Gender Filter */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">Gender:</span>
                          <select
                            value={searchGender}
                            onChange={(e) => setSearchGender(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-indigo-500 text-xs bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 font-medium"
                            id="search-gender-select"
                          >
                            <option value="everyone">Everyone</option>
                            <option value="female">Women</option>
                            <option value="male">Men</option>
                          </select>
                        </div>

                        {/* MBTI Filter */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">MBTI:</span>
                          <select
                            value={searchMbti}
                            onChange={(e) => setSearchMbti(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-indigo-500 text-xs bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 font-medium"
                            id="search-mbti-select"
                          >
                            <option value="">All Archetypes</option>
                            <option value="INFJ">INFJ (Advocate)</option>
                            <option value="ENFP">ENFP (Campaigner)</option>
                            <option value="INTJ">INTJ (Architect)</option>
                            <option value="ESFP">ESFP (Performer)</option>
                            <option value="INFP">INFP (Mediator)</option>
                            <option value="ENFJ">ENFJ (Protagonist)</option>
                            <option value="ESTP">ESTP (Entrepreneur)</option>
                            <option value="ISTJ">ISTJ (Inspector)</option>
                          </select>
                        </div>
                      </div>

                      {/* Hot Tags Shortcut */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono mr-1">Trending:</span>
                        {['Reading', 'Chess', 'Photography', 'Cooking', 'Music'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSearchInterest(searchInterest === tag ? '' : tag)}
                            className={`px-2.5 py-1 text-[10px] rounded-lg border font-semibold transition cursor-pointer ${
                              searchInterest === tag
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200'
                                : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-500 dark:text-neutral-400 border-neutral-150 dark:border-neutral-750'
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Results Container */}
                  {isSearching ? (
                    /* Pulsing Skeleton Loaders */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full" id="search-shimmer-grid">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 space-y-4 animate-pulse">
                          <div className="aspect-[4/3] bg-neutral-150 dark:bg-neutral-800 rounded-2xl w-full" />
                          <div className="h-4 bg-neutral-150 dark:bg-neutral-800 rounded-full w-2/3" />
                          <div className="h-3 bg-neutral-100 dark:bg-neutral-850 rounded-full w-1/2" />
                          <div className="flex gap-2">
                            <div className="h-6 bg-neutral-100 dark:bg-neutral-850 rounded-full w-16" />
                            <div className="h-6 bg-neutral-100 dark:bg-neutral-850 rounded-full w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    /* Search results Grid of beautiful cards */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" id="search-results-deck">
                      {searchResults.map((user) => {
                        const isMatch = matches.some((m) => m.profile.id === user.id);
                        return (
                          <div
                            key={user.id}
                            className="group bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-neutral-200/50 dark:hover:border-neutral-700/50 transition duration-300 flex flex-col text-left space-y-4 relative"
                          >
                            {/* Card Header with image */}
                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setSelectedSearchProfile(user); fetchSearchCompatibilityReport(user.id); }}>
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              
                              {/* Match Score Badge */}
                              <div className="absolute top-3 right-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs border border-pink-50/50 dark:border-pink-950/20">
                                <Sparkles className="w-3 h-3 text-pink-500 fill-current" />
                                <span className="text-[10px] font-black font-mono text-pink-600 dark:text-pink-400">{user.compatibilityScore || 85}% Match</span>
                              </div>

                              {/* Verified User and MBTI badge */}
                              <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                                <span className="text-white text-base font-black font-display tracking-tight drop-shadow-sm">{user.name}, {user.age}</span>
                                {user.isVerified && <CheckCircle className="w-4 h-4 text-blue-400 fill-current" />}
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="flex-grow space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md font-mono">{user.mbti} Archetype</span>
                                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-[150px]">{user.occupation}</span>
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed h-8">
                                {user.bio}
                              </p>

                              {/* Tag highlighting */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {user.interests.map((interest, idx) => {
                                  const isSearched = searchInterest && interest.toLowerCase().includes(searchInterest.toLowerCase());
                                  return (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 text-[10px] rounded-lg font-medium border transition ${
                                        isSearched
                                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200'
                                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-transparent'
                                      }`}
                                    >
                                      #{interest}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                              <button
                                onClick={() => { setSelectedSearchProfile(user); fetchSearchCompatibilityReport(user.id); }}
                                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer flex-grow text-center"
                              >
                                View Insights
                              </button>

                              {isMatch ? (
                                <button
                                  onClick={() => {
                                    const m = matches.find((match) => match.profile.id === user.id);
                                    if (m) {
                                      setActiveTab('chats');
                                      setActiveMatchId(m.id);
                                    }
                                  }}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Chat
                                </button>
                              ) : user.swiped === 'right' ? (
                                <span className="px-3 py-2 text-pink-500 bg-pink-50 dark:bg-pink-950/20 text-xs font-bold rounded-xl flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5 fill-current animate-pulse" />
                                  Liked
                                </span>
                              ) : user.swiped === 'left' ? (
                                <span className="px-3 py-2 text-neutral-400 bg-neutral-50 dark:bg-neutral-850 text-xs font-bold rounded-xl">
                                  Passed
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSearchConnect(user.id, 'right')}
                                  className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-xs hover:shadow-md"
                                  title="Send a Spark to connect!"
                                >
                                  <Heart className="w-3.5 h-3.5" />
                                  Connect
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Search results are empty */
                    <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-4" id="search-empty-state">
                      <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-850 text-neutral-400 dark:text-neutral-500 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-7 h-7 stroke-1" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold font-display text-neutral-900 dark:text-neutral-100">No Aligned Minds Found</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          We could not find any available profiles matching those parameters. Try clearing your search text or choosing other MBTI archetypes.
                        </p>
                      </div>
                      <button
                        onClick={() => { setSearchQuery(''); setSearchMbti(''); setSearchInterest(''); }}
                        className="px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium rounded-xl text-xs transition cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Interactive Profile Discovery Modal overlay */}
              <AnimatePresence>
                {selectedSearchProfile && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="search-detail-modal-overlay">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-8 max-h-[85vh]"
                    >
                      {/* Image header with close button */}
                      <div className="relative aspect-[4/3] overflow-hidden shrink-0">
                        <img
                          src={selectedSearchProfile.avatarUrl}
                          alt={selectedSearchProfile.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        
                        {/* Close button */}
                        <button
                          onClick={() => setSelectedSearchProfile(null)}
                          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="absolute top-4 left-4 bg-pink-500 text-white text-[11px] font-black font-mono px-3 py-1.5 rounded-xl shadow-xs border border-pink-400/20">
                          {selectedSearchProfile.compatibilityScore}% Synergy
                        </div>

                        {/* Name label */}
                        <div className="absolute bottom-4 left-5 text-white text-left space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-2xl font-black font-display tracking-tight">{selectedSearchProfile.name}, {selectedSearchProfile.age}</h3>
                            {selectedSearchProfile.isVerified && <CheckCircle className="w-5 h-5 text-blue-400 fill-current" />}
                          </div>
                          <p className="text-xs text-neutral-300 font-medium font-mono">{selectedSearchProfile.mbti} Archetype • {selectedSearchProfile.occupation}</p>
                        </div>
                      </div>

                      {/* Modal Content - Scrollable */}
                      <div className="p-6 text-left space-y-5 overflow-y-auto flex-1">
                        {/* Bio Story */}
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">My Story</h4>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">{selectedSearchProfile.bio}</p>
                        </div>

                        {/* Interests */}
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">Interests & Vibes</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSearchProfile.interests.map((tag) => (
                              <span key={tag} className="px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs rounded-xl font-medium border border-neutral-100 dark:border-neutral-700/40">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* AI Synergy Report section */}
                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                              AI Aura Synergy Report
                            </h4>
                            <span className="text-[9px] font-mono font-bold bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded">POWERED BY GEMINI</span>
                          </div>

                          {searchReportState === 'loading' && (
                            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-850/60 flex flex-col items-center justify-center space-y-2 text-center py-8">
                              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Consulting AI alignment matrices...</span>
                            </div>
                          )}

                          {searchReportState === 'failed' && (
                            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-150 text-center text-xs text-red-600 dark:text-red-400">
                              Failed to generate alignment report. Please try again.
                            </div>
                          )}

                          {searchReportState === 'success' && searchCompatibilityReport && (
                            <div className="space-y-4">
                              {/* AI Analysis Card */}
                              <div className="bg-indigo-50/40 dark:bg-indigo-950/15 p-4 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans whitespace-pre-line text-left">
                                {searchCompatibilityReport}
                              </div>

                              {/* Icebreakers helper */}
                              {searchIcebreakers.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Suggested AI Conversation Icebreakers</h5>
                                  <div className="space-y-2">
                                    {searchIcebreakers.map((ice, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-neutral-50 dark:bg-neutral-950/40 hover:bg-neutral-100 dark:hover:bg-neutral-900 p-3 rounded-xl border border-neutral-100 dark:border-neutral-850 text-xs text-neutral-700 dark:text-neutral-300 transition text-left flex justify-between items-center gap-2 group/ice cursor-pointer"
                                        onClick={() => {
                                          navigator.clipboard.writeText(ice);
                                          triggerPushNotification("Icebreaker Copied!", "Copied message to clipboard.");
                                        }}
                                      >
                                        <p className="flex-1 leading-relaxed font-medium">"{ice}"</p>
                                        <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover/ice:opacity-100 transition shrink-0">Tap to Copy</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Modal Footer actions */}
                      <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between gap-3 shrink-0">
                        <button
                          onClick={() => {
                            handleSearchConnect(selectedSearchProfile.id, 'left');
                            setSelectedSearchProfile(null);
                          }}
                          className="px-5 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-2xl transition cursor-pointer flex-1"
                        >
                          Pass Profile
                        </button>

                        <button
                          onClick={() => {
                            handleSearchConnect(selectedSearchProfile.id, 'right');
                            setSelectedSearchProfile(null);
                            triggerPushNotification("Connection Request Sent", `You connected with ${selectedSearchProfile.name}!`);
                          }}
                          className="px-5 py-3 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex-1 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                          Connect & Spark
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
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
                onBlockUser={handleUserBlockedOrReported}
                onNewMessageNotification={triggerPushNotification}
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
      </div>

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

      {/* Real-time Simulated Push Notification Banner */}
      <AnimatePresence>
        {pushNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[100]"
          >
            <div 
              onClick={() => {
                if (pushNotification.onClick) pushNotification.onClick();
                setPushNotification(null);
              }}
              className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800 shadow-2xl rounded-2xl p-3.5 flex items-start gap-3 text-left cursor-pointer hover:border-pink-500/20 transition relative animate-pulse-subtle"
            >
              {pushNotification.avatarUrl ? (
                <img
                  src={pushNotification.avatarUrl}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-pink-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 fill-current" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-sans flex items-center gap-1.5">
                  <span>{pushNotification.title}</span>
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping" />
                </h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-normal mt-0.5 line-clamp-2 font-medium">
                  {pushNotification.body}
                </p>
              </div>

              {/* Dismiss X button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPushNotification(null);
                }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-850 rounded-full text-neutral-400 hover:text-neutral-600 transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
