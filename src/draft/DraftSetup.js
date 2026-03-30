import React, { useState } from 'react';
import { createDraft } from '../firebase';

function DraftSetup({ onDraftCreated }) {
  const [step, setStep] = useState(1);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('snake');
  const [rosterSize, setRosterSize] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [ownerCount, setOwnerCount] = useState(4);
  const [owners, setOwners] = useState([]);
  const [playersText, setPlayersText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic config
  const handleStep1 = () => {
    if (!draftName.trim()) { setError('Enter a draft name'); return; }
    setError('');
    // Initialize owner slots
    const slots = [];
    for (let i = 0; i < ownerCount; i++) {
      slots.push({ id: '', name: '', pin: '', color: '', initials: '' });
    }
    setOwners(slots);
    setStep(2);
  };

  // Step 2: Owner details
  const updateOwner = (idx, field, value) => {
    setOwners(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-generate id and initials from name
      if (field === 'name') {
        updated[idx].id = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        updated[idx].initials = value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      }
      return updated;
    });
  };

  const handleStep2 = () => {
    const incomplete = owners.filter(o => !o.name.trim() || !o.pin.trim());
    if (incomplete.length > 0) { setError('All owners need a name and PIN'); return; }
    const duplicateIds = owners.filter((o, i) => owners.findIndex(x => x.id === o.id) !== i);
    if (duplicateIds.length > 0) { setError('Owner names must be unique'); return; }
    setError('');
    setStep(3);
  };

  // Step 3: Player pool
  const handleCreate = async () => {
    const players = playersText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (players.length < ownerCount * rosterSize) {
      setError(`Need at least ${ownerCount * rosterSize} players (${ownerCount} owners × ${rosterSize} picks). You have ${players.length}.`);
      return;
    }
    setError('');
    setCreating(true);

    try {
      const draftId = draftName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const ownersMap = {};
      const draftOrder = [];
      owners.forEach(o => {
        ownersMap[o.id] = {
          name: o.name,
          pin: o.pin,
          color: o.color || defaultColors[owners.indexOf(o) % defaultColors.length],
          initials: o.initials,
          teams: [],
          online: false
        };
        draftOrder.push(o.id);
      });

      await createDraft(draftId, {
        config: {
          name: draftName,
          type: draftType,
          rosterSize,
          timerSeconds,
          commissioner: draftOrder[0],
          draftOrder,
          status: 'waiting',
          tournamentId: draftId,
          createdAt: Date.now()
        },
        owners: ownersMap,
        availablePlayers: players
      });

      // Save draft ID to localStorage for quick rejoin
      const recentDrafts = JSON.parse(localStorage.getItem('jerseyBetRecentDrafts') || '[]');
      recentDrafts.unshift({ id: draftId, name: draftName, createdAt: Date.now() });
      localStorage.setItem('jerseyBetRecentDrafts', JSON.stringify(recentDrafts.slice(0, 10)));

      onDraftCreated(draftId);
    } catch (err) {
      setError('Error creating draft: ' + err.message);
      setCreating(false);
    }
  };

  const defaultColors = ['#22d3ee', '#a855f7', '#f97316', '#f43f5e', '#22c55e', '#eab308', '#3b82f6', '#ec4899'];

  return (
    <div className="draft-setup">
      <div className="draft-setup-card">
        <div className="draft-setup-steps">
          <div className={`draft-step ${step >= 1 ? 'active' : ''}`}>1. Setup</div>
          <div className={`draft-step ${step >= 2 ? 'active' : ''}`}>2. Owners</div>
          <div className={`draft-step ${step >= 3 ? 'active' : ''}`}>3. Players</div>
        </div>

        {step === 1 && (
          <div className="draft-setup-section">
            <h2>Create a Draft Pool</h2>
            <div className="draft-field">
              <label>Pool Name</label>
              <input type="text" placeholder="e.g. Masters 2026 - Luke's Crew" value={draftName} onChange={e => setDraftName(e.target.value)} className="draft-input" />
            </div>
            <div className="draft-field">
              <label>Draft Type</label>
              <div className="draft-type-grid">
                <button className={`draft-type-btn ${draftType === 'snake' ? 'selected' : ''}`} onClick={() => setDraftType('snake')}>
                  <span className="draft-type-icon">&#128013;</span>
                  <span className="draft-type-label">Snake Draft</span>
                  <span className="draft-type-desc">Take turns, order reverses each round</span>
                </button>
                <button className={`draft-type-btn ${draftType === 'auction' ? 'selected' : ''}`} onClick={() => setDraftType('auction')}>
                  <span className="draft-type-icon">&#128176;</span>
                  <span className="draft-type-label">Auction Draft</span>
                  <span className="draft-type-desc">Bid on players with a budget</span>
                </button>
                <button className={`draft-type-btn ${draftType === 'upload' ? 'selected' : ''}`} onClick={() => setDraftType('upload')}>
                  <span className="draft-type-icon">&#128203;</span>
                  <span className="draft-type-label">Upload Draft</span>
                  <span className="draft-type-desc">Commissioner assigns players manually</span>
                </button>
              </div>
            </div>
            <div className="draft-field-row">
              <div className="draft-field">
                <label>Number of Owners</label>
                <select value={ownerCount} onChange={e => setOwnerCount(Number(e.target.value))} className="draft-select">
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} owners</option>)}
                </select>
              </div>
              <div className="draft-field">
                <label>Picks Per Owner</label>
                <select value={rosterSize} onChange={e => setRosterSize(Number(e.target.value))} className="draft-select">
                  {[3,4,5,6,7,8,10,12,15].map(n => <option key={n} value={n}>{n} picks</option>)}
                </select>
              </div>
            </div>
            {draftType === 'snake' && (
              <div className="draft-field">
                <label>Timer Per Pick</label>
                <select value={timerSeconds} onChange={e => setTimerSeconds(Number(e.target.value))} className="draft-select">
                  <option value={60}>1 minute</option>
                  <option value={90}>1.5 minutes</option>
                  <option value={120}>2 minutes</option>
                  <option value={180}>3 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            )}
            {error && <div className="draft-error">{error}</div>}
            <button className="draft-submit-btn" onClick={handleStep1}>Next: Add Owners</button>
          </div>
        )}

        {step === 2 && (
          <div className="draft-setup-section">
            <h2>Add Owners</h2>
            <p className="draft-subtitle">Set a name and PIN for each owner. The first owner is the commissioner.</p>
            <div className="draft-owners-form">
              {owners.map((owner, idx) => (
                <div key={idx} className="draft-owner-form-row">
                  <div className="draft-owner-num">{idx + 1}{idx === 0 && <span className="lobby-comm-badge">Comm</span>}</div>
                  <input type="text" placeholder="Name" value={owner.name} onChange={e => updateOwner(idx, 'name', e.target.value)} className="draft-input draft-input-sm" />
                  <input type="text" placeholder="PIN" maxLength={6} value={owner.pin} onChange={e => updateOwner(idx, 'pin', e.target.value)} className="draft-input draft-input-pin" />
                  <input type="color" value={owner.color || defaultColors[idx % defaultColors.length]} onChange={e => updateOwner(idx, 'color', e.target.value)} className="draft-color-pick" />
                </div>
              ))}
            </div>
            {error && <div className="draft-error">{error}</div>}
            <div className="draft-setup-nav">
              <button className="draft-logout-btn" onClick={() => setStep(1)}>Back</button>
              <button className="draft-submit-btn" onClick={handleStep2}>Next: Add Players</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="draft-setup-section">
            <h2>Player Pool</h2>
            <p className="draft-subtitle">Paste the list of available players, one per line. Rank them best to worst (used for auto-pick).</p>
            <div className="draft-field">
              <label>Players ({playersText.split('\n').filter(p => p.trim()).length} entered, need at least {ownerCount * rosterSize})</label>
              <textarea
                className="draft-textarea"
                rows={15}
                placeholder={"Scottie Scheffler\nXander Schauffele\nRory McIlroy\nJon Rahm\n..."}
                value={playersText}
                onChange={e => setPlayersText(e.target.value)}
              />
            </div>
            {error && <div className="draft-error">{error}</div>}
            <div className="draft-setup-nav">
              <button className="draft-logout-btn" onClick={() => setStep(2)}>Back</button>
              <button className="draft-submit-btn" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Draft Pool'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DraftSetup;
