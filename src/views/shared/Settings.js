import React from 'react';
import { owners, scoringSystem } from '../../data/bracketData';

function Settings({ currentUser, setCurrentUser, customizations, setCustomizations }) {
  const colorOptions = ['#22d3ee', '#a78bfa', '#fb923c', '#f472b6', '#4ade80', '#facc15', '#f87171', '#38bdf8'];

  const handleColorChange = (color) => {
    const newCustomizations = { ...customizations, [currentUser.id]: { ...customizations[currentUser.id], color } };
    setCustomizations(newCustomizations);
    localStorage.setItem('jerseyBetCustomizations', JSON.stringify(newCustomizations));
  };

  const handleInitialsChange = (initials) => {
    const newCustomizations = { ...customizations, [currentUser.id]: { ...customizations[currentUser.id], initials: initials.slice(0, 2).toUpperCase() } };
    setCustomizations(newCustomizations);
    localStorage.setItem('jerseyBetCustomizations', JSON.stringify(newCustomizations));
  };

  const userColor = customizations[currentUser.id]?.color || currentUser.color;
  const userInitials = customizations[currentUser.id]?.initials || currentUser.initials;

  return (
    <div className="settings-modal">
      <div className="settings-section">
        <h3 className="settings-section-title">Who are you?</h3>
        <div className="user-selector">
          {owners.map(owner => {
            const ownerColor = customizations[owner.id]?.color || owner.color;
            const ownerInitials = customizations[owner.id]?.initials || owner.initials;
            return (
              <button key={owner.id} className={`user-option ${currentUser.id === owner.id ? 'selected' : ''}`} onClick={() => setCurrentUser(owner)}>
                <div className="user-option-avatar" style={{ background: ownerColor }}>{ownerInitials}</div>
                <span className="user-option-name">{owner.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Customize Your Profile</h3>
        <div className="customize-row">
          <label className="customize-label">Your Color</label>
          <div className="color-picker">
            {colorOptions.map(color => (
              <button key={color} className={`color-option ${userColor === color ? 'selected' : ''}`} style={{ background: color }} onClick={() => handleColorChange(color)} />
            ))}
          </div>
        </div>
        <div className="customize-row">
          <label className="customize-label">Your Initials</label>
          <input type="text" className="initials-input" value={userInitials} onChange={e => handleInitialsChange(e.target.value)} maxLength={2} placeholder="LK" />
        </div>
        <div className="customize-preview">
          <span className="customize-preview-label">Preview:</span>
          <div className="user-avatar-preview" style={{ background: userColor }}>{userInitials}</div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Your Teams ({currentUser.teams.length})</h3>
        <div className="teams-list">{currentUser.teams.map(team => (<span key={team} className="team-tag">{team}</span>))}</div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Scoring</h3>
        <div className="scoring-grid">{Object.entries(scoringSystem.rounds).map(([round, points]) => (<div key={round} className="scoring-item"><div className="scoring-round">{scoringSystem.roundNames[round]}</div><div className="scoring-points">{points}</div></div>))}</div>
        <div className="scoring-multipliers">Seed multipliers: 1-4 (1x) · 5-8 (1.5x) · 9-13 (1.75x) · 14-16 (2x)</div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Data</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>Clear cached game data to force a fresh pull from ESPN. Your settings and customizations will be kept.</p>
        <button className="clear-cache-btn" onClick={() => { localStorage.removeItem('jerseyBetGames'); localStorage.removeItem('jerseyBetPlayInWinners'); window.location.reload(); }} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Clear Game Cache & Reload</button>
      </div>
    </div>
  );
}

export default Settings;
