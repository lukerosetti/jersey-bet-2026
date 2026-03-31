import React, { useState } from 'react';
import { createDraft } from '../firebase';
import { getTemplates, getTemplate, getSuggestedRosterSize, applyTheme } from './draftTemplates';

function DraftSetup({ onDraftCreated }) {
  const [step, setStep] = useState(0); // 0 = template select
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('snake');
  const [rosterSize, setRosterSize] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [ownerCount, setOwnerCount] = useState(4);
  const [owners, setOwners] = useState([]);
  const [playersText, setPlayersText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const templates = getTemplates();

  // Step 0: Template selection
  const handleSelectTemplate = (templateId) => {
    const template = getTemplate(templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setDraftName(template.name);
      // Players can be strings or objects with { name, country, owgr }
      const playerNames = template.players.map(p => typeof p === 'string' ? p : p.name);
      setPlayersText(playerNames.join('\n'));
      setRosterSize(getSuggestedRosterSize(templateId, ownerCount));
      setTimerSeconds(template.defaultTimer || 120);
      applyTheme(templateId);
    }
    setStep(1);
  };

  const handleCustomDraft = () => {
    setSelectedTemplate(null);
    setDraftName('');
    setPlayersText('');
    setStep(1);
  };

  // Step 1: Basic config
  const handleStep1 = () => {
    if (!draftName.trim()) { setError('Enter a draft name'); return; }
    setError('');
    const slots = [];
    for (let i = 0; i < ownerCount; i++) {
      slots.push({ id: '', name: '', pin: '', color: '', initials: '' });
    }
    setOwners(slots);
    // Update roster size suggestion when owner count changes with a template
    if (selectedTemplate) {
      setRosterSize(getSuggestedRosterSize(selectedTemplate, ownerCount));
    }
    setStep(2);
  };

  // Step 2: Owner details
  const updateOwner = (idx, field, value) => {
    setOwners(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
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
    // If template was selected, skip player entry (step 3) and go to confirmation
    if (selectedTemplate) {
      setStep(4); // confirmation step
    } else {
      setStep(3);
    }
  };

  // Step 3: Player pool (only for custom drafts)
  const handleStep3 = () => {
    const players = playersText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (players.length < ownerCount * rosterSize) {
      setError(`Need at least ${ownerCount * rosterSize} players. You have ${players.length}.`);
      return;
    }
    setError('');
    setStep(4);
  };

  // Step 4: Create the draft
  const handleCreate = async () => {
    const players = playersText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (players.length < ownerCount * rosterSize) {
      setError(`Need at least ${ownerCount * rosterSize} players. You have ${players.length}.`);
      return;
    }
    setCreating(true);
    setError('');

    try {
      // Generate unique pool code: short name prefix + random 4-char suffix
      const prefix = draftName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 12);
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const draftId = `${prefix}-${suffix}`;
      const ownersMap = {};
      const draftOrder = [];
      owners.forEach((o, idx) => {
        ownersMap[o.id] = {
          name: o.name,
          pin: o.pin,
          color: o.color || defaultColors[idx % defaultColors.length],
          initials: o.initials,
          teams: [],
          online: false
        };
        draftOrder.push(o.id);
      });

      const template = selectedTemplate ? getTemplate(selectedTemplate) : null;

      // Build player metadata map for flags/rankings in draft board
      const playerData = {};
      if (template) {
        template.players.forEach(p => {
          if (typeof p === 'object') {
            playerData[p.name] = { country: p.country, owgr: p.owgr, ...(p.espnId ? { espnId: p.espnId } : {}) };
          }
        });
      }

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
          templateId: selectedTemplate || null,
          sport: template?.sport || 'custom',
          espnEventId: template?.espnEventId || null,
          createdAt: Date.now()
        },
        owners: ownersMap,
        availablePlayers: players,
        playerData: Object.keys(playerData).length > 0 ? playerData : null
      });

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
  const playerCount = playersText.split('\n').filter(p => p.trim()).length;

  const stepLabels = selectedTemplate
    ? ['Event', 'Setup', 'Owners', 'Confirm']
    : ['Event', 'Setup', 'Owners', 'Players', 'Confirm'];

  return (
    <div className="draft-setup">
      <div className="draft-setup-card">
        <div className="draft-setup-steps">
          {stepLabels.map((label, i) => (
            <div key={i} className={`draft-step ${step >= i ? 'active' : ''}`}>{i + 1}. {label}</div>
          ))}
        </div>

        {/* Step 0: Template Selection */}
        {step === 0 && (
          <div className="draft-setup-section">
            <h2>Select Event</h2>
            <p className="draft-subtitle">Choose a tournament or create a custom draft pool</p>
            <div className="template-grid">
              {templates.map(t => (
                <button key={t.id} className="template-card" onClick={() => handleSelectTemplate(t.id)}>
                  <div className="template-badge">{t.sport === 'golf' ? 'GOLF' : t.sport.toUpperCase()}</div>
                  <div className="template-info">
                    <div className="template-name">{t.name}</div>
                    <div className="template-desc">{t.description}</div>
                    <div className="template-players">{t.playerCount} players in field</div>
                  </div>
                  <span className="template-arrow">&#8250;</span>
                </button>
              ))}
              <button className="template-card custom" onClick={handleCustomDraft}>
                <div className="template-badge custom-badge">CUSTOM</div>
                <div className="template-info">
                  <div className="template-name">Custom Draft</div>
                  <div className="template-desc">Enter your own player list</div>
                </div>
                <span className="template-arrow">&#8594;</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Basic config */}
        {step === 1 && (
          <div className="draft-setup-section">
            <h2>Draft Settings</h2>
            {selectedTemplate && (
              <div className="template-selected-badge">
                <span>{getTemplate(selectedTemplate)?.icon}</span>
                <span>{getTemplate(selectedTemplate)?.name}</span>
                <span className="template-players-badge">{playerCount} players</span>
              </div>
            )}
            <div className="draft-field">
              <label>Pool Name</label>
              <input type="text" placeholder="e.g. Masters 2026 - Luke's Crew" value={draftName} onChange={e => setDraftName(e.target.value)} className="draft-input" />
            </div>
            <div className="draft-field">
              <label>Draft Type</label>
              <div className="draft-type-grid">
                <button className={`draft-type-btn ${draftType === 'snake' ? 'selected' : ''}`} onClick={() => setDraftType('snake')}>
                  <div><span className="draft-type-label">Snake Draft</span><span className="draft-type-desc">Take turns picking, order reverses each round</span></div>
                </button>
                <button className={`draft-type-btn ${draftType === 'auction' ? 'selected' : ''}`} onClick={() => setDraftType('auction')}>
                  <div><span className="draft-type-label">Auction Draft</span><span className="draft-type-desc">Bid on players with a budget</span></div>
                </button>
                <button className={`draft-type-btn ${draftType === 'upload' ? 'selected' : ''}`} onClick={() => setDraftType('upload')}>
                  <div><span className="draft-type-label">Upload / Manual</span><span className="draft-type-desc">Commissioner assigns players manually</span></div>
                </button>
              </div>
            </div>
            <div className="draft-field-row">
              <div className="draft-field">
                <label>Number of Owners</label>
                <select value={ownerCount} onChange={e => {
                  const count = Number(e.target.value);
                  setOwnerCount(count);
                  if (selectedTemplate) setRosterSize(getSuggestedRosterSize(selectedTemplate, count));
                }} className="draft-select">
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} owners</option>)}
                </select>
              </div>
              <div className="draft-field">
                <label>Picks Per Owner</label>
                <select value={rosterSize} onChange={e => setRosterSize(Number(e.target.value))} className="draft-select">
                  {[3,4,5,6,7,8,10,12,15,20].map(n => <option key={n} value={n}>{n} picks</option>)}
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
            <div className="draft-setup-nav">
              <button className="draft-logout-btn" onClick={() => setStep(0)}>Back</button>
              <button className="draft-submit-btn" onClick={handleStep1}>Next: Add Owners</button>
            </div>
          </div>
        )}

        {/* Step 2: Owner details */}
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
              <button className="draft-submit-btn" onClick={handleStep2}>
                {selectedTemplate ? 'Next: Confirm' : 'Next: Add Players'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Player pool (custom only) */}
        {step === 3 && !selectedTemplate && (
          <div className="draft-setup-section">
            <h2>Player Pool</h2>
            <p className="draft-subtitle">Paste the list of available players, one per line. Rank them best to worst (used for auto-pick).</p>
            <div className="draft-field">
              <label>Players ({playerCount} entered, need at least {ownerCount * rosterSize})</label>
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
              <button className="draft-submit-btn" onClick={handleStep3}>Next: Confirm</button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="draft-setup-section">
            <h2>Confirm Draft</h2>
            <div className="confirm-summary">
              <div className="confirm-row"><span className="confirm-label">Event</span><span className="confirm-value">{draftName}</span></div>
              <div className="confirm-row"><span className="confirm-label">Type</span><span className="confirm-value">{draftType === 'snake' ? 'Snake Draft' : draftType === 'auction' ? 'Auction Draft' : 'Upload Draft'}</span></div>
              <div className="confirm-row"><span className="confirm-label">Owners</span><span className="confirm-value">{owners.map(o => o.name).join(', ')}</span></div>
              <div className="confirm-row"><span className="confirm-label">Picks/Owner</span><span className="confirm-value">{rosterSize}</span></div>
              <div className="confirm-row"><span className="confirm-label">Player Pool</span><span className="confirm-value">{playerCount} players</span></div>
              {draftType === 'snake' && <div className="confirm-row"><span className="confirm-label">Timer</span><span className="confirm-value">{timerSeconds}s per pick</span></div>}
              <div className="confirm-row"><span className="confirm-label">Commissioner</span><span className="confirm-value">{owners[0]?.name || '?'}</span></div>
            </div>
            {error && <div className="draft-error">{error}</div>}
            <div className="draft-setup-nav">
              <button className="draft-logout-btn" onClick={() => selectedTemplate ? setStep(2) : setStep(3)}>Back</button>
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
