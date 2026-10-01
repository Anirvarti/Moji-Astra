import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAllEmojisWithCustom, addCustomEmojiItem, EMOJI_CATEGORIES, SKIN_TONES } from '../services/emojiData';
import { sound } from '../services/audio';
import { EmojiItem } from '../types';
import {
  Search,
  Mic,
  MicOff,
  Copy,
  Check,
  Volume2,
  Trash2,
  Hand,
  Sparkles,
  MousePointer,
  ArrowLeft,
  ArrowRight,
  Plus,
  Zap,
  X,
} from 'lucide-react';

interface ExploreModeProps {
  cursorPos: { x: number; y: number } | null;
  isPinching: boolean;
  activeGesture: string | null;
  onSelectMode?: (mode: 'learn', prefillEmoji?: string) => void;
}

export const ExploreMode: React.FC<ExploreModeProps> = ({
  cursorPos,
  isPinching,
  activeGesture,
  onSelectMode,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>('');
  const [messageBuffer, setMessageBuffer] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);

  // Custom Emoji Creator Modal State
  const [showAddEmojiModal, setShowAddEmojiModal] = useState<boolean>(false);
  const [newEmojiChar, setNewEmojiChar] = useState<string>('🤖');
  const [newEmojiName, setNewEmojiName] = useState<string>('Cyber Bot');
  const [newEmojiCategory, setNewEmojiCategory] = useState<string>('smileys');
  const [newEmojiKeywords, setNewEmojiKeywords] = useState<string>('bot, robot, ai, cyber');
  const [customEmojiList, setCustomEmojiList] = useState<EmojiItem[]>(() => getAllEmojisWithCustom());

  // Hovered emoji under spatial fingertip cursor
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  // Prevent multiple pinch triggers
  const wasPinching = useRef<boolean>(false);

  // Swipe category detection
  const lastGestureRef = useRef<string | null>(null);
  const lastGestureTimeRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    try {
      const recognition = new (SpeechRecognition as { new (): any })();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
          sound.playPop();
        }
        setIsListeningVoice(false);
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setVoiceSupported(false);
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (!voiceSupported || !recognitionRef.current) return;
    const rec = recognitionRef.current as { start: () => void; stop: () => void };

    if (isListeningVoice) {
      rec.stop();
      setIsListeningVoice(false);
    } else {
      sound.playPop();
      try {
        rec.start();
        setIsListeningVoice(true);
      } catch {
        setIsListeningVoice(false);
      }
    }
  };

  // Filter emojis
  const filteredEmojis = useMemo(() => {
    let list = customEmojiList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q)) ||
          item.emoji === q
      );
    }

    list = list.filter((item) => item.category === selectedCategory);
    return list;
  }, [searchQuery, selectedCategory, customEmojiList]);

  // Handle Add Custom Emoji
  const handleCreateCustomEmoji = (trainNow: boolean = false) => {
    if (!newEmojiChar.trim()) return;
    const newItem: EmojiItem = {
      emoji: newEmojiChar.trim(),
      name: newEmojiName.trim() || 'Custom Emoji',
      category: newEmojiCategory,
      keywords: newEmojiKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    };

    const updated = addCustomEmojiItem(newItem);
    setCustomEmojiList(getAllEmojisWithCustom());
    sound.playSuccess();
    setShowAddEmojiModal(false);

    if (trainNow && onSelectMode) {
      onSelectMode('learn', newItem.emoji);
    }
  };

  // Append skin tone if applicable
  const applySkinTone = (emoji: string) => {
    if (!selectedSkinTone) return emoji;
    // Apply skin tone to hand and person emojis
    return `${emoji}${selectedSkinTone}`;
  };

  // Add emoji to message tray
  const addEmojiToMessage = (emoji: string) => {
    sound.playPinch();
    const finalEmoji = applySkinTone(emoji);
    setMessageBuffer((prev) => [...prev, finalEmoji]);
  };

  // Palm swipe category navigation & fist clear
  useEffect(() => {
    const now = performance.now();
    if (activeGesture && activeGesture !== lastGestureRef.current && now - lastGestureTimeRef.current > 700) {
      if (activeGesture === 'Closed_Fist') {
        // Fist = back / clear
        if (messageBuffer.length > 0) {
          sound.playPop();
          setMessageBuffer((prev) => prev.slice(0, -1));
        }
        lastGestureTimeRef.current = now;
      }
      lastGestureRef.current = activeGesture;
    }
  }, [activeGesture, messageBuffer]);

  // Spatial cursor detection & pinch-to-click on grid elements
  useEffect(() => {
    if (!cursorPos || !gridRef.current) {
      setHoveredEmoji(null);
      return;
    }

    // Convert normalized cursorPos (0-1) to viewport pixel coords
    const gridRect = gridRef.current.getBoundingClientRect();
    const cursorPixelX = window.innerWidth * cursorPos.x;
    const cursorPixelY = window.innerHeight * cursorPos.y;

    // Check if cursor is over any emoji button
    const element = document.elementFromPoint(cursorPixelX, cursorPixelY);
    const emojiButton = element?.closest('[data-emoji]') as HTMLElement | null;

    if (emojiButton) {
      const emojiVal = emojiButton.getAttribute('data-emoji');
      setHoveredEmoji(emojiVal);

      // Pinch clicked!
      if (isPinching && !wasPinching.current && emojiVal) {
        addEmojiToMessage(emojiVal);
      }
    } else {
      setHoveredEmoji(null);
    }

    wasPinching.current = isPinching;
  }, [cursorPos, isPinching]);

  // Copy message to clipboard
  const handleCopy = () => {
    if (messageBuffer.length === 0) return;
    const text = messageBuffer.join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  // Speak message via Web Speech API Text-to-Speech
  const handleSpeak = () => {
    if (messageBuffer.length === 0 || !window.speechSynthesis) return;
    sound.playPop();
    const text = messageBuffer.join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Category navigation helpers
  const handleNextCategory = () => {
    const idx = EMOJI_CATEGORIES.findIndex((c) => c.id === selectedCategory);
    const nextIdx = (idx + 1) % EMOJI_CATEGORIES.length;
    setSelectedCategory(EMOJI_CATEGORIES[nextIdx].id);
    sound.playPop();
  };

  const handlePrevCategory = () => {
    const idx = EMOJI_CATEGORIES.findIndex((c) => c.id === selectedCategory);
    const prevIdx = (idx - 1 + EMOJI_CATEGORIES.length) % EMOJI_CATEGORIES.length;
    setSelectedCategory(EMOJI_CATEGORIES[prevIdx].id);
    sound.playPop();
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full gap-3 relative">
      {/* Spatial Index Cursor Overlay */}
      {cursorPos && (
        <div
          className={`fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${
            isPinching ? 'scale-75' : 'scale-100'
          }`}
          style={{
            left: `${cursorPos.x * 100}vw`,
            top: `${cursorPos.y * 100}vh`,
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring */}
            <div
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                isPinching
                  ? 'bg-amber-400/50 border-amber-300 scale-125 shadow-[0_0_25px_rgba(251,191,36,0.6)]'
                  : 'bg-cyan-500/30 border-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
              } animate-ping`}
            />
            {/* Center dot */}
            <div
              className={`absolute w-4 h-4 rounded-full shadow-lg ${
                isPinching ? 'bg-amber-400 scale-125 ring-4 ring-amber-300/40' : 'bg-white'
              }`}
            />
            <span className="absolute -bottom-6 text-[9px] font-mono font-bold bg-black/90 text-white px-2 py-0.5 rounded-full shadow border border-white/20">
              {isPinching ? 'PINCH CLICK!' : 'Index Tip'}
            </span>
          </div>
        </div>
      )}

      {/* Top Message Tray Card */}
      <div className="apple-glass-card p-3.5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex-1 w-full flex items-center gap-2 bg-black/50 px-4 py-3 rounded-2xl border border-white/10 min-h-[48px] overflow-x-auto shadow-inner">
          {messageBuffer.length === 0 ? (
            <span className="text-xs text-zinc-500 italic select-none">
              Pinch index finger or click emojis below to construct your message...
            </span>
          ) : (
            <div className="flex items-center gap-2.5 text-2xl">
              {messageBuffer.map((em, i) => (
                <span key={i} className="animate-fade-in hover:scale-125 transition-transform cursor-pointer">
                  {em}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            disabled={messageBuffer.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-30 text-white rounded-full text-xs font-semibold shadow-lg transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleSpeak}
            disabled={messageBuffer.length === 0}
            title="Read aloud via Text-to-Speech"
            className="p-2.5 bg-white/[0.05] hover:bg-white/10 disabled:opacity-30 text-zinc-200 border border-white/10 rounded-full transition-colors"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => {
              sound.playPop();
              setMessageBuffer([]);
            }}
            disabled={messageBuffer.length === 0}
            title="Clear message"
            className="p-2.5 bg-white/[0.05] hover:bg-white/10 disabled:opacity-30 text-zinc-300 border border-white/10 rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Search & Skin Tone Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        {/* Search input with Voice button */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 4,000+ emojis (e.g. smile, rocket, cat, pizza)..."
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400 shadow-inner"
          />
          {voiceSupported && (
            <button
              onClick={toggleVoiceSearch}
              title={isListeningVoice ? 'Listening...' : 'Voice Search'}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-colors ${
                isListeningVoice
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {isListeningVoice ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Add Custom Emoji Button */}
        <button
          onClick={() => {
            sound.playPop();
            setShowAddEmojiModal(true);
          }}
          title="Add Custom Emoji & Train AI"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold rounded-2xl shadow transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Custom Emoji</span>
        </button>

        {/* Skin Tone Selector */}
        <div className="flex items-center gap-1 bg-white/[0.04] px-3 py-1.5 rounded-2xl border border-white/10 shrink-0">
          <span className="text-[10px] text-zinc-400 mr-1 hidden sm:inline uppercase tracking-widest font-mono">Tone:</span>
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.label}
              onClick={() => {
                sound.playPop();
                setSelectedSkinTone(tone.code);
              }}
              title={tone.label}
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform ${
                selectedSkinTone === tone.code
                  ? 'ring-2 ring-indigo-400 scale-110 bg-white/10'
                  : 'hover:bg-white/10'
              }`}
            >
              {tone.code ? `👋${tone.code}` : '👋'}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={handlePrevCategory}
          title="Previous Category"
          className="p-2 rounded-full bg-white/[0.05] hover:bg-white/10 text-zinc-400 border border-white/10 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        {EMOJI_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id && !searchQuery.trim();
          return (
            <button
              key={cat.id}
              onClick={() => {
                sound.playPop();
                setSelectedCategory(cat.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md border border-white/20'
                  : 'bg-white/[0.03] border border-white/[0.07] text-zinc-300 hover:bg-white/[0.08]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}

        <button
          onClick={handleNextCategory}
          title="Next Category"
          className="p-2 rounded-full bg-white/[0.05] hover:bg-white/10 text-zinc-400 border border-white/10 shrink-0"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Emoji Grid */}
      <div
        ref={gridRef}
        className="flex-1 apple-glass-card rounded-3xl p-4 overflow-y-auto max-h-[460px] grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 content-start"
      >
        {filteredEmojis.map((item, idx) => {
          const isHovered = hoveredEmoji === item.emoji;
          return (
            <button
              key={`${item.emoji}_${idx}`}
              data-emoji={item.emoji}
              onClick={() => addEmojiToMessage(item.emoji)}
              className={`w-full aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all duration-150 select-none ${
                isHovered
                  ? 'bg-amber-400/25 ring-2 ring-amber-400 scale-125 shadow-xl z-10'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:scale-110'
              }`}
              title={`${item.name} (${item.keywords.join(', ')})`}
            >
              {applySkinTone(item.emoji)}
            </button>
          );
        })}

        {filteredEmojis.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-400">
            <p className="text-sm">No emojis found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-indigo-400 hover:underline"
            >
              Clear search query
            </button>
          </div>
        )}
      </div>

      {/* Spatial Control Cheat Sheet Footer */}
      <div className="apple-glass-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
          <Hand className="w-3.5 h-3.5" />
          <span>Spatial Vision Controls:</span>
        </div>
        <div className="flex items-center gap-4">
          <span>☝️ <strong>Point:</strong> Move cursor</span>
          <span>👌 <strong>Pinch:</strong> Select emoji</span>
          <span>✊ <strong>Fist:</strong> Backspace</span>
        </div>
      </div>

      {/* Add Custom Emoji Creator Modal */}
      {showAddEmojiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="apple-glass-card rounded-3xl max-w-md w-full p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] animate-fade-in flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-display font-extrabold text-white">Add Custom Emoji & Bind AI Pose</h3>
              </div>
              <button
                onClick={() => setShowAddEmojiModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">
                  Emoji Character:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={newEmojiChar}
                  onChange={(e) => setNewEmojiChar(e.target.value)}
                  placeholder="Paste or type any emoji (e.g. 🤖, 🛸, 🪄, 🐉)"
                  className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-base text-white text-center"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">
                  Emoji Display Name:
                </label>
                <input
                  type="text"
                  value={newEmojiName}
                  onChange={(e) => setNewEmojiName(e.target.value)}
                  placeholder="e.g. Cyber Robot"
                  className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">
                    Category:
                  </label>
                  <select
                    value={newEmojiCategory}
                    onChange={(e) => setNewEmojiCategory(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    {EMOJI_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-1">
                    Search Keywords:
                  </label>
                  <input
                    type="text"
                    value={newEmojiKeywords}
                    onChange={(e) => setNewEmojiKeywords(e.target.value)}
                    placeholder="bot, robot, tech"
                    className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCreateCustomEmoji(false)}
                className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/12 text-zinc-200 border border-white/10 rounded-full font-semibold text-xs transition-colors"
              >
                Save to Library
              </button>

              <button
                onClick={() => handleCreateCustomEmoji(true)}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white font-bold text-xs rounded-full shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Train AI Pose Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
