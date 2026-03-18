import { useState, useEffect, useCallback, useRef } from 'react';
import { playInGames } from '../data/bracketData';
import { teamSeasonStats } from '../data/teamStats';

// ESPN API endpoints
const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';
const ESPN_TEAM = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams';
const ESPN_GAME = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

// Team name mapping (ESPN name -> our name)
const teamNameMap = {
  'Duke Blue Devils': 'Duke',
  'Siena Saints': 'Siena',
  'Ohio State Buckeyes': 'Ohio State',
  'TCU Horned Frogs': 'TCU',
  'St. John\'s Red Storm': 'St Johns',
  'Northern Iowa Panthers': 'Northern Iowa',
  'Kansas Jayhawks': 'Kansas',
  'California Baptist Lancers': 'Cal Baptist',
  'Louisville Cardinals': 'Louisville',
  'South Florida Bulls': 'South Florida',
  'Michigan State Spartans': 'Michigan St',
  'North Dakota State Bison': 'North Dakota St',
  'UCLA Bruins': 'UCLA',
  'UCF Knights': 'UCF',
  'UConn Huskies': 'UConn',
  'Connecticut Huskies': 'UConn',
  'Furman Paladins': 'Furman',
  'Arizona Wildcats': 'Arizona',
  'LIU Sharks': 'LIU',
  'Long Island Sharks': 'LIU',
  'Villanova Wildcats': 'Villanova',
  'Utah State Aggies': 'Utah State',
  'Wisconsin Badgers': 'Wisconsin',
  'High Point Panthers': 'High Point',
  'Arkansas Razorbacks': 'Arkansas',
  'Hawaii Rainbow Warriors': 'Hawaii',
  'Hawai\'i Rainbow Warriors': 'Hawaii',
  'BYU Cougars': 'BYU',
  'Texas Longhorns': 'Texas',
  'Gonzaga Bulldogs': 'Gonzaga',
  'Kennesaw State Owls': 'Kennesaw St',
  'Miami Hurricanes': 'Miami FL',
  'Missouri Tigers': 'Missouri',
  'Purdue Boilermakers': 'Purdue',
  'Queens Royals': 'Queens',
  'Michigan Wolverines': 'Michigan',
  'Howard Bison': 'Howard',
  'Georgia Bulldogs': 'Georgia',
  'Saint Louis Billikens': 'Saint Louis',
  'Texas Tech Red Raiders': 'Texas Tech',
  'Akron Zips': 'Akron',
  'Alabama Crimson Tide': 'Alabama',
  'Hofstra Pride': 'Hofstra',
  'Tennessee Volunteers': 'Tennessee',
  'SMU Mustangs': 'SMU',
  'Virginia Cavaliers': 'Virginia',
  'Wright State Raiders': 'Wright St',
  'Kentucky Wildcats': 'Kentucky',
  'Santa Clara Broncos': 'Santa Clara',
  'Iowa State Cyclones': 'Iowa State',
  'Tennessee State Tigers': 'Tennessee St',
  'Florida Gators': 'Florida',
  'Lehigh Mountain Hawks': 'Lehigh',
  'Clemson Tigers': 'Clemson',
  'Iowa Hawkeyes': 'Iowa',
  'Vanderbilt Commodores': 'Vanderbilt',
  'McNeese Cowboys': 'McNeese',
  'Nebraska Cornhuskers': 'Nebraska',
  'Troy Trojans': 'Troy',
  'North Carolina Tar Heels': 'North Carolina',
  'VCU Rams': 'VCU',
  'Illinois Fighting Illini': 'Illinois',
  'Penn Quakers': 'Penn',
  'Saint Mary\'s Gaels': 'Saint Marys',
  'Texas A&M Aggies': 'Texas A&M',
  'Houston Cougars': 'Houston',
  'Idaho Vandals': 'Idaho',
  'Prairie View A&M Panthers': 'Prairie View AM',
  'NC State Wolfpack': 'NC State',
  'North Carolina State Wolfpack': 'NC State',
  'UMBC Retrievers': 'UMBC',
  'Miami (OH) RedHawks': 'Miami OH',
  'Miami Ohio RedHawks': 'Miami OH',
  'Miami RedHawks': 'Miami OH'
};

