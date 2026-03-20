import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

function TickerCard({ game, isLive, onGameClick, customizations }) {
  const color1 = getTeamColor(game.t1);
  const color2 = getTeamColor(game.t2);
  const owner1 = getOwner(game.t1);
  const owner2 = getOwner(game.t2);
  const roundName = scoringSystem.roundNames[game.round] || '';
  const prevScores = useRef({ sc1: game.sc1, sc2: game.sc2 });
  const [flash1, setFlash1] = useState(false);
  const [flash2, setFlash2] = useState(false);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (isLive && prevScores.current.sc1 !== undefined) {
      if (game.sc1 > prevScores.current.sc1) { setFlash1(true); setPulse(true); setTimeout(() => { setFlash1(false); setPulse(false); }, 1200); }
      if (game.sc2 > prevScores.current.sc2) { setFlash2(true); setPulse(true); setTimeout(() => { setFlash2(false); setPulse(false); }, 1200); }
    }
    prevScores.current = { sc1: game.sc1, sc2: game.sc2 };
  }, [game.sc1, game.sc2, isLive]);
  return (
    <div className={`ticker-card ${!isLive ? 'upcoming' : ''} ${pulse ? 'card-pulse' : ''}`} onClick={() => onGameClick(game, game.region)}>
      <div className="ticker-status">
        <span>{isLive
          ? (game.status === 'halftime' ? 'HT' : `${game.half === 1 ? '1H' : '2H'} ${game.time || ''}`)
          : (game.tip || roundName || 'TBD')
        }</span>
        {game.network && <span className="ticker-network">{game.network}</span>}
      </div>
      <div className="ticker-matchup">
        <div className="ticker-team">
          {owner1 && <span className="ticker-owner-dot" style={{ background: getCustomColor(owner1, customizations) }}></span>}
          <span className="ticker-color" style={{ background: color1 }}></span>
          <span className="ticker-seed">{game.s1}</span>
          <span className="ticker-name">{game.t1}</span>
          {isLive && <span className={`ticker-score ${flash1 ? 'score-flash' : ''}`}>{game.sc1}</span>}
        </div>
        <div className="ticker-team">
          {owner2 && <span className="ticker-owner-dot" style={{ background: getCustomColor(owner2, customizations) }}></span>}
          <span className="ticker-color" style={{ background: color2 }}></span>
          <span className="ticker-seed">{game.s2}</span>
          <span className="ticker-name">{game.t2}</span>
          {isLive && <span className={`ticker-score ${flash2 ? 'score-flash' : ''}`}>{game.sc2}</span>}
        </div>
      </div>
    </div>
  );
}

function LiveGamesTicker({ resolvedGames, liveGames, playInWinners, onGameClick, customizations }) {
  // Sort by round first (cross-week safe), then by tip time within same round
  const parseTip = (tip) => {
    if (!tip) return Infinity;
    const dayOrder = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const parts = tip.match(/^(\w+)\s+(\d+):(\d+)\s+(AM|PM)$/);
    if (!parts) return Infinity;
    const [, day, hr, min, ampm] = parts;
    let hours = parseInt(hr);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return (dayOrder[day] ?? 7) * 1440 + hours * 60 + parseInt(min);
  };
  const sortUpcoming = (a, b) => {
    const roundDiff = (a.round || 0) - (b.round || 0);
    if (roundDiff !== 0) return roundDiff;
    return parseTip(a.tip) - parseTip(b.tip);
  };

  // Collect all live/halftime games
  const liveList = Object.values(resolvedGames).filter(g =>
    g.status === 'live' || g.status === 'halftime'
  );
  playInGames.forEach(pi => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    if (liveData?.status === 'live' || liveData?.status === 'halftime') {
      const score1 = liveData.team1 === pi.t1 ? liveData.score1 : liveData.score2;
      const score2 = liveData.team1 === pi.t2 ? liveData.score1 : liveData.score2;
      if (!liveList.find(g => g.t1 === pi.t1 && g.t2 === pi.t2)) {
        liveList.push({
          ...pi, round: 0, s1: pi.forSeed, s2: pi.forSeed,
          status: liveData.status, sc1: score1 || 0, sc2: score2 || 0,
          time: liveData.clock, half: liveData.period, espnId: liveData.id, label: 'Play-In'
        });
      }
    }
  });

  // Sort live games: least time remaining first (2H < HT < 1H, then by clock ascending)
  const parseClockSeconds = (time) => {
    if (!time) return 1200; // no clock = assume full time
    const parts = time.split(':');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  };
  const getTimeRemaining = (g) => {
    if (g.status === 'halftime') return 1200; // ~20 min = halftime + full 2H
    const clockSec = parseClockSeconds(g.time);
    if (g.half === 2 || g.half === 'OT') return clockSec; // just clock left
    return 1200 + clockSec; // 1H: full 2H + remaining 1H clock
  };
  liveList.sort((a, b) => getTimeRemaining(a) - getTimeRemaining(b));

  // Always collect upcoming games (shown alongside live or alone)
  const allResolved = Object.values(resolvedGames);
  const playInUpcoming = playInGames
    .filter(pi => !playInWinners[pi.id])
    .map(pi => ({ ...pi, round: 0, s1: pi.forSeed, s2: pi.forSeed, status: 'upcoming', label: 'Play-In' }));
  const upcomingList = [...allResolved, ...playInUpcoming]
    .filter(g => g.status === 'upcoming' && g.t1 !== 'TBD' && g.t2 !== 'TBD')
    .sort(sortUpcoming)
    .slice(0, 5);

  if (liveList.length === 0 && upcomingList.length === 0) return null;

  const renderCard = (game, idx, isLive) => (
    <TickerCard key={game.id || idx} game={game} isLive={isLive} onGameClick={onGameClick} customizations={customizations} />
  );

  return (
    <div className="live-ticker">
      {liveList.length > 0 && (
        <div className="ticker-section">
          <div className="live-ticker-label"><span className="live-badge">LIVE</span><span>{liveList.length} Game{liveList.length > 1 ? 's' : ''}</span></div>
          <div className="live-ticker-scroll">{liveList.map((g, i) => renderCard(g, i, true))}</div>
        </div>
      )}
      {upcomingList.length > 0 && (
        <div className="ticker-section">
          <div className="live-ticker-label"><span>Up Next</span></div>
          <div className="live-ticker-scroll">{upcomingList.map((g, i) => renderCard(g, i, false))}</div>
        </div>
      )}
    </div>
  );
}

