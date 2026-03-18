// 2026 NCAA Tournament Data
// Play-in game winners will be auto-detected via ESPN API

export const owners = [
  { id: 'luke', name: 'Luke', initials: 'LK', color: '#22d3ee', 
    teams: ['Arizona', 'UConn', 'Arkansas', 'Nebraska', 'Texas Tech', 'Kentucky', 'Saint Louis', 'UCF', 'Louisville', 'Troy', 'Wright St', 'Clemson', 'Tennessee St', 'Penn', 'Lehigh', 'Prairie View AM', 'Texas', 'NC State'] },
  { id: 'nick', name: 'Nick', initials: 'NK', color: '#a78bfa', 
    teams: ['Michigan', 'Purdue', 'Virginia', 'Illinois', 'Gonzaga', 'Kansas', 'UCLA', 'Iowa', 'TCU', 'Santa Clara', 'Akron', 'McNeese', 'Missouri', 'North Dakota St', 'Siena', 'Howard', 'UMBC'] },
  { id: 'brooks', name: 'Brooks', initials: 'BK', color: '#fb923c', 
    teams: ['Duke', 'Iowa State', 'Michigan St', 'Alabama', 'Vanderbilt', 'North Carolina', 'Texas A&M', 'Utah State', 'SMU', 'Miami FL', 'Northern Iowa', 'High Point', 'Cal Baptist', 'Hawaii', 'Furman', 'Idaho', 'Miami OH'] },
  { id: 'james', name: 'James', initials: 'JM', color: '#f472b6', 
    teams: ['Florida', 'Houston', 'St Johns', 'Wisconsin', 'BYU', 'Tennessee', 'South Florida', 'VCU', 'Georgia', 'Saint Marys', 'Ohio State', 'Villanova', 'Hofstra', 'Kennesaw St', 'Queens', 'LIU'] }
];

// Play-in games - winners will fill into main bracket automatically
export const playInGames = [
  { id: 'pi1', t1: 'Prairie View AM', t2: 'Lehigh', winner: null, forSeed: 16, forRegion: 'south', status: 'upcoming', tip: 'Wed 6:40 PM', network: 'TruTV' },
  { id: 'pi2', t1: 'Texas', t2: 'NC State', winner: null, forSeed: 11, forRegion: 'west', status: 'upcoming', tip: 'Tue 9:15 PM', network: 'TruTV' },
  { id: 'pi3', t1: 'UMBC', t2: 'Howard', winner: null, forSeed: 16, forRegion: 'midwest', status: 'upcoming', tip: 'Tue 6:40 PM', network: 'TruTV' },
  { id: 'pi4', t1: 'Miami OH', t2: 'SMU', winner: null, forSeed: 11, forRegion: 'midwest', status: 'upcoming', tip: 'Wed 9:15 PM', network: 'TruTV' }
];

export const teamColors = {
  'Duke': '#001A57', 'Siena': '#006747', 'Ohio State': '#BB0000', 'TCU': '#4D1979',
  'St Johns': '#D41B2C', 'Northern Iowa': '#4B116F', 'Kansas': '#0051BA', 'Cal Baptist': '#002855',
  'Louisville': '#AD0000', 'South Florida': '#006747', 'Michigan St': '#18453B', 'North Dakota St': '#006633',
  'UCLA': '#2D68C4', 'UCF': '#BA9B37', 'UConn': '#000E2F', 'Furman': '#582C83',
  'Arizona': '#CC0033', 'LIU': '#000000', 'Villanova': '#003366', 'Utah State': '#0F2439',
  'Wisconsin': '#C5050C', 'High Point': '#330072', 'Arkansas': '#9D2235', 'Hawaii': '#024731',
  'BYU': '#002E5D', 'Texas': '#BF5700', 'Gonzaga': '#002967', 'Kennesaw St': '#FDBB30',
  'Miami FL': '#005030', 'Missouri': '#F1B82D', 'Purdue': '#CEB888', 'Queens': '#003366',
  'Michigan': '#00274C', 'Howard': '#003DA5', 'Georgia': '#BA0C2F', 'Saint Louis': '#003DA5',
  'Texas Tech': '#CC0000', 'Akron': '#041E42', 'Alabama': '#9E1B32', 'Hofstra': '#003591',
  'Tennessee': '#FF8200', 'SMU': '#C8102E', 'Virginia': '#232D4B', 'Wright St': '#007A33',
  'Kentucky': '#0033A0', 'Santa Clara': '#B01B2E', 'Iowa State': '#C8102E', 'Tennessee St': '#00539F',
  'Florida': '#0021A5', 'Lehigh': '#653819', 'Clemson': '#F56600', 'Iowa': '#FFCD00',
  'Vanderbilt': '#866D4B', 'McNeese': '#005EB8', 'Nebraska': '#E41C38', 'Troy': '#8B2332',
  'North Carolina': '#7BAFD4', 'VCU': '#000000', 'Illinois': '#E84A27', 'Penn': '#011F5B',
  'Saint Marys': '#D50032', 'Texas A&M': '#500000', 'Houston': '#C8102E', 'Idaho': '#B3A369',
  'Prairie View AM': '#4F2D7F', 'NC State': '#CC0000', 'UMBC': '#F7B500', 'Miami OH': '#B61E2E'
};

