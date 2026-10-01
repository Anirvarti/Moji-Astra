import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameDifficulty, HighScoreEntry } from '../types';
import { sound } from '../services/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Zap,
  RotateCcw,
  Sparkles,
  Award,
  Clock,
  Heart,
  Brain,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface PlayModeProps {
  activeGesture: string | null;
  activeEmoji: string | null;
  holdProgress: number;
  confirmedGesture: string | null;
  isTwoHandHeart: boolean;
  onResetHold: () => void;
}

interface TargetGesture {
  id: string;
  name: string;
  emoji: string;
  hint: string;
  isHero?: boolean;
}

const EASY_TARGETS: TargetGesture[] = [
  { id: 'Thumb_Up', name: 'Thumbs Up', emoji: '👍', hint: 'Fist with thumb pointed straight up' },
  { id: 'Victory', name: 'Peace / Victory', emoji: '✌️', hint: 'Extend index and middle fingers in a V' },
  { id: 'Open_Palm', name: 'Open Palm', emoji: '✋', hint: 'Spread all 5 fingers facing camera' },
  { id: 'Namaste', name: 'Namaste / Pranam', emoji: '🙏', hint: 'Join both palms flat together pointing upward' },
  { id: 'Closed_Fist', name: 'Closed Fist', emoji: '✊', hint: 'Curl all fingers tightly into palm' },
  { id: 'Pointing_Up', name: 'Point Up', emoji: '☝️', hint: 'Index finger pointing straight up' },
  { id: 'Thumb_Down', name: 'Thumbs Down', emoji: '👎', hint: 'Fist with thumb pointing straight down' },
];

const MEDIUM_TARGETS: TargetGesture[] = [
  ...EASY_TARGETS,
  { id: 'OK_Sign', name: 'OK Sign', emoji: '👌', hint: 'Touch thumb tip to index tip; other 3 up' },
  { id: 'Lotus_Flower', name: 'Lotus Flower', emoji: '🪷', hint: 'Touch wrists and open fingers like lotus petals' },
  { id: 'Rose_Flower', name: 'Flower Bloom', emoji: '🌸', hint: 'Gather fingertips together like a flower bud' },
  { id: 'Love_You', name: 'I Love You', emoji: '🤟', hint: 'Extend thumb, index & pinky; fold middle & ring' },
  { id: 'Crossed_Fingers', name: 'Crossed Fingers', emoji: '🤞', hint: 'Cross index and middle finger' },
  { id: 'Finger_Heart', name: 'Finger Heart', emoji: '🫰', hint: 'Cross thumb and index tips into mini heart snap' },
];

const AI_CHEERS = [
  'MediaPipe neural net locked on in milliseconds!',
  'Geometric finger vector matched perfectly!',
  'Sub-pixel landmark alignment on point!',
  'Clean hand pose! Combo multiplier surging!',
  'Class 7 AI Champion reflexes activated!',
  'Euclidean joint distance within threshold!',
  'Lightning-fast tracking response!',
];

const HIGH_SCORE_KEY = 'gesturemoji_high_scores';

