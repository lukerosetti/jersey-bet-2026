import React from 'react';

function PlayerModal({ player, playerData, isMyTurn, onDraft, onClose, owners, picks }) {
  const data = playerData?.[player] || {};
  const flag = getFlag(data.country);
  const owgr = data.owgr || '—';

  // Find who picked this player (if already drafted)
  const pickInfo = picks?.find(p => p.player === player);
  const drafter = pickInfo ? owners?.[pickInfo.ownerId] : null;

  // Count how many times this player has been in the Masters (mock data for now)
  const mastersHistory = getMastersHistory(player);

  function getFlag(countryCode) {
    if (!countryCode) return '';
    const code = countryCode.toUpperCase();
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  }

  function getMastersHistory(name) {
    // Notable Masters records — expand as needed
    const records = {
      'Tiger Woods': { wins: 5, cuts: 23, best: '1st (2019)' },
      'Phil Mickelson': { wins: 3, cuts: 28, best: '1st (2010)' },
      'Rory McIlroy': { wins: 1, cuts: 10, best: '1st (2025)' },
      'Scottie Scheffler': { wins: 2, cuts: 4, best: '1st (2024)' },
      'Jordan Spieth': { wins: 1, cuts: 9, best: '1st (2015)' },
      'Dustin Johnson': { wins: 1, cuts: 12, best: '1st (2020)' },
      'Hideki Matsuyama': { wins: 1, cuts: 10, best: '1st (2021)' },
      'Jon Rahm': { wins: 0, cuts: 6, best: 'T4 (2023)' },
      'Bubba Watson': { wins: 2, cuts: 14, best: '1st (2014)' },
      'Sergio Garcia': { wins: 1, cuts: 22, best: '1st (2017)' },
      'Danny Willett': { wins: 1, cuts: 4, best: '1st (2016)' },
      'Charl Schwartzel': { wins: 1, cuts: 11, best: '1st (2011)' },
      'Adam Scott': { wins: 1, cuts: 17, best: '1st (2013)' },
      'Patrick Reed': { wins: 1, cuts: 7, best: '1st (2018)' },
      'Xander Schauffele': { wins: 0, cuts: 6, best: 'T2 (2024)' },
      'Collin Morikawa': { wins: 0, cuts: 4, best: 'T5 (2023)' },
      'Viktor Hovland': { wins: 0, cuts: 4, best: 'T10 (2023)' },
      'Cameron Smith': { wins: 0, cuts: 5, best: 'T3 (2022)' },
    };
    return records[name] || null;
  }

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal" onClick={e => e.stopPropagation()}>
        <button className="player-modal-close" onClick={onClose}>{'\u00D7'}</button>

        {/* Player header */}
        <div className="player-modal-header">
          <div className="player-modal-flag">{flag}</div>
          <div className="player-modal-info">
            <h2 className="player-modal-name">{player}</h2>
            <div className="player-modal-country">{data.country ? getCountryName(data.country) : ''}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="player-modal-stats">
          <div className="player-stat-card">
            <div className="player-stat-value">{owgr}</div>
            <div className="player-stat-label">World Ranking</div>
          </div>
          {mastersHistory && (
            <>
              <div className="player-stat-card">
                <div className="player-stat-value">{mastersHistory.wins}</div>
                <div className="player-stat-label">Masters Wins</div>
              </div>
              <div className="player-stat-card">
                <div className="player-stat-value">{mastersHistory.cuts}</div>
                <div className="player-stat-label">Masters Starts</div>
              </div>
              <div className="player-stat-card">
                <div className="player-stat-value">{mastersHistory.best}</div>
                <div className="player-stat-label">Best Finish</div>
              </div>
            </>
          )}
          {!mastersHistory && (
            <>
              <div className="player-stat-card">
                <div className="player-stat-value">—</div>
                <div className="player-stat-label">Masters Wins</div>
              </div>
              <div className="player-stat-card">
                <div className="player-stat-value">Debut</div>
                <div className="player-stat-label">Masters History</div>
              </div>
            </>
          )}
        </div>

        {/* Draft status */}
        {drafter && (
          <div className="player-modal-drafted">
            <span className="player-modal-drafted-dot" style={{ background: drafter.color }}></span>
            Drafted by <strong>{drafter.name}</strong> (Pick #{pickInfo.pick})
          </div>
        )}

        {/* Draft button */}
        {!drafter && isMyTurn && (
          <button className="player-modal-draft-btn" onClick={() => { onDraft(player); onClose(); }}>
            Draft {player}
          </button>
        )}

        {!drafter && !isMyTurn && (
          <div className="player-modal-wait">Not your turn</div>
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
