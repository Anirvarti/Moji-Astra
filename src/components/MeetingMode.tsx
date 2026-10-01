import React, { useState, useEffect, useRef } from 'react';
import { FloatingReaction, ReactionMapping } from '../types';
import { sound } from '../services/audio';
import {
  Video,
  Hand,
  Settings,
  HelpCircle,
  Shield,
  Eye,
  Monitor,
  Flame,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface MeetingModeProps {
  activeGesture: string | null;
  activeEmoji: string | null;
  isClapping: boolean;
  isTwoHandHeart: boolean;
  isNamaste: boolean;
  isLotusFlower: boolean;
  faceExpression: string | null;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  chromaGreen: boolean;
  onToggleChromaGreen: () => void;
}

const DEFAULT_REACTION_MAPPINGS: ReactionMapping[] = [
  { gestureId: 'Thumb_Up', gestureName: 'Thumbs Up', emoji: '👍', label: 'Approve' },
  { gestureId: 'Namaste', gestureName: 'Namaste / Pranam', emoji: '🙏', label: 'Namaste' },
  { gestureId: 'Lotus_Flower', gestureName: 'Lotus Flower', emoji: '🪷', label: 'Lotus' },
  { gestureId: 'Rose_Flower', gestureName: 'Flower Bloom', emoji: '🌸', label: 'Blossom' },
  { gestureId: 'Clapping', gestureName: 'Two-Hand Clapping', emoji: '👏', label: 'Applause' },
  { gestureId: 'Two_Hand_Heart', gestureName: 'Two-Hand Heart', emoji: '❤️', label: 'Love' },
  { gestureId: 'Victory', gestureName: 'Peace / Victory', emoji: '🎉', label: 'Celebrate' },
  // Face Expressions:
  { gestureId: 'Smile', gestureName: 'Face Smile', emoji: '😀', label: 'Happy' },
  { gestureId: 'Laugh', gestureName: 'Big Laugh', emoji: '😆', label: 'Laugh' },
  { gestureId: 'Surprise', gestureName: 'Face Surprise', emoji: '😮', label: 'Surprised' },
  { gestureId: 'Scream', gestureName: 'Face Scream', emoji: '😱', label: 'Shocked' },
  { gestureId: 'Wink', gestureName: 'Face Wink', emoji: '😉', label: 'Wink' },
  { gestureId: 'Tongue', gestureName: 'Face Tongue', emoji: '😛', label: 'Playful' },
  { gestureId: 'Wink_Tongue', gestureName: 'Wink Tongue', emoji: '😜', label: 'Cheeky' },
  { gestureId: 'Sad', gestureName: 'Face Frown', emoji: '😢', label: 'Sad' },
  { gestureId: 'Angry', gestureName: 'Angry Face', emoji: '😠', label: 'Angry' },
  { gestureId: 'Skeptical', gestureName: 'Raised Eyebrow', emoji: '🤨', label: 'Skeptical' },
  { gestureId: 'Kiss', gestureName: 'Kiss Lips', emoji: '😚', label: 'Kiss' },
  { gestureId: 'Wide_Eyes', gestureName: 'Wide Eyes', emoji: '😳', label: 'Flushed' },
  { gestureId: 'Sleepy', gestureName: 'Sleepy Eyes', emoji: '😴', label: 'Sleepy' },
  { gestureId: 'Eye_Roll', gestureName: 'Eye Roll', emoji: '🙄', label: 'Eye Roll' },
  { gestureId: 'Yawn', gestureName: 'Yawn', emoji: '🥱', label: 'Yawn' },
  { gestureId: 'Shush', gestureName: 'Sealed Lips', emoji: '🤐', label: 'Quiet' },
  { gestureId: 'Love_You', gestureName: 'Love-You Sign', emoji: '🤟', label: 'Support' },
  { gestureId: 'OK_Sign', gestureName: 'OK Sign', emoji: '👌', label: 'Understood' },
];

export const MeetingMode: React.FC<MeetingModeProps> = ({
  activeGesture,
  activeEmoji,
  isClapping,
  isTwoHandHeart,
  isNamaste,
  isLotusFlower,
  faceExpression,
  privacyMode,
  onTogglePrivacy,
  chromaGreen,
  onToggleChromaGreen,
}) => {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [mappings, setMappings] = useState<ReactionMapping[]>(() => {
    try {
      const saved = localStorage.getItem('gesturemoji_meeting_mappings');
      return saved ? JSON.parse(saved) : DEFAULT_REACTION_MAPPINGS;
    } catch {
      return DEFAULT_REACTION_MAPPINGS;
    }
  });

  // Hand raised state
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const handHoldStartRef = useRef<number | null>(null);

  // Reaction cooldown tracker (per gesture ID)
  const lastTriggerTime = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 1400;

  // Editing dialog state
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showObsGuideModal, setShowObsGuideModal] = useState<boolean>(false);

  // Handle raise hand: Open_Palm held for 1.5s
  useEffect(() => {
    const now = performance.now();
    if (activeGesture === 'Open_Palm') {
      if (!handHoldStartRef.current) {
        handHoldStartRef.current = now;
      } else if (now - handHoldStartRef.current >= 1500 && !isHandRaised) {
        setIsHandRaised(true);
        sound.playHandRaised();
      }
    } else {
      handHoldStartRef.current = null;
    }
  }, [activeGesture, isHandRaised]);

  // Spawn floating reaction
  const triggerReaction = (emoji: string, gestureId: string) => {
    const now = performance.now();
    const lastTime = lastTriggerTime.current[gestureId] || 0;
    if (now - lastTime < COOLDOWN_MS) return;

    lastTriggerTime.current[gestureId] = now;
    sound.playPop();

    // Spawn 1 to 3 floating emoji particles
    const newReactions: FloatingReaction[] = [];
    const count = gestureId === 'Two_Hand_Heart' || gestureId === 'Clapping' ? 4 : 2;

    for (let i = 0; i < count; i++) {
      newReactions.push({
        id: `${Date.now()}_${Math.random()}`,
        emoji,
        x: 40 + Math.random() * 25, // center-ish percentage
        y: 80 + Math.random() * 10,
        size: 58 + Math.random() * 32,
        opacity: 1,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(2.5 + Math.random() * 2.0), // upward velocity
        created: Date.now(),
      });
    }

    setReactions((prev) => [...prev, ...newReactions]);
  };

  // Watch for gestures and trigger matched reactions
  useEffect(() => {
    let triggeredGestureId: string | null = null;
    let triggeredEmoji: string | null = null;

    if (isNamaste) {
      triggeredGestureId = 'Namaste';
    } else if (isLotusFlower) {
      triggeredGestureId = 'Lotus_Flower';
    } else if (isTwoHandHeart) {
      triggeredGestureId = 'Two_Hand_Heart';
    } else if (isClapping) {
      triggeredGestureId = 'Clapping';
    } else if (activeGesture && activeGesture !== 'Open_Palm') {
      triggeredGestureId = activeGesture;
    } else if (faceExpression) {
      triggeredGestureId = faceExpression;
    }

    if (triggeredGestureId) {
      const match = mappings.find((m) => m.gestureId === triggeredGestureId);
      if (match) {
        triggerReaction(match.emoji, triggeredGestureId);
      }
    }
  }, [activeGesture, isClapping, isTwoHandHeart, faceExpression, mappings]);

  // Physics animation loop for floating emojis
  useEffect(() => {
    let animationId: number;

    const updatePhysics = () => {
      setReactions((prev) => {
        const now = Date.now();
        return prev
          .map((r) => {
            const age = now - r.created;
            const progress = age / 2500; // 2.5s lifespan
            return {
              ...r,
              x: r.x + r.vx * 0.3,
              y: r.y + r.vy * 0.4,
              opacity: Math.max(0, 1 - progress * 1.2),
            };
          })
          .filter((r) => r.opacity > 0.05);
      });

      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Save mappings
  const handleSaveMapping = (gestureId: string, newEmoji: string) => {
    const updated = mappings.map((m) => (m.gestureId === gestureId ? { ...m, emoji: newEmoji } : m));
    setMappings(updated);
    try {
      localStorage.setItem('gesturemoji_meeting_mappings', JSON.stringify(updated));
    } catch {}
  };

  const handleResetDefaultMappings = () => {
    setMappings(DEFAULT_REACTION_MAPPINGS);
    localStorage.removeItem('gesturemoji_meeting_mappings');
    sound.playPop();
  };

  return (
    <div className="flex flex-col h-full gap-4 relative">
      {/* Floating Reaction Particles Overlay Canvas */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity select-none filter drop-shadow-lg"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              fontSize: `${r.size}px`,
              opacity: r.opacity,
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Top Banner: Hand Raised Alert */}
      {isHandRaised && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl border border-amber-300 animate-bounce z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              ✋
            </div>
            <div>
              <div className="font-extrabold text-sm flex items-center gap-1.5">
                <span>HAND RAISED IN MEETING</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded">LIVE</span>
              </div>
              <p className="text-xs text-amber-100">
                You held Open Palm for 1.5 seconds. The meeting presenter can see your signal!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playPop();
              setIsHandRaised(false);
            }}
            className="px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow transition-colors"
          >
            Lower Hand
          </button>
        </div>
      )}

      {/* Meeting Broadcast Bar & Controls */}
      <div className="apple-glass-card p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-display font-extrabold text-white flex items-center gap-2">
              Live Meeting Reactions Dock
              <span className="text-[9px] font-mono font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Gestures and facial expressions burst into reactions on screen
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Chroma Green Toggle */}
          <button
            onClick={onToggleChromaGreen}
            title={chromaGreen ? 'Turn Off Green Screen' : 'Enable Chroma Key Green Screen for OBS'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              chromaGreen
                ? 'bg-[#00FF00] text-black border-emerald-500 shadow-lg font-bold'
                : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{chromaGreen ? 'Green Screen Active' : 'OBS Chroma'}</span>
          </button>

          {/* Privacy mode toggle */}
          <button
            onClick={onTogglePrivacy}
            title={privacyMode ? 'Show Video Stream' : 'Privacy Mode: Skeleton only'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              privacyMode
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy Mode</span>
          </button>

          {/* Rebind / Settings */}
          <button
            onClick={() => {
              sound.playPop();
              setShowSettingsModal(true);
            }}
            title="Edit Gesture-to-Reaction Mappings"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/10 text-zinc-200 border border-white/10 rounded-full text-xs font-semibold transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Reactions</span>
          </button>

          {/* OBS Guide */}
          <button
            onClick={() => {
              sound.playPop();
              setShowObsGuideModal(true);
            }}
            title="How to stream in Zoom / Meet with OBS"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 rounded-full text-xs font-semibold transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>OBS Setup</span>
          </button>
        </div>
      </div>

      {/* Live Reactions Dock / Palette Card */}
      <div className="apple-glass-card p-5 rounded-3xl flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display font-extrabold text-zinc-300 uppercase tracking-widest">
              Configured Reactions & Triggers
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              Perform any gesture or face expression below
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mappings.map((m) => {
              const isActive =
                activeGesture === m.gestureId ||
                faceExpression === m.gestureId ||
                (m.gestureId === 'Two_Hand_Heart' && isTwoHandHeart) ||
                (m.gestureId === 'Clapping' && isClapping);

              return (
                <div
                  key={m.gestureId}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                    isActive
                      ? 'bg-amber-400/20 border-amber-400/80 text-white shadow-[0_0_25px_rgba(251,191,36,0.3)] scale-102 ring-1 ring-amber-400/40'
                      : 'bg-white/[0.03] border-white/[0.07] text-zinc-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-2xl shadow-inner shrink-0 border border-white/10">
                    {m.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-white">{m.label}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{m.gestureName}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raise Hand instruction tip */}
        <div className="mt-4 p-3.5 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-xl">✋</span>
            <span>
              <strong className="text-white">Raise Hand:</strong> Hold open palm towards camera for <strong>1.5 seconds</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              setIsHandRaised(true);
              sound.playHandRaised();
            }}
            className="px-3.5 py-1.5 bg-white/[0.06] hover:bg-white/12 text-amber-300 border border-white/10 rounded-full text-[11px] font-semibold transition-colors"
          >
            Test Raise Hand
          </button>
        </div>
      </div>

      {/* Settings Modal: Edit Reaction Mappings */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Customize Meeting Reactions</h3>
                <p className="text-xs text-slate-400">Rebind gestures to your preferred emojis</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {mappings.map((m) => (
                <div
                  key={m.gestureId}
                  className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{m.gestureName}</div>
                    <div className="text-[10px] text-slate-400">{m.label}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick emoji selection buttons */}
                    {['👍', '❤️', '👏', '🎉', '🔥', '😂', '😮', '🚀', '💯'].map((em) => (
                      <button
                        key={em}
                        onClick={() => handleSaveMapping(m.gestureId, em)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-transform ${
                          m.emoji === em
                            ? 'bg-amber-400/20 ring-2 ring-amber-400 scale-110'
                            : 'hover:bg-slate-700'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-4">
              <button
                onClick={handleResetDefaultMappings}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <button
                onClick={() => {
                  sound.playSuccess();
                  setShowSettingsModal(false);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OBS Virtual Camera & Zoom Setup Guide Modal */}
      {showObsGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-fade-in max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">OBS & Zoom Presenter Guide</h3>
              </div>
              <button
                onClick={() => setShowObsGuideModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/30">
                <h4 className="font-bold text-indigo-300 mb-1">How Presenter View Works:</h4>
                <p>
                  You can use Moji Astra directly inside Zoom, Google Meet, Microsoft Teams, or Discord as a dynamic interactive webcam feed with live reactions!
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5">Option A: OBS Virtual Camera (Recommended for Studio)</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                  <li>Open OBS Studio on your Mac or PC.</li>
                  <li>Click <strong>+</strong> under Sources and select <strong>Window Capture</strong> (choose Moji Astra browser window).</li>
                  <li>If using <strong>OBS Chroma</strong> (green screen), right-click the source in OBS &rarr; <em>Filters</em> &rarr; <em>Effect Filters (+)</em> &rarr; <em>Chroma Key</em>. Select Green. The background becomes transparent!</li>
                  <li>Click <strong>Start Virtual Camera</strong> in the OBS bottom-right controls.</li>
                  <li>In Zoom, Google Meet, or Teams, set your camera to <strong>OBS Virtual Camera</strong>!</li>
                </ol>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1.5">Option B: Direct Browser Screen Share</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                  <li>In your Zoom or Google Meet meeting, click <strong>Share Screen</strong>.</li>
                  <li>Select the <strong>Moji Astra Chrome Tab</strong>.</li>
                  <li>Perform gestures live while speaking to delight your classroom or audience!</li>
                </ol>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="font-bold text-amber-300 block mb-1">Privacy Guarantee:</span>
                <p className="text-slate-400">
                  All MediaPipe AI vision processing runs strictly inside your local browser via WebAssembly. Zero video bytes or personal imagery are ever sent to any cloud server.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowObsGuideModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
