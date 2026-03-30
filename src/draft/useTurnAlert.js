import { useEffect, useRef } from 'react';

// Play a notification sound and vibrate when it becomes your turn
export function useTurnAlert(isMyTurn) {
  const prevTurn = useRef(false);

  useEffect(() => {
    // Only alert on transition from not-my-turn to my-turn
    if (isMyTurn && !prevTurn.current) {
      // Vibrate (mobile)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Play sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Two-tone notification: C5 then E5
        [523.25, 659.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
      } catch {}
    }
    prevTurn.current = isMyTurn;
  }, [isMyTurn]);
}

// Play a warning sound when timer is low (15 seconds)
export function useTimerWarning(timeLeft, isMyTurn) {
  const warned = useRef(false);

  useEffect(() => {
    if (isMyTurn && timeLeft === 15 && !warned.current) {
      warned.current = true;
      if (navigator.vibrate) navigator.vibrate(100);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } catch {}
    }
    if (timeLeft > 15) warned.current = false;
  }, [timeLeft, isMyTurn]);
}
