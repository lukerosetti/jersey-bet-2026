import React, { useState, useEffect, useRef } from 'react';
import { getTeamColor, getTeamLogo, getOwner } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';

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
          {isLive ? (<><span className="live-badge">{game.status === 'halftime' ? 'Half' : 'Live'}</span><span className="game-time live">{game.status === 'halftime' ? 'Halftime' : `${game.half >= 3 ? 'OT' : game.half === 1 ? '1H' : '2H'} ${game.time}`}</span></>) : isFinal ? (<span className="game-time" style={{ color: 'var(--green)' }}>Final</span>) : (<span className="game-time upcoming">{game.tip}</span>)}
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
      {!isTBD && game.prob1 != null && (
        <div className="prob-bar-container"><div className="prob-bar"><div style={{ width: `${game.prob1}%`, background: color1 }}></div><div style={{ width: `${100 - game.prob1}%`, background: color2 }}></div></div></div>
      )}
      {!isTBD && (
        <div className="game-footer">
          {(game.spread || game.total || game.ml) && (
            <div className="betting-preview">
              {game.spread && <div className="bet-item"><div className="bet-label">Spread</div><div className="bet-value">{game.spread?.split(' ')[1]}</div></div>}
              {game.total && <div className="bet-item"><div className="bet-label">O/U</div><div className="bet-value">{game.total}</div></div>}
              {game.ml && <div className="bet-item"><div className="bet-label">ML</div><div className="bet-value">{game.ml}</div></div>}
            </div>
          )}
          <span className="view-more">Details →</span>
        </div>
      )}
    </div>
  );
}

export default GameCard;
