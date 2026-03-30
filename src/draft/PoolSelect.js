import React, { useState, useEffect } from 'react';
import { listDrafts } from '../firebase';

function PoolSelect({ onSelectPool, onCreateNew, onBack }) {
  const [poolCode, setPoolCode] = useState('');
  const [recentDrafts, setRecentDrafts] = useState([]);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem('jerseyBetRecentDrafts') || '[]');
      setRecentDrafts(recent);
    } catch {}
  }, []);

  const handleJoin = async () => {
    if (!poolCode.trim()) { setError('Enter a pool code'); return; }
    setError('');
    setChecking(true);
    try {
      const drafts = await listDrafts();
      const draftId = poolCode.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (drafts[draftId]) {
        const recent = JSON.parse(localStorage.getItem('jerseyBetRecentDrafts') || '[]');
        if (!recent.find(r => r.id === draftId)) {
          recent.unshift({ id: draftId, name: drafts[draftId].config?.name || draftId, joinedAt: Date.now() });
          localStorage.setItem('jerseyBetRecentDrafts', JSON.stringify(recent.slice(0, 10)));
        }
        onSelectPool(draftId);
      } else {
        setError('Pool not found. Check the code and try again.');
      }
    } catch (err) {
      setError('Error connecting: ' + err.message);
    }
    setChecking(false);
  };

  const deleteRecent = (e, draftId) => {
    e.stopPropagation();
    const updated = recentDrafts.filter(d => d.id !== draftId);
    setRecentDrafts(updated);
    localStorage.setItem('jerseyBetRecentDrafts', JSON.stringify(updated));
  };

  return (
    <div className="pool-select">
      <div className="pool-select-card">
        <img src="/logo.png" alt="Jersey Bets" style={{ width: 60, height: 60, marginBottom: 4 }} />
        <h2>DraftPlay</h2>
        <p className="draft-subtitle">Join a draft pool or create a new one</p>

        <div className="pool-join-section">
          <div className="draft-field">
            <label>Pool Code</label>
            <div className="pool-code-row">
              <input
                type="text"
                placeholder="Enter pool code..."
                value={poolCode}
                onChange={e => setPoolCode(e.target.value)}
                className="draft-input"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button className="draft-submit-btn pool-join-btn" onClick={handleJoin} disabled={checking}>
                {checking ? '...' : 'Join'}
              </button>
            </div>
          </div>
          {error && <div className="draft-error">{error}</div>}
        </div>

        <div className="pool-divider">
          <span>or</span>
        </div>

        <button className="pool-create-btn" onClick={onCreateNew}>
          + Create New Draft Pool
        </button>

        {recentDrafts.length > 0 && (
          <div className="pool-recent">
            <div className="pool-recent-title">Recent Pools</div>
            {recentDrafts.map(draft => (
              <div key={draft.id} className="pool-recent-btn" onClick={() => onSelectPool(draft.id)}>
                <span className="pool-recent-name">{draft.name || draft.id}</span>
                <div className="pool-recent-actions">
                  <span className="pool-recent-arrow">{'\u203A'}</span>
                  <button className="pool-recent-delete" onClick={(e) => deleteRecent(e, draft.id)} title="Remove from recents">{'\u00D7'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onBack && (
          <button className="draft-back-link" onClick={onBack}>Back to Tournament</button>
        )}
      </div>
    </div>
  );
}

export default PoolSelect;