export const normalizeTeamName = (espnName) => {
  if (!espnName) return '';
  if (teamNameMap[espnName]) return teamNameMap[espnName];
  
  const lowerName = espnName.toLowerCase();

  // Special cases first (substring-overlapping names)
  if (lowerName.includes('prairie view')) return 'Prairie View AM';
  if (lowerName.includes('nc state') || lowerName.includes('north carolina state')) return 'NC State';
  if (lowerName.includes('umbc')) return 'UMBC';
  if (lowerName.includes('miami') && lowerName.includes('oh')) return 'Miami OH';
  if (lowerName.includes('iowa state') || lowerName.includes('iowa st')) return 'Iowa State';
  if (lowerName.includes('michigan state') || lowerName.includes('michigan st')) return 'Michigan St';
  if (lowerName.includes('north dakota')) return 'North Dakota St';

  // Fuzzy fallback: sort by longest local name first to prevent substring false matches
  const sortedEntries = Object.entries(teamNameMap).sort((a, b) => b[1].length - a[1].length);
  for (const [espn, local] of sortedEntries) {
    if (lowerName.includes(local.toLowerCase())) return local;
  }
  
  return espnName.replace(/\s+(Wildcats|Bulldogs|Tigers|Bears|Eagles|Hawks|Cardinals|Blue Devils|Tar Heels|Jayhawks|Hoosiers|Spartans|Wolverines|Buckeyes|Boilermakers|Fighting Illini|Hawkeyes|Badgers|Gophers|Cornhuskers|Cyclones|Cowboys|Red Raiders|Longhorns|Aggies|Razorbacks|Volunteers|Crimson Tide|Commodores|Rebels|Gamecocks|Cavaliers|Hokies|Demon Deacons|Wolfpack|Orange|Panthers|Hurricanes|Seminoles|Yellow Jackets|Rams|Owls|Gaels|Dons|Broncos|Toreros|Waves|Lions|Zags|Retrievers|RedHawks|Mountain Hawks|Bison|Huskies)$/i, '').trim();
};

// Hook to fetch live scores with localStorage caching for completed games
export function useLiveScores() {
  // Load cached games from localStorage on init
  const [liveGames, setLiveGames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jerseyBetGames')) || {};
    } catch { return {}; }
  });
  const [playInWinners, setPlayInWinners] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jerseyBetPlayInWinners')) || {};
    } catch { return {}; }
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitialFetch = useRef(false);

  const fetchScores = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load cached completed games
      let cachedGames = {};
      let cachedWinners = {};
      try {
        cachedGames = JSON.parse(localStorage.getItem('jerseyBetGames')) || {};
        cachedWinners = JSON.parse(localStorage.getItem('jerseyBetPlayInWinners')) || {};
      } catch { }

      // First load: fetch 28 days to recover all historical games
      // Subsequent polls: only fetch past 4 days for live updates
      const isFirstFetch = !hasInitialFetch.current;
      const daysToFetch = isFirstFetch ? 28 : 4;
      hasInitialFetch.current = true;

      const today = new Date();
      const freshGames = {};
      const freshWinners = {};

      for (let i = 0; i < daysToFetch; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        
        try {
          const response = await fetch(`${ESPN_SCOREBOARD}?groups=100&dates=${dateStr}`);
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (data.events) {
            data.events.forEach(event => {
              const competition = event.competitions?.[0];
              if (!competition) return;
              
              const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
              const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
              
              if (!homeTeam || !awayTeam) return;
              
              const team1Name = normalizeTeamName(awayTeam.team?.displayName || '');
              const team2Name = normalizeTeamName(homeTeam.team?.displayName || '');
              
              const status = competition.status?.type?.name;
              const clock = competition.status?.displayClock;
              const period = competition.status?.period;
              
              let gameStatus = 'upcoming';
              if (status === 'STATUS_IN_PROGRESS') gameStatus = 'live';
              else if (status === 'STATUS_FINAL') gameStatus = 'final';
              else if (status === 'STATUS_HALFTIME') gameStatus = 'halftime';
              
              const score1 = parseInt(awayTeam.score) || 0;
              const score2 = parseInt(homeTeam.score) || 0;
              
              if (gameStatus === 'final') {
                const winner = score1 > score2 ? team1Name : team2Name;
                playInGames.forEach(pi => {
                  if ((pi.t1 === team1Name && pi.t2 === team2Name) || 
                      (pi.t1 === team2Name && pi.t2 === team1Name)) {
                    freshWinners[pi.id] = winner;
                  }
                });
              }
              
              const gameKey = [team1Name, team2Name].sort().join('_');
              
              freshGames[gameKey] = {
                id: event.id,
                team1: team1Name,
                team2: team2Name,
                score1: score1,
                score2: score2,
                status: gameStatus,
                clock: clock || '',
                period: period || 1,
                network: competition.broadcast || ''
              };
            });
          }
        } catch (dayErr) {
          console.warn(`Error fetching scores for ${dateStr}:`, dayErr);
        }
      }
      
      // Merge: cached completed games + fresh data (fresh overwrites for live/recent games)
      const mergedGames = { ...cachedGames };
      const mergedWinners = { ...cachedWinners, ...freshWinners };
      
      // Update with fresh data, keeping cached finals if not in fresh data
      Object.entries(freshGames).forEach(([key, game]) => {
        mergedGames[key] = game;
      });
      
      // Save completed games to localStorage for persistence
      const gamesToCache = {};
      Object.entries(mergedGames).forEach(([key, game]) => {
        if (game.status === 'final') {
          gamesToCache[key] = game;
        }
      });
      
      try {
        localStorage.setItem('jerseyBetGames', JSON.stringify(gamesToCache));
        localStorage.setItem('jerseyBetPlayInWinners', JSON.stringify(mergedWinners));
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
      
      setLiveGames(mergedGames);
      setPlayInWinners(mergedWinners);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 30000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  return { liveGames, playInWinners, lastUpdate, isLoading, error, refetch: fetchScores };
}

