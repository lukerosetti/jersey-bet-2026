import React, { useState, useEffect } from 'react';
import { useDraft } from './DraftContext';

function DraftLobby() {
  const { draftState, currentUser, startDraft, isCommissioner, logout, updateConfig, draftId } = useDraft();
  const [copied, setCopied] = useState(false);
  const config = draftState?.config || {};
  const owners = draftState?.owners || {};
  const ownerList = Object.entries(owners).map(([id, data]) => ({ id, ...data }));
  const onlineCount = ownerList.filter(o => o.online).length;
  const totalOwners = ownerList.length;

  const draftTypeLabel = config.type === 'snake' ? 'Snake Draft' : config.type === 'auction' ? 'Auction Draft' : 'Draft';

  // Scheduled draft time
  const [scheduledTime, setScheduledTime] = useState(config.scheduledTime || '');
  const [countdown, setCountdown] = useState(null);
  const [showScheduler, setShowScheduler] = useState(false);

  // Countdown timer
  useEffect(() => {
    const schedTime = config.scheduledTime;
    if (!schedTime) { setCountdown(null); return; }

    const tick = () => {
      const remaining = Math.max(0, schedTime - Date.now());
      setCountdown(remaining);

      // Auto-start when countdown hits zero
      if (remaining <= 0 && config.status === 'waiting') {
        if (isCommissioner) {
          startDraft();
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [config.scheduledTime, config.status, isCommissioner, startDraft]);

  const handleSchedule = () => {
    if (!scheduledTime) return;
    const timestamp = new Date(scheduledTime).getTime();
    if (timestamp <= Date.now()) return;
    updateConfig({ scheduledTime: timestamp });
    setShowScheduler(false);
  };

  const handleClearSchedule = () => {
    updateConfig({ scheduledTime: null });
    setScheduledTime('');
  };

  const formatCountdown = (ms) => {
    if (ms <= 0) return 'Starting...';
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const formatScheduledDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Get default datetime for the input (tomorrow at 8pm)
  const getDefaultScheduleTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="draft-lobby">
      <div className="draft-lobby-card">
        <h2>{config.name || 'Draft Lobby'}</h2>
        <p className="draft-subtitle">{draftTypeLabel} &middot; {config.rosterSize || '?'} picks per person &middot; {config.timerSeconds || 120}s timer</p>

        {draftId && (
          <div className="lobby-pool-code" onClick={() => {
            navigator.clipboard?.writeText(draftId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
          }}>
            <span className="lobby-pool-label">Pool Code</span>
            <span className="lobby-pool-value">{draftId}</span>
            <span className="lobby-pool-copy">{copied ? 'Copied!' : 'Tap to copy'}</span>
          </div>
        )}

        {/* Scheduled draft countdown */}
        {config.scheduledTime && countdown !== null && (
          <div className={`lobby-countdown ${countdown <= 60000 ? 'imminent' : ''}`}>
            <div className="lobby-countdown-label">Draft starts in</div>
            <div className="lobby-countdown-time">{formatCountdown(countdown)}</div>
            <div className="lobby-countdown-date">{formatScheduledDate(config.scheduledTime)}</div>
            {isCommissioner && (
              <button className="lobby-countdown-clear" onClick={handleClearSchedule}>Cancel schedule</button>
            )}
          </div>
        )}

        <div className="lobby-status">
          <span className="lobby-online">{onlineCount}/{totalOwners} online</span>
        </div>

        <div className="lobby-owners">
          {ownerList.map(owner => (
            <div key={owner.id} className={`lobby-owner ${owner.online ? 'online' : ''} ${owner.id === currentUser?.ownerId ? 'you' : ''}`}>
              <div className="lobby-owner-dot" style={{ background: owner.online ? '#22c55e' : '#555' }}></div>
              <span className="lobby-owner-avatar" style={{ background: owner.color }}>{owner.initials}</span>
              <span className="lobby-owner-name">
                {owner.name}
                {owner.id === currentUser?.ownerId && <span className="lobby-you-badge">You</span>}
                {owner.id === config.commissioner && <span className="lobby-comm-badge">Commissioner</span>}
              </span>
              <span className="lobby-owner-status">{owner.online ? 'Ready' : 'Offline'}</span>
            </div>
          ))}
        </div>

        {config.draftOrder && (
          <div className="lobby-order">
            <div className="lobby-order-title">Draft Order</div>
            <div className="lobby-order-list">
              {config.draftOrder.map((ownerId, idx) => {
                const owner = owners[ownerId];
                return (
                  <div key={ownerId} className="lobby-order-item">
                    <span className="lobby-order-num">{idx + 1}</span>
                    <span className="lobby-order-dot" style={{ background: owner?.color || '#555' }}></span>
                    <span>{owner?.name || ownerId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="lobby-actions">
          {isCommissioner && (
            <>
              {/* Schedule draft option */}
              {!config.scheduledTime && (
                <>
                  {showScheduler ? (
                    <div className="lobby-scheduler">
                      <label className="lobby-scheduler-label">Set draft time</label>
                      <input
                        type="datetime-local"
                        className="draft-input"
                        value={scheduledTime || getDefaultScheduleTime()}
                        onChange={e => setScheduledTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <div className="lobby-scheduler-btns">
                        <button className="draft-start-btn" onClick={handleSchedule}>Schedule Draft</button>
                        <button className="draft-logout-btn" onClick={() => setShowScheduler(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="lobby-start-options">
                      <button className="draft-start-btn" onClick={startDraft} disabled={onlineCount < 1}>
                        Start Now
                      </button>
                      <button className="draft-schedule-btn" onClick={() => setShowScheduler(true)}>
                        Schedule for Later
                      </button>
                    </div>
                  )}
                </>
              )}
              {/* If scheduled, allow starting early */}
              {config.scheduledTime && countdown > 0 && (
                <button className="draft-start-btn" onClick={startDraft}>
                  Start Early
                </button>
              )}
            </>
          )}
          {!isCommissioner && !config.scheduledTime && (
            <p className="lobby-waiting">Waiting for the commissioner to start the draft...</p>
          )}
          {!isCommissioner && config.scheduledTime && countdown > 0 && (
            <p className="lobby-waiting">Draft starts automatically at the scheduled time. Set your queue before it begins!</p>
          )}
          <button className="draft-logout-btn" onClick={logout}>Leave Lobby</button>
        </div>
      </div>
    </div>
  );
}

export default DraftLobby;
