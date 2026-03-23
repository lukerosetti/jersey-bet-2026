import React from 'react';
import { playInGames, getOwner } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';
import TickerCard from './TickerCard';

function LiveGamesTicker({ resolvedGames, liveGames, playInWinners, onGameClick, customizations }) {
  // Sort upcoming games chronologically using startDate (ISO) when available, then tip string
  const getStartTime = (g) => {
    if (g.startDate) {
      const d = new Date(g.startDate);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return Infinity;
  };
  const sortUpcoming = (a, b) => {
    // Primary: chronological by ESPN startDate
    const timeDiff = getStartTime(a) - getStartTime(b);
    if (timeDiff !== 0 && isFinite(getStartTime(a)) && isFinite(getStartTime(b))) return timeDiff;
    // Fallback: lower round first
    const roundDiff = (a.round || 0) - (b.round || 0);
    if (roundDiff !== 0) return roundDiff;
    // Fallback: lower seed first, then game ID
    const seedDiff = (a.s1 || 99) - (b.s1 || 99);
    if (seedDiff !== 0) return seedDiff;
    return (a.id || '').localeCompare(b.id || '');
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
    if (g.half >= 3) return clockSec - 100; // OT: least time remaining (bias to front)
    if (g.half === 2) return clockSec; // 2H: just clock left
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

export default LiveGamesTicker;
