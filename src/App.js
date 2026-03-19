import React, { useState, useEffect, useCallback } from 'react';
import { owners, regions as staticRegions, playInGames, finalFourGames, getOwner, getTeamColor, getTeamLogo, getStreaming, scoringSystem, badges } from './data/bracketData';
import { useLiveScores, mergeWithLiveData, resolveAllGames, fetchGameDetails, fetchTeamRoster } from './data/useESPN';

// Build resolved games map for all rounds (call once, pass to mergeWithLiveData as 4th arg)
function buildResolvedGames(liveGames, playInWinners) {
  const allGames = [];
  Object.values(staticRegions).forEach(r => allGames.push(...r.games));
  allGames.push(...finalFourGames);
  return resolveAllGames(allGames, liveGames, playInWinners);
}

const getCustomColor = (owner, customizations) => customizations?.[owner.id]?.color || owner.color;
const getCustomInitials = (owner, customizations) => customizations?.[owner.id]?.initials || owner.initials;

function LiveIndicator({ lastUpdate, isLoading, error }) {
  const formatTime = (date) => date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--:--';
  return (
    <div className="live-indicator">
      <div className={`indicator-dot ${error ? 'error' : isLoading ? 'loading' : 'active'}`}></div>
      <span>{error ? 'Unable to load scores' : isLoading ? 'Updating...' : `Live scores · Updated ${formatTime(lastUpdate)}`}</span>
    </div>
  );
}

