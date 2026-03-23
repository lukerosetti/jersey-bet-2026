import { owners, playInGames, regions as staticRegions, finalFourGames, getOwner, scoringSystem } from '../data/bracketData';
import { mergeWithLiveData } from '../data/useESPN';
import { buildResolvedGames } from './helpers';

// Calculate owner standings
export function calculateStandings(liveGames, playInWinners, resolvedMap) {
  // Determine play-in losers from live game data
  const playInLosers = new Set();
  playInGames.forEach(pi => {
    const gameKey = [pi.t1, pi.t2].sort().join('_');
    const liveData = liveGames ? liveGames[gameKey] : null;
    if (liveData && liveData.status === 'final') {
      const winner = liveData.score1 > liveData.score2 ? liveData.team1 : liveData.team2;
      const loser = liveData.score1 > liveData.score2 ? liveData.team2 : liveData.team1;
      playInLosers.add(loser);
    }
  });

  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);

  return owners.map(owner => {
    let points = 0;
    let teamsAlive = owner.teams.length;
    let teamsEliminated = 0;
    const eliminatedTeams = [];
    const teamPoints = {};
    owner.teams.forEach(t => { teamPoints[t] = { team: t, seed: null, points: 0, status: 'alive', wins: 0, killedBy: null, score: null, round: null, gameId: null }; });

    // Check play-in eliminations
    owner.teams.forEach(team => {
      if (playInLosers.has(team)) {
        teamsAlive--;
        teamsEliminated++;
        const piGame = playInGames.find(pi => pi.t1 === team || pi.t2 === team);
        const gameKey = piGame ? [piGame.t1, piGame.t2].sort().join('_') : null;
        const liveData = gameKey && liveGames ? liveGames[gameKey] : null;
        const winner = liveData ? (liveData.score1 > liveData.score2 ? liveData.team1 : liveData.team2) : 'TBD';
        const winnerScore = liveData ? Math.max(liveData.score1, liveData.score2) : 0;
        const loserScore = liveData ? Math.min(liveData.score1, liveData.score2) : 0;
        eliminatedTeams.push({ team, seed: piGame?.forSeed || 16, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: 0 });
        if (teamPoints[team]) { teamPoints[team].status = 'eliminated'; teamPoints[team].killedBy = winner; teamPoints[team].score = `${loserScore}-${winnerScore}`; teamPoints[team].seed = piGame?.forSeed || 16; }
      }
    });
    // Check all games including later rounds and Final Four
    Object.values(resolved).forEach(game => {
        if (game && game.status === 'final') {
          const winner = game.sc1 > game.sc2 ? game.t1 : game.t2;
          const loser = game.sc1 > game.sc2 ? game.t2 : game.t1;
          const loserSeed = game.sc1 > game.sc2 ? game.s2 : game.s1;
          const winnerScore = Math.max(game.sc1, game.sc2);
          const loserScore = Math.min(game.sc1, game.sc2);

          if (owner.teams.includes(winner)) {
            const winnerSeed = game.sc1 > game.sc2 ? game.s1 : game.s2;
            const roundPoints = scoringSystem.rounds[game.round || 1] || 1;
            const multiplier = scoringSystem.getSeedMultiplier(winnerSeed);
            const earned = roundPoints * multiplier;
            points += earned;
            if (teamPoints[winner]) { teamPoints[winner].points += earned; teamPoints[winner].wins++; teamPoints[winner].seed = winnerSeed; }
          }
          if (owner.teams.includes(loser) && !playInLosers.has(loser)) {
            teamsAlive--;
            teamsEliminated++;
            eliminatedTeams.push({ team: loser, seed: loserSeed, killedBy: winner, score: `${loserScore}-${winnerScore}`, round: game.round || 1 });
            if (teamPoints[loser]) { teamPoints[loser].status = 'eliminated'; teamPoints[loser].killedBy = winner; teamPoints[loser].score = `${loserScore}-${winnerScore}`; teamPoints[loser].round = game.round || 1; teamPoints[loser].seed = loserSeed; }
          }
        }
    });
    // Calculate actual maxPossible per alive team based on seed and furthest round reached
    let maxPossible = points;
    owner.teams.forEach(team => {
      const isEliminated = eliminatedTeams.some(e => e.team === team) || playInLosers.has(team);
      if (isEliminated) return;
      // Find what round this team has reached (highest round where they won)
      let currentRound = 0;
      Object.values(resolved).forEach(g => {
        if (g.status === 'final' && g.sc1 != null && g.sc1 !== g.sc2) {
          const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
          if (winner === team) currentRound = Math.max(currentRound, g.round || 1);
        }
      });
      // Find this team's seed from any game they appear in
      let seed = null;
      Object.values(resolved).forEach(g => {
        if (g.t1 === team && g.s1) seed = g.s1;
        if (g.t2 === team && g.s2) seed = g.s2;
      });
      const multiplier = scoringSystem.getSeedMultiplier(seed);
      // Add remaining round points this team could earn
      for (let r = currentRound + 1; r <= 6; r++) {
        maxPossible += (scoringSystem.rounds[r] || 1) * multiplier;
      }
    });
    maxPossible = Math.round(maxPossible * 100) / 100;
    // Fill in seeds for teams that haven't been set yet
    Object.values(resolved).forEach(g => {
      if (g.t1 && teamPoints[g.t1] && !teamPoints[g.t1].seed) teamPoints[g.t1].seed = g.s1;
      if (g.t2 && teamPoints[g.t2] && !teamPoints[g.t2].seed) teamPoints[g.t2].seed = g.s2;
    });
    const teamData = Object.values(teamPoints).sort((a, b) => b.points - a.points || (a.status === 'alive' ? -1 : 1));
    return { ...owner, points: Math.round(points * 100) / 100, teamsAlive, teamsEliminated, eliminatedTeams, maxPossible, teamData };
  }).sort((a, b) => b.points - a.points || b.teamsAlive - a.teamsAlive);
}

