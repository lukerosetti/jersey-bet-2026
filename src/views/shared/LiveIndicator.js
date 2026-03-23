import React, { useState, useEffect } from 'react';

function LiveIndicator({ lastUpdate, isLoading, error }) {
  const formatTime = (date) => date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--:--';
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!lastUpdate) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      setCountdown(Math.max(0, 30 - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  return (
    <div className="live-indicator">
      <div className={`indicator-dot ${error ? 'error' : isLoading ? 'loading' : 'active'}`}></div>
      <span>{error ? 'Unable to load scores' : isLoading ? 'Updating...' : `Live scores · Updated ${formatTime(lastUpdate)}`}</span>
      {!error && !isLoading && lastUpdate && <span className="next-update">· {countdown}s</span>}
    </div>
  );
}

export default LiveIndicator;
