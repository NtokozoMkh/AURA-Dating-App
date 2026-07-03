import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Elegant incremental progress simulation for premium feel
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Set exiting state first to trigger CSS animation
          setIsExiting(true);
          setTimeout(onComplete, 600); // Wait for transition duration
          return 100;
        }
        // Random incremental steps
        const increment = Math.floor(Math.random() * 15) + 10;
        return Math.min(prev + increment, 100);
      });
    }, 180);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      id="splash-screen-container"
    >
      {/* Immersive Dark Cosmic Aura Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern overlay for tech-forward modern depth */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Brand Emblem */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.08, 1], opacity: 1 }}
          transition={{
            scale: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            },
            opacity: { duration: 0.8 }
          }}
          className="relative mb-6"
        >
          {/* Glowing Outer Ring */}
          <div className="absolute inset-0 bg-linear-to-br from-pink-500 to-rose-600 rounded-3xl blur-xl opacity-40 animate-pulse" />
          
          <div className="relative w-20 h-20 bg-linear-to-br from-pink-500 via-rose-500 to-rose-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-pink-500/35 border border-white/10">
            <Flame className="w-10 h-10 fill-current text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />
          </div>
        </motion.div>

        {/* Brand Name with sleek text animations */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl font-black font-display tracking-[0.25em] text-white uppercase ml-[0.25em] relative"
        >
          Aura
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute -top-1 -right-4"
          >
            <Sparkles className="w-4 h-4 text-pink-400 fill-current" />
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3.5 text-xs text-neutral-400 font-medium tracking-wide uppercase leading-relaxed"
        >
          Connecting depth & personality
        </motion.p>

        {/* Minimalist Progress Meter */}
        <div className="mt-12 w-48 relative">
          <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-pink-500 to-rose-500"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut" }}
            />
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="absolute -bottom-6 left-0 right-0 text-[9px] font-mono tracking-widest text-neutral-400 uppercase text-center"
          >
            Aura V2.0 // Loading {progress}%
          </motion.span>
        </div>
      </div>

      {/* Decorative footer tag */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center text-[10px] font-mono tracking-widest text-neutral-600 uppercase">
        Verified Intentional Connection
      </div>
    </div>
  );
}
