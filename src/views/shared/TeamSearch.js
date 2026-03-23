import React, { useState, useEffect, useRef, useMemo } from 'react';
import { owners, regions as staticRegions, playInGames, getTeamLogo, getOwner } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';
import { calculateStandings } from '../../logic/scoring';

function TeamSearch({ resolvedMap, customizations, onGameClick, onClose }) {
  const [query, setQuery] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Build team database from bracket data
  const allTeams = useMemo(() => {
    const teamMap = {};
    Object.values(staticRegions).forEach(region => {
      region.games.forEach(g => {
        if (g.t1 && g.t1 !== 'TBD') {
          if (!teamMap[g.t1]) teamMap[g.t1] = { name: g.t1, seed: g.s1, region: region.name };
        }
        if (g.t2 && g.t2 !== 'TBD') {
          if (!teamMap[g.t2]) teamMap[g.t2] = { name: g.t2, seed: g.s2, region: region.name };
        }
      });
    });
    playInGames.forEach(pi => {
      if (!teamMap[pi.t1]) teamMap[pi.t1] = { name: pi.t1, seed: pi.forSeed, region: pi.forRegion };
      if (!teamMap[pi.t2]) teamMap[pi.t2] = { name: pi.t2, seed: pi.forSeed, region: pi.forRegion };
    });
    return Object.values(teamMap);
  }, []);

  // Get standings data for points/status
  const standings = useMemo(() => calculateStandings(null, null, resolvedMap), [resolvedMap]);

  // Pre-build a team stats lookup map (O(1) per team instead of O(N*M))
  const teamStatsMap = useMemo(() => {
    const map = {};
    standings.forEach(s => {
      s.teamData?.forEach(td => { map[td.team] = { ...td, owner: s }; });
    });
    return map;
  }, [standings]);

  // Filter teams by query AND owner
  const results = useMemo(() => {
    let filtered = allTeams;
    const q = query.trim().toLowerCase();

    // Check if query matches an owner name
    const matchedOwner = q ? owners.find(o => o.name.toLowerCase().includes(q)) : null;

    if (q) {
      // Search by team name OR owner name
      filtered = allTeams.filter(t => {
        if (t.name.toLowerCase().includes(q)) return true;
        const owner = getOwner(t.name);
        if (owner && owner.name.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    // Apply owner chip filter
    if (ownerFilter) {
      filtered = filtered.filter(t => {
        const owner = getOwner(t.name);
        return owner && owner.id === ownerFilter;
      });
    }

    return filtered.sort((a, b) => {
      if (q) {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
      }
      return a.seed - b.seed;
    });
  }, [query, allTeams, ownerFilter]);

  // Find all games for a team
  const getTeamGames = (teamName) => {
    if (!resolvedMap) return [];
    return Object.values(resolvedMap)
      .filter(g => (g.t1 === teamName || g.t2 === teamName) && g.status !== 'upcoming')
      .sort((a, b) => (a.round || 0) - (b.round || 0));
  };

  // Find upcoming games for a team
  const getUpcomingGames = (teamName) => {
    if (!resolvedMap) return [];
    return Object.values(resolvedMap)
      .filter(g => (g.t1 === teamName || g.t2 === teamName) && g.status === 'upcoming' && g.t1 !== 'TBD' && g.t2 !== 'TBD')
      .sort((a, b) => (a.round || 0) - (b.round || 0));
  };

  const roundNames = { 0: 'Play-In', 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'NCG' };

  const displayLimit = 12;
  const totalResults = results.length;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-container" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-wrap">
            <span className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input ref={inputRef} className="search-input" type="text" placeholder="Search teams or owners..." value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button className="search-clear" onClick={() => setQuery('')}>×</button>}
          </div>
          <button className="search-close" onClick={onClose}>✕</button>
        </div>
        <div className="search-owner-chips">
          {owners.map(o => (
            <button key={o.id} className={`search-chip ${ownerFilter === o.id ? 'active' : ''}`}
              style={{ '--chip-color': getCustomColor(o, customizations) }}
              onClick={() => setOwnerFilter(ownerFilter === o.id ? null : o.id)}>
              <span className="search-chip-dot" style={{ background: getCustomColor(o, customizations) }}></span>
              {o.name}
            </button>
          ))}
        </div>
        {totalResults > 0 && <div className="search-result-count">{totalResults > displayLimit ? `Showing ${displayLimit} of ${totalResults}` : `${totalResults} team${totalResults !== 1 ? 's' : ''}`}</div>}
        <div className="search-results">
          {results.length === 0 && <div className="search-empty">{query || ownerFilter ? 'No teams found' : 'Search for a team or select an owner'}</div>}
          {results.slice(0, displayLimit).map(team => {
            const stats = teamStatsMap[team.name];
            const owner = getOwner(team.name);
            const isExpanded = expandedTeam === team.name;
            const completedGames = getTeamGames(team.name);
            const upcomingGames = getUpcomingGames(team.name);

            return (
              <div key={team.name} className={`search-result ${isExpanded ? 'expanded' : ''}`}>
                <div className="search-result-row" onClick={() => setExpandedTeam(isExpanded ? null : team.name)}>
                  <span className={`search-status ${stats?.status || 'alive'}`}>{stats?.status === 'eliminated' ? '☠' : '🟢'}</span>
                  <span className="search-seed">({team.seed})</span>
                  <span className="search-team-name">{team.name}</span>
                  {owner && (
                    <span className="search-owner">
                      <span className="search-owner-dot" style={{ background: getCustomColor(owner, customizations) }}></span>
                      {owner.name}
                    </span>
                  )}
                  <span className={`search-pts ${stats?.points > 0 ? 'has-pts' : ''}`}>{stats?.points ? `+${stats.points.toFixed(1)}` : '0.0'}</span>
                  <span className={`search-arrow ${isExpanded ? 'up' : ''}`}>▼</span>
                </div>
                {isExpanded && (
                  <div className="search-detail">
                    <div className="search-detail-header">
                      <span>{team.region} Region</span>
                      <span>{stats?.wins || 0}W</span>
                      {stats?.status === 'eliminated' && stats?.killedBy && <span className="search-killed">Lost to {stats.killedBy}</span>}
                    </div>
                    {completedGames.length > 0 && (
                      <div className="search-games">
                        {completedGames.map((g, i) => {
                          const won = (g.sc1 > g.sc2 && g.t1 === team.name) || (g.sc2 > g.sc1 && g.t2 === team.name);
                          const isLive = g.status === 'live' || g.status === 'halftime';
                          return (
                            <div key={i} className={`search-game-row ${won ? 'win' : 'loss'} ${isLive ? 'live' : ''}`} onClick={() => { if (onGameClick) onGameClick(g, g.regionKey || team.region); }}>
                              <span className="search-game-round">{roundNames[g.round] || `R${g.round}`}</span>
                              <div className="search-game-teams">
                                <span className={g.t1 === team.name ? 'bold' : ''}>({g.s1}) {g.t1} {g.sc1 != null ? g.sc1 : ''}</span>
                                <span className={g.t2 === team.name ? 'bold' : ''}>({g.s2}) {g.t2} {g.sc2 != null ? g.sc2 : ''}</span>
                              </div>
                              <span className={`search-game-result ${won ? 'w' : 'l'}`}>{isLive ? (g.time || 'LIVE') : (won ? 'W' : 'L')}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {upcomingGames.length > 0 && (
                      <div className="search-games">
                        {upcomingGames.map((g, i) => (
                          <div key={`u${i}`} className="search-game-row upcoming" onClick={() => { if (onGameClick) onGameClick(g, g.regionKey || team.region); }}>
                            <span className="search-game-round">{roundNames[g.round] || `R${g.round}`}</span>
                            <div className="search-game-teams">
                              <span className={g.t1 === team.name ? 'bold' : ''}>({g.s1}) {g.t1}</span>
                              <span className={g.t2 === team.name ? 'bold' : ''}>({g.s2}) {g.t2}</span>
                            </div>
                            <span className="search-game-result upcoming">{g.tip || 'TBD'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {completedGames.length === 0 && upcomingGames.length === 0 && (
                      <div className="search-empty">No games yet</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TeamSearch;
