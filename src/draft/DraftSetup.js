import React, { useState } from 'react';
import { createDraft } from '../firebase';
import { getTemplates, getTemplate, getSuggestedRosterSize, applyTheme } from './draftTemplates';

function DraftSetup({ onDraftCreated }) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('snake');
  const [rosterSize, setRosterSize] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [ownerCount, setOwnerCount] = useState(4);
  const [playersText, setPlayersText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdPoolCode, setCreatedPoolCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const templates = getTemplates();
  const defaultColors = ['#22d3ee', '#a855f7', '#f97316', '#f43f5e', '#22c55e', '#eab308', '#3b82f6', '#ec4899'];

  // Step 0: Template selection
  const handleSelectTemplate = (templateId) => {
    const template = getTemplate(templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setDraftName(template.name);
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

  // Step 1: Basic config → next goes to player entry (custom) or confirm (template)
  const handleStep1 = () => {
    if (!draftName.trim()) { setError('Enter a draft name'); return; }
    setError('');
    if (selectedTemplate) {
      // Don't override rosterSize here — user may have changed it manually
      setStep(3); // skip to confirm
    } else {
      setStep(2); // player entry for custom
    }
  };

  // Step 2: Player pool (custom only)
  const handleStep2 = () => {
    const players = playersText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (players.length < ownerCount * rosterSize) {
      setError(`Need at least ${ownerCount * rosterSize} players. You have ${players.length}.`);
      return;
    }
    setError('');
    setStep(3);
  };

  // Step 3: Create the draft
  const handleCreate = async () => {
    const players = playersText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (players.length < ownerCount * rosterSize) {
      setError(`Need at least ${ownerCount * rosterSize} players. You have ${players.length}.`);
      return;
    }
    setCreating(true);
    setError('');

    try {
      // Simple 6-char code: easy to type, easy to share
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0 to avoid confusion
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const draftId = code;

      // Create empty owner slots — people claim them when they join
      const ownersMap = {};
      for (let i = 0; i < ownerCount; i++) {
        const slotId = `slot_${i + 1}`;
        ownersMap[slotId] = {
          name: '',
          pin: '',
          color: defaultColors[i % defaultColors.length],
          initials: '',
          teams: [],
          online: false,
          claimed: false
        };
      }

      const template = selectedTemplate ? getTemplate(selectedTemplate) : null;

      // Build player metadata map
      const playerData = {};
      if (template) {
        template.players.forEach(p => {
          if (typeof p === 'object') {
            const sanitizedName = p.name.replace(/\./g, '_');
            playerData[sanitizedName] = { name: p.name, country: p.country, owgr: p.owgr, ...(p.espnId ? { espnId: p.espnId } : {}) };
          }
        });
      }

      await createDraft(draftId, {
        config: {
          name: draftName,
          type: draftType,
          rosterSize,
          timerSeconds,
          ownerSlots: ownerCount,
          commissioner: null, // First person to join becomes commissioner
          draftOrder: [], // Set when all slots are claimed
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

      setCreatedPoolCode(draftId);
      setStep(4); // Show share screen
    } catch (err) {
      setError('Error creating draft: ' + err.message);
      setCreating(false);
    }
  };

  const shareText = `Join my draft pool!\nhttps://jerseybet.onrender.com\n\nPool Code: ${createdPoolCode}\n\nOpen the link above, tap More → Draft Room, and enter the pool code to join.`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const playerCount = playersText.split('\n').filter(p => p.trim()).length;

  const stepLabels = selectedTemplate
    ? ['Event', 'Setup', 'Confirm']
    : ['Event', 'Setup', 'Players', 'Confirm'];

  return (
    <div className="draft-setup">
      <div className="draft-setup-card">
        {step < 4 && (
          <div className="draft-setup-steps">
            {stepLabels.map((label, i) => (
              <div key={i} className={`draft-step ${step >= (i === 0 ? 0 : i === 1 ? 1 : selectedTemplate ? i + 1 : i) ? 'active' : ''}`}>{i + 1}. {label}</div>
            ))}
          </div>
        )}

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
                <label>Number of Slots</label>
                <select value={ownerCount} onChange={e => {
                  const count = Number(e.target.value);
                  setOwnerCount(count);
                  if (selectedTemplate) setRosterSize(getSuggestedRosterSize(selectedTemplate, count));
                }} className="draft-select">
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} players</option>)}
                </select>
              </div>
              <div className="draft-field">
                <label>Picks Per Player</label>
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
              <button className="draft-submit-btn" onClick={handleStep1}>
                {selectedTemplate ? 'Create Pool' : 'Next: Add Players'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Player pool (custom only) */}
        {step === 2 && !selectedTemplate && (
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
              <button className="draft-logout-btn" onClick={() => setStep(1)}>Back</button>
              <button className="draft-submit-btn" onClick={handleStep2}>Create Pool</button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm + Creating */}
        {step === 3 && !createdPoolCode && (
          <div className="draft-setup-section">
            <h2>Confirm Draft</h2>
            <div className="confirm-summary">
              <div className="confirm-row"><span className="confirm-label">Event</span><span className="confirm-value">{draftName}</span></div>
              <div className="confirm-row"><span className="confirm-label">Type</span><span className="confirm-value">{draftType === 'snake' ? 'Snake Draft' : draftType === 'auction' ? 'Auction Draft' : 'Upload Draft'}</span></div>
              <div className="confirm-row"><span className="confirm-label">Slots</span><span className="confirm-value">{ownerCount} players</span></div>
              <div className="confirm-row"><span className="confirm-label">Picks/Player</span><span className="confirm-value">{rosterSize}</span></div>
              <div className="confirm-row"><span className="confirm-label">Player Pool</span><span className="confirm-value">{playerCount} available</span></div>
              {draftType === 'snake' && <div className="confirm-row"><span className="confirm-label">Timer</span><span className="confirm-value">{timerSeconds}s per pick</span></div>}
            </div>
            {error && <div className="draft-error">{error}</div>}
            <div className="draft-setup-nav">
              <button className="draft-logout-btn" onClick={() => selectedTemplate ? setStep(1) : setStep(2)}>Back</button>
              <button className="draft-submit-btn" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Draft Pool'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Pool Created — Share Screen */}
        {step === 4 && createdPoolCode && (
          <div className="draft-setup-section pool-created">
            <div className="pool-created-icon">&#x2713;</div>
            <h2>Pool Created</h2>
            <p className="draft-subtitle">Share the code below with your group</p>

            <div className="pool-code-display" onClick={handleCopy}>
              <div className="pool-code-label">POOL CODE</div>
              <div className="pool-code-value">{createdPoolCode}</div>
              <div className="pool-code-hint">{copied ? 'Copied!' : 'Tap to copy'}</div>
            </div>

            <div className="pool-share-actions">
              <button className="draft-submit-btn" onClick={handleShare}>
                Share Invite
              </button>
              <button className="draft-submit-btn pool-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Invite Text'}
              </button>
            </div>

            <div className="pool-share-note">
              Once they open the link, tap <strong>More → Draft Room</strong> and enter the pool code to join.
            </div>

            <button className="draft-submit-btn" onClick={() => onDraftCreated(createdPoolCode)} style={{ marginTop: 16 }}>
              Enter Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DraftSetup;
