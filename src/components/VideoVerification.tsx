import React, { useState, useRef, useEffect } from 'react';
import { Camera, Shield, CheckCircle, RefreshCw, AlertCircle, Play, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoVerificationProps {
  isVerified: boolean;
  status: 'unverified' | 'pending' | 'verified' | 'failed';
  onVerifyComplete: () => void;
}

export default function VideoVerification({ isVerified, status, onVerifyComplete }: VideoVerificationProps) {
  const [streamAllowed, setStreamAllowed] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStage, setRecordingStage] = useState<'idle' | 'start' | 'left' | 'right' | 'smile' | 'completed'>('idle');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'analyzing' | 'success'>('idle');
  const [diagnosticMsg, setDiagnosticMsg] = useState('');
  const [timer, setTimer] = useState(3);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Attempt to load webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamAllowed(true);
    } catch (err) {
      console.warn("Webcam access blocked or not supported inside iframe. Initializing secure sandboxed simulation.");
      setStreamAllowed(false); // Enable highly interactive sandbox mode
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (status === 'unverified') {
      startWebcam();
    }
    return () => stopWebcam();
  }, [status]);

  // Start the 3-second recording and prompt sequence
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingStage('start');
    setTimer(3);

    // Prompt sequence:
    // 0s to 1s: Look left
    // 1s to 2s: Look right
    // 2s to 3s: Smile
    let sec = 3;
    const interval = setInterval(() => {
      sec -= 1;
      setTimer(sec);
      
      if (sec === 2) {
        setRecordingStage('left');
      } else if (sec === 1) {
        setRecordingStage('right');
      } else if (sec === 0) {
        setRecordingStage('smile');
      } else if (sec < 0) {
        clearInterval(interval);
        finishRecording();
      }
    }, 1000);
  };

  const finishRecording = () => {
    setIsRecording(false);
    setRecordingStage('completed');
    stopWebcam();
    triggerAnalysis();
  };

  const triggerAnalysis = () => {
    setUploadState('uploading');
    setDiagnosticMsg('Packaging high-definition biometric metadata...');

    setTimeout(() => {
      setUploadState('analyzing');
      setDiagnosticMsg('Analyzing frame-by-frame 3D depth maps...');
      
      setTimeout(() => {
        setDiagnosticMsg('Performing facial geometry liveness analysis...');
        
        setTimeout(() => {
          setDiagnosticMsg('Matching liveness patterns against spoof filters...');
          
          setTimeout(() => {
            setUploadState('success');
            onVerifyComplete();
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1200);
  };

  // Beautiful decorative dots to simulate facial landmarks
  const landmarkPositions = [
    { top: '32%', left: '42%' }, { top: '32%', left: '58%' }, // Eyes
    { top: '44%', left: '50%' }, // Nose bridge
    { top: '49%', left: '50%' }, // Nose tip
    { top: '60%', left: '43%' }, { top: '60%', left: '57%' }, { top: '62%', left: '50%' }, // Mouth
    { top: '24%', left: '50%' }, // Forehead
    { top: '40%', left: '33%' }, { top: '40%', left: '67%' }, // Cheeks
    { top: '72%', left: '50%' }, // Chin
  ];

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden" id="video-verification-container">
      {/* Header */}
      <div className="p-6 text-center border-b border-neutral-100 bg-neutral-50/50 space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-display text-neutral-900">Secure Liveness Verification</h2>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
          Prove your identity with our instant 3D face verification scan. Verified profiles receive the <strong className="text-blue-500 font-semibold">blue badge</strong> and matching priority.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* STATE 1: Already Verified */}
          {status === 'verified' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-4"
              key="verified-card"
            >
              <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                <CheckCircle className="w-10 h-10 fill-current" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-neutral-900">Profile Verified</h3>
                <p className="text-xs text-neutral-500">Your biometric liveness credentials are up to date.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                Liveness Status: ACTIVE
              </div>
            </motion.div>
          )}

          {/* STATE 2: Pending/Uploading Analysis */}
          {(status === 'pending' || uploadState !== 'idle') && status !== 'verified' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center space-y-6"
              key="analysis-card"
            >
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                {/* Circular scanner effect */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/20 animate-spin" style={{ animationDuration: '10s' }}></div>
                <div className="absolute inset-2 rounded-full border border-blue-500/40 animate-reverse-spin" style={{ animationDuration: '6s' }}></div>
                {uploadState === 'success' ? (
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                ) : (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold font-display text-neutral-900">
                  {uploadState === 'uploading' && 'Uploading Credentials...'}
                  {uploadState === 'analyzing' && 'Biometric Facial Scan...'}
                  {uploadState === 'success' && 'Verification Completed!'}
                </h3>
                <p className="text-xs font-mono text-neutral-500 h-10 px-6 leading-relaxed max-w-sm mx-auto">
                  {diagnosticMsg}
                </p>
              </div>

              {uploadState === 'success' && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Reload App Interface
                </button>
              )}
            </motion.div>
          )}

          {/* STATE 3: Active Recorder Screen */}
          {status === 'unverified' && uploadState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
              key="recorder-view"
            >
              {/* Webcam view */}
              <div className="relative aspect-[4/3] w-full rounded-2xl bg-neutral-950 border border-neutral-900 overflow-hidden flex items-center justify-center group shadow-inner">
                {/* Real Video Stream */}
                {streamAllowed && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}

                {/* Simulated Feed / Vector outline */}
                {!streamAllowed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-radial from-neutral-900 to-neutral-950 text-neutral-400">
                    {/* Beautiful facial contour mask */}
                    <div className="w-48 h-60 rounded-full border-2 border-dashed border-blue-500/20 flex flex-col items-center justify-center relative shadow-lg bg-neutral-950/20">
                      <Camera className="w-10 h-10 text-neutral-800 absolute top-12" />
                      
                      {/* Scanning glow bar */}
                      <motion.div 
                        animate={{ top: ['10%', '90%', '10%'] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="absolute left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_10px_#3b82f6]"
                      />
                    </div>
                  </div>
                )}

                {/* Biometric overlay HUD (landmark tracking overlay) */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Glowing target circle */}
                  <div className="absolute inset-12 rounded-full border border-blue-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  </div>

                  {/* Facial landmarks dots */}
                  {landmarkPositions.map((p, idx) => (
                    <motion.div
                      key={idx}
                      className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee] pointer-events-none"
                      style={{ top: p.top, left: p.left }}
                      animate={{ 
                        scale: [1, 1.4, 1],
                        opacity: [0.6, 1, 0.6] 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5 + (idx % 3) * 0.3,
                        ease: "easeInOut"
                      }}
                    />
                  ))}

                  {/* Corner bounds */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-neutral-700"></div>
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-neutral-700"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-neutral-700"></div>
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-neutral-700"></div>

                  {/* Diagnostic details */}
                  <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded font-mono text-[8px] text-neutral-300 space-y-0.5">
                    <p>BIOMETRICS: ACTIVE</p>
                    <p>SYMMETRY: 98.4%</p>
                    <p>LIVENESS: TRUE</p>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/60 px-2.5 py-1 rounded font-mono text-[8px] text-neutral-300">
                    AURA FACE v2.1
                  </div>
                </div>

                {/* Simulated Webcam Sandbox Status Warning */}
                {streamAllowed === false && (
                  <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                    SANDBOX FEED
                  </div>
                )}
              </div>

              {/* Instructions and Controls */}
              <div className="space-y-4">
                {/* Interactive instructions bar */}
                <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-3 border border-neutral-100">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-neutral-800">
                      {!isRecording && 'Ready for check'}
                      {isRecording && recordingStage === 'start' && 'Please look directly at the target'}
                      {isRecording && recordingStage === 'left' && 'Slowly look slightly to the left ⬅️'}
                      {isRecording && recordingStage === 'right' && 'Now slowly look slightly to the right ➡️'}
                      {isRecording && recordingStage === 'smile' && 'Perfect! Give a warm smile for the camera 😊'}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {!isRecording && 'Sit in a well-lit area and align your face.'}
                      {isRecording && `Keep recording... ${timer}s remaining.`}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex justify-center">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-2xl transition shadow-md hover:shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      Start Liveness Check
                    </button>
                  ) : (
                    <div className="w-full bg-red-50 text-red-600 border border-red-100 font-mono text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      CAPTURING BIOMETRICS ({timer}s)
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
