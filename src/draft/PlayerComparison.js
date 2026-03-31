import React from 'react';
import { getPlayerStats } from './playerStats';
import { getPlayerData } from './draftUtils';

function PlayerComparison({ player1, player2, playerData, onClose }) {
  const data1 = getPlayerData(playerData, player1);
  const data2 = getPlayerData(playerData, player2);
  const stats1 = getPlayerStats(player1);
  const stats2 = getPlayerStats(player2);

  const getFlag = (code) => {
    if (!code) return '';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  };

  const rows = [
    { label: 'World Rank', v1: data1.owgr || '—', v2: data2.owgr || '—', lower: true },
    { label: 'Major Wins', v1: stats1?.majors ?? '—', v2: stats2?.majors ?? '—' },
    { label: 'Masters Wins', v1: stats1?.mastersWins ?? '—', v2: stats2?.mastersWins ?? '—' },
    { label: 'Masters Avg', v1: stats1?.mastersAvg?.toFixed(1) ?? '—', v2: stats2?.mastersAvg?.toFixed(1) ?? '—', lower: true },
    { label: 'Best Masters', v1: stats1?.bestMasters || '—', v2: stats2?.bestMasters || '—' },
    { label: 'Season Wins', v1: stats1?.seasonWins ?? '—', v2: stats2?.seasonWins ?? '—' },
    { label: 'Season Top 10s', v1: stats1?.seasonTop10 ?? '—', v2: stats2?.seasonTop10 ?? '—' },
    { label: 'Odds', v1: stats1?.odds || '—', v2: stats2?.odds || '—' },
  ];

  const getWinner = (row) => {
    const a = parseFloat(row.v1);
    const b = parseFloat(row.v2);
    if (isNaN(a) || isNaN(b)) return null;
    if (row.lower) return a < b ? 1 : a > b ? 2 : null;
    return a > b ? 1 : a < b ? 2 : null;
  };

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={e => e.stopPropagation()}>
        <button className="player-modal-close" onClick={onClose}>{'\u00D7'}</button>
        <div className="comparison-header">
          <div className="comparison-player">
            <span className="comparison-flag">{getFlag(data1.country)}</span>
            <span className="comparison-name">{player1.split(' ').pop()}</span>
          </div>
          <span className="comparison-vs">VS</span>
          <div className="comparison-player">
            <span className="comparison-flag">{getFlag(data2.country)}</span>
            <span className="comparison-name">{player2.split(' ').pop()}</span>
          </div>
        </div>
        <div className="comparison-rows">
          {rows.map((row, idx) => {
            const winner = getWinner(row);
            return (
              <div key={idx} className="comparison-row">
                <span className={`comparison-val ${winner === 1 ? 'winning' : ''}`}>{row.v1}</span>
                <span className="comparison-label">{row.label}</span>
                <span className={`comparison-val ${winner === 2 ? 'winning' : ''}`}>{row.v2}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PlayerComparison;
