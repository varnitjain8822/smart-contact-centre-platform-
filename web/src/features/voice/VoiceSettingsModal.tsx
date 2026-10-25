import { useTranslation } from 'react-i18next';
import { Check, Play, RotateCcw, Sliders, Volume2, X } from 'lucide-react';
import type { VoiceSettings } from './useVoice';

export interface VoiceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdate: (partial: Partial<VoiceSettings>) => void;
  availableVoices: SpeechSynthesisVoice[];
  onTestVoice: () => void;
  isSpeaking: boolean;
}

export function VoiceSettingsModal({
  open,
  onClose,
  settings,
  onUpdate,
  availableVoices,
  onTestVoice,
  isSpeaking,
}: VoiceSettingsModalProps) {
  const { i18n } = useTranslation();
  const isHi = i18n.language?.startsWith('hi');

  if (!open) return null;

  // Filter out gag / novelty voices
  const goodVoices = availableVoices.filter(
    (v) =>
      !/bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|organ|pipe|trinoids|whisper|zarvox|albert|junior|ralph|kathy|princess/i.test(
        v.name
      )
  );

  // Group into Indian (Hindi/Indian English) vs Other English/Global
  const indianVoices = goodVoices.filter(
    (v) => /hi|in/i.test(v.lang) || /lekha|rishi|veena|swara|madhur|neerja|prabhat|kavya|hindi|india/i.test(v.name)
  );
  const otherVoices = goodVoices.filter((v) => !indianVoices.includes(v) && v.lang.toLowerCase().startsWith('en'));

  const speeds = [
    { label: isHi ? 'धीमी (0.88x)' : 'Calm (0.88x)', value: 0.88 },
    { label: isHi ? 'प्राकृतिक (0.95x)' : 'Natural (0.95x)', value: 0.95 },
    { label: isHi ? 'तेज़ (1.10x)' : 'Brisk (1.10x)', value: 1.1 },
  ];

  const pitches = [
    { label: isHi ? 'मधुर और विनम्र' : 'Warm & Friendly', value: 1.04 },
    { label: isHi ? 'स्टैंडर्ड' : 'Standard', value: 1.0 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <Sliders size={16} />
            </span>
            <div>
              <h3 id="voice-settings-title" className="font-display text-base font-bold text-slate-900">
                {isHi ? 'आवाज़ सेटिंग्स' : 'Agent Voice & Speech'}
              </h3>
              <p className="text-xs text-slate-500">
                {isHi ? 'बेहतरीन नेचुरल आवाज़ और गति चुनें' : 'Fine-tune tone, speed, and pronunciation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Voice Model Selector */}
          <div>
            <label htmlFor="voice-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {isHi ? 'आवाज़ मॉडल' : 'Voice Model'}
            </label>
            <select
              id="voice-select"
              value={settings.voiceName}
              onChange={(e) => onUpdate({ voiceName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition-colors focus:border-sky-500 focus:bg-white focus:outline-hidden"
            >
              <option value="">
                🌟 {isHi ? 'ऑटो नेचुरल आवाज़ (सिफारिश)' : 'Auto Best Natural Voice (Recommended)'}
              </option>
              {indianVoices.length > 0 && (
                <optgroup label={isHi ? 'भारतीय आवाज़ें (Hindi & Indian English)' : 'Indian Regional Voices'}>
                  {indianVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {otherVoices.length > 0 && (
                <optgroup label={isHi ? 'ग्लोबल इंग्लिश आवाज़ें' : 'Global English Voices'}>
                  {otherVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Speed / Rate */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {isHi ? 'बोलने की गति (Speed)' : 'Speech Speed'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {speeds.map((s) => {
                const isSelected = Math.abs(settings.rate - s.value) < 0.03;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onUpdate({ rate: s.value })}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'border border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone / Pitch */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {isHi ? 'आवाज़ का टोन (Tone)' : 'Voice Tone'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pitches.map((p) => {
                const isSelected = Math.abs(settings.pitch - p.value) < 0.02;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onUpdate({ pitch: p.value })}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? 'border border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Voice Card */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-sky-900">
                {isHi ? 'आवाज़ सुनकर देखें' : 'Test Voice Output'}
              </span>
              <span className="block text-[11px] text-sky-700 truncate">
                {isHi ? 'नमस्ते! स्मार्ट केयर में आपका स्वागत है।' : 'Hello! Welcome to Smart Customer Care.'}
              </span>
            </div>
            <button
              type="button"
              onClick={onTestVoice}
              disabled={isSpeaking}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50 transition-all"
            >
              {isSpeaking ? (
                <>
                  <Volume2 size={13} className="animate-pulse" />
                  <span>{isHi ? 'बोल रहा है...' : 'Speaking...'}</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>{isHi ? 'सुनें' : 'Play'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onUpdate({ voiceName: '', rate: 0.94, pitch: 1.02 })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw size={12} />
            <span>{isHi ? 'डिफ़ॉल्ट सेटिंग्स' : 'Reset defaults'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
          >
            <Check size={13} />
            <span>{isHi ? 'हो गया' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
