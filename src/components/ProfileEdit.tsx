import React, { useState, useEffect } from 'react';
import { UserProfile, PaymentMethod } from '../types';
import { User, Briefcase, Award, Heart, HelpCircle, Save, Sliders, CheckCircle, RotateCcw, Crown, Sparkles, Zap, Check, LogOut, Sun, Moon, Camera, X, CreditCard, Plus, Trash2, Lock, Shield, Info, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileEditProps {
  profile: UserProfile;
  onUpdate: (updated: Partial<UserProfile>) => Promise<{ success: boolean; error?: string } | undefined> | void;
  onResetDb: () => void;
  onSignOut?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function ProfileEdit({ profile, onUpdate, onResetDb, onSignOut, darkMode, setDarkMode }: ProfileEditProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'gold' | 'infinite' | null>(null);
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [isManagingPaymentMethods, setIsManagingPaymentMethods] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // New Payment Method Form State
  const [newCard, setNewCard] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
    type: 'card' as 'card' | 'paypal' | 'gpay',
    email: '',
  });

  // Fetch Payment Methods on Mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const res = await fetch('/api/payment-methods', {
          headers: { 'x-user-token': localStorage.getItem('aura_token') || '' }
        });
        if (res.ok) {
          const data = await res.json();
          setPaymentMethods(data);
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
      }
    };
    fetchPaymentMethods();
  }, [profile.subscriptionPlan]); // Refetch if subscription changes

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
        return true;
      } else {
        const errData = await res.json();
        setCheckoutError(errData.error || "Failed to upgrade subscription");
        return false;
      }
    } catch (err) {
      console.error("Error upgrading subscription:", err);
      setCheckoutError("Server error. Please check your connection.");
      return false;
    }
  };

  const handleSelectPlan = (plan: 'none' | 'gold' | 'infinite') => {
    if (plan === 'none') {
      handleUpgrade('none');
    } else {
      setCheckoutPlan(plan);
      setCheckoutError(null);
      setIsCheckoutOpen(true);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let cardBrand = 'Visa';
      const cleanNum = newCard.number.replace(/\s+/g, '');
      if (cleanNum.startsWith('5')) cardBrand = 'Mastercard';
      else if (cleanNum.startsWith('3')) cardBrand = 'Amex';
      else if (cleanNum.startsWith('6')) cardBrand = 'Discover';

      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': localStorage.getItem('aura_token') || ''
        },
        body: JSON.stringify({
          type: newCard.type,
          cardBrand: newCard.type === 'card' ? cardBrand : undefined,
          last4: newCard.type === 'card' ? cleanNum.slice(-4) || '4242' : undefined,
          expiry: newCard.type === 'card' ? newCard.expiry : undefined,
          email: newCard.type === 'paypal' ? newCard.email : undefined
        })
      });

      if (res.ok) {
        const updatedMethods = await res.json();
        setPaymentMethods(updatedMethods);
        setIsAddingPaymentMethod(false);
        setNewCard({
          name: '',
          number: '',
          expiry: '',
          cvc: '',
          type: 'card',
          email: ''
        });
        setCheckoutError(null);
      }
    } catch (err) {
      console.error("Error adding payment method:", err);
    }
  };

  const handleDeletePaymentMethod = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-token': localStorage.getItem('aura_token') || '' }
      });
      if (res.ok) {
        const updatedMethods = await res.json();
        setPaymentMethods(updatedMethods);
      }
    } catch (err) {
      console.error("Error deleting payment method:", err);
    }
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      const res = await fetch('/api/payment-methods/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': localStorage.getItem('aura_token') || ''
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const updatedMethods = await res.json();
        setPaymentMethods(updatedMethods);
      }
    } catch (err) {
      console.error("Error setting default payment method:", err);
    }
  };

  const handleCompleteCheckout = async () => {
    const hasPayment = paymentMethods.length > 0;
    if (!hasPayment) {
      setCheckoutError("Please add a payment method before completing purchase.");
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    // Beautiful payment gateway processing simulation (1.2s)
    setTimeout(async () => {
      const success = await handleUpgrade(checkoutPlan || 'gold');
      setIsProcessingCheckout(false);
      if (success) {
        setIsCheckoutOpen(false);
        setCheckoutPlan(null);
      }
    }, 1200);
  };

  const [formData, setFormData] = useState({
    name: profile.name,
    username: profile.username || localStorage.getItem('aura_username') || '',
    age: profile.age,
    gender: profile.gender,
    lookingFor: profile.lookingFor,
    bio: profile.bio,
    occupation: profile.occupation,
    interests: profile.interests.join(', '),
  });

  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      name: profile.name,
      username: profile.username || localStorage.getItem('aura_username') || '',
      age: profile.age,
      gender: profile.gender,
      lookingFor: profile.lookingFor,
      bio: profile.bio,
      occupation: profile.occupation,
      interests: profile.interests.join(', '),
    });
  }, [profile]);

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
  const [pushEnabled, setPushEnabled] = useState(profile.pushNotificationsEnabled ?? true);

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

  const handleResetSliders = () => {
    setAnswers([0, 0, 0, 0, 0]);
  };

  // Derive MBTI type from personality sliders
  const deriveMbti = (ans: number[]) => {
    const i_e = ans[0] >= 0 ? 'E' : 'I';
    const s_n = ans[1] >= 0 ? 'N' : 'S';
    const t_f = ans[2] >= 0 ? 'F' : 'T';
    const j_p = ans[3] >= 0 ? 'J' : 'P';
    return `${i_e}${s_n}${t_f}${j_p}`;
  };

  const getMbtiInsight = (mbti: string) => {
    const insights: { [key: string]: { title: string; desc: string; match: string; color: string } } = {
      'INFJ': {
        title: "The Advocate",
        desc: "Deeply thoughtful, compassionate, and imaginative. You value profound authenticity, artistic alignments, and long-term meaningful connections.",
        match: "Pairs beautifully with ENFPs and ENFJs for deep intellectual and soul-level synergy.",
        color: "from-purple-500 to-indigo-500"
      },
      'ENFP': {
        title: "The Campaigner",
        desc: "Enthusiastic, creative, and highly social. You bring infectious positive energy, spontaneous fun, and endless curiosity to every conversation.",
        match: "Pairs beautifully with INFJs and INTJs for a perfect balance of imagination and depth.",
        color: "from-pink-500 to-rose-500"
      },
      'INTJ': {
        title: "The Architect",
        desc: "Strategic, analytical, and deeply independent. You align with intense intellectual sparks, shared drive, and deep-dive discussions on complex ideas.",
        match: "Pairs beautifully with ENFPs and ENFJs who appreciate your deep intellectual drive.",
        color: "from-sky-500 to-blue-600"
      },
      'ESFP': {
        title: "The Performer",
        desc: "Vibrant, hands-on, and full of life. You love living in the moment, sharing spontaneous outdoor adventures, music, and beautiful sensory discoveries.",
        match: "Pairs beautifully with ISFJs and ISTJs who ground your adventurous, energetic spirit.",
        color: "from-amber-400 to-orange-500"
      },
      'ENFJ': {
        title: "The Protagonist",
        desc: "Charismatic, empathetic, and inspiring. You naturally lift others up and actively seek partners who value personal growth, mutual encouragement, and warmth.",
        match: "Pairs beautifully with INFPs and INTPs for deep emotional and idealistic synergy.",
        color: "from-teal-500 to-emerald-500"
      },
      'INFP': {
        title: "The Mediator",
        desc: "Poetic, kind-hearted, and idealistic. You search for quiet, authentic, and soulful intimacy where creativity and deep inner values can safely bloom.",
        match: "Pairs beautifully with ENFJs and ENTJs who cherish your kind and visionary nature.",
        color: "from-fuchsia-500 to-pink-500"
      },
      'ESTP': {
        title: "The Entrepreneur",
        desc: "Thrill-seeking, energetic, and highly actionable. You thrive on immediate challenges, active sports, and spontaneous adventures without rigid constraints.",
        match: "Pairs beautifully with ISFJs and ISTJs for shared dynamic action and real-world stability.",
        color: "from-red-400 to-rose-500"
      },
      'ISTJ': {
        title: "The Inspector",
        desc: "Reliable, methodical, and respectful of tradition. You cherish integrity, calm stability, clear organizational plans, and dedicated family or life goals.",
        match: "Pairs beautifully with ESFPs and ESTPs who bring dynamic playfulness to your grounded style.",
        color: "from-neutral-500 to-slate-600"
      },
      'INFPs': {
        title: "The Mediator",
        desc: "Creative, sensitive, and deeply empathetic. You search for deep emotional ties and creative minds.",
        match: "Pairs beautifully with ENFJs.",
        color: "from-fuchsia-500 to-pink-500"
      }
    };
    
    return insights[mbti] || {
      title: "The Aligned Explorer",
      desc: "A rare and highly adaptive personality archetype. You possess a unique balance of traits that allows you to easily understand and align with diverse minds.",
      match: "Pairs beautifully with standard personalities looking for a versatile and open-minded partner.",
      color: "from-pink-500 to-violet-600"
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setUsernameError(null);

    const mbti = deriveMbti(answers);

    const updatedProfile: Partial<UserProfile> = {
      name: formData.name,
      username: formData.username.toLowerCase().trim().replace(/^@/, ''),
      age: Number(formData.age),
      gender: formData.gender,
      lookingFor: formData.lookingFor,
      bio: formData.bio,
      occupation: formData.occupation,
      interests: formData.interests.split(',').map(s => s.trim()).filter(Boolean),
      mbti,
      pushNotificationsEnabled: pushEnabled,
      personalityAnswers: {
        social: answers[0],
        creative: answers[1],
        planning: answers[2],
        energy: answers[3],
        convention: answers[4],
      }
    };

    const result = await onUpdate(updatedProfile);

    if (result && !result.success) {
      setSaveStatus('idle');
      setUsernameError(result.error || "Failed to update profile.");
    } else {
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    }
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
          <p className="text-xs text-pink-500 font-mono font-medium" id="profile-user-handle">@{profile.username || localStorage.getItem('aura_username') || 'username'}</p>
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

      {/* Notifications & Safety Controls */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4 animate-in fade-in duration-350" id="profile-safety-notifications">
        <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-800/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-800 text-pink-500 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-pink-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-display">Notifications & Safety</h3>
              <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500">Manage real-time notifications and block list controls</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {/* Push Toggle */}
          <div className="flex items-center justify-between text-left">
            <div className="space-y-0.5 max-w-[70%]">
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Push Notifications UI</h4>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                Receive top of screen alerts for new compatible matches and incoming message sparks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newVal = !pushEnabled;
                setPushEnabled(newVal);
                onUpdate({ pushNotificationsEnabled: newVal });
              }}
              className={`w-11 h-6 rounded-full transition duration-200 relative shrink-0 cursor-pointer ${
                pushEnabled ? 'bg-pink-500' : 'bg-neutral-250 dark:bg-neutral-800'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 shadow-xs ${
                  pushEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Block list overview */}
          <div className="pt-3 border-t border-neutral-50 dark:border-neutral-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
            <div>
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 font-display">Active Block List</h4>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                You have {profile.blockedUserIds?.length || 0} blocked profile(s) and {profile.reportedUserIds?.length || 0} reported profile(s).
              </p>
            </div>
            {(profile.blockedUserIds?.length || 0) > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Do you want to clear your block list and allow these profiles to reappear?")) {
                    onUpdate({ blockedUserIds: [], reportedUserIds: [] });
                  }
                }}
                className="text-[10px] font-bold text-pink-500 hover:text-pink-600 transition cursor-pointer shrink-0"
              >
                Reset Block List
              </button>
            )}
          </div>
        </div>
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

        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed text-left">
          Upgrade your Aura profile to stand out from the ordinary, keep your disappearing conversations active for longer, and unlock limitless compatibility diagnostics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4" id="subscription-plans-grid">
          {/* Plan 1: Free */}
          <div 
            onClick={() => handleSelectPlan('none')}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition relative cursor-pointer text-left ${
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
            onClick={() => handleSelectPlan('gold')}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition relative cursor-pointer text-left ${
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
              <button type="button" className="mt-4 text-center text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg w-full transition cursor-pointer">
                UPGRADE GOLD
              </button>
            )}
          </div>

          {/* Plan 3: Aura Infinite */}
          <div 
            onClick={() => handleSelectPlan('infinite')}
            className={`border rounded-2xl p-4 flex flex-col justify-between transition relative cursor-pointer text-left ${
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
              <button type="button" className="mt-4 text-center text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg w-full transition cursor-pointer">
                UPGRADE INFINITE
              </button>
            )}
          </div>
        </div>

        {/* Saved billing quick interface */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-850 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-left mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-950/40 text-pink-500 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Subscription Billing Info</h4>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {paymentMethods.length > 0 
                  ? `${paymentMethods.length} Saved payment method(s) on file`
                  : 'No payment methods registered yet'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsManagingPaymentMethods(true)}
            className="px-4 py-2 bg-neutral-200/60 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Manage Payment Methods
          </button>
        </div>
      </div>

      {/* RENDER BILLING AND CHECKOUT MODALS */}
      <AnimatePresence>
        {/* CHECKOUT MODAL OVERLAY */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden text-left z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="font-bold text-base font-display text-neutral-900 dark:text-neutral-100">
                    Aura Checkout
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Plan Summary Badge */}
                <div className="p-4 bg-pink-50/50 dark:bg-pink-950/10 rounded-2xl border border-pink-100/30 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-pink-500 font-mono">SELECTED PLAN</span>
                    <h4 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                      {checkoutPlan === 'infinite' ? '👑 Aura Infinite VIP' : '✦ Aura Gold Plan'}
                    </h4>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Renews monthly. Cancel anytime.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-neutral-900 dark:text-neutral-100 font-display">
                      {checkoutPlan === 'infinite' ? '$19.99' : '$9.99'}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">/ month</span>
                  </div>
                </div>

                {/* Checkout Error */}
                {checkoutError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100/20 text-left flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Saved Payment Methods List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Payment Method</span>
                    {!isAddingPaymentMethod && (
                      <button 
                        type="button"
                        onClick={() => setIsAddingPaymentMethod(true)}
                        className="text-[11px] font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New</span>
                      </button>
                    )}
                  </div>

                  {/* List registered cards */}
                  {!isAddingPaymentMethod && (
                    <div className="space-y-2">
                      {paymentMethods.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-neutral-150 dark:border-neutral-800 rounded-2xl">
                          <CreditCard className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">No payment methods saved yet.</p>
                          <button
                            type="button"
                            onClick={() => setIsAddingPaymentMethod(true)}
                            className="mt-3 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Add First Card
                          </button>
                        </div>
                      ) : (
                        paymentMethods.map((pm) => (
                          <div 
                            key={pm.id}
                            onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                              pm.isDefault 
                                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-850'
                                : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                                {pm.isDefault && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                                )}
                              </div>
                              <div className="text-left">
                                <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block">
                                  {pm.type === 'card' 
                                    ? `${pm.cardBrand} •••• ${pm.last4}`
                                    : pm.type === 'paypal' ? `PayPal (${pm.email})` : 'Google Pay'
                                  }
                                </span>
                                {pm.type === 'card' && (
                                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Expires {pm.expiry}</span>
                                )}
                              </div>
                            </div>
                            {pm.isDefault && (
                              <span className="px-2 py-0.5 bg-pink-500/10 text-pink-500 rounded-full text-[8px] font-bold uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Add payment method panel inside checkout */}
                  {isAddingPaymentMethod && (
                    <form onSubmit={handleAddPaymentMethod} className="bg-neutral-50 dark:bg-neutral-850 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-700/40 pb-2">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Add New Billing Detail</span>
                        <button 
                          type="button" 
                          onClick={() => setIsAddingPaymentMethod(false)}
                          className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Payment Tabs */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewCard({ ...newCard, type: 'card' })}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            newCard.type === 'card' 
                              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-white dark:text-neutral-950'
                              : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          Credit Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewCard({ ...newCard, type: 'paypal' })}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            newCard.type === 'paypal' 
                              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-white dark:text-neutral-950'
                              : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          PayPal
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewCard({ ...newCard, type: 'gpay' })}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            newCard.type === 'gpay' 
                              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-white dark:text-neutral-950'
                              : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          Google Pay
                        </button>
                      </div>

                      {newCard.type === 'card' && (
                        <div className="space-y-2.5">
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Cardholder Name</label>
                            <input
                              type="text"
                              value={newCard.name}
                              onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                              placeholder="e.g. Alex Rivera"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Card Number</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={newCard.number}
                                onChange={(e) => {
                                  const formatted = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                  setNewCard({ ...newCard, number: formatted.slice(0, 19) });
                                }}
                                placeholder="4242 4242 4242 4242"
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                                required
                              />
                              <CreditCard className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-neutral-400 uppercase">Expiry (MM/YY)</label>
                              <input
                                type="text"
                                value={newCard.expiry}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/\D/g, '');
                                  const formatted = clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2, 4)}` : clean;
                                  setNewCard({ ...newCard, expiry: formatted.slice(0, 5) });
                                }}
                                placeholder="12/28"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none text-center"
                                required
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-neutral-400 uppercase">CVC Code</label>
                              <input
                                type="password"
                                value={newCard.cvc}
                                onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                placeholder="•••"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none text-center"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {newCard.type === 'paypal' && (
                        <div className="space-y-2 text-left">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase">PayPal Email Address</label>
                          <input
                            type="email"
                            value={newCard.email}
                            onChange={(e) => setNewCard({ ...newCard, email: e.target.value })}
                            placeholder="your.email@paypal.com"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                            required
                          />
                        </div>
                      )}

                      {newCard.type === 'gpay' && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium rounded-xl border border-emerald-100/10">
                          Google Pay is fully ready. Click the button below to register Google Pay instantly to your Aura subscription profile.
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Register Payment Option
                      </button>
                    </form>
                  )}
                </div>

                {/* Secure Details Banner */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-2xl flex items-start gap-2.5 text-left">
                  <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 block">PCI-DSS Compliant Encryption</span>
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block leading-relaxed">
                      Transactions are cryptographically tokenized. Aura services never save raw CVV code coordinates or complete billing credentials on your device.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 bg-neutral-200/60 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={isProcessingCheckout || paymentMethods.length === 0}
                  onClick={handleCompleteCheckout}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-pink-500/10 cursor-pointer ${
                    isProcessingCheckout || paymentMethods.length === 0
                      ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
                      : 'bg-pink-500 hover:bg-pink-600'
                  }`}
                >
                  {isProcessingCheckout ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                      <span>Processing Purchase...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirm & Upgrade</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* BILLING MANAGER SHEET OVERLAY */}
        {isManagingPaymentMethods && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagingPaymentMethods(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden text-left z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-pink-500" />
                  <h3 className="font-bold text-base font-display text-neutral-900 dark:text-neutral-100">
                    Manage Payment Methods
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsManagingPaymentMethods(false)}
                  className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* List registered cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Your Saved Cards</span>
                    <button 
                      type="button"
                      onClick={() => setIsAddingPaymentMethod(true)}
                      className="text-[11px] font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  </div>

                  {paymentMethods.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-neutral-150 dark:border-neutral-800 rounded-2xl">
                      <CreditCard className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">No payment methods registered yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddingPaymentMethod(true)}
                        className="mt-3 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Add First Payment Method
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentMethods.map((pm) => (
                        <div 
                          key={pm.id}
                          onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                            pm.isDefault 
                              ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-850'
                              : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                              {pm.isDefault && (
                                <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                              )}
                            </div>
                            <div className="text-left">
                              <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block">
                                {pm.type === 'card' 
                                  ? `${pm.cardBrand} •••• ${pm.last4}`
                                  : pm.type === 'paypal' ? `PayPal (${pm.email})` : 'Google Pay'
                                }
                              </span>
                              {pm.type === 'card' && (
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Expires {pm.expiry}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {pm.isDefault && (
                              <span className="px-2 py-0.5 bg-pink-500/10 text-pink-500 rounded-full text-[8px] font-bold uppercase tracking-wider">
                                Default
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeletePaymentMethod(pm.id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-400 hover:text-red-500 transition cursor-pointer"
                              title="Delete Payment Method"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub form within Sheet */}
                {isAddingPaymentMethod && (
                  <form onSubmit={handleAddPaymentMethod} className="bg-neutral-50 dark:bg-neutral-850 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-700/40 pb-2">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">New Payment Method Form</span>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingPaymentMethod(false)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCard({ ...newCard, type: 'card' })}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          newCard.type === 'card' 
                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-white dark:text-neutral-950'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCard({ ...newCard, type: 'paypal' })}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          newCard.type === 'paypal' 
                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-white dark:text-neutral-950'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        PayPal
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCard({ ...newCard, type: 'gpay' })}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          newCard.type === 'gpay' 
                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-white dark:text-neutral-950'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        Google Pay
                      </button>
                    </div>

                    {newCard.type === 'card' && (
                      <div className="space-y-2.5">
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase">Cardholder Name</label>
                          <input
                            type="text"
                            value={newCard.name}
                            onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                            placeholder="Alex Rivera"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase">Card Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newCard.number}
                              onChange={(e) => {
                                const formatted = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                setNewCard({ ...newCard, number: formatted.slice(0, 19) });
                              }}
                              placeholder="4242 4242 4242 4242"
                              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                              required
                            />
                            <CreditCard className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Expiry (MM/YY)</label>
                            <input
                              type="text"
                              value={newCard.expiry}
                              onChange={(e) => {
                                const clean = e.target.value.replace(/\D/g, '');
                                const formatted = clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2, 4)}` : clean;
                                setNewCard({ ...newCard, expiry: formatted.slice(0, 5) });
                              }}
                              placeholder="12/28"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none text-center"
                              required
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">CVC Code</label>
                            <input
                              type="password"
                              value={newCard.cvc}
                              onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              placeholder="•••"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none text-center"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {newCard.type === 'paypal' && (
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase">PayPal Email Address</label>
                        <input
                          type="email"
                          value={newCard.email}
                          onChange={(e) => setNewCard({ ...newCard, email: e.target.value })}
                          placeholder="your.email@paypal.com"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                          required
                        />
                      </div>
                    )}

                    {newCard.type === 'gpay' && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium rounded-xl border border-emerald-100/10">
                        Google Pay registration ready. Submit below to add instant GPay.
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Save Payment Option
                    </button>
                  </form>
                )}
              </div>

              {/* Secure Details Banner */}
              <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 flex items-center justify-between">
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500">
                  Secured with 256-bit AES cryptographic tokenization.
                </span>
                <button
                  type="button"
                  onClick={() => setIsManagingPaymentMethods(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Username handle</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-neutral-400 dark:text-neutral-500 text-sm font-mono">@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setUsernameError(null);
                    setFormData({ ...formData, username: e.target.value });
                  }}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-neutral-50/50 dark:bg-neutral-800 dark:text-neutral-100 font-mono"
                  required
                  id="profile-input-username"
                />
              </div>
              {usernameError && (
                <p className="text-xs font-semibold text-red-500 dark:text-red-400 mt-1">{usernameError}</p>
              )}
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
          <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-pink-500" />
              <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-neutral-100">Aura Personality Quiz</h3>
            </div>
            <button
              type="button"
              onClick={handleResetSliders}
              className="px-2.5 py-1 text-[11px] text-neutral-500 hover:text-pink-600 dark:text-neutral-400 dark:hover:text-pink-400 font-semibold border border-neutral-200 dark:border-neutral-700 hover:border-pink-500/30 rounded-xl transition flex items-center gap-1 cursor-pointer"
              id="profile-reset-sliders-btn"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Quiz
            </button>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Our match engine computes mathematical similarity based on these sliders to align you with people of similar (or perfectly contrasting) mindsets.
          </p>

          {/* Live MBTI Insight Panel */}
          {(() => {
            const currentMbti = deriveMbti(answers);
            const insight = getMbtiInsight(currentMbti);
            return (
              <div className={`rounded-2xl p-5 bg-linear-to-br ${insight.color} text-white shadow-xs space-y-3 transition-all duration-300`} id="profile-mbti-insight-panel">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  <span className="text-xs uppercase font-mono tracking-widest font-bold opacity-80">Aura Archetype Discovery</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black font-display tracking-tight flex items-center gap-2">
                    {currentMbti} — {insight.title}
                  </h4>
                  <p className="text-xs leading-relaxed font-medium opacity-90">
                    {insight.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/20 flex items-start gap-1.5 text-[11px] leading-relaxed opacity-95">
                  <Heart className="w-3.5 h-3.5 shrink-0 mt-0.5 fill-current" />
                  <span>
                    <strong className="font-semibold">Compatibility Match: </strong>{insight.match}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* List of Custom interactive sliders */}
          <div className="space-y-6" id="personality-questions-list">
            {questions.map((q, idx) => {
              const val = answers[idx];
              // Calculate percentages for highlight (-5 to 5 maps to 0 to 100)
              const pct = ((val + 5) / 10) * 100;
              return (
                <div key={idx} className="bg-neutral-50/50 dark:bg-neutral-800/40 p-4.5 rounded-2xl border border-neutral-100/50 dark:border-neutral-800/50 space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <span className="text-sm font-display tracking-tight text-neutral-800 dark:text-neutral-250">{q.label}</span>
                    <span className="font-mono text-[10px] bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-full text-pink-700 dark:text-pink-300">
                      {val > 0 ? `+${val}` : val === 0 ? "Balanced" : val}
                    </span>
                  </div>
                  
                  <div className="relative flex items-center h-6">
                    {/* Background Bar */}
                    <div className="absolute left-0 right-0 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      {/* Dynamic middle anchor highlight */}
                      <div 
                        className="absolute top-0 bottom-0 bg-linear-to-r from-purple-500 to-pink-500 transition-all duration-150"
                        style={{
                          left: val < 0 ? `${pct}%` : "50%",
                          right: val >= 0 ? `${100 - pct}%` : "50%"
                        }}
                      />
                    </div>
                    {/* Zero-point indicator */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-3 bg-neutral-400 dark:bg-neutral-600 rounded-full pointer-events-none" />
                    
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      value={val}
                      onChange={(e) => handleSliderChange(idx, Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer accent-transparent z-10"
                    />
                    {/* Custom visible handle */}
                    <div 
                      className="absolute w-5 h-5 bg-white dark:bg-neutral-100 border-2 border-pink-500 rounded-full shadow-xs pointer-events-none transition-all duration-150 flex items-center justify-center -translate-x-1/2"
                      style={{ left: `${pct}%`, top: "calc(50% - 10px)" }}
                    >
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 font-medium select-none">
                    <button
                      type="button"
                      onClick={() => handleSliderChange(idx, -5)}
                      className={`text-left max-w-[45%] transition duration-150 hover:text-pink-500 cursor-pointer ${val < 0 ? "text-pink-600 dark:text-pink-400 font-bold scale-[1.02]" : ""}`}
                    >
                      {q.left}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSliderChange(idx, 5)}
                      className={`text-right max-w-[45%] transition duration-150 hover:text-pink-500 cursor-pointer ${val > 0 ? "text-pink-600 dark:text-pink-400 font-bold scale-[1.02]" : ""}`}
                    >
                      {q.right}
                    </button>
                  </div>
                </div>
              );
            })}
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

                {/* Local File Upload Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">
                    Or Upload from Local File
                  </h4>
                  <div className="relative border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-pink-500/50 dark:hover:border-pink-500/30 rounded-2xl p-6 text-center transition bg-neutral-50/20 dark:bg-neutral-950/20 group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setSelectedAvatarUrl(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1.5 pointer-events-none">
                      <div className="w-9 h-9 bg-pink-50 dark:bg-pink-950/20 text-pink-500 rounded-xl flex items-center justify-center mx-auto group-hover:scale-105 transition">
                        <Upload className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-xs text-neutral-750 dark:text-neutral-300 font-semibold">
                        Drag & drop, or <span className="text-pink-500 hover:text-pink-600">browse file</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">
                        PNG, JPG, or WEBP (Base64 URL)
                      </p>
                    </div>
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
