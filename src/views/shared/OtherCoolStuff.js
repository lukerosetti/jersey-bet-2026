import React from 'react';
import { owners } from '../../data/bracketData';
import { calculateStandings, calculateBadges } from '../../logic/scoring';

function OtherCoolStuff({ liveGames, playInWinners, setSubView, resolvedMap }) {
  const standings = calculateStandings(liveGames, playInWinners, resolvedMap);
  const playerBadges = calculateBadges(liveGames, playInWinners, resolvedMap);
  const totalBadges = owners.reduce((sum, o) => sum + (playerBadges[o.id]?.glory?.length || 0) + (playerBadges[o.id]?.shame?.length || 0), 0);
  const totalEliminated = standings.reduce((sum, s) => sum + s.teamsEliminated, 0);

  const menuItems = [
    { id: 'achievements', icon: '\uD83C\uDFC6', title: 'Achievements', desc: 'Glory badges, shame badges, and bragging rights.', badge: `${totalBadges} earned`, color: '#fbbf24' },
    { id: 'portfolio', icon: '\uD83D\uDCC8', title: 'Portfolio', desc: 'Track your portfolio value over time.', badge: 'Live', badgeType: 'live', color: '#22d3ee' },
    { id: 'projection', icon: '\uD83D\uDD2E', title: 'Projection Tool', desc: 'Toggle past game outcomes to see impact.', badge: 'New', badgeType: 'new', color: '#a855f7' },
    { id: 'graveyard', icon: '\uD83E\uDEA6', title: 'Graveyard', desc: 'Cemetery for eliminated teams.', badge: `${totalEliminated} dead`, color: '#ef4444' },
    { id: 'h2h', icon: '\u2694\uFE0F', title: 'Head-to-Head', desc: 'Compare two owners side by side.', badge: 'New', badgeType: 'new', color: '#22d3ee' },
    { id: 'history', icon: '\uD83D\uDCDC', title: 'Bracket History', desc: 'Relive the bracket round by round.', badge: 'New', badgeType: 'new', color: '#facc15' }
  ];

  return (
    <div className="cool-stuff">
      <div className="page-title"><h2>Other Cool Stuff</h2><p>Extra features and fun stuff</p></div>
      <div className="menu-grid">
        {menuItems.map(item => (
          <div key={item.id} className="menu-card" style={{ '--accent': item.color }} onClick={() => setSubView(item.id)}>
            <span className={`menu-badge ${item.badgeType || ''}`}>{item.badge}</span>
            <div className="menu-icon">{item.icon}</div>
            <div className="menu-title">{item.title}</div>
            <div className="menu-desc">{item.desc}</div>
            <span className="menu-arrow">{'\u2192'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OtherCoolStuff;
