import React, { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, Video, GraduationCap, Sparkles, X } from 'lucide-react';
import { sound } from '../services/audio';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'script' | 'readme' | 'roadmap'>('script');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const scriptText = `
"Hello everyone! Today, I want to show you Moji Astra — an AI application that transforms our natural hand gestures and facial expressions into live emojis right inside the browser.

Everything runs 100% on-device using Google's MediaPipe neural networks via WebAssembly, so no camera footage ever leaves our computer.

First, let's look at the Play mode: it's a fast-paced classroom game. When the target emoji appears — like thumbs up, peace, or finger heart — I replicate the pose. The system holds the prediction for 500 milliseconds across a 10-frame sliding window to confirm before giving combo points. Watch this: peace sign, OK sign, and the two-hand heart!

Next, in Explore mode, I don't even need a mouse! My index fingertip controls an on-screen cursor, and pinching my thumb and index finger selects an emoji.

In Meeting mode, it serves as a live presentation overlay with OBS Chroma Key support and a 1.5-second palm hold that rings the virtual 'Raise Hand' bell.

Finally, in Learn mode, we can see the exact 21 coordinates of my hand and even train our own custom gesture using a k-Nearest-Neighbors algorithm in seconds.

Thank you! Let me show you how it works live!"
  `.trim();

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    sound.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="apple-glass-card rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-display font-extrabold text-white">Project Deliverables & Presentation Guide</h3>
              <p className="text-xs text-zinc-400">Class presentation script, local run guide, and architecture</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab buttons — Apple Glass Pills */}
        <div className="flex items-center gap-2 mb-4 border-b border-white/[0.08] pb-3">
          {[
            { id: 'script', label: '60-Sec Script', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'readme', label: 'Local Run & OBS', icon: <Terminal className="w-3.5 h-3.5 text-cyan-400" /> },
            { id: 'roadmap', label: 'Roadmap & AI', icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" /> },
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-zinc-300">
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 font-display">Classroom Presentation Script (~60 seconds):</span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/12 text-zinc-200 border border-white/10 rounded-full text-[11px] font-semibold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>

              <div className="p-4 bg-black/50 rounded-2xl border border-white/10 font-sans leading-relaxed text-zinc-200 whitespace-pre-wrap">
                {scriptText}
              </div>

              <div className="bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-400/20">
                <span className="font-bold text-indigo-300 block mb-1">Speaker Tip:</span>
                <p className="text-zinc-400">
                  Speak at a calm, confident pace. While saying "watch this," perform the ✌️, 👌, and ❤️ gestures towards the camera so the live emoji feedback confirms your speech in real time!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'readme' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm font-display">How to Run Locally:</h4>
              <div className="bg-black/60 p-3.5 rounded-2xl border border-white/10 font-mono text-[11px] text-amber-300">
                <p># 1. Start local dev server:</p>
                <p className="text-emerald-400">npm run dev</p>
                <p className="text-zinc-500 mt-1"># Or build static production bundle:</p>
                <p className="text-emerald-400">npm run build && cd dist && python3 -m http.server 3000</p>
                <p className="mt-2 text-zinc-400"># 2. Open browser: http://localhost:3000</p>
              </div>

              <h4 className="font-bold text-white text-sm font-display">Browser & Security Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                <li><strong>Chrome / Arc / Edge:</strong> Full support for WebAssembly, WebGL GPU acceleration, and Web Speech API.</li>
                <li><strong>Safari (macOS / iPadOS):</strong> Full support for MediaPipe WebAssembly and getUserMedia webcam stream.</li>
                <li><strong>Camera Security:</strong> Browsers require HTTPS or <code>localhost</code> to grant webcam permissions.</li>
              </ul>

              <h4 className="font-bold text-white text-sm font-display">OBS Virtual Camera Setup:</h4>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1">
                <li>Toggle <strong>OBS Chroma</strong> green screen in Meeting mode.</li>
                <li>In OBS Studio, add <strong>Window Capture</strong> pointing to Moji Astra.</li>
                <li>Add filter <strong>Chroma Key</strong> with Color Type Green.</li>
                <li>Click <strong>Start Virtual Camera</strong> in OBS to stream into Zoom, Teams, or Meet!</li>
              </ol>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-amber-300 text-sm mb-1.5 font-display">Known Computer Vision Trade-offs:</h4>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                  <li><strong>Lighting Sensitivity:</strong> Heavy backlighting or dark rooms degrade 2D landmark accuracy.</li>
                  <li><strong>Depth Ambiguity:</strong> Monocular 2D RGB cameras estimate depth heuristics for occluded joints.</li>
                  <li><strong>Mobile Thermal Throttling:</strong> Running simultaneous hand and face models continuously at 30 FPS consumes battery on low-power mobile devices.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-emerald-300 text-sm mb-1.5 font-display">Future Engineering Roadmap:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 pl-1">
                  <li><strong>Continuous ASL Translation:</strong> Expand gesture sequence engine into continuous American Sign Language translation.</li>
                  <li><strong>Two-Hand Multi-User Canvas:</strong> WebRTC multiplayer peer-to-peer hand tracking.</li>
                  <li><strong>3D Emoji Rigging:</strong> Render Three.js WebGL emoji avatars that mirror hand bone rotation matrices.</li>
                  <li><strong>Dynamic Gesture Trajectory ML:</strong> Temporal Convolutional Networks (TCN) to recognize dynamic waving, snapping, and writing.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end mt-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold rounded-full shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