// Fetch game details including player stats and play-by-play
export async function fetchGameDetails(gameId) {
  try {
    const response = await fetch(`${ESPN_GAME}?event=${gameId}`);
    if (!response.ok) throw new Error('Failed to fetch game details');
    
    const data = await response.json();
    
    // Extract boxscore
    const boxscore = data.boxscore;
    const players = boxscore?.players || [];
    const teams = boxscore?.teams || [];
    
    // Extract play-by-play
    const plays = data.plays || [];
    
    // Format player stats
    const formattedPlayers = {};
    players.forEach(teamPlayers => {
      const teamName = normalizeTeamName(teamPlayers.team?.displayName || '');
      formattedPlayers[teamName] = teamPlayers.statistics?.[0]?.athletes?.map(athlete => ({
        id: athlete.athlete?.id,
        name: athlete.athlete?.shortName || athlete.athlete?.displayName,
        position: athlete.athlete?.position?.abbreviation || '',
        jersey: athlete.athlete?.jersey || '',
        stats: {
          minutes: athlete.stats?.[0] || '0',
          fgm: athlete.stats?.[1] || '0',
          fga: athlete.stats?.[2] || '0',
          fg3m: athlete.stats?.[3] || '0',
          fg3a: athlete.stats?.[4] || '0',
          ftm: athlete.stats?.[5] || '0',
          fta: athlete.stats?.[6] || '0',
          oreb: athlete.stats?.[7] || '0',
          dreb: athlete.stats?.[8] || '0',
          reb: athlete.stats?.[9] || '0',
          ast: athlete.stats?.[10] || '0',
          stl: athlete.stats?.[11] || '0',
          blk: athlete.stats?.[12] || '0',
          to: athlete.stats?.[13] || '0',
          pf: athlete.stats?.[14] || '0',
          pts: athlete.stats?.[15] || '0'
        }
      })) || [];
    });
    
    // Format team stats
    const formattedTeamStats = {};
    teams.forEach(team => {
      const teamName = normalizeTeamName(team.team?.displayName || '');
      const stats = team.statistics || [];
      formattedTeamStats[teamName] = {
        fgPct: stats.find(s => s.name === 'fieldGoalPct')?.displayValue || '0%',
        fg3Pct: stats.find(s => s.name === 'threePointFieldGoalPct')?.displayValue || '0%',
        ftPct: stats.find(s => s.name === 'freeThrowPct')?.displayValue || '0%',
        rebounds: stats.find(s => s.name === 'totalRebounds')?.displayValue || '0',
        assists: stats.find(s => s.name === 'assists')?.displayValue || '0',
        turnovers: stats.find(s => s.name === 'turnovers')?.displayValue || '0',
        steals: stats.find(s => s.name === 'steals')?.displayValue || '0',
        blocks: stats.find(s => s.name === 'blocks')?.displayValue || '0'
      };
    });
    
    // Format play-by-play (last 10 plays)
    const formattedPlays = plays.slice(-20).reverse().map(play => ({
      id: play.id,
      text: play.text,
      team: normalizeTeamName(play.team?.displayName || ''),
      clock: play.clock?.displayValue || '',
      period: play.period?.number || 1,
      scoreHome: play.homeScore,
      scoreAway: play.awayScore
    }));
    
    return {
      players: formattedPlayers,
      teamStats: formattedTeamStats,
      plays: formattedPlays
    };
  } catch (err) {
    console.error('Error fetching game details:', err);
    return null;
  }
}

