'use client';

import { StillWater } from './StillWater';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking';

interface VoiceOrbProps {
  status: VoiceStatus;
  isActive: boolean;
  onToggle: () => void;
}

export function VoiceOrb({ status, isActive, onToggle }: VoiceOrbProps) {
  // Map our status to isActive for StillWater (any active status means active)
  const isStillWaterActive = isActive && (status === 'listening' || status === 'speaking' || status === 'connecting');

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={onToggle}
        className="focus:outline-none"
        aria-label={isActive ? "Stop" : "Start"}
      >
        <StillWater isActive={isStillWaterActive} />
      </button>

      {!isActive && (
        <p className="text-xs text-muted-foreground/25 tracking-wider mt-2">
          tap to begin
        </p>
      )}
    </div>
  );
}

export default VoiceOrb;

