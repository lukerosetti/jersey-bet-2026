import React from 'react';
import { getTeamColor, getTeamLogo, getOwner } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';

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
      {game.network && <span className="b-network-badge">{game.network}</span>}
      <div className="bracket-team">
        <span className="b-seed">{game.s1 || '?'}</span>
        <div className="b-color" style={{ background: game.t1 === 'TBD' ? '#444' : color1 }}></div>
        {game.t1 !== 'TBD' && getTeamLogo(game.t1) && <img className="team-logo bracket-logo" src={getTeamLogo(game.t1)} alt="" />}
        <span className={`b-name ${isFinal && game.sc1 < game.sc2 ? 'loser' : ''} ${game.t1 === 'TBD' ? 'tbd' : ''}`}>{game.t1}</span>
        {game.t1 !== 'TBD' && owner1 && <div className="b-owner" style={{ background: getCustomColor(owner1, customizations) }}></div>}
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
      {isLive && <div className="game-status-bar live"><span><span className="mini-live-dot"></span>{game.status === 'halftime' ? 'HT' : `${game.half >= 3 ? 'OT ' : ''}${game.time}`}</span>{game.city && <span className="b-location">{game.city}{game.state ? `, ${game.state}` : ''}</span>}</div>}
      {isFinal && <div className="game-status-bar final"><span>Final</span>{game.city && <span className="b-location">{game.city}{game.state ? `, ${game.state}` : ''}</span>}</div>}
      {!isLive && !isFinal && !isTBD && <div className="game-status-bar upcoming"><span>{game.tip || 'TBD'}</span>{game.city && <span className="b-location">{game.city}{game.state ? `, ${game.state}` : ''}</span>}</div>}
    </div>
  );
}

export default BracketGame;
