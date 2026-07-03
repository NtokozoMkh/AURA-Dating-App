import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoicePlayerProps {
  url: string;
  duration?: number;
  isMe: boolean;
}

export default function VoicePlayer({ url, duration = 5, isMe }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Reset state on URL change
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.src = url;
    }
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.log("Audio playback error:", err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      // If we have a real duration, use it, else default to the estimate
      const d = audioRef.current.duration;
      if (d && isFinite(d)) {
        setAudioDuration(d);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Generate fake wave bar heights for visualization
  const waveBarsCount = 18;
  const seedHeights = [20, 40, 60, 30, 80, 50, 20, 70, 90, 40, 60, 30, 80, 50, 30, 50, 40, 20];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
      isMe 
        ? 'bg-neutral-800 border-neutral-700/60 text-white' 
        : 'bg-neutral-50 border-neutral-200/60 text-neutral-800'
    } w-[260px] select-none`} id="voice-player-container">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
        className="hidden"
      />

      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
          isMe
            ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-sm'
            : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Animated Waveform */}
        <div className="flex items-center gap-0.5 h-6">
          {seedHeights.map((height, idx) => {
            // Calculate if this bar has been "played"
            const progress = (currentTime / audioDuration) * 100;
            const barPercent = (idx / waveBarsCount) * 100;
            const isPlayed = barPercent <= progress;

            // Animate height slightly if playing
            const animStyle = isPlaying 
              ? { animationDelay: `${idx * 0.05}s` } 
              : undefined;

            return (
              <div
                key={idx}
                className={`w-[3px] rounded-full transition-all duration-300 ${
                  isPlaying ? 'animate-bounce' : ''
                } ${
                  isPlayed
                    ? isMe ? 'bg-pink-500' : 'bg-neutral-900'
                    : isMe ? 'bg-neutral-600' : 'bg-neutral-300'
                }`}
                style={{
                  height: `${height}%`,
                  animationDuration: '0.9s',
                  animationIterationCount: 'infinite',
                  animationDelay: `${idx * 0.06}s`,
                  ...animStyle
                }}
              />
            );
          })}
        </div>

        {/* Time track */}
        <div className="flex items-center justify-between text-[9px] font-mono opacity-80 font-semibold">
          <span className="flex items-center gap-1">
            <Volume2 className="w-2.5 h-2.5" />
            Voice Note
          </span>
          <span>
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
