import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DetectionResult } from '../types';
import { mediaPipeService } from '../services/mediapipe';
import {
  Camera,
  CameraOff,
  Shield,
  Eye,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface CameraViewProps {
  onDetectionUpdate: (result: DetectionResult) => void;
  showSkeleton: boolean;
  onToggleSkeleton?: () => void;
  showJointLabels: boolean;
  privacyMode: boolean;
  onTogglePrivacy?: () => void;
  mode: string;
  holdProgress: number;
  confirmedGesture: string | null;
  activeEmoji?: string | null;
  activeGesture?: string | null;
  className?: string;
  chromaGreen?: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onDetectionUpdate,
  showSkeleton,
  onToggleSkeleton,
  showJointLabels,
  privacyMode,
  onTogglePrivacy,
  mode,
  holdProgress,
  confirmedGesture,
  activeEmoji,
  activeGesture,
  className = '',
  chromaGreen = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<boolean>(true);
  const [modelProgressMsg, setModelProgressMsg] = useState<string>('Initializing on-device AI...');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Fallback simulator for camera-denied or testing scenarios
  const [simulatedGesture, setSimulatedGesture] = useState<string | null>(null);

  // Position emoji cleanly on the side (left or right, never in the middle/between)
  const [emojiDockSide, setEmojiDockSide] = useState<'left' | 'right'>('right');

  // Initialize MediaPipe models
  useEffect(() => {
    let mounted = true;
    mediaPipeService
      .initialize((msg) => {
        if (mounted) setModelProgressMsg(msg);
      })
      .then((success) => {
        if (mounted) {
          setLoadingModel(!success);
          if (!success) {
            setCameraError('Failed to load MediaPipe AI Vision models from CDN.');
          }
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Request camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API (getUserMedia) is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((playErr) => {
            console.info('Video play deferred or managed by browser:', playErr);
          });
          setIsStreaming(true);
          setHasCamera(true);
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setHasCamera(false);
      const message =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in your browser address bar.'
            : err.message
          : 'Unable to connect to webcam.';
      setCameraError(message);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [startCamera]);

  // Main processing loop
  useEffect(() => {
    const processLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && isStreaming) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);

          // Run MediaPipe inference
          const now = performance.now();
          const result = mediaPipeService.processVideoFrame(video, now);

          // Overlay hand skeleton & landmarks if enabled
          if (showSkeleton || privacyMode) {
            mediaPipeService.drawHandLandmarks(
              ctx,
              result.hands,
              width,
              height,
              showJointLabels,
              privacyMode
            );
          }

          // If simulator is active, override gesture
          if (simulatedGesture) {
            result.activeGesture = simulatedGesture;
            result.activeEmoji =
              simulatedGesture === 'Thumb_Up'
                ? '👍'
                : simulatedGesture === 'Victory'
                ? '✌️'
                : simulatedGesture === 'Open_Palm'
                ? '✋'
                : simulatedGesture === 'Closed_Fist'
                ? '✊'
                : simulatedGesture === 'Pointing_Up'
                ? '☝️'
                : simulatedGesture === 'Thumb_Down'
                ? '👎'
                : simulatedGesture === 'Two_Hand_Heart'
                ? '❤️'
                : simulatedGesture === 'Namaste'
                ? '🙏'
                : simulatedGesture === 'Lotus_Flower'
                ? '🪷'
                : '👌';
            result.confidence = 0.95;
            if (simulatedGesture === 'Namaste') result.isNamaste = true;
            if (simulatedGesture === 'Lotus_Flower') result.isLotusFlower = true;
            if (simulatedGesture === 'Two_Hand_Heart') result.isTwoHandHeart = true;
          }

          // Emit to parent
          onDetectionUpdate(result);
        }
      }

      animFrameRef.current = requestAnimationFrame(processLoop);
    };

    animFrameRef.current = requestAnimationFrame(processLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isStreaming, showSkeleton, showJointLabels, privacyMode, simulatedGesture, onDetectionUpdate]);

  // Handle simulated gesture click for testing / no-camera fallback
  const handleSimulate = (gesture: string) => {
    setSimulatedGesture(gesture);
    setTimeout(() => {
      setSimulatedGesture(null);
    }, 1500);
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 ${
        chromaGreen
          ? 'bg-[#00FF00] border-emerald-500'
          : privacyMode
          ? 'bg-[#08090e] border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
          : 'bg-[#06070a] border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
      } ${className}`}
    >
      {/* Video Element (mirrored preview) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
          privacyMode || chromaGreen ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Canvas Overlay for Landmarks & Skeleton */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
      />

      {/* Prominent Active Emoji Overlay on Camera Video - Apple Frosted Glass Side Dock */}
      {activeEmoji && (
        <div
          className={`absolute top-4 ${
            emojiDockSide === 'right' ? 'right-4' : 'left-4'
          } z-20 flex items-center gap-3 bg-black/60 backdrop-blur-2xl px-5 py-3 rounded-2xl border ${
            confirmedGesture
              ? 'border-amber-400/80 shadow-[0_0_40px_rgba(251,191,36,0.5)] bg-amber-950/30'
              : 'border-white/15 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
          } animate-fade-in pointer-events-none transition-all duration-200`}
        >
          <div className="relative flex items-center justify-center">
            <span className="text-5xl sm:text-6xl filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] select-none transform transition-transform duration-200">
              {activeEmoji}
            </span>
          </div>
          <div className="pr-1 flex flex-col justify-center">
            <span className="text-xs sm:text-sm font-display font-extrabold text-white block capitalize tracking-tight leading-tight">
              {activeGesture ? activeGesture.replace(/_/g, ' ') : 'Detected'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  confirmedGesture ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                  confirmedGesture ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {confirmedGesture ? 'Locked!' : 'Live AI'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hold-to-confirm circular ring badge overlay - Positioned on opposite side corner */}
      {holdProgress > 0 && (
        <div
          className={`absolute top-4 ${
            emojiDockSide === 'right' ? 'left-4' : 'right-4'
          } z-20 flex items-center gap-2 bg-black/70 backdrop-blur-2xl px-3.5 py-2 rounded-full border border-amber-400/40 shadow-xl`}
        >
          <div className="relative w-7 h-7 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-zinc-800"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-400 transition-all duration-75"
                strokeDasharray={`${holdProgress * 100}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-bold text-amber-300">
              {Math.round(holdProgress * 100)}%
            </span>
          </div>
          <span className="text-xs font-semibold text-zinc-200">
            {confirmedGesture ? 'Confirmed!' : 'Hold stable...'}
          </span>
        </div>
      )}

      {/* Loading overlay for MediaPipe */}
      {loadingModel && (
        <div className="absolute inset-0 z-30 bg-[#050609]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
          <h3 className="text-lg font-display font-extrabold text-white mb-1">Loading AI Vision Engine</h3>
          <p className="text-xs text-zinc-400 max-w-sm tracking-wide">{modelProgressMsg}</p>
          <span className="mt-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/20">
            MediaPipe WebAssembly GPU
          </span>
        </div>
      )}

      {/* Camera permission error or no camera view */}
      {(!hasCamera || cameraError) && !loadingModel && (
        <div className="absolute inset-0 z-20 bg-[#06070a]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-slate-200">
          <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-pulse-subtle" />
          <h3 className="text-base font-display font-extrabold mb-1">Webcam Not Connected or Blocked</h3>
          <p className="text-xs text-zinc-400 max-w-md mb-4">{cameraError}</p>

          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold rounded-full shadow-lg transition-all mb-4"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Camera Access
          </button>

          {/* Virtual gesture simulator fallback */}
          <div className="w-full max-w-md p-3.5 bg-white/[0.04] rounded-2xl border border-white/10 text-left backdrop-blur-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Hand Gestures (Test Fallback):</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'Thumb_Up', emoji: '👍', label: 'Thumbs Up' },
                { id: 'Victory', emoji: '✌️', label: 'Peace' },
                { id: 'Open_Palm', emoji: '✋', label: 'Palm' },
                { id: 'Closed_Fist', emoji: '✊', label: 'Fist' },
                { id: 'Pointing_Up', emoji: '☝️', label: 'Point' },
                { id: 'Thumb_Down', emoji: '👎', label: 'Down' },
                { id: 'OK_Sign', emoji: '👌', label: 'OK Sign' },
                { id: 'Namaste', emoji: '🙏', label: 'Namaste' },
                { id: 'Lotus_Flower', emoji: '🪷', label: 'Lotus' },
                { id: 'Two_Hand_Heart', emoji: '❤️', label: 'Heart' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSimulate(item.id)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-xl text-[11px] font-medium transition-colors border border-white/[0.08]"
                >
                  <span>{item.emoji}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* In-view overlay controls */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {onToggleSkeleton && (
            <button
              onClick={onToggleSkeleton}
              title={showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
              className={`p-2.5 rounded-2xl backdrop-blur-2xl border text-xs font-medium transition-all ${
                showSkeleton
                  ? 'bg-indigo-600/80 border-indigo-400/50 text-white shadow-lg'
                  : 'bg-black/60 border-white/10 text-zinc-300 hover:bg-black/80'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {onTogglePrivacy && (
            <button
              onClick={onTogglePrivacy}
              title={privacyMode ? 'Disable Privacy' : 'Privacy Mode'}
              className={`p-2.5 rounded-2xl backdrop-blur-2xl border text-xs font-medium transition-all ${
                privacyMode
                  ? 'bg-cyan-600/80 border-cyan-400/50 text-white shadow-lg'
                  : 'bg-black/60 border-white/10 text-zinc-300 hover:bg-black/80'
              }`}
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          {/* Emoji Dock Switcher (Left vs Right side) */}
          <button
            onClick={() => setEmojiDockSide((s) => (s === 'right' ? 'left' : 'right'))}
            title={`Dock active emoji on ${emojiDockSide === 'right' ? 'Left' : 'Right'} side`}
            className="px-3 py-2 rounded-2xl backdrop-blur-2xl border text-xs font-semibold bg-black/60 border-white/10 text-zinc-200 hover:bg-black/80 transition-all flex items-center gap-1.5 shadow-md"
          >
            <span className="text-[11px] font-mono">
              Dock: {emojiDockSide === 'right' ? '👉 Right' : '👈 Left'}
            </span>
          </button>
        </div>

        {/* Status pill in corner */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-2xl px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-medium text-zinc-300 pointer-events-auto shadow-md">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="capitalize tracking-wide font-mono text-[10px] uppercase text-zinc-300">{mode} Mode</span>
        </div>
      </div>
    </div>
  );
};
