import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Briefcase, Award, Heart, HelpCircle, Save, Sliders, CheckCircle, RotateCcw, Crown, Sparkles, Zap, Check, LogOut, Sun, Moon, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileEditProps {
  profile: UserProfile;
  onUpdate: (updated: Partial<UserProfile>) => void;
  onResetDb: () => void;
  onSignOut?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function ProfileEdit({ profile, onUpdate, onResetDb, onSignOut, darkMode, setDarkMode }: ProfileEditProps) {
  const handleUpgrade = async (plan: 'none' | 'gold' | 'infinite') => {
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-token': localStorage.getItem('aura_token') || ''
        },
        body: JSON.stringify({ plan })
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        onUpdate(updatedProfile);
      }
    } catch (err) {
      console.error("Error upgrading subscription:", err);
    }
  };

  const [formData, setFormData] = useState({
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    lookingFor: profile.lookingFor,
    bio: profile.bio,
    occupation: profile.occupation,
    interests: profile.interests.join(', '),
  });

  const [answers, setAnswers] = useState<number[]>([
    profile.personalityAnswers.social ?? 0,
    profile.personalityAnswers.creative ?? 0,
    profile.personalityAnswers.planning ?? 0,
    profile.personalityAnswers.energy ?? 0,
    profile.personalityAnswers.convention ?? 0,
  ]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(profile.avatarUrl);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  const questions = [
    { label: "Introverted vs. Extraverted", left: "Introvert (Quiet, Reflector)", right: "Extravert (Expressive, Connector)" },
    { label: "Sensing vs. Intuition", left: "Sensing (Realistic, Practical)", right: "Intuition (Creative, Big-Picture)" },
    { label: "Thinking vs. Feeling", left: "Thinking (Objective, Analytical)", right: "Feeling (Empathetic, Values-Driven)" },
    { label: "Judging vs. Perceiving", left: "Judging (Organized, Planned)", right: "Perceiving (Spontaneous, Adaptive)" },
    { label: "Traditional vs. Rebel", left: "Classic (Traditional, Grounded)", right: "Modern (Rebellious, Original)" },
  ];

  const handleSliderChange = (index: number, val: number) => {
    const updated = [...answers];
    updated[index] = val;
    setAnswers(updated);
  };

  // Derive MBTI type from personality sliders
  const deriveMbti = (ans: number[]) => {
    const i_e = ans[0] >= 0 ? 'E' : 'I';
    const s_n = ans[1] >= 0 ? 'N' : 'S';
    const t_f = ans[2] >= 0 ? 'F' : 'T';
    const j_p = ans[3] >= 0 ? 'J' : 'P';
    return `${i_e}${s_n}${t_f}${j_p}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');

    const mbti = deriveMbti(answers);

    const updatedProfile: Partial<UserProfile> = {
      name: formData.name,
      age: Number(formData.age),
      gender: formData.gender,
      lookingFor: formData.lookingFor,
      bio: formData.bio,
      occupation: formData.occupation,
      interests: formData.interests.split(',').map(s => s.trim()).filter(Boolean),
      mbti,
      personalityAnswers: {
        social: answers[0],
        creative: answers[1],
        planning: answers[2],
        energy: answers[3],
        convention: answers[4],
      }
    };

    onUpdate(updatedProfile);

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800000 / 1000000 ? 500 : 500); // quick delay
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" id="profile-edit-container">
      {/* Profile summary card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-center gap-6" id="profile-summary-header">
        <div className="relative group/avatar">
          <button
            type="button"
            onClick={() => {
              setSelectedAvatarUrl(profile.avatarUrl);
              setCustomAvatarInput(profile.avatarUrl || '');
              setAvatarModalOpen(true);
            }}
            className="block relative focus:outline-hidden cursor-pointer rounded-full overflow-hidden"
            title="Edit Profile Picture"
          >
            <img
              src={profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-pink-500/10 transition group-hover/avatar:ring-pink-500/30 group-hover/avatar:scale-105 duration-300"
              referrerPolicy="no-referrer"
              id="profile-user-avatar"
            />
            <div className="absolute inset-0 bg-neutral-950/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition duration-300">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          {profile.isVerified && (
            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm flex items-center justify-center z-10" title="Video Verified Profile" id="profile-verified-check">
              <CheckCircle className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>
        
        <div className="text-center md:text-left space-y-1 flex-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 className="text-2xl font-bold font-display text-neutral-900 dark:text-neutral-100" id="profile-user-name">{profile.name}, {profile.age}</h2>
            <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full text-xs font-mono font-medium" id="profile-mbti-tag">{profile.mbti}</span>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm" id="profile-user-role">{profile.occupation || "Product Designer"}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-2" id="profile-interests-wrap">
            {profile.interests.map((interest, idx) => (
              <span key={idx} className="px-2.5 py-0.5 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 text-xs rounded-full font-medium">#{interest}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Interface Theme Selection */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between animate-in fade-in duration-350" id="profile-theme-toggle-section">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-800 text-pink-500 rounded-2xl flex items-center justify-center shrink-0">
            {darkMode ? (
              <Moon className="w-5 h-5 text-indigo-400 fill-indigo-400/15" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500 fill-amber-500/15" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">Interface Theme</h3>
            <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500">Toggle between light and dark visual aesthetics</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="px-3.5 py-2 bg-neutral-150 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-neutral-200/40 dark:border-neutral-700/50 shrink-0"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Premium Membership Storefront */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-5" id="profile-subscription-store">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-neutral-100">Aura Premium Membership</h3>
          </div>
          {profile.isPremium ? (
            <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse">
              Active: {profile.subscriptionPlan === 'infinite' ? '👑 Infinite VIP' : '✦ Aura Gold'}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full text-xs font-medium">
              Free Account
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Upgrade your Aura profile to stand out from the ordinary, keep your disappearing conversations active for longer, and unlock limitless compatibility diagnostics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4" id="subscription-plans-grid">
          {/* Plan 1: Free */}
          <div 
            onClick={() => handleUpgrade('none')}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition relative cursor-pointer ${
              !profile.isPremium || profile.subscriptionPlan === 'none' || !profile.subscriptionPlan
                ? 'border-neutral-900 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-md'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-800 dark:text-neutral-300 hover:bg-neutral-50/50 dark:hover:bg-neutral-850/50'
            }`}
          >
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Free Tier</h4>
              <p className="text-[10px] opacity-75">Standard Aura experience</p>
              <div className="text-lg font-black font-display">$0 <span className="text-[10px] font-normal opacity-70">/ month</span></div>
              <ul className="text-[10px] space-y-1.5 pt-2 opacity-90">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-pink-500 shrink-0" />
                  <span>24-Hour chat expiry</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-pink-500 shrink-0" />
                  <span>Standard compatibility reports</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-pink-500 shrink-0" />
                  <span>Manual video verification</span>
                </li>
              </ul>
            </div>
            {(!profile.isPremium || profile.subscriptionPlan === 'none' || !profile.subscriptionPlan) && (
              <div className="mt-4 text-center text-[10px] font-bold bg-white/20 py-1.5 rounded-lg">
                CURRENT PLAN
              </div>
            )}
          </div>

          {/* Plan 2: Aura Gold */}
          <div 
            onClick={() => handleUpgrade('gold')}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition relative cursor-pointer ${
              profile.subscriptionPlan === 'gold'
                ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-amber-200 dark:hover:border-amber-900/30 text-neutral-800 dark:text-neutral-300 hover:bg-amber-50/20 dark:hover:bg-amber-950/10'
            }`}
          >
            <div className="absolute top-2 right-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono">
              POPULAR
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <h4 className="font-bold text-sm">Aura Gold</h4>
              </div>
              <p className="text-[10px] opacity-75">Double chat times & custom badges</p>
              <div className="text-lg font-black font-display">$9.99 <span className="text-[10px] font-normal opacity-70">/ month</span></div>
              <ul className="text-[10px] space-y-1.5 pt-2 opacity-90">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="font-bold">48-Hour chat expiry</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Unlimited Gemini AI scans</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Exclusive Gold profile badge</span>
                </li>
              </ul>
            </div>
            {profile.subscriptionPlan === 'gold' ? (
              <div className="mt-4 text-center text-[10px] font-bold bg-white/20 py-1.5 rounded-lg">
                ACTIVE
              </div>
            ) : (
              <button className="mt-4 text-center text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg w-full transition">
                UPGRADE GOLD
              </button>
            )}
          </div>

          {/* Plan 3: Aura Infinite */}
          <div 
            onClick={() => handleUpgrade('infinite')}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition relative cursor-pointer ${
              profile.subscriptionPlan === 'infinite'
                ? 'border-indigo-600 bg-indigo-950 text-white shadow-md ring-2 ring-indigo-500/30'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-indigo-200 dark:hover:border-indigo-900/30 text-neutral-800 dark:text-neutral-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10'
            }`}
          >
            <div className="absolute top-2 right-2 bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono">
              VIP
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-indigo-400 shrink-0" />
                <h4 className="font-bold text-sm">Aura Infinite</h4>
              </div>
              <p className="text-[10px] opacity-75">Instant verification & priority matching</p>
              <div className="text-lg font-black font-display">$19.99 <span className="text-[10px] font-normal opacity-70">/ month</span></div>
              <ul className="text-[10px] space-y-1.5 pt-2 opacity-90">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="font-bold">Instant Video Verified</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>Double 48h chat expiry</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>VIP Priority Placement</span>
                </li>
              </ul>
            </div>
            {profile.subscriptionPlan === 'infinite' ? (
              <div className="mt-4 text-center text-[10px] font-bold bg-white/20 py-1.5 rounded-lg">
                ACTIVE
              </div>
            ) : (
              <button className="mt-4 text-center text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg w-full transition">
                UPGRADE INFINITE
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8" id="profile-form">
        {/* Core details */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-5" id="profile-details-section">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-2">
            <User className="w-5 h-5 text-pink-500" />
            <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-neutral-100">Core Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">First Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                required
                id="profile-input-name"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                min="18"
                max="100"
                required
                id="profile-input-age"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Gender Identity</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                id="profile-select-gender"
              >
                <option value="Male" className="dark:bg-neutral-800">Male</option>
                <option value="Female" className="dark:bg-neutral-800">Female</option>
                <option value="Non-binary" className="dark:bg-neutral-800">Non-binary</option>
                <option value="Agender" className="dark:bg-neutral-800">Agender</option>
                <option value="Genderfluid" className="dark:bg-neutral-800">Genderfluid</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Interested In</label>
              <select
                value={formData.lookingFor}
                onChange={(e) => setFormData({ ...formData, lookingFor: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                id="profile-select-interest"
              >
                <option value="male" className="dark:bg-neutral-800">Men</option>
                <option value="female" className="dark:bg-neutral-800">Women</option>
                <option value="everyone" className="dark:bg-neutral-800">Everyone</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Occupation / Creative Pursuit</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="e.g. Creative Writer, Software Engineer..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
                id="profile-input-occupation"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">About Me (Bio)</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell other intentional matches who you are..."
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm h-24 resize-none bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
              id="profile-input-bio"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Interests (comma separated)</label>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Match trigger keywords</span>
            </div>
            <input
              type="text"
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              placeholder="e.g. Design, Reading, Chess, Hiking, Vinyl"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100"
              id="profile-input-interests"
            />
          </div>
        </div>

        {/* Personality quiz sliders */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6" id="profile-sliders-section">
          <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-pink-500" />
              <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-neutral-100">Aura Personality Quiz</h3>
            </div>
            <span className="px-2 py-0.5 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-full text-[11px] font-mono font-bold" id="profile-current-mbti-preview">
              Result: {deriveMbti(answers)}
            </span>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Our match engine computes mathematical similarity based on these sliders to align you with people of similar (or perfectly contrasting) mindsets.
          </p>

          <div className="space-y-6" id="personality-questions-list">
            {questions.map((q, idx) => (
              <div key={idx} className="space-y-2 text-left">
                <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  <span>{q.label}</span>
                  <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-850 px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400">
                    {answers[idx] > 0 ? `+${answers[idx]}` : answers[idx]}
                  </span>
                </div>
                
                <input
                  type="range"
                  min="-5"
                  max="5"
                  value={answers[idx]}
                  onChange={(e) => handleSliderChange(idx, Number(e.target.value))}
                  className="w-full accent-pink-500 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
                
                <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                  <span className={answers[idx] < 0 ? "text-pink-600 dark:text-pink-400 font-bold" : ""}>{q.left}</span>
                  <span className={answers[idx] > 0 ? "text-pink-600 dark:text-pink-400 font-bold" : ""}>{q.right}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4" id="profile-action-buttons">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="flex-grow bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 disabled:bg-neutral-600 dark:disabled:bg-neutral-850 text-white dark:text-neutral-900 font-semibold py-3 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
            id="profile-submit-btn"
          >
            <Save className="w-4 h-4" />
            {saveStatus === 'saving' ? 'Saving changes...' : saveStatus === 'saved' ? 'Saved Successfully!' : 'Save & Align Matches'}
          </button>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="px-5 py-3 border border-red-100 dark:border-red-950/40 hover:border-red-200 text-red-500 hover:text-red-600 dark:text-red-400 font-semibold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer text-sm bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40"
              id="profile-signout-btn"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (window.confirm("This will reset all swipes, conversations, verification state, and restore default mock profiles. Proceed?")) {
                onResetDb();
              }
            }}
            className="px-5 py-3 border border-neutral-200 dark:border-neutral-800 hover:border-red-200 dark:hover:border-red-900/30 text-neutral-400 dark:text-neutral-500 font-semibold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer text-sm bg-white dark:bg-neutral-900"
            id="profile-reset-btn"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo
          </button>
        </div>
      </form>

      {/* Profile Picture Selection Overlay Modal */}
      <AnimatePresence>
        {avatarModalOpen && (
          <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-2xl flex flex-col text-left"
              id="avatar-picker-modal"
            >
              {/* Header */}
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-pink-500" />
                  <h3 className="text-base font-bold font-display text-neutral-900 dark:text-neutral-100">
                    Customize Profile Picture
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-500 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable presets and Custom link form */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Active Selection Preview */}
                <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-950/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800/60">
                  <img
                    src={selectedAvatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-pink-500/20"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Avatar Preview</h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-mono truncate max-w-full">
                      {selectedAvatarUrl}
                    </p>
                  </div>
                </div>

                {/* Grid list of curated presets */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">
                    Select Curated Aesthetic Presets
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80", label: "Aesthetic" },
                      { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80", label: "Classic" },
                      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80", label: "Cheerful" },
                      { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80", label: "Smiling" },
                      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80", label: "Vibrant" },
                      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80", label: "Professional" },
                      { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80", label: "Elegant" },
                      { url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80", label: "Confident" },
                    ].map((avatar, idx) => {
                      const isSelected = selectedAvatarUrl === avatar.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedAvatarUrl(avatar.url)}
                          className={`relative aspect-square rounded-2xl overflow-hidden group cursor-pointer transition ring-2 ${
                            isSelected 
                              ? "ring-pink-500 ring-offset-2 dark:ring-offset-neutral-900 scale-95" 
                              : "ring-transparent hover:ring-neutral-200 dark:hover:ring-neutral-700"
                          }`}
                        >
                          <img
                            src={avatar.url}
                            alt={avatar.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-500/15 flex items-center justify-center backdrop-blur-[1px]">
                              <div className="bg-pink-500 text-white p-1 rounded-full shadow-md">
                                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom URL Input Field */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">
                    Or Enter Custom Image URL
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customAvatarInput}
                      onChange={(e) => {
                        setCustomAvatarInput(e.target.value);
                        setSelectedAvatarUrl(e.target.value);
                      }}
                      placeholder="Paste any web image URL (e.g., Unsplash, Pinterest)..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-xs bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100 min-w-0"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                    Supports high-quality web URLs starting with <code className="font-mono bg-neutral-50 dark:bg-neutral-950 px-1 rounded">https://</code>.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2.5 shrink-0 bg-neutral-50/10 dark:bg-neutral-900/40">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAvatarUrl) {
                      onUpdate({ avatarUrl: selectedAvatarUrl });
                    }
                    setAvatarModalOpen(false);
                  }}
                  className="px-5 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Save Profile Picture
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
