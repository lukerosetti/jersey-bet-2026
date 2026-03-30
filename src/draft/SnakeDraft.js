import React, { useState, useEffect, useCallback } from 'react';
import { useDraft } from './DraftContext';
import { getSnakeOrder, getCurrentPick, getUpcomingPicks, getDraftProgress } from './draftLogic';

function SnakeDraft() {
  const { draftState, currentUser, makeSnakePick, autoPick } = useDraft();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  const config = draftState?.config || {};
  const owners = draftState?.owners || {};
  const picks = draftState?.picks || [];
  const available = draftState?.availablePlayers || [];
  const currentPick = draftState?.currentPick;

  const ownerIds = config.draftOrder || Object.keys(owners);
  const snakeOrder = getSnakeOrder(ownerIds, config.rosterSize || 10);
  const currentPickInfo = getCurrentPick(snakeOrder, picks.length);
  const upcoming = getUpcomingPicks(snakeOrder, picks.length, 8);
  const progress = getDraftProgress(picks.length, snakeOrder.length);
  const isMyTurn = currentPickInfo && currentUser && currentPickInfo.ownerId === currentUser.ownerId;

  // Pick timer countdown
  useEffect(() => {
    if (!currentPick?.deadline) { setTimeLeft(null); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((currentPick.deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && isMyTurn) {
        autoPick();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentPick?.deadline, isMyTurn, autoPick]);

  const handlePick = useCallback((player) => {
    if (!isMyTurn) return;
    makeSnakePick(player);
    setSearchQuery('');
  }, [isMyTurn, makeSnakePick]);

  // Filter available players
  const filteredPlayers = searchQuery
    ? available.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    : available;

  // Get owner's drafted teams
  const getOwnerTeams = (ownerId) => owners[ownerId]?.teams || [];

  // Last pick
  const lastPick = picks.length > 0 ? picks[picks.length - 1] : null;

  if (progress.isComplete) return null; // DraftRouter handles complete state

  return (
    <div className="snake-draft">
      {/* Header with progress */}
      <div className="draft-header">
        <div className="draft-progress-bar">
          <div className="draft-progress-fill" style={{ width: `${progress.percent}%` }}></div>
        </div>
        <div className="draft-progress-text">Pick {picks.length + 1} of {snakeOrder.length} &middot; Round {currentPickInfo?.round || '?'}</div>
      </div>

      {/* Current pick indicator */}
      {currentPickInfo && (
        <div className={`draft-current-pick ${isMyTurn ? 'your-turn' : ''}`}>
          <div className="draft-on-clock">
            <span className="draft-on-clock-dot" style={{ background: owners[currentPickInfo.ownerId]?.color || '#555' }}></span>
            <span className="draft-on-clock-name">
              {isMyTurn ? 'Your Pick!' : `${owners[currentPickInfo.ownerId]?.name || currentPickInfo.ownerId} is picking...`}
            </span>
          </div>
          {timeLeft !== null && (
            <div className={`draft-timer ${timeLeft <= 15 ? 'urgent' : ''}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Last pick notification */}
      {lastPick && (
        <div className="draft-last-pick">
          <span className="draft-last-dot" style={{ background: owners[lastPick.ownerId]?.color || '#555' }}></span>
          <span>{owners[lastPick.ownerId]?.name} picked <strong>{lastPick.player}</strong></span>
          {lastPick.autoPick && <span className="auto-badge">Auto</span>}
        </div>
      )}

      {/* Upcoming picks */}
      <div className="draft-upcoming">
        <div className="draft-upcoming-title">Up Next</div>
        <div className="draft-upcoming-list">
          {upcoming.slice(1).map((pick, idx) => (
            <div key={idx} className="draft-upcoming-item">
              <span className="draft-upcoming-num">{picks.length + idx + 2}</span>
              <span className="draft-upcoming-dot" style={{ background: owners[pick.ownerId]?.color || '#555' }}></span>
              <span className="draft-upcoming-name">{owners[pick.ownerId]?.name || pick.ownerId}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available players board */}
      <div className="draft-board">
        <div className="draft-board-header">
          <span className="draft-board-title">Available ({available.length})</span>
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="draft-search"
          />
        </div>
        <div className="draft-player-grid">
          {filteredPlayers.map((player, idx) => (
            <button
              key={player}
              className={`draft-player-btn ${isMyTurn ? 'pickable' : ''}`}
              onClick={() => handlePick(player)}
              disabled={!isMyTurn}
            >
              <span className="draft-player-rank">{available.indexOf(player) + 1}</span>
              <span className="draft-player-name">{player}</span>
            </button>
          ))}
          {filteredPlayers.length === 0 && <div className="draft-empty">No players match "{searchQuery}"</div>}
        </div>
      </div>

      {/* Owner rosters */}
      <div className="draft-rosters">
        <div className="draft-rosters-title">Rosters</div>
        <div className="draft-rosters-grid">
          {ownerIds.map(ownerId => {
            const owner = owners[ownerId];
            const teams = getOwnerTeams(ownerId);
            return (
              <div key={ownerId} className={`draft-roster-card ${ownerId === currentUser?.ownerId ? 'mine' : ''}`}>
                <div className="draft-roster-header">
                  <span className="draft-roster-dot" style={{ background: owner?.color || '#555' }}></span>
                  <span className="draft-roster-name">{owner?.name || ownerId}</span>
                  <span className="draft-roster-count">{teams.length}/{config.rosterSize || '?'}</span>
                </div>
                <div className="draft-roster-list">
                  {teams.map((team, idx) => (
                    <div key={idx} className="draft-roster-item">
                      <span className="draft-roster-pick-num">{idx + 1}.</span>
                      <span>{team}</span>
                    </div>
                  ))}
                  {teams.length === 0 && <div className="draft-roster-empty">No picks yet</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SnakeDraft;
