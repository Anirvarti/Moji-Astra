import React, { useState } from 'react';
import { GestureSequence } from '../types';
import { sound } from '../services/audio';
import { Sparkles, Plus, Trash2, RotateCcw, X, KeyRound } from 'lucide-react';

interface SequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequences: GestureSequence[];
  onSaveSequences: (seqs: GestureSequence[]) => void;
  recentGestureTrail: string[];
}

export const SequenceModal: React.FC<SequenceModalProps> = ({
  isOpen,
  onClose,
  sequences,
  onSaveSequences,
  recentGestureTrail,
}) => {
  const [seqName, setSeqName] = useState<string>('Rocket Launch');
  const [seqGestures, setSeqGestures] = useState<string[]>(['✌️', '👍']);
  const [seqResult, setSeqResult] = useState<string>('🚀');

  if (!isOpen) return null;

  const handleAddSequence = () => {
    if (seqGestures.length < 2) return;
    const newSeq: GestureSequence = {
      id: `${Date.now()}`,
      name: seqName.trim() || 'Secret Combo',
      sequence: [...seqGestures],
      resultingEmoji: seqResult,
      description: `Perform ${seqGestures.join(' then ')} within 2.5s`,
    };
    onSaveSequences([...sequences, newSeq]);
    sound.playSuccess();
    setSeqName('');
  };

  const handleDelete = (id: string) => {
    onSaveSequences(sequences.filter((s) => s.id !== id));
    sound.playPop();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="apple-glass-card rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-fade-in max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-display font-extrabold text-white">Secret Gesture Sequences (Combos)</h3>
              <p className="text-xs text-zinc-400">Perform 2-3 gestures in order within 2.5 seconds!</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Gesture Trail Buffer */}
        <div className="mb-4 p-4 bg-black/50 rounded-2xl border border-white/10">
          <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Sequence Buffer:</span>
          </div>
          <div className="flex items-center gap-2 min-h-[40px]">
            {recentGestureTrail.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">Perform gestures in front of webcam...</span>
            ) : (
              recentGestureTrail.map((em, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/40 flex items-center justify-center text-xl animate-fade-in shadow-md"
                >
                  {em}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Combos List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
          <div className="text-xs font-display font-extrabold text-zinc-300 uppercase tracking-widest mb-2">
            Active Secret Combos:
          </div>
          {sequences.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {s.sequence.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-xl bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
                        {step}
                      </span>
                      {idx < s.sequence.length - 1 && <span className="text-zinc-500 text-xs">+</span>}
                    </React.Fragment>
                  ))}
                  <span className="text-zinc-500 text-xs mx-1">&rarr;</span>
                  <span className="text-2xl bg-amber-500/15 px-2.5 py-0.5 rounded-xl border border-amber-400/30">
                    {s.resultingEmoji}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-white">{s.name}</div>
                  <div className="text-[10px] text-zinc-400">{s.description}</div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(s.id)}
                className="p-2 text-rose-400 hover:bg-white/10 rounded-xl transition-colors"
                title="Delete Combo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Create Combo Form */}
        <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3">
          <div className="text-xs font-bold text-amber-300 font-display">Create New Gesture Combo:</div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">Combo Name:</label>
              <input
                type="text"
                value={seqName}
                onChange={(e) => setSeqName(e.target.value)}
                placeholder="e.g. Magic Sparkle"
                className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">Result Emoji:</label>
              <div className="flex items-center gap-1">
                {['🚀', '✨', '🏆', '🔥', '🎉', '🪄'].map((em) => (
                  <button
                    key={em}
                    onClick={() => setSeqResult(em)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-transform ${
                      seqResult === em ? 'bg-amber-400/20 ring-2 ring-amber-400 scale-110' : 'hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              Sequence: <strong>{seqGestures.join(' &rarr; ')}</strong>
            </span>
            <button
              onClick={handleAddSequence}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold rounded-full shadow transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Combo
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-white/10 flex justify-end mt-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold rounded-full shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