// Calculate badges dynamically
export function calculateBadges(liveGames, playInWinners, resolvedMap) {
  const playerBadges = {};
  owners.forEach(o => { playerBadges[o.id] = { glory: [], shame: [] }; });

  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const completedGames = Object.values(resolved).filter(g => g.status === 'final')
    .sort((a, b) => {
      // Sort chronologically by startDate, then by round, then by game ID
      if (a.startDate && b.startDate) return new Date(a.startDate) - new Date(b.startDate);
      if (a.startDate) return -1;
      if (b.startDate) return 1;
      const roundDiff = (a.round || 1) - (b.round || 1);
      if (roundDiff !== 0) return roundDiff;
      return (a.id || '').localeCompare(b.id || '');
    });

  if (completedGames.length === 0) return playerBadges;

  const ownerStats = {};
  owners.forEach(o => { ownerStats[o.id] = { wins: 0, losses: 0, blowoutWins: 0, blowoutLosses: 0, closeWins: 0, upsets: 0, clownPicks: 0, bestBlowoutWin: null, bestCloseWin: null, bestUpset: null, bestBlowoutLoss: null, bestClownPick: null }; });

  const fmtGame = (wSeed, wName, wSc, lSeed, lName, lSc) => `(${wSeed}) ${wName} ${wSc}, (${lSeed}) ${lName} ${lSc}`;

  completedGames.forEach(game => {
    const t1Won = game.sc1 > game.sc2;
    const winner = t1Won ? game.t1 : game.t2;
    const loser = t1Won ? game.t2 : game.t1;
    const winnerSeed = t1Won ? game.s1 : game.s2;
    const loserSeed = t1Won ? game.s2 : game.s1;
    const winSc = t1Won ? game.sc1 : game.sc2;
    const loseSc = t1Won ? game.sc2 : game.sc1;
    const margin = winSc - loseSc;
    const winnerOwner = getOwner(winner);
    const loserOwner = getOwner(loser);
    const gameCtx = { winner, loser, winnerSeed, loserSeed, winSc, loseSc, margin };

    if (winnerOwner) {
      const s = ownerStats[winnerOwner.id];
      s.wins++;
      if (margin >= 20 && (!s.bestBlowoutWin || margin > s.bestBlowoutWin.margin)) { s.blowoutWins++; s.bestBlowoutWin = gameCtx; }
      else if (margin >= 20) { s.blowoutWins++; }
      if (margin <= 3 && (!s.bestCloseWin || margin < s.bestCloseWin.margin)) { s.closeWins++; s.bestCloseWin = gameCtx; }
      else if (margin <= 3) { s.closeWins++; }
      if (winnerSeed >= 12 && loserSeed <= 5) { s.upsets++; s.bestUpset = s.bestUpset || gameCtx; }
    }
    if (loserOwner) {
      const s = ownerStats[loserOwner.id];
      s.losses++;
      if (margin >= 25 && (!s.bestBlowoutLoss || margin > s.bestBlowoutLoss.margin)) { s.blowoutLosses++; s.bestBlowoutLoss = gameCtx; }
      else if (margin >= 25) { s.blowoutLosses++; }
      if (loserSeed <= 4 && winnerSeed >= 13) { s.clownPicks++; s.bestClownPick = s.bestClownPick || gameCtx; }
    }
  });

  owners.forEach(owner => {
    const s = ownerStats[owner.id];
    if (s.wins >= 3) playerBadges[owner.id].glory.push({ id: 'hot_start', detail: `${s.wins} wins` });
    if (s.upsets > 0) { const g = s.bestUpset; playerBadges[owner.id].glory.push({ id: 'giant_slayer', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.blowoutWins > 0) { const g = s.bestBlowoutWin; playerBadges[owner.id].glory.push({ id: 'sharp_shooter', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.closeWins > 0) { const g = s.bestCloseWin; playerBadges[owner.id].glory.push({ id: 'buzzer_beater', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.losses >= 3) playerBadges[owner.id].shame.push({ id: 'dumpster_fire', detail: `${s.losses} losses` });
    if (s.clownPicks > 0) { const g = s.bestClownPick; playerBadges[owner.id].shame.push({ id: 'clown_pick', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
    if (s.blowoutLosses > 0) { const g = s.bestBlowoutLoss; playerBadges[owner.id].shame.push({ id: 'blowout_victim', detail: fmtGame(g.winnerSeed, g.winner, g.winSc, g.loserSeed, g.loser, g.loseSc) }); }
  });

  if (completedGames.length > 0) {
    const firstLoss = completedGames[0];
    const t1Won = firstLoss.sc1 > firstLoss.sc2;
    const loser = t1Won ? firstLoss.t2 : firstLoss.t1;
    const loserOwner = getOwner(loser);
    if (loserOwner && !playerBadges[loserOwner.id].shame.some(b => b.id === 'first_blood')) {
      const winner = t1Won ? firstLoss.t1 : firstLoss.t2;
      const wSeed = t1Won ? firstLoss.s1 : firstLoss.s2;
      const lSeed = t1Won ? firstLoss.s2 : firstLoss.s1;
      const wSc = t1Won ? firstLoss.sc1 : firstLoss.sc2;
      const lSc = t1Won ? firstLoss.sc2 : firstLoss.sc1;
      playerBadges[loserOwner.id].shame.push({ id: 'first_blood', detail: fmtGame(wSeed, winner, wSc, lSeed, loser, lSc) });
    }
  }

  return playerBadges;
}

export function buildEnhancedStandings(liveGames, playInWinners, resolvedMap) {
  const resolved = resolvedMap || buildResolvedGames(liveGames, playInWinners);
  const standings = calculateStandings(liveGames, playInWinners, resolved);
  const allFinalGames = [];
  const teamSeeds = {};
  Object.values(resolved).forEach(game => {
    if (game.s1) teamSeeds[game.t1] = game.s1;
    if (game.s2) teamSeeds[game.t2] = game.s2;
    if (game.status === 'final') allFinalGames.push(game);
  });

  // Quick stats
  const totalGames = allFinalGames.length;
  let totalUpsets = 0, biggestUpset = null, closestGame = null;
  allFinalGames.forEach(g => {
    const winnerSeed = g.sc1 > g.sc2 ? g.s1 : g.s2;
    const loserSeed = g.sc1 > g.sc2 ? g.s2 : g.s1;
    const margin = Math.abs(g.sc1 - g.sc2);
    if (winnerSeed > loserSeed) {
      totalUpsets++;
      if (!biggestUpset || (winnerSeed - loserSeed) > (biggestUpset.seedDiff)) {
        biggestUpset = { winner: g.sc1 > g.sc2 ? g.t1 : g.t2, loser: g.sc1 > g.sc2 ? g.t2 : g.t1, winnerSeed, loserSeed, seedDiff: winnerSeed - loserSeed };
      }
    }
    if (!closestGame || margin < closestGame.margin) {
      closestGame = { t1: g.t1, t2: g.t2, sc1: g.sc1, sc2: g.sc2, margin };
    }
  });

  const enhanced = standings.map(player => {
    const teamPoints = {};
    const roundPoints = {};
    let wins = 0, losses = 0;
    const recentResults = [];

    player.teams.forEach(t => { teamPoints[t] = 0; });

    allFinalGames.forEach(g => {
      const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
      const loser = g.sc1 > g.sc2 ? g.t2 : g.t1;
      const winnerSeed = g.sc1 > g.sc2 ? g.s1 : g.s2;
      const margin = Math.abs(g.sc1 - g.sc2);
      const round = g.round || 1;

      if (player.teams.includes(winner)) {
        const pts = (scoringSystem.rounds[round] || 1) * scoringSystem.getSeedMultiplier(winnerSeed);
        teamPoints[winner] = (teamPoints[winner] || 0) + pts;
        roundPoints[round] = (roundPoints[round] || 0) + pts;
        wins++;
        recentResults.push({ team: winner, won: true, opponent: loser, margin, round });
      }
      if (player.teams.includes(loser)) {
        losses++;
        recentResults.push({ team: loser, won: false, opponent: winner, margin, round });
      }
    });

    // Upset count for this player
    let upsetCount = 0;
    allFinalGames.forEach(g => {
      const winner = g.sc1 > g.sc2 ? g.t1 : g.t2;
      const winnerSeed = g.sc1 > g.sc2 ? g.s1 : g.s2;
      const loserSeed = g.sc1 > g.sc2 ? g.s2 : g.s1;
      if (player.teams.includes(winner) && winnerSeed > loserSeed) upsetCount++;
    });

    // Build team details
    const teamDetails = player.teams.map(team => {
      const elim = player.eliminatedTeams?.find(e => e.team === team);
      return {
        name: team, seed: teamSeeds[team] || '?', points: Math.round((teamPoints[team] || 0) * 100) / 100,
        alive: !elim, eliminatedRound: elim ? (scoringSystem.roundNames[elim.round] || 'R64') : null, killedBy: elim?.killedBy || null
      };
    }).sort((a, b) => {
      if (a.alive && !b.alive) return -1;
      if (!a.alive && b.alive) return 1;
      if (a.alive) return (a.seed || 99) - (b.seed || 99);
      return 0;
    });

    const recent5 = recentResults.slice(-5);
    const recentWins = recent5.filter(r => r.won).length;
    const recentLosses = recent5.filter(r => !r.won).length;
    const momentum = recent5.length === 0 ? 'neutral' : recentWins > recentLosses ? 'up' : recentWins < recentLosses ? 'down' : 'neutral';

    return { ...player, teamPoints, roundPoints, wins, losses, recentResults: recent5, upsetCount, teamDetails, momentum };
  });

  return { standings: enhanced, quickStats: { totalGames, totalUpsets, biggestUpset, closestGame } };
}
