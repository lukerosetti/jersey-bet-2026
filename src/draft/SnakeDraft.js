import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDraft } from './DraftContext';
import { setOwnerAFK } from '../firebase';
import { getSnakeOrder, getCurrentPick, getUpcomingPicks, getDraftProgress } from './draftLogic';
import PlayerModal from './PlayerModal';
import DraftChat from './DraftChat';
import PickReactions from './PickReactions';
import { useTurnAlert, useTimerWarning } from './useTurnAlert';
import DraftBoardGrid from './DraftBoardGrid';
import * as pdUtils from './draftUtils';
import PlayerComparison from './PlayerComparison';
import DraftGrades from './DraftGrades';
import DraftOrderReveal from './DraftOrderReveal';

function SnakeDraft() {
  const { draftState, currentUser, makeSnakePick, autoPick, draftId, isCommissioner } = useDraft();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' | 'rosters'
  const [comparePlayer1, setComparePlayer1] = useState(null);
  const [comparePlayer2, setComparePlayer2] = useState(null);
  const [showReveal, setShowReveal] = useState(false);
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('draftQueue') || '[]'); } catch { return []; }
  });
  const [showQueue, setShowQueue] = useState(false);

  // Persist queue to localStorage
  useEffect(() => {
    localStorage.setItem('draftQueue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = (player) => {
    if (!queue.includes(player)) setQueue(prev => [...prev, player]);
  };
  const removeFromQueue = (player) => {
    setQueue(prev => prev.filter(p => p !== player));
  };
  const moveInQueue = (player, direction) => {
    setQueue(prev => {
      const idx = prev.indexOf(player);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return updated;
    });
  };

  const config = draftState?.config || {};
  const owners = draftState?.owners || {};
  const picks = draftState?.picks || [];
  const available = draftState?.availablePlayers || [];
  const playerData = draftState?.playerData || {};
  const currentPick = draftState?.currentPick;

  // Remove drafted players from queue
  const activeQueue = queue.filter(p => available.includes(p));

  // Player data helpers (sanitized Firebase key lookups)
  const _pd = (name) => pdUtils.getPlayerData(playerData, name);
  const getFlag = (name) => pdUtils.getFlag(_pd(name)?.country);
  const getOwgr = (name) => _pd(name)?.owgr || '';
  const getHeadshotUrl = (name) => pdUtils.getHeadshotUrl(playerData, name);

  const ownerIds = config.draftOrder?.length > 0 ? config.draftOrder : Object.keys(owners).filter(id => owners[id]?.claimed || owners[id]?.name);
  const snakeOrder = getSnakeOrder(ownerIds, config.rosterSize || 10);
  const currentPickInfo = getCurrentPick(snakeOrder, picks.length);
  const upcoming = getUpcomingPicks(snakeOrder, picks.length, 8);
  const progress = getDraftProgress(picks.length, snakeOrder.length);
  const isMyTurn = currentPickInfo && currentUser && currentPickInfo.ownerId === currentUser.ownerId;

  // Feature #3: Turn alerts (sound + vibration)
  useTurnAlert(isMyTurn);
  useTimerWarning(timeLeft, isMyTurn);

  // Feature #5: Value highlight — player ranked higher than current pick position
  const isValuePick = (playerName) => {
    const owgr = _pd(playerName)?.owgr;
    if (!owgr) return false;
    return owgr < picks.length + 1; // OWGR better than pick number = value
  };

  // Feature #9: Show reveal animation if draft just started (0 picks)
  useEffect(() => {
    if (config.status === 'active' && picks.length === 0 && ownerIds.length > 1) {
      setShowReveal(true);
    }
  }, [config.status, picks.length, ownerIds.length]);

  // Check if the current picker is offline or AFK
  const currentPickerOnline = currentPickInfo ? owners[currentPickInfo.ownerId]?.online : false;
  const currentPickerAfk = currentPickInfo ? owners[currentPickInfo.ownerId]?.afk : false;

  // AFK auto-pick: if it's an AFK player's turn, commissioner auto-picks immediately
  const afkPickedRef = useRef(null);
  useEffect(() => {
    if (!currentPickInfo || showReveal) return;
    const pickerId = currentPickInfo.ownerId;
    if (owners[pickerId]?.afk && isCommissioner && afkPickedRef.current !== picks.length) {
      // Prevent double-pick with ref
      afkPickedRef.current = picks.length;
      autoPick();
    }
  }, [currentPickInfo, owners, isCommissioner, showReveal, autoPick, picks.length]);

  // Wake Lock — keep screen awake during draft
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {}
    };
    requestWakeLock();
    // Re-acquire on visibility change (iOS drops it when tab switches)
    const handleVisibility = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Pick timer countdown + auto-pick on timeout
  useEffect(() => {
    if (!currentPick?.deadline || showReveal) { setTimeLeft(null); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((currentPick.deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (isMyTurn) {
          // My timer expired — flag myself as AFK and auto-pick
          setOwnerAFK(draftId, currentUser.ownerId, true).catch(() => {});
          if (activeQueue.length > 0) {
            makeSnakePick(activeQueue[0]);
          } else {
            autoPick();
          }
        } else if (isCommissioner && (!currentPickerOnline || currentPickerAfk)) {
          // Commissioner auto-picks for offline/AFK owners
          if (!currentPickerAfk) {
            setOwnerAFK(draftId, currentPickInfo.ownerId, true).catch(() => {});
          }
          autoPick();
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentPick?.deadline, isMyTurn, isCommissioner, currentPickerOnline, currentPickerAfk, autoPick, makeSnakePick, activeQueue, draftId, currentUser, currentPickInfo]);

  const handlePick = useCallback((player) => {
    if (!isMyTurn) return;
    makeSnakePick(player);
    setSearchQuery('');
  }, [isMyTurn, makeSnakePick]);

  // Start compare mode
  const startCompare = (player) => {
    if (!comparePlayer1) {
      setComparePlayer1(player);
    } else if (!comparePlayer2 && player !== comparePlayer1) {
      setComparePlayer2(player);
    }
  };

  // Filter available players
  const filteredPlayers = searchQuery
    ? available.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    : available;

  // Get owner's drafted teams
  const getOwnerTeams = (ownerId) => owners[ownerId]?.teams || [];

  // Last pick
  const lastPick = picks.length > 0 ? picks[picks.length - 1] : null;

  // Feature #9: Draft Order Reveal
  if (showReveal) {
    return <DraftOrderReveal owners={owners} draftOrder={ownerIds} onComplete={() => setShowReveal(false)} />;
  }

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

        {/* Pick history ticker with reactions */}
        {picks.length > 0 && (
          <div className="draft-tracker-history">
            {[...picks].reverse().map((pick, idx) => {
              const pickIndex = picks.length - 1 - idx;
              return (
                <div key={idx} className="draft-tracker-pick">
                  <div className="draft-tracker-pick-info">
                    <span className="draft-tracker-pick-num">#{picks.length - idx}</span>
                    <span className="draft-tracker-pick-dot" style={{ background: owners[pick.ownerId]?.color || '#555' }}></span>
                    <span className="draft-tracker-pick-owner">{owners[pick.ownerId]?.name}</span>
                    <span className="draft-tracker-pick-flag">{getFlag(pick.player)}</span>
                    <span className="draft-tracker-pick-player">{pick.player}</span>
                    {pick.autoPick && <span className="auto-badge">Auto</span>}
                  </div>
                  {/* Feature #2: Pick Reactions */}
                  <PickReactions draftId={draftId} pickIndex={pickIndex} currentUser={currentUser} />
                </div>
              );
            })}
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

      {/* View mode tabs */}
      <div className="draft-view-tabs">
        <button className={`draft-view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Players</button>
        <button className={`draft-view-tab ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Board</button>
        <button className={`draft-view-tab ${viewMode === 'rosters' ? 'active' : ''}`} onClick={() => setViewMode('rosters')}>Rosters</button>
        {comparePlayer1 && (
          <button className="draft-view-tab compare-tab" onClick={() => { setComparePlayer1(null); setComparePlayer2(null); }}>
            Compare {comparePlayer1 ? '1' : '0'}/2 {'\u00D7'}
          </button>
        )}
      </div>

      {/* Feature #4: Draft Board Grid */}
      {viewMode === 'grid' && (
        <DraftBoardGrid picks={picks} owners={owners} config={config} playerData={playerData} />
      )}

      {/* Players list view */}
      {viewMode === 'list' && (
        <>
          {/* Draft Queue */}
          <div className="draft-queue-bar">
            <button className={`draft-queue-toggle ${showQueue ? 'open' : ''}`} onClick={() => setShowQueue(!showQueue)}>
              <span className="draft-queue-icon">My Queue</span>
              {activeQueue.length > 0 && <span className="draft-queue-count">{activeQueue.length}</span>}
              <span className="draft-queue-chevron">{showQueue ? '\u25B2' : '\u25BC'}</span>
            </button>
            {isMyTurn && activeQueue.length > 0 && !showQueue && (
              <button className="draft-queue-quick" onClick={() => handlePick(activeQueue[0])}>
                Draft #{1}: {activeQueue[0]}
              </button>
            )}
          </div>
          {showQueue && (
            <div className="draft-queue-panel">
              {activeQueue.length === 0 ? (
                <div className="draft-queue-empty">No players queued. Tap a player and select "Add to Queue" to build your wishlist.</div>
              ) : (
                activeQueue.map((player, idx) => (
                  <div key={player} className="draft-queue-item">
                    <span className="draft-queue-num">{idx + 1}</span>
                    <span className="draft-queue-flag">{getFlag(player)}</span>
                    <span className="draft-queue-name">{player}</span>
                    <div className="draft-queue-actions">
                      <button className="draft-queue-move" onClick={() => moveInQueue(player, -1)} disabled={idx === 0}>{'\u25B2'}</button>
                      <button className="draft-queue-move" onClick={() => moveInQueue(player, 1)} disabled={idx === activeQueue.length - 1}>{'\u25BC'}</button>
                      <button className="draft-queue-remove" onClick={() => removeFromQueue(player)}>{'\u00D7'}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

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
              {filteredPlayers.map((player) => {
                const headshotUrl = getHeadshotUrl(player);
                const value = isValuePick(player);
                return (
                  <button
                    key={player}
                    className={`draft-player-btn ${isMyTurn ? 'pickable' : ''} ${value ? 'value-pick' : ''} ${comparePlayer1 === player ? 'compare-selected' : ''}`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <span className="draft-player-rank">{getOwgr(player) || '—'}</span>
                    {headshotUrl ? (
                      <img className="draft-player-headshot" src={headshotUrl} alt="" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }} />
                    ) : null}
                    <span className="draft-player-flag" style={headshotUrl ? { display: 'none' } : {}}>{getFlag(player)}</span>
                    <span className="draft-player-name">{player}</span>
                    {/* Feature #5: Value badge */}
                    {value && <span className="draft-value-badge">VALUE</span>}
                    <span className="draft-player-arrow">{'\u203A'}</span>
                  </button>
                );
              })}
              {filteredPlayers.length === 0 && <div className="draft-empty">No players match "{searchQuery}"</div>}
            </div>
          </div>
        </>
      )}

      {/* Rosters view */}
      {viewMode === 'rosters' && (
        <div className="draft-rosters">
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
      )}

      {/* Feature #1: Draft Chat FAB */}
      <DraftChat draftId={draftId} currentUser={currentUser} owners={owners} />

      {/* Feature #6: Player Comparison */}
      {comparePlayer1 && comparePlayer2 && (
        <PlayerComparison
          player1={comparePlayer1}
          player2={comparePlayer2}
          playerData={playerData}
          onClose={() => { setComparePlayer1(null); setComparePlayer2(null); }}
        />
      )}

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
          onAddToQueue={addToQueue}
          isQueued={queue.includes(selectedPlayer)}
          onCompare={startCompare}
          isComparing={!!comparePlayer1}
        />
      )}
    </div>
  );
}

export default SnakeDraft;
