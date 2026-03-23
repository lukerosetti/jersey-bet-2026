import React, { useState, useEffect, useRef } from 'react';
import { getTeamColor, getOwner, scoringSystem } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';

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
          ? (game.status === 'halftime' ? 'HT' : `${game.half >= 3 ? 'OT' : game.half === 1 ? '1H' : '2H'} ${game.time || ''}`)
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

export default TickerCard;
