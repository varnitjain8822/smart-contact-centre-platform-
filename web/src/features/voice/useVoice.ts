import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { cleanForSpeech, getSupportedAudioMime, pickVoice, splitIntoSentences } from './voiceUtils';

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'speaking';

export interface VoiceSettings {
  /** Explicit preferred voice name (empty string = automatic best natural voice) */
  voiceName: string;
  /** Speech rate / speed: 0.85 to 1.25 (default 0.94 for natural conversational warmth) */
  rate: number;
  /** Speech pitch: 0.85 to 1.15 (default 1.02 for polite customer service tone) */
  pitch: number;
}

const SETTINGS_KEY = 'smartcc_voice_settings_v1';

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') {
    return { voiceName: '', rate: 0.94, pitch: 1.02 };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          voiceName: typeof parsed.voiceName === 'string' ? parsed.voiceName : '',
          rate: typeof parsed.rate === 'number' ? parsed.rate : 0.94,
          pitch: typeof parsed.pitch === 'number' ? parsed.pitch : 1.02,
        };
      }
    }
  } catch {
    // fallback
  }
  return { voiceName: '', rate: 0.94, pitch: 1.02 };
}

export function saveVoiceSettings(s: VoiceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface UseVoiceOptions {
  /** Callback invoked when audio has been transcribed into text. */
  onTranscribed?: (text: string) => void;
  /** Language override (defaults to current i18n language). */
  language?: string;
  /** Hands-free mode initially enabled. */
  initialHandsFree?: boolean;
}

export function useVoice({ onTranscribed, language, initialHandsFree = false }: UseVoiceOptions = {}) {
  const { i18n, t } = useTranslation();
  const currentLang = language || i18n.language || 'en';

  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [handsFree, setHandsFree] = useState<boolean>(initialHandsFree);
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings>(loadVoiceSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const isSpeakingCancelledRef = useRef<boolean>(false);
  const handsFreeRef = useRef<boolean>(handsFree);
  const onTranscribedRef = useRef(onTranscribed);

  handsFreeRef.current = handsFree;
  onTranscribedRef.current = onTranscribed;

  // Cache browser voices and listen for dynamic load
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      try {
        const v = synth.getVoices?.() || [];
        voicesRef.current = v;
        setAvailableVoices(v);
      } catch {
        // ignore
      }
    };
    updateVoices();
    if ('onvoiceschanged' in synth) {
      synth.onvoiceschanged = updateVoices;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (sentenceTimeoutRef.current) clearTimeout(sentenceTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const updateVoiceSettings = useCallback((partial: Partial<VoiceSettings>) => {
    setVoiceSettingsState((prev) => {
      const next = { ...prev, ...partial };
      saveVoiceSettings(next);
      return next;
    });
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    isSpeakingCancelledRef.current = true;
    if (sentenceTimeoutRef.current) {
      clearTimeout(sentenceTimeoutRef.current);
      sentenceTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    utteranceRef.current = null;
    setState((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  const cancelListening = useCallback(() => {
    isCancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopTracks();
    chunksRef.current = [];
    setState('idle');
  }, [stopTracks]);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        stopTracks();
        setState('idle');
      }
    } else {
      stopTracks();
      setState('idle');
    }
  }, [stopTracks]);

  const startListening = useCallback(async () => {
    setError(null);
    stopSpeaking();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(t('voice.notSupported'));
      return;
    }

    try {
      isCancelledRef.current = false;
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedAudioMime();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopTracks();
        if (isCancelledRef.current) {
          chunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];

        if (audioBlob.size < 500) {
          // Empty or near-silent tiny clip
          setState('idle');
          return;
        }

        setState('transcribing');
        try {
          const sttLang = language ? language : (currentLang.startsWith('hi') ? 'hi' : undefined);
          const res = await api.transcribeVoice(audioBlob, sttLang);
          const text = res.text?.trim() || '';
          setState('idle');
          if (text) {
            onTranscribedRef.current?.(text);
          }
        } catch (err: unknown) {
          setState('idle');
          setError(err instanceof Error ? err.message : t('voice.failed'));
        }
      };

      recorder.start(250); // collect chunks every 250ms
      setState('listening');

      // Auto-stop after 30 seconds max
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30_000);
    } catch (err: unknown) {
      stopTracks();
      setState('idle');
      const msg = (err as Error)?.name === 'NotAllowedError' ? t('voice.permissionDenied') : t('voice.failed');
      setError(msg);
    }
  }, [currentLang, language, stopListening, stopSpeaking, stopTracks, t]);

  const speak = useCallback(
    (rawText: string, options?: { onEnd?: () => void }) => {
      stopSpeaking();
      const clean = cleanForSpeech(rawText);
      if (!clean) return;

      if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        options?.onEnd?.();
        return;
      }

      try {
        // Resume synthesis if paused or suspended by Chrome
        if (window.speechSynthesis.paused) {
          try {
            window.speechSynthesis.resume();
          } catch {
            // ignore
          }
        }

        const isHindiText = /[\u0900-\u097F]/.test(clean);
        const targetLang = isHindiText ? 'hi-IN' : (currentLang.startsWith('hi') ? 'hi-IN' : 'en-IN');
        const voiceList = (voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()) || [];
        const chosenVoice = pickVoice(voiceList, isHindiText ? 'hi' : currentLang, voiceSettings.voiceName);

        const sentences = splitIntoSentences(clean);
        if (sentences.length === 0) {
          options?.onEnd?.();
          return;
        }

        isSpeakingCancelledRef.current = false;
        let currentIndex = 0;

        const speakNextSentence = () => {
          if (isSpeakingCancelledRef.current || currentIndex >= sentences.length) {
            utteranceRef.current = null;
            setState((prev) => (prev === 'speaking' ? 'idle' : prev));
            options?.onEnd?.();
            return;
          }

          const currentSentence = sentences[currentIndex++]!;
          const utterance = new SpeechSynthesisUtterance(currentSentence);
          utteranceRef.current = utterance; // Keep ref to prevent Chrome GC

          if (chosenVoice) {
            utterance.voice = chosenVoice;
            utterance.lang = chosenVoice.lang || targetLang;
          } else {
            utterance.lang = targetLang;
          }

          utterance.volume = 1.0;
          utterance.rate = voiceSettings.rate || (isHindiText ? 0.94 : 0.96);
          utterance.pitch = voiceSettings.pitch || 1.02;

          utterance.onstart = () => {
            setState('speaking');
          };

          utterance.onend = () => {
            if (isSpeakingCancelledRef.current) return;
            if (currentIndex < sentences.length) {
              // Natural 70ms breathing pause between sentences
              sentenceTimeoutRef.current = setTimeout(speakNextSentence, 70);
            } else {
              utteranceRef.current = null;
              setState((prev) => (prev === 'speaking' ? 'idle' : prev));
              options?.onEnd?.();
            }
          };

          utterance.onerror = (e) => {
            utteranceRef.current = null;
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
              setError(t('voice.failed'));
            }
            setState((prev) => (prev === 'speaking' ? 'idle' : prev));
            options?.onEnd?.();
          };

          window.speechSynthesis.speak(utterance);

          // Chrome safety ping: if speech stops unexpectedly, resume
          setTimeout(() => {
            if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }, 150);
        };

        speakNextSentence();
      } catch {
        utteranceRef.current = null;
        setState('idle');
        options?.onEnd?.();
      }
    },
    [currentLang, stopSpeaking, t, voiceSettings]
  );

  const testVoice = useCallback(
    (sampleText?: string) => {
      const isHi = currentLang.startsWith('hi');
      const sample =
        sampleText ||
        (isHi
          ? 'नमस्ते! स्मार्ट कस्टमर केयर में आपका स्वागत है। मैं आपकी सहायता के लिए तैयार हूँ।'
          : 'Hello! Welcome to Smart Customer Care. I am ready to assist you today.');
      speak(sample);
    },
    [currentLang, speak]
  );

  const stopAll = useCallback(() => {
    cancelListening();
    stopSpeaking();
    setError(null);
  }, [cancelListening, stopSpeaking]);

  return {
    state,
    error,
    handsFree,
    setHandsFree,
    voiceSettings,
    updateVoiceSettings,
    availableVoices,
    testVoice,
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    stopAll,
  };
}
