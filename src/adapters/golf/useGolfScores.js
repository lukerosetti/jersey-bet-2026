import { useState, useEffect, useCallback, useRef } from 'react';

const ESPN_GOLF = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

// ── Name Normalization ──────────────────────────────────────────────
// Strip accented/special characters to ASCII equivalents
// NFD handles most diacritics, but Nordic chars (ø, å, æ) need manual replacement
const specialChars = { 'ø': 'o', 'Ø': 'O', 'å': 'a', 'Å': 'A', 'æ': 'ae', 'Æ': 'AE', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'Th', 'ß': 'ss' };
function stripAccents(str) {
  let result = str;
  Object.entries(specialChars).forEach(([char, replacement]) => {
    result = result.replace(new RegExp(char, 'g'), replacement);
  });
  return result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Known ESPN → local name mappings (add edge cases here)
const golfNameMap = {
  'Nicolai Højgaard': 'Nicolai Hojgaard',
  'Rasmus Højgaard': 'Rasmus Hojgaard',
  'Ludvig Åberg': 'Ludvig Aberg',
  'Thorbjørn Olesen': 'Thorbjorn Olesen',
  'José María Olazábal': 'Jose Maria Olazabal',
  'Ángel Cabrera': 'Angel Cabrera',
  'Nicolás Echavarría': 'Nicolas Echavarria',
  'Nico Echavarría': 'Nicolas Echavarria',
  'Sami Välimäki': 'Sami Valimaki',
  'Séamus Power': 'Seamus Power',
  'Víctor Pérez': 'Victor Perez',
  'Joaquín Niemann': 'Joaquin Niemann',
  'Haotong Li': 'Haotong Li',
  'Sungjae Im': 'Sungjae Im',
  'Byeong Hun An': 'Byeong Hun An',
  'Sergio García': 'Sergio Garcia',
  'Jon Rahm': 'Jon Rahm',
  'Kristoffer Reitan': 'Kristoffer Reitan',
  'Rasmus Neergaard-Petersen': 'Rasmus Neergaard-Petersen',
};

export function normalizeGolfName(espnName) {
  if (!espnName) return '';
  // Check exact map first
  if (golfNameMap[espnName]) return golfNameMap[espnName];
  // Strip accents as fallback
  const stripped = stripAccents(espnName);
  if (stripped !== espnName) return stripped;
  return espnName;
}

// Build reverse lookup: local name → ESPN name (for matching draft picks to ESPN data)
export function buildNameLookup(espnPlayers) {
  const lookup = {};
  espnPlayers.forEach(p => {
    const normalized = normalizeGolfName(p.espnName);
    lookup[normalized] = p;
    // Also index by stripped accent version
    const stripped = stripAccents(p.espnName);
    if (stripped !== normalized) lookup[stripped] = p;
    // Index by ESPN name too
    lookup[p.espnName] = p;
  });
  return lookup;
}

// ── ESPN Golf Data Fetcher ──────────────────────────────────────────

function parseGolfEvent(event) {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const competitors = competition.competitors || [];
  const status = competition.status?.type?.name || '';
  const eventStatus = status === 'STATUS_FINAL' ? 'final'
    : status === 'STATUS_IN_PROGRESS' ? 'live'
    : 'upcoming';

  const players = competitors.map((p, idx) => {
    const athlete = p.athlete || {};
    const espnName = athlete.displayName || athlete.fullName || '';
    const localName = normalizeGolfName(espnName);
    const linescores = p.linescores || [];

    // Parse round scores
    const rounds = linescores.map(ls => ({
      round: ls.period,
      score: ls.value, // raw strokes
      toPar: ls.displayValue, // e.g. "-6"
      holes: ls.linescores?.map(h => ({
        hole: h.period,
        strokes: h.value,
        toPar: h.scoreType?.displayValue || 'E'
      })) || []
    }));

    // Current round info (last linescore entry)
    const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
    const completedHoles = currentRound?.holes?.length || 0;
    const thru = completedHoles === 18 ? 'F' : completedHoles > 0 ? String(completedHoles) : '-';

    // Today's score (last round toPar)
    const today = currentRound?.toPar || '-';

    return {
      espnName,
      name: localName,
      position: idx + 1, // leaderboard position (ESPN returns sorted)
      score: p.score, // total to par (number, e.g. -21)
      scoreDisplay: p.score > 0 ? `+${p.score}` : p.score === 0 ? 'E' : String(p.score),
      today,
      thru,
      rounds,
      totalStrokes: rounds.reduce((sum, r) => sum + (r.score || 0), 0),
      country: athlete.flag?.alt || '',
      countryCode: athlete.flag?.href?.match(/\/(\w+)\.png/)?.[1] || '',
      status: p.status?.type?.name || '',
      isCut: p.status?.type?.name === 'STATUS_CUT' || false,
    };
  });

  return {
    eventId: event.id,
    name: event.name,
    status: eventStatus,
    startDate: event.date,
    venue: competition.venue?.fullName || '',
    city: competition.venue?.address?.city || '',
    state: competition.venue?.address?.state || '',
    currentRound: competition.status?.period || 0,
    players,
    purse: competition.purse?.displayValue || '',
  };
}

// ── React Hook ──────────────────────────────────────────────────────

export function useGolfScores(eventId) {
  const [leaderboard, setLeaderboard] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitialFetch = useRef(false);

  const fetchScores = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      // ESPN golf scoreboard returns the current/upcoming event
      // For a specific event, we can filter by date
      const response = await fetch(ESPN_GOLF);
      if (!response.ok) throw new Error('Failed to fetch golf scores');
      const data = await response.json();

      // Find our event in the response
      const event = data.events?.find(e => e.id === eventId) || data.events?.[0];
      if (event) {
        const parsed = parseGolfEvent(event);
        setLeaderboard(parsed);
        setLastUpdate(new Date());
      }
      hasInitialFetch.current = true;
    } catch (err) {
      console.error('Error fetching golf scores:', err);
      setError(err.message);
    }
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchScores();
    // Poll every 60 seconds for golf (less frequent than basketball)
    const interval = setInterval(fetchScores, 60000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  return { leaderboard, lastUpdate, isLoading, error, refetch: fetchScores };
}

// ── Field Fetcher (for draft template sync) ─────────────────────────

export async function fetchESPNGolfField(eventId) {
  try {
    const response = await fetch(ESPN_GOLF);
    if (!response.ok) return null;
    const data = await response.json();
    const event = data.events?.find(e => e.id === eventId) || data.events?.[0];
    if (!event) return null;

    const competition = event.competitions?.[0];
    if (!competition) return null;

    return (competition.competitors || []).map(p => {
      const athlete = p.athlete || {};
      return {
        espnName: athlete.displayName || athlete.fullName || '',
        localName: normalizeGolfName(athlete.displayName || ''),
        position: p.order || 0,
        country: athlete.flag?.alt || '',
      };
    });
  } catch (err) {
    console.error('Error fetching golf field:', err);
    return null;
  }
}

// ── Merge draft picks with live leaderboard ─────────────────────────

export function mergeGolfDraftWithLeaderboard(draftedTeams, leaderboardPlayers) {
  if (!leaderboardPlayers || leaderboardPlayers.length === 0) return [];

  // Build lookup by normalized name
  const lookup = {};
  leaderboardPlayers.forEach(p => {
    lookup[p.name] = p;
    lookup[p.espnName] = p;
    // Also try stripped accent match
    const stripped = stripAccents(p.espnName);
    if (stripped !== p.name) lookup[stripped] = p;
  });

  return draftedTeams.map(teamName => {
    const match = lookup[teamName] || lookup[stripAccents(teamName)];
    if (match) {
      return { ...match, drafted: true, draftName: teamName };
    }
    // No match — golfer might not be in the current leaderboard yet
    return {
      name: teamName,
      draftName: teamName,
      drafted: true,
      position: 999,
      score: null,
      scoreDisplay: '-',
      today: '-',
      thru: '-',
      rounds: [],
      country: '',
      isCut: false,
      notFound: true, // flag for UI to show "not in field"
    };
  });
}

// ── Validate draft template against ESPN field ──────────────────────

export async function validateDraftField(templatePlayers, eventId) {
  const espnField = await fetchESPNGolfField(eventId);
  if (!espnField || espnField.length === 0) {
    return { valid: true, message: 'ESPN field not available yet. Names will be validated when the tournament starts.', unmatched: [] };
  }

  const espnNames = new Set(espnField.map(p => p.localName));
  const espnNamesRaw = new Set(espnField.map(p => p.espnName));

  const unmatched = templatePlayers.filter(name => {
    return !espnNames.has(name) && !espnNamesRaw.has(name) && !espnNames.has(stripAccents(name));
  });

  if (unmatched.length === 0) {
    return { valid: true, message: `All ${templatePlayers.length} players matched ESPN field.`, unmatched: [] };
  }

  return {
    valid: false,
    message: `${unmatched.length} player(s) not found in ESPN field.`,
    unmatched,
    espnField // return field so caller can suggest corrections
  };
}