// Fetch team season stats
export async function fetchTeamStats(teamName) {
  try {
    // Search for team
    const searchResponse = await fetch(`${ESPN_TEAM}?search=${encodeURIComponent(teamName)}`);
    if (!searchResponse.ok) return null;
    
    const searchData = await searchResponse.json();
    const team = searchData.sports?.[0]?.leagues?.[0]?.teams?.[0]?.team;
    
    if (!team) return null;
    
    // Get team stats
    const statsResponse = await fetch(`${ESPN_TEAM}/${team.id}/statistics`);
    if (!statsResponse.ok) return null;
    
    const statsData = await statsResponse.json();
    const stats = statsData.statistics?.splits?.categories || [];
    
    const getStatValue = (category, name) => {
      const cat = stats.find(c => c.name === category);
      const stat = cat?.stats?.find(s => s.name === name);
      return stat?.displayValue || stat?.value || '0';
    };
    
    return {
      ppg: getStatValue('scoring', 'avgPoints'),
      rpg: getStatValue('rebounding', 'avgRebounds'),
      apg: getStatValue('assists', 'avgAssists'),
      spg: getStatValue('defensive', 'avgSteals'),
      bpg: getStatValue('defensive', 'avgBlocks'),
      fgPct: getStatValue('shooting', 'fieldGoalPct'),
      fg3Pct: getStatValue('shooting', 'threePointFieldGoalPct'),
      ftPct: getStatValue('shooting', 'freeThrowPct')
    };
  } catch (err) {
    console.error('Error fetching team stats:', err);
    return null;
  }
}

// Fetch team roster with season averages for pre-game preview
export async function fetchTeamRoster(teamName) {
  // Return hardcoded stats for this team
  if (teamSeasonStats[teamName]) {
    return { topScorers: teamSeasonStats[teamName] };
  }
  return null;
}

// Merge static data with live scores
export function mergeWithLiveData(staticGame, liveGames, playInWinners, resolvedGames) {
  let game = { ...staticGame };

  // Resolve play-in winners
  if (game.t2 === 'TBD' && game.t2PlayIn) {
    const winner = playInWinners[game.t2PlayIn];
    if (winner) game.t2 = winner;
  }
  if (game.t1 === 'TBD' && game.t1PlayIn) {
    const winner = playInWinners[game.t1PlayIn];
    if (winner) game.t1 = winner;
  }

  // Resolve later-round TBD teams from earlier-round winners (propagate seed too)
  if (resolvedGames && game.t1From && game.t1 === 'TBD') {
    const feederGame = resolvedGames[game.t1From];
    if (feederGame && feederGame.status === 'final' && feederGame.sc1 != null && feederGame.sc1 !== feederGame.sc2) {
      const t1Won = feederGame.sc1 > feederGame.sc2;
      game.t1 = t1Won ? feederGame.t1 : feederGame.t2;
      game.s1 = t1Won ? feederGame.s1 : feederGame.s2;
    }
  }
  if (resolvedGames && game.t2From && game.t2 === 'TBD') {
    const feederGame = resolvedGames[game.t2From];
    if (feederGame && feederGame.status === 'final' && feederGame.sc1 != null && feederGame.sc1 !== feederGame.sc2) {
      const t1Won = feederGame.sc1 > feederGame.sc2;
      game.t2 = t1Won ? feederGame.t1 : feederGame.t2;
      game.s2 = t1Won ? feederGame.s1 : feederGame.s2;
    }
  }

  // Match with live ESPN data
  if (game.t1 !== 'TBD' && game.t2 !== 'TBD') {
    const gameKey = [game.t1, game.t2].sort().join('_');
    const liveData = liveGames[gameKey];

    if (liveData) {
      const t1IsFirst = liveData.team1 === game.t1;
      return {
        ...game,
        espnId: liveData.id,
        status: liveData.status,
        sc1: t1IsFirst ? liveData.score1 : liveData.score2,
        sc2: t1IsFirst ? liveData.score2 : liveData.score1,
        time: liveData.clock,
        half: liveData.period,
      };
    }
  }

  return game;
}

// Resolve all games in round order so later rounds can reference earlier winners
export function resolveAllGames(allStaticGames, liveGames, playInWinners) {
  const resolved = {};
  // Sort by round so R1 resolves before R2, etc.
  const sorted = [...allStaticGames].sort((a, b) => (a.round || 1) - (b.round || 1));
  sorted.forEach(sg => {
    const merged = mergeWithLiveData(sg, liveGames, playInWinners, resolved);
    resolved[merged.id] = merged;
  });
  return resolved;
}
