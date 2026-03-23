import React from 'react';
import { playInGames, getTeamColor, getOwner } from '../../data/bracketData';
import GameCard from './GameCard';

function PlayInGames({ liveGames, playInWinners, onGameClick, customizations }) {
  const renderPlayInGame = (pi) => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    const winner = playInWinners[pi.id];
    const isLive = liveData?.status === 'live' || liveData?.status === 'halftime';
    const isFinal = liveData?.status === 'final' || winner;
    const score1 = liveData?.team1 === pi.t1 ? liveData.score1 : liveData?.score2;
    const score2 = liveData?.team1 === pi.t2 ? liveData.score1 : liveData?.score2;

    // Build a game object compatible with GameCard and GameModal
    const gameObj = {
      ...pi,
      round: 0,
      s1: pi.forSeed,
      s2: pi.forSeed,
      status: isLive ? (liveData?.status === 'halftime' ? 'halftime' : 'live') : isFinal ? 'final' : 'upcoming',
      sc1: score1 || 0,
      sc2: score2 || 0,
      time: liveData?.clock,
      half: liveData?.period,
      espnId: liveData?.id,
      label: 'Play-In'
    };

    return (
      <GameCard key={pi.id} game={gameObj} onClick={() => onGameClick && onGameClick(gameObj, 'playin')} customizations={customizations} />
    );
  };

  const hasActivePlayIns = playInGames.some(pi => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames[gameKey];
    return liveData?.status === 'live' || liveData?.status === 'halftime' || !playInWinners[pi.id];
  });

  if (!hasActivePlayIns && Object.keys(playInWinners).length === playInGames.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-label">First Four (Play-In Games)</div>
      {playInGames.map(renderPlayInGame)}
    </div>
  );
}

export default PlayInGames;
