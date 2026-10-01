import React from 'react';
import { DetectionResult } from '../types';
import { Bug, X, Activity, Cpu, Layers } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  detectionResult: DetectionResult;
  fps: number;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  isOpen,
  onClose,
  detectionResult,
  fps,
}) => {
  if (!isOpen) return null;

  const hand = detectionResult.hands[0];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-[#080a0f]/95 backdrop-blur-2xl border border-amber-400/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 text-xs font-mono text-zinc-300 animate-fade-in max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Bug className="w-4 h-4" />
          <span className="font-sans">MediaPipe Live Diagnostics</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase">Framerate</span>
          <span className="text-base font-bold text-emerald-400">{Math.round(fps)} FPS</span>
        </div>
        <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase">Inference Time</span>
          <span className="text-base font-bold text-amber-400">
            {detectionResult.inferenceTimeMs.toFixed(1)} ms
          </span>
        </div>
        <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase">Hands Tracked</span>
          <span className="text-sm font-bold text-zinc-200">
            {detectionResult.hands.length} Hand(s)
          </span>
        </div>
        <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
          <span className="text-[9px] text-zinc-400 block uppercase">Active Gesture</span>
          <span className="text-sm font-bold text-cyan-400 truncate block">
            {detectionResult.activeGesture || 'None'}
          </span>
        </div>
      </div>

      {/* Pinch & Spatial Metrics */}
      <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06] mb-3 space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-400">Pinch Distance:</span>
          <span className="font-bold text-zinc-200">{detectionResult.pinchDistance.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Pinch State:</span>
          <span className={detectionResult.isPinching ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
            {detectionResult.isPinching ? 'TRIGGERED (PINCH)' : 'RELEASED'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Cursor (X, Y):</span>
          <span className="text-zinc-200">
            {detectionResult.cursorPos
              ? `${detectionResult.cursorPos.x.toFixed(2)}, ${detectionResult.cursorPos.y.toFixed(2)}`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Landmark Coordinates Inspector */}
      {hand && (
        <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06] mb-3">
          <div className="text-[9px] text-zinc-400 uppercase font-bold mb-1">
            Handedness: {hand.handedness} | Key Joints:
          </div>
          <div className="space-y-0.5 text-[11px] text-zinc-300">
            <div>Wrist (0): x={hand.landmarks[0].x.toFixed(2)} y={hand.landmarks[0].y.toFixed(2)}</div>
            <div>Thumb Tip (4): x={hand.landmarks[4].x.toFixed(2)} y={hand.landmarks[4].y.toFixed(2)}</div>
            <div>Index Tip (8): x={hand.landmarks[8].x.toFixed(2)} y={hand.landmarks[8].y.toFixed(2)}</div>
            <div>Middle Tip (12): x={hand.landmarks[12].x.toFixed(2)} y={hand.landmarks[12].y.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Face Blendshapes */}
      {detectionResult.face && (
        <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06] text-[11px]">
          <div className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Face Expression:</div>
          <div>Expression: {detectionResult.face.expression || 'Neutral'}</div>
          <div>Score: {(detectionResult.face.expressionScore * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
};
