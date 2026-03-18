import React, { useState, useEffect, useCallback } from 'react';
import { owners, regions as staticRegions, playInGames, getOwner, getTeamColor, getStreaming, scoringSystem, badges } from './data/bracketData';
import { useLiveScores, mergeWithLiveData, fetchGameDetails, fetchTeamRoster } from './data/useESPN';

function LiveIndicator({ lastUpdate, isLoading, error }) {
  const formatTime = (date) => date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--:--';
  return (
    <div className="live-indicator">
      <div className={`indicator-dot ${error ? 'error' : isLoading ? 'loading' : 'active'}`}></div>
      <span>{error ? 'Unable to load scores' : isLoading ? 'Updating...' : `Live scores · Updated ${formatTime(lastUpdate)}`}</span>
    </div>
  );
}

function PlayInGames({ liveGames, playInWinners }) {
  const renderPlayInGame = (pi) => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    const winner = playInWinners[pi.id];
    const isLive = liveData?.status === 'live' || liveData?.status === 'halftime';
    const isFinal = liveData?.status === 'final' || winner;
    const owner1 = getOwner(pi.t1);
    const owner2 = getOwner(pi.t2);
    const color1 = getTeamColor(pi.t1);
    const color2 = getTeamColor(pi.t2);
    const score1 = liveData?.team1 === pi.t1 ? liveData.score1 : liveData?.score2;
    const score2 = liveData?.team1 === pi.t2 ? liveData.score1 : liveData?.score2;
    const team1Won = isFinal && (winner === pi.t1 || score1 > score2);
    const team2Won = isFinal && (winner === pi.t2 || score2 > score1);

    return (
      <div key={pi.id} className={`game-card ${isLive ? 'live' : ''}`}>
        <div className="game-header">
          <div className="game-status">
            {isLive ? (<><span className="live-badge">{liveData?.status === 'halftime' ? 'Half' : 'Live'}</span><span className="game-time live">{liveData?.status === 'halftime' ? 'Halftime' : `${liveData?.period === 1 ? '1H' : '2H'} ${liveData?.clock}`}</span></>) : isFinal ? (<span className="game-time" style={{ color: 'var(--green)' }}>Final</span>) : (<span className="game-time upcoming">{pi.tip}</span>)}
          </div>
          <span className="game-network">{pi.network}</span>
        </div>
        <div className="game-teams">
          <div className="team-row">
            <div className="team-seed">•</div>
            <div className="team-color" style={{ background: color1 }}></div>
            <div className="team-info">
              <div className={`team-name ${team2Won ? 'loser' : ''}`}>{pi.t1}</div>
              <div className="team-meta">{owner1 && <span className="owner-badge"><span className="owner-dot" style={{ background: owner1.color }}></span>{owner1.name}</span>}</div>
            </div>
            {(isLive || isFinal) && <span className={`team-score ${team2Won ? 'loser' : ''}`}>{score1 || 0}</span>}
          </div>
          <div className="team-row">
            <div className="team-seed">•</div>
            <div className="team-color" style={{ background: color2 }}></div>
            <div className="team-info">
              <div className={`team-name ${team1Won ? 'loser' : ''}`}>{pi.t2}</div>
              <div className="team-meta">{owner2 && <span className="owner-badge"><span className="owner-dot" style={{ background: owner2.color }}></span>{owner2.name}</span>}</div>
            </div>
            {(isLive || isFinal) && <span className={`team-score ${team1Won ? 'loser' : ''}`}>{score2 || 0}</span>}
          </div>
        </div>
        {isFinal && winner && <div className="playin-winner">✓ {winner} advances to Round 1</div>}
      </div>
    );
  };

  const hasActivePlayIns = playInGames.some(pi => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    return liveData?.status === 'live' || liveData?.status === 'halftime' || !playInWinners[pi.id];
  });

  if (!hasActivePlayIns && Object.keys(playInWinners).length === playInGames.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-label">First Four (Play-In Games)</div>
      {playInGames.map(renderPlayInGame)}
    </div>
  );
}

