import { useState, useEffect } from 'react';
import { normalizeTeamName } from '../../data/useESPN';

const ODDS_API_KEY = process.env.REACT_APP_ODDS_API_KEY || '';
const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=';

export function useOdds() {
  const [odds, setOdds] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ODDS_API_KEY) return;

    const fetchOdds = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${ODDS_API_URL}${ODDS_API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch odds');
        const data = await response.json();

        const oddsMap = {};
        data.forEach(event => {
          const team1 = normalizeTeamName(event.home_team || '');
          const team2 = normalizeTeamName(event.away_team || '');
          if (!team1 || !team2) return;

          const gameKey = [team1, team2].sort().join('_');

          // Use the first bookmaker with available data (consensus/first available)
          const bookmaker = event.bookmakers?.[0];
          if (!bookmaker) return;

          let spread = null;
          let spreadTeam = null;
          let total = null;
          let ml1 = null;
          let ml2 = null;

          bookmaker.markets?.forEach(market => {
            if (market.key === 'spreads') {
              // Find spread for team1 (home)
              const outcome = market.outcomes?.[0];
              if (outcome) {
                spread = outcome.point;
                spreadTeam = normalizeTeamName(outcome.name || '');
              }
            } else if (market.key === 'totals') {
              const overOutcome = market.outcomes?.find(o => o.name === 'Over');
              if (overOutcome) {
                total = overOutcome.point;
              }
            } else if (market.key === 'h2h') {
              market.outcomes?.forEach(outcome => {
                const normalized = normalizeTeamName(outcome.name || '');
                if (normalized === team1) {
                  ml1 = outcome.price;
                } else if (normalized === team2) {
                  ml2 = outcome.price;
                }
              });
            }
          });

          oddsMap[gameKey] = {
            spread,
            spreadTeam,
            total,
            ml1,
            ml2,
            team1,
            team2
          };
        });

        setOdds(oddsMap);
      } catch (err) {
        console.warn('Error fetching odds:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOdds();
    // Refresh odds every 5 minutes
    const interval = setInterval(fetchOdds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { odds, isLoading };
}