export const PlayMode: React.FC<PlayModeProps> = ({
  activeGesture,
  activeEmoji,
  holdProgress,
  confirmedGesture,
  isTwoHandHeart,
  onResetHold,
}) => {
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'round_success' | 'memory_preview' | 'game_over'>('idle');

  // Game state
  const [round, setRound] = useState<number>(1);
  const totalRounds = 10;
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [successfulRounds, setSuccessfulRounds] = useState<number>(0);
  const [aiMessage, setAiMessage] = useState<string>('Ready to test your reflexes against MediaPipe AI?');
  const [heroHeartTriggered, setHeroHeartTriggered] = useState<boolean>(false);

  // Round Timer
  const roundDurations: Record<GameDifficulty, number> = {
    easy: 8,
    medium: 5,
    timed: 3,
    memory: 6,
  };
  const [timeLeft, setTimeLeft] = useState<number>(5);

  // Targets
  const [currentTarget, setCurrentTarget] = useState<TargetGesture | null>(null);
  const [memorySequence, setMemorySequence] = useState<TargetGesture[]>([]);
  const [memoryIndex, setMemoryIndex] = useState<number>(0);

  // High Scores
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState<string>('Student-1');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);

  // Gesture success frequencies
  const gestureSuccessMap = useRef<Record<string, number>>({});

  // Load high scores
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      if (stored) {
        setHighScores(JSON.parse(stored));
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Pick next target
  const getNextTarget = useCallback(() => {
    const list = difficulty === 'easy' ? EASY_TARGETS : MEDIUM_TARGETS;
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }, [difficulty]);

  // Start new game
  const startGame = () => {
    sound.playPop();
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setComboMultiplier(1);
    setSuccessfulRounds(0);
    setRound(1);
    setHeroHeartTriggered(false);
    setScoreSaved(false);
    gestureSuccessMap.current = {};
    onResetHold();

    if (difficulty === 'memory') {
      startMemoryRound(1);
    } else {
      const firstTarget = getNextTarget();
      setCurrentTarget(firstTarget);
      setTimeLeft(roundDurations[difficulty]);
      setGameState('playing');
      setAiMessage('Show the target gesture and hold it steady!');
    }
  };

  // Start a memory sequence round
  const startMemoryRound = (currentRoundNum: number) => {
    const seqLength = Math.min(4, 2 + Math.floor(currentRoundNum / 3));
    const seq: TargetGesture[] = [];
    for (let i = 0; i < seqLength; i++) {
      seq.push(getNextTarget());
    }
    setMemorySequence(seq);
    setMemoryIndex(0);
    setGameState('memory_preview');
    setAiMessage(`Memorize this sequence of ${seqLength} gestures!`);

    // After 2.5 seconds, start the playback phase
    setTimeout(() => {
      setGameState('playing');
      setCurrentTarget(seq[0]);
      setTimeLeft(roundDurations['memory']);
      setAiMessage('Now perform the sequence in order!');
    }, 2800);
  };

  // Round countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRoundTimeout();
          return 0;
        }
        if (prev <= 3) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, round, currentTarget]);

  // Check matching gesture
  useEffect(() => {
    if (gameState !== 'playing' || !currentTarget) return;

    // Check optional hero heart bonus anytime
    if (isTwoHandHeart && !heroHeartTriggered) {
      setHeroHeartTriggered(true);
      setScore((s) => s + 350);
      sound.playCombo(3);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      setAiMessage('❤️ TWO-HAND HEART BONUS! +350 PTS!');
    }

    // Match criteria: confirmed gesture matches target id or emoji
    const isMatched =
      confirmedGesture === currentTarget.id ||
      (confirmedGesture === 'Namaste' && currentTarget.id === 'Namaste') ||
      (confirmedGesture === 'Lotus_Flower' && currentTarget.id === 'Lotus_Flower') ||
      (confirmedGesture === 'Rose_Flower' && currentTarget.id === 'Rose_Flower') ||
      (confirmedGesture === 'Love_You' && currentTarget.id === 'Love_You') ||
      (confirmedGesture === 'OK_Sign' && currentTarget.id === 'OK_Sign');

    if (isMatched) {
      handleRoundSuccess();
    }
  }, [confirmedGesture, currentTarget, gameState, isTwoHandHeart, heroHeartTriggered]);

  // Round Success handler
  const handleRoundSuccess = () => {
    onResetHold();

    // Calculate score
    const timeBonus = Math.round(timeLeft * 25);
    const roundScore = (100 + timeBonus) * comboMultiplier;
    const newScore = score + roundScore;
    const newStreak = streak + 1;
    const newBestStreak = Math.max(bestStreak, newStreak);
    const newCombo = Math.min(4, 1 + Math.floor(newStreak / 2) * 0.5);

    setScore(newScore);
    setStreak(newStreak);
    setBestStreak(newBestStreak);
    setComboMultiplier(newCombo);
    setSuccessfulRounds((prev) => prev + 1);

    // Track best gesture
    if (currentTarget) {
      gestureSuccessMap.current[currentTarget.name] = (gestureSuccessMap.current[currentTarget.name] || 0) + 1;
    }

    // Feedback sounds & confetti
    if (newStreak >= 3) {
      sound.playCombo(newCombo);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    } else {
      sound.playSuccess();
    }

    const randomAiQuote = AI_CHEERS[Math.floor(Math.random() * AI_CHEERS.length)];
    setAiMessage(randomAiQuote);

    // Check if Memory mode has more steps in current sequence
    if (difficulty === 'memory' && memoryIndex + 1 < memorySequence.length) {
      const nextIndex = memoryIndex + 1;
      setMemoryIndex(nextIndex);
      setCurrentTarget(memorySequence[nextIndex]);
      setTimeLeft(roundDurations['memory']);
      return;
    }

    // Transition to next round or game over
    setGameState('round_success');
    setTimeout(() => {
      if (round >= totalRounds) {
        endGame(newScore);
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        if (difficulty === 'memory') {
          startMemoryRound(nextRound);
        } else {
          setCurrentTarget(getNextTarget());
          setTimeLeft(roundDurations[difficulty]);
          setGameState('playing');
        }
      }
    }, 900);
  };

  // Timeout handler
  const handleRoundTimeout = () => {
    sound.playBuzzer();
    setStreak(0);
    setComboMultiplier(1);
    onResetHold();
    setAiMessage('Time expired! MediaPipe was ready, try to hold sooner next time!');

    setTimeout(() => {
      if (round >= totalRounds) {
        endGame(score);
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        if (difficulty === 'memory') {
          startMemoryRound(nextRound);
        } else {
          setCurrentTarget(getNextTarget());
          setTimeLeft(roundDurations[difficulty]);
          setGameState('playing');
        }
      }
    }, 1000);
  };

  // End Game
  const endGame = (finalScore: number) => {
    setGameState('game_over');
    sound.playFanfare();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
  };

  // Save High Score
  const handleSaveHighScore = () => {
    if (scoreSaved) return;
    const accuracy = Math.round((successfulRounds / totalRounds) * 100);
    const newEntry: HighScoreEntry = {
      id: `${Date.now()}`,
      name: playerName.trim() || 'Class 7 Champ',
      score,
      difficulty,
      accuracy,
      date: new Date().toLocaleDateString(),
    };

    const updated = [...highScores, newEntry].sort((a, b) => b.score - a.score).slice(0, 8);
    setHighScores(updated);
    try {
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(updated));
    } catch {}
    setScoreSaved(true);
    sound.playSuccess();
  };

  // Find best gesture
  const getBestGesture = () => {
    let best = 'Thumbs Up';
    let max = 0;
    for (const [name, count] of Object.entries(gestureSuccessMap.current)) {
      if (count > max) {
        max = count;
        best = name;
      }
    }
    return best;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Game Bar: Round, Score, Streak, Combo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Round */}
        <div className="apple-glass-card p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
            {gameState === 'idle' ? '0' : round}/{totalRounds}
          </div>
          <div>
            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Round</div>
            <div className="text-sm font-display font-extrabold text-white">
              {gameState === 'idle' ? 'Ready' : `Stage ${round}`}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="apple-glass-card p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Score</div>
            <div className="text-sm font-extrabold text-amber-300 font-mono">{score}</div>
          </div>
        </div>

        {/* Streak */}
        <div className="apple-glass-card p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Streak</div>
            <div className="text-sm font-extrabold text-rose-300">
              {streak} <span className="text-xs text-zinc-400">🔥</span>
            </div>
          </div>
        </div>

        {/* Combo */}
        <div className="apple-glass-card p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Multiplier</div>
            <div className="text-sm font-extrabold text-emerald-400 font-mono">x{comboMultiplier.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Main Play Area Card */}
      <div className="flex-1 apple-glass-card rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between relative overflow-hidden min-h-[440px]">
        {/* Difficulty Selector (when idle) */}
        {gameState === 'idle' && (
          <div className="w-full max-w-lg my-auto flex flex-col items-center text-center">
            <div className="relative group cursor-pointer mb-4">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition duration-300 animate-pulse-subtle" />
              <div className="relative w-16 h-16 rounded-2xl bg-[#0a0c12] border border-white/10 flex items-center justify-center text-3xl shadow-xl select-none">
                🎮
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-2 tracking-tight">
              Moji Astra Arena
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Match the target emojis using your hand gestures! Hold each gesture steady for 0.5s to lock in your score.
            </p>

            {/* Difficulty Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mb-6">
              {(
                [
                  { id: 'easy', label: 'Easy', time: '8s', desc: 'Basic Gestures' },
                  { id: 'medium', label: 'Medium', time: '5s', desc: 'Custom Rules' },
                  { id: 'timed', label: 'Timed Rush', time: '3s', desc: 'Rapid Reflex' },
                  { id: 'memory', label: 'Memory', time: 'Sequence', desc: 'Pattern Repeat' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    sound.playPop();
                    setDifficulty(lvl.id);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    difficulty === lvl.id
                      ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-400/80 text-white shadow-lg ring-1 ring-indigo-400/30'
                      : 'bg-white/[0.03] border-white/[0.07] text-zinc-300 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="font-bold text-xs">{lvl.label}</div>
                  <div className="text-[10px] text-amber-300 font-mono mt-0.5">{lvl.time}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">{lvl.desc}</div>
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-display font-extrabold text-sm rounded-full shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:scale-105 active:scale-95 transition-all flex items-center gap-2 tracking-wide"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              START 10-ROUND MATCH
            </button>
          </div>
        )}

        {/* Memory sequence preview screen */}
        {gameState === 'memory_preview' && (
          <div className="w-full my-auto flex flex-col items-center text-center animate-fade-in">
            <Brain className="w-10 h-10 text-cyan-400 mb-2 animate-pulse" />
            <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest mb-4">
              Memory Sequence: Remember the Order!
            </div>
            <div className="flex items-center gap-4 bg-white/[0.03] p-6 rounded-3xl border border-white/10 shadow-2xl">
              {memorySequence.map((target, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-3xl shadow">
                    {target.emoji}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 mt-1.5">#{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Round Playing State */}
        {(gameState === 'playing' || gameState === 'round_success') && currentTarget && (
          <div className="w-full flex-1 flex flex-col items-center justify-center text-center">
            {/* Countdown Clock Bar */}
            <div className="w-full max-w-md mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Time Remaining
                </span>
                <span className="font-mono font-bold text-amber-400">{timeLeft}s</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-white/[0.06] p-0.5 border border-white/[0.05] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    timeLeft <= 2 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : timeLeft <= 4 ? 'bg-amber-400' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                  }`}
                  style={{
                    width: `${(timeLeft / roundDurations[difficulty]) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Big Target Emoji Display */}
            <div className="relative my-2">
              <div className="absolute inset-0 -m-4 rounded-full bg-indigo-500/10 animate-ping opacity-30 pointer-events-none" />

              <div
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-3xl flex flex-col items-center justify-center border transition-all transform duration-200 select-none shadow-2xl ${
                  gameState === 'round_success'
                    ? 'bg-emerald-950/40 border-emerald-400/80 scale-105 shadow-[0_0_40px_rgba(52,211,153,0.4)]'
                    : 'bg-[#080a10]/80 border-white/15'
                }`}
              >
                <span className="text-6xl sm:text-7xl mb-1 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
                  {currentTarget.emoji}
                </span>
                <span className="text-xs font-display font-extrabold text-zinc-200 tracking-wide">
                  {currentTarget.name}
                </span>
              </div>

              {/* Hold to Confirm SVG Indicator Ring around target */}
              {holdProgress > 0 && (
                <div className="absolute -inset-3 pointer-events-none">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      stroke="#F59E0B"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${holdProgress * 289}, 289`}
                      className="transition-all duration-75"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Gesture Hint */}
            <p className="text-xs text-zinc-400 mt-2 max-w-sm">
              <span className="text-amber-400 font-semibold">Hint: </span>
              {currentTarget.hint}
            </p>

            {/* Live Detected Gesture Feedback */}
            <div className="mt-4 flex items-center gap-2.5 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
              <span className="text-xs text-zinc-400">AI sees:</span>
              <span className="text-lg">{activeEmoji || '👀'}</span>
              <span className="text-xs font-bold text-zinc-200">
                {activeGesture ? activeGesture.replace('_', ' ') : 'Waiting for gesture...'}
              </span>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'game_over' && (
          <div className="w-full max-w-md my-auto flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-3">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-display font-extrabold text-white mb-1">Match Complete!</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Here is your AI recognition performance summary
            </p>

            {/* Scorecard */}
            <div className="w-full bg-white/[0.03] rounded-2xl border border-white/10 p-4 mb-4 grid grid-cols-2 gap-3 text-left">
              <div>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Final Score</span>
                <div className="text-2xl font-extrabold text-amber-300 font-mono">{score}</div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Accuracy</span>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {Math.round((successfulRounds / totalRounds) * 100)}%
                </div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Best Streak</span>
                <div className="text-sm font-bold text-zinc-200">{bestStreak} in a row</div>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">Best Gesture</span>
                <div className="text-sm font-bold text-zinc-200">{getBestGesture()}</div>
              </div>
            </div>

            {/* Save High Score Form */}
            {!scoreSaved ? (
              <div className="w-full flex items-center gap-2 mb-4">
                <input
                  type="text"
                  maxLength={15}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your Name / Class 7"
                  className="flex-1 bg-white/[0.05] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleSaveHighScore}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold rounded-xl shadow transition-colors"
                >
                  Save Score
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-4 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Score saved to Local High Scores!
              </div>
            )}

            <button
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs rounded-full shadow-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* AI Personality Quote Bar */}
        <div className="w-full mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="italic truncate">{aiMessage}</span>
          </div>

          {/* Hero Round Heart Badge */}
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ml-2 border ${
              heroHeartTriggered
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-white/[0.04] text-zinc-400 border-white/10'
            }`}
            title="Bonus: Touch thumbs & index tips of both hands to trigger Two-Hand Heart!"
          >
            <Heart className="w-3 h-3 text-rose-400" />
            <span>Hero ❤️ {heroHeartTriggered ? 'Unlocked (+350)' : 'Bonus'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
