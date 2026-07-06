import React, { useState, useEffect, useRef } from 'react';
import { Match, ChatMessage, UserProfile } from '../types';
import { Send, Clock, CheckCircle, ShieldAlert, Sparkles, MessageSquare, ArrowLeft, Loader2, Mic, Image, Paperclip, X, Crown, Trash2, MicOff, Camera, Info, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VoicePlayer from './VoicePlayer';

interface ChatRoomProps {
  matches: Match[];
  activeMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
  onSendMessage: (matchId: string, text: string) => void;
  onBackToMatches?: () => void;
  userProfile: UserProfile | null;
  onBlockUser?: (profileId: string) => void;
}

export default function ChatRoom({
  matches,
  activeMatchId,
  onSelectMatch,
  onSendMessage,
  onBackToMatches,
  userProfile,
  onBlockUser
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isUserTypingRef = useRef<boolean>(false);

  const activeMatch = matches.find((m) => m.id === activeMatchId);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileReportState, setProfileReportState] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [profileCompatibilityReport, setProfileCompatibilityReport] = useState<string | null>(null);
  const [profileIcebreakers, setProfileIcebreakers] = useState<string[]>([]);

  // Block / Report States
  const [chatBlockModalOpen, setChatBlockModalOpen] = useState(false);
  const [isReportingChat, setIsReportingChat] = useState(false);
  const [chatBlockReason, setChatBlockReason] = useState('Spam / Fake Account');

  const handleBlockChatPartner = async () => {
    if (!activeMatch) return;
    try {
      const endpoint = isReportingChat ? '/api/report' : '/api/block';
      const body = isReportingChat 
        ? { profileId: activeMatch.profile.id, reason: chatBlockReason } 
        : { profileId: activeMatch.profile.id };
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': localStorage.getItem('aura_token') || ''
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setChatBlockModalOpen(false);
        if (onBlockUser) {
          onBlockUser(activeMatch.profile.id);
        }
      }
    } catch (err) {
      console.error("Error blocking chat partner:", err);
    }
  };

  // Reset local typing indicator states and profile modal states when switching active match
  useEffect(() => {
    setIsTyping(false);
    isUserTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setProfileModalOpen(false);
    setProfileCompatibilityReport(null);
    setProfileIcebreakers([]);
    setProfileReportState('idle');
  }, [activeMatchId]);

  // Sync compatibility report for profile modal
  useEffect(() => {
    if (profileModalOpen && activeMatch) {
      if (activeMatch.profile.compatibilityReport) {
        setProfileCompatibilityReport(activeMatch.profile.compatibilityReport);
        setProfileReportState('success');
      } else {
        const fetchReport = async () => {
          setProfileReportState('loading');
          try {
            const res = await fetch(`/api/compatibility/${activeMatch.profile.id}`);
            if (!res.ok) throw new Error("Failed to load report");
            const data = await res.json();
            setProfileCompatibilityReport(data.report);
            setProfileIcebreakers(data.icebreakers || []);
            setProfileReportState('success');
            // Cache it locally so it displays instantly next time
            activeMatch.profile.compatibilityReport = data.report;
          } catch (err) {
            console.error(err);
            setProfileReportState('failed');
          }
        };
        fetchReport();
      }
    }
  }, [profileModalOpen, activeMatchId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Send real-time typing state to WebSocket server
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (!isUserTypingRef.current && val.trim().length > 0) {
        isUserTypingRef.current = true;
        socketRef.current.send(JSON.stringify({
          type: 'typing',
          matchId: activeMatchId,
          isTyping: true
        }));
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 1.5s of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (isUserTypingRef.current) {
          isUserTypingRef.current = false;
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'typing',
              matchId: activeMatchId,
              isTyping: false
            }));
          }
        }
      }, 1500);
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [premiumUpsellOpen, setPremiumUpsellOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const isPremiumUser = !!userProfile?.isPremium;

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!isPremiumUser) {
      setPremiumUpsellOpen(true);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert blob to base64 to store in simple db
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            sendVoiceMessage(base64data, recordingDuration || 4);
          };

          // Release mic tracks
          stream.getTracks().forEach(track => track.stop());
        };

        setIsRecording(true);
        setRecordingDuration(0);
        setIsSimulated(false);
        mediaRecorder.start();

        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else {
        throw new Error("navigator.mediaDevices not supported");
      }
    } catch (err) {
      console.warn("Camera/mic iframe restriction or browser block. Triggering elegant virtual recording studio fallback.", err);
      // Fall back to a beautiful mock/simulated recording
      setIsRecording(true);
      setRecordingDuration(0);
      setIsSimulated(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = (cancel = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (isSimulated) {
      setIsRecording(false);
      setIsSimulated(false);
      if (!cancel) {
        // High fidelity demo clip: SoundHelix elegant acoustic snippet
        const simulatedAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        sendVoiceMessage(simulatedAudioUrl, recordingDuration || 5);
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (cancel) {
        // Discard
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      } else {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  const sendVoiceMessage = async (audioUrl: string, durationSec: number) => {
    if (!activeMatchId) return;

    const textDescription = `🎙️ Voice Note (${durationSec}s)`;
    
    // Optimistic message on state
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      matchId: activeMatchId,
      senderId: 'user',
      text: textDescription,
      createdAt: Date.now(),
      mediaUrl: audioUrl,
      mediaType: 'audio',
      voiceDuration: durationSec,
    };
    setMessages(prev => [...prev, tempMsg]);
    setIsTyping(true);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        matchId: activeMatchId,
        text: textDescription,
        mediaUrl: audioUrl,
        mediaType: 'audio',
        voiceDuration: durationSec,
      }));
    } else {
      try {
        const res = await fetch(`/api/chat/${activeMatchId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-token': localStorage.getItem('aura_token') || ''
          },
          body: JSON.stringify({
            text: textDescription,
            mediaUrl: audioUrl,
            mediaType: 'audio',
            voiceDuration: durationSec,
          }),
        });
        if (res.ok) {
          fetchMessages();
        }
      } catch (err) {
        console.error("Error sending voice note:", err);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      sendMediaMessage(base64data, file.name || "Custom Snap 📸");
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
    setMediaModalOpen(false);
  };

  const sendMediaMessage = async (imageUrl: string, description: string) => {
    if (!activeMatchId) return;

    const textDescription = `📸 ${description}`;
    
    // Optimistic message
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      matchId: activeMatchId,
      senderId: 'user',
      text: textDescription,
      createdAt: Date.now(),
      mediaUrl: imageUrl,
      mediaType: 'image',
    };
    setMessages(prev => [...prev, tempMsg]);
    setIsTyping(true);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        matchId: activeMatchId,
        text: textDescription,
        mediaUrl: imageUrl,
        mediaType: 'image',
      }));
    } else {
      try {
        const res = await fetch(`/api/chat/${activeMatchId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-token': localStorage.getItem('aura_token') || ''
          },
          body: JSON.stringify({
            text: textDescription,
            mediaUrl: imageUrl,
            mediaType: 'image',
          }),
        });
        if (res.ok) {
          fetchMessages();
        }
      } catch (err) {
        console.error("Error sending media message:", err);
      }
    }
  };

  // Poll for countdowns and update relative times
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // REST API Fallback Fetcher
  const fetchMessages = async () => {
    if (!activeMatchId) return;
    try {
      const res = await fetch(`/api/chat/${activeMatchId}`, {
        headers: {
          'x-user-token': localStorage.getItem('aura_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (data.length > 0 && data[data.length - 1].senderId !== 'user') {
          setIsTyping(false);
        }
      }
    } catch (err) {
      console.error("Error fetching messages via REST fallback:", err);
    }
  };

  // WebSocket Connection Handler with robust auto-reconnect
  useEffect(() => {
    if (!activeMatchId) return;

    // Fetch initial messages instantly via REST to avoid any delay
    fetchMessages();

    let reconnectTimeoutId: any;
    let ws: WebSocket;

    function connect() {
      if (!activeMatchId) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log("Connecting to live WebSocket at:", wsUrl);
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established!");
        setWsConnected(true);
        // Join the specific match channel
        ws.send(JSON.stringify({ 
          type: 'join', 
          matchId: activeMatchId,
          token: localStorage.getItem('aura_token') || ''
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'history') {
            setMessages(data.messages);
          } else if (data.type === 'message') {
            const newMsg = data.message;
            // De-duplicate messages
            setMessages((prev) => {
              const cleanPrev = prev.filter(m => !m.id.startsWith('temp_'));
              const exists = cleanPrev.some((m) => m.id === newMsg.id);
              if (exists) return cleanPrev;
              return [...cleanPrev, newMsg];
            });
            setIsTyping(false);
          } else if (data.type === 'typing') {
            if (data.senderId !== 'user') {
              setIsTyping(data.isTyping);
            }
          }
        } catch (err) {
          console.error("Error handling WebSocket message payload:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed. Retrying in 5 seconds...");
        setWsConnected(false);
        reconnectTimeoutId = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.warn("WebSocket connection error. Gracefully handling via HTTP polling fallback.");
        setWsConnected(false);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeoutId);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [activeMatchId]);

  // Fallback Polling Handler (triggers automatically if WebSocket is not connected or drops)
  useEffect(() => {
    if (!activeMatchId || wsConnected) return;

    console.log("WebSocket is offline. Activating secure, high-frequency HTTP polling fallback...");
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [activeMatchId, wsConnected]);

  // Scroll to bottom when messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeMatchId) return;

    // Reset typing states and timeouts immediately when message is sent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isUserTypingRef.current) {
      isUserTypingRef.current = false;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'typing',
          matchId: activeMatchId,
          isTyping: false
        }));
      }
    }

    const textToSend = inputText;
    setInputText('');

    // Send on UI thread if parent callback exists
    if (onSendMessage) {
      onSendMessage(activeMatchId, textToSend);
    }

    // Call state update instantly on client with optimistic message
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      matchId: activeMatchId,
      senderId: 'user',
      text: textToSend,
      createdAt: Date.now()
    };
    setMessages(prev => [...prev, tempMsg]);
    setIsTyping(true);

    // If WebSocket is active, send via WebSocket. Otherwise, fall back to HTTP.
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        matchId: activeMatchId,
        text: textToSend
      }));
    } else {
      try {
        const res = await fetch(`/api/chat/${activeMatchId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-token': localStorage.getItem('aura_token') || ''
          },
          body: JSON.stringify({ text: textToSend }),
        });
        if (res.ok) {
          fetchMessages();
        }
      } catch (err) {
        console.error("Error sending message via fallback:", err);
      }
    }
  };

  // Helper: Format milliseconds into a high-contrast ticking timer (HH:MM:SS)
  const EXPIRY_MS = isPremiumUser ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const formatTimeLeft = (createdAt: number) => {
    const elapsed = currentTime - createdAt;
    const timeLeft = EXPIRY_MS - elapsed;

    if (timeLeft <= 0) return "Expired";

    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  // Helper: Calculate progress percentage of message life
  const getProgressPercent = (createdAt: number) => {
    const elapsed = currentTime - createdAt;
    return Math.max(0, Math.min(100, ((EXPIRY_MS - elapsed) / EXPIRY_MS) * 100));
  };

  // Filter out any messages that physically expired (older than EXPIRY_MS)
  const unexpiredMessages = messages.filter(
    (msg) => currentTime - msg.createdAt < EXPIRY_MS
  );

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] min-h-[500px] lg:max-h-[850px] flex" id="chat-room-container">
      {/* Matches Sidebar (Left side on desktop, hidden on active chat on mobile) */}
      <div className={`w-full lg:w-80 border-r border-neutral-100 dark:border-neutral-800 flex flex-col bg-neutral-50/20 dark:bg-neutral-950/20 ${activeMatchId ? 'hidden lg:flex' : 'flex'}`} id="chat-sidebar">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-1.5 text-left">
          <h3 className="text-base font-bold font-display text-neutral-900 dark:text-neutral-100">Intentional Chats</h3>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium leading-relaxed">
            Chats completely dissolve after <span className="text-pink-600 font-bold">{isPremiumUser ? '48 hours' : '24 hours'}</span>. Focus, connect, and move to real-life plans.
          </p>
        </div>

        {/* Matches lists */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1" id="sidebar-matches-list">
          {matches.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 text-neutral-400">
              <MessageSquare className="w-8 h-8 mx-auto stroke-1 text-neutral-300" />
              <div className="space-y-1">
                <p className="text-xs font-semibold">No matches yet</p>
                <p className="text-[10px] text-neutral-400">Swipe right on compatible profiles to start conversations.</p>
              </div>
            </div>
          ) : (
            matches.map((match) => {
              const profile = match.profile;
              const hasLastMsg = match.lastMessage;
              const isMatchActive = match.id === activeMatchId;

              return (
                <button
                  key={match.id}
                  onClick={() => onSelectMatch(match.id)}
                  className={`w-full text-left p-3 rounded-2xl transition flex items-center gap-3 cursor-pointer ${
                    isMatchActive ? 'bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100/30 dark:border-pink-900/20' : 'hover:bg-white dark:hover:bg-neutral-800/40 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white dark:ring-neutral-900"
                      referrerPolicy="no-referrer"
                    />
                    {profile.isVerified && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white p-0.5 rounded-full border border-white flex items-center justify-center">
                        <CheckCircle className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 tracking-tight block truncate">{profile.name}</span>
                      <span className="text-[9px] font-mono font-semibold text-pink-600 dark:text-pink-400">
                        {profile.mbti}
                      </span>
                    </div>

                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-medium">
                      {hasLastMsg ? hasLastMsg.text : `Matched! Say hello...`}
                    </p>

                    {/* Expire bar ticking in sidebar */}
                    <div className="flex items-center gap-1 pt-1">
                      <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      <span className="text-[8px] font-mono font-bold text-amber-600 dark:text-amber-500">
                        {formatTimeLeft(match.lastMessage ? match.lastMessage.createdAt : match.matchedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Feed Area (Right side) */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-neutral-900 ${!activeMatchId ? 'hidden lg:flex items-center justify-center text-center p-8 text-neutral-400 dark:text-neutral-500' : 'flex'}`} id="chat-workspace">
        {activeMatch ? (
          <>
            {/* Header */}
            <div className="p-2 sm:p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/20 gap-1 sm:gap-3" id="chat-room-header">
              <div className="flex items-center gap-1.5 sm:gap-3 text-left min-w-0">
                {onBackToMatches && (
                  <button
                    onClick={onBackToMatches}
                    className="lg:hidden p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 mr-0.5 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-80 transition cursor-pointer group min-w-0"
                  title={`Click to view ${activeMatch.profile.name}'s Profile`}
                  id="view-partner-profile-header-trigger"
                >
                  <div className="relative shrink-0">
                    <img
                      src={activeMatch.profile.avatarUrl}
                      alt={activeMatch.profile.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 group-hover:scale-105 transition"
                      referrerPolicy="no-referrer"
                    />
                    {activeMatch.profile.isVerified && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white p-0.5 rounded-full border border-white flex items-center justify-center">
                        <CheckCircle className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition truncate max-w-[65px] xs:max-w-[100px] sm:max-w-none">{activeMatch.profile.name}</span>
                      <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.2 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded text-[8px] sm:text-[9px] font-mono font-bold">{activeMatch.profile.mbti}</span>
                      {wsConnected ? (
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold font-mono tracking-wider">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                          <span className="hidden xs:inline">LIVE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 text-[8px] font-bold font-mono tracking-wider">
                          <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                          <span className="hidden xs:inline">OFFLINE</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-[75px] xs:max-w-[120px] sm:max-w-xs">{activeMatch.profile.occupation}</p>
                  </div>
                </button>
              </div>

              {/* View Profile Action button & Ticking header timer */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center justify-center w-7 h-7 sm:w-auto sm:px-3 sm:py-1.5 bg-neutral-100 hover:bg-neutral-205 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-xl transition cursor-pointer text-xs font-bold border border-neutral-200/40 dark:border-neutral-700/50"
                  title="View Match Profile"
                  id="view-profile-action-btn"
                >
                  <Info className="w-3.5 h-3.5 text-pink-500" />
                  <span className="hidden sm:inline">View Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsReportingChat(false);
                    setChatBlockModalOpen(true);
                  }}
                  className="flex items-center justify-center w-7 h-7 sm:w-auto sm:px-3 sm:py-1.5 bg-red-50 hover:bg-red-105 dark:bg-red-950/20 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 rounded-xl transition cursor-pointer text-xs font-bold border border-red-100/40 dark:border-red-950/20"
                  title="Block or Report user"
                  id="chat-block-btn"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline ml-1">Block / Report</span>
                </button>

                <div className="flex flex-col items-end text-right">
                  <span className="hidden sm:inline text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Chat Life</span>
                  <div className="flex items-center gap-1 text-amber-600 font-mono text-[10px] sm:text-xs font-black bg-amber-50 dark:bg-amber-950/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-100 dark:border-amber-900/30">
                    <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-pulse" />
                    <span>{formatTimeLeft(activeMatch.lastMessage ? activeMatch.lastMessage.createdAt : activeMatch.matchedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages scroll area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-5 bg-neutral-50/50 dark:bg-neutral-950/10" id="chat-messages-scroll">
              <div className="mx-auto max-w-xs bg-amber-50/80 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl text-center flex items-start gap-2 text-[10px] font-semibold leading-relaxed mb-4">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <p>
                  To promote meaningful and immediate sparks, chats dissolve after 24h. Save contact info if you both vibe!
                </p>
              </div>

              {unexpiredMessages.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 font-mono text-[10px]">
                  No active messages yet. Make the first move! 🌸
                </div>
              ) : (
                unexpiredMessages.map((msg) => {
                  const isMe = msg.senderId === 'user';
                  const timePercent = getProgressPercent(msg.createdAt);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="max-w-[75%] space-y-1">
                        <div
                          className={`p-3.5 lg:p-4 rounded-2xl text-xs lg:text-sm font-medium leading-relaxed text-left ${
                            isMe
                              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 rounded-br-none shadow-xs'
                              : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-bl-none shadow-xs'
                          }`}
                        >
                          {msg.mediaType === 'audio' && msg.mediaUrl ? (
                            <VoicePlayer url={msg.mediaUrl} duration={msg.voiceDuration} isMe={isMe} />
                          ) : msg.mediaType === 'image' && msg.mediaUrl ? (
                            <div className="space-y-2">
                              <div className="rounded-xl overflow-hidden max-w-[280px]">
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.text || "Attached Lifestyle Photo"}
                                  className="w-full h-auto object-cover rounded-xl"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <p className="text-[11px] opacity-90">{msg.text}</p>
                            </div>
                          ) : (
                            <p>{msg.text}</p>
                          )}
                        </div>
                        
                        {/* Time until message dissolves */}
                        <div className="flex items-center justify-between gap-3 px-1">
                          <span className="text-[8px] text-neutral-400 dark:text-neutral-500 font-mono font-semibold">
                            Expires in: {formatTimeLeft(msg.createdAt)}
                          </span>
                          
                          {/* Micro horizontal progress bar of message life */}
                          <div className="w-12 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                timePercent > 50 ? 'bg-emerald-500' : timePercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${timePercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bouncy Typing indicator */}
              {isTyping && (
                <div className="flex flex-col items-start gap-1" id="typing-indicator">
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl rounded-bl-none shadow-xs flex items-center gap-2.5">
                    <div className="flex items-center gap-1 shrink-0">
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                        className="w-1.5 h-1.5 bg-pink-500 rounded-full"
                      />
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                        className="w-1.5 h-1.5 bg-pink-500 rounded-full"
                      />
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                        className="w-1.5 h-1.5 bg-pink-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 font-display">
                      {activeMatch.profile.name} is composing a message...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="p-4 lg:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative">
              {isRecording ? (
                // Recording visual bar
                <div className="flex items-center justify-between bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40 px-4 py-3 rounded-2xl animate-pulse" id="voice-recording-bar">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 font-mono">
                      RECORDING {isSimulated ? '(VIRTUAL STUDIO)' : 'LIVE'} [{recordingDuration}s]
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stopRecording(true)}
                      className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      id="cancel-record-btn"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => stopRecording(false)}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                      id="send-record-btn"
                    >
                      Send Note
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2 items-center" id="chat-input-form">
                  {/* Media Attachment Button */}
                  <button
                    type="button"
                    onClick={() => isPremiumUser ? setMediaModalOpen(true) : setPremiumUpsellOpen(true)}
                    className={`p-2 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 transition shrink-0 cursor-pointer ${
                      isPremiumUser ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500 hover:text-amber-500 dark:hover:text-amber-450 hover:border-amber-200'
                    }`}
                    title="Share Media"
                    id="media-attach-btn"
                  >
                    <Image className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                  </button>

                  {/* Microphone Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    className={`p-2 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 transition shrink-0 cursor-pointer ${
                      isPremiumUser ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500 hover:text-indigo-500 dark:hover:text-indigo-450 hover:border-indigo-200'
                    }`}
                    title="Send Voice Note"
                    id="voice-note-btn"
                  >
                    <Mic className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder={`Send a secure disappearing chat to ${activeMatch.profile.name}...`}
                    className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-[11px] sm:text-xs bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100 min-w-0"
                    id="chat-input-field"
                  />
                  <button
                    type="submit"
                    className="p-2 sm:p-3 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                    id="chat-send-btn"
                  >
                    <Send className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
                  </button>
                </form>
              )}

              {/* Media Selection Popup */}
              {mediaModalOpen && (
                <div className="absolute bottom-16 left-4 right-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 z-50 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200" id="media-popup">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 font-display flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-pink-500" />
                      Premium Media Studio
                    </span>
                    <button type="button" onClick={() => setMediaModalOpen(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Direct upload */}
                  <div>
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-pink-500 dark:hover:border-pink-500 py-3.5 rounded-xl cursor-pointer transition text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-50/50 dark:bg-neutral-800/50">
                      <Paperclip className="w-4 h-4 text-pink-500 animate-pulse" />
                      Upload Photo from Device
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>

                  {/* Preset dating lifestyle images */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block text-left">Curated Lifestyle Snaps</span>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { name: "Coffee Date ☕", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80", desc: "Enjoying an aesthetic morning brew." },
                        { name: "Sunset 🌅", url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=400&q=80", desc: "Cozy drinks over an incredible rooftop sunset." },
                        { name: "Vinyls 🎶", url: "https://images.unsplash.com/photo-1484755560695-a4c7402a50e9?auto=format&fit=crop&w=400&q=80", desc: "Flipping through classic vinyls." },
                        { name: "Picnic 🧀", url: "https://images.unsplash.com/photo-1464226184884-fa280b87c3aa?auto=format&fit=crop&w=400&q=80", desc: "Cheese boards and scenic park picnics." },
                        { name: "Museum 🎨", url: "https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=400&q=80", desc: "Soaking in modern art vibes." },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            sendMediaMessage(item.url, item.desc);
                            setMediaModalOpen(false);
                          }}
                          className="group relative rounded-lg overflow-hidden h-14 border border-neutral-100 dark:border-neutral-800 hover:border-pink-500 transition cursor-pointer"
                        >
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover transition duration-300 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-neutral-900/45 flex items-center justify-center p-0.5 opacity-90">
                            <span className="text-[8px] text-white font-bold text-center leading-tight">{item.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Upsell Overlay Modal */}
            <AnimatePresence>
              {premiumUpsellOpen && (
                <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl max-w-sm w-full p-6 border border-neutral-100 shadow-2xl text-center space-y-5"
                  >
                    <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-pink-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
                      <Crown className="w-6 h-6 fill-current animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-black font-display text-neutral-900">Unlock Premium Chat Features</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Voice Notes and Lifestyle Media features are exclusively reserved for <strong className="text-amber-600">Aura Gold</strong> and <strong className="text-indigo-600">Aura Infinite</strong> members.
                      </p>
                    </div>

                    <div className="bg-neutral-50 rounded-2xl p-4.5 space-y-2.5 text-left border border-neutral-100">
                      <div className="flex items-start gap-2.5 text-xs">
                        <CheckCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-neutral-800">Gold & Infinite Plans Only</p>
                          <p className="text-[10px] text-neutral-500">Record rich, intimate voice messages and send high-fidelity photographs.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs">
                        <CheckCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-neutral-800">Double 48-Hour Chat Expiry</p>
                          <p className="text-[10px] text-neutral-500">Extend disappearing conversations up to 48 hours for relaxed messaging.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                      <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                        💡 Switch to the <strong className="text-amber-950 font-bold">My Profile</strong> tab at the top of the app, and upgrade inside the Membership Storefront!
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPremiumUpsellOpen(false)}
                        className="flex-1 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-500 text-xs font-bold transition cursor-pointer"
                      >
                        Maybe Later
                      </button>
                      <button
                        type="button"
                        onClick={() => setPremiumUpsellOpen(false)}
                        className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition shadow-md shadow-neutral-950/10 cursor-pointer"
                      >
                        Got It
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Profile Detail Overlay Modal */}
            <AnimatePresence>
              {profileModalOpen && activeMatch && (
                <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-2xl flex flex-col text-left"
                    id="partner-profile-modal"
                  >
                    {/* Header Image */}
                    <div className="relative h-56 shrink-0 bg-neutral-100 dark:bg-neutral-950">
                      <img
                        src={activeMatch.profile.avatarUrl}
                        alt={activeMatch.profile.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-black/30 to-transparent"></div>
                      
                      {/* Close button */}
                      <button
                        type="button"
                        onClick={() => setProfileModalOpen(false)}
                        className="absolute top-4 right-4 p-2 bg-neutral-900/60 hover:bg-neutral-900/80 text-white rounded-full backdrop-blur-xs transition cursor-pointer flex items-center justify-center"
                        id="close-profile-modal-btn"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Name & Title on Image bottom */}
                      <div className="absolute bottom-4 left-5 right-5 text-white space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-black font-display tracking-tight leading-tight">
                            {activeMatch.profile.name}, {activeMatch.profile.age}
                          </h3>
                          {activeMatch.profile.isVerified && (
                            <CheckCircle className="w-5 h-5 text-blue-400 fill-current" />
                          )}
                          <span className="px-2 py-0.5 bg-white/20 backdrop-blur text-[10px] rounded font-mono font-bold tracking-wider">
                            {activeMatch.profile.mbti}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-200 font-medium">
                          {activeMatch.profile.occupation}
                        </p>
                      </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6" id="profile-modal-scrollable">
                      {/* Story */}
                      <div className="space-y-1.5 text-left">
                        <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">My Story</h4>
                        <p className="text-xs text-neutral-650 dark:text-neutral-300 leading-relaxed font-sans">
                          {activeMatch.profile.bio}
                        </p>
                      </div>

                      {/* Interests */}
                      <div className="space-y-2 text-left">
                        <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">Interests</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {activeMatch.profile.interests.map((interest, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs rounded-xl font-medium border border-neutral-100 dark:border-neutral-700/50"
                            >
                              #{interest}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Personality Compatibility Map */}
                      <div className="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl p-4 border border-neutral-100/50 dark:border-neutral-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 font-display">Personality Compatibility Map</span>
                          <span className="text-[10px] font-mono font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/20 px-1.5 py-0.5 rounded-full">
                            {activeMatch.profile.compatibilityScore || 85}% MATCH
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                          <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                            <span>Socializing:</span>
                            <span className="font-mono text-neutral-800 dark:text-neutral-200">
                              {activeMatch.profile.personalityAnswers?.social > 0 ? 'Outgoing' : 'Reserved'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                            <span>Problem Solving:</span>
                            <span className="font-mono text-neutral-800 dark:text-neutral-200">
                              {activeMatch.profile.personalityAnswers?.creative > 0 ? 'Creative' : 'Sensing'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                            <span>Adaptation:</span>
                            <span className="font-mono text-neutral-800 dark:text-neutral-200">
                              {activeMatch.profile.personalityAnswers?.planning > 0 ? 'Structured' : 'Spontaneous'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                            <span>General Pace:</span>
                            <span className="font-mono text-neutral-800 dark:text-neutral-200">
                              {activeMatch.profile.personalityAnswers?.energy > 0 ? 'High Energy' : 'Quiet Calm'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Gemini Compatibility Report */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
                        <div className="flex items-center gap-2 text-pink-600 pb-1">
                          <Sparkles className="w-4 h-4 fill-current animate-pulse shrink-0" />
                          <h5 className="text-xs font-black font-display uppercase tracking-wider text-pink-500">
                            Aura Compatibility Analysis
                          </h5>
                        </div>

                        {profileReportState === 'loading' && (
                          <div className="bg-neutral-50/50 dark:bg-neutral-950/40 rounded-2xl p-4 border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-2 animate-pulse">
                            <div className="flex items-center justify-center gap-2 text-pink-600">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span className="text-xs font-bold font-display">Structuring Analysis...</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">Running psychological personality matching engine...</p>
                          </div>
                        )}

                        {profileReportState === 'failed' && (
                          <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
                            Failed to generate psychological compatibility report. Please try again.
                          </div>
                        )}

                        {profileReportState === 'success' && profileCompatibilityReport && (
                          <div className="space-y-4 text-left">
                            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans bg-pink-50/10 dark:bg-pink-950/5 p-4 rounded-2xl border border-pink-100/20">
                              {profileCompatibilityReport}
                            </p>

                            {/* Conversation Icebreakers */}
                            {profileIcebreakers.length > 0 && (
                              <div className="space-y-2">
                                <h6 className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">Suggested Icebreakers</h6>
                                <div className="space-y-1.5">
                                  {profileIcebreakers.map((icebreaker, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        setInputText(icebreaker);
                                        setProfileModalOpen(false);
                                      }}
                                      className="w-full text-left p-2.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-pink-50/45 dark:hover:bg-pink-950/20 text-neutral-700 dark:text-neutral-200 hover:text-pink-600 dark:hover:text-pink-400 text-xs rounded-xl transition font-medium border border-neutral-100 dark:border-neutral-750 flex items-center justify-between gap-2 text-left cursor-pointer"
                                    >
                                      <span className="truncate">{icebreaker}</span>
                                      <span className="text-[9px] font-bold text-pink-500 shrink-0">Use 💬</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end shrink-0 bg-neutral-50/10 dark:bg-neutral-900/40">
                      <button
                        type="button"
                        onClick={() => setProfileModalOpen(false)}
                        className="px-5 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Back to Chat
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Block / Report Safety Modal */}
            <AnimatePresence>
              {chatBlockModalOpen && activeMatch && (
                <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-2xl flex flex-col text-left p-6 space-y-4"
                    id="chat-block-modal"
                  >
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
                      <h3 className="text-base font-bold font-display">
                        Block or Report {activeMatch.profile.name}?
                      </h3>
                    </div>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
                      Blocking will completely dissolve your match with {activeMatch.profile.name} and clear all conversation history. This action is irreversible.
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsReportingChat(false)}
                        className={`flex-grow py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          !isReportingChat 
                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-950' 
                            : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        Block Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReportingChat(true)}
                        className={`flex-grow py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isReportingChat 
                            ? 'bg-red-600 text-white border-red-600' 
                            : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        Report & Block
                      </button>
                    </div>

                    {isReportingChat && (
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono block">
                          Reason for Reporting
                        </label>
                        <select
                          value={chatBlockReason}
                          onChange={(e) => setChatBlockReason(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100 focus:outline-hidden cursor-pointer"
                        >
                          <option value="Spam / Fake Account">Spam / Fake Account</option>
                          <option value="Inappropriate Profile Details">Inappropriate Profile Details</option>
                          <option value="Harassment / Offensive Behavior">Harassment / Offensive Behavior</option>
                          <option value="Underage User">Underage User</option>
                          <option value="Other">Other Reason</option>
                        </select>
                      </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setChatBlockModalOpen(false)}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockChatPartner}
                        className="px-4.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                      >
                        Confirm {isReportingChat ? 'Report' : 'Block'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="space-y-4 max-w-sm" id="chat-fallback">
            <div className="w-14 h-14 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <MessageSquare className="w-6 h-6 stroke-1.5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-display text-neutral-800">Select a Conversation</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Choose an aligned mind from your active swiped matches. Build intentional rapport before the 24h cycle dissolves.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
