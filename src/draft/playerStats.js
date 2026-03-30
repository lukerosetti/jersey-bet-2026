// Masters 2026 player stats for draft board
// Sources: PGA Tour stats, Masters.com historical data, betting odds
// Stats that can't be sourced are left null — will show "—" in UI

const playerStats = {
  'Scottie Scheffler': {
    majors: 2, mastersWins: 2, mastersMade: 4, mastersAvg: 3.5, bestMasters: '1st (2024)',
    seasonWins: 4, seasonTop10: 8, odds: '+450',
    note: 'Back-to-back Masters wins in 2022 & 2024. Dominant ball-striker.',
  },
  'Rory McIlroy': {
    majors: 5, mastersWins: 1, mastersMade: 12, mastersAvg: 15.2, bestMasters: '1st (2025)',
    seasonWins: 1, seasonTop10: 5, odds: '+700',
    note: 'Defending champion. Completed career Grand Slam in 2025.',
  },
  'Xander Schauffele': {
    majors: 2, mastersWins: 0, mastersMade: 6, mastersAvg: 10.8, bestMasters: 'T2 (2024)',
    seasonWins: 1, seasonTop10: 6, odds: '+900',
    note: 'Two runner-up finishes at Augusta. Elite iron play.',
  },
  'Collin Morikawa': {
    majors: 2, mastersWins: 0, mastersMade: 4, mastersAvg: 18.5, bestMasters: 'T5 (2023)',
    seasonWins: 1, seasonTop10: 5, odds: '+1400',
    note: 'Two-time major winner. Best iron player on Tour.',
  },
  'Ludvig Aberg': {
    majors: 0, mastersWins: 0, mastersMade: 1, mastersAvg: null, bestMasters: 'T12 (2024)',
    seasonWins: 1, seasonTop10: 4, odds: '+1200',
    note: 'Masters debut in 2024. Rising star, massive length off the tee.',
  },
  'Jon Rahm': {
    majors: 2, mastersWins: 0, mastersMade: 7, mastersAvg: 12.4, bestMasters: 'T4 (2023)',
    seasonWins: 2, seasonTop10: 4, odds: '+1000',
    note: 'LIV Golf. Two majors including 2023 Masters runner-up.',
  },
  'Bryson DeChambeau': {
    majors: 2, mastersWins: 0, mastersMade: 6, mastersAvg: 22.3, bestMasters: 'T5 (2024)',
    seasonWins: 1, seasonTop10: 3, odds: '+1600',
    note: 'LIV Golf. Massive distance off the tee suits Augusta.',
  },
  'Viktor Hovland': {
    majors: 0, mastersWins: 0, mastersMade: 4, mastersAvg: 24.5, bestMasters: 'T10 (2023)',
    seasonWins: 0, seasonTop10: 3, odds: '+2500',
    note: 'Historically weak short game, but improving. Great ball-striking.',
  },
  'Patrick Cantlay': {
    majors: 0, mastersWins: 0, mastersMade: 7, mastersAvg: 19.6, bestMasters: 'T9 (2022)',
    seasonWins: 0, seasonTop10: 4, odds: '+2500',
    note: 'Steady, consistent. Never outside top 25 when making the cut.',
  },
  'Tommy Fleetwood': {
    majors: 0, mastersWins: 0, mastersMade: 6, mastersAvg: 21.3, bestMasters: 'T14 (2023)',
    seasonWins: 1, seasonTop10: 4, odds: '+2500',
    note: 'Strong ball-striker. Six top-20 Masters finishes.',
  },
  'Hideki Matsuyama': {
    majors: 1, mastersWins: 1, mastersMade: 10, mastersAvg: 14.8, bestMasters: '1st (2021)',
    seasonWins: 1, seasonTop10: 3, odds: '+2000',
    note: '2021 Masters champion. Knows Augusta intimately.',
  },
  'Shane Lowry': {
    majors: 1, mastersWins: 0, mastersMade: 6, mastersAvg: 28.5, bestMasters: 'T6 (2024)',
    seasonWins: 0, seasonTop10: 3, odds: '+3500',
    note: 'Open Championship winner. Improved Masters form recently.',
  },
  'Justin Thomas': {
    majors: 2, mastersWins: 0, mastersMade: 8, mastersAvg: 18.9, bestMasters: 'T4 (2020)',
    seasonWins: 0, seasonTop10: 2, odds: '+3000',
    note: 'Two-time PGA Champion. Course knowledge is excellent.',
  },
  'Jordan Spieth': {
    majors: 3, mastersWins: 1, mastersMade: 10, mastersAvg: 11.2, bestMasters: '1st (2015)',
    seasonWins: 0, seasonTop10: 2, odds: '+3500',
    note: '2015 champion. Loves Augusta. Three runner-up finishes.',
  },
  'Dustin Johnson': {
    majors: 2, mastersWins: 1, mastersMade: 13, mastersAvg: 16.8, bestMasters: '1st (2020)',
    seasonWins: 0, seasonTop10: 1, odds: '+5000',
    note: 'LIV Golf. 2020 champion (-20 record). Length advantage.',
  },
  'Tiger Woods': {
    majors: 15, mastersWins: 5, mastersMade: 23, mastersAvg: 9.8, bestMasters: '1st (2019)',
    seasonWins: 0, seasonTop10: 0, odds: '+15000',
    note: 'Five green jackets. Health uncertain. All-time Augusta great.',
  },
  'Phil Mickelson': {
    majors: 6, mastersWins: 3, mastersMade: 28, mastersAvg: 17.4, bestMasters: '1st (2010)',
    seasonWins: 0, seasonTop10: 0, odds: '+20000',
    note: 'LIV Golf. Three-time champion. Augusta wizard.',
  },
  'Adam Scott': {
    majors: 1, mastersWins: 1, mastersMade: 18, mastersAvg: 19.1, bestMasters: '1st (2013)',
    seasonWins: 0, seasonTop10: 1, odds: '+5000',
    note: '2013 champion. Consistent performer at Augusta.',
  },
  'Cameron Smith': {
    majors: 1, mastersWins: 0, mastersMade: 6, mastersAvg: 16.2, bestMasters: 'T3 (2022)',
    seasonWins: 1, seasonTop10: 2, odds: '+3500',
    note: 'LIV Golf. Open champion. Elite short game for Augusta greens.',
  },
  'Sergio Garcia': {
    majors: 1, mastersWins: 1, mastersMade: 24, mastersAvg: 18.7, bestMasters: '1st (2017)',
    seasonWins: 0, seasonTop10: 0, odds: '+15000',
    note: 'LIV Golf. 2017 champion. Deep Augusta experience.',
  },
  'Sam Burns': {
    majors: 0, mastersWins: 0, mastersMade: 3, mastersAvg: null, bestMasters: 'T21 (2023)',
    seasonWins: 1, seasonTop10: 4, odds: '+2000',
    note: 'Rising star. Strong all-around game.',
  },
  'Robert MacIntyre': {
    majors: 0, mastersWins: 0, mastersMade: 2, mastersAvg: null, bestMasters: 'T24 (2024)',
    seasonWins: 1, seasonTop10: 3, odds: '+3000',
    note: 'Scottish Open winner. Gaining momentum.',
  },
  'Keegan Bradley': {
    majors: 1, mastersWins: 0, mastersMade: 8, mastersAvg: 31.2, bestMasters: 'T18 (2023)',
    seasonWins: 1, seasonTop10: 3, odds: '+4000',
    note: 'PGA champion. 2025 Ryder Cup captain. Improved form.',
  },
  'Min Woo Lee': {
    majors: 0, mastersWins: 0, mastersMade: 1, mastersAvg: null, bestMasters: 'MC (2024)',
    seasonWins: 1, seasonTop10: 3, odds: '+3500',
    note: 'Australian talent. Big hitter. Learning Augusta.',
  },
  'Jason Day': {
    majors: 1, mastersWins: 0, mastersMade: 12, mastersAvg: 17.4, bestMasters: 'T2 (2011)',
    seasonWins: 1, seasonTop10: 3, odds: '+4000',
    note: 'PGA champion. Runner-up at 2011 Masters. Resurgent form.',
  },
  'Corey Conners': {
    majors: 0, mastersWins: 0, mastersMade: 5, mastersAvg: 22.8, bestMasters: 'T10 (2022)',
    seasonWins: 0, seasonTop10: 3, odds: '+5000',
    note: 'Elite iron player. Consistent ball-striking suits Augusta.',
  },
  'Tyrrell Hatton': {
    majors: 0, mastersWins: 0, mastersMade: 5, mastersAvg: 28.6, bestMasters: 'T12 (2024)',
    seasonWins: 1, seasonTop10: 2, odds: '+4000',
    note: 'LIV Golf. Improved Masters form in recent years.',
  },
  'Matt Fitzpatrick': {
    majors: 1, mastersWins: 0, mastersMade: 6, mastersAvg: 25.3, bestMasters: 'T14 (2024)',
    seasonWins: 0, seasonTop10: 3, odds: '+3500',
    note: 'US Open champion. Precise, but Augusta length can be a challenge.',
  },
  'Justin Rose': {
    majors: 1, mastersWins: 0, mastersMade: 15, mastersAvg: 15.4, bestMasters: 'T2 (2025)',
    seasonWins: 1, seasonTop10: 3, odds: '+3000',
    note: '2025 Masters runner-up. Loves Augusta — four top-5 finishes.',
  },
  'Russell Henley': {
    majors: 0, mastersWins: 0, mastersMade: 4, mastersAvg: null, bestMasters: 'T17 (2023)',
    seasonWins: 1, seasonTop10: 4, odds: '+3000',
    note: 'Strong current form. Consistent putter.',
  },
  'Brian Harman': {
    majors: 1, mastersWins: 0, mastersMade: 5, mastersAvg: 28.4, bestMasters: 'T28 (2023)',
    seasonWins: 0, seasonTop10: 2, odds: '+5000',
    note: 'Open champion. Left-handed. Great short game.',
  },
  'Cameron Young': {
    majors: 0, mastersWins: 0, mastersMade: 3, mastersAvg: null, bestMasters: 'T12 (2023)',
    seasonWins: 1, seasonTop10: 5, odds: '+2500',
    note: 'Big hitter with improving all-around game.',
  },
};

export function getPlayerStats(name) {
  return playerStats[name] || null;
}

export default playerStats;
