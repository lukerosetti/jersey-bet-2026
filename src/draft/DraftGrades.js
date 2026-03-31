import React from 'react';
import { getPlayerData } from './draftUtils';

function DraftGrades({ owners, picks, playerData }) {
  const ownerIds = Object.keys(owners);

  const getOwgr = (name) => getPlayerData(playerData, name)?.owgr || 99;

  const grades = ownerIds.map(ownerId => {
    const owner = owners[ownerId];
    const teams = owner?.teams || [];
    if (teams.length === 0) return { ownerId, owner, grade: '—', avgOwgr: 99, stars: 0 };

    const avgOwgr = teams.reduce((sum, t) => sum + getOwgr(t), 0) / teams.length;
    const bestPick = teams.reduce((best, t) => getOwgr(t) < getOwgr(best) ? t : best, teams[0]);
    const worstPick = teams.reduce((worst, t) => getOwgr(t) > getOwgr(worst) ? t : worst, teams[0]);

    // Value picks: drafted later than their OWGR suggests
    const valuePicks = teams.filter(t => {
      const pick = picks.find(p => p.player === t);
      return pick && getOwgr(t) < pick.pick; // OWGR better than pick position
    });

    // Grade based on average OWGR (lower = better)
    let grade, stars;
    if (avgOwgr <= 10) { grade = 'A+'; stars = 5; }
    else if (avgOwgr <= 15) { grade = 'A'; stars = 5; }
    else if (avgOwgr <= 20) { grade = 'A-'; stars = 4; }
    else if (avgOwgr <= 30) { grade = 'B+'; stars = 4; }
    else if (avgOwgr <= 40) { grade = 'B'; stars = 3; }
    else if (avgOwgr <= 50) { grade = 'B-'; stars = 3; }
    else if (avgOwgr <= 60) { grade = 'C+'; stars = 2; }
    else if (avgOwgr <= 70) { grade = 'C'; stars = 2; }
    else { grade = 'C-'; stars = 1; }

    return { ownerId, owner, grade, avgOwgr: avgOwgr.toFixed(1), stars, bestPick, worstPick, valuePicks };
  }).sort((a, b) => parseFloat(a.avgOwgr) - parseFloat(b.avgOwgr));

  return (
    <div className="draft-grades">
      <div className="draft-grades-title">Draft Grades</div>
      <div className="draft-grades-list">
        {grades.map((g, idx) => (
          <div key={g.ownerId} className="draft-grade-card">
            <div className="draft-grade-header">
              <span className="draft-grade-rank">{idx + 1}</span>
              <span className="draft-grade-dot" style={{ background: g.owner?.color || '#555' }}></span>
              <span className="draft-grade-name">{g.owner?.name}</span>
              <span className={`draft-grade-letter grade-${g.grade.charAt(0).toLowerCase()}`}>{g.grade}</span>
            </div>
            <div className="draft-grade-details">
              <span>Avg OWGR: {g.avgOwgr}</span>
              {g.bestPick && <span>Best: {g.bestPick} (#{getOwgr(g.bestPick)})</span>}
              {g.valuePicks?.length > 0 && <span>{g.valuePicks.length} value pick{g.valuePicks.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DraftGrades;
