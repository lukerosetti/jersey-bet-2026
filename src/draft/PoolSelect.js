import React, { useState, useEffect } from 'react';
import { listDrafts } from '../firebase';
// getDraftExists imported dynamically in handleJoin

// localStorage key for saved pools
const POOLS_KEY = 'jerseyBetMyPools';

// Load saved pools from localStorage
export function getMyPools() {
  try { return JSON.parse(localStorage.getItem(POOLS_KEY) || '[]'); }
  catch { return []; }
}

// Save a pool entry after joining
export function saveMyPool(poolId, data) {
  const pools = getMyPools();
  const existing = pools.findIndex(p => p.id === poolId);
  const entry = {
    id: poolId,
    name: data.name || poolId,
    ownerId: data.ownerId || '',
    ownerName: data.ownerName || '',
    templateId: data.templateId || '',
    sport: data.sport || '',
    joinedAt: data.joinedAt || Date.now(),
    lastVisited: Date.now()
  };
  if (existing >= 0) {
    pools[existing] = { ...pools[existing], ...entry, lastVisited: Date.now() };
  } else {
    pools.unshift(entry);
  }
  localStorage.setItem(POOLS_KEY, JSON.stringify(pools.slice(0, 20)));
}

// Remove a pool from saved list
export function removeMyPool(poolId) {
  const pools = getMyPools().filter(p => p.id !== poolId);
  localStorage.setItem(POOLS_KEY, JSON.stringify(pools));
}

function PoolSelect({ onSelectPool, onCreateNew, onBack }) {
  const [poolCode, setPoolCode] = useState('');
  const [myPools, setMyPools] = useState([]);
  const [poolStatuses, setPoolStatuses] = useState({});
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Load saved pools + fetch their current status from Firebase
  useEffect(() => {
    const pools = getMyPools();
    setMyPools(pools);

    if (pools.length === 0) { setLoadingStatuses(false); return; }

    listDrafts().then(allDrafts => {
      const statuses = {};
      pools.forEach(pool => {
        const draft = allDrafts[pool.id];
        if (draft) {
          const config = draft.config || {};
          const owners = draft.owners || {};
          const picks = draft.picks || [];
          const totalPicks = (config.draftOrder?.length || Object.keys(owners).length) * (config.rosterSize || 10);
          const ownerData = owners[pool.ownerId];

          statuses[pool.id] = {
            exists: true,
            status: config.status || 'waiting',
            name: config.name || pool.name,
            sport: config.sport || pool.sport || '',
            templateId: config.templateId || pool.templateId || '',
            picksMade: Array.isArray(picks) ? picks.filter(Boolean).length : 0,
            totalPicks,
            onlineCount: Object.values(owners).filter(o => o.online).length,
            totalOwners: Object.keys(owners).length,
            myTeams: ownerData?.teams?.length || 0,
            scheduledTime: config.scheduledTime || null
          };
        } else {
          statuses[pool.id] = { exists: false };
        }
      });
      setPoolStatuses(statuses);
      setLoadingStatuses(false);
    }).catch(() => setLoadingStatuses(false));
  }, []);

  const handleJoin = async () => {
    if (!poolCode.trim()) { setError('Enter a pool code'); return; }
    setError('');
    setChecking(true);
    try {
      const draftId = poolCode.trim().replace(/[\u2014\u2013]/g, '-').replace(/\s+/g, '-');
      const { getDraftExists } = await import('../firebase');
      const config = await getDraftExists(draftId);
      if (config) {
        saveMyPool(draftId, { name: config.name || draftId, sport: config.sport, templateId: config.templateId });
        onSelectPool(draftId);
      } else {
        setError('Pool not found. Check the code and try again.');
      }
    } catch (err) {
      setError('Error connecting: ' + err.message);
    }
    setChecking(false);
  };

  const handleDelete = (e, poolId) => {
    e.stopPropagation();
    removeMyPool(poolId);
    setMyPools(prev => prev.filter(p => p.id !== poolId));
  };

  const getStatusBadge = (status) => {
    if (!status?.exists) return { label: 'Deleted', color: '#555', bg: 'rgba(85,85,85,0.15)' };
    switch (status.status) {
      case 'active': return { label: 'Drafting', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
      case 'complete': return { label: 'Complete', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
      default: return { label: 'Lobby', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    }
  };

  const getSportIcon = (pool) => {
    const sport = pool.sport || poolStatuses[pool.id]?.sport || '';
    if (sport === 'golf') return '\u26F3';
    if (sport === 'basketball') return '\uD83C\uDFC0';
    if (sport === 'football') return '\uD83C\uDFC8';
    if (sport === 'soccer') return '\u26BD';
    return '\uD83C\uDFC6';
  };

  const formatScheduledTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (d <= Date.now()) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="pool-select">
      <div className="pool-select-card">
        <img src="/logo.png" alt="Jersey Bets" style={{ width: 60, height: 60, marginBottom: 4 }} />
        <h2>My Pools</h2>
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

        <div className="pool-divider"><span>or</span></div>

        <button className="pool-create-btn" onClick={onCreateNew}>
          + Create New Draft Pool
        </button>

        {/* My Pools Dashboard */}
        {myPools.length > 0 && (
          <div className="my-pools">
            <div className="my-pools-title">My Pools</div>
            {loadingStatuses && <div className="my-pools-loading">Loading pool statuses...</div>}
            {myPools.map(pool => {
              const status = poolStatuses[pool.id];
              const badge = getStatusBadge(status);
              const scheduled = status?.scheduledTime ? formatScheduledTime(status.scheduledTime) : '';

              return (
                <div key={pool.id} className={`my-pool-card ${!status?.exists ? 'deleted' : ''}`}
                  onClick={() => status?.exists !== false && onSelectPool(pool.id)}>
                  <div className="my-pool-left">
                    <span className="my-pool-icon">{getSportIcon(pool)}</span>
                    <div className="my-pool-info">
                      <span className="my-pool-name">{pool.name || pool.id}</span>
                      <span className="my-pool-meta">
                        {pool.ownerName && <span>Playing as {pool.ownerName}</span>}
                        {status?.myTeams > 0 && <span> · {status.myTeams} picks</span>}
                      </span>
                      {status?.status === 'active' && (
                        <span className="my-pool-progress">{status.picksMade}/{status.totalPicks} picks made</span>
                      )}
                      {scheduled && <span className="my-pool-scheduled">Draft: {scheduled}</span>}
                    </div>
                  </div>
                  <div className="my-pool-right">
                    <span className="my-pool-badge" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                    {status?.exists !== false && status?.onlineCount > 0 && (
                      <span className="my-pool-online">{status.onlineCount} online</span>
                    )}
                    <button className="my-pool-delete" onClick={(e) => handleDelete(e, pool.id)} title="Remove">
                      {'\u00D7'}
                    </button>
                  </div>
                </div>
              );
            })}
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
