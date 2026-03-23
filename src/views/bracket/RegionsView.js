import React, { useState, useEffect, useRef, useMemo } from 'react';
import { regions as staticRegions, finalFourGames, scoringSystem } from '../../data/bracketData';
import { mergeWithLiveData } from '../../data/useESPN';
import { buildResolvedGames } from '../../logic/helpers';
import PlayInGames from '../shared/PlayInGames';
import GameCard from '../shared/GameCard';

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

  // Helper: get scroll position for a given page index
  const getPageScrollLeft = (container, idx) => {
    const pages = container.querySelectorAll('.rounds-carousel-page');
    if (pages[idx]) return pages[idx].offsetLeft - container.offsetLeft;
    return 0;
  };

  // Scroll to a round when tab is clicked
  const scrollToRound = (round) => {
    const idx = availableRounds.indexOf(round);
    if (idx === -1 || !scrollRef.current) return;
    isScrolling.current = true;
    const container = scrollRef.current;
    container.scrollTo({ left: getPageScrollLeft(container, idx), behavior: 'smooth' });
    setVisibleRound(round);
    setSelectedRound(round);
    setTimeout(() => { isScrolling.current = false; }, 400);
  };

  // Sync visible round from scroll position
  const handleScroll = () => {
    if (isScrolling.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const pages = container.querySelectorAll('.rounds-carousel-page');
    const scrollPos = container.scrollLeft;
    let closestIdx = 0;
    let closestDist = Infinity;
    pages.forEach((page, i) => {
      const dist = Math.abs((page.offsetLeft - container.offsetLeft) - scrollPos);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    const round = availableRounds[closestIdx];
    if (round !== undefined && round !== visibleRound) {
      setVisibleRound(round);
      setSelectedRound(round);
    }
  };

  // Scroll to the default round on region change
  useEffect(() => {
    const idx = availableRounds.indexOf(latestRound);
    if (idx !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({ left: getPageScrollLeft(scrollRef.current, idx), behavior: 'auto' });
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

export default RegionsView;
