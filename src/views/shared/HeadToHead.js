import React, { useState } from 'react';
import { owners, getTeamLogo, getOwner, scoringSystem } from '../../data/bracketData';
import { getCustomColor, buildResolvedGames } from '../../logic/helpers';
import { calculateStandings } from '../../logic/scoring';

function HeadToHead({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [ownerA, setOwnerA] = useState(owners[0].id);
  const [ownerB, setOwnerB] = useState(owners[1].id);
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const standings = calculateStandings(liveGames, playInWinners, resolved);
  const a = standings.find(s => s.id === ownerA) || standings[0];
  const b = standings.find(s => s.id === ownerB) || standings[1];

  // Find all completed games and determine team seeds
  const allGames = [];
  const teamSeeds = {};
  Object.values(resolved).forEach(game => {
    if (game.s1) teamSeeds[game.t1] = game.s1;
    if (game.s2) teamSeeds[game.t2] = game.s2;
    if (game.status === 'final') allGames.push(game);
  });

  const ownerAObj = owners.find(o => o.id === ownerA);
  const ownerBObj = owners.find(o => o.id === ownerB);

  // Find completed direct matchups
  const directMatchups = allGames.filter(g => {
    const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
    const loser = g.sc1 > g.sc2 ? g.t2 : g.t1;
    return (ownerAObj.teams.includes(winner) && ownerBObj.teams.includes(loser)) ||
           (ownerBObj.teams.includes(winner) && ownerAObj.teams.includes(loser));
  });

  // Find upcoming/live direct matchups
  const upcomingMatchups = Object.values(resolved).filter(g => {
    if (g.t1 === 'TBD' || g.t2 === 'TBD') return false;
    if (g.status === 'final') return false;
    return (ownerAObj.teams.includes(g.t1) && ownerBObj.teams.includes(g.t2)) ||
           (ownerBObj.teams.includes(g.t1) && ownerAObj.teams.includes(g.t2));
  });

  const aWins = directMatchups.filter(g => {
    const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
    return ownerAObj.teams.includes(winner);
  }).length;

  const getTeamStatus = (team, owner) => {
    const elim = owner.eliminatedTeams?.find(e => e.team === team);
    return elim ? { alive: false, round: scoringSystem.roundNames[elim.round] || 'R64' } : { alive: true };
  };

  const renderStat = (aVal, bVal, label, lowerBetter = false) => {
    const aWin = lowerBetter ? aVal < bVal : aVal > bVal;
    const bWin = lowerBetter ? bVal < aVal : bVal > aVal;
    return (
      <div className="h2h-stat-row">
        <div className={`h2h-val-left ${aWin ? 'h2h-winner' : aVal === bVal ? '' : 'h2h-loser'}`}>{aVal}</div>
        <div className="h2h-label">{label}</div>
        <div className={`h2h-val-right ${bWin ? 'h2h-winner' : aVal === bVal ? '' : 'h2h-loser'}`}>{bVal}</div>
      </div>
    );
  };

  return (
    <div className="h2h-container">
      <div className="page-title"><h2>Head-to-Head</h2><p>Compare two owners side by side</p></div>
      <div className="h2h-selectors">
        <select className="h2h-select" value={ownerA} onChange={e => setOwnerA(e.target.value)} style={{ borderColor: getCustomColor(a, customizations) }}>
          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <span className="h2h-vs">VS</span>
        <select className="h2h-select" value={ownerB} onChange={e => setOwnerB(e.target.value)} style={{ borderColor: getCustomColor(b, customizations) }}>
          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      <div className="h2h-stats">
        <div className="h2h-stat-row h2h-stat-header">
          <div className="h2h-val-left" style={{ color: getCustomColor(a, customizations) }}>{a.name}</div>
          <div className="h2h-label"></div>
          <div className="h2h-val-right" style={{ color: getCustomColor(b, customizations) }}>{b.name}</div>
        </div>
        {renderStat(a.points, b.points, 'Points')}
        {renderStat(a.teamsAlive, b.teamsAlive, 'Teams Alive')}
        {renderStat(a.teamsEliminated, b.teamsEliminated, 'Eliminated', true)}
        {renderStat(a.maxPossible, b.maxPossible, 'Max Possible')}
      </div>

      <div className="h2h-teams-section">
        <div className="h2h-teams-header">
          <div className="h2h-teams-col-title"><span className="h2h-dot" style={{ background: getCustomColor(a, customizations) }}></span>{a.name}'s Teams</div>
          <div className="h2h-teams-col-title"><span className="h2h-dot" style={{ background: getCustomColor(b, customizations) }}></span>{b.name}'s Teams</div>
        </div>
        <div className="h2h-teams-grid">
          {Array.from({ length: Math.max(a.teams.length, b.teams.length) }).map((_, i) => (
            <React.Fragment key={i}>
              {a.teams[i] ? (() => {
                const status = getTeamStatus(a.teams[i], a);
                return (
                  <div className={`h2h-team-card ${!status.alive ? 'eliminated' : ''}`}>
                    {getTeamLogo(a.teams[i]) && <img src={getTeamLogo(a.teams[i])} alt="" className="h2h-team-logo" />}
                    <span className="h2h-team-name">{a.teams[i]}</span>
                    {teamSeeds[a.teams[i]] && <span className="h2h-team-seed">#{teamSeeds[a.teams[i]]}</span>}
                    <span className={`h2h-team-status ${status.alive ? 'alive' : 'elim'}`}>{status.alive ? 'ALIVE' : status.round}</span>
                  </div>
                );
              })() : <div></div>}
              {b.teams[i] ? (() => {
                const status = getTeamStatus(b.teams[i], b);
                return (
                  <div className={`h2h-team-card ${!status.alive ? 'eliminated' : ''}`}>
                    {getTeamLogo(b.teams[i]) && <img src={getTeamLogo(b.teams[i])} alt="" className="h2h-team-logo" />}
                    <span className="h2h-team-name">{b.teams[i]}</span>
                    {teamSeeds[b.teams[i]] && <span className="h2h-team-seed">#{teamSeeds[b.teams[i]]}</span>}
                    <span className={`h2h-team-status ${status.alive ? 'alive' : 'elim'}`}>{status.alive ? 'ALIVE' : status.round}</span>
                  </div>
                );
              })() : <div></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {(() => {
        // Group upcoming matchups by day from tip field
        const dayOrder = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
        const byDay = {};
        upcomingMatchups.forEach(g => {
          const day = g.tip ? g.tip.split(' ')[0] : 'TBD';
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(g);
        });
        const sortedDays = Object.keys(byDay).sort((x, y) => {
          if (x === 'TBD') return 1;
          if (y === 'TBD') return -1;
          return dayOrder.indexOf(x) - dayOrder.indexOf(y);
        });
        const todayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
        const displayDay = sortedDays.includes(todayAbbr) ? todayAbbr : sortedDays[0];
        const displayGames = displayDay ? (byDay[displayDay] || []) : [];
        const dayLabel = displayDay === todayAbbr ? "Today's Matchups" : displayDay === 'TBD' ? 'Upcoming Matchups' : `Upcoming - ${displayDay}`;

        if (upcomingMatchups.length === 0) return null;

        return (
          <div className="h2h-matchups">
            <div className="h2h-matchups-title">{dayLabel}</div>
            {displayGames.map((g, i) => {
              const gIsLive = g.status === 'live' || g.status === 'halftime';
              const aTeam = ownerAObj.teams.includes(g.t1) ? g.t1 : g.t2;
              const bTeam = ownerBObj.teams.includes(g.t1) ? g.t1 : g.t2;
              const aSeed = aTeam === g.t1 ? g.s1 : g.s2;
              const bSeed = bTeam === g.t1 ? g.s1 : g.s2;
              const aScore = aTeam === g.t1 ? g.sc1 : g.sc2;
              const bScore = bTeam === g.t1 ? g.sc1 : g.sc2;
              return (
                <div key={i} className="matchup-card">
                  <div className="matchup-round">
                    {scoringSystem.roundNames[g.round || 1]}{g.region ? ` - ${g.region.charAt(0).toUpperCase() + g.region.slice(1)}` : ''}
                    <span style={{ float: 'right', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {gIsLive ? <span className="live-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>LIVE</span> : g.tip ? g.tip.split(' ').slice(1).join(' ') : ''}{g.network ? ` · ${g.network}` : ''}
                    </span>
                  </div>
                  <div className="matchup-teams">
                    <div className="matchup-team">
                      <span className="owner-dot" style={{ background: getCustomColor(ownerAObj, customizations), width: 8, height: 8, display: 'inline-block', borderRadius: '50%', marginRight: 6 }}></span>
                      {getTeamLogo(aTeam) && <img src={getTeamLogo(aTeam)} alt="" className="h2h-team-logo" />}
                      #{aSeed} {aTeam}
                      {gIsLive && <span className="matchup-score">{aScore}</span>}
                    </div>
                    <span className="matchup-vs">vs</span>
                    <div className="matchup-team">
                      {gIsLive && <span className="matchup-score">{bScore}</span>}
                      #{bSeed} {bTeam}
                      {getTeamLogo(bTeam) && <img src={getTeamLogo(bTeam)} alt="" className="h2h-team-logo" />}
                      <span className="owner-dot" style={{ background: getCustomColor(ownerBObj, customizations), width: 8, height: 8, display: 'inline-block', borderRadius: '50%', marginLeft: 6 }}></span>
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedDays.length > 1 && <div style={{ color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>+{upcomingMatchups.length - displayGames.length} more on other days</div>}
          </div>
        );
      })()}

      {directMatchups.length > 0 && (
        <div className="h2h-matchups">
          <div className="h2h-matchups-title">Completed Matchups</div>
          {directMatchups.map((g, i) => {
            const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
            return (
              <div key={i} className="matchup-card">
                <div className="matchup-round">{scoringSystem.roundNames[g.round || 1]} - {g.region ? `${g.region.charAt(0).toUpperCase() + g.region.slice(1)} Region` : ''}</div>
                <div className="matchup-teams">
                  <div className={`matchup-team ${g.t1 === winner ? 'matchup-winner' : ''}`}>
                    {getTeamLogo(g.t1) && <img src={getTeamLogo(g.t1)} alt="" className="h2h-team-logo" />}
                    {g.t1} <span className="matchup-score">{g.sc1}</span>
                  </div>
                  <span className="matchup-vs">vs</span>
                  <div className={`matchup-team ${g.t2 === winner ? 'matchup-winner' : ''}`}>
                    <span className="matchup-score">{g.sc2}</span> {g.t2}
                    {getTeamLogo(g.t2) && <img src={getTeamLogo(g.t2)} alt="" className="h2h-team-logo" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="matchup-summary">{a.name} leads {aWins}-{directMatchups.length - aWins} in direct matchups vs {b.name}</div>
        </div>
      )}
      {directMatchups.length === 0 && upcomingMatchups.length === 0 && (
        <div className="h2h-no-matchups">No direct matchups yet between {a.name} and {b.name}'s teams</div>
      )}
    </div>
  );
}

export default HeadToHead;
