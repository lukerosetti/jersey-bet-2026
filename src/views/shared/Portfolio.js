import React, { useState, useEffect } from 'react';
import { owners, getOwner, scoringSystem } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';
import { calculateStandings } from '../../logic/scoring';
import { buildResolvedGames } from '../../logic/helpers';

function Portfolio({ liveGames, playInWinners, customizations, onGameClick, resolvedMap }) {
  const [history, setHistory] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const standings = calculateStandings(liveGames, playInWinners, resolvedMap);

  useEffect(() => {
    const saved = localStorage.getItem('portfolioHistory');
    if (saved) { try { setHistory(JSON.parse(saved)); } catch (e) { console.error('Error loading portfolio history:', e); } }
  }, []);

  useEffect(() => {
    const totalGames = resolvedMap ? Object.values(resolvedMap).filter(g => g.status === 'final').length : 0;
    if (totalGames > 0) {
      const currentSnapshot = { timestamp: Date.now(), games: totalGames, standings: standings.map(s => ({ id: s.id, points: s.points, teamsAlive: s.teamsAlive })) };
      const lastEntry = history[history.length - 1];
      if (!lastEntry || lastEntry.games !== totalGames) {
        const newHistory = [...history, currentSnapshot].slice(-20);
        setHistory(newHistory);
        localStorage.setItem('portfolioHistory', JSON.stringify(newHistory));
      }
    }
  }, [liveGames, playInWinners, standings, history]);

  const getChange = (owner) => {
    if (history.length < 2) return null;
    const prev = history[history.length - 2]?.standings?.find(s => s.id === owner.id);
    if (!prev || prev.points === 0) return null;
    return Math.round(((owner.points - prev.points) / Math.max(prev.points, 1)) * 100);
  };

  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);

  const findGameForTeam = (teamName) => {
    return Object.values(resolved).find(g => g.status === 'final' && (g.t1 === teamName || g.t2 === teamName));
  };

  const getHotTeams = () => {
    const recentWins = [];
    Object.values(resolved).forEach(game => {
      if (game.status === 'final') {
        const winner = game.sc1 > game.sc2 ? game.t1 : game.t2;
        const winnerSeed = game.sc1 > game.sc2 ? game.s1 : game.s2;
        const owner = getOwner(winner);
        if (owner) {
          const roundPoints = scoringSystem.rounds[game.round || 1] || 1;
          const multiplier = scoringSystem.getSeedMultiplier(winnerSeed);
          recentWins.push({ team: winner, owner, points: roundPoints * multiplier, round: game.round, game });
        }
      }
    });
    return recentWins.sort((a, b) => b.points - a.points).slice(0, 4);
  };

  const hotTeams = getHotTeams();
  const totalEliminated = standings.reduce((sum, s) => sum + s.teamsEliminated, 0);
  const totalAlive = standings.reduce((sum, s) => sum + s.teamsAlive, 0);

  return (
    <div className="portfolio-view">
      <div className="page-title"><h2>Portfolio</h2><p>Track your teams like stocks</p></div>
      <div className="portfolio-grid">
        {standings.map((player, idx) => {
          const change = getChange(player);
          const healthPct = player.teams.length > 0 ? (player.teamsAlive / player.teams.length) * 100 : 0;
          const isExpanded = expandedPlayer === player.id;
          return (
            <div key={player.id} className={`portfolio-card ${idx === 0 ? 'leader' : ''} ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedPlayer(isExpanded ? null : player.id)} style={{ cursor: 'pointer' }}>
              <div className="portfolio-header">
                <span className="portfolio-name" style={{ color: getCustomColor(player, customizations) }}>{player.name.toUpperCase()}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {change !== null && <span className={`portfolio-change ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? '\u2191' : '\u2193'} {Math.abs(change)}%</span>}
                  <span style={{ color: 'var(--text2)', fontSize: 12, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
                </div>
              </div>
              <div className="portfolio-points">{player.points}</div>
              <div className="portfolio-meta">{player.teamsAlive} alive · {player.teamsEliminated} eliminated</div>
              <div className="portfolio-bar"><div className="portfolio-bar-fill" style={{ width: `${healthPct}%`, background: getCustomColor(player, customizations) }}></div></div>
              {isExpanded && player.teamData && (
                <div className="portfolio-team-list">
                  {player.teamData.map(t => (
                    <div key={t.team} className={`portfolio-team-row ${t.status === 'eliminated' ? 'eliminated' : ''}`} onClick={(e) => { e.stopPropagation(); const game = findGameForTeam(t.team); if (game && onGameClick) onGameClick(game, game.region); }}>
                      <span className={`portfolio-team-status ${t.status}`}>{t.status === 'alive' ? '\u25CF' : '\u2620'}</span>
                      <span className="portfolio-team-seed">{t.seed || '?'}</span>
                      <span className="portfolio-team-name">{t.team}</span>
                      <span className="portfolio-team-pts">{t.points > 0 ? `+${t.points.toFixed(1)}` : '0'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="portfolio-sections">
        <div className="portfolio-section">
          <div className="section-title">Hot Teams</div>
          {hotTeams.map((item, idx) => (<div key={idx} className="hot-team-row" onClick={() => { if (item.game && onGameClick) onGameClick(item.game, item.game.region); }}><span className="hot-rank">{idx + 1}</span><span className="hot-name">{item.team}</span><span className="hot-owner" style={{ background: getCustomColor(item.owner, customizations) }}></span><span className="hot-points">+{item.points.toFixed(1)} pts</span></div>))}
          {hotTeams.length === 0 && <div className="empty-state">No completed games yet</div>}
        </div>
        <div className="portfolio-section">
          <div className="section-title">Recent Eliminations</div>
          {standings.flatMap(s => s.eliminatedTeams.map(t => ({ ...t, owner: s }))).slice(0, 4).map((item, idx) => (<div key={idx} className="elim-row" onClick={() => { const game = findGameForTeam(item.team); if (game && onGameClick) onGameClick(game, game.region); }}><span className="elim-icon">{'\u2620'}</span><span className="elim-name">{item.team}</span><span className="elim-owner" style={{ background: getCustomColor(item.owner, customizations) }}></span><span className="elim-round">{item.round === 0 ? 'Play-In' : `R${item.round}`}</span></div>))}
          {totalEliminated === 0 && <div className="empty-state">No eliminations yet</div>}
        </div>
      </div>
      <div className="portfolio-summary">
        <div className="summary-stat"><div className="summary-value">{totalEliminated}</div><div className="summary-label">Eliminated</div></div>
        <div className="summary-stat"><div className="summary-value">{totalAlive}</div><div className="summary-label">Remaining</div></div>
      </div>
    </div>
  );
}

export default Portfolio;
