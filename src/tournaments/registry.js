import marchMadnessConfig from './march-madness-2026';
import { getTheme } from '../draft/draftTemplates';

// Registry of all available tournaments
const tournaments = {
  'march-madness-2026': {
    config: marchMadnessConfig,
    label: 'March Madness 2026',
    shortLabel: 'NCAA',
    sport: 'basketball',
    templateId: null, // no draft template — uses hardcoded rosters
  },
  // Masters will be added dynamically when a draft completes
};

// Load any completed draft tournaments from localStorage
function loadDraftTournaments() {
  try {
    const drafts = JSON.parse(localStorage.getItem('jerseyBetCompletedDrafts') || '[]');
    drafts.forEach(draft => {
      if (!tournaments[draft.id]) {
        tournaments[draft.id] = {
          config: buildConfigFromDraft(draft),
          label: draft.name,
          shortLabel: draft.sport === 'golf' ? 'GOLF' : draft.name.slice(0, 6),
          sport: draft.sport || 'custom',
          templateId: draft.templateId,
          isDraft: true,
        };
      }
    });
  } catch {}
}

function buildConfigFromDraft(draft) {
  return {
    id: draft.id,
    name: draft.name,
    type: draft.sport === 'golf' ? 'leaderboard' : 'bracket',
    owners: draft.owners || [],
    dataSource: {
      sport: draft.sport === 'golf' ? 'golf' : 'basketball',
      league: draft.sport === 'golf' ? 'pga' : 'mens-college-basketball',
      group: draft.sport === 'golf' ? '' : '100',
      espnEventId: draft.espnEventId || null,
    },
    scoring: draft.scoring || { rounds: {} },
    badges: { glory: [], shame: [] },
  };
}

// Initialize
loadDraftTournaments();

// ── Exports ──────────────────────────────────────────────────

export function getAvailableTournaments() {
  return Object.entries(tournaments).map(([id, t]) => ({
    id,
    label: t.label,
    shortLabel: t.shortLabel,
    sport: t.sport,
    isDraft: t.isDraft || false,
    templateId: t.templateId,
  }));
}

export function getTournamentConfig(id) {
  const t = tournaments[id];
  if (!t) return null;
  return t.config;
}

export function getActiveTournamentId() {
  return localStorage.getItem('jerseyBetActiveTournament') || 'march-madness-2026';
}

export function setActiveTournamentId(id) {
  localStorage.setItem('jerseyBetActiveTournament', id);
}

// Register a completed draft as a tournament
export function registerDraftTournament(draft) {
  const id = draft.tournamentId || draft.id;
  tournaments[id] = {
    config: buildConfigFromDraft(draft),
    label: draft.name,
    shortLabel: draft.sport === 'golf' ? 'GOLF' : draft.name.slice(0, 6),
    sport: draft.sport || 'custom',
    templateId: draft.templateId,
    isDraft: true,
  };

  // Save to localStorage so it persists across reloads
  const drafts = JSON.parse(localStorage.getItem('jerseyBetCompletedDrafts') || '[]');
  const existing = drafts.findIndex(d => d.id === id);
  const entry = { id, name: draft.name, sport: draft.sport, templateId: draft.templateId, owners: draft.owners, espnEventId: draft.espnEventId };
  if (existing >= 0) drafts[existing] = entry;
  else drafts.push(entry);
  localStorage.setItem('jerseyBetCompletedDrafts', JSON.stringify(drafts));
}

// Delete a draft tournament
export function deleteDraftTournament(id) {
  delete tournaments[id];
  const drafts = JSON.parse(localStorage.getItem('jerseyBetCompletedDrafts') || '[]');
  localStorage.setItem('jerseyBetCompletedDrafts', JSON.stringify(drafts.filter(d => d.id !== id)));
  // If this was the active tournament, switch back to march madness
  if (getActiveTournamentId() === id) {
    setActiveTournamentId('march-madness-2026');
  }
}