function GameCard({ game, onClick }) {
  const isLive = game.status === 'live' || game.status === 'halftime';
  const isFinal = game.status === 'final';
  const owner1 = getOwner(game.t1);
  const owner2 = getOwner(game.t2);
  const color1 = getTeamColor(game.t1);
  const color2 = getTeamColor(game.t2);
  const team1Winning = (isLive || isFinal) && game.sc1 > game.sc2;
  const team2Winning = (isLive || isFinal) && game.sc2 > game.sc1;
  const isTBD = game.t1 === 'TBD' || game.t2 === 'TBD';

  return (
    <div className={`game-card ${isLive ? 'live' : ''} ${isTBD ? 'tbd-game' : ''}`} onClick={isTBD ? undefined : onClick}>
      <div className="game-header">
        <div className="game-status">
          {isLive ? (<><span className="live-badge">{game.status === 'halftime' ? 'Half' : 'Live'}</span><span className="game-time live">{game.status === 'halftime' ? 'Halftime' : `${game.half === 1 ? '1H' : '2H'} ${game.time}`}</span></>) : isFinal ? (<span className="game-time" style={{ color: 'var(--green)' }}>Final</span>) : (<span className="game-time upcoming">{game.tip}</span>)}
        </div>
        <span className="game-network">{game.network}</span>
      </div>
      <div className="game-teams">
        <div className="team-row">
          <div className="team-seed">{game.s1}</div>
          <div className="team-color" style={{ background: color1 }}></div>
          <div className="team-info">
            <div className={`team-name ${team2Winning ? 'loser' : ''}`}>{game.t1}</div>
            <div className="team-meta">{owner1 && <span className="owner-badge"><span className="owner-dot" style={{ background: owner1.color }}></span>{owner1.name}</span>}{game.rec1 && <span className="team-record">{game.rec1}</span>}</div>
          </div>
          {(isLive || isFinal) && <span className={`team-score ${team2Winning ? 'loser' : ''}`}>{game.sc1}</span>}
        </div>
        <div className="team-row">
          <div className="team-seed">{game.s2}</div>
          <div className="team-color" style={{ background: game.t2 === 'TBD' ? '#444' : color2 }}></div>
          <div className="team-info">
            <div className={`team-name ${team1Winning ? 'loser' : ''} ${game.t2 === 'TBD' ? 'tbd' : ''}`}>{game.t2 === 'TBD' ? 'Play-In Winner' : game.t2}</div>
            <div className="team-meta">{game.t2 !== 'TBD' && owner2 && <span className="owner-badge"><span className="owner-dot" style={{ background: owner2.color }}></span>{owner2.name}</span>}{game.rec2 && <span className="team-record">{game.rec2}</span>}</div>
          </div>
          {(isLive || isFinal) && <span className={`team-score ${team1Winning ? 'loser' : ''}`}>{game.sc2}</span>}
        </div>
      </div>
      {!isTBD && (
        <>
          <div className="prob-bar-container"><div className="prob-bar"><div style={{ width: `${game.prob1}%`, background: color1 }}></div><div style={{ width: `${100 - game.prob1}%`, background: color2 }}></div></div></div>
          <div className="game-footer">
            <div className="betting-preview">
              <div className="bet-item"><div className="bet-label">Spread</div><div className="bet-value">{game.spread?.split(' ')[1]}</div></div>
              <div className="bet-item"><div className="bet-label">O/U</div><div className="bet-value">{game.total}</div></div>
              <div className="bet-item"><div className="bet-label">ML</div><div className="bet-value">{game.ml}</div></div>
            </div>
            <span className="view-more">Details →</span>
          </div>
        </>
      )}
    </div>
  );
}

