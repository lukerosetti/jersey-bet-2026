import React from 'react';
import { regions as staticRegions } from '../../data/bracketData';
import BracketGame from './BracketGame';

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

export default RegionBracket;
