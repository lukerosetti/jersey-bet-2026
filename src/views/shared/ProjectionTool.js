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
  // Build FF/Champ games, cascading projected winners into championship
  const ff1Game = resolved['ff1'] || mergeWithLiveData(finalFourGames[0], liveGames, playInWinners, resolved);
  const ff2Game = resolved['ff2'] || mergeWithLiveData(finalFourGames[1], liveGames, playInWinners, resolved);
  const champGame = resolved['champ'] || mergeWithLiveData(finalFourGames[2], liveGames, playInWinners, resolved);

  [ff1Game, ff2Game].forEach(game => {
    if (game.status === 'final') completedGames.push({ ...game, region: 'Final Four' });
    else if (game.t1 !== 'TBD' && game.t2 !== 'TBD') upcomingGames.push({ ...game, region: 'Final Four' });
  });

  // Championship: use projected FF winners if actual teams are TBD
  const ff1Key = ff1Game.t1 !== 'TBD' && ff1Game.t2 !== 'TBD' ? `${ff1Game.t1}_${ff1Game.t2}` : null;
  const ff2Key = ff2Game.t1 !== 'TBD' && ff2Game.t2 !== 'TBD' ? `${ff2Game.t1}_${ff2Game.t2}` : null;
  const ff1ProjectedWinner = ff1Key ? (overrides[ff1Key] || (ff1Game.status === 'final' ? (ff1Game.sc1 > ff1Game.sc2 ? ff1Game.t1 : ff1Game.t2) : null)) : null;
  const ff2ProjectedWinner = ff2Key ? (overrides[ff2Key] || (ff2Game.status === 'final' ? (ff2Game.sc1 > ff2Game.sc2 ? ff2Game.t1 : ff2Game.t2) : null)) : null;

  if (champGame.status === 'final') {
    completedGames.push({ ...champGame, region: 'Championship' });
  } else if (champGame.t1 !== 'TBD' && champGame.t2 !== 'TBD') {
    upcomingGames.push({ ...champGame, region: 'Championship' });
  } else if (ff1ProjectedWinner && ff2ProjectedWinner) {
    // Cascade projected FF winners into championship
    const projectedChamp = {
      ...champGame,
      t1: ff1ProjectedWinner,
      t2: ff2ProjectedWinner,
      s1: ff1ProjectedWinner === ff1Game.t1 ? ff1Game.s1 : ff1Game.s2,
      s2: ff2ProjectedWinner === ff2Game.t1 ? ff2Game.s1 : ff2Game.s2,
      region: 'Championship'
    };
    upcomingGames.push(projectedChamp);
  }

  const calculateWithOverrides = useCallback(() => {
    const allStaticGames = [];
    Object.values(staticRegions).forEach(region => allStaticGames.push(...region.games));
    allStaticGames.push(...finalFourGames);

    // Build a lookup of projected winners for cascading (FF → Champ)
    const projectedWinners = {};
    const getProjectedGame = (staticGame) => {
      const game = resolved[staticGame.id] || mergeWithLiveData(staticGame, liveGames, playInWinners, resolved);
      // For champ game with TBD teams, cascade from projected FF winners
      if (staticGame.id === 'champ' && game.t1 === 'TBD' && game.t2 === 'TBD') {
        const t1 = projectedWinners['ff1'] || null;
        const t2 = projectedWinners['ff2'] || null;
        if (t1 && t2) {
          const ff1g = resolved['ff1'] || mergeWithLiveData(finalFourGames[0], liveGames, playInWinners, resolved);
          const ff2g = resolved['ff2'] || mergeWithLiveData(finalFourGames[1], liveGames, playInWinners, resolved);
          return { ...game, t1, t2, s1: t1 === ff1g.t1 ? ff1g.s1 : ff1g.s2, s2: t2 === ff2g.t1 ? ff2g.s1 : ff2g.s2 };
        }
      }
      return game;
    };

    return owners.map(owner => {
      let points = 0;
      let teamsAlive = owner.teams.length;
      allStaticGames.forEach(staticGame => {
        const game = getProjectedGame(staticGame);
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
          if (staticGame.id === 'ff1' || staticGame.id === 'ff2') projectedWinners[staticGame.id] = winner;
        } else if (game.t1 !== 'TBD' && game.t2 !== 'TBD' && overrides[gameKey]) {
          // Upcoming game with a projected winner
          const winner = overrides[gameKey];
          const loser = winner === game.t1 ? game.t2 : game.t1;
          if (owner.teams.includes(winner)) {
            const winnerSeed = winner === game.t1 ? game.s1 : game.s2;
            points += (scoringSystem.rounds[game.round || 1] || 1) * scoringSystem.getSeedMultiplier(winnerSeed);
          }
          if (owner.teams.includes(loser)) teamsAlive--;
          if (staticGame.id === 'ff1' || staticGame.id === 'ff2') projectedWinners[staticGame.id] = winner;
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