function GameModal({ game, onClose }) {
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

  useEffect(() => {
    if (game.espnId && (isLive || isFinal)) {
      setLoading(true);
      fetchGameDetails(game.espnId).then(data => { setGameDetails(data); setLoading(false); }).catch(() => setLoading(false));
    } else if (isUpcoming) {
      setLoading(true);
      Promise.all([fetchTeamRoster(game.t1), fetchTeamRoster(game.t2)]).then(([team1Data, team2Data]) => {
        setPreGameStats({ [game.t1]: team1Data, [game.t2]: team2Data });
        setLoading(false);
      }).catch(() => setLoading(false));
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
        const teamScore = teamName === game.t1 ? game.sc1 : game.sc2;
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
      { label: 'Field Goal %', key: 'fgPct' },{ label: '3-Point %', key: 'fg3Pct' },{ label: 'Free Throw %', key: 'ftPct' },
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
            <span className="pbp-time">{play.clock} {play.period === 1 ? '1H' : '2H'}</span>
            <div className="pbp-content"><div className="pbp-text">{play.text}</div>{play.scoreValue && <div className="pbp-score">{play.awayScore} - {play.homeScore}</div>}</div>
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
          <span className="modal-title">{game.region} Region</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="m-header">
            <div className="m-badge">{isUpcoming ? 'Season Stats' : isLive ? 'Live' : 'Final'}</div>
            <div className="m-teams">
              <div className="m-team">
                <div className="m-logo" style={{ background: color1 }}>{game.s1}</div>
                <div className="m-seed">#{game.s1} Seed</div>
                <div className="m-name">{game.t1}</div>
                <div className="m-owner"><div className="owner-dot" style={{ background: owner1?.color }}></div>{owner1?.name || 'Unowned'}</div>
                {(isLive || isFinal) && <div className={`m-score ${game.sc1 < game.sc2 ? 'losing' : ''}`}>{game.sc1}</div>}
              </div>
              <div className="m-vs">VS</div>
              <div className="m-team">
                <div className="m-logo" style={{ background: color2 }}>{game.s2}</div>
                <div className="m-seed">#{game.s2} Seed</div>
                <div className="m-name">{game.t2}</div>
                <div className="m-owner"><div className="owner-dot" style={{ background: owner2?.color }}></div>{owner2?.name || 'Unowned'}</div>
                {(isLive || isFinal) && <div className={`m-score ${game.sc2 < game.sc1 ? 'losing' : ''}`}>{game.sc2}</div>}
              </div>
            </div>
          </div>
          {isLive && <div className="status-bar live"><span className="live-badge">LIVE</span><span>{game.half === 1 ? '1st Half' : '2nd Half'} · {game.time}</span></div>}
          <div className="stats-tabs">
            <button className={`stats-tab ${activeTab === 'boxscore' ? 'active' : ''}`} onClick={() => setActiveTab('boxscore')}>{isUpcoming ? 'Season Stats' : 'Box Score'}</button>
            <button className={`stats-tab ${activeTab === 'teamstats' ? 'active' : ''}`} onClick={() => setActiveTab('teamstats')}>Team Stats</button>
            <button className={`stats-tab ${activeTab === 'playbyplay' ? 'active' : ''}`} onClick={() => setActiveTab('playbyplay')}>Play-by-Play</button>
          </div>
          {activeTab === 'boxscore' && renderBoxScore()}
          {activeTab === 'teamstats' && renderTeamStats()}
          {activeTab === 'playbyplay' && renderPlayByPlay()}
          <div className="bet-box">
            <div className="bet-head">Game Lines</div>
            <div className="bet-grid">
              <div className="m-bet-item"><div className="m-bet-label">Spread</div><div className="m-bet-val">{game.spread}</div></div>
              <div className="m-bet-item"><div className="m-bet-label">Over/Under</div><div className="m-bet-val">{game.total}</div></div>
              <div className="m-bet-item"><div className="m-bet-label">Moneyline</div><div className="m-bet-val">{game.ml}</div></div>
            </div>
          </div>
          {streaming && (
            <div className="watch-box">
              <div className="sec-title">Where to Watch</div>
              <div className="watch-links">
                <a href={streaming.primary} className="watch-link pri" target="_blank" rel="noopener noreferrer"><span className="watch-link-name">{game.network}</span><span className="watch-link-type">Live TV</span></a>
                <a href={streaming.espn} className="watch-link" target="_blank" rel="noopener noreferrer"><span className="watch-link-name">ESPN</span><span className="watch-link-type">Streaming</span></a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegionsView({ onGameClick, liveGames, playInWinners }) {
  const [activeRegion, setActiveRegion] = useState('east');
  const regionNames = Object.keys(staticRegions);
  const hasLiveInRegion = (regionName) => staticRegions[regionName]?.games?.some(game => {
    const merged = mergeWithLiveData(game, liveGames, playInWinners);
    return merged.status === 'live' || merged.status === 'halftime';
  });

  return (
    <div>
      <PlayInGames liveGames={liveGames} playInWinners={playInWinners} />
      <div className="region-tabs">
        {regionNames.map(name => (
          <button key={name} className={`region-tab ${activeRegion === name ? 'active' : ''}`} onClick={() => setActiveRegion(name)}>
            {staticRegions[name]?.name || name}{hasLiveInRegion(name) && <span className="live-dot"></span>}
          </button>
        ))}
      </div>
      {staticRegions[activeRegion]?.games?.map((staticGame, idx) => {
        const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
        return <GameCard key={idx} game={game} onClick={() => onGameClick(game, activeRegion)} />;
      })}
    </div>
  );
}

function BracketView({ onGameClick, liveGames, playInWinners }) {
  const rounds = [
    { name: 'Round of 64', short: 'R64', round: 1 },
    { name: 'Round of 32', short: 'R32', round: 2 },
    { name: 'Sweet 16', short: 'S16', round: 3 },
    { name: 'Elite 8', short: 'E8', round: 4 },
    { name: 'Final Four', short: 'F4', round: 5 },
    { name: 'Championship', short: 'Champ', round: 6 }
  ];

  const allGames = [];
  Object.entries(staticRegions).forEach(([regionName, region]) => {
    region.games.forEach(staticGame => {
      const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
      allGames.push({ ...game, region: regionName });
    });
  });

  const gamesByRound = rounds.map(r => ({ ...r, games: allGames.filter(g => g.round === r.round) }));

  return (
    <div className="bracket-mobile">
      <div className="bracket-scroll">
        <div className="bracket-track">
          {gamesByRound.map(round => (
            <div key={round.round} className="round-col">
              <div className="round-header"><div className="round-name">{round.short}</div></div>
              <div className="round-games">
                {round.games.map((game, idx) => {
                  const isLive = game.status === 'live' || game.status === 'halftime';
                  const isFinal = game.status === 'final';
                  const isTBD = game.t1 === 'TBD' || game.t2 === 'TBD';
                  const color1 = getTeamColor(game.t1);
                  const color2 = getTeamColor(game.t2);
                  const owner1 = getOwner(game.t1);
                  const owner2 = getOwner(game.t2);
                  return (
                    <div key={idx} className={`bracket-game ${isLive ? 'live' : ''} ${isTBD ? 'tbd' : ''}`} onClick={() => !isTBD && onGameClick(game, game.region)}>
                      <div className="bracket-team">
                        <span className="b-seed">{game.s1}</span>
                        <div className="b-color" style={{ background: color1 }}></div>
                        <span className={`b-name ${isFinal && game.sc1 < game.sc2 ? 'loser' : ''}`}>{game.t1}</span>
                        {owner1 && <div className="b-owner" style={{ background: owner1.color }}></div>}
                        {(isLive || isFinal) && <span className={`b-score ${isFinal && game.sc1 < game.sc2 ? 'loser' : ''}`}>{game.sc1}</span>}
                      </div>
                      <div className="bracket-team">
                        <span className="b-seed">{game.s2 || '?'}</span>
                        <div className="b-color" style={{ background: game.t2 === 'TBD' ? '#444' : color2 }}></div>
                        <span className={`b-name ${isFinal && game.sc2 < game.sc1 ? 'loser' : ''} ${game.t2 === 'TBD' ? 'tbd' : ''}`}>{game.t2 === 'TBD' ? 'TBD' : game.t2}</span>
                        {game.t2 !== 'TBD' && owner2 && <div className="b-owner" style={{ background: owner2.color }}></div>}
                        {(isLive || isFinal) && <span className={`b-score ${isFinal && game.sc2 < game.sc1 ? 'loser' : ''}`}>{game.sc2}</span>}
                      </div>
                      {isLive && <div className="game-status-bar live"><span className="mini-live-dot"></span>{game.time}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Calculate owner standings
function calculateStandings(liveGames, playInWinners) {
  return owners.map(owner => {
    let points = 0;
    let teamsAlive = owner.teams.length;
    let teamsEliminated = 0;
    const eliminatedTeams = [];
    
    Object.values(staticRegions).forEach(region => {
      region.games.forEach(staticGame => {
        const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
        if (game.status === 'final') {
          const winner = game.sc1 > game.sc2 ? game.t1 : game.t2;
          const loser = game.sc1 > game.sc2 ? game.t2 : game.t1;
          const loserSeed = game.sc1 > game.sc2 ? game.s2 : game.s1;
          const winnerScore = Math.max(game.sc1, game.sc2);
          const loserScore = Math.min(game.sc1, game.sc2);
          
          if (owner.teams.includes(winner)) {
            const winnerSeed = game.sc1 > game.sc2 ? game.s1 : game.s2;
            const roundPoints = scoringSystem.rounds[game.round || 1] || 1;
            const multiplier = scoringSystem.getSeedMultiplier(winnerSeed);
            points += roundPoints * multiplier;
          }
          if (owner.teams.includes(loser)) {
            teamsAlive--;
            teamsEliminated++;
            eliminatedTeams.push({ team: loser, seed: loserSeed, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: game.round || 1 });
          }
        }
      });
    });
    return { ...owner, points: Math.round(points * 100) / 100, teamsAlive, teamsEliminated, eliminatedTeams, maxPossible: Math.round((teamsAlive * 12) * 10) / 10 };
  }).sort((a, b) => b.points - a.points || b.teamsAlive - a.teamsAlive);
}

// Calculate badges dynamically
function calculateBadges(liveGames, playInWinners) {
  const playerBadges = {};
  owners.forEach(o => { playerBadges[o.id] = { glory: [], shame: [] }; });
  
  const completedGames = [];
  Object.values(staticRegions).forEach(region => {
    region.games.forEach(staticGame => {
      const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
      if (game.status === 'final') completedGames.push(game);
    });
  });
  
  if (completedGames.length === 0) return playerBadges;
  
  const ownerStats = {};
  owners.forEach(o => { ownerStats[o.id] = { wins: 0, losses: 0, blowoutWins: 0, blowoutLosses: 0, closeWins: 0, upsets: 0, clownPicks: 0 }; });
  
  completedGames.forEach(game => {
    const winner = game.sc1 > game.sc2 ? game.t1 : game.t2;
    const loser = game.sc1 > game.sc2 ? game.t2 : game.t1;
    const winnerSeed = game.sc1 > game.sc2 ? game.s1 : game.s2;
    const loserSeed = game.sc1 > game.sc2 ? game.s2 : game.s1;
    const margin = Math.abs(game.sc1 - game.sc2);
    const winnerOwner = getOwner(winner);
    const loserOwner = getOwner(loser);
    
    if (winnerOwner) {
      ownerStats[winnerOwner.id].wins++;
      if (margin >= 20) ownerStats[winnerOwner.id].blowoutWins++;
      if (margin <= 3) ownerStats[winnerOwner.id].closeWins++;
      if (winnerSeed >= 12 && loserSeed <= 5) ownerStats[winnerOwner.id].upsets++;
    }
    if (loserOwner) {
      ownerStats[loserOwner.id].losses++;
      if (margin >= 25) ownerStats[loserOwner.id].blowoutLosses++;
      if (loserSeed <= 4 && winnerSeed >= 13) ownerStats[loserOwner.id].clownPicks++;
    }
  });
  
  owners.forEach(owner => {
    const stats = ownerStats[owner.id];
    if (stats.wins >= 3) playerBadges[owner.id].glory.push('hot_start');
    if (stats.upsets > 0) playerBadges[owner.id].glory.push('giant_slayer');
    if (stats.blowoutWins > 0) playerBadges[owner.id].glory.push('sharp_shooter');
    if (stats.closeWins > 0) playerBadges[owner.id].glory.push('buzzer_beater');
    if (stats.losses >= 3) playerBadges[owner.id].shame.push('dumpster_fire');
    if (stats.clownPicks > 0) playerBadges[owner.id].shame.push('clown_pick');
    if (stats.blowoutLosses > 0) playerBadges[owner.id].shame.push('blowout_victim');
  });
  
  if (completedGames.length > 0) {
    const firstLoss = completedGames[0];
    const loser = firstLoss.sc1 > firstLoss.sc2 ? firstLoss.t2 : firstLoss.t1;
    const loserOwner = getOwner(loser);
    if (loserOwner && !playerBadges[loserOwner.id].shame.includes('first_blood')) {
      playerBadges[loserOwner.id].shame.push('first_blood');
    }
  }
  
  return playerBadges;
}

function Leaderboard({ liveGames, playInWinners }) {
  const leaderboardData = calculateStandings(liveGames, playInWinners);
  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">Standings</h2>
      {leaderboardData.map((player, index) => (
        <div key={player.id} className={`leaderboard-card ${index === 0 ? 'leader' : ''}`}>
          <div className="lb-rank">{index + 1}</div>
          <div className="lb-avatar" style={{ background: player.color }}>{player.initials}</div>
          <div className="lb-info"><div className="lb-name">{player.name}</div><div className="lb-teams">{player.teamsAlive} teams alive</div></div>
          <div className="lb-stats"><div className="lb-points">{player.points}</div><div className="lb-max">Max: {player.maxPossible}</div></div>
        </div>
      ))}
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

function Achievements({ liveGames, playInWinners }) {
  const playerBadges = calculateBadges(liveGames, playInWinners);
  const mostShame = owners.reduce((max, o) => (playerBadges[o.id]?.shame?.length || 0) > (playerBadges[max.id]?.shame?.length || 0) ? o : max, owners[0]);
  const allBadges = { glory: [...badges.glory, { id: 'bucket_getter', name: 'Bucket Getter', icon: '🪣', desc: 'Own the tournament\'s leading scorer' }], shame: badges.shame };

  return (
    <div className="achievements">
      <div className="page-title"><h2>Achievements</h2><p>Glory and shame as the tournament unfolds</p></div>
      {owners.map(owner => {
        const pb = playerBadges[owner.id] || { glory: [], shame: [] };
        return (
          <div key={owner.id} className="player-card">
            <div className="player-header">
              <div className="player-avatar" style={{ background: owner.color }}>{owner.initials}</div>
              <div className="player-info"><div className="player-name">{owner.name}</div><div className="player-stats">{owner.teams.length} teams</div></div>
              <div className="badge-counts"><div className="badge-count positive">🏅 {pb.glory.length}</div><div className="badge-count negative">💩 {pb.shame.length}</div></div>
            </div>
            <div className="badges-section">
              <div className="badges-category"><div className="category-label glory">Glory <span className="category-line"></span></div><div className="badges-grid">{allBadges.glory.slice(0, 5).map(badge => { const earned = pb.glory.includes(badge.id); return (<div key={badge.id} className={`badge ${earned ? 'earned-positive' : ''}`}><div className={`badge-icon ${earned ? 'earned-positive' : 'locked'}`}>{badge.icon}</div><div className="badge-name">{badge.name}</div></div>); })}</div></div>
              <div className="badges-category"><div className="category-label shame">Shame <span className="category-line"></span></div><div className="badges-grid">{allBadges.shame.slice(0, 4).map(badge => { const earned = pb.shame.includes(badge.id); return (<div key={badge.id} className={`badge ${earned ? 'earned-negative' : ''}`}><div className={`badge-icon ${earned ? 'earned-negative' : 'locked'}`}>{badge.icon}</div><div className="badge-name">{badge.name}</div></div>); })}</div></div>
              {owner.id === mostShame.id && pb.shame.length > 0 && (<div className="shame-callout"><div className="shame-callout-icon">🚨</div><div className="shame-callout-text"><div className="shame-callout-title">Wall of Shame Leader</div><div className="shame-callout-desc">{owner.name} has the most shame badges</div></div></div>)}
            </div>
          </div>
        );
      })}
      <div className="badge-legend">
        <div className="legend-title">All Badges</div>
        <div className="legend-section-title glory">Glory Badges</div>
        {allBadges.glory.map(badge => (<div key={badge.id} className="legend-item"><div className="legend-icon">{badge.icon}</div><div className="legend-info"><div className="legend-name">{badge.name}</div><div className="legend-desc">{badge.desc}</div></div></div>))}
        <div className="legend-section-title shame">Shame Badges</div>
        {allBadges.shame.map(badge => (<div key={badge.id} className="legend-item"><div className="legend-icon">{badge.icon}</div><div className="legend-info"><div className="legend-name shame">{badge.name}</div><div className="legend-desc">{badge.desc}</div></div></div>))}
      </div>
    </div>
  );
}

// Portfolio Component
function Portfolio({ liveGames, playInWinners }) {
  const [history, setHistory] = useState([]);
  const standings = calculateStandings(liveGames, playInWinners);
  
  useEffect(() => {
    const saved = localStorage.getItem('portfolioHistory');
    if (saved) { try { setHistory(JSON.parse(saved)); } catch (e) { console.error('Error loading portfolio history:', e); } }
  }, []);
  
  useEffect(() => {
    const totalGames = Object.values(staticRegions).reduce((sum, r) => sum + r.games.filter(g => mergeWithLiveData(g, liveGames, playInWinners).status === 'final').length, 0);
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
  
  const getHotTeams = () => {
    const recentWins = [];
    Object.values(staticRegions).forEach(region => {
      region.games.forEach(staticGame => {
        const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
        if (game.status === 'final') {
          const winner = game.sc1 > game.sc2 ? game.t1 : game.t2;
          const winnerSeed = game.sc1 > game.sc2 ? game.s1 : game.s2;
          const owner = getOwner(winner);
          if (owner) {
            const roundPoints = scoringSystem.rounds[game.round || 1] || 1;
            const multiplier = scoringSystem.getSeedMultiplier(winnerSeed);
            recentWins.push({ team: winner, owner, points: roundPoints * multiplier, round: game.round });
          }
        }
      });
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
          const healthPct = (player.teamsAlive / player.teams.length) * 100;
          return (
            <div key={player.id} className={`portfolio-card ${idx === 0 ? 'leader' : ''}`}>
              <div className="portfolio-header">
                <span className="portfolio-name" style={{ color: player.color }}>{player.name.toUpperCase()}</span>
                {change !== null && <span className={`portfolio-change ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span>}
              </div>
              <div className="portfolio-points">{player.points}</div>
              <div className="portfolio-meta">{player.teamsAlive} alive · {player.teamsEliminated} eliminated</div>
              <div className="portfolio-bar"><div className="portfolio-bar-fill" style={{ width: `${healthPct}%`, background: player.color }}></div></div>
            </div>
          );
        })}
      </div>
      <div className="portfolio-sections">
        <div className="portfolio-section">
          <div className="section-title">Hot Teams</div>
          {hotTeams.map((item, idx) => (<div key={idx} className="hot-team-row"><span className="hot-rank">{idx + 1}</span><span className="hot-name">{item.team}</span><span className="hot-owner" style={{ background: item.owner.color }}></span><span className="hot-points">+{item.points.toFixed(1)} pts</span></div>))}
          {hotTeams.length === 0 && <div className="empty-state">No completed games yet</div>}
        </div>
        <div className="portfolio-section">
          <div className="section-title">Recent Eliminations</div>
          {standings.flatMap(s => s.eliminatedTeams.map(t => ({ ...t, owner: s }))).slice(0, 4).map((item, idx) => (<div key={idx} className="elim-row"><span className="elim-icon">☠</span><span className="elim-name">{item.team}</span><span className="elim-owner" style={{ background: item.owner.color }}></span><span className="elim-round">R{item.round}</span></div>))}
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

// Graveyard Component
function Graveyard({ liveGames, playInWinners }) {
  const [filter, setFilter] = useState('all');
  const standings = calculateStandings(liveGames, playInWinners);
  const epitaphs = ["Gone too soon.", "Rest in pieces.", "They fought valiantly... not really.", "Another one bites the dust.", "F in the chat.", "Press F to pay respects.", "Should've picked someone else.", "Bracket busted.", "So much potential, so little results.", "They tried their best. It wasn't enough."];
  const getRandomEpitaph = (seed) => epitaphs[seed % epitaphs.length];
  
  const allEliminated = standings.flatMap(s => s.eliminatedTeams.map(t => ({ ...t, owner: s, epitaph: getRandomEpitaph(t.team.length + t.seed) })));
  const filtered = filter === 'all' ? allEliminated : allEliminated.filter(t => t.owner.id === filter);
  const ownerCounts = {};
  owners.forEach(o => { ownerCounts[o.id] = allEliminated.filter(t => t.owner.id === o.id).length; });
  const mostCasualties = owners.reduce((max, o) => ownerCounts[o.id] > ownerCounts[max.id] ? o : max, owners[0]);

  return (
    <div className="graveyard-view">
      <div className="page-title"><h2>Graveyard</h2><p>{allEliminated.length} teams eliminated · {68 - allEliminated.length} remaining</p></div>
      <div className="filter-pills">
        <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        {owners.map(o => (<button key={o.id} className={`filter-pill ${filter === o.id ? 'active' : ''}`} style={{ '--accent': o.color }} onClick={() => setFilter(o.id)}>{o.name} ({ownerCounts[o.id]})</button>))}
      </div>
      <div className="tombstone-grid">
        {filtered.map((item, idx) => (
          <div key={idx} className="tombstone">
            <div className="tombstone-owner" style={{ background: item.owner.color }}></div>
            <div className="tombstone-seed">#{item.seed} Seed</div>
            <div className="tombstone-team">{item.team}</div>
            <div className="tombstone-epitaph">"{item.epitaph}"</div>
            <div className="tombstone-killer">Lost to {item.killedBy} <span className="tombstone-score">{item.score}</span></div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-graveyard"><div className="empty-icon">🌱</div><div className="empty-text">No casualties yet. The tournament is young.</div></div>}
      </div>
      {allEliminated.length > 0 && (
        <div className="graveyard-stats">
          <div className="grave-stat"><div className="grave-stat-value">{allEliminated.length}</div><div className="grave-stat-label">Total eliminated</div></div>
          <div className="grave-stat worst"><div className="grave-stat-value">{mostCasualties.name}</div><div className="grave-stat-label">Most casualties ({ownerCounts[mostCasualties.id]})</div></div>
        </div>
      )}
    </div>
  );
}

// Projection Tool Component
function ProjectionTool({ liveGames, playInWinners }) {
  const [overrides, setOverrides] = useState({});
  
  const completedGames = [];
  Object.values(staticRegions).forEach(region => {
    region.games.forEach(staticGame => {
      const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
      if (game.status === 'final') completedGames.push({ ...game, region: region.name });
    });
  });
  
  const calculateWithOverrides = useCallback(() => {
    return owners.map(owner => {
      let points = 0;
      let teamsAlive = owner.teams.length;
      Object.values(staticRegions).forEach(region => {
        region.games.forEach(staticGame => {
          const game = mergeWithLiveData(staticGame, liveGames, playInWinners);
          if (game.status === 'final') {
            const gameKey = `${game.t1}_${game.t2}`;
            const actualWinner = game.sc1 > game.sc2 ? game.t1 : game.t2;
            const overrideWinner = overrides[gameKey];
            const winner = overrideWinner || actualWinner;
            const loser = winner === game.t1 ? game.t2 : game.t1;
            if (owner.teams.includes(winner)) {
              const winnerSeed = winner === game.t1 ? game.s1 : game.s2;
              points += (scoringSystem.rounds[game.round || 1] || 1) * scoringSystem.getSeedMultiplier(winnerSeed);
            }
            if (owner.teams.includes(loser)) teamsAlive--;
          }
        });
      });
      return { ...owner, points: Math.round(points * 100) / 100, teamsAlive };
    }).sort((a, b) => b.points - a.points || b.teamsAlive - a.teamsAlive);
  }, [liveGames, playInWinners, overrides]);
  
  const actualStandings = calculateStandings(liveGames, playInWinners);
  const projectedStandings = calculateWithOverrides();
  
  const toggleOverride = (game, winner) => {
    const gameKey = `${game.t1}_${game.t2}`;
    const actualWinner = game.sc1 > game.sc2 ? game.t1 : game.t2;
    setOverrides(prev => {
      const newOverrides = { ...prev };
      if (winner === actualWinner) delete newOverrides[gameKey];
      else newOverrides[gameKey] = winner;
      return newOverrides;
    });
  };
  
  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="projection-view">
      <div className="page-title"><h2>Projection Tool</h2><p>Toggle game outcomes to see how standings would change</p></div>
      {overrideCount > 0 && <button className="reset-btn" onClick={() => setOverrides({})}>Reset to actual ({overrideCount} changes)</button>}
      <div className="projection-layout">
        <div className="projection-games">
          <div className="section-title">Completed Games</div>
          {completedGames.slice(0, 8).map((game, idx) => {
            const gameKey = `${game.t1}_${game.t2}`;
            const actualWinner = game.sc1 > game.sc2 ? game.t1 : game.t2;
            const currentWinner = overrides[gameKey] || actualWinner;
            const owner1 = getOwner(game.t1);
            const owner2 = getOwner(game.t2);
            return (
              <div key={idx} className="projection-game">
                <div className="projection-matchup">
                  <span className="proj-team" style={{ background: `${owner1?.color}22`, color: owner1?.color }}>#{game.s1} {game.t1}</span>
                  <span className="proj-vs">vs</span>
                  <span className="proj-team" style={{ background: `${owner2?.color}22`, color: owner2?.color }}>#{game.s2} {game.t2}</span>
                </div>
                <div className="projection-toggle">
                  <button className={`toggle-btn ${currentWinner === game.t1 ? 'active' : ''}`} onClick={() => toggleOverride(game, game.t1)}>{game.t1} {currentWinner === game.t1 && '✓'}</button>
                  <button className={`toggle-btn ${currentWinner === game.t2 ? 'active' : ''}`} onClick={() => toggleOverride(game, game.t2)}>{game.t2} {currentWinner === game.t2 && '✓'}</button>
                </div>
              </div>
            );
          })}
          {completedGames.length === 0 && <div className="empty-state">No completed games yet</div>}
        </div>
        <div className="projection-impact">
          <div className="section-title">Standings Impact</div>
          {projectedStandings.map((player, idx) => {
            const actual = actualStandings.find(a => a.id === player.id);
            const diff = player.points - actual.points;
            return (<div key={player.id} className="impact-row"><span className="impact-rank">{idx + 1}</span><span className="impact-name" style={{ color: player.color }}>{player.name}</span><span className="impact-actual">{actual.points}</span><span className="impact-arrow">→</span><span className={`impact-projected ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>{player.points}</span></div>);
          })}
          {overrideCount > 0 && (
            <div className="insight-box">
              <div className="insight-title">Key Insight</div>
              <div className="insight-text">{(() => {
                const biggestSwing = projectedStandings.reduce((max, p) => {
                  const actual = actualStandings.find(a => a.id === p.id);
                  const diff = Math.abs(p.points - actual.points);
                  return diff > max.diff ? { owner: p, diff, direction: p.points > actual.points ? 'up' : 'down' } : max;
                }, { diff: 0 });
                return biggestSwing.diff > 0 ? `${biggestSwing.owner.name} would be ${biggestSwing.direction === 'up' ? 'up' : 'down'} ${biggestSwing.diff.toFixed(1)} points.` : 'Toggle some games to see the impact!';
              })()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Other Cool Stuff Hub
function OtherCoolStuff({ liveGames, playInWinners, setSubView }) {
  const standings = calculateStandings(liveGames, playInWinners);
  const playerBadges = calculateBadges(liveGames, playInWinners);
  const totalBadges = owners.reduce((sum, o) => sum + (playerBadges[o.id]?.glory?.length || 0) + (playerBadges[o.id]?.shame?.length || 0), 0);
  const totalEliminated = standings.reduce((sum, s) => sum + s.teamsEliminated, 0);

  const menuItems = [
    { id: 'achievements', icon: '🏆', title: 'Achievements', desc: 'Glory badges, shame badges, and bragging rights.', badge: `${totalBadges} earned`, color: '#fbbf24' },
    { id: 'portfolio', icon: '📈', title: 'Portfolio', desc: 'Track your portfolio value over time.', badge: 'Live', badgeType: 'live', color: '#22d3ee' },
    { id: 'projection', icon: '🔮', title: 'Projection Tool', desc: 'Toggle past game outcomes to see impact.', badge: 'New', badgeType: 'new', color: '#a855f7' },
    { id: 'graveyard', icon: '🪦', title: 'Graveyard', desc: 'Cemetery for eliminated teams.', badge: `${totalEliminated} dead`, color: '#ef4444' }
  ];

  return (
    <div className="cool-stuff">
      <div className="page-title"><h2>Other Cool Stuff</h2><p>Extra features and fun stuff</p></div>
      <div className="menu-grid">
        {menuItems.map(item => (
          <div key={item.id} className="menu-card" style={{ '--accent': item.color }} onClick={() => setSubView(item.id)}>
            <span className={`menu-badge ${item.badgeType || ''}`}>{item.badge}</span>
            <div className="menu-icon">{item.icon}</div>
            <div className="menu-title">{item.title}</div>
            <div className="menu-desc">{item.desc}</div>
            <span className="menu-arrow">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ currentUser, setCurrentUser, customizations, setCustomizations }) {
  const colorOptions = ['#22d3ee', '#a78bfa', '#fb923c', '#f472b6', '#4ade80', '#facc15', '#f87171', '#38bdf8'];
  
  const handleColorChange = (color) => {
    const newCustomizations = { ...customizations, [currentUser.id]: { ...customizations[currentUser.id], color } };
    setCustomizations(newCustomizations);
    localStorage.setItem('jerseyBetCustomizations', JSON.stringify(newCustomizations));
  };
  
  const handleInitialsChange = (initials) => {
    const newCustomizations = { ...customizations, [currentUser.id]: { ...customizations[currentUser.id], initials: initials.slice(0, 2).toUpperCase() } };
    setCustomizations(newCustomizations);
    localStorage.setItem('jerseyBetCustomizations', JSON.stringify(newCustomizations));
  };
  
  const userColor = customizations[currentUser.id]?.color || currentUser.color;
  const userInitials = customizations[currentUser.id]?.initials || currentUser.initials;
  
  return (
    <div className="settings-modal">
      <div className="settings-section">
        <h3 className="settings-section-title">Who are you?</h3>
        <div className="user-selector">
          {owners.map(owner => {
            const ownerColor = customizations[owner.id]?.color || owner.color;
            const ownerInitials = customizations[owner.id]?.initials || owner.initials;
            return (
              <button key={owner.id} className={`user-option ${currentUser.id === owner.id ? 'selected' : ''}`} onClick={() => setCurrentUser(owner)}>
                <div className="user-option-avatar" style={{ background: ownerColor }}>{ownerInitials}</div>
                <span className="user-option-name">{owner.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Customize Your Profile</h3>
        <div className="customize-row">
          <label className="customize-label">Your Color</label>
          <div className="color-picker">
            {colorOptions.map(color => (
              <button key={color} className={`color-option ${userColor === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => handleColorChange(color)} />
            ))}
          </div>
        </div>
        <div className="customize-row">
          <label className="customize-label">Your Initials</label>
          <input type="text" className="initials-input" value={userInitials} onChange={e => handleInitialsChange(e.target.value)} maxLength={2} placeholder="LK" />
        </div>
        <div className="customize-preview">
          <span className="customize-preview-label">Preview:</span>
          <div className="user-avatar-preview" style={{ background: userColor }}>{userInitials}</div>
        </div>
      </div>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Your Teams ({currentUser.teams.length})</h3>
        <div className="teams-list">{currentUser.teams.map(team => (<span key={team} className="team-tag">{team}</span>))}</div>
      </div>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Scoring</h3>
        <div className="scoring-grid">{Object.entries(scoringSystem.rounds).map(([round, points]) => (<div key={round} className="scoring-item"><div className="scoring-round">{scoringSystem.roundNames[round]}</div><div className="scoring-points">{points}</div></div>))}</div>
        <div className="scoring-multipliers">Seed multipliers: 1-4 (1x) · 5-8 (1.5x) · 9-13 (1.75x) · 14-16 (2x)</div>
      </div>
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState('regions');
  const [currentUser, setCurrentUser] = useState(owners[0]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [coolStuffSubView, setCoolStuffSubView] = useState(null);
  const [customizations, setCustomizations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jerseyBetCustomizations')) || {};
    } catch { return {}; }
  });
  const { liveGames, playInWinners, lastUpdate, isLoading, error } = useLiveScores();
  
  const getUserColor = (user) => customizations[user.id]?.color || user.color;
  const getUserInitials = (user) => customizations[user.id]?.initials || user.initials;
  
  const handleGameClick = (game, region) => setSelectedGame({ ...game, region });
  const hasLiveGames = Object.values(staticRegions).some(region => region?.games?.some(game => { const merged = mergeWithLiveData(game, liveGames, playInWinners); return merged.status === 'live' || merged.status === 'halftime'; }));

  const renderCoolStuffContent = () => {
    if (coolStuffSubView === 'achievements') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Achievements liveGames={liveGames} playInWinners={playInWinners} /></>;
    if (coolStuffSubView === 'portfolio') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Portfolio liveGames={liveGames} playInWinners={playInWinners} /></>;
    if (coolStuffSubView === 'projection') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><ProjectionTool liveGames={liveGames} playInWinners={playInWinners} /></>;
    if (coolStuffSubView === 'graveyard') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Graveyard liveGames={liveGames} playInWinners={playInWinners} /></>;
    return <OtherCoolStuff liveGames={liveGames} playInWinners={playInWinners} setSubView={setCoolStuffSubView} />;
  };

  return (
    <div className="app">
      <header className="header">
        <div><div className="header-sub">March Madness 2026</div><h1>Jersey Bet</h1></div>
        <div className="header-right">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙</button>
          <div className="user-avatar" style={{ background: getUserColor(currentUser) }}>{getUserInitials(currentUser)}</div>
        </div>
      </header>
      <nav className="nav-tabs">
        <button className={`nav-tab ${currentTab === 'regions' ? 'active' : ''}`} onClick={() => { setCurrentTab('regions'); setCoolStuffSubView(null); }}>Regions{hasLiveGames && <span className="live-dot"></span>}</button>
        <button className={`nav-tab ${currentTab === 'bracket' ? 'active' : ''}`} onClick={() => { setCurrentTab('bracket'); setCoolStuffSubView(null); }}>Bracket</button>
        <button className={`nav-tab ${currentTab === 'standings' ? 'active' : ''}`} onClick={() => { setCurrentTab('standings'); setCoolStuffSubView(null); }}>Standings</button>
        <button className={`nav-tab ${currentTab === 'coolstuff' ? 'active' : ''}`} onClick={() => { setCurrentTab('coolstuff'); setCoolStuffSubView(null); }}>More</button>
      </nav>
      <LiveIndicator lastUpdate={lastUpdate} isLoading={isLoading} error={error} />
      <main>
        {currentTab === 'regions' && <RegionsView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} />}
        {currentTab === 'bracket' && <BracketView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} />}
        {currentTab === 'standings' && <Leaderboard liveGames={liveGames} playInWinners={playInWinners} />}
        {currentTab === 'coolstuff' && renderCoolStuffContent()}
      </main>
      <div className="legend">{owners.map(owner => (<div key={owner.id} className="legend-item"><div className="legend-dot" style={{ background: owner.color }}></div>{owner.name}</div>))}</div>
      {selectedGame && <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
      {showSettings && <div className="modal-bg" onClick={() => setShowSettings(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-handle"></div><div className="modal-head"><span className="modal-title">Settings</span><button className="modal-close" onClick={() => setShowSettings(false)}>×</button></div><div className="modal-body"><Settings currentUser={currentUser} setCurrentUser={setCurrentUser} customizations={customizations} setCustomizations={setCustomizations} /></div></div></div>}
    </div>
  );
}

export default App;
