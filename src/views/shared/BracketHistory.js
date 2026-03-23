import React, { useState, useEffect } from 'react';
import { owners, regions as staticRegions, finalFourGames, getTeamLogo } from '../../data/bracketData';
import { mergeWithLiveData } from '../../data/useESPN';
import { getCustomColor, buildResolvedGames } from '../../logic/helpers';
import { calculateStandings } from '../../logic/scoring';

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

  const regionNamesMap = { east: 'East', west: 'West', south: 'South', midwest: 'Midwest' };
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
          <div className="history-empty-icon">{'\uD83D\uDCCB'}</div>
          <div>Bracket history will appear as rounds complete</div>
          <div className="history-empty-sub">Results are automatically saved after each round</div>
        </div>
      ) : (
        <>
          {Object.entries(gamesByRegion).map(([regionKey, games]) => (
            <div key={regionKey} className="history-bracket">
              <div className="history-bracket-title">
                {regionNamesMap[regionKey] || regionKey.charAt(0).toUpperCase() + regionKey.slice(1)} Region
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

export default BracketHistory;
