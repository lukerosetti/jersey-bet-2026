import React, { createContext, useContext } from 'react';
import config from '../tournaments/active';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  return (
    <TournamentContext.Provider value={config}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
