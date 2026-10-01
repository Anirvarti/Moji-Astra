import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppMode, DetectionResult, GestureSequence } from './types';
import { mediaPipeService } from './services/mediapipe';
import { sound } from './services/audio';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { PlayMode } from './components/PlayMode';
import { ExploreMode } from './components/ExploreMode';
import { MeetingMode } from './components/MeetingMode';
import { LearnMode } from './components/LearnMode';
import { SequenceModal } from './components/SequenceModal';
import { DebugPanel } from './components/DebugPanel';
import { DocumentationModal } from './components/DocumentationModal';
import confetti from 'canvas-confetti';

const DEFAULT_SEQUENCES: GestureSequence[] = [
  {
    id: 'seq_1',
    name: 'Rocket Blast Off',
    sequence: ['✌️', '👍'],
    resultingEmoji: '🚀',
    description: 'Peace sign followed by Thumbs Up',
  },
  {
    id: 'seq_2',
    name: 'Rock Paper Scissors Win',
    sequence: ['✊', '✋', '✌️'],
    resultingEmoji: '🏆',
    description: 'Fist, then Palm, then Victory',
  },
  {
    id: 'seq_3',
    name: 'Magic Sparkles',
    sequence: ['☝️', '☝️'],
    resultingEmoji: '✨',
    description: 'Double point upward',
  },
  {
    id: 'seq_4',
    name: 'Friendship Wave',
    sequence: ['✋', '👍'],
    resultingEmoji: '👋',
    description: 'Open palm followed by Thumbs Up',
  },
  {
    id: 'seq_5',
    name: 'Peaceful Lotus Bloom',
    sequence: ['✌️', '🙏'],
    resultingEmoji: '🪷',
    description: 'Peace sign followed by Namaste / Pranam',
  },
  {
    id: 'seq_6',
    name: 'Flower Garland of Love',
    sequence: ['🙏', '❤️'],
    resultingEmoji: '💐',
    description: 'Namaste greeting followed by Two-Hand Heart',
  },
];

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('play');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // View toggles
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showJointLabels, setShowJointLabels] = useState<boolean>(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [chromaGreen, setChromaGreen] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [showSequences, setShowSequences] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);

  // Frame rate and performance
  const [fps, setFps] = useState<number>(30);
  const frameTimes = useRef<number[]>([]);

  // Sequences
  const [sequences, setSequences] = useState<GestureSequence[]>(() => {
    try {
      const saved = localStorage.getItem('gesturemoji_sequences');
      return saved ? JSON.parse(saved) : DEFAULT_SEQUENCES;
    } catch {
      return DEFAULT_SEQUENCES;
    }
  });

  // Recent gesture buffer for sequence combos
  const [recentGestureTrail, setRecentGestureTrail] = useState<string[]>([]);
  const [activeSequenceCombo, setActiveSequenceCombo] = useState<string | null>(null);
  const lastTrailEmojiRef = useRef<string | null>(null);
  const trailClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Latest Detection result
  const [detectionResult, setDetectionResult] = useState<DetectionResult>({
    hands: [],
    face: null,
    activeGesture: null,
    activeEmoji: null,
    confidence: 0,
    allProbabilities: [],
    isTwoHandHeart: false,
    isClapping: false,
    isNamaste: false,
    isLotusFlower: false,
    isPinching: false,
    pinchDistance: 1,
    cursorPos: null,
    inferenceTimeMs: 0,
    timestamp: 0,
  });

  // Hold-to-confirm progress state
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [confirmedGesture, setConfirmedGesture] = useState<string | null>(null);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle debug with 'D' or 'd'
      if (e.key === 'd' || e.key === 'D') {
        setShowDebug((prev) => !prev);
      }
      // Mode shortcuts: 1, 2, 3, 4
      if (e.key === '1') setCurrentMode('play');
      if (e.key === '2') setCurrentMode('explore');
      if (e.key === '3') setCurrentMode('meeting');
      if (e.key === '4') setCurrentMode('learn');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update detection handler from CameraView
  const handleDetectionUpdate = useCallback((result: DetectionResult) => {
    setDetectionResult(result);

    // Calculate live FPS
    const now = performance.now();
    frameTimes.current.push(now);
    if (frameTimes.current.length > 20) {
      frameTimes.current.shift();
    }
    if (frameTimes.current.length >= 2) {
      const delta = (now - frameTimes.current[0]) / (frameTimes.current.length - 1);
      if (delta > 0) {
        setFps(1000 / delta);
      }
    }

    // Update hold-to-confirm status
    const holdStatus = mediaPipeService.getHoldProgress();
    setHoldProgress(holdStatus.progress);
    setConfirmedGesture(holdStatus.confirmed);

    // Update sequence combo buffer if gesture is confirmed
    if (holdStatus.confirmed && result.activeEmoji && result.activeEmoji !== lastTrailEmojiRef.current) {
      lastTrailEmojiRef.current = result.activeEmoji;

      setRecentGestureTrail((prev) => {
        const next = [...prev, result.activeEmoji!].slice(-3); // keep up to 3
        checkSequenceMatch(next);
        return next;
      });

      // Clear trail after 3 seconds of inactivity
      if (trailClearTimeoutRef.current) clearTimeout(trailClearTimeoutRef.current);
      trailClearTimeoutRef.current = setTimeout(() => {
        setRecentGestureTrail([]);
        lastTrailEmojiRef.current = null;
      }, 3000);
    }
  }, []);

  // Check if recent gesture trail matches any secret sequence combos
  const checkSequenceMatch = (trail: string[]) => {
    for (const seq of sequences) {
      if (trail.length >= seq.sequence.length) {
        const tail = trail.slice(-seq.sequence.length);
        const isMatch = tail.every((em, i) => em === seq.sequence[i]);
        if (isMatch) {
          // Trigger combo fanfare!
          setActiveSequenceCombo(seq.resultingEmoji);
          sound.playFanfare();
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.4 } });

          setTimeout(() => {
            setActiveSequenceCombo(null);
          }, 3500);
          break;
        }
      }
    }
  };

  const handleResetHold = () => {
    mediaPipeService.resetHoldState();
    setHoldProgress(0);
    setConfirmedGesture(null);
  };

  const handleSaveSequences = (seqs: GestureSequence[]) => {
    setSequences(seqs);
    try {
      localStorage.setItem('gesturemoji_sequences', JSON.stringify(seqs));
    } catch {}
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors relative selection:bg-indigo-500/30 ${
        isDark
          ? highContrast
            ? 'bg-black text-white'
            : 'bg-[#040507] text-slate-100 bg-grid-pattern'
          : highContrast
          ? 'bg-white text-black'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Background Ambient Glow Orbs */}
      {isDark && !highContrast && (
        <>
          <div className="ambient-glow-top pointer-events-none" />
          <div className="ambient-glow-bottom pointer-events-none" />
        </>
      )}

      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => {
          setCurrentMode(mode);
          handleResetHold();
        }}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast((h) => !h)}
        fps={fps}
        onOpenSequences={() => setShowSequences(true)}
        onOpenDocs={() => setShowDocs(true)}
        onToggleDebug={() => setShowDebug((d) => !d)}
        showDebug={showDebug}
        activeSequenceCombo={activeSequenceCombo}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
          {/* Column 1: Camera View with Skeleton Overlay & Live AI Monitor Card */}
          <div className="lg:col-span-5 order-2 lg:order-2 flex flex-col gap-5">
            <div className="aspect-[4/3] w-full max-h-[440px]">
              <CameraView
                onDetectionUpdate={handleDetectionUpdate}
                showSkeleton={showSkeleton}
                onToggleSkeleton={() => setShowSkeleton((s) => !s)}
                showJointLabels={showJointLabels}
                privacyMode={privacyMode}
                onTogglePrivacy={() => setPrivacyMode((p) => !p)}
                mode={currentMode}
                holdProgress={holdProgress}
                confirmedGesture={confirmedGesture}
                activeEmoji={detectionResult.activeEmoji}
                activeGesture={detectionResult.activeGesture}
                chromaGreen={chromaGreen && currentMode === 'meeting'}
                className="w-full h-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]"
              />
            </div>

            {/* Live AI Detection & Face Expression Monitor Card */}
            <div className="p-5 apple-glass-card rounded-3xl flex flex-col gap-4 text-slate-200">
              {/* Top Row: Hero Emoji Display + Active Detection Name */}
              <div className="flex items-center gap-4">
                {/* Big Hero Emoji Showcase */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-[#0d0e15] to-purple-950/40 border border-white/10 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] shrink-0 group">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl animate-pulse pointer-events-none" />
                  <span className="text-5xl sm:text-6xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-110 select-none">
                    {detectionResult.activeEmoji || (detectionResult.face?.expression ? (detectionResult.activeEmoji || '😀') : '👀')}
                  </span>
                  {detectionResult.confidence > 0.6 && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-ping" />
                  )}
                </div>

                {/* Gesture / Expression Label & Confidence */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 uppercase tracking-widest font-semibold">
                      {detectionResult.face?.expression ? 'Face + Hand AI' : 'Gesture Vision'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {Math.round(detectionResult.confidence * 100)}% Match
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-extrabold text-white truncate tracking-tight">
                    {detectionResult.activeGesture
                      ? detectionResult.activeGesture.replace(/_/g, ' ')
                      : detectionResult.face?.expression
                      ? `Face: ${detectionResult.face.expression}`
                      : 'Detecting Hand or Face...'}
                  </h3>

                  {/* Progress / Confidence bar */}
                  <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mt-2.5 p-0.5 border border-white/[0.05]">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        detectionResult.confidence > 0.75
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                          : detectionResult.confidence > 0.4
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                          : 'bg-zinc-700'
                      }`}
                      style={{ width: `${Math.max(8, detectionResult.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Middle Row: Real-Time Face Expression & Hand Tracking Stats */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Face Expression Status */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center gap-2.5">
                  <span className="text-2xl">
                    {detectionResult.face?.expression === 'Smile'
                      ? '😀'
                      : detectionResult.face?.expression === 'Laugh'
                      ? '😆'
                      : detectionResult.face?.expression === 'Surprise'
                      ? '😮'
                      : detectionResult.face?.expression === 'Scream'
                      ? '😱'
                      : detectionResult.face?.expression === 'Wink'
                      ? '😉'
                      : detectionResult.face?.expression === 'Tongue'
                      ? '😛'
                      : detectionResult.face?.expression === 'Wink_Tongue'
                      ? '😜'
                      : detectionResult.face?.expression === 'Sad'
                      ? '😢'
                      : detectionResult.face?.expression === 'Angry'
                      ? '😠'
                      : detectionResult.face?.expression === 'Skeptical'
                      ? '🤨'
                      : detectionResult.face?.expression === 'Kiss'
                      ? '😚'
                      : detectionResult.face?.expression === 'Wide_Eyes'
                      ? '😳'
                      : detectionResult.face?.expression === 'Sleepy'
                      ? '😴'
                      : detectionResult.face?.expression === 'Eye_Roll'
                      ? '🙄'
                      : detectionResult.face?.expression === 'Yawn'
                      ? '🥱'
                      : detectionResult.face?.expression === 'Shush'
                      ? '🤐'
                      : '🙂'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[9px] text-zinc-400 block uppercase font-semibold tracking-wider">Face State</span>
                    <span className="font-bold text-white truncate block text-xs">
                      {detectionResult.face?.expression
                        ? detectionResult.face.expression.replace('_', ' ')
                        : 'Neutral'}
                    </span>
                  </div>
                </div>

                {/* Hand Detection Stats */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-zinc-400 block uppercase font-semibold tracking-wider">Hands Tracking</span>
                    <span className="font-bold text-indigo-300 text-xs">
                      {detectionResult.hands.length === 0
                        ? '0 Hands'
                        : `${detectionResult.hands.length} Hand (${detectionResult.hands[0]?.handedness || 'Active'})`}
                    </span>
                  </div>
                  <span className="text-xl">
                    {detectionResult.hands.length > 0 ? '🖐️' : '⏳'}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Face Expressions Live Gallery Strip */}
              <div className="pt-2.5 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                  <span className="font-semibold text-zinc-300">Live Face Expression Triggers:</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Real-time Webcam</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'Smile', emoji: '😀', label: 'Smile' },
                    { id: 'Laugh', emoji: '😆', label: 'Laugh' },
                    { id: 'Surprise', emoji: '😮', label: 'Surprise' },
                    { id: 'Scream', emoji: '😱', label: 'Scream' },
                    { id: 'Wink', emoji: '😉', label: 'Wink' },
                    { id: 'Tongue', emoji: '😛', label: 'Tongue' },
                    { id: 'Wink_Tongue', emoji: '😜', label: 'Wink+Tongue' },
                    { id: 'Sad', emoji: '😢', label: 'Frown' },
                    { id: 'Angry', emoji: '😠', label: 'Angry' },
                    { id: 'Skeptical', emoji: '🤨', label: 'Eyebrow' },
                    { id: 'Kiss', emoji: '😚', label: 'Kiss' },
                    { id: 'Wide_Eyes', emoji: '😳', label: 'Wide Eyes' },
                    { id: 'Sleepy', emoji: '😴', label: 'Sleepy' },
                    { id: 'Eye_Roll', emoji: '🙄', label: 'Eye Roll' },
                    { id: 'Yawn', emoji: '🥱', label: 'Yawn' },
                    { id: 'Shush', emoji: '🤐', label: 'Quiet' },
                  ].map((face) => {
                    const isFaceActive = detectionResult.face?.expression === face.id;
                    return (
                      <div
                        key={face.id}
                        title={`${face.label} expression`}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all select-none ${
                          isFaceActive
                            ? 'bg-amber-400/25 ring-2 ring-amber-400 scale-125 shadow-lg'
                            : 'hover:bg-white/[0.06] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className="text-xl sm:text-2xl">{face.emoji}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Active Interactive Mode Component */}
          <div className="lg:col-span-7 order-1 lg:order-1 flex flex-col">
            {currentMode === 'play' && (
              <PlayMode
                activeGesture={detectionResult.activeGesture}
                activeEmoji={detectionResult.activeEmoji}
                holdProgress={holdProgress}
                confirmedGesture={confirmedGesture}
                isTwoHandHeart={detectionResult.isTwoHandHeart}
                onResetHold={handleResetHold}
              />
            )}

            {currentMode === 'explore' && (
              <ExploreMode
                cursorPos={detectionResult.cursorPos}
                isPinching={detectionResult.isPinching}
                activeGesture={detectionResult.activeGesture}
                onSelectMode={(mode) => setCurrentMode(mode)}
              />
            )}

            {currentMode === 'meeting' && (
              <MeetingMode
                activeGesture={detectionResult.activeGesture}
                activeEmoji={detectionResult.activeEmoji}
                isClapping={detectionResult.isClapping}
                isTwoHandHeart={detectionResult.isTwoHandHeart}
                isNamaste={detectionResult.isNamaste}
                isLotusFlower={detectionResult.isLotusFlower}
                faceExpression={detectionResult.face?.expression ?? null}
                privacyMode={privacyMode}
                onTogglePrivacy={() => setPrivacyMode((p) => !p)}
                chromaGreen={chromaGreen}
                onToggleChromaGreen={() => setChromaGreen((c) => !c)}
              />
            )}

            {currentMode === 'learn' && (
              <LearnMode
                detectionResult={detectionResult}
                showSkeleton={showSkeleton}
                onToggleSkeleton={() => setShowSkeleton((s) => !s)}
                showJointLabels={showJointLabels}
                onToggleJointLabels={() => setShowJointLabels((j) => !j)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modals & Panels */}
      <SequenceModal
        isOpen={showSequences}
        onClose={() => setShowSequences(false)}
        sequences={sequences}
        onSaveSequences={handleSaveSequences}
        recentGestureTrail={recentGestureTrail}
      />

      <DocumentationModal
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />

      <DebugPanel
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
        detectionResult={detectionResult}
        fps={fps}
      />
    </div>
  );
}