function LiveIndicator({ lastUpdate, isLoading, error }) {
  const formatTime = (date) => date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--:--';
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!lastUpdate) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      setCountdown(Math.max(0, 30 - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  return (
    <div className="live-indicator">
      <div className={`indicator-dot ${error ? 'error' : isLoading ? 'loading' : 'active'}`}></div>
      <span>{error ? 'Unable to load scores' : isLoading ? 'Updating...' : `Live scores · Updated ${formatTime(lastUpdate)}`}</span>
      {!error && !isLoading && lastUpdate && <span className="next-update">· {countdown}s</span>}
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
  const team1Eliminated = isFinal && team2Winning;
  const team2Eliminated = isFinal && team1Winning;
  const isTBD = game.t1 === 'TBD' || game.t2 === 'TBD';

  // Score flash tracking
  const prevScores = useRef({ sc1: game.sc1, sc2: game.sc2 });
  const [flash1, setFlash1] = useState(false);
  const [flash2, setFlash2] = useState(false);
  const [cardPulse, setCardPulse] = useState(false);
  useEffect(() => {
    if (isLive && prevScores.current.sc1 !== undefined) {
      if (game.sc1 > prevScores.current.sc1) { setFlash1(true); setCardPulse(true); setTimeout(() => { setFlash1(false); setCardPulse(false); }, 1200); }
      if (game.sc2 > prevScores.current.sc2) { setFlash2(true); setCardPulse(true); setTimeout(() => { setFlash2(false); setCardPulse(false); }, 1200); }
    }
    prevScores.current = { sc1: game.sc1, sc2: game.sc2 };
  }, [game.sc1, game.sc2, isLive]);

  return (
    <div className={`game-card ${isLive ? 'live' : ''} ${isTBD ? 'tbd-game' : ''} ${cardPulse ? 'card-pulse' : ''}`} onClick={isTBD ? undefined : onClick}>
      <div className="game-header">
        <div className="game-status">
          {isLive ? (<><span className="live-badge">{game.status === 'halftime' ? 'Half' : 'Live'}</span><span className="game-time live">{game.status === 'halftime' ? 'Halftime' : `${game.half === 1 ? '1H' : '2H'} ${game.time}`}</span></>) : isFinal ? (<span className="game-time" style={{ color: 'var(--green)' }}>Final</span>) : (<span className="game-time upcoming">{game.tip}</span>)}
        </div>
        <span className="game-network">{game.network}</span>
      </div>
      {game.city && <div className="game-location">{game.city}{game.state ? `, ${game.state}` : ''}</div>}
      <div className="game-teams">
        <div className={`team-row ${team1Eliminated ? 'eliminated' : ''}`}>
          <div className="team-seed">{game.s1}</div>
          <div className="team-color" style={{ background: color1 }}></div>
          {getTeamLogo(game.t1) && <img className="team-logo" src={getTeamLogo(game.t1)} alt="" />}
          <div className="team-info">
            <div className={`team-name ${team1Eliminated ? 'eliminated' : team2Winning ? 'loser' : ''}`}>{game.t1}</div>
            <div className="team-meta">{owner1 && <span className="owner-badge"><span className="owner-dot" style={{ background: getCustomColor(owner1, customizations) }}></span>{owner1.name}</span>}{game.rec1 && <span className="team-record">{game.rec1}</span>}</div>
          </div>
          {(isLive || isFinal) && <span className={`team-score ${team2Winning ? 'loser' : ''} ${flash1 ? 'score-flash' : ''}`}>{game.sc1}</span>}
        </div>
        <div className={`team-row ${team2Eliminated ? 'eliminated' : ''}`}>
          <div className="team-seed">{game.s2}</div>
          <div className="team-color" style={{ background: game.t2 === 'TBD' ? '#444' : color2 }}></div>
          {game.t2 !== 'TBD' && getTeamLogo(game.t2) && <img className="team-logo" src={getTeamLogo(game.t2)} alt="" />}
          <div className="team-info">
            <div className={`team-name ${team2Eliminated ? 'eliminated' : team1Winning ? 'loser' : ''} ${game.t2 === 'TBD' ? 'tbd' : ''}`}>{game.t2 === 'TBD' ? 'Play-In Winner' : game.t2}</div>
            <div className="team-meta">{game.t2 !== 'TBD' && owner2 && <span className="owner-badge"><span className="owner-dot" style={{ background: getCustomColor(owner2, customizations) }}></span>{owner2.name}</span>}{game.rec2 && <span className="team-record">{game.rec2}</span>}</div>
          </div>
          {(isLive || isFinal) && <span className={`team-score ${team1Winning ? 'loser' : ''} ${flash2 ? 'score-flash' : ''}`}>{game.sc2}</span>}
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
            <span className="pbp-time">{play.clock} {play.period === 1 ? '1H' : '2H'}</span>
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
          {currentIsLive && <div className="status-bar live"><span className="live-badge">LIVE</span><span>{currentHalf === 1 ? '1st Half' : '2nd Half'} · {currentTime}</span></div>}
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

function RegionsView({ onGameClick, liveGames, playInWinners, customizations, resolvedMap }) {
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const regionNames = [...Object.keys(staticRegions), 'finalfour'];

  // Default to the first region with a live game, or 'east' if none
  const getDefaultRegion = () => {
    // Check Final Four games first (most important late in tournament)
    const hasLiveFF = finalFourGames.some(fg => {
      const merged = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
      return merged.status === 'live' || merged.status === 'halftime';
    });
    if (hasLiveFF) return 'finalfour';
    // Check regional games
    for (const name of Object.keys(staticRegions)) {
      const hasLive = staticRegions[name]?.games?.some(game => {
        const merged = resolved[game.id] || mergeWithLiveData(game, liveGames, playInWinners, resolved);
        return merged.status === 'live' || merged.status === 'halftime';
      });
      if (hasLive) return name;
    }
    return 'east';
  };

  const [activeRegion, setActiveRegion] = useState(getDefaultRegion);
  const [selectedRound, setSelectedRound] = useState(null); // null = auto (latest round)
  const userPickedRegion = useRef(false);

  // Once live data loads, auto-switch to region with live games (if user hasn't manually picked one)
  useEffect(() => {
    if (userPickedRegion.current) return;
    const best = getDefaultRegion();
    if (best !== 'east' || hasLiveInRegion('east')) {
      setActiveRegion(best);
    }
  }, [resolved]); // re-check when game data updates

  const hasLiveInRegion = (regionName) => {
    if (regionName === 'finalfour') {
      return finalFourGames.some(fg => {
        const merged = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
        return merged.status === 'live' || merged.status === 'halftime';
      });
    }
    return staticRegions[regionName]?.games?.some(game => {
      const merged = resolved[game.id] || mergeWithLiveData(game, liveGames, playInWinners, resolved);
      return merged.status === 'live' || merged.status === 'halftime';
    });
  };

  // Determine the current active round: stay on a round until ALL its games are final, then advance
  const getLatestRound = (regionName) => {
    if (regionName === 'finalfour') {
      // Check if Final Four games are all done; if so show Championship
      const ffGames = finalFourGames.filter(fg => fg.round === 5);
      const allFFDone = ffGames.every(fg => {
        const merged = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
        return merged.status === 'final';
      });
      return allFFDone ? 6 : 5;
    }
    const games = staticRegions[regionName]?.games || [];
    for (let round = 1; round <= 4; round++) {
      const roundGames = games.filter(g => g.round === round);
      const allFinal = roundGames.every(g => {
        const merged = resolved[g.id] || mergeWithLiveData(g, liveGames, playInWinners, resolved);
        return merged.status === 'final';
      });
      if (!allFinal) return round;
    }
    return 4; // All regional rounds complete — show Elite 8 results
  };

  const latestRound = getLatestRound(activeRegion);

  // Get available rounds for this region (memoized to avoid new array refs)
  const availableRounds = useMemo(() => {
    if (activeRegion === 'finalfour') return [5, 6];
    const rounds = [];
    for (let r = 1; r <= 4; r++) {
      const games = staticRegions[activeRegion]?.games?.filter(g => g.round === r) || [];
      const hasGame = games.some(g => {
        const merged = resolved[g.id] || mergeWithLiveData(g, liveGames, playInWinners, resolved);
        return merged.t1 !== 'TBD' && merged.t2 !== 'TBD';
      });
      if (hasGame || r === 1) rounds.push(r);
    }
    return rounds;
  }, [activeRegion, resolved, liveGames, playInWinners]);

  // The currently visible round (driven by scroll or tab click)
  const defaultRound = selectedRound != null ? selectedRound : latestRound;
  const [visibleRound, setVisibleRound] = useState(defaultRound);
  const scrollRef = useRef(null);
  const isScrolling = useRef(false);

  // Reset selected round & scroll when switching regions
  const handleRegionChange = (name) => {
    userPickedRegion.current = true;
    setActiveRegion(name);
    setSelectedRound(null);
  };

  // Scroll to a round when tab is clicked
  const scrollToRound = (round) => {
    const idx = availableRounds.indexOf(round);
    if (idx === -1 || !scrollRef.current) return;
    isScrolling.current = true;
    const container = scrollRef.current;
    container.scrollTo({ left: idx * container.offsetWidth, behavior: 'smooth' });
    setVisibleRound(round);
    setSelectedRound(round);
    setTimeout(() => { isScrolling.current = false; }, 400);
  };

  // Sync visible round from scroll position
  const handleScroll = () => {
    if (isScrolling.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const idx = Math.round(container.scrollLeft / container.offsetWidth);
    const round = availableRounds[idx];
    if (round !== undefined && round !== visibleRound) {
      setVisibleRound(round);
      setSelectedRound(round);
    }
  };

  // Scroll to the default round on region change
  useEffect(() => {
    const idx = availableRounds.indexOf(latestRound);
    if (idx !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'auto' });
      setVisibleRound(latestRound);
    }
  }, [activeRegion]); // intentionally only activeRegion — reset scroll on region switch

  // Get sorted games for a given round
  const sortLiveFirst = (arr) => arr.sort((a, b) => {
    const aLive = (a.status === 'live' || a.status === 'halftime') ? 0 : 1;
    const bLive = (b.status === 'live' || b.status === 'halftime') ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return (a.s1 || 16) - (b.s1 || 16);
  });

  const getGamesForRound = (round) => {
    if (activeRegion === 'finalfour') {
      const fg = finalFourGames.filter(g => g.round === round);
      return sortLiveFirst(fg.map(g => resolved[g.id] || mergeWithLiveData(g, liveGames, playInWinners, resolved)));
    }
    const games = staticRegions[activeRegion]?.games?.filter(g => g.round === round) || [];
    const merged = games.map(g => resolved[g.id] || mergeWithLiveData(g, liveGames, playInWinners, resolved));
    return sortLiveFirst(merged);
  };

  const regionLabel = (name) => {
    if (name === 'finalfour') return 'Final Four';
    return staticRegions[name]?.name || name;
  };

  return (
    <div>
      <PlayInGames liveGames={liveGames} playInWinners={playInWinners} onGameClick={onGameClick} customizations={customizations} />
      <div className="region-tabs">
        {regionNames.map(name => (
          <button key={name} className={`region-tab ${activeRegion === name ? 'active' : ''}`} onClick={() => handleRegionChange(name)}>
            {regionLabel(name)}{hasLiveInRegion(name) && <span className="live-dot"></span>}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '8px 0' }}>
        {availableRounds.map(r => (
          <button key={r} onClick={() => scrollToRound(r)} style={{
            padding: '4px 12px', borderRadius: 6, border: '1px solid', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            background: visibleRound === r ? 'var(--cyan)' : 'transparent',
            color: visibleRound === r ? '#0f1923' : 'var(--muted)',
            borderColor: visibleRound === r ? 'var(--cyan)' : 'var(--border)',
            transition: 'all 0.2s'
          }}>{scoringSystem.roundNames[r] || `R${r}`}</button>
        ))}
      </div>
      <div className="rounds-carousel" ref={scrollRef} onScroll={handleScroll}>
        {availableRounds.map(round => (
          <div className="rounds-carousel-page" key={round}>
            {getGamesForRound(round).map((game, idx) => (
              <GameCard key={game.id || idx} game={game} onClick={() => !(game.t1 === 'TBD' && game.t2 === 'TBD') && onGameClick(game, activeRegion)} customizations={customizations} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketGame({ game, onGameClick, customizations, regionName }) {
  const isLive = game.status === 'live' || game.status === 'halftime';
  const isFinal = game.status === 'final';
  const isTBD = game.t1 === 'TBD' || game.t2 === 'TBD';
  const color1 = getTeamColor(game.t1);
  const color2 = getTeamColor(game.t2);
  const owner1 = getOwner(game.t1);
  const owner2 = getOwner(game.t2);
  return (
    <div className={`bracket-game ${isLive ? 'live' : ''} ${isTBD ? 'tbd' : ''}`} onClick={() => !isTBD && onGameClick(game, regionName)}>
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
}

function RegionBracket({ regionName, resolved, onGameClick, customizations }) {
  const games = staticRegions[regionName]?.games || [];
  const r1 = games.filter(g => g.round === 1).map(g => resolved[g.id] || g);
  const r2 = games.filter(g => g.round === 2).map(g => resolved[g.id] || g);
  const r3 = games.filter(g => g.round === 3).map(g => resolved[g.id] || g);
  const r4 = games.filter(g => g.round === 4).map(g => resolved[g.id] || g);
  const roundData = [
    { label: 'R64', games: r1 },
    { label: 'R32', games: r2 },
    { label: 'S16', games: r3 },
    { label: 'E8', games: r4 }
  ];
  return (
    <div className="bracket-region">
      <div className="bracket-scroll">
        <div className="bracket-track">
          {roundData.map((rd, ri) => (
            <div key={ri} className={`round-col round-col-${ri + 1}`}>
              <div className="round-header"><div className="round-name">{rd.label}</div></div>
              <div className={`round-games round-games-${ri + 1}`}>
                {rd.games.map((game, gi) => (
                  <div key={game.id} className={`bracket-slot round-${ri + 1}-slot`}>
                    {ri > 0 && <div className="bracket-connector-left"></div>}
                    <BracketGame game={game} onGameClick={onGameClick} customizations={customizations} regionName={regionName} />
                    {ri < roundData.length - 1 && <div className="bracket-connector-right"></div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinalFourBracket({ resolved, onGameClick, customizations }) {
  const ff1 = resolved['ff1'] || finalFourGames[0];
  const ff2 = resolved['ff2'] || finalFourGames[1];
  const champ = resolved['champ'] || finalFourGames[2];
  return (
    <div className="bracket-region bracket-ff">
      <div className="bracket-scroll">
        <div className="bracket-track bracket-track-ff">
          <div className="round-col round-col-ff">
            <div className="round-header"><div className="round-name">Final Four</div></div>
            <div className="round-games round-games-ff">
              <div className="bracket-slot">
                <BracketGame game={ff1} onGameClick={onGameClick} customizations={customizations} regionName="finalfour" />
                <div className="bracket-connector-right"></div>
              </div>
              <div className="bracket-slot">
                <BracketGame game={ff2} onGameClick={onGameClick} customizations={customizations} regionName="finalfour" />
                <div className="bracket-connector-right"></div>
              </div>
            </div>
          </div>
          <div className="round-col round-col-champ">
            <div className="round-header"><div className="round-name">Championship</div></div>
            <div className="round-games round-games-champ">
              <div className="bracket-slot">
                <div className="bracket-connector-left"></div>
                <BracketGame game={champ} onGameClick={onGameClick} customizations={customizations} regionName="finalfour" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketView({ onGameClick, liveGames, playInWinners, customizations, resolvedMap }) {
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const regionNames = Object.keys(staticRegions);
  const [activeRegion, setActiveRegion] = useState('east');
  const tabs = [...regionNames.map(r => ({ key: r, label: staticRegions[r].name })), { key: 'finalfour', label: 'Final Four' }];

  return (
    <div className="bracket-mobile">
      <div className="bracket-region-tabs">
        {tabs.map(tab => (
          <button key={tab.key} className={`bracket-region-tab ${activeRegion === tab.key ? 'active' : ''}`} onClick={() => setActiveRegion(tab.key)}>{tab.label}</button>
        ))}
      </div>
      {activeRegion === 'finalfour'
        ? <FinalFourBracket resolved={resolved} onGameClick={onGameClick} customizations={customizations} />
        : <RegionBracket regionName={activeRegion} resolved={resolved} onGameClick={onGameClick} customizations={customizations} />
      }
    </div>
  );
}

// Calculate owner standings
function calculateStandings(liveGames, playInWinners, resolvedMap) {
  // Determine play-in losers from live game data
  const playInLosers = new Set();
  playInGames.forEach(pi => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames ? liveGames[gameKey] : null;
    if (liveData && liveData.status === 'final') {
      const winner = liveData.score1 > liveData.score2 ? liveData.team1 : liveData.team2;
      const loser = liveData.score1 > liveData.score2 ? liveData.team2 : liveData.team1;
      playInLosers.add(loser);
    }
  });

  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);

  return owners.map(owner => {
    let points = 0;
    let teamsAlive = owner.teams.length;
    let teamsEliminated = 0;
    const eliminatedTeams = [];
    const teamPoints = {};
    owner.teams.forEach(t => { teamPoints[t] = { team: t, seed: null, points: 0, status: 'alive', wins: 0, killedBy: null, score: null, round: null, gameId: null }; });

    // Check play-in eliminations
    owner.teams.forEach(team => {
      if (playInLosers.has(team)) {
        teamsAlive--;
        teamsEliminated++;
        const piGame = playInGames.find(pi => pi.t1 === team || pi.t2 === team);
        const gameKey = piGame ? [piGame.t1, piGame.t2].sort().join('_') : null;
        const liveData = gameKey && liveGames ? liveGames[gameKey] : null;
        const winner = liveData ? (liveData.score1 > liveData.score2 ? liveData.team1 : liveData.team2) : 'TBD';
        const winnerScore = liveData ? Math.max(liveData.score1, liveData.score2) : 0;
        const loserScore = liveData ? Math.min(liveData.score1, liveData.score2) : 0;
        eliminatedTeams.push({ team, seed: piGame?.forSeed || 16, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: 0 });
        if (teamPoints[team]) { teamPoints[team].status = 'eliminated'; teamPoints[team].killedBy = winner; teamPoints[team].score = `${loserScore}-${winnerScore}`; teamPoints[team].seed = piGame?.forSeed || 16; }
      }
    });
    // Check all games including later rounds and Final Four
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
            const earned = roundPoints * multiplier;
            points += earned;
            if (teamPoints[winner]) { teamPoints[winner].points += earned; teamPoints[winner].wins++; teamPoints[winner].seed = winnerSeed; }
          }
          if (owner.teams.includes(loser) && !playInLosers.has(loser)) {
            teamsAlive--;
            teamsEliminated++;
            eliminatedTeams.push({ team: loser, seed: loserSeed, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: game.round || 1 });
            if (teamPoints[loser]) { teamPoints[loser].status = 'eliminated'; teamPoints[loser].killedBy = winner; teamPoints[loser].score = `${loserScore}-${winnerScore}`; teamPoints[loser].round = game.round || 1; teamPoints[loser].seed = loserSeed; }
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
    // Fill in seeds for teams that haven't been set yet
    Object.values(resolved).forEach(g => {
      if (g.t1 && teamPoints[g.t1] && !teamPoints[g.t1].seed) teamPoints[g.t1].seed = g.s1;
      if (g.t2 && teamPoints[g.t2] && !teamPoints[g.t2].seed) teamPoints[g.t2].seed = g.s2;
    });
    const teamData = Object.values(teamPoints).sort((a, b) => b.points - a.points || (a.status === 'alive' ? -1 : 1));
    return { ...owner, points: Math.round(points * 100) / 100, teamsAlive, teamsEliminated, eliminatedTeams, maxPossible, teamData };
  }).sort((a, b) => b.points - a.points || b.teamsAlive - a.teamsAlive);
}

// Calculate badges dynamically
function calculateBadges(liveGames, playInWinners, resolvedMap) {
  const playerBadges = {};
  owners.forEach(o => { playerBadges[o.id] = { glory: [], shame: [] }; });

  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const completedGames = Object.values(resolved).filter(g => g.status === 'final');

  if (completedGames.length === 0) return playerBadges;
  
  const ownerStats = {};
  owners.forEach(o => { ownerStats[o.id] = { wins: 0, losses: 0, blowoutWins: 0, blowoutLosses: 0, closeWins: 0, upsets: 0, clownPicks: 0, bestBlowoutWin: null, bestCloseWin: null, bestUpset: null, bestBlowoutLoss: null, bestClownPick: null }; });

  const fmtGame = (wSeed, wName, wSc, lSeed, lName, lSc) => `(${wSeed}) ${wName} ${wSc}, (${lSeed}) ${lName} ${lSc}`;

  completedGames.forEach(game => {
    const t1Won = game.sc1 > game.sc2;
    const winner = t1Won ? game.t1 : game.t2;
    const loser = t1Won ? game.t2 : game.t1;
    const winnerSeed = t1Won ? game.s1 : game.s2;
    const loserSeed = t1Won ? game.s2 : game.s1;
    const winSc = t1Won ? game.sc1 : game.sc2;
    const loseSc = t1Won ? game.sc2 : game.sc1;
    const margin = winSc - loseSc;
    const winnerOwner = getOwner(winner);
    const loserOwner = getOwner(loser);
    const gameCtx = { winner, loser, winnerSeed, loserSeed, winSc, loseSc, margin };

    if (winnerOwner) {
      const s = ownerStats[winnerOwner.id];
      s.wins++;
      if (margin >= 20 && (!s.bestBlowoutWin || margin > s.bestBlowoutWin.margin)) { s.blowoutWins++; s.bestBlowoutWin = gameCtx; }
      else if (margin >= 20) { s.blowoutWins++; }
      if (margin <= 3 && (!s.bestCloseWin || margin < s.bestCloseWin.margin)) { s.closeWins++; s.bestCloseWin = gameCtx; }
      else if (margin <= 3) { s.closeWins++; }
      if (winnerSeed >= 12 && loserSeed <= 5) { s.upsets++; s.bestUpset = s.bestUpset || gameCtx; }
    }
    if (loserOwner) {
      const s = ownerStats[loserOwner.id];
      s.losses++;
      if (margin >= 25 && (!s.bestBlowoutLoss || margin > s.bestBlowoutLoss.margin)) { s.blowoutLosses++; s.bestBlowoutLoss = gameCtx; }
      else if (margin >= 25) { s.blowoutLosses++; }
      if (loserSeed <= 4 && winnerSeed >= 13) { s.clownPicks++; s.bestClownPick = s.bestClownPick || gameCtx; }
    }
  });

  owners.forEach(owner => {
    const s = ownerStats[owner.id];
    if (s.wins >= 3) playerBadges[owner.id].glory.push({ id: 'hot_start', detail: `${s.wins} wins` });
    if (s.upsets > 0) { const g = s.bestUpset; playerBadges[owner.id].glory.push({ id: 'giant_slayer', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.blowoutWins > 0) { const g = s.bestBlowoutWin; playerBadges[owner.id].glory.push({ id: 'sharp_shooter', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.closeWins > 0) { const g = s.bestCloseWin; playerBadges[owner.id].glory.push({ id: 'buzzer_beater', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.losses >= 3) playerBadges[owner.id].shame.push({ id: 'dumpster_fire', detail: `${s.losses} losses` });
    if (s.clownPicks > 0) { const g = s.bestClownPick; playerBadges[owner.id].shame.push({ id: 'clown_pick', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.blowoutLosses > 0) { const g = s.bestBlowoutLoss; playerBadges[owner.id].shame.push({ id: 'blowout_victim', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
  });

  if (completedGames.length > 0) {
    const firstLoss = completedGames[0];
    const t1Won = firstLoss.sc1 > firstLoss.sc2;
    const loser = t1Won ? firstLoss.t2 : firstLoss.t1;
    const loserOwner = getOwner(loser);
    if (loserOwner && !playerBadges[loserOwner.id].shame.some(b => b.id === 'first_blood')) {
      const winner = t1Won ? firstLoss.t1 : firstLoss.t2;
      const wSeed = t1Won ? firstLoss.s1 : firstLoss.s2;
      const lSeed = t1Won ? firstLoss.s2 : firstLoss.s1;
      const wSc = t1Won ? firstLoss.sc1 : firstLoss.sc2;
      const lSc = t1Won ? firstLoss.sc2 : firstLoss.sc1;
      playerBadges[loserOwner.id].shame.push({ id: 'first_blood', detail: fmtGame(wSeed, winner, wSc, lSeed, loser, lSc) });
    }
  }
  
  return playerBadges;
}

function buildEnhancedStandings(liveGames, playInWinners, resolvedMap) {
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const standings = calculateStandings(liveGames, playInWinners, resolved);
  const allFinalGames = [];
  const teamSeeds = {};
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
      if (player.teams.includes(winner) && winnerSeed > loserSeed) upsetCount++;
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
        const progressPct = player.maxPossible > 0 ? Math.min((player.points / (player.points + player.maxPossible)) * 100, 100) : 0;
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

function Achievements({ liveGames, playInWinners, customizations, resolvedMap }) {
  const playerBadges = calculateBadges(liveGames, playInWinners, resolvedMap);
  const [expanded, setExpanded] = useState({});
  const [selectedBadge, setSelectedBadge] = useState(null);
  const mostShame = owners.reduce((max, o) => (playerBadges[o.id]?.shame?.length || 0) > (playerBadges[max.id]?.shame?.length || 0) ? o : max, owners[0]);
  const allBadges = { glory: [...badges.glory, { id: 'bucket_getter', name: 'Bucket Getter', icon: '🪣', desc: 'Own the tournament\'s leading scorer' }], shame: badges.shame };
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleBadgeDetail = (key) => setSelectedBadge(prev => prev === key ? null : key);
  const getBadgeDetail = (pb, badgeId) => { const found = [...pb.glory, ...pb.shame].find(b => b.id === badgeId); return found?.detail || ''; };

  return (
    <div className="achievements">
      <div className="page-title"><h2>Achievements</h2><p>Glory and shame as the tournament unfolds</p></div>
      {owners.map(owner => {
        const pb = playerBadges[owner.id] || { glory: [], shame: [] };
        const isOpen = expanded[owner.id];
        const earnedGlory = allBadges.glory.filter(b => pb.glory.some(e => e.id === b.id));
        const earnedShame = allBadges.shame.filter(b => pb.shame.some(e => e.id === b.id));
        const totalEarned = earnedGlory.length + earnedShame.length;
        return (
          <div key={owner.id} className="player-card">
            <div className="player-header" onClick={() => toggle(owner.id)} style={{ cursor: 'pointer' }}>
              <div className="player-avatar" style={{ background: getCustomColor(owner, customizations) }}>{getCustomInitials(owner, customizations)}</div>
              <div className="player-info"><div className="player-name">{owner.name}</div><div className="player-stats">{owner.teams.length} teams</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="badge-counts"><div className="badge-count positive">🏅 {pb.glory.length}</div><div className="badge-count negative">💩 {pb.shame.length}</div></div>
                <span style={{ color: 'var(--text2)', fontSize: 14, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </div>
            </div>
            {/* Collapsed: show earned badges inline */}
            {!isOpen && totalEarned > 0 && (
              <div className="earned-badges-row-wrap">
                <div className="earned-badges-row">
                  {earnedGlory.map(b => { const key = `${owner.id}-${b.id}`; return <span key={b.id} className={`earned-badge-chip glory ${selectedBadge === key ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleBadgeDetail(key); }}>{b.icon} {b.name}</span>; })}
                  {earnedShame.map(b => { const key = `${owner.id}-${b.id}`; return <span key={b.id} className={`earned-badge-chip shame ${selectedBadge === key ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleBadgeDetail(key); }}>{b.icon} {b.name}</span>; })}
                </div>
                {selectedBadge?.startsWith(owner.id) && getBadgeDetail(pb, selectedBadge.split('-').slice(1).join('-')) && (
                  <div className="badge-detail">{getBadgeDetail(pb, selectedBadge.split('-').slice(1).join('-'))}</div>
                )}
              </div>
            )}
            {!isOpen && totalEarned === 0 && (
              <div style={{ padding: '8px 0 0', fontSize: '0.8rem', color: 'var(--text2)', opacity: 0.5 }}>No badges earned yet</div>
            )}
            {/* Expanded: show all badges */}
            {isOpen && (
              <div className="badges-section">
                <div className="badges-category"><div className="category-label glory">Glory <span className="category-line"></span></div><div className="badges-grid">{allBadges.glory.map(badge => { const earned = pb.glory.some(e => e.id === badge.id); const key = `${owner.id}-${badge.id}`; return (<div key={badge.id} className={`badge ${earned ? 'earned-positive' : ''} ${selectedBadge === key ? 'badge-selected' : ''}`} onClick={earned ? (e) => { e.stopPropagation(); toggleBadgeDetail(key); } : undefined} style={earned ? { cursor: 'pointer' } : {}}><div className={`badge-icon ${earned ? 'earned-positive' : 'locked'}`}>{badge.icon}</div><div className="badge-name">{badge.name}</div>{earned && <div className="badge-earned-tag">Earned</div>}{selectedBadge === key && <div className="badge-detail">{getBadgeDetail(pb, badge.id)}</div>}</div>); })}</div></div>
                <div className="badges-category"><div className="category-label shame">Shame <span className="category-line"></span></div><div className="badges-grid">{allBadges.shame.map(badge => { const earned = pb.shame.some(e => e.id === badge.id); const key = `${owner.id}-${badge.id}`; return (<div key={badge.id} className={`badge ${earned ? 'earned-negative' : ''} ${selectedBadge === key ? 'badge-selected' : ''}`} onClick={earned ? (e) => { e.stopPropagation(); toggleBadgeDetail(key); } : undefined} style={earned ? { cursor: 'pointer' } : {}}><div className={`badge-icon ${earned ? 'earned-negative' : 'locked'}`}>{badge.icon}</div><div className="badge-name">{badge.name}</div>{earned && <div className="badge-earned-tag negative">Earned</div>}{selectedBadge === key && <div className="badge-detail">{getBadgeDetail(pb, badge.id)}</div>}</div>); })}</div></div>
                {owner.id === mostShame.id && pb.shame.length > 0 && (<div className="shame-callout"><div className="shame-callout-icon">🚨</div><div className="shame-callout-text"><div className="shame-callout-title">Wall of Shame Leader</div><div className="shame-callout-desc">{owner.name} has the most shame badges</div></div></div>)}
              </div>
            )}
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
                  {change !== null && <span className={`portfolio-change ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span>}
                  <span style={{ color: 'var(--text2)', fontSize: 12, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              </div>
              <div className="portfolio-points">{player.points}</div>
              <div className="portfolio-meta">{player.teamsAlive} alive · {player.teamsEliminated} eliminated</div>
              <div className="portfolio-bar"><div className="portfolio-bar-fill" style={{ width: `${healthPct}%`, background: getCustomColor(player, customizations) }}></div></div>
              {isExpanded && player.teamData && (
                <div className="portfolio-team-list">
                  {player.teamData.map(t => (
                    <div key={t.team} className={`portfolio-team-row ${t.status === 'eliminated' ? 'eliminated' : ''}`} onClick={(e) => { e.stopPropagation(); const game = findGameForTeam(t.team); if (game && onGameClick) onGameClick(game, game.region); }}>
                      <span className={`portfolio-team-status ${t.status}`}>{t.status === 'alive' ? '●' : '☠'}</span>
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
          {standings.flatMap(s => s.eliminatedTeams.map(t => ({ ...t, owner: s }))).slice(0, 4).map((item, idx) => (<div key={idx} className="elim-row" onClick={() => { const game = findGameForTeam(item.team); if (game && onGameClick) onGameClick(game, game.region); }}><span className="elim-icon">☠</span><span className="elim-name">{item.team}</span><span className="elim-owner" style={{ background: getCustomColor(item.owner, customizations) }}></span><span className="elim-round">{item.round === 0 ? 'Play-In' : `R${item.round}`}</span></div>))}
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
function Graveyard({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [filter, setFilter] = useState('all');
  const standings = calculateStandings(liveGames, playInWinners, resolvedMap);
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
function ProjectionTool({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [overrides, setOverrides] = useState({});
  
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
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
  
  const actualStandings = calculateStandings(liveGames, playInWinners, resolved);
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
function HeadToHead({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [ownerA, setOwnerA] = useState(owners[0].id);
  const [ownerB, setOwnerB] = useState(owners[1].id);
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const standings = calculateStandings(liveGames, playInWinners, resolved);
  const a = standings.find(s => s.id === ownerA) || standings[0];
  const b = standings.find(s => s.id === ownerB) || standings[1];

  // Find all completed games and determine team seeds
  const allGames = [];
  const teamSeeds = {};
  Object.values(resolved).forEach(game => {
    if (game.s1) teamSeeds[game.t1] = game.s1;
    if (game.s2) teamSeeds[game.t2] = game.s2;
    if (game.status === 'final') allGames.push(game);
  });

  const ownerAObj = owners.find(o => o.id === ownerA);
  const ownerBObj = owners.find(o => o.id === ownerB);

  // Find completed direct matchups
  const directMatchups = allGames.filter(g => {
    const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
    const loser = g.sc1 > g.sc2 ? g.t2 : g.t1;
    return (ownerAObj.teams.includes(winner) && ownerBObj.teams.includes(loser)) ||
           (ownerBObj.teams.includes(winner) && ownerAObj.teams.includes(loser));
  });

  // Find upcoming/live direct matchups
  const upcomingMatchups = Object.values(resolved).filter(g => {
    if (g.t1 === 'TBD' || g.t2 === 'TBD') return false;
    if (g.status === 'final') return false;
    return (ownerAObj.teams.includes(g.t1) && ownerBObj.teams.includes(g.t2)) ||
           (ownerBObj.teams.includes(g.t1) && ownerAObj.teams.includes(g.t2));
  });

  const aWins = directMatchups.filter(g => {
    const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
    return ownerAObj.teams.includes(winner);
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

      {(() => {
        // Group upcoming matchups by day from tip field
        const dayOrder = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
        const byDay = {};
        upcomingMatchups.forEach(g => {
          const day = g.tip ? g.tip.split(' ')[0] : 'TBD';
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(g);
        });
        const sortedDays = Object.keys(byDay).sort((x, y) => {
          if (x === 'TBD') return 1;
          if (y === 'TBD') return -1;
          return dayOrder.indexOf(x) - dayOrder.indexOf(y);
        });
        const todayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
        const displayDay = sortedDays.includes(todayAbbr) ? todayAbbr : sortedDays[0];
        const displayGames = displayDay ? (byDay[displayDay] || []) : [];
        const dayLabel = displayDay === todayAbbr ? "Today's Matchups" : displayDay === 'TBD' ? 'Upcoming Matchups' : `Upcoming - ${displayDay}`;

        if (upcomingMatchups.length === 0) return null;

        return (
          <div className="h2h-matchups">
            <div className="h2h-matchups-title">{dayLabel}</div>
            {displayGames.map((g, i) => {
              const gIsLive = g.status === 'live' || g.status === 'halftime';
              const aTeam = ownerAObj.teams.includes(g.t1) ? g.t1 : g.t2;
              const bTeam = ownerBObj.teams.includes(g.t1) ? g.t1 : g.t2;
              const aSeed = aTeam === g.t1 ? g.s1 : g.s2;
              const bSeed = bTeam === g.t1 ? g.s1 : g.s2;
              const aScore = aTeam === g.t1 ? g.sc1 : g.sc2;
              const bScore = bTeam === g.t1 ? g.sc1 : g.sc2;
              return (
                <div key={i} className="matchup-card">
                  <div className="matchup-round">
                    {scoringSystem.roundNames[g.round || 1]}{g.region ? ` - ${g.region.charAt(0).toUpperCase() + g.region.slice(1)}` : ''}
                    <span style={{ float: 'right', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {gIsLive ? <span className="live-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>LIVE</span> : g.tip ? g.tip.split(' ').slice(1).join(' ') : ''}{g.network ? ` · ${g.network}` : ''}
                    </span>
                  </div>
                  <div className="matchup-teams">
                    <div className="matchup-team">
                      <span className="owner-dot" style={{ background: getCustomColor(ownerAObj, customizations), width: 8, height: 8, display: 'inline-block', borderRadius: '50%', marginRight: 6 }}></span>
                      {getTeamLogo(aTeam) && <img src={getTeamLogo(aTeam)} alt="" className="h2h-team-logo" />}
                      #{aSeed} {aTeam}
                      {gIsLive && <span className="matchup-score">{aScore}</span>}
                    </div>
                    <span className="matchup-vs">vs</span>
                    <div className="matchup-team">
                      {gIsLive && <span className="matchup-score">{bScore}</span>}
                      #{bSeed} {bTeam}
                      {getTeamLogo(bTeam) && <img src={getTeamLogo(bTeam)} alt="" className="h2h-team-logo" />}
                      <span className="owner-dot" style={{ background: getCustomColor(ownerBObj, customizations), width: 8, height: 8, display: 'inline-block', borderRadius: '50%', marginLeft: 6 }}></span>
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedDays.length > 1 && <div style={{ color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>+{upcomingMatchups.length - displayGames.length} more on other days</div>}
          </div>
        );
      })()}

      {directMatchups.length > 0 && (
        <div className="h2h-matchups">
          <div className="h2h-matchups-title">Completed Matchups</div>
          {directMatchups.map((g, i) => {
            const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
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
      {directMatchups.length === 0 && upcomingMatchups.length === 0 && (
        <div className="h2h-no-matchups">No direct matchups yet between {a.name} and {b.name}'s teams</div>
      )}
    </div>
  );
}

// Bracket History
function BracketHistory({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [selectedRound, setSelectedRound] = useState('current');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jerseyBetBracketHistory')) || {}; } catch { return {}; }
  });

  const roundNames = { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'Final' };

  // Auto-snapshot: check if any round is fully complete
  useEffect(() => {
    const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
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
          standings: calculateStandings(liveGames, playInWinners, resolved).map(s => ({ id: s.id, name: s.name, points: s.points, teamsAlive: s.teamsAlive, teamsEliminated: s.teamsEliminated })),
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

  const currentStandings = calculateStandings(liveGames, playInWinners, resolvedMap);
  const snapshot = selectedRound === 'current' ? null : history[selectedRound];

  const displayStandings = snapshot ? snapshot.standings : currentStandings;
  const displayGames = snapshot ? snapshot.games : (() => {
    const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
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
function OtherCoolStuff({ liveGames, playInWinners, setSubView, resolvedMap }) {
  const standings = calculateStandings(liveGames, playInWinners, resolvedMap);
  const playerBadges = calculateBadges(liveGames, playInWinners, resolvedMap);
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

function TeamSearch({ resolvedMap, customizations, onGameClick, onClose }) {
  const [query, setQuery] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Build team database from bracket data
  const allTeams = useMemo(() => {
    const teamMap = {};
    Object.values(staticRegions).forEach(region => {
      region.games.forEach(g => {
        if (g.t1 && g.t1 !== 'TBD') {
          if (!teamMap[g.t1]) teamMap[g.t1] = { name: g.t1, seed: g.s1, region: region.name };
        }
        if (g.t2 && g.t2 !== 'TBD') {
          if (!teamMap[g.t2]) teamMap[g.t2] = { name: g.t2, seed: g.s2, region: region.name };
        }
      });
    });
    playInGames.forEach(pi => {
      if (!teamMap[pi.t1]) teamMap[pi.t1] = { name: pi.t1, seed: pi.forSeed, region: pi.forRegion };
      if (!teamMap[pi.t2]) teamMap[pi.t2] = { name: pi.t2, seed: pi.forSeed, region: pi.forRegion };
    });
    return Object.values(teamMap);
  }, []);

  // Get standings data for points/status
  const standings = useMemo(() => calculateStandings(null, null, resolvedMap), [resolvedMap]);

  // Pre-build a team stats lookup map (O(1) per team instead of O(N*M))
  const teamStatsMap = useMemo(() => {
    const map = {};
    standings.forEach(s => {
      s.teamData?.forEach(td => { map[td.team] = { ...td, owner: s }; });
    });
    return map;
  }, [standings]);

  // Filter teams by query AND owner
  const results = useMemo(() => {
    let filtered = allTeams;
    const q = query.trim().toLowerCase();

    // Check if query matches an owner name
    const matchedOwner = q ? owners.find(o => o.name.toLowerCase().includes(q)) : null;

    if (q) {
      // Search by team name OR owner name
      filtered = allTeams.filter(t => {
        if (t.name.toLowerCase().includes(q)) return true;
        const owner = getOwner(t.name);
        if (owner && owner.name.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    // Apply owner chip filter
    if (ownerFilter) {
      filtered = filtered.filter(t => {
        const owner = getOwner(t.name);
        return owner && owner.id === ownerFilter;
      });
    }

    return filtered.sort((a, b) => {
      if (q) {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
      }
      return a.seed - b.seed;
    });
  }, [query, allTeams, ownerFilter]);

  // Find all games for a team
  const getTeamGames = (teamName) => {
    if (!resolvedMap) return [];
    return Object.values(resolvedMap)
      .filter(g => (g.t1 === teamName || g.t2 === teamName) && g.status !== 'upcoming')
      .sort((a, b) => (a.round || 0) - (b.round || 0));
  };

  // Find upcoming games for a team
  const getUpcomingGames = (teamName) => {
    if (!resolvedMap) return [];
    return Object.values(resolvedMap)
      .filter(g => (g.t1 === teamName || g.t2 === teamName) && g.status === 'upcoming' && g.t1 !== 'TBD' && g.t2 !== 'TBD')
      .sort((a, b) => (a.round || 0) - (b.round || 0));
  };

  const roundNames = { 0: 'Play-In', 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'NCG' };

  const displayLimit = 12;
  const totalResults = results.length;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-container" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-wrap">
            <span className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input ref={inputRef} className="search-input" type="text" placeholder="Search teams or owners..." value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button className="search-clear" onClick={() => setQuery('')}>×</button>}
          </div>
          <button className="search-close" onClick={onClose}>✕</button>
        </div>
        <div className="search-owner-chips">
          {owners.map(o => (
            <button key={o.id} className={`search-chip ${ownerFilter === o.id ? 'active' : ''}`}
              style={{ '--chip-color': getCustomColor(o, customizations) }}
              onClick={() => setOwnerFilter(ownerFilter === o.id ? null : o.id)}>
              <span className="search-chip-dot" style={{ background: getCustomColor(o, customizations) }}></span>
              {o.name}
            </button>
          ))}
        </div>
        {totalResults > 0 && <div className="search-result-count">{totalResults > displayLimit ? `Showing ${displayLimit} of ${totalResults}` : `${totalResults} team${totalResults !== 1 ? 's' : ''}`}</div>}
        <div className="search-results">
          {results.length === 0 && <div className="search-empty">{query || ownerFilter ? 'No teams found' : 'Search for a team or select an owner'}</div>}
          {results.slice(0, displayLimit).map(team => {
            const stats = teamStatsMap[team.name];
            const owner = getOwner(team.name);
            const isExpanded = expandedTeam === team.name;
            const completedGames = getTeamGames(team.name);
            const upcomingGames = getUpcomingGames(team.name);

            return (
              <div key={team.name} className={`search-result ${isExpanded ? 'expanded' : ''}`}>
                <div className="search-result-row" onClick={() => setExpandedTeam(isExpanded ? null : team.name)}>
                  <span className={`search-status ${stats?.status || 'alive'}`}>{stats?.status === 'eliminated' ? '☠' : '🟢'}</span>
                  <span className="search-seed">({team.seed})</span>
                  <span className="search-team-name">{team.name}</span>
                  {owner && (
                    <span className="search-owner">
                      <span className="search-owner-dot" style={{ background: getCustomColor(owner, customizations) }}></span>
                      {owner.name}
                    </span>
                  )}
                  <span className={`search-pts ${stats?.points > 0 ? 'has-pts' : ''}`}>{stats?.points ? `+${stats.points.toFixed(1)}` : '0.0'}</span>
                  <span className={`search-arrow ${isExpanded ? 'up' : ''}`}>▼</span>
                </div>
                {isExpanded && (
                  <div className="search-detail">
                    <div className="search-detail-header">
                      <span>{team.region} Region</span>
                      <span>{stats?.wins || 0}W</span>
                      {stats?.status === 'eliminated' && stats?.killedBy && <span className="search-killed">Lost to {stats.killedBy}</span>}
                    </div>
                    {completedGames.length > 0 && (
                      <div className="search-games">
                        {completedGames.map((g, i) => {
                          const won = (g.sc1 > g.sc2 && g.t1 === team.name) || (g.sc2 > g.sc1 && g.t2 === team.name);
                          const isLive = g.status === 'live' || g.status === 'halftime';
                          return (
                            <div key={i} className={`search-game-row ${won ? 'win' : 'loss'} ${isLive ? 'live' : ''}`} onClick={() => { if (onGameClick) onGameClick(g, g.regionKey || team.region); }}>
                              <span className="search-game-round">{roundNames[g.round] || `R${g.round}`}</span>
                              <div className="search-game-teams">
                                <span className={g.t1 === team.name ? 'bold' : ''}>({g.s1}) {g.t1} {g.sc1 != null ? g.sc1 : ''}</span>
                                <span className={g.t2 === team.name ? 'bold' : ''}>({g.s2}) {g.t2} {g.sc2 != null ? g.sc2 : ''}</span>
                              </div>
                              <span className={`search-game-result ${won ? 'w' : 'l'}`}>{isLive ? (g.time || 'LIVE') : (won ? 'W' : 'L')}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {upcomingGames.length > 0 && (
                      <div className="search-games">
                        {upcomingGames.map((g, i) => (
                          <div key={`u${i}`} className="search-game-row upcoming" onClick={() => { if (onGameClick) onGameClick(g, g.regionKey || team.region); }}>
                            <span className="search-game-round">{roundNames[g.round] || `R${g.round}`}</span>
                            <div className="search-game-teams">
                              <span className={g.t1 === team.name ? 'bold' : ''}>({g.s1}) {g.t1}</span>
                              <span className={g.t2 === team.name ? 'bold' : ''}>({g.s2}) {g.t2}</span>
                            </div>
                            <span className="search-game-result upcoming">{g.tip || 'TBD'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {completedGames.length === 0 && upcomingGames.length === 0 && (
                      <div className="search-empty">No games yet</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState('regions');
  const [currentUser, setCurrentUser] = useState(owners[0]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [coolStuffSubView, setCoolStuffSubView] = useState(null);
  const [customizations, setCustomizations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jerseyBetCustomizations')) || {};
    } catch { return {}; }
  });
  const { liveGames, playInWinners, lastUpdate, isLoading, error, refetch } = useLiveScores();

  // Pull-to-refresh
  const [ptrVisible, setPtrVisible] = useState(false);
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (window.scrollY === 0 && e.touches[0].clientY - touchStartY.current > 60 && !ptrRefreshing) {
        setPtrVisible(true);
      }
    };
    const onTouchEnd = async () => {
      if (ptrVisible && !ptrRefreshing) {
        setPtrRefreshing(true);
        await refetch();
        setPtrRefreshing(false);
        setPtrVisible(false);
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [ptrVisible, ptrRefreshing, refetch]);

  useEffect(() => {
    if (selectedGame || showSettings || showSearch) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [selectedGame, showSettings, showSearch]);

  const getUserColor = (user) => customizations[user.id]?.color || user.color;
  const getUserInitials = (user) => customizations[user.id]?.initials || user.initials;
  
  const handleGameClick = (game, region) => setSelectedGame({ ...game, region });
  const resolvedAll = useMemo(() => buildResolvedGames(liveGames, playInWinners), [liveGames, playInWinners]);
  const hasLiveGames = Object.values(resolvedAll).some(game => game.status === 'live' || game.status === 'halftime');

  const renderCoolStuffContent = () => {
    if (coolStuffSubView === 'achievements') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Achievements liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'portfolio') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Portfolio liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} onGameClick={handleGameClick} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'projection') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><ProjectionTool liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'graveyard') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Graveyard liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'h2h') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><HeadToHead liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'history') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><BracketHistory liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    return <OtherCoolStuff liveGames={liveGames} playInWinners={playInWinners} setSubView={setCoolStuffSubView} resolvedMap={resolvedAll} />;
  };

  return (
    <div className="app">
      <div className={`ptr-indicator ${ptrVisible ? 'visible' : ''} ${ptrRefreshing ? 'refreshing' : ''}`}><div className="ptr-spinner"></div></div>
      <div className="glass-header-bar" />
      <header className="header">
        <div><img src="/logo.png" alt="Jersey Bets" className="header-logo" /><div className="header-sub">March Madness 2026</div></div>
        <div className="header-right">
          <button className="settings-btn" onClick={() => setShowSearch(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
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
      <LiveGamesTicker resolvedGames={resolvedAll} liveGames={liveGames} playInWinners={playInWinners} onGameClick={handleGameClick} customizations={customizations} />
      <main>
        {currentTab === 'regions' && <RegionsView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} />}
        {currentTab === 'bracket' && <BracketView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} />}
        {currentTab === 'standings' && <Leaderboard liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} />}
        {currentTab === 'coolstuff' && renderCoolStuffContent()}
      </main>
      <div className="legend">{owners.map(owner => (<div key={owner.id} className="legend-item"><div className="legend-dot" style={{ background: getUserColor(owner) }}></div>{owner.name}</div>))}</div>
      {selectedGame && <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} customizations={customizations} liveGames={liveGames} />}
      {showSettings && <div className="modal-bg" onClick={() => setShowSettings(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-handle"></div><div className="modal-head"><span className="modal-title">Settings</span><button className="modal-close" onClick={() => setShowSettings(false)}>×</button></div><div className="modal-body"><Settings currentUser={currentUser} setCurrentUser={setCurrentUser} customizations={customizations} setCustomizations={setCustomizations} /></div></div></div>}
      {showSearch && <TeamSearch resolvedMap={resolvedAll} customizations={customizations} onGameClick={(g, r) => { setShowSearch(false); handleGameClick(g, r); }} onClose={() => setShowSearch(false)} />}
    </div>
  );
}

export default App;