export const espnTeamIds = {
  'Duke': 150, 'Siena': 2561, 'Ohio State': 194, 'TCU': 2628,
  'St Johns': 2599, 'Northern Iowa': 2460, 'Kansas': 2305, 'Cal Baptist': 2856,
  'Louisville': 97, 'South Florida': 58, 'Michigan St': 127, 'North Dakota St': 2449,
  'UCLA': 26, 'UCF': 2116, 'UConn': 41, 'Furman': 231,
  'Arizona': 12, 'LIU': 112358, 'Villanova': 222, 'Utah State': 328,
  'Wisconsin': 275, 'High Point': 2272, 'Arkansas': 8, 'Hawaii': 62,
  'BYU': 252, 'Texas': 251, 'Gonzaga': 2250, 'Kennesaw St': 338,
  'Miami FL': 2390, 'Missouri': 142, 'Purdue': 2509, 'Queens': 2511,
  'Florida': 57, 'Michigan': 130, 'Howard': 47, 'Georgia': 61,
  'Saint Louis': 139, 'Texas Tech': 2641, 'Akron': 2006, 'Alabama': 333,
  'Hofstra': 2275, 'Tennessee': 2633, 'Virginia': 258, 'Wright St': 2750,
  'Kentucky': 96, 'Santa Clara': 2541, 'Iowa State': 66, 'Tennessee St': 2634,
  'Clemson': 228, 'Iowa': 2294, 'Vanderbilt': 238, 'McNeese': 2377,
  'Nebraska': 158, 'Troy': 2653, 'North Carolina': 153, 'VCU': 2670,
  'Illinois': 356, 'Penn': 219, 'Saint Marys': 2608, 'Texas A&M': 245,
  'Houston': 248, 'Idaho': 70, 'SMU': 2567, 'Miami OH': 193,
  'Lehigh': 2329, 'Prairie View AM': 2504, 'NC State': 152, 'UMBC': 2378
};

