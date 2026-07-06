import React, { useState } from 'react';
import { MatchProfile } from '../types';
import { Sparkles, Heart, X, CheckCircle, Info, RefreshCw, MessageSquare, ArrowRight, Clipboard, Check, Shield, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SwipeCardProps {
  card: MatchProfile & { compatibilityScore?: number };
  onSwipe: (direction: 'left' | 'right') => void;
  onStartChatWithIcebreaker?: (matchProfileId: string, text: string) => void;
  onBlockUser?: (profileId: string) => void;
}

export default function SwipeCard({ card, onSwipe, onStartChatWithIcebreaker, onBlockUser }: SwipeCardProps) {
  const [reportState, setReportState] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [showBlockOptions, setShowBlockOptions] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [blockReason, setBlockReason] = useState('Spam / Fake Account');

  const handleBlockUser = async (isReport: boolean) => {
    try {
      const endpoint = isReport ? '/api/report' : '/api/block';
      const body = isReport ? { profileId: card.id, reason: blockReason } : { profileId: card.id };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': localStorage.getItem('aura_token') || ''
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        onSwipe('left');
        setShowBlockOptions(false);
        setIsReporting(false);
        onBlockUser?.(card.id);
      }
    } catch (err) {
      console.error("Error blocking/reporting user:", err);
    }
  };
  const [compatibilityReport, setCompatibilityReport] = useState<string | null>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchCompatibilityReport = async () => {
    setReportState('loading');
    try {
      const res = await fetch(`/api/compatibility/${card.id}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      
      setCompatibilityReport(data.report);
      setIcebreakers(data.icebreakers || []);
      setReportState('success');
    } catch (err) {
      console.error(err);
      setReportState('failed');
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="max-w-md mx-auto space-y-6" id={`swipe-card-${card.id}`}>
      {/* Primary Profile Card */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        {/* Cover Image & Compatibility badge */}
        <div className="relative aspect-[4/4] overflow-hidden">
          <img
            src={card.avatarUrl}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            referrerPolicy="no-referrer"
            id={`profile-card-image-${card.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Compatibility score badge (Top-Right) */}
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm border border-pink-100/50 dark:border-pink-950/40">
            <Sparkles className="w-4 h-4 text-pink-500 fill-current animate-pulse" />
            <span className="text-xs font-black font-mono text-pink-600 dark:text-pink-400">{card.compatibilityScore || 85}% Aura Match</span>
          </div>

          {/* Name and Occupation (Bottom) */}
          <div className="absolute bottom-5 left-5 right-5 text-white text-left space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-2xl font-black font-display tracking-tight leading-tight">{card.name}, {card.age}</h3>
              {card.isVerified && (
                <CheckCircle className="w-5 h-5 text-blue-400 fill-current" title="Verified Profile" />
              )}
              <span className="px-2 py-0.5 bg-white/15 backdrop-blur text-[10px] rounded font-mono font-bold tracking-wider">{card.mbti}</span>
            </div>
            <p className="text-sm text-neutral-200 font-medium">{card.occupation}</p>
          </div>
        </div>

        {/* Info detail and tags */}
        <div className="p-6 text-left space-y-5 flex-1">
          {/* Bio text */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">My Story</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">{card.bio}</p>
          </div>

          {/* Interests tags */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">Interests</h4>
            <div className="flex flex-wrap gap-1.5">
              {card.interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 text-xs rounded-xl font-medium border border-neutral-100 dark:border-neutral-700/50 transition"
                >
                  #{interest}
                </span>
              ))}
            </div>
          </div>

          {/* Custom Personality Match breakdown */}
          <div className="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl p-4 border border-neutral-100/50 dark:border-neutral-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Personality Compatibility Map</span>
              <span className="text-[10px] font-mono font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/20 px-1.5 py-0.5 rounded-full">ALIGNED</span>
            </div>
            
            {/* Simple representation of traits */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
              <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                <span>Socializing:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">{card.personalityAnswers.social > 0 ? 'Outgoing' : 'Reserved'}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                <span>Problem Solving:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">{card.personalityAnswers.creative > 0 ? 'Creative' : 'Sensing'}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                <span>Adaptation:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">{card.personalityAnswers.planning > 0 ? 'Structured' : 'Spontaneous'}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100/60 dark:border-neutral-800/40 pb-1">
                <span>General Pace:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">{card.personalityAnswers.energy > 0 ? 'High Energy' : 'Quiet Calm'}</span>
              </div>
            </div>
          </div>

          {/* Gemini Personality Report Accordion */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-850" id="gemini-report-wrapper">
            {reportState === 'idle' && (
              <button
                onClick={fetchCompatibilityReport}
                className="w-full bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/20 dark:hover:bg-pink-950/40 text-pink-600 dark:text-pink-400 font-bold py-3 px-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-pink-100/50 dark:border-pink-900/30 shadow-xs"
                id={`btn-generate-report-${card.id}`}
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Analyze Alignment with Gemini AI
              </button>
            )}

            {reportState === 'loading' && (
              <div className="bg-neutral-50/50 dark:bg-neutral-950/40 rounded-2xl p-4 border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-2.5 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-pink-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold font-display">Structuring Aura Analysis...</span>
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">Running psychological personality matching engine...</p>
              </div>
            )}

            {reportState === 'success' && compatibilityReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 bg-gradient-to-br from-pink-50/20 via-white to-neutral-50/20 dark:from-pink-950/10 dark:via-neutral-900 dark:to-neutral-950/10 rounded-2xl p-5 border border-pink-100/40 dark:border-pink-950/20 text-left"
              >
                <div className="flex items-center gap-2 text-pink-600 border-b border-pink-100 dark:border-pink-950/20 pb-2.5">
                  <Sparkles className="w-4 h-4 fill-current" />
                  <h5 className="text-xs font-black font-display uppercase tracking-wider text-pink-500">Aura Compatibility Report</h5>
                </div>
                
                <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-2.5 font-sans" id="compatibility-report-text">
                  {compatibilityReport.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {/* Icebreakers section */}
                {icebreakers.length > 0 && (
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-850 space-y-2.5" id="icebreakers-section">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">AI Spark Starters (Click to copy & start)</span>
                    <div className="space-y-2">
                      {icebreakers.map((starter, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (onStartChatWithIcebreaker) {
                              onStartChatWithIcebreaker(card.id, starter);
                            } else {
                              handleCopy(starter, i);
                            }
                          }}
                          className="flex items-start gap-2.5 p-2.5 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-xl cursor-pointer text-xs transition group text-neutral-600 dark:text-neutral-350 hover:text-neutral-900 dark:hover:text-neutral-100"
                        >
                          <span className="font-mono text-[9px] font-bold text-pink-500 bg-pink-50/50 dark:bg-pink-950/20 px-1.5 py-0.5 rounded shrink-0">#{i+1}</span>
                          <span className="flex-1 leading-normal font-medium">{starter}</span>
                          <div className="text-neutral-400 group-hover:text-pink-500 transition shrink-0 p-1">
                            {copiedIndex === i ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {reportState === 'failed' && (
              <p className="text-[10px] text-red-500 font-medium py-1">⚠️ Unable to generate compatibility report. Please check API settings or try again.</p>
            )}

            {/* Block / Report Actions */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-850 flex flex-col gap-2.5">
              {!showBlockOptions ? (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-400 dark:text-neutral-500 font-sans">Is this profile matching your standards?</span>
                  <button
                    type="button"
                    onClick={() => setShowBlockOptions(true)}
                    className="text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Block / Report</span>
                  </button>
                </div>
              ) : (
                <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl p-3.5 space-y-3 text-left">
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs font-display">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Safety Options for {card.name}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReporting(false)}
                      className={`flex-grow py-1.5 px-3 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        !isReporting 
                          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-950' 
                          : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      Block User
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsReporting(true)}
                      className={`flex-grow py-1.5 px-3 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        isReporting 
                          ? 'bg-red-600 text-white border-red-600' 
                          : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      Report & Block
                    </button>
                  </div>

                  {isReporting && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Select Reason</label>
                      <select
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs bg-white dark:bg-neutral-800 dark:text-neutral-100 focus:outline-hidden cursor-pointer"
                      >
                        <option value="Spam / Fake Account">Spam / Fake Account</option>
                        <option value="Inappropriate Profile Details">Inappropriate Profile Details</option>
                        <option value="Harassment / Offensive Behavior">Harassment / Offensive Behavior</option>
                        <option value="Underage User">Underage User</option>
                        <option value="Other">Other Reason</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowBlockOptions(false)}
                      className="px-3 py-1.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-lg text-[10px] text-neutral-500 font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBlockUser(isReporting)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      Confirm {isReporting ? 'Report' : 'Block'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Swipe Actions Deck (Pass / Like) */}
      <div className="flex justify-center items-center gap-5" id="swipe-controls">
        <button
          onClick={() => onSwipe('left')}
          className="w-14 h-14 rounded-full bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center transition shadow-sm hover:shadow-md cursor-pointer group hover:scale-105 active:scale-95"
          title="Pass profile"
          id="btn-swipe-pass"
        >
          <X className="w-6 h-6 group-hover:rotate-[-12deg] transition" />
        </button>

        <button
          onClick={() => onSwipe('right')}
          className="w-16 h-16 rounded-full bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 flex items-center justify-center transition shadow-md hover:shadow-lg cursor-pointer group hover:scale-105 active:scale-95 border-2 border-transparent hover:border-pink-500/20"
          title="Send a Like"
          id="btn-swipe-like"
        >
          <Heart className="w-7 h-7 text-pink-500 fill-current group-hover:scale-110 transition" />
        </button>
      </div>
    </div>
  );
}
