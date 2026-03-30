import React, { useState } from 'react';
import { getAvailableTournaments, deleteDraftTournament } from '../../tournaments/registry';

function TournamentSwitcher({ activeTournamentId, onSwitch }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const tournaments = getAvailableTournaments();

  if (tournaments.length <= 1) return null; // Don't show if only one tournament

  const active = tournaments.find(t => t.id === activeTournamentId);

  const handleSwitch = (id) => {
    if (id !== activeTournamentId) {
      onSwitch(id);
    }
    setShowDropdown(false);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      deleteDraftTournament(id);
      setConfirmDelete(null);
      if (id === activeTournamentId) {
        onSwitch('march-madness-2026');
      }
      setShowDropdown(false);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="tournament-switcher">
      <button className="switcher-btn" onClick={() => setShowDropdown(!showDropdown)}>
        <span className="switcher-label">{active?.shortLabel || 'NCAA'}</span>
        <span className="switcher-arrow">{showDropdown ? '\u25B2' : '\u25BC'}</span>
      </button>
      {showDropdown && (
        <>
          <div className="switcher-overlay" onClick={() => { setShowDropdown(false); setConfirmDelete(null); }} />
          <div className="switcher-dropdown">
            <div className="switcher-title">Switch Tournament</div>
            {tournaments.map(t => (
              <div key={t.id} className={`switcher-item ${t.id === activeTournamentId ? 'active' : ''}`} onClick={() => handleSwitch(t.id)}>
                <div className="switcher-item-info">
                  <span className="switcher-item-sport">{t.sport === 'golf' ? 'GOLF' : t.sport === 'basketball' ? 'NCAAB' : t.sport.toUpperCase()}</span>
                  <span className="switcher-item-name">{t.label}</span>
                </div>
                <div className="switcher-item-actions">
                  {t.id === activeTournamentId && <span className="switcher-check">{'\u2713'}</span>}
                  {t.isDraft && (
                    <button className="switcher-delete" onClick={(e) => handleDelete(e, t.id)}>
                      {confirmDelete === t.id ? 'Confirm?' : '\u00D7'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TournamentSwitcher;
