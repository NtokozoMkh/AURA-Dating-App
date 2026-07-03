import React, { useState } from 'react';
import { Flame, User, Lock, Mail, Sparkles, Check, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (token: string, profile: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sign In States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up Additional States
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState('Female');
  const [lookingFor, setLookingFor] = useState('everyone');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('Creative');
  const [mbti, setMbti] = useState('ENFP');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Coffee', 'Design']);

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

    const url = mode === 'signin' ? '/api/signin' : '/api/register';
    const payload = mode === 'signin' 
      ? { username, password }
      : { 
          username, 
          password, 
          name, 
          age: parseInt(age) || 24, 
          gender, 
          lookingFor, 
          bio, 
          occupation, 
          interests: selectedInterests, 
          mbti 
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please check your details.');
      }

      // Save credentials & notify parent
      localStorage.setItem('aura_token', data.token);
      localStorage.setItem('aura_username', username.toLowerCase().trim());
      onAuthSuccess(data.token, data.profile);
    } catch (err: any) {
      setError(err.message || 'Server connection failed.');
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
          {mode === 'signin' ? 'Sign in to Aura' : 'Create your Aura account'}
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {mode === 'signin' 
            ? 'Connect intentionally. Experience verified depth.' 
            : 'Unveil your real personality profile & discover compatible minds.'}
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

          <form className="space-y-6 text-left" onSubmit={handleSubmit}>
            {/* Common Account Fields */}
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
                <label htmlFor="password" className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="mt-1.5 relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                    <Lock className="h-4 w-4 stroke-[2]" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-3 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white dark:bg-neutral-800/60 dark:hover:bg-neutral-850 dark:focus:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-2xl text-sm transition font-medium text-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>
            </div>

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
                    <span>{mode === 'signin' ? 'Sign In to Aura' : 'Register Profile'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <button
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
