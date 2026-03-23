import React, { useState } from 'react';
import { owners } from '../../data/bracketData';
import { getCustomColor } from '../../logic/helpers';
import { calculateStandings } from '../../logic/scoring';

function Graveyard({ liveGames, playInWinners, customizations, resolvedMap }) {
  const [filter, setFilter] = useState('all');
  const standings = calculateStandings(liveGames, playInWinners, resolvedMap);
  const epitaphs = ["Gone too soon.", "Rest in pieces.", "They fought valiantly... not really.", "Another one bites the dust.", "F in the chat.", "Press F to pay respects.", "Should've picked someone else.", "Bracket busted.", "So much potential, so little results.", "They tried their best. It wasn't enough."];
  const getRandomEpitaph = (seed) => epitaphs[seed % epitaphs.length];

  const allEliminated = standings.flatMap(s => s.eliminatedTeams.map(t => ({ ...t, owner: s, epitaph: getRandomEpitaph(t.team.length + t.seed) })));
  const filtered = filter === 'all' ? allEliminated : allEliminated.filter(t => t.owner.id === filter);
  const ownerCounts = {};
  owners.forEach(o => { ownerCounts[o.id] = allEliminated.filter(t => t.owner.id === o.id).length; });
  const mostCasualties = owners.reduce((max, o) => ownerCounts[o.id] > ownerCounts[max.id] ? o : max, owners[0]);

  return (
    <div className="graveyard-view">
      <div className="page-title"><h2>Graveyard</h2><p>{allEliminated.length} teams eliminated · {68 - allEliminated.length} remaining</p></div>
      <div className="filter-pills">
        <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        {owners.map(o => (<button key={o.id} className={`filter-pill ${filter === o.id ? 'active' : ''}`} style={{ '--accent': getCustomColor(o, customizations) }} onClick={() => setFilter(o.id)}>{o.name} ({ownerCounts[o.id]})</button>))}
      </div>
      <div className="tombstone-grid">
        {filtered.map((item, idx) => (
          <div key={idx} className="tombstone">
            <div className="tombstone-owner" style={{ background: getCustomColor(item.owner, customizations) }}></div>
            <div className="tombstone-seed">#{item.seed} Seed</div>
            <div className="tombstone-team">{item.team}</div>
            <div className="tombstone-epitaph">"{item.epitaph}"</div>
            <div className="tombstone-killer">Lost to {item.killedBy} <span className="tombstone-score">{item.score}</span></div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-graveyard"><div className="empty-icon">{'\uD83C\uDF31'}</div><div className="empty-text">No casualties yet. The tournament is young.</div></div>}
      </div>
      {allEliminated.length > 0 && (
        <div className="graveyard-stats">
          <div className="grave-stat"><div className="grave-stat-value">{allEliminated.length}</div><div className="grave-stat-label">Total eliminated</div></div>
          <div className="grave-stat worst"><div className="grave-stat-value">{mostCasualties.name}</div><div className="grave-stat-label">Most casualties ({ownerCounts[mostCasualties.id]})</div></div>
        </div>
      )}
    </div>
  );
}

export default Graveyard;
