import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { cleanForSpeech, getSupportedAudioMime, pickVoice } from './voiceUtils';

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'speaking';

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isCancelledRef = useRef<boolean>(false);
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
        voicesRef.current = synth.getVoices?.() || [];
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

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
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
        const utterance = new SpeechSynthesisUtterance(clean);
        utteranceRef.current = utterance; // Keep ref to avoid garbage collection

        const voices = (voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()) || [];
        const voice = pickVoice(voices, isHindiText ? 'hi' : currentLang);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || targetLang;
        } else {
          utterance.lang = targetLang;
        }

        utterance.volume = 1.0;
        utterance.rate = isHindiText ? 0.95 : 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          setState('speaking');
        };

        const handleFinish = () => {
          utteranceRef.current = null;
          setState((prev) => (prev === 'speaking' ? 'idle' : prev));
          options?.onEnd?.();
        };

        utterance.onend = handleFinish;
        utterance.onerror = (e) => {
          utteranceRef.current = null;
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            setError(t('voice.failed'));
          }
          handleFinish();
        };

        window.speechSynthesis.speak(utterance);

        // Chrome safety ping: if speech stops unexpectedly, resume
        setTimeout(() => {
          if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 150);
      } catch {
        utteranceRef.current = null;
        setState('idle');
        options?.onEnd?.();
      }
    },
    [currentLang, stopSpeaking, t]
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
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    stopAll,
  };
}
