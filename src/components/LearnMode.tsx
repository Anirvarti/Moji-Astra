import React, { useState, useEffect, useRef } from 'react';
import { DetectionResult, Landmark } from '../types';
import { knnClassifier } from '../services/knnClassifier';
import { sound } from '../services/audio';
import {
  GraduationCap,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface LearnModeProps {
  detectionResult: DetectionResult;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  showJointLabels: boolean;
  onToggleJointLabels: () => void;
}

export const LearnMode: React.FC<LearnModeProps> = ({
  detectionResult,
  showSkeleton,
  onToggleSkeleton,
  showJointLabels,
  onToggleJointLabels,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'confidence' | 'failures' | 'train'>('pipeline');

  // Custom Training state
  const [customLabel, setCustomLabel] = useState<string>('My Superhero Pose');
  const [customEmoji, setCustomEmoji] = useState<string>('🦸');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedCount, setRecordedCount] = useState<number>(0);
  const targetSamples = 20;
  const [trainedList, setTrainedList] = useState(knnClassifier.getGesturesList());

  // Pipeline step tracker
  const pipelineSteps = [
    { id: 1, title: '1. Camera Stream', desc: 'Captures raw 640×480 RGB frames at 30 FPS', icon: '📷' },
    { id: 2, title: '2. Palm Detector', desc: 'BlazePalm convolutional net finds hand bounding box', icon: '📦' },
    { id: 3, title: '3. 21 3D Landmarks', desc: 'Regression model predicts 21 joint (x, y, z) points', icon: '🦴' },
    { id: 4, title: '4. Geometry & Vectors', desc: 'Joint angles & distances normalized to hand size', icon: '📐' },
    { id: 5, title: '5. Neural Classifier', desc: 'Compares landmark vectors to pretrained gesture weights', icon: '🧠' },
    { id: 6, title: '6. Emoji Trigger', desc: 'Outputs confirmed emoji action to the screen', icon: '✨' },
  ];

  // Record samples for Train Your Own
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      if (detectionResult.hands.length > 0) {
        const hand = detectionResult.hands[0];
        const success = knnClassifier.addSample(customLabel, customEmoji, hand.landmarks);
        if (success) {
          sound.playTick();
          setRecordedCount((prev) => {
            const next = prev + 1;
            if (next >= targetSamples) {
              setIsRecording(false);
              sound.playSuccess();
              setTrainedList(knnClassifier.getGesturesList());
              return targetSamples;
            }
            return next;
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, detectionResult, customLabel, customEmoji]);

  const handleStartRecording = () => {
    if (detectionResult.hands.length === 0) {
      alert('Please place your hand clearly in front of the camera first!');
      return;
    }
    setRecordedCount(0);
    setIsRecording(true);
    sound.playPop();
  };

  const handleDeleteTrained = (label: string) => {
    knnClassifier.deleteLabel(label);
    setTrainedList(knnClassifier.getGesturesList());
    sound.playPop();
  };

  // Failure checks
  const isLightingDim = detectionResult.hands.length === 0;
  const isHandPartial =
    detectionResult.hands.length > 0 &&
    (detectionResult.hands[0].landmarks[0].x < 0.05 ||
      detectionResult.hands[0].landmarks[0].x > 0.95 ||
      detectionResult.hands[0].landmarks[0].y < 0.05 ||
      detectionResult.hands[0].landmarks[0].y > 0.95);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* AI Transparency Banner */}
      <div className="apple-glass-card p-3.5 rounded-2xl flex items-center justify-between text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-white">AI Educator Transparency:</strong> Uses Google MediaPipe pretrained models + custom Euclidean landmark geometry. No black box, pure spatial math!
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleSkeleton}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
              showSkeleton
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                : 'bg-white/[0.05] text-zinc-400 border-white/10 hover:bg-white/10'
            }`}
          >
            {showSkeleton ? 'Bones ON' : 'Bones OFF'}
          </button>
          <button
            onClick={onToggleJointLabels}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
              showJointLabels
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'bg-white/[0.05] text-zinc-400 border-white/10 hover:bg-white/10'
            }`}
          >
            {showJointLabels ? 'Joint IDs 0-20 ON' : 'Joint IDs OFF'}
          </button>
        </div>
      </div>

      {/* Tabs — Apple Glass Pills */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-3">
        {[
          { id: 'pipeline', label: '6-Stage AI Pipeline', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'confidence', label: 'Live Probabilities', icon: <Activity className="w-3.5 h-3.5" /> },
          { id: 'train', label: 'Train Custom Gesture (kNN)', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
          { id: 'failures', label: 'Why AI Fails', icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sound.playPop();
              setActiveTab(tab.id as any);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md border border-white/20'
                : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: 6-Stage Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="apple-glass-card p-5 rounded-3xl flex-1 overflow-y-auto space-y-4">
          <div className="text-xs text-zinc-400">
            Follow how a single camera frame transforms from raw sensor pixels into an emoji reaction:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pipelineSteps.map((step, idx) => {
              const isCurrent =
                (idx === 0 && true) ||
                (idx === 1 && detectionResult.hands.length > 0) ||
                (idx === 2 && detectionResult.hands.length > 0) ||
                (idx === 3 && detectionResult.hands.length > 0) ||
                (idx === 4 && !!detectionResult.activeGesture) ||
                (idx === 5 && !!detectionResult.activeEmoji);

              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/30 border-indigo-400/60 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-400/30'
                      : 'bg-white/[0.02] border-white/[0.06] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{step.icon}</span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[0.05] text-zinc-500'
                      }`}
                    >
                      {isCurrent ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 font-display">{step.title}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Hand Anatomy Chart */}
          <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/10">
            <h4 className="text-xs font-bold text-amber-300 mb-2.5 font-display">The 21 Landmark Coordinate Map:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="font-bold text-cyan-400 block">Wrist</span>
                <span className="text-zinc-400">#0: Hand Anchor (origin)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="font-bold text-amber-400 block">Thumb</span>
                <span className="text-zinc-400">#1 CMC, #2 MCP, #3 IP, #4 Tip</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="font-bold text-blue-400 block">Index</span>
                <span className="text-zinc-400">#5 MCP, #6 PIP, #7 DIP, #8 Tip</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="font-bold text-emerald-400 block">Middle</span>
                <span className="text-zinc-400">#9 MCP, #10 PIP, #11 DIP, #12 Tip</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="font-bold text-pink-400 block">Ring & Pinky</span>
                <span className="text-zinc-400">#13-16 Ring, #17-20 Pinky</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Probabilities */}
      {activeTab === 'confidence' && (
        <div className="apple-glass-card p-5 rounded-3xl flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-sm font-display font-extrabold text-white mb-1">AI Confidence Distribution</h4>
            <p className="text-xs text-zinc-400">
              Machine learning models output a probability score across all recognized classes in real-time:
            </p>
          </div>

          <div className="space-y-3 max-w-lg">
            {detectionResult.allProbabilities.length > 0 ? (
              detectionResult.allProbabilities.map((prob) => {
                const percent = Math.round(prob.score * 100);
                return (
                  <div key={prob.label} className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.07]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-zinc-200 flex items-center gap-2">
                        <span className="text-lg">{prob.emoji}</span>
                        <span>{prob.label.replace('_', ' ')}</span>
                      </span>
                      <span className="font-mono font-bold text-amber-400">{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden p-0.5 border border-white/[0.05]">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          percent > 75 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : percent > 40 ? 'bg-amber-400' : 'bg-zinc-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-zinc-500 text-xs">
                No hand detected. Raise your hand in front of the camera to see live probability distributions!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Train Your Own Gesture (kNN) */}
      {activeTab === 'train' && (
        <div className="apple-glass-card p-5 rounded-3xl flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-sm font-display font-extrabold text-white mb-1">Train Your Own Custom Gesture (kNN)</h4>
            <p className="text-xs text-zinc-400">
              Teach the AI a custom hand pose! Collect 20 landmark vector snapshots to train a real-time k-Nearest-Neighbors classifier.
            </p>
          </div>

          {/* Recording Studio Box */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">
                  Gesture Name:
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Spider-Man Web"
                  className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">
                  Assign Emoji:
                </label>
                <div className="flex items-center gap-1.5">
                  {['🦸', '⚡', '🪄', '🤙', '🖖', '🎯', '🚀', '🔥'].map((em) => (
                    <button
                      key={em}
                      onClick={() => setCustomEmoji(em)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-transform ${
                        customEmoji === em ? 'bg-amber-400/20 ring-2 ring-amber-400 scale-110' : 'hover:bg-white/10'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                  <input
                    type="text"
                    maxLength={2}
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    className="w-8 h-7 bg-white/[0.05] border border-white/15 rounded-lg text-center text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Record Button & Progress */}
            <div className="pt-2 flex items-center gap-4">
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600 hover:from-amber-300 hover:to-indigo-500 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    Recording Sample {recordedCount}/{targetSamples}...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Record 20 Hand Samples
                  </>
                )}
              </button>

              <span className="text-xs text-zinc-400">
                Hold your pose steady while recording!
              </span>
            </div>
          </div>

          {/* List of Trained Gestures */}
          <div>
            <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 font-display">
              Saved Custom Models (LocalStorage):
            </h5>
            {trainedList.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                No custom gestures trained yet. Enter a name, hold a pose, and hit Record!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trainedList.map((g) => (
                  <div
                    key={g.label}
                    className="flex items-center justify-between p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <div className="font-bold text-white">{g.label}</div>
                        <div className="text-[10px] text-zinc-400">{g.count} vector samples recorded</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTrained(g.label)}
                      className="p-2 text-rose-400 hover:bg-white/10 rounded-xl transition-colors"
                      title="Delete this model"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Why AI Fails */}
      {activeTab === 'failures' && (
        <div className="apple-glass-card p-5 rounded-3xl flex-1 overflow-y-auto space-y-3">
          <div className="text-xs text-zinc-400 mb-2">
            Understanding computer vision failure modes is fundamental to learning AI engineering:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1.5 font-display">
                <AlertTriangle className="w-4 h-4" />
                1. Dim Lighting & Low Contrast
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Convolutional kernels rely on edge gradients and skin pixel contrast. Under low light or strong backlighting, palm landmarks lose contrast, dropping recognition confidence.
              </p>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1.5 font-display">
                <AlertTriangle className="w-4 h-4" />
                2. Fast Motion Blur
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Standard webcams expose frames over ~33ms. Quick hand whips smear pixel boundaries, causing landmark regressions to fluctuate wildly.
              </p>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1.5 font-display">
                <AlertTriangle className="w-4 h-4" />
                3. Self-Occlusion
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                When fingers curl directly behind the hand or another finger, 2D RGB sensors cannot see them directly. MediaPipe must estimate depth (Z coordinate) using statistical priors.
              </p>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1.5 font-display">
                <AlertTriangle className="w-4 h-4" />
                4. Hand Clipped by Camera Frame
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                The palm bounding box detector requires the palm base and wrist in view. If your knuckles or wrist cross the camera border, tracking drops immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
