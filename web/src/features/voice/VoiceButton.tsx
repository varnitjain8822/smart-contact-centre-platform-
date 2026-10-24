import { useTranslation } from 'react-i18next';
import { Loader2, Mic, Square, Volume2 } from 'lucide-react';
import type { VoiceState } from './useVoice';

export interface VoiceButtonProps {
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function VoiceButton({
  state,
  onStart,
  onStop,
  disabled = false,
  className = '',
  size = 'md',
}: VoiceButtonProps) {
  const { t } = useTranslation();

  const isListening = state === 'listening';
  const isTranscribing = state === 'transcribing';
  const isSpeaking = state === 'speaking';
  const isActive = isListening || isSpeaking;

  const handleClick = () => {
    if (disabled || isTranscribing) return;
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  const getLabel = () => {
    if (isListening) return t('voice.stopListening');
    if (isTranscribing) return t('voice.transcribing');
    if (isSpeaking) return t('voice.stopSpeaking');
    return t('voice.startListening');
  };

  const label = getLabel();
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      className={`relative grid shrink-0 place-items-center rounded-pill transition-colors ${
        size === 'sm' ? 'size-9' : 'size-11'
      } ${
        isListening
          ? 'bg-bad text-white animate-pulse shadow-sm'
          : isSpeaking
          ? 'bg-ai text-white animate-pulse shadow-sm'
          : isTranscribing
          ? 'bg-surface-2 text-muted cursor-wait'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40'
      } ${className}`}
    >
      {isListening ? (
        <Square aria-hidden size={size === 'sm' ? 13 : 15} fill="currentColor" />
      ) : isTranscribing ? (
        <Loader2 aria-hidden size={iconSize} className="animate-spin text-ai" />
      ) : isSpeaking ? (
        <Volume2 aria-hidden size={iconSize} />
      ) : (
        <Mic aria-hidden size={iconSize} />
      )}
      {isListening && (
        <span
          aria-hidden
          className="absolute -inset-1 animate-ping rounded-full border border-bad/40 pointer-events-none"
        />
      )}
    </button>
  );
}
