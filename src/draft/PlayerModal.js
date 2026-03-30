import React from 'react';
import { getPlayerStats } from './playerStats';

function PlayerModal({ player, playerData, isMyTurn, onDraft, onClose, owners, picks, onAddToQueue, isQueued }) {
  const data = playerData?.[player] || {};
  const stats = getPlayerStats(player);
  const flag = getFlag(data.country);
  const owgr = data.owgr || '—';

  const pickInfo = picks?.find(p => p.player === player);
  const drafter = pickInfo ? owners?.[pickInfo.ownerId] : null;

  function getFlag(countryCode) {
    if (!countryCode) return '';
    const code = countryCode.toUpperCase();
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  }

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={e => e.stopPropagation()}>
        <button className="player-modal-close" onClick={onClose}>{'\u00D7'}</button>

        {/* Player header */}
        <div className="player-modal-header">
          {data.espnId ? (
            <img
              className="player-modal-headshot"
              src={`https://a.espncdn.com/i/headshots/golf/players/full/${data.espnId}.png`}
              alt={player}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div className="player-modal-flag" style={data.espnId ? { display: 'none' } : {}}>{flag}</div>
          <div className="player-modal-info">
            <h2 className="player-modal-name">{player}</h2>
            <div className="player-modal-country">{data.country ? getCountryName(data.country) : ''}</div>
          </div>
          {stats?.odds && <div className="player-modal-odds">{stats.odds}</div>}
        </div>

        {/* Primary stats */}
        <div className="player-modal-stats">
          <div className="player-stat-card">
            <div className="player-stat-value">{owgr}</div>
            <div className="player-stat-label">World Rank</div>
          </div>
          <div className="player-stat-card">
            <div className="player-stat-value">{stats?.majors ?? '—'}</div>
            <div className="player-stat-label">Major Wins</div>
          </div>
          <div className="player-stat-card">
            <div className="player-stat-value">{stats?.seasonWins ?? '—'}</div>
            <div className="player-stat-label">Wins This Season</div>
          </div>
          <div className="player-stat-card">
            <div className="player-stat-value">{stats?.seasonTop10 ?? '—'}</div>
            <div className="player-stat-label">Top 10s This Season</div>
          </div>
        </div>

        {/* Masters history section */}
        <div className="player-modal-section">
          <div className="player-modal-section-title">Masters History</div>
          <div className="player-modal-stats">
            <div className="player-stat-card">
              <div className="player-stat-value masters-green">{stats?.mastersWins ?? '—'}</div>
              <div className="player-stat-label">Green Jackets</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{stats?.mastersMade ?? '—'}</div>
              <div className="player-stat-label">Appearances</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{stats?.mastersAvg ? stats.mastersAvg.toFixed(1) : '—'}</div>
              <div className="player-stat-label">Avg Finish</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value" style={{ fontSize: stats?.bestMasters?.length > 8 ? '14px' : '20px' }}>{stats?.bestMasters || (stats?.mastersMade === 0 ? 'Debut' : '—')}</div>
              <div className="player-stat-label">Best Finish</div>
            </div>
          </div>
        </div>

        {/* Scouting note */}
        {stats?.note && (
          <div className="player-modal-note">
            <div className="player-modal-note-label">Scouting Report</div>
            <div className="player-modal-note-text">{stats.note}</div>
          </div>
        )}

        {/* Draft status / button */}
        {drafter && (
          <div className="player-modal-drafted">
            <span className="player-modal-drafted-dot" style={{ background: drafter.color }}></span>
            Drafted by <strong>{drafter.name}</strong> (Pick #{pickInfo.pick})
          </div>
        )}

        {!drafter && (
          <div className="player-modal-actions">
            {isMyTurn && (
              <button className="player-modal-draft-btn" onClick={() => { onDraft(player); onClose(); }}>
                Draft {player}
              </button>
            )}
            {!isMyTurn && (
              <div className="player-modal-wait">Not your turn</div>
            )}
            {onAddToQueue && !isQueued && (
              <button className="player-modal-queue-btn" onClick={() => { onAddToQueue(player); onClose(); }}>
                + Add to Queue
              </button>
            )}
            {isQueued && (
              <div className="player-modal-queued">In your queue</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getCountryName(code) {
  const countries = {
    US: 'United States', GB: 'England', IE: 'Ireland', ES: 'Spain', SE: 'Sweden',
    NO: 'Norway', JP: 'Japan', AU: 'Australia', CA: 'Canada', KR: 'South Korea',
    AT: 'Austria', NZ: 'New Zealand', DK: 'Denmark', FI: 'Finland', CO: 'Colombia',
    MX: 'Mexico', ZA: 'South Africa', CN: 'China', AR: 'Argentina', FJ: 'Fiji',
    TH: 'Thailand',
  };
  return countries[code] || code;
}

export default PlayerModal;