function PlayInGames({ liveGames, playInWinners, onGameClick, customizations }) {
  const renderPlayInGame = (pi) => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    const winner = playInWinners[pi.id];
    const isLive = liveData?.status === 'live' || liveData?.status === 'halftime';
    const isFinal = liveData?.status === 'final' || winner;
    const score1 = liveData?.team1 === pi.t1 ? liveData.score1 : liveData?.score2;
    const score2 = liveData?.team1 === pi.t2 ? liveData.score1 : liveData?.score2;

    // Build a game object compatible with GameCard and GameModal
    const gameObj = {
      ...pi,
      round: 0,
      s1: pi.forSeed,
      s2: pi.forSeed,
      status: isLive ? (liveData?.status === 'halftime' ? 'halftime' : 'live') : isFinal ? 'final' : 'upcoming',
      sc1: score1 || 0,
      sc2: score2 || 0,
      time: liveData?.clock,
      half: liveData?.period,
      espnId: liveData?.id,
      label: 'Play-In'
    };

    return (
      <GameCard key={pi.id} game={gameObj} onClick={() => onGameClick && onGameClick(gameObj, 'playin')} customizations={customizations} />
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

function GameCard({ game, onClick, customizations }) {
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
          {getTeamLogo(game.t1) && <img className="team-logo" src={getTeamLogo(game.t1)} alt="" />}
          <div className="team-info">
            <div className={`team-name ${team2Winning ? 'loser' : ''}`}>{game.t1}</div>
            <div className="team-meta">{owner1 && <span className="owner-badge"><span className="owner-dot" style={{ background: getCustomColor(owner1, customizations) }}></span>{owner1.name}</span>}{game.rec1 && <span className="team-record">{game.rec1}</span>}</div>
          </div>
          {(isLive || isFinal) && <span className={`team-score ${team2Winning ? 'loser' : ''}`}>{game.sc1}</span>}
        </div>
        <div className="team-row">
          <div className="team-seed">{game.s2}</div>
          <div className="team-color" style={{ background: game.t2 === 'TBD' ? '#444' : color2 }}></div>
          {game.t2 !== 'TBD' && getTeamLogo(game.t2) && <img className="team-logo" src={getTeamLogo(game.t2)} alt="" />}
          <div className="team-info">
            <div className={`team-name ${team1Winning ? 'loser' : ''} ${game.t2 === 'TBD' ? 'tbd' : ''}`}>{game.t2 === 'TBD' ? 'Play-In Winner' : game.t2}</div>
            <div className="team-meta">{game.t2 !== 'TBD' && owner2 && <span className="owner-badge"><span className="owner-dot" style={{ background: getCustomColor(owner2, customizations) }}></span>{owner2.name}</span>}{game.rec2 && <span className="team-record">{game.rec2}</span>}</div>
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

function GameModal({ game, onClose, customizations }) {
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
          <span className="modal-title">{game.label || (game.region ? game.region.charAt(0).toUpperCase() + game.region.slice(1) + ' Region' : scoringSystem.roundNames[game.round] || 'Game')}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="m-header">
            <div className="m-badge">{isUpcoming ? 'Season Stats' : isLive ? 'Live' : 'Final'}</div>
            <div className="m-teams">
              <div className="m-team">
                <div className="m-logo">{getTeamLogo(game.t1) ? <img src={getTeamLogo(game.t1)} alt={game.t1} className="m-logo-img" /> : game.s1}</div>
                {game.s1 && <div className="m-seed">#{game.s1} Seed</div>}
                <div className="m-name">{game.t1}</div>
                <div className="m-owner"><div className="owner-dot" style={{ background: owner1 ? getCustomColor(owner1, customizations) : '#555' }}></div>{owner1?.name || 'Unowned'}</div>
                {(isLive || isFinal) && <div className={`m-score ${game.sc1 < game.sc2 ? 'losing' : ''}`}>{game.sc1}</div>}
              </div>
              <div className="m-vs">VS</div>
              <div className="m-team">
                <div className="m-logo">{getTeamLogo(game.t2) ? <img src={getTeamLogo(game.t2)} alt={game.t2} className="m-logo-img" /> : game.s2}</div>
                {game.s2 && <div className="m-seed">#{game.s2} Seed</div>}
                <div className="m-name">{game.t2}</div>
                <div className="m-owner"><div className="owner-dot" style={{ background: owner2 ? getCustomColor(owner2, customizations) : '#555' }}></div>{owner2?.name || 'Unowned'}</div>
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
          {(game.spread || game.total || game.ml) && <div className="bet-box">
            <div className="bet-head">Game Lines</div>
            <div className="bet-grid">
              {game.spread && <div className="m-bet-item"><div className="m-bet-label">Spread</div><div className="m-bet-val">{game.spread}</div></div>}
              {game.total && <div className="m-bet-item"><div className="m-bet-label">Over/Under</div><div className="m-bet-val">{game.total}</div></div>}
              {game.ml && <div className="m-bet-item"><div className="m-bet-label">Moneyline</div><div className="m-bet-val">{game.ml}</div></div>}
            </div>
          </div>}
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

function RegionsView({ onGameClick, liveGames, playInWinners, customizations }) {
  const [activeRegion, setActiveRegion] = useState('east');
  const resolved = buildResolvedGames(liveGames, playInWinners);
  const regionNames = [...Object.keys(staticRegions), 'finalfour'];

  const hasLiveInRegion = (regionName) => {
    if (regionName === 'finalfour') return false;
    return staticRegions[regionName]?.games?.some(game => {
      const merged = resolved[game.id] || mergeWithLiveData(game, liveGames, playInWinners, resolved);
      return merged.status === 'live' || merged.status === 'halftime';
    });
  };

  // Determine current round for a region: show the latest round that has resolved (non-TBD) games
  const getCurrentRound = (regionName) => {
    if (regionName === 'finalfour') return 5;
    const games = staticRegions[regionName]?.games || [];
    for (let round = 4; round >= 1; round--) {
      const roundGames = games.filter(g => g.round === round);
      const hasResolvedGame = roundGames.some(g => {
        const merged = resolved[g.id] || mergeWithLiveData(g, liveGames, playInWinners, resolved);
        return merged.t1 !== 'TBD' && merged.t2 !== 'TBD';
      });
      if (hasResolvedGame) return round;
    }
    return 1;
  };

  const currentRound = getCurrentRound(activeRegion);
  const roundLabel = scoringSystem.roundNames[currentRound] || 'R64';

  // Get games for the active region/round
  const getDisplayGames = () => {
    if (activeRegion === 'finalfour') {
      return finalFourGames.map(fg => resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved));
    }
    const games = staticRegions[activeRegion]?.games?.filter(g => g.round === currentRound) || [];
    return games.map(g => resolved[g.id] || mergeWithLiveData(g, liveGames, playInWinners, resolved));
  };

  const displayGames = getDisplayGames();
  const regionLabel = (name) => {
    if (name === 'finalfour') return 'Final Four';
    return staticRegions[name]?.name || name;
  };

  return (
    <div>
      <PlayInGames liveGames={liveGames} playInWinners={playInWinners} onGameClick={onGameClick} customizations={customizations} />
      <div className="region-tabs">
        {regionNames.map(name => (
          <button key={name} className={`region-tab ${activeRegion === name ? 'active' : ''}`} onClick={() => setActiveRegion(name)}>
            {regionLabel(name)}{hasLiveInRegion(name) && <span className="live-dot"></span>}
          </button>
        ))}
      </div>
      {activeRegion !== 'finalfour' && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', margin: '8px 0' }}>{roundLabel}</div>}
      {displayGames.map((game, idx) => (
        <GameCard key={idx} game={game} onClick={() => !(game.t1 === 'TBD' && game.t2 === 'TBD') && onGameClick(game, activeRegion)} customizations={customizations} />
      ))}
    </div>
  );
}

function BracketView({ onGameClick, liveGames, playInWinners, customizations }) {
  const rounds = [
    { name: 'Round of 64', short: 'R64', round: 1 },
    { name: 'Round of 32', short: 'R32', round: 2 },
    { name: 'Sweet 16', short: 'Sweet 16', round: 3 },
    { name: 'Elite Eight', short: 'Elite 8', round: 4 },
    { name: 'Final Four', short: 'Final Four', round: 5 },
    { name: 'Championship', short: 'Champ', round: 6 }
  ];

  const resolved = buildResolvedGames(liveGames, playInWinners);
  const allGames = [];
  Object.entries(staticRegions).forEach(([regionName, region]) => {
    region.games.forEach(staticGame => {
      const game = resolved[staticGame.id] || mergeWithLiveData(staticGame, liveGames, playInWinners, resolved);
      allGames.push({ ...game, region: regionName });
    });
  });
  // Add Final Four and Championship
  finalFourGames.forEach(fg => {
    const game = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
    allGames.push({ ...game, region: 'finalfour' });
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
                        {getTeamLogo(game.t1) && <img className="team-logo bracket-logo" src={getTeamLogo(game.t1)} alt="" />}
                        <span className={`b-name ${isFinal && game.sc1 < game.sc2 ? 'loser' : ''}`}>{game.t1}</span>
                        {owner1 && <div className="b-owner" style={{ background: getCustomColor(owner1, customizations) }}></div>}
                        {(isLive || isFinal) && <span className={`b-score ${isFinal && game.sc1 < game.sc2 ? 'loser' : ''}`}>{game.sc1}</span>}
                      </div>
                      <div className="bracket-team">
                        <span className="b-seed">{game.s2 || '?'}</span>
                        <div className="b-color" style={{ background: game.t2 === 'TBD' ? '#444' : color2 }}></div>
                        {game.t2 !== 'TBD' && getTeamLogo(game.t2) && <img className="team-logo bracket-logo" src={getTeamLogo(game.t2)} alt="" />}
                        <span className={`b-name ${isFinal && game.sc2 < game.sc1 ? 'loser' : ''} ${game.t2 === 'TBD' ? 'tbd' : ''}`}>{game.t2 === 'TBD' ? 'TBD' : game.t2}</span>
                        {game.t2 !== 'TBD' && owner2 && <div className="b-owner" style={{ background: getCustomColor(owner2, customizations) }}></div>}
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
  // Determine play-in losers from live game data
  const playInLosers = new Set();
  playInGames.forEach(pi => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    if (liveData && liveData.status === 'final') {
      const winner = liveData.score1 > liveData.score2 ? liveData.team1 : liveData.team2;
      const loser = liveData.score1 > liveData.score2 ? liveData.team2 : liveData.team1;
      playInLosers.add(loser);
    }
  });

  const resolved = buildResolvedGames(liveGames, playInWinners);

  return owners.map(owner => {
    let points = 0;
    let teamsAlive = owner.teams.length;
    let teamsEliminated = 0;
    const eliminatedTeams = [];

    // Check play-in eliminations
    owner.teams.forEach(team => {
      if (playInLosers.has(team)) {
        teamsAlive--;
        teamsEliminated++;
        // Find the play-in game to get details
        const piGame = playInGames.find(pi => pi.t1 === team || pi.t2 === team);
        const gameKey = piGame ? [piGame.t1, piGame.t2].sort().join('_') : null;
        const liveData = gameKey ? liveGames[gameKey] : null;
        const winner = liveData ? (liveData.score1 > liveData.score2 ? liveData.team1 : liveData.team2) : 'TBD';
        const winnerScore = liveData ? Math.max(liveData.score1, liveData.score2) : 0;
        const loserScore = liveData ? Math.min(liveData.score1, liveData.score2) : 0;
        eliminatedTeams.push({ team, seed: piGame?.forSeed || 16, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: 0 });
      }
    });
    // Check all games including later rounds and Final Four (resolved already contains FF games)
    Object.values(resolved).forEach(game => {
        if (game && game.status === 'final') {
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
          if (owner.teams.includes(loser) && !playInLosers.has(loser)) {
            teamsAlive--;
            teamsEliminated++;
            eliminatedTeams.push({ team: loser, seed: loserSeed, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: game.round || 1 });
          }
        }
    });
    // Calculate actual maxPossible per alive team based on seed and furthest round reached
    let maxPossible = points;
    owner.teams.forEach(team => {
      const isEliminated = eliminatedTeams.some(e => e.team === team) || playInLosers.has(team);
      if (isEliminated) return;
      // Find what round this team has reached (highest round where they won)
      let currentRound = 0;
      Object.values(resolved).forEach(g => {
        if (g.status === 'final' && g.sc1 != null && g.sc1 !== g.sc2) {
          const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
          if (winner === team) currentRound = Math.max(currentRound, g.round || 1);
        }
      });
      // Find this team's seed from any game they appear in
      let seed = null;
      Object.values(resolved).forEach(g => {
        if (g.t1 === team && g.s1) seed = g.s1;
        if (g.t2 === team && g.s2) seed = g.s2;
      });
      const multiplier = scoringSystem.getSeedMultiplier(seed);
      // Add remaining round points this team could earn
      for (let r = currentRound + 1; r <= 6; r++) {
        maxPossible += (scoringSystem.rounds[r] || 1) * multiplier;
      }
    });
    maxPossible = Math.round(maxPossible * 100) / 100;
    return { ...owner, points: Math.round(points * 100) / 100, teamsAlive, teamsEliminated, eliminatedTeams, maxPossible };
  }).sort((a, b) => b.points - a.points || b.teamsAlive - a.teamsAlive);
}

// Calculate badges dynamically
function calculateBadges(liveGames, playInWinners) {
  const playerBadges = {};
  owners.forEach(o => { playerBadges[o.id] = { glory: [], shame: [] }; });
  
  const resolved = buildResolvedGames(liveGames, playInWinners);
  const completedGames = Object.values(resolved).filter(g => g.status === 'final');

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

function buildEnhancedStandings(liveGames, playInWinners) {
  const standings = calculateStandings(liveGames, playInWinners);
  const allFinalGames = [];
  const teamSeeds = {};

  const resolved = buildResolvedGames(liveGames, playInWinners);
  Object.values(resolved).forEach(game => {
    if (game.s1) teamSeeds[game.t1] = game.s1;
    if (game.s2) teamSeeds[game.t2] = game.s2;
    if (game.status === 'final') allFinalGames.push(game);
  });

  // Quick stats
  const totalGames = allFinalGames.length;
  let totalUpsets = 0, biggestUpset = null, closestGame = null;
  allFinalGames.forEach(g => {
    const winnerSeed = g.sc1 > g.sc2 ? g.s1 : g.s2;
    const loserSeed = g.sc1 > g.sc2 ? g.s2 : g.s1;
    const margin = Math.abs(g.sc1 - g.sc2);
    if (winnerSeed > loserSeed && (winnerSeed - loserSeed) >= 5) {
      totalUpsets++;
      if (!biggestUpset || (winnerSeed - loserSeed) > (biggestUpset.seedDiff)) {
        biggestUpset = { winner: g.sc1 > g.sc2 ? g.t1 : g.t2, loser: g.sc1 > g.sc2 ? g.t2 : g.t1, winnerSeed, loserSeed, seedDiff: winnerSeed - loserSeed };
      }
    }
    if (!closestGame || margin < closestGame.margin) {
      closestGame = { t1: g.t1, t2: g.t2, sc1: g.sc1, sc2: g.sc2, margin };
    }
  });

  const enhanced = standings.map(player => {
    const teamPoints = {};
    const roundPoints = {};
    let wins = 0, losses = 0;
    const recentResults = [];

    player.teams.forEach(t => { teamPoints[t] = 0; });

    allFinalGames.forEach(g => {
      const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
      const loser = g.sc1 > g.sc2 ? g.t2 : g.t1;
      const winnerSeed = g.sc1 > g.sc2 ? g.s1 : g.s2;
      const margin = Math.abs(g.sc1 - g.sc2);
      const round = g.round || 1;

      if (player.teams.includes(winner)) {
        const pts = (scoringSystem.rounds[round] || 1) * scoringSystem.getSeedMultiplier(winnerSeed);
        teamPoints[winner] = (teamPoints[winner] || 0) + pts;
        roundPoints[round] = (roundPoints[round] || 0) + pts;
        wins++;
        recentResults.push({ team: winner, won: true, opponent: loser, margin, round });
      }
      if (player.teams.includes(loser)) {
        losses++;
        recentResults.push({ team: loser, won: false, opponent: winner, margin, round });
      }
    });

    // Upset count for this player
    let upsetCount = 0;
    allFinalGames.forEach(g => {
      const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
      const winnerSeed = g.sc1 > g.sc2 ? g.s1 : g.s2;
      const loserSeed = g.sc1 > g.sc2 ? g.s2 : g.s1;
      if (player.teams.includes(winner) && winnerSeed > loserSeed && (winnerSeed - loserSeed) >= 5) upsetCount++;
    });

    // Build team details
    const teamDetails = player.teams.map(team => {
      const elim = player.eliminatedTeams?.find(e => e.team === team);
      return {
        name: team, seed: teamSeeds[team] || '?', points: Math.round((teamPoints[team] || 0) * 100) / 100,
        alive: !elim, eliminatedRound: elim ? (scoringSystem.roundNames[elim.round] || 'R64') : null, killedBy: elim?.killedBy || null
      };
    }).sort((a, b) => {
      if (a.alive && !b.alive) return -1;
      if (!a.alive && b.alive) return 1;
      if (a.alive) return (a.seed || 99) - (b.seed || 99);
      return 0;
    });

    const recent5 = recentResults.slice(-5);
    const recentWins = recent5.filter(r => r.won).length;
    const recentLosses = recent5.filter(r => !r.won).length;
    const momentum = recent5.length === 0 ? 'neutral' : recentWins > recentLosses ? 'up' : recentWins < recentLosses ? 'down' : 'neutral';

    return { ...player, teamPoints, roundPoints, wins, losses, recentResults: recent5, upsetCount, teamDetails, momentum };
  });

  return { standings: enhanced, quickStats: { totalGames, totalUpsets, biggestUpset, closestGame } };
}

function Leaderboard({ liveGames, playInWinners, customizations }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const { standings, quickStats } = buildEnhancedStandings(liveGames, playInWinners);
  const rankEmoji = ['', '\uD83C\uDFC6', '\uD83E\uDD48', '\uD83E\uDD49'];

  return (
    <div className="standings-page">
      <div className="page-title"><h2>Standings</h2><p>{quickStats.totalGames} games completed</p></div>

      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        <div className="quick-stat-chip"><span className="quick-stat-icon">{'\uD83D\uDD25'}</span><div className="quick-stat-value">{quickStats.totalUpsets}</div><div className="quick-stat-label">Upsets</div></div>
        <div className="quick-stat-chip"><span className="quick-stat-icon">{'\uD83D\uDCA5'}</span><div className="quick-stat-value">{quickStats.biggestUpset ? `#${quickStats.biggestUpset.winnerSeed} > #${quickStats.biggestUpset.loserSeed}` : '--'}</div><div className="quick-stat-label">{quickStats.biggestUpset ? quickStats.biggestUpset.winner : 'Biggest Upset'}</div></div>
        <div className="quick-stat-chip"><span className="quick-stat-icon">{'\u26A1'}</span><div className="quick-stat-value">{quickStats.closestGame ? `${quickStats.closestGame.sc1}-${quickStats.closestGame.sc2}` : '--'}</div><div className="quick-stat-label">{quickStats.closestGame ? `${quickStats.closestGame.t1} vs ${quickStats.closestGame.t2}` : 'Closest Game'}</div></div>
      </div>

      {/* Player Cards */}
      {standings.map((player, index) => {
        const isExpanded = expandedPlayer === player.id;
        const progressPct = player.maxPossible > 0 ? Math.min((player.points / (player.points + player.maxPossible)) * 100, 100) : 0;
        const alivePct = (player.teamsAlive / player.teams.length) * 100;
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

function Achievements({ liveGames, playInWinners, customizations }) {
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
              <div className="player-avatar" style={{ background: getCustomColor(owner, customizations) }}>{getCustomInitials(owner, customizations)}</div>
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
function Portfolio({ liveGames, playInWinners, customizations }) {
  const [history, setHistory] = useState([]);
  const standings = calculateStandings(liveGames, playInWinners);
  
  useEffect(() => {
    const saved = localStorage.getItem('portfolioHistory');
    if (saved) { try { setHistory(JSON.parse(saved)); } catch (e) { console.error('Error loading portfolio history:', e); } }
  }, []);
  
  useEffect(() => {
    const resolvedMap = buildResolvedGames(liveGames, playInWinners);
    const totalGames = Object.values(resolvedMap).filter(g => g.status === 'final').length;
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
    const resolvedMap = buildResolvedGames(liveGames, playInWinners);
    const recentWins = [];
    Object.values(resolvedMap).forEach(game => {
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
                <span className="portfolio-name" style={{ color: getCustomColor(player, customizations) }}>{player.name.toUpperCase()}</span>
                {change !== null && <span className={`portfolio-change ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span>}
              </div>
              <div className="portfolio-points">{player.points}</div>
              <div className="portfolio-meta">{player.teamsAlive} alive · {player.teamsEliminated} eliminated</div>
              <div className="portfolio-bar"><div className="portfolio-bar-fill" style={{ width: `${healthPct}%`, background: getCustomColor(player, customizations) }}></div></div>
            </div>
          );
        })}
      </div>
      <div className="portfolio-sections">
        <div className="portfolio-section">
          <div className="section-title">Hot Teams</div>
          {hotTeams.map((item, idx) => (<div key={idx} className="hot-team-row"><span className="hot-rank">{idx + 1}</span><span className="hot-name">{item.team}</span><span className="hot-owner" style={{ background: getCustomColor(item.owner, customizations) }}></span><span className="hot-points">+{item.points.toFixed(1)} pts</span></div>))}
          {hotTeams.length === 0 && <div className="empty-state">No completed games yet</div>}
        </div>
        <div className="portfolio-section">
          <div className="section-title">Recent Eliminations</div>
          {standings.flatMap(s => s.eliminatedTeams.map(t => ({ ...t, owner: s }))).slice(0, 4).map((item, idx) => (<div key={idx} className="elim-row"><span className="elim-icon">☠</span><span className="elim-name">{item.team}</span><span className="elim-owner" style={{ background: getCustomColor(item.owner, customizations) }}></span><span className="elim-round">R{item.round}</span></div>))}
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
function Graveyard({ liveGames, playInWinners, customizations }) {
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
        {owners.map(o => (<button key={o.id} className={`filter-pill ${filter === o.id ? 'active' : ''}`} style={{ '--accent': getCustomColor(o, customizations) }} onClick={() => setFilter(o.id)}>{o.name} ({ownerCounts[o.id]})</button>))}
      </div>
      <div className="tombstone-grid">
        {filtered.map((item, idx) => (
          <div key={idx} className="tombstone">
            <div className="tombstone-owner" style={{ background: getCustomColor(item.owner, customizations) }}></div>
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
function ProjectionTool({ liveGames, playInWinners, customizations }) {
  const [overrides, setOverrides] = useState({});
  
  const resolved = buildResolvedGames(liveGames, playInWinners);
  const completedGames = [];
  Object.values(staticRegions).forEach(region => {
    region.games.forEach(staticGame => {
      const game = resolved[staticGame.id] || mergeWithLiveData(staticGame, liveGames, playInWinners, resolved);
      if (game.status === 'final') completedGames.push({ ...game, region: region.name });
    });
  });
  finalFourGames.forEach(fg => {
    const game = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
    if (game.status === 'final') completedGames.push({ ...game, region: 'Final Four' });
  });
  
  const calculateWithOverrides = useCallback(() => {
    const allStaticGames = [];
    Object.values(staticRegions).forEach(region => allStaticGames.push(...region.games));
    allStaticGames.push(...finalFourGames);
    return owners.map(owner => {
      let points = 0;
      let teamsAlive = owner.teams.length;
      allStaticGames.forEach(staticGame => {
        const game = resolved[staticGame.id] || mergeWithLiveData(staticGame, liveGames, playInWinners, resolved);
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
      return { ...owner, points: Math.round(points * 100) / 100, teamsAlive };
    }).sort((a, b) => b.points - a.points || b.teamsAlive - a.teamsAlive);
  }, [liveGames, playInWinners, overrides, resolved]);
  
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
                  <span className="proj-team" style={{ background: `${owner1 ? getCustomColor(owner1, customizations) : '#555'}22`, color: owner1 ? getCustomColor(owner1, customizations) : '#555' }}>#{game.s1} {game.t1}</span>
                  <span className="proj-vs">vs</span>
                  <span className="proj-team" style={{ background: `${owner2 ? getCustomColor(owner2, customizations) : '#555'}22`, color: owner2 ? getCustomColor(owner2, customizations) : '#555' }}>#{game.s2} {game.t2}</span>
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
            return (<div key={player.id} className="impact-row"><span className="impact-rank">{idx + 1}</span><span className="impact-name" style={{ color: getCustomColor(player, customizations) }}>{player.name}</span><span className="impact-actual">{actual.points}</span><span className="impact-arrow">→</span><span className={`impact-projected ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>{player.points}</span></div>);
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

// Head-to-Head Comparison
function HeadToHead({ liveGames, playInWinners, customizations }) {
  const [ownerA, setOwnerA] = useState(owners[0].id);
  const [ownerB, setOwnerB] = useState(owners[1].id);
  const standings = calculateStandings(liveGames, playInWinners);
  const a = standings.find(s => s.id === ownerA) || standings[0];
  const b = standings.find(s => s.id === ownerB) || standings[1];

  // Find all completed games and determine team seeds
  const resolved = buildResolvedGames(liveGames, playInWinners);
  const allGames = [];
  const teamSeeds = {};
  Object.values(resolved).forEach(game => {
    if (game.s1) teamSeeds[game.t1] = game.s1;
    if (game.s2) teamSeeds[game.t2] = game.s2;
    if (game.status === 'final') allGames.push(game);
  });

  // Find direct matchups
  const directMatchups = allGames.filter(g => {
    const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
    const loser = g.sc1 > g.sc2 ? g.t2 : g.t1;
    const ownerAObj = owners.find(o => o.id === ownerA);
    const ownerBObj = owners.find(o => o.id === ownerB);
    return (ownerAObj.teams.includes(winner) && ownerBObj.teams.includes(loser)) ||
           (ownerBObj.teams.includes(winner) && ownerAObj.teams.includes(loser));
  });

  const aWins = directMatchups.filter(g => {
    const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
    return owners.find(o => o.id === ownerA).teams.includes(winner);
  }).length;

  const getTeamStatus = (team, owner) => {
    const elim = owner.eliminatedTeams?.find(e => e.team === team);
    return elim ? { alive: false, round: scoringSystem.roundNames[elim.round] || 'R64' } : { alive: true };
  };

  const renderStat = (aVal, bVal, label, lowerBetter = false) => {
    const aWin = lowerBetter ? aVal < bVal : aVal > bVal;
    const bWin = lowerBetter ? bVal < aVal : bVal > aVal;
    return (
      <div className="h2h-stat-row">
        <div className={`h2h-val-left ${aWin ? 'h2h-winner' : aVal === bVal ? '' : 'h2h-loser'}`}>{aVal}</div>
        <div className="h2h-label">{label}</div>
        <div className={`h2h-val-right ${bWin ? 'h2h-winner' : aVal === bVal ? '' : 'h2h-loser'}`}>{bVal}</div>
      </div>
    );
  };

  return (
    <div className="h2h-container">
      <div className="page-title"><h2>Head-to-Head</h2><p>Compare two owners side by side</p></div>
      <div className="h2h-selectors">
        <select className="h2h-select" value={ownerA} onChange={e => setOwnerA(e.target.value)} style={{ borderColor: getCustomColor(a, customizations) }}>
          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <span className="h2h-vs">VS</span>
        <select className="h2h-select" value={ownerB} onChange={e => setOwnerB(e.target.value)} style={{ borderColor: getCustomColor(b, customizations) }}>
          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      <div className="h2h-stats">
        <div className="h2h-stat-row h2h-stat-header">
          <div className="h2h-val-left" style={{ color: getCustomColor(a, customizations) }}>{a.name}</div>
          <div className="h2h-label"></div>
          <div className="h2h-val-right" style={{ color: getCustomColor(b, customizations) }}>{b.name}</div>
        </div>
        {renderStat(a.points, b.points, 'Points')}
        {renderStat(a.teamsAlive, b.teamsAlive, 'Teams Alive')}
        {renderStat(a.teamsEliminated, b.teamsEliminated, 'Eliminated', true)}
        {renderStat(a.maxPossible, b.maxPossible, 'Max Possible')}
      </div>

      <div className="h2h-teams-section">
        <div className="h2h-teams-header">
          <div className="h2h-teams-col-title"><span className="h2h-dot" style={{ background: getCustomColor(a, customizations) }}></span>{a.name}'s Teams</div>
          <div className="h2h-teams-col-title"><span className="h2h-dot" style={{ background: getCustomColor(b, customizations) }}></span>{b.name}'s Teams</div>
        </div>
        <div className="h2h-teams-grid">
          {Array.from({ length: Math.max(a.teams.length, b.teams.length) }).map((_, i) => (
            <React.Fragment key={i}>
              {a.teams[i] ? (() => {
                const status = getTeamStatus(a.teams[i], a);
                return (
                  <div className={`h2h-team-card ${!status.alive ? 'eliminated' : ''}`}>
                    {getTeamLogo(a.teams[i]) && <img src={getTeamLogo(a.teams[i])} alt="" className="h2h-team-logo" />}
                    <span className="h2h-team-name">{a.teams[i]}</span>
                    {teamSeeds[a.teams[i]] && <span className="h2h-team-seed">#{teamSeeds[a.teams[i]]}</span>}
                    <span className={`h2h-team-status ${status.alive ? 'alive' : 'elim'}`}>{status.alive ? 'ALIVE' : status.round}</span>
                  </div>
                );
              })() : <div></div>}
              {b.teams[i] ? (() => {
                const status = getTeamStatus(b.teams[i], b);
                return (
                  <div className={`h2h-team-card ${!status.alive ? 'eliminated' : ''}`}>
                    {getTeamLogo(b.teams[i]) && <img src={getTeamLogo(b.teams[i])} alt="" className="h2h-team-logo" />}
                    <span className="h2h-team-name">{b.teams[i]}</span>
                    {teamSeeds[b.teams[i]] && <span className="h2h-team-seed">#{teamSeeds[b.teams[i]]}</span>}
                    <span className={`h2h-team-status ${status.alive ? 'alive' : 'elim'}`}>{status.alive ? 'ALIVE' : status.round}</span>
                  </div>
                );
              })() : <div></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {directMatchups.length > 0 && (
        <div className="h2h-matchups">
          <div className="h2h-matchups-title">Direct Matchups</div>
          {directMatchups.map((g, i) => {
            const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
            const loser = g.sc1 > g.sc2 ? g.t2 : g.t1;
            const wScore = Math.max(g.sc1, g.sc2);
            const lScore = Math.min(g.sc1, g.sc2);
            return (
              <div key={i} className="matchup-card">
                <div className="matchup-round">{scoringSystem.roundNames[g.round || 1]} - {g.region ? `${g.region.charAt(0).toUpperCase() + g.region.slice(1)} Region` : ''}</div>
                <div className="matchup-teams">
                  <div className={`matchup-team ${g.t1 === winner ? 'matchup-winner' : ''}`}>
                    {getTeamLogo(g.t1) && <img src={getTeamLogo(g.t1)} alt="" className="h2h-team-logo" />}
                    {g.t1} <span className="matchup-score">{g.sc1}</span>
                  </div>
                  <span className="matchup-vs">vs</span>
                  <div className={`matchup-team ${g.t2 === winner ? 'matchup-winner' : ''}`}>
                    <span className="matchup-score">{g.sc2}</span> {g.t2}
                    {getTeamLogo(g.t2) && <img src={getTeamLogo(g.t2)} alt="" className="h2h-team-logo" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="matchup-summary">{a.name} leads {aWins}-{directMatchups.length - aWins} in direct matchups vs {b.name}</div>
        </div>
      )}
      {directMatchups.length === 0 && (
        <div className="h2h-no-matchups">No direct matchups yet between {a.name} and {b.name}'s teams</div>
      )}
    </div>
  );
}

// Bracket History
function BracketHistory({ liveGames, playInWinners, customizations }) {
  const [selectedRound, setSelectedRound] = useState('current');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jerseyBetBracketHistory')) || {}; } catch { return {}; }
  });

  const roundNames = { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'Final' };

  // Auto-snapshot: check if any round is fully complete
  useEffect(() => {
    const resolved = buildResolvedGames(liveGames, playInWinners);
    const allMergedGames = [];
    Object.entries(staticRegions).forEach(([regionKey, region]) => {
      region.games.forEach(sg => {
        const game = resolved[sg.id] || mergeWithLiveData(sg, liveGames, playInWinners, resolved);
        allMergedGames.push({ ...game, regionKey });
      });
    });
    finalFourGames.forEach(fg => {
      const game = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
      allMergedGames.push({ ...game, regionKey: 'finalfour' });
    });

    for (let round = 1; round <= 6; round++) {
      const roundGames = allMergedGames.filter(g => (g.round || 1) === round);
      if (roundGames.length > 0 && roundGames.every(g => g.status === 'final') && !history[round]) {
        const snapshot = {
          timestamp: new Date().toISOString(),
          standings: calculateStandings(liveGames, playInWinners).map(s => ({ id: s.id, name: s.name, points: s.points, teamsAlive: s.teamsAlive, teamsEliminated: s.teamsEliminated })),
          games: allMergedGames.filter(g => (g.round || 1) <= round && g.status === 'final').map(g => ({
            t1: g.t1, t2: g.t2, s1: g.s1, s2: g.s2, sc1: g.sc1, sc2: g.sc2, round: g.round || 1, regionKey: g.regionKey
          }))
        };
        const newHistory = { ...history, [round]: snapshot };
        setHistory(newHistory);
        try { localStorage.setItem('jerseyBetBracketHistory', JSON.stringify(newHistory)); } catch {}
      }
    }
  }, [liveGames, playInWinners, history]);

  const currentStandings = calculateStandings(liveGames, playInWinners);
  const snapshot = selectedRound === 'current' ? null : history[selectedRound];

  const displayStandings = snapshot ? snapshot.standings : currentStandings;
  const displayGames = snapshot ? snapshot.games : (() => {
    const resolved = buildResolvedGames(liveGames, playInWinners);
    const games = [];
    Object.entries(staticRegions).forEach(([regionKey, region]) => {
      region.games.forEach(sg => {
        const game = resolved[sg.id] || mergeWithLiveData(sg, liveGames, playInWinners, resolved);
        if (game.status === 'final') games.push({ ...game, regionKey });
      });
    });
    finalFourGames.forEach(fg => {
      const game = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
      if (game.status === 'final') games.push({ ...game, regionKey: 'finalfour' });
    });
    return games;
  })();

  const regionNames = { east: 'East', west: 'West', south: 'South', midwest: 'Midwest' };
  const gamesByRegion = {};
  displayGames.forEach(g => {
    if (!gamesByRegion[g.regionKey]) gamesByRegion[g.regionKey] = [];
    gamesByRegion[g.regionKey].push(g);
  });

  return (
    <div className="history-container">
      <div className="page-title"><h2>Bracket History</h2><p>Relive the tournament round by round</p></div>
      <div className="history-rounds">
        {Object.entries(roundNames).map(([round, name]) => (
          <button key={round} className={`history-round-btn ${selectedRound === round ? 'active' : ''} ${!history[round] ? 'disabled' : ''}`}
            onClick={() => history[round] && setSelectedRound(round)}>{name}</button>
        ))}
        <button className={`history-round-btn ${selectedRound === 'current' ? 'active' : ''}`} onClick={() => setSelectedRound('current')}>Current</button>
      </div>

      {displayGames.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">📋</div>
          <div>Bracket history will appear as rounds complete</div>
          <div className="history-empty-sub">Results are automatically saved after each round</div>
        </div>
      ) : (
        <>
          {Object.entries(gamesByRegion).map(([regionKey, games]) => (
            <div key={regionKey} className="history-bracket">
              <div className="history-bracket-title">
                {regionNames[regionKey] || regionKey.charAt(0).toUpperCase() + regionKey.slice(1)} Region
                <span>{selectedRound === 'current' ? 'Current' : `After ${roundNames[selectedRound]}`}</span>
              </div>
              {games.map((g, i) => {
                const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
                return (
                  <div key={i} className="history-game">
                    <div className={`history-team ${g.t1 === winner ? 'winner' : 'loser'}`}>
                      <span className="history-seed">({g.s1})</span>
                      {getTeamLogo(g.t1) && <img src={getTeamLogo(g.t1)} alt="" className="history-logo" />}
                      {g.t1}
                    </div>
                    <div className="history-score">{g.sc1}-{g.sc2}</div>
                    <div className={`history-team ${g.t2 === winner ? 'winner' : 'loser'}`}>
                      {g.t2}
                      {getTeamLogo(g.t2) && <img src={getTeamLogo(g.t2)} alt="" className="history-logo" />}
                      <span className="history-seed">({g.s2})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="history-standings">
            <div className="history-standings-title">Standings {selectedRound === 'current' ? '(Current)' : `After ${roundNames[selectedRound]}`}</div>
            {displayStandings.map((s, i) => (
              <div key={s.id} className="history-standing-row">
                <div className="history-standing-left">
                  <span className="history-standing-rank">{i + 1}</span>
                  <span className="history-standing-dot" style={{ background: getCustomColor(owners.find(o => o.id === s.id) || owners[0], customizations) }}></span>
                  <span className="history-standing-name">{s.name}</span>
                </div>
                <div className="history-standing-right">
                  <div className="history-standing-pts" style={{ color: getCustomColor(owners.find(o => o.id === s.id) || owners[0], customizations) }}>{s.points} pts</div>
                  <div className="history-standing-detail">{s.teamsAlive} alive / {s.teamsEliminated} out</div>
                </div>
              </div>
            ))}
            {snapshot && <div className="history-timestamp">Snapshot: {new Date(snapshot.timestamp).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
          </div>
        </>
      )}
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
    { id: 'graveyard', icon: '🪦', title: 'Graveyard', desc: 'Cemetery for eliminated teams.', badge: `${totalEliminated} dead`, color: '#ef4444' },
    { id: 'h2h', icon: '⚔️', title: 'Head-to-Head', desc: 'Compare two owners side by side.', badge: 'New', badgeType: 'new', color: '#22d3ee' },
    { id: 'history', icon: '📜', title: 'Bracket History', desc: 'Relive the bracket round by round.', badge: 'New', badgeType: 'new', color: '#facc15' }
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

      <div className="settings-section">
        <h3 className="settings-section-title">Data</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>Clear cached game data to force a fresh pull from ESPN. Your settings and customizations will be kept.</p>
        <button className="clear-cache-btn" onClick={() => { localStorage.removeItem('jerseyBetGames'); localStorage.removeItem('jerseyBetPlayInWinners'); window.location.reload(); }} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Clear Game Cache & Reload</button>
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
  const resolvedAll = buildResolvedGames(liveGames, playInWinners);
  const hasLiveGames = Object.values(resolvedAll).some(game => game.status === 'live' || game.status === 'halftime');

  const renderCoolStuffContent = () => {
    if (coolStuffSubView === 'achievements') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Achievements liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} /></>;
    if (coolStuffSubView === 'portfolio') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Portfolio liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} /></>;
    if (coolStuffSubView === 'projection') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><ProjectionTool liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} /></>;
    if (coolStuffSubView === 'graveyard') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Graveyard liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} /></>;
    if (coolStuffSubView === 'h2h') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><HeadToHead liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} /></>;
    if (coolStuffSubView === 'history') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><BracketHistory liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} /></>;
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
        {currentTab === 'regions' && <RegionsView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} />}
        {currentTab === 'bracket' && <BracketView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} />}
        {currentTab === 'standings' && <Leaderboard liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} />}
        {currentTab === 'coolstuff' && renderCoolStuffContent()}
      </main>
      <div className="legend">{owners.map(owner => (<div key={owner.id} className="legend-item"><div className="legend-dot" style={{ background: getUserColor(owner) }}></div>{owner.name}</div>))}</div>
      {selectedGame && <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} customizations={customizations} />}
      {showSettings && <div className="modal-bg" onClick={() => setShowSettings(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-handle"></div><div className="modal-head"><span className="modal-title">Settings</span><button className="modal-close" onClick={() => setShowSettings(false)}>×</button></div><div className="modal-body"><Settings currentUser={currentUser} setCurrentUser={setCurrentUser} customizations={customizations} setCustomizations={setCustomizations} /></div></div></div>}
    </div>
  );
}

export default App;
