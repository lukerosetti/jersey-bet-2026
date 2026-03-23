import React, { useState, useEffect } from 'react';
import { getTeamColor, getTeamLogo, getOwner, getStreaming, scoringSystem } from '../../data/bracketData';
import { fetchGameDetails, fetchTeamRoster } from '../../data/useESPN';
import { getCustomColor } from '../../logic/helpers';

function GameModal({ game, onClose, customizations, liveGames }) {
  const [activeTab, setActiveTab] = useState('boxscore');
  const [gameDetails, setGameDetails] = useState(null);
  const [preGameStats, setPreGameStats] = useState({});
  const [loading, setLoading] = useState(false);

  const isLive = game.status === 'live' || game.status === 'halftime';
  const isFinal = game.status === 'final';
  const isUpcoming = !isLive && !isFinal;
  const owner1 = getOwner(game.t1);
  const owner2 = getOwner(game.t2);
  const color1 = getTeamColor(game.t1);
  const color2 = getTeamColor(game.t2);
  const streaming = getStreaming(game.network);

  // Get live scores so header stays current
  const liveKey = game.t1 !== 'TBD' && game.t2 !== 'TBD' ? [game.t1, game.t2].sort().join('_') : null;
  const liveData = liveKey && liveGames ? liveGames[liveKey] : null;
  const currentSc1 = liveData ? (liveData.team1 === game.t1 ? liveData.score1 : liveData.score2) : game.sc1;
  const currentSc2 = liveData ? (liveData.team1 === game.t2 ? liveData.score1 : liveData.score2) : game.sc2;
  const currentStatus = liveData?.status || game.status;
  const currentTime = liveData?.clock || game.time;
  const currentHalf = liveData?.period || game.half;
  const currentIsLive = currentStatus === 'live' || currentStatus === 'halftime';
  const currentIsFinal = currentStatus === 'final';

  useEffect(() => {
    const fetchDetails = () => {
      if (game.espnId && (isLive || isFinal)) {
        if (!gameDetails) setLoading(true);
        fetchGameDetails(game.espnId).then(data => { setGameDetails(data); setLoading(false); }).catch(() => setLoading(false));
      } else if (isUpcoming && game.t1 !== 'TBD' && game.t2 !== 'TBD') {
        setLoading(true);
        Promise.all([fetchTeamRoster(game.t1), fetchTeamRoster(game.t2)]).then(([team1Data, team2Data]) => {
          setPreGameStats({ [game.t1]: team1Data, [game.t2]: team2Data });
          setLoading(false);
        }).catch(() => setLoading(false));
      }
    };
    fetchDetails();
    // Auto-refresh every 15s for live games
    if (isLive && game.espnId) {
      const interval = setInterval(fetchDetails, 15000);
      return () => clearInterval(interval);
    }
  }, [game.espnId, game.t1, game.t2, isLive, isFinal, isUpcoming]);

  const renderPreGameStats = () => {
    if (loading) return <div className="stats-loading">Loading season stats...</div>;
    return (
      <>
        {[game.t1, game.t2].map(teamName => {
          const teamData = preGameStats[teamName];
          const teamColor = getTeamColor(teamName);
          const topScorers = teamData?.topScorers || [];
          if (!topScorers.length) {
            return (
              <div key={teamName} className="stats-section">
                <div className="team-label"><div className="team-color-bar" style={{ background: teamColor }}></div><span className="team-label-name">{teamName}</span><span className="team-label-score">Season Avg</span></div>
                <div className="stats-empty" style={{ padding: '20px', textAlign: 'center' }}>Season stats unavailable</div>
              </div>
            );
          }
          return (
            <div key={teamName} className="stats-section">
              <div className="team-label"><div className="team-color-bar" style={{ background: teamColor }}></div><span className="team-label-name">{teamName}</span><span className="team-label-score">Season Avg</span></div>
              <div className="player-stats-table">
                <div className="stats-header"><span>Player</span><span>PPG</span><span>RPG</span><span>APG</span><span>SPG</span><span>BPG</span></div>
                {topScorers.slice(0, 5).map((player, idx) => (
                  <div key={player.id || idx} className={`player-row ${idx === 0 ? 'leader' : ''}`}>
                    <div className="player-info"><span className="player-number">#{player.jersey}</span><span className="player-name">{player.name}<span className="player-pos">{player.position}</span></span></div>
                    <span>{player.ppg}</span><span>{player.rpg}</span><span>{player.apg}</span><span>{player.spg}</span><span>{player.bpg}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  const renderBoxScore = () => {
    if (loading) return <div className="stats-loading">Loading player stats...</div>;
    if (isUpcoming) return renderPreGameStats();
    if (!gameDetails?.players || Object.keys(gameDetails.players).length === 0) {
      return <div className="stats-empty">Player stats will appear once the game starts</div>;
    }
    return (<>
      {[game.t1, game.t2].map(teamName => {
        const players = gameDetails.players[teamName] || [];
        const teamColor = getTeamColor(teamName);
        const teamScore = teamName === game.t1 ? currentSc1 : currentSc2;
        return (
          <div key={teamName} className="stats-section">
            <div className="team-label"><div className="team-color-bar" style={{ background: teamColor }}></div><span className="team-label-name">{teamName}</span><span className="team-label-score">{teamScore}</span></div>
            <div className="player-stats-table">
              <div className="stats-header"><span>Player</span><span>PTS</span><span>REB</span><span>AST</span><span>STL</span><span>BLK</span></div>
              {players.slice(0, 5).map((player, idx) => (
                <div key={player.id || idx} className={`player-row ${idx === 0 ? 'leader' : ''}`}>
                  <div className="player-info"><span className="player-number">#{player.jersey}</span><span className="player-name">{player.name}<span className="player-pos">{player.position}</span></span></div>
                  <span>{player.stats?.pts || 0}</span><span>{player.stats?.reb || 0}</span><span>{player.stats?.ast || 0}</span><span>{player.stats?.stl || 0}</span><span>{player.stats?.blk || 0}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>);
  };

  const renderTeamStats = () => {
    if (loading) return <div className="stats-loading">Loading team stats...</div>;
    if (isUpcoming) return <div className="stats-empty">Team comparison stats will appear once the game starts</div>;
    if (!gameDetails?.teamStats || Object.keys(gameDetails.teamStats).length === 0) {
      return <div className="stats-empty">Team stats will appear once the game starts</div>;
    }
    const stats1 = gameDetails.teamStats[game.t1] || {};
    const stats2 = gameDetails.teamStats[game.t2] || {};
    const statRows = [
      { label: 'Field Goal %', key: 'fgPct' },{ label: '3-Point %', key: 'fg3Pct' },{ label: '3PT', key: 'fg3Made' },{ label: 'Free Throw %', key: 'ftPct' },
      { label: 'Rebounds', key: 'rebounds' },{ label: 'Assists', key: 'assists' },{ label: 'Turnovers', key: 'turnovers', inverse: true },
      { label: 'Steals', key: 'steals' },{ label: 'Blocks', key: 'blocks' }
    ];
    return (
      <div className="advanced-stats">
        <div className="advanced-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
          <span>{game.t1}</span><span></span><span>{game.t2}</span>
        </div>
        {statRows.map(row => {
          const val1 = stats1[row.key] ?? '-';
          const val2 = stats2[row.key] ?? '-';
          const v1 = parseFloat(val1) || 0;
          const v2 = parseFloat(val2) || 0;
          const winner1 = row.inverse ? v1 < v2 : v1 > v2;
          const winner2 = row.inverse ? v2 < v1 : v2 > v1;
          return (
            <div key={row.key} className="advanced-row">
              <span className={`advanced-value ${winner1 ? 'winner' : 'loser'}`}>{val1}</span>
              <span className="advanced-label">{row.label}</span>
              <span className={`advanced-value ${winner2 ? 'winner' : 'loser'}`}>{val2}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPlayByPlay = () => {
    if (loading) return <div className="stats-loading">Loading play-by-play...</div>;
    if (isUpcoming) return (<div className="stats-empty"><div className="pbp-empty-icon">📺</div><div className="pbp-empty-title">Game hasn't started</div><div className="pbp-empty-desc">Play-by-play will appear once the game tips off</div></div>);
    if (!gameDetails?.plays || gameDetails.plays.length === 0) return (<div className="stats-empty"><div className="pbp-empty-icon">📺</div><div className="pbp-empty-title">No plays yet</div><div className="pbp-empty-desc">Play-by-play will update as the game progresses</div></div>);
    return (
      <div className="play-by-play">
        {gameDetails.plays.slice(0, 20).map((play, idx) => (
          <div key={idx} className="pbp-item">
            <span className="pbp-time">{play.clock} {play.period >= 3 ? 'OT' : play.period === 1 ? '1H' : '2H'}</span>
            <div className="pbp-content"><div className="pbp-text">{play.text}</div>{(play.scoreAway != null || play.scoreHome != null) && <div className="pbp-score">{play.scoreAway} - {play.scoreHome}</div>}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle"></div>
        <div className="modal-head">
          <span className="modal-title">{game.label || (game.region ? game.region.charAt(0).toUpperCase() + game.region.slice(1) + ' Region' : scoringSystem.roundNames[game.round] || 'Game')}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="m-header">
            <div className="m-badge">{(!currentIsLive && !currentIsFinal) ? 'Season Stats' : currentIsLive ? 'Live' : 'Final'}</div>
            <div className="m-teams">
              <div className="m-team">
                <div className="m-logo">{getTeamLogo(game.t1) ? <img src={getTeamLogo(game.t1)} alt={game.t1} className="m-logo-img" /> : game.s1}</div>
                {game.s1 && <div className="m-seed">#{game.s1} Seed</div>}
                <div className="m-name">{game.t1}</div>
                <div className="m-owner"><div className="owner-dot" style={{ background: owner1 ? getCustomColor(owner1, customizations) : '#555' }}></div>{owner1?.name || 'Unowned'}</div>
                {(currentIsLive || currentIsFinal) && <div className={`m-score ${currentSc1 < currentSc2 ? 'losing' : ''}`}>{currentSc1}</div>}
              </div>
              <div className="m-vs">VS</div>
              <div className="m-team">
                <div className="m-logo">{getTeamLogo(game.t2) ? <img src={getTeamLogo(game.t2)} alt={game.t2} className="m-logo-img" /> : game.s2}</div>
                {game.s2 && <div className="m-seed">#{game.s2} Seed</div>}
                <div className="m-name">{game.t2}</div>
                <div className="m-owner"><div className="owner-dot" style={{ background: owner2 ? getCustomColor(owner2, customizations) : '#555' }}></div>{owner2?.name || 'Unowned'}</div>
                {(currentIsLive || currentIsFinal) && <div className={`m-score ${currentSc2 < currentSc1 ? 'losing' : ''}`}>{currentSc2}</div>}
              </div>
            </div>
          </div>
          {game.city && <div className="m-location">{game.venue ? `${game.venue} · ` : ''}{game.city}{game.state ? `, ${game.state}` : ''}</div>}
          {currentIsLive && <div className="status-bar live"><span className="live-badge">LIVE</span><span>{currentHalf >= 3 ? 'Overtime' : currentHalf === 1 ? '1st Half' : '2nd Half'} · {currentTime}</span></div>}
          <div className="stats-tabs">
            <button className={`stats-tab ${activeTab === 'boxscore' ? 'active' : ''}`} onClick={() => setActiveTab('boxscore')}>{isUpcoming ? 'Season Stats' : 'Box Score'}</button>
            <button className={`stats-tab ${activeTab === 'teamstats' ? 'active' : ''}`} onClick={() => setActiveTab('teamstats')}>Team Stats</button>
            <button className={`stats-tab ${activeTab === 'playbyplay' ? 'active' : ''}`} onClick={() => setActiveTab('playbyplay')}>Play-by-Play</button>
            {(currentIsLive || currentIsFinal) && <button className={`stats-tab ${activeTab === 'winprob' ? 'active' : ''}`} onClick={() => setActiveTab('winprob')}>Win Prob</button>}
          </div>
          {activeTab === 'boxscore' && renderBoxScore()}
          {activeTab === 'teamstats' && renderTeamStats()}
          {activeTab === 'playbyplay' && renderPlayByPlay()}
          {activeTab === 'winprob' && (() => {
            if (loading || !gameDetails) return <div className="stats-loading">Loading win probability...</div>;
            const wp = gameDetails.winProbability || [];
            if (wp.length === 0) return <div className="stats-empty">Win probability data not yet available</div>;

            const t1IsHome = gameDetails.homeTeam === game.t1;
            const t1WinProb = wp.map(p => t1IsHome ? p : 1 - p);
            const currentProb = t1WinProb[t1WinProb.length - 1];
            const t1Pct = Math.round(currentProb * 100);
            const t2Pct = 100 - t1Pct;
            const t1C = getTeamColor(game.t1) || '#ef4444';
            const t2C = getTeamColor(game.t2) || '#3b82f6';

            const W = 460, H = 240;
            const PADT = 28, PADB = 24, PADL = 38, PADR = 16;
            const chartW = W - PADL - PADR, chartH = H - PADT - PADB;
            const midY = PADT + 0.5 * chartH;
            const topY = PADT;
            const botY = PADT + chartH;
            const halfX = PADL + chartW * 0.5;

            // Build smooth monotone path using cardinal spline
            const probLen = Math.max(t1WinProb.length - 1, 1);
            const points = t1WinProb.map((p, i) => ({
              x: PADL + (i / probLen) * chartW,
              y: PADT + (1 - p) * chartH
            }));
            let pathD = `M${points[0].x},${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
              const p0 = points[Math.max(0, i - 1)];
              const p1 = points[i];
              const p2 = points[i + 1];
              const p3 = points[Math.min(points.length - 1, i + 2)];
              const cp1x = p1.x + (p2.x - p0.x) / 6;
              const cp1y = p1.y + (p2.y - p0.y) / 6;
              const cp2x = p2.x - (p3.x - p1.x) / 6;
              const cp2y = p2.y - (p3.y - p1.y) / 6;
              pathD += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
            }

            // Fill paths for gradient areas
            const fillT1Path = pathD + ` L${points[points.length - 1].x},${midY} L${points[0].x},${midY} Z`;
            const fillT2Path = pathD + ` L${points[points.length - 1].x},${midY} L${points[0].x},${midY} Z`;

            const endX = points[points.length - 1].x;
            const endY = points[points.length - 1].y;

            return (
              <div style={{ padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t1C }}></div>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text2)' }}>{game.t1}</span>
                    <span style={{ fontWeight: 700, fontSize: '1.3rem', color: t1Pct >= 50 ? '#fff' : 'var(--text2)' }}>{t1Pct}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.3rem', color: t2Pct >= 50 ? '#fff' : 'var(--text2)' }}>{t2Pct}%</span>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text2)' }}>{game.t2}</span>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t2C }}></div>
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: 'linear-gradient(180deg, #162231 0%, #1a2a3c 100%)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <defs>
                    <linearGradient id="wpFillT1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t1C} stopOpacity="0.15" /><stop offset="100%" stopColor={t1C} stopOpacity="0" /></linearGradient>
                    <linearGradient id="wpFillT2" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={t2C} stopOpacity="0.15" /><stop offset="100%" stopColor={t2C} stopOpacity="0" /></linearGradient>
                    <filter id="wpSubtleGlow"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <clipPath id="clipAbove"><rect x={PADL} y={PADT} width={chartW} height={chartH / 2} /></clipPath>
                    <clipPath id="clipBelow"><rect x={PADL} y={midY} width={chartW} height={chartH / 2} /></clipPath>
                  </defs>
                  {/* Grid lines at 0%, 50%, 100% only */}
                  <line x1={PADL} y1={topY} x2={PADL + chartW} y2={topY} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="4,6" />
                  <line x1={PADL} y1={midY} x2={PADL + chartW} y2={midY} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="4,6" />
                  <line x1={PADL} y1={botY} x2={PADL + chartW} y2={botY} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="4,6" />
                  {/* Halftime marker */}
                  <line x1={halfX} y1={PADT} x2={halfX} y2={botY} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="4,4" />
                  <text x={halfX} y={PADT - 8} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="600" textAnchor="middle" letterSpacing="1.5">HALFTIME</text>
                  {/* Gradient fills clipped above/below 50% */}
                  <g clipPath="url(#clipAbove)"><path d={fillT1Path} fill="url(#wpFillT1)" /></g>
                  <g clipPath="url(#clipBelow)"><path d={fillT2Path} fill="url(#wpFillT2)" /></g>
                  {/* Color-changing smooth line */}
                  {(() => {
                    const segs = [];
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[Math.max(0, i - 1)];
                      const p1 = points[i];
                      const p2 = points[i + 1];
                      const p3 = points[Math.min(points.length - 1, i + 2)];
                      const cp1x = p1.x + (p2.x - p0.x) / 6;
                      const cp1y = p1.y + (p2.y - p0.y) / 6;
                      const cp2x = p2.x - (p3.x - p1.x) / 6;
                      const cp2y = p2.y - (p3.y - p1.y) / 6;
                      const avg = (t1WinProb[i] + t1WinProb[i + 1]) / 2;
                      const segColor = avg >= 0.5 ? t1C : t2C;
                      segs.push(<path key={i} d={`M${p1.x},${p1.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`} stroke={segColor} strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#wpSubtleGlow)" />);
                    }
                    return segs;
                  })()}
                  {/* End point - small, clean */}
                  <circle cx={endX} cy={endY} r="3.5" fill={currentProb >= 0.5 ? t1C : t2C} stroke="#0c1520" strokeWidth="1.5" />
                  {/* Axis labels - minimal */}
                  <text x={PADL - 6} y={topY + 4} fill="rgba(255,255,255,0.25)" fontSize="8" fontWeight="500" textAnchor="end">100</text>
                  <text x={PADL - 6} y={midY + 3} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="500" textAnchor="end">50</text>
                  <text x={PADL - 6} y={botY + 3} fill="rgba(255,255,255,0.25)" fontSize="8" fontWeight="500" textAnchor="end">0</text>
                </svg>
                <div style={{ textAlign: 'center', marginTop: 10, color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', letterSpacing: 1.5, fontWeight: 500 }}>ESPN · WIN PROBABILITY</div>
              </div>
            );
          })()}
          {(game.spread || game.overUnder) && (
            <div className="bet-box">
              <div className="bet-head">Game Lines</div>
              <div className="bet-grid">
                {game.spread && <div className="m-bet-item"><div className="m-bet-label">Spread</div><div className="m-bet-val">{game.spread}</div></div>}
                {game.overUnder && <div className="m-bet-item"><div className="m-bet-label">Over/Under</div><div className="m-bet-val">{game.overUnder}</div></div>}
              </div>
            </div>
          )}
          {streaming && game.network && (
            <div className="watch-box">
              <div className="sec-title">Where to Watch</div>
              <div className="watch-links">
                <a href={streaming.primary} className="watch-link pri" target="_blank" rel="noopener noreferrer"><span className="watch-link-name">{streaming.primaryName}</span><span className="watch-link-type">Live TV</span></a>
                <a href={streaming.espn} className="watch-link" target="_blank" rel="noopener noreferrer"><span className="watch-link-name">ESPN</span><span className="watch-link-type">Streaming</span></a>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Airing on {game.network}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameModal;
