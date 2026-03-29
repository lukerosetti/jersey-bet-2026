import React, { useState, useCallback } from 'react';
import { owners, regions as staticRegions, finalFourGames, getOwner, scoringSystem } from '../../data/bracketData';
import { mergeWithLiveData } from '../../data/useESPN';
import { getCustomColor, buildResolvedGames } from '../../logic/helpers';
import { calculateStandings } from '../../logic/scoring';

function ProjectionTool({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [overrides, setOverrides] = useState({});

  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);

  // Collect ALL games (completed + upcoming with known teams)
  const completedGames = [];
  const upcomingGames = [];
  Object.values(staticRegions).forEach(region => {
    region.games.forEach(staticGame => {
      const game = resolved[staticGame.id] || mergeWithLiveData(staticGame, liveGames, playInWinners, resolved);
      if (game.status === 'final') completedGames.push({ ...game, region: region.name });
      else if (game.t1 !== 'TBD' && game.t2 !== 'TBD') upcomingGames.push({ ...game, region: region.name });
    });
  });
  finalFourGames.forEach(fg => {
    const game = resolved[fg.id] || mergeWithLiveData(fg, liveGames, playInWinners, resolved);
    if (game.status === 'final') completedGames.push({ ...game, region: 'Final Four' });
    else if (game.t1 !== 'TBD' && game.t2 !== 'TBD') upcomingGames.push({ ...game, region: 'Final Four' });
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
        const gameKey = `${game.t1}_${game.t2}`;

        if (game.status === 'final') {
          // Completed game — use actual winner or override
          const actualWinner = game.sc1 > game.sc2 ? game.t1 : game.t2;
          const overrideWinner = overrides[gameKey];
          const winner = overrideWinner || actualWinner;
          const loser = winner === game.t1 ? game.t2 : game.t1;
          if (owner.teams.includes(winner)) {
            const winnerSeed = winner === game.t1 ? game.s1 : game.s2;
            points += (scoringSystem.rounds[game.round || 1] || 1) * scoringSystem.getSeedMultiplier(winnerSeed);
          }
          if (owner.teams.includes(loser)) teamsAlive--;
        } else if (game.t1 !== 'TBD' && game.t2 !== 'TBD' && overrides[gameKey]) {
          // Upcoming game with a projected winner
          const winner = overrides[gameKey];
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
    setOverrides(prev => {
      const newOverrides = { ...prev };
      if (game.status === 'final') {
        const actualWinner = game.sc1 > game.sc2 ? game.t1 : game.t2;
        if (winner === actualWinner) delete newOverrides[gameKey];
        else newOverrides[gameKey] = winner;
      } else {
        // Upcoming: toggle on/off
        if (newOverrides[gameKey] === winner) delete newOverrides[gameKey];
        else newOverrides[gameKey] = winner;
      }
      return newOverrides;
    });
  };

  const overrideCount = Object.keys(overrides).length;
  const roundNames = { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'Champ' };

  const renderGameCard = (game, idx, isUpcoming) => {
    const gameKey = `${game.t1}_${game.t2}`;
    const actualWinner = game.status === 'final' ? (game.sc1 > game.sc2 ? game.t1 : game.t2) : null;
    const currentWinner = overrides[gameKey] || actualWinner;
    const owner1 = getOwner(game.t1);
    const owner2 = getOwner(game.t2);
    return (
      <div key={`${game.id || idx}-${isUpcoming ? 'u' : 'c'}`} className="projection-game">
        <div className="proj-round-label">{roundNames[game.round] || ''}</div>
        <div className="projection-matchup">
          <span className="proj-team" style={{ background: `${owner1 ? getCustomColor(owner1, customizations) : '#555'}22`, color: owner1 ? getCustomColor(owner1, customizations) : '#555' }}>#{game.s1} {game.t1}</span>
          <span className="proj-vs">vs</span>
          <span className="proj-team" style={{ background: `${owner2 ? getCustomColor(owner2, customizations) : '#555'}22`, color: owner2 ? getCustomColor(owner2, customizations) : '#555' }}>#{game.s2} {game.t2}</span>
        </div>
        <div className="projection-toggle">
          <button className={`toggle-btn ${currentWinner === game.t1 ? 'active' : ''}`} onClick={() => toggleOverride(game, game.t1)}>{game.t1} {currentWinner === game.t1 && '\u2713'}</button>
          <button className={`toggle-btn ${currentWinner === game.t2 ? 'active' : ''}`} onClick={() => toggleOverride(game, game.t2)}>{game.t2} {currentWinner === game.t2 && '\u2713'}</button>
        </div>
      </div>
    );
  };

  return (
    <div className="projection-view">
      <div className="page-title"><h2>Projection Tool</h2><p>Toggle game outcomes to see how standings would change</p></div>
      {overrideCount > 0 && <button className="reset-btn" onClick={() => setOverrides({})}>Reset to actual ({overrideCount} change{overrideCount !== 1 ? 's' : ''})</button>}
      <div className="projection-layout">
        <div className="projection-games">
          {upcomingGames.length > 0 && (
            <>
              <div className="section-title">Upcoming Games</div>
              {upcomingGames.map((game, idx) => renderGameCard(game, idx, true))}
            </>
          )}
          {completedGames.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: upcomingGames.length > 0 ? 20 : 0 }}>Completed Games</div>
              {completedGames.slice(-12).reverse().map((game, idx) => renderGameCard(game, idx, false))}
            </>
          )}
          {completedGames.length === 0 && upcomingGames.length === 0 && <div className="empty-state">No games available yet</div>}
        </div>
        <div className="projection-impact">
          <div className="section-title">Standings Impact</div>
          {projectedStandings.map((player, idx) => {
            const actual = actualStandings.find(a => a.id === player.id);
            const diff = player.points - actual.points;
            return (<div key={player.id} className="impact-row"><span className="impact-rank">{idx + 1}</span><span className="impact-name" style={{ color: getCustomColor(player, customizations) }}>{player.name}</span><span className="impact-actual">{actual.points}</span><span className="impact-arrow">{'\u2192'}</span><span className={`impact-projected ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>{player.points}</span></div>);
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

export default ProjectionTool;
