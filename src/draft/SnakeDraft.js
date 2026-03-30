import React, { useState, useEffect, useCallback } from 'react';
import { useDraft } from './DraftContext';
import { getSnakeOrder, getCurrentPick, getUpcomingPicks, getDraftProgress } from './draftLogic';
import PlayerModal from './PlayerModal';

function SnakeDraft() {
  const { draftState, currentUser, makeSnakePick, autoPick } = useDraft();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const config = draftState?.config || {};
  const owners = draftState?.owners || {};
  const picks = draftState?.picks || [];
  const available = draftState?.availablePlayers || [];
  const playerData = draftState?.playerData || {};
  const currentPick = draftState?.currentPick;

  // Convert country code to flag emoji
  const getFlag = (playerName) => {
    const data = playerData[playerName];
    if (!data?.country) return '';
    const code = data.country.toUpperCase();
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  };
  const getOwgr = (playerName) => playerData[playerName]?.owgr || '';

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
      {/* Sticky draft tracker */}
      <div className="draft-tracker">
        {/* Current pick + timer */}
        <div className="draft-tracker-top">
          {currentPickInfo && (
            <div className={`draft-tracker-clock ${isMyTurn ? 'your-turn' : ''}`}>
              <span className="draft-tracker-dot" style={{ background: owners[currentPickInfo.ownerId]?.color || '#555' }}></span>
              <span className="draft-tracker-who">
                {isMyTurn ? 'Your Pick!' : `${owners[currentPickInfo.ownerId]?.name || currentPickInfo.ownerId}`}
              </span>
              {timeLeft !== null && (
                <span className={`draft-tracker-timer ${timeLeft <= 15 ? 'urgent' : ''}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              )}
            </div>
          )}
          <div className="draft-tracker-meta">
            <span>Rd {currentPickInfo?.round || '?'}</span>
            <span className="draft-tracker-divider">{'\u00B7'}</span>
            <span>Pick {picks.length + 1}/{snakeOrder.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="draft-tracker-progress">
          <div className="draft-tracker-progress-fill" style={{ width: `${progress.percent}%` }}></div>
        </div>

        {/* Pick history ticker — scrollable horizontal */}
        {picks.length > 0 && (
          <div className="draft-tracker-history">
            {[...picks].reverse().map((pick, idx) => (
              <div key={idx} className="draft-tracker-pick">
                <span className="draft-tracker-pick-num">#{picks.length - idx}</span>
                <span className="draft-tracker-pick-dot" style={{ background: owners[pick.ownerId]?.color || '#555' }}></span>
                <span className="draft-tracker-pick-owner">{owners[pick.ownerId]?.name}</span>
                <span className="draft-tracker-pick-flag">{getFlag(pick.player)}</span>
                <span className="draft-tracker-pick-player">{pick.player}</span>
                {pick.autoPick && <span className="auto-badge">Auto</span>}
              </div>
            ))}
          </div>
        )}

        {/* Up next */}
        <div className="draft-tracker-next">
          <span className="draft-tracker-next-label">Next:</span>
          {upcoming.slice(1, 6).map((pick, idx) => (
            <span key={idx} className="draft-tracker-next-item">
              <span className="draft-tracker-next-dot" style={{ background: owners[pick.ownerId]?.color || '#555' }}></span>
              {owners[pick.ownerId]?.name}
            </span>
          ))}
        </div>
      </div>

      {/* Upcoming picks (hidden — moved into tracker) */}
      <div className="draft-upcoming" style={{ display: 'none' }}>
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
              onClick={() => setSelectedPlayer(player)}
            >
              <span className="draft-player-rank">{getOwgr(player) || (available.indexOf(player) + 1)}</span>
              <span className="draft-player-flag">{getFlag(player)}</span>
              <span className="draft-player-name">{player}</span>
              <span className="draft-player-arrow">{'\u203A'}</span>
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
                      <span className="draft-roster-flag">{getFlag(team)}</span>
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

      {/* Player detail modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          playerData={playerData}
          isMyTurn={isMyTurn}
          onDraft={handlePick}
          onClose={() => setSelectedPlayer(null)}
          owners={owners}
          picks={picks}
        />
      )}
    </div>
  );
}

export default SnakeDraft;
