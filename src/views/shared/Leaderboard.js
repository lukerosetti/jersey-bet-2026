import React, { useState } from 'react';
import { getTeamLogo, scoringSystem } from '../../data/bracketData';
import { getCustomColor, getCustomInitials } from '../../logic/helpers';
import { buildEnhancedStandings } from '../../logic/scoring';

function Leaderboard({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const { standings, quickStats } = buildEnhancedStandings(liveGames, playInWinners, resolvedMap);
  const rankEmoji = ['', '\uD83C\uDFC6', '\uD83E\uDD48', '\uD83E\uDD49'];

  return (
    <div className="standings-page">
      <div className="page-title"><h2>Standings</h2><p>{quickStats.totalGames} games completed</p></div>

      {/* Player Cards */}
      {standings.map((player, index) => {
        const isExpanded = expandedPlayer === player.id;
        const progressPct = player.maxPossible > 0 ? Math.min((player.points / player.maxPossible) * 100, 100) : 0;
        const alivePct = player.teams.length > 0 ? (player.teamsAlive / player.teams.length) * 100 : 0;
        return (
          <div key={player.id} className={`standings-card ${index === 0 ? 'leader' : ''} ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}>
            <div className="standings-main-row">
              <div className={`rank-badge ${index < 3 ? ['gold','silver','bronze'][index] : ''}`}>{index < 3 ? rankEmoji[index + 1] : index + 1}</div>
              <div className="lb-avatar" style={{ background: getCustomColor(player, customizations) }}>{getCustomInitials(player, customizations)}</div>
              <div className="standings-info">
                <div className="lb-name">{player.name}</div>
                <div className="standings-record">{player.wins}W - {player.losses}L{player.upsetCount > 0 ? ` · ${player.upsetCount} upsets` : ''}</div>
              </div>
              <div className="standings-points-col">
                <div className="lb-points">{player.points}</div>
                <div className="points-progress"><div className="points-progress-fill" style={{ width: `${progressPct}%`, background: getCustomColor(player, customizations) }}></div></div>
              </div>
              <div className="expand-arrow">{isExpanded ? '\u25B2' : '\u25BC'}</div>
            </div>
            <div className="team-health-bar">
              <div className="health-alive" style={{ width: `${alivePct}%` }}></div>
              <div className="health-eliminated" style={{ width: `${100 - alivePct}%` }}></div>
            </div>
            <div className="standings-sub-row">
              <div className="standings-alive-label">{player.teamsAlive} alive · {player.teamsEliminated} eliminated</div>
              <div className="recent-dots">
                {player.recentResults.map((r, i) => (
                  <div key={i} className={`recent-dot ${r.won ? 'win' : 'loss'}`} title={`${r.team} ${r.won ? 'W' : 'L'} vs ${r.opponent} (${r.margin}pt)`}></div>
                ))}
                {Array.from({ length: Math.max(0, 5 - player.recentResults.length) }).map((_, i) => (
                  <div key={`p${i}`} className="recent-dot pending"></div>
                ))}
              </div>
            </div>

            {/* Expandable Team Portfolio */}
            <div className={`team-portfolio ${isExpanded ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="portfolio-header-row"><span>Team</span><span>Seed</span><span>Pts</span><span>Status</span></div>
              {player.teamDetails.map((team, ti) => (
                <div key={ti} className={`portfolio-team-row ${team.alive ? '' : 'eliminated'}`}>
                  <div className="portfolio-team-name">
                    {getTeamLogo(team.name) && <img src={getTeamLogo(team.name)} alt="" className="portfolio-team-logo" />}
                    <span>{team.name}</span>
                  </div>
                  <span className="portfolio-team-seed">#{team.seed}</span>
                  <span className="portfolio-team-pts">{team.points}</span>
                  <span className={`portfolio-team-status ${team.alive ? 'alive' : 'elim'}`}>{team.alive ? 'ALIVE' : team.eliminatedRound}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        <div className="quick-stat-chip"><span className="quick-stat-icon">{'\uD83D\uDD25'}</span><div className="quick-stat-value">{quickStats.totalUpsets}</div><div className="quick-stat-label">Upsets</div></div>
        <div className="quick-stat-chip"><span className="quick-stat-icon">{'\uD83D\uDCA5'}</span><div className="quick-stat-value">{quickStats.biggestUpset ? `#${quickStats.biggestUpset.winnerSeed} > #${quickStats.biggestUpset.loserSeed}` : '--'}</div><div className="quick-stat-label">{quickStats.biggestUpset ? quickStats.biggestUpset.winner : 'Biggest Upset'}</div></div>
        <div className="quick-stat-chip"><span className="quick-stat-icon">{'\u26A1'}</span><div className="quick-stat-value">{quickStats.closestGame ? `${quickStats.closestGame.sc1}-${quickStats.closestGame.sc2}` : '--'}</div><div className="quick-stat-label">{quickStats.closestGame ? `${quickStats.closestGame.t1} vs ${quickStats.closestGame.t2}` : 'Closest Game'}</div></div>
      </div>

      {/* Momentum Section */}
      {quickStats.totalGames > 0 && (
        <div className="standings-section">
          <div className="section-title">Momentum</div>
          {standings.map(p => (
            <div key={p.id} className="momentum-row">
              <div className="lb-avatar" style={{ background: getCustomColor(p, customizations), width: 28, height: 28, fontSize: 10 }}>{getCustomInitials(p, customizations)}</div>
              <span className="momentum-name">{p.name}</span>
              <span className={`momentum-arrow ${p.momentum}`}>{p.momentum === 'up' ? '\u25B2 Hot' : p.momentum === 'down' ? '\u25BC Cold' : '\u2014 Even'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scoring Reference */}
      <div className="scoring-box">
        <h3 className="scoring-title">Scoring System</h3>
        <div className="scoring-grid">
          {Object.entries(scoringSystem.rounds).map(([round, points]) => (
            <div key={round} className="scoring-item"><div className="scoring-round">{scoringSystem.roundNames[round]}</div><div className="scoring-points">{points}</div></div>
          ))}
        </div>
        <div className="scoring-multipliers">Seed multipliers: 1-4 (1x) · 5-8 (1.5x) · 9-13 (1.75x) · 14-16 (2x)</div>
      </div>
    </div>
  );
}

export default Leaderboard;
