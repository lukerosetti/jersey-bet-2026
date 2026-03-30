import React from 'react';

function DraftBoardGrid({ picks, owners, config, playerData }) {
  const ownerIds = config.draftOrder || Object.keys(owners);
  const rosterSize = config.rosterSize || 10;

  const getFlag = (playerName) => {
    const data = playerData?.[playerName];
    if (!data?.country) return '';
    const code = data.country.toUpperCase();
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  };

  // Build grid: rows = rounds, cols = owners
  // Snake: odd rounds = normal order, even rounds = reversed
  const grid = [];
  for (let round = 1; round <= rosterSize; round++) {
    const order = round % 2 === 1 ? [...ownerIds] : [...ownerIds].reverse();
    const row = order.map(ownerId => {
      const pick = picks.find(p => {
        const pickRound = Math.ceil(p.pick / ownerIds.length);
        const pickOwner = p.ownerId;
        return pickRound === round && pickOwner === ownerId;
      });
      return { ownerId, pick };
    });
    grid.push({ round, cells: row });
  }

  return (
    <div className="draft-grid-container">
      <div className="draft-grid">
        {/* Header row */}
        <div className="draft-grid-row header">
          <div className="draft-grid-cell round-label">RD</div>
          {ownerIds.map(id => (
            <div key={id} className="draft-grid-cell owner-header">
              <span className="draft-grid-owner-dot" style={{ background: owners[id]?.color || '#555' }}></span>
              <span>{owners[id]?.name || id}</span>
            </div>
          ))}
        </div>

        {/* Pick rows */}
        {grid.map(row => (
          <div key={row.round} className="draft-grid-row">
            <div className="draft-grid-cell round-label">{row.round}</div>
            {row.cells.map((cell, idx) => (
              <div key={idx} className={`draft-grid-cell pick-cell ${cell.pick ? 'filled' : 'empty'}`}>
                {cell.pick ? (
                  <div className="draft-grid-pick">
                    <span className="draft-grid-flag">{getFlag(cell.pick.player)}</span>
                    <span className="draft-grid-player">{cell.pick.player.split(' ').pop()}</span>
                  </div>
                ) : (
                  <span className="draft-grid-empty-dot">-</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DraftBoardGrid;
