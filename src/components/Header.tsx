import React from 'react';
import { AppMode } from '../types';
import { sound } from '../services/audio';
import {
  Gamepad2,
  Smile,
  Video,
  GraduationCap,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Bug,
  Eye,
  Cpu,
} from 'lucide-react';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  fps: number;
  onOpenSequences: () => void;
  onOpenDocs: () => void;
  onToggleDebug: () => void;
  showDebug: boolean;
  activeSequenceCombo: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  isDark,
  onToggleTheme,
  highContrast,
  onToggleHighContrast,
  fps,
  onOpenSequences,
  onOpenDocs,
  onToggleDebug,
  showDebug,
  activeSequenceCombo,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) sound.playPop();
  };

  const modes: { id: AppMode; label: string; icon: React.ReactNode; desc: string; emoji: string }[] = [
    { id: 'play', label: 'Play', icon: <Gamepad2 className="w-3.5 h-3.5" />, desc: 'Classroom Game', emoji: '🎮' },
    { id: 'explore', label: 'Explore', icon: <Smile className="w-3.5 h-3.5" />, desc: '4000+ Emoji Picker', emoji: '🔍' },
    { id: 'meeting', label: 'Meeting', icon: <Video className="w-3.5 h-3.5" />, desc: 'Reactions & OBS', emoji: '💬' },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-3.5 h-3.5" />, desc: 'AI Vision & Train', emoji: '🧠' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-2xl transition-all duration-300 border-b ${
        isDark
          ? highContrast
            ? 'bg-black border-yellow-400 text-white'
            : 'bg-[#06070a]/80 border-white/[0.08] text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : highContrast
          ? 'bg-white border-black text-black'
          : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Apple Intelligence Tagline */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-xl blur opacity-40 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-10 h-10 rounded-xl bg-[#090b10] border border-white/10 flex items-center justify-center text-xl shadow-inner select-none">
                ✨
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent">
                  Moji Astra <span className="text-cyan-400 font-light">AI</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 font-medium tracking-wide uppercase">
                  Spatial Vision
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block tracking-wide">
                On-Device Vision & Emoji Studio
              </p>
            </div>
          </div>

          {/* Mode Navigation Tabs — Apple Frosted Glass Pill */}
          <nav className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.08] backdrop-blur-xl shadow-inner">
            {modes.map((m) => {
              const active = currentMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    sound.playPop();
                    onSelectMode(m.id);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                  aria-pressed={active}
                >
                  <span className="text-sm">{m.emoji}</span>
                  <span className="hidden md:inline">{m.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controls & Badges */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Combo sequence alert */}
            {activeSequenceCombo && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 animate-pulse-subtle">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Combo:</span>
                <span className="font-extrabold text-sm text-white">{activeSequenceCombo}</span>
              </div>
            )}

            {/* Secret Combos button */}
            <button
              onClick={() => {
                sound.playPop();
                onOpenSequences();
              }}
              title="Secret Gesture Sequences"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 border border-amber-400/20 transition-all hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Combos</span>
            </button>

            {/* Class 7 Presentation Guide */}
            <button
              onClick={() => {
                sound.playPop();
                onOpenDocs();
              }}
              title="Class 7 Presentation Script & AI Guide"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-cyan-400/20 transition-all hover:scale-105"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Guide</span>
            </button>

            {/* Live FPS Counter */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-full border backdrop-blur-md ${
                fps >= 25
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
              title="Live MediaPipe FPS"
            >
              <Cpu className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="font-bold">{Math.round(fps)}</span>
              <span className="text-[9px] text-zinc-500">FPS</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Accessibility High Contrast */}
            <button
              onClick={onToggleHighContrast}
              title={highContrast ? 'Normal Mode' : 'High Contrast'}
              className={`p-2 rounded-full transition-colors ${
                highContrast ? 'bg-amber-400 text-black font-bold' : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Light Mode' : 'Dark Mode'}
              className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 transition-colors"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            </button>

            {/* Debug panel toggle */}
            <button
              onClick={onToggleDebug}
              title="Diagnostics Inspector (Press 'D')"
              className={`p-2 rounded-full transition-colors ${
                showDebug ? 'bg-amber-400 text-black font-bold' : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
