import React, { useState } from 'react';
import { regions as staticRegions } from '../../data/bracketData';
import { buildResolvedGames } from '../../logic/helpers';
import RegionBracket from './RegionBracket';
import FinalFourBracket from './FinalFourBracket';

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

export default BracketView;
