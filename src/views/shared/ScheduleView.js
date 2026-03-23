import React, { useMemo } from 'react';
import { getTeamColor, getTeamLogo, getOwner, scoringSystem } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';

function ScheduleView({ resolvedMap, onGameClick, customizations, liveGames }) {
  // Collect games: keep finals until their entire round concludes
  const games = useMemo(() => {
    const allGames = Object.values(resolvedMap);
    // Determine which rounds are fully complete (every game in that round is final)
    const roundGames = {};
    allGames.forEach(g => {
      const r = g.round || 0;
      if (!roundGames[r]) roundGames[r] = [];
      roundGames[r].push(g);
    });
    const completedRounds = new Set();
    Object.entries(roundGames).forEach(([r, games]) => {
      if (games.length > 0 && games.every(g => g.status === 'final')) {
        completedRounds.add(Number(r));
      }
    });
    // Keep games whose round is NOT fully completed, plus all future/TBD games
    const list = allGames.filter(g => !completedRounds.has(g.round || 0));

    // Day mapping for static tip times (tournament 2026: Tue=Mar 17, Wed=Mar 18, Thu=Mar 19, Fri=Mar 20, Sat=Mar 21, Sun=Mar 22...)
    const dayMap = { 'Tue': '2026-03-17', 'Wed': '2026-03-18', 'Thu': '2026-03-19', 'Fri': '2026-03-20', 'Sat': '2026-03-21', 'Sun': '2026-03-22', 'Mon': '2026-03-23' };
    // R32 weekend
    const dayMapR2 = { 'Sat': '2026-03-21', 'Sun': '2026-03-22' };
    // Sweet 16
    const dayMapS16 = { 'Thu': '2026-03-26', 'Fri': '2026-03-27' };
    // Elite 8
    const dayMapE8 = { 'Sat': '2026-03-28', 'Sun': '2026-03-29' };
    // Final Four
    const dayMapFF = { 'Sat': '2026-04-04' };
    const dayMapChamp = { 'Mon': '2026-04-06' };

    const parseTipToDate = (game) => {
      // If ESPN provides startDate, use it
      if (game.startDate) {
        const d = new Date(game.startDate);
        if (!isNaN(d.getTime())) return d;
      }
      // Parse static tip like "Thu 2:50 PM"
      if (!game.tip) return null;
      const match = game.tip.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      const [, dayStr, hourStr, minStr, ampm] = match;
      let dateStr;
      const round = game.round || 1;
      if (round <= 1) dateStr = dayMap[dayStr];
      else if (round === 2) dateStr = dayMapR2[dayStr] || dayMap[dayStr];
      else if (round === 3) dateStr = dayMapS16[dayStr] || dayMap[dayStr];
      else if (round === 4) dateStr = dayMapE8[dayStr] || dayMap[dayStr];
      else if (round === 5) dateStr = dayMapFF[dayStr] || dayMap[dayStr];
      else if (round === 6) dateStr = dayMapChamp[dayStr] || dayMap[dayStr];
      else dateStr = dayMap[dayStr];
      if (!dateStr) return null;
      let hour = parseInt(hourStr);
      if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${minStr}:00`);
    };

    // Attach parsed date and sort
    const withDates = list.map(g => ({ ...g, _date: parseTipToDate(g) }));
    // Games with dates first (sorted chronologically), then TBD games sorted by round
    const dated = withDates.filter(g => g._date).sort((a, b) => a._date - b._date);
    const undated = withDates.filter(g => !g._date).sort((a, b) => (a.round || 99) - (b.round || 99));
    return [...dated, ...undated];
  }, [resolvedMap]);

  // Group games by date label
  const grouped = useMemo(() => {
    const roundLabels = { 1: 'Round of 64', 2: 'Round of 32', 3: 'Sweet 16', 4: 'Elite 8', 5: 'Final Four', 6: 'Championship' };
    const groups = [];
    let currentLabel = null;
    let currentGames = [];

    games.forEach(g => {
      let label;
      if (g._date) {
        const d = g._date;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        label = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
      } else {
        label = roundLabels[g.round] || 'TBD';
      }
      if (label !== currentLabel) {
        if (currentGames.length > 0) groups.push({ label: currentLabel, games: currentGames });
        currentLabel = label;
        currentGames = [g];
      } else {
        currentGames.push(g);
      }
    });
    if (currentGames.length > 0) groups.push({ label: currentLabel, games: currentGames });
    return groups;
  }, [games]);

  const roundNames = { 0: 'Play-In', 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'NC' };

  // Derive region from game ID prefix (e1->east, w_r2_1->west, s_s16->south, m_e8->midwest, ff/champ->Final Four)
  const getRegionFromId = (id) => {
    if (!id) return '';
    if (id.startsWith('e')) return 'east';
    if (id.startsWith('w')) return 'west';
    if (id.startsWith('s')) return 'south';
    if (id.startsWith('m')) return 'midwest';
    if (id.startsWith('ff') || id === 'champ') return '';
    return '';
  };

  const getRegionLabel = (g) => {
    if (g.region) return g.region.charAt(0).toUpperCase() + g.region.slice(1);
    if (g.label) return g.label;
    const derived = getRegionFromId(g.id);
    if (derived) return derived.charAt(0).toUpperCase() + derived.slice(1);
    return '';
  };

  if (games.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text2)' }}>No upcoming games scheduled.</div>;
  }

  return (
    <div className="schedule-view">
      {grouped.map((group, gi) => (
        <div key={gi} className="schedule-group">
          <div className="schedule-date-header">{group.label}</div>
          {group.games.map(game => {
            const isLive = game.status === 'live' || game.status === 'halftime';
            const isFinal = game.status === 'final';
            const isTBD = game.t1 === 'TBD' || game.t2 === 'TBD';
            const color1 = getTeamColor(game.t1);
            const color2 = getTeamColor(game.t2);
            const owner1 = getOwner(game.t1);
            const owner2 = getOwner(game.t2);
            const region = getRegionLabel(game);
            const timeStr = isLive
              ? (game.status === 'halftime' ? 'HT' : `${game.half >= 3 ? 'OT' : game.half === 1 ? '1H' : '2H'} ${game.time}`)
              : isFinal ? 'Final'
              : (game._date ? game._date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : (game.tip || 'TBD'));

            return (
              <div key={game.id} className={`sched-card ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isTBD ? 'tbd' : ''}`} onClick={() => !isTBD && onGameClick(game, game.region || getRegionFromId(game.id))}>
                <div className="sched-left">
                  <div className="sched-time-col">
                    {isLive ? <span className="sched-live-badge">LIVE</span> : isFinal ? <span className="sched-final-badge">Final</span> : <span className="sched-tip">{timeStr}</span>}
                    {game.network && <span className="sched-network">{game.network}</span>}
                  </div>
                </div>
                <div className="sched-matchup">
                  <div className="sched-team">
                    <span className="sched-seed">{game.s1 || '?'}</span>
                    <div className="sched-color" style={{ background: game.t1 === 'TBD' ? '#444' : color1 }}></div>
                    {game.t1 !== 'TBD' && getTeamLogo(game.t1) && <img className="sched-logo" src={getTeamLogo(game.t1)} alt="" />}
                    <span className="sched-name">{game.t1}</span>
                    {owner1 && <div className="sched-owner" style={{ background: getCustomColor(owner1, customizations) }}></div>}
                    {(isLive || isFinal) && <span className={`sched-score ${isFinal && game.sc1 < game.sc2 ? 'loser' : ''}`}>{game.sc1}</span>}
                  </div>
                  <div className="sched-team">
                    <span className="sched-seed">{game.s2 || '?'}</span>
                    <div className="sched-color" style={{ background: game.t2 === 'TBD' ? '#444' : color2 }}></div>
                    {game.t2 !== 'TBD' && getTeamLogo(game.t2) && <img className="sched-logo" src={getTeamLogo(game.t2)} alt="" />}
                    <span className="sched-name">{game.t2 === 'TBD' ? 'TBD' : game.t2}</span>
                    {owner2 && <div className="sched-owner" style={{ background: getCustomColor(owner2, customizations) }}></div>}
                    {(isLive || isFinal) && <span className={`sched-score ${isFinal && game.sc2 < game.sc1 ? 'loser' : ''}`}>{game.sc2}</span>}
                  </div>
                </div>
                <div className="sched-meta">
                  <span className="sched-round">{roundNames[game.round] || ''}</span>
                  {region && <span className="sched-region">{region}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default ScheduleView;
