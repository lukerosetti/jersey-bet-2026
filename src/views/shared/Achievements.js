import React, { useState } from 'react';
import { owners, badges } from '../../data/bracketData';
import { getCustomColor, getCustomInitials } from '../../logic/helpers';
import { calculateBadges } from '../../logic/scoring';

function Achievements({ liveGames, playInWinners, customizations, resolvedMap }) {
  const playerBadges = calculateBadges(liveGames, playInWinners, resolvedMap);
  const [expanded, setExpanded] = useState({});
  const [selectedBadge, setSelectedBadge] = useState(null);
  const mostShame = owners.reduce((max, o) => (playerBadges[o.id]?.shame?.length || 0) > (playerBadges[max.id]?.shame?.length || 0) ? o : max, owners[0]);
  const allBadges = { glory: [...badges.glory, { id: 'bucket_getter', name: 'Bucket Getter', icon: '\uD83E\uDEE3', desc: 'Own the tournament\'s leading scorer' }], shame: badges.shame };
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleBadgeDetail = (key) => setSelectedBadge(prev => prev === key ? null : key);
  const getBadgeDetail = (pb, badgeId) => { const found = [...pb.glory, ...pb.shame].find(b => b.id === badgeId); return found?.detail || ''; };

  return (
    <div className="achievements">
      <div className="page-title"><h2>Achievements</h2><p>Glory and shame as the tournament unfolds</p></div>
      {owners.map(owner => {
        const pb = playerBadges[owner.id] || { glory: [], shame: [] };
        const isOpen = expanded[owner.id];
        const earnedGlory = allBadges.glory.filter(b => pb.glory.some(e => e.id === b.id));
        const earnedShame = allBadges.shame.filter(b => pb.shame.some(e => e.id === b.id));
        const totalEarned = earnedGlory.length + earnedShame.length;
        return (
          <div key={owner.id} className="player-card">
            <div className="player-header" onClick={() => toggle(owner.id)} style={{ cursor: 'pointer' }}>
              <div className="player-avatar" style={{ background: getCustomColor(owner, customizations) }}>{getCustomInitials(owner, customizations)}</div>
              <div className="player-info"><div className="player-name">{owner.name}</div><div className="player-stats">{owner.teams.length} teams</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="badge-counts"><div className="badge-count positive">{'\uD83C\uDFC5'} {pb.glory.length}</div><div className="badge-count negative">{'\uD83D\uDCA9'} {pb.shame.length}</div></div>
                <span style={{ color: 'var(--text2)', fontSize: 14, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
              </div>
            </div>
            {/* Collapsed: show earned badges inline */}
            {!isOpen && totalEarned > 0 && (
              <div className="earned-badges-row-wrap">
                <div className="earned-badges-row">
                  {earnedGlory.map(b => { const key = `${owner.id}-${b.id}`; return <span key={b.id} className={`earned-badge-chip glory ${selectedBadge === key ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleBadgeDetail(key); }}>{b.icon} {b.name}</span>; })}
                  {earnedShame.map(b => { const key = `${owner.id}-${b.id}`; return <span key={b.id} className={`earned-badge-chip shame ${selectedBadge === key ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleBadgeDetail(key); }}>{b.icon} {b.name}</span>; })}
                </div>
                {selectedBadge?.startsWith(owner.id) && getBadgeDetail(pb, selectedBadge.split('-').slice(1).join('-')) && (
                  <div className="badge-detail">{getBadgeDetail(pb, selectedBadge.split('-').slice(1).join('-'))}</div>
                )}
              </div>
            )}
            {!isOpen && totalEarned === 0 && (
              <div style={{ padding: '8px 0 0', fontSize: '0.8rem', color: 'var(--text2)', opacity: 0.5 }}>No badges earned yet</div>
            )}
            {/* Expanded: show all badges */}
            {isOpen && (
              <div className="badges-section">
                <div className="badges-category"><div className="category-label glory">Glory <span className="category-line"></span></div><div className="badges-grid">{allBadges.glory.map(badge => { const earned = pb.glory.some(e => e.id === badge.id); const key = `${owner.id}-${badge.id}`; return (<div key={badge.id} className={`badge ${earned ? 'earned-positive' : ''} ${selectedBadge === key ? 'badge-selected' : ''}`} onClick={earned ? (e) => { e.stopPropagation(); toggleBadgeDetail(key); } : undefined} style={earned ? { cursor: 'pointer' } : {}}><div className={`badge-icon ${earned ? 'earned-positive' : 'locked'}`}>{badge.icon}</div><div className="badge-name">{badge.name}</div>{earned && <div className="badge-earned-tag">Earned</div>}{selectedBadge === key && <div className="badge-detail">{getBadgeDetail(pb, badge.id)}</div>}</div>); })}</div></div>
                <div className="badges-category"><div className="category-label shame">Shame <span className="category-line"></span></div><div className="badges-grid">{allBadges.shame.map(badge => { const earned = pb.shame.some(e => e.id === badge.id); const key = `${owner.id}-${badge.id}`; return (<div key={badge.id} className={`badge ${earned ? 'earned-negative' : ''} ${selectedBadge === key ? 'badge-selected' : ''}`} onClick={earned ? (e) => { e.stopPropagation(); toggleBadgeDetail(key); } : undefined} style={earned ? { cursor: 'pointer' } : {}}><div className={`badge-icon ${earned ? 'earned-negative' : 'locked'}`}>{badge.icon}</div><div className="badge-name">{badge.name}</div>{earned && <div className="badge-earned-tag negative">Earned</div>}{selectedBadge === key && <div className="badge-detail">{getBadgeDetail(pb, badge.id)}</div>}</div>); })}</div></div>
                {owner.id === mostShame.id && pb.shame.length > 0 && (<div className="shame-callout"><div className="shame-callout-icon">{'\uD83D\uDEA8'}</div><div className="shame-callout-text"><div className="shame-callout-title">Wall of Shame Leader</div><div className="shame-callout-desc">{owner.name} has the most shame badges</div></div></div>)}
              </div>
            )}
          </div>
        );
      })}
      <div className="badge-legend">
        <div className="legend-title">All Badges</div>
        <div className="legend-section-title glory">Glory Badges</div>
        {allBadges.glory.map(badge => (<div key={badge.id} className="legend-item"><div className="legend-icon">{badge.icon}</div><div className="legend-info"><div className="legend-name">{badge.name}</div><div className="legend-desc">{badge.desc}</div></div></div>))}
        <div className="legend-section-title shame">Shame Badges</div>
        {allBadges.shame.map(badge => (<div key={badge.id} className="legend-item"><div className="legend-icon">{badge.icon}</div><div className="legend-info"><div className="legend-name shame">{badge.name}</div><div className="legend-desc">{badge.desc}</div></div></div>))}
      </div>
    </div>
  );
}

export default Achievements;