export const getTeamLogo = (teamName) => {
  const id = espnTeamIds[teamName];
  return id ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png` : null;
};

export const getOwner = (teamName) => owners.find(o => o.teams.includes(teamName));
export const getTeamColor = (teamName) => teamColors[teamName] || '#555555';

// CORRECT 2026 NCAA TOURNAMENT BRACKET
export const regions = {
  east: {
    name: 'East',
    games: [
      { id: 'e1', round: 1, s1: 1, t1: 'Duke', s2: 16, t2: 'Siena', status: 'upcoming', tip: 'Thu 2:50 PM', network: 'CBS', spread: 'DUKE -27.5', total: '148.5', ml: '-5000', prob1: 96, rec1: '32-2', rec2: '23-11' },
      { id: 'e2', round: 1, s1: 8, t1: 'Ohio State', s2: 9, t2: 'TCU', status: 'upcoming', tip: 'Thu 12:15 PM', network: 'CBS', spread: 'OSU -4.5', total: '142.5', ml: '-190', prob1: 58, rec1: '21-12', rec2: '22-11' },
      { id: 'e3', round: 1, s1: 5, t1: 'St Johns', s2: 12, t2: 'Northern Iowa', status: 'upcoming', tip: 'Fri 7:10 PM', network: 'CBS', spread: 'SJU -9.5', total: '146.5', ml: '-420', prob1: 78, rec1: '28-6', rec2: '23-11' },
      { id: 'e4', round: 1, s1: 4, t1: 'Kansas', s2: 13, t2: 'Cal Baptist', status: 'upcoming', tip: 'Fri 9:45 PM', network: 'CBS', spread: 'KU -14.5', total: '152.5', ml: '-1100', prob1: 89, rec1: '23-10', rec2: '24-9' },
      { id: 'e5', round: 1, s1: 6, t1: 'Louisville', s2: 11, t2: 'South Florida', status: 'upcoming', tip: 'Thu 1:30 PM', network: 'TNT', spread: 'LOU -7.5', total: '144.5', ml: '-320', prob1: 74, rec1: '23-10', rec2: '21-13' },
      { id: 'e6', round: 1, s1: 3, t1: 'Michigan St', s2: 14, t2: 'North Dakota St', status: 'upcoming', tip: 'Thu 4:05 PM', network: 'TNT', spread: 'MSU -16.5', total: '138.5', ml: '-1600', prob1: 93, rec1: '25-7', rec2: '25-9' },
      { id: 'e7', round: 1, s1: 7, t1: 'UCLA', s2: 10, t2: 'UCF', status: 'upcoming', tip: 'Fri 7:25 PM', network: 'TBS', spread: 'UCLA -6.5', total: '148.5', ml: '-280', prob1: 72, rec1: '23-10', rec2: '22-11' },
      { id: 'e8', round: 1, s1: 2, t1: 'UConn', s2: 15, t2: 'Furman', status: 'upcoming', tip: 'Fri 10:00 PM', network: 'TBS', spread: 'UCONN -18.5', total: '144.5', ml: '-2800', prob1: 95, rec1: '26-7', rec2: '24-10' }
    ]
  },
  west: {
    name: 'West',
    games: [
      { id: 'w1', round: 1, s1: 1, t1: 'Arizona', s2: 16, t2: 'LIU', status: 'upcoming', tip: 'Fri 1:35 PM', network: 'TNT', spread: 'ARIZ -28.5', total: '152.5', ml: '-8000', prob1: 98, rec1: '31-3', rec2: '18-15' },
      { id: 'w2', round: 1, s1: 8, t1: 'Villanova', s2: 9, t2: 'Utah State', status: 'upcoming', tip: 'Fri 4:10 PM', network: 'TNT', spread: 'NOVA -2.5', total: '138.5', ml: '-135', prob1: 56, rec1: '22-11', rec2: '23-10' },
      { id: 'w3', round: 1, s1: 5, t1: 'Wisconsin', s2: 12, t2: 'High Point', status: 'upcoming', tip: 'Thu 1:50 PM', network: 'TBS', spread: 'WISC -8.5', total: '142.5', ml: '-380', prob1: 76, rec1: '24-9', rec2: '26-8' },
      { id: 'w4', round: 1, s1: 4, t1: 'Arkansas', s2: 13, t2: 'Hawaii', status: 'upcoming', tip: 'Thu 4:25 PM', network: 'TBS', spread: 'ARK -12.5', total: '156.5', ml: '-720', prob1: 85, rec1: '25-8', rec2: '22-12' },
      { id: 'w5', round: 1, s1: 6, t1: 'BYU', s2: 11, t2: 'TBD', t2PlayIn: 'pi2', status: 'upcoming', tip: 'Thu 7:25 PM', network: 'TBS', spread: 'BYU -3.5', total: '144.5', ml: '-165', prob1: 61, rec1: '24-9', rec2: '20-14' },
      { id: 'w6', round: 1, s1: 3, t1: 'Gonzaga', s2: 14, t2: 'Kennesaw St', status: 'upcoming', tip: 'Thu 10:00 PM', network: 'TBS', spread: 'GONZ -18.5', total: '158.5', ml: '-2500', prob1: 94, rec1: '28-5', rec2: '23-11' },
      { id: 'w7', round: 1, s1: 7, t1: 'Miami FL', s2: 10, t2: 'Missouri', status: 'upcoming', tip: 'Fri 10:10 PM', network: 'TruTV', spread: 'MIA -1.5', total: '146.5', ml: '-125', prob1: 54, rec1: '22-11', rec2: '21-12' },
      { id: 'w8', round: 1, s1: 2, t1: 'Purdue', s2: 15, t2: 'Queens', status: 'upcoming', tip: 'Fri 7:35 PM', network: 'TruTV', spread: 'PUR -22.5', total: '148.5', ml: '-4500', prob1: 97, rec1: '29-5', rec2: '21-13' }
    ]
  },
  south: {
    name: 'South',
    games: [
      { id: 's1', round: 1, s1: 1, t1: 'Florida', s2: 16, t2: 'TBD', t2PlayIn: 'pi1', status: 'upcoming', tip: 'Fri 9:25 PM', network: 'TNT', spread: 'FLA -24.5', total: '148.5', ml: '-6000', prob1: 97, rec1: '30-4', rec2: '20-14' },
      { id: 's2', round: 1, s1: 8, t1: 'Clemson', s2: 9, t2: 'Iowa', status: 'upcoming', tip: 'Fri 6:50 PM', network: 'TNT', spread: 'CLEM -1.5', total: '144.5', ml: '-115', prob1: 52, rec1: '21-12', rec2: '22-11' },
      { id: 's3', round: 1, s1: 5, t1: 'Vanderbilt', s2: 12, t2: 'McNeese', status: 'upcoming', tip: 'Thu 3:15 PM', network: 'TruTV', spread: 'VANDY -7.5', total: '152.5', ml: '-320', prob1: 74, rec1: '24-9', rec2: '27-7' },
      { id: 's4', round: 1, s1: 4, t1: 'Nebraska', s2: 13, t2: 'Troy', status: 'upcoming', tip: 'Thu 12:40 PM', network: 'TruTV', spread: 'NEB -10.5', total: '146.5', ml: '-500', prob1: 81, rec1: '25-8', rec2: '24-10' },
      { id: 's5', round: 1, s1: 6, t1: 'North Carolina', s2: 11, t2: 'VCU', status: 'upcoming', tip: 'Thu 6:50 PM', network: 'TNT', spread: 'UNC -6.5', total: '148.5', ml: '-280', prob1: 72, rec1: '23-10', rec2: '22-12' },
      { id: 's6', round: 1, s1: 3, t1: 'Illinois', s2: 14, t2: 'Penn', status: 'upcoming', tip: 'Thu 9:25 PM', network: 'TNT', spread: 'ILL -16.5', total: '146.5', ml: '-1800', prob1: 93, rec1: '27-6', rec2: '21-9' },
      { id: 's7', round: 1, s1: 7, t1: 'Saint Marys', s2: 10, t2: 'Texas A&M', status: 'upcoming', tip: 'Thu 7:35 PM', network: 'TruTV', spread: 'SMC -2.5', total: '132.5', ml: '-140', prob1: 57, rec1: '24-9', rec2: '22-11' },
      { id: 's8', round: 1, s1: 2, t1: 'Houston', s2: 15, t2: 'Idaho', status: 'upcoming', tip: 'Thu 10:10 PM', network: 'TruTV', spread: 'HOU -24.5', total: '134.5', ml: '-5500', prob1: 97, rec1: '29-4', rec2: '19-14' }
    ]
  },
  midwest: {
    name: 'Midwest',
    games: [
      { id: 'm1', round: 1, s1: 1, t1: 'Michigan', s2: 16, t2: 'TBD', t2PlayIn: 'pi3', status: 'upcoming', tip: 'Thu 7:10 PM', network: 'CBS', spread: 'MICH -26.5', total: '144.5', ml: '-7000', prob1: 98, rec1: '30-4', rec2: '18-15' },
      { id: 'm2', round: 1, s1: 8, t1: 'Georgia', s2: 9, t2: 'Saint Louis', status: 'upcoming', tip: 'Thu 9:45 PM', network: 'CBS', spread: 'UGA -1.5', total: '136.5', ml: '-120', prob1: 53, rec1: '21-12', rec2: '22-11' },
      { id: 'm3', round: 1, s1: 5, t1: 'Texas Tech', s2: 12, t2: 'Akron', status: 'upcoming', tip: 'Fri 12:40 PM', network: 'TruTV', spread: 'TTU -9.5', total: '138.5', ml: '-440', prob1: 79, rec1: '24-9', rec2: '25-9' },
      { id: 'm4', round: 1, s1: 4, t1: 'Alabama', s2: 13, t2: 'Hofstra', status: 'upcoming', tip: 'Fri 3:15 PM', network: 'TruTV', spread: 'BAMA -11.5', total: '154.5', ml: '-620', prob1: 84, rec1: '25-8', rec2: '23-11' },
      { id: 'm5', round: 1, s1: 6, t1: 'Tennessee', s2: 11, t2: 'TBD', t2PlayIn: 'pi4', status: 'upcoming', tip: 'Fri 4:25 PM', network: 'TBS', spread: 'TENN -5.5', total: '132.5', ml: '-240', prob1: 69, rec1: '24-9', rec2: '21-12' },
      { id: 'm6', round: 1, s1: 3, t1: 'Virginia', s2: 14, t2: 'Wright St', status: 'upcoming', tip: 'Fri 1:50 PM', network: 'TBS', spread: 'UVA -15.5', total: '128.5', ml: '-1400', prob1: 92, rec1: '27-6', rec2: '22-12' },
      { id: 'm7', round: 1, s1: 7, t1: 'Kentucky', s2: 10, t2: 'Santa Clara', status: 'upcoming', tip: 'Fri 12:15 PM', network: 'CBS', spread: 'UK -7.5', total: '148.5', ml: '-320', prob1: 74, rec1: '23-10', rec2: '24-9' },
      { id: 'm8', round: 1, s1: 2, t1: 'Iowa State', s2: 15, t2: 'Tennessee St', status: 'upcoming', tip: 'Fri 2:50 PM', network: 'CBS', spread: 'ISU -20.5', total: '136.5', ml: '-3200', prob1: 96, rec1: '28-5', rec2: '20-13' }
    ]
  }
};

export const networkStreaming = {
  'CBS': ['Paramount+', 'YouTube TV'],
  'TBS': ['Max', 'Sling', 'YouTube TV'],
  'TNT': ['Max', 'Sling', 'YouTube TV'],
  'TruTV': ['Max', 'Sling', 'YouTube TV']
};

export const getStreaming = (network) => networkStreaming[network] || [];

// SCORING SYSTEM
export const scoringSystem = {
  rounds: { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3 },
  roundNames: { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'F4', 6: 'Champ' },
  getSeedMultiplier: (seed) => {
    if (seed >= 14) return 2.0;
    if (seed >= 9) return 1.75;
    if (seed >= 5) return 1.5;
    return 1.0;
  }
};

// Badge definitions
export const badges = {
  glory: [
    { id: 'hot_start', name: 'Hot Start', icon: '🔥', desc: 'Win 3+ games on Day 1' },
    { id: 'giant_slayer', name: 'Giant Slayer', icon: '💀', desc: '12+ seed beats a 5 or higher' },
    { id: 'clean_sweep', name: 'Clean Sweep', icon: '🧹', desc: 'All your teams win in a round' },
    { id: 'buzzer_beater', name: 'Buzzer Beater', icon: '⚡', desc: 'Win by 3 points or less' },
    { id: 'upset_special', name: 'Upset Special', icon: '🎰', desc: 'Beat a 10+ pt favorite' },
    { id: 'chalk', name: 'Chalk', icon: '💪', desc: 'All 1-4 seeds advance past R1' },
    { id: 'king_chaos', name: 'King of Chaos', icon: '👑', desc: '3+ upsets in one round' },
    { id: 'oracle', name: 'Oracle', icon: '🔮', desc: 'Have a Final Four team' },
    { id: 'sharp_shooter', name: 'Sharp Shooter', icon: '🎯', desc: 'Win by 20+ points' },
    { id: 'lucky_break', name: 'Lucky Break', icon: '🍀', desc: 'Win after trailing 10+ in 2H' },
    { id: 'champion', name: 'Champion', icon: '🏀', desc: 'Win the National Championship' }
  ],
  shame: [
    { id: 'dumpster_fire', name: 'Dumpster Fire', icon: '🗑️', desc: 'Lose 3+ games in a single day' },
    { id: 'clown_pick', name: 'Clown Pick', icon: '🤡', desc: '1-4 seed loses to 13-16 seed' },
    { id: 'choke_artist', name: 'Choke Artist', icon: '😱', desc: 'Blow a 10+ point 2nd half lead' },
    { id: 'free_fall', name: 'Free Fall', icon: '📉', desc: 'Drop from 1st to last in one round' },
    { id: 'bracket_buster', name: 'Bracket Buster', icon: '💸', desc: 'Highest seed eliminated in R1' },
    { id: 'first_blood', name: 'First Blood', icon: '💀', desc: 'First to lose a team' },
    { id: 'ice_cold', name: 'Ice Cold', icon: '🥶', desc: 'Go 0-3 or worse in a day' },
    { id: 'blowout_victim', name: 'Blowout Victim', icon: '😵', desc: 'Lose by 25+ points' },
    { id: 'graveyard', name: 'Graveyard', icon: '🪦', desc: 'Have fewest teams remaining' },
    { id: 'paper_tiger', name: 'Paper Tiger', icon: '🐔', desc: '#1 seed loses before Elite 8' }
  ]
};
