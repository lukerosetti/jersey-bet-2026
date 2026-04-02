import React from 'react';
import { owners } from '../../data/bracketData';

function ProfileSelect({ onSelect }) {
  const handleSelect = (owner) => {
    localStorage.setItem('jerseyBetProfile', JSON.stringify({ id: owner.id, name: owner.name }));
    onSelect(owner);
  };

  return (
    <div className="profile-select">
      <div className="profile-select-card">
        <img src="/logo.png" alt="Jersey Bets" className="profile-logo" />
        <h1 className="profile-title">Jersey Bets</h1>
        <p className="profile-subtitle">Who are you?</p>
        <div className="profile-grid">
          {owners.map(owner => (
            <button
              key={owner.id}
              className="profile-btn"
              onClick={() => handleSelect(owner)}
            >
              <span className="profile-avatar" style={{ background: owner.color }}>{owner.initials}</span>
              <span className="profile-name">{owner.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProfileSelect;
