import React, { useState } from 'react';
import { useDraft } from './DraftContext';

function DraftPinLogin() {
  const { draftState, login, claimSlot } = useDraft();
  const [name, setName] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('select'); // 'select' or 'claim'

  const owners = draftState?.owners || {};
  const ownerList = Object.entries(owners).map(([id, data]) => ({ id, ...data }));
  const claimedOwners = ownerList.filter(o => o.claimed || o.name);
  const openSlots = ownerList.filter(o => !o.claimed && !o.name);

  // If all slots are claimed, show the normal owner select
  const handleSelectOwner = (ownerId) => {
    setSelectedOwner(ownerId);
    setError('');
    const owner = owners[ownerId];
    if (owner?.pin) {
      setMode('pin');
    } else {
      const result = login(ownerId, '');
      if (!result.success) setError(result.error);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (!pin) { setError('Enter your PIN'); return; }
    const result = login(selectedOwner, pin);
    if (!result.success) setError(result.error);
  };

  const handleClaimSlot = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    setError('');
    if (openSlots.length === 0) { setError('No open slots available'); return; }
    const slotId = openSlots[0].id;
    try {
      await claimSlot(slotId, name.trim());
    } catch (err) {
      setError('Error claiming slot: ' + err.message);
    }
  };

  return (
    <div className="draft-login">
      <div className="draft-login-card">
        <div className="draft-logo">
          <img src="/logo.png" alt="Jersey Bets" style={{ width: 60, height: 60 }} />
        </div>
        <h2>Join Draft</h2>
        <p className="draft-subtitle">{draftState?.config?.name || 'Draft Pool'}</p>

        {mode === 'pin' ? (
          <form onSubmit={handlePinSubmit}>
            <div className="draft-selected-owner">
              <span className="draft-owner-dot" style={{ background: owners[selectedOwner]?.color }}></span>
              <span>{owners[selectedOwner]?.name}</span>
              <button type="button" className="draft-change-owner" onClick={() => { setMode('select'); setSelectedOwner(''); }}>Change</button>
            </div>
            <div className="draft-field">
              <label>Enter PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} className="draft-pin-input" autoFocus />
            </div>
            {error && <div className="draft-error">{error}</div>}
            <button type="submit" className="draft-submit-btn">Enter Draft</button>
          </form>
        ) : (
          <>
            {/* Claimed owners — tap to log in */}
            {claimedOwners.length > 0 && (
              <div className="draft-field">
                <label>Returning? Tap your name</label>
                <div className="draft-owner-grid">
                  {claimedOwners.map(owner => (
                    <button
                      key={owner.id}
                      type="button"
                      className="draft-owner-btn"
                      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                      onClick={() => handleSelectOwner(owner.id)}
                    >
                      <span className="draft-owner-dot" style={{ background: owner.color }}></span>
                      <span>{owner.name}</span>
                      {owner.online && <span className="draft-owner-online-dot"></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Open slots — enter name to claim */}
            {openSlots.length > 0 && (
              <div className="draft-field" style={{ marginTop: claimedOwners.length > 0 ? 16 : 0 }}>
                {claimedOwners.length > 0 && <div className="draft-divider"><span>or</span></div>}
                <label>New here? Claim a spot ({openSlots.length} open)</label>
                <div className="draft-claim-row">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleClaimSlot()}
                    className="draft-input"
                    maxLength={20}
                  />
                  <button className="draft-submit-btn" onClick={handleClaimSlot} disabled={!name.trim()}>Join</button>
                </div>
              </div>
            )}

            {openSlots.length === 0 && claimedOwners.length === 0 && (
              <p className="draft-subtitle">No slots available in this draft.</p>
            )}

            {error && <div className="draft-error">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default DraftPinLogin;
