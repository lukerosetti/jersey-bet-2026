import React, { useState } from 'react';
import { useDraft } from './DraftContext';

function DraftPinLogin() {
  const { draftState, login } = useDraft();
  const [selectedOwner, setSelectedOwner] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const owners = draftState?.owners || {};
  const ownerList = Object.entries(owners).map(([id, data]) => ({ id, ...data }));

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!selectedOwner) { setError('Select your name'); return; }
    if (!pin) { setError('Enter your PIN'); return; }
    const result = login(selectedOwner, pin);
    if (!result.success) setError(result.error);
  };

  return (
    <div className="draft-login">
      <div className="draft-login-card">
        <div className="draft-logo">
          <img src="/logo.png" alt="Jersey Bets" style={{ width: 60, height: 60 }} />
        </div>
        <h2>Join Draft</h2>
        <p className="draft-subtitle">{draftState?.config?.name || 'Draft Pool'}</p>
        <form onSubmit={handleLogin}>
          <div className="draft-field">
            <label>Who are you?</label>
            <div className="draft-owner-grid">
              {ownerList.map(owner => (
                <button
                  key={owner.id}
                  type="button"
                  className={`draft-owner-btn ${selectedOwner === owner.id ? 'selected' : ''}`}
                  style={{
                    borderColor: selectedOwner === owner.id ? owner.color : 'var(--border)',
                    background: selectedOwner === owner.id ? `${owner.color}22` : 'var(--card)'
                  }}
                  onClick={() => setSelectedOwner(owner.id)}
                >
                  <span className="draft-owner-dot" style={{ background: owner.color }}></span>
                  {owner.name}
                </button>
              ))}
            </div>
          </div>
          <div className="draft-field">
            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter your PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="draft-pin-input"
              autoFocus
            />
          </div>
          {error && <div className="draft-error">{error}</div>}
          <button type="submit" className="draft-submit-btn">Enter Draft</button>
        </form>
      </div>
    </div>
  );
}

export default DraftPinLogin;
