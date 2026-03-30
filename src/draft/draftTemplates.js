// Pre-loaded tournament templates for the draft system
// Players are ordered by world ranking (best to worst) for auto-pick

const templates = {
  'masters-2026': {
    name: 'The Masters 2026',
    sport: 'golf',
    icon: '\u26F3',
    description: 'Augusta National Golf Club \u2022 April 9-12, 2026',
    suggestedRosterSize: { 2: 10, 3: 8, 4: 6, 5: 5, 6: 4, 7: 4, 8: 3 },
    defaultTimer: 120,
    espnEventId: '401811941',
    theme: {
      '--bg': '#0c1a12',
      '--bg2': '#0a1f14',
      '--card': '#112a1a',
      '--border': '#1a3d28',
      '--cyan': '#d4af37',
      '--green': '#006B54',
      '--red': '#c41e3a',
      '--text': '#f5f1e8',
      '--text2': '#a8b5a0',
    },
    // Players ordered by OWGR (Official World Golf Ranking) as of March 2026
    // Each entry: { name, country (ISO 3166-1 alpha-2), owgr }
    players: [
      { name: 'Scottie Scheffler', country: 'US', owgr: 1 },
      { name: 'Rory McIlroy', country: 'GB', owgr: 2 },
      { name: 'Xander Schauffele', country: 'US', owgr: 3 },
      { name: 'Collin Morikawa', country: 'US', owgr: 4 },
      { name: 'Ludvig Aberg', country: 'SE', owgr: 5 },
      { name: 'Jon Rahm', country: 'ES', owgr: 6 },
      { name: 'Bryson DeChambeau', country: 'US', owgr: 7 },
      { name: 'Viktor Hovland', country: 'NO', owgr: 8 },
      { name: 'Patrick Cantlay', country: 'US', owgr: 9 },
      { name: 'Tommy Fleetwood', country: 'GB', owgr: 10 },
      { name: 'Cameron Young', country: 'US', owgr: 11 },
      { name: 'Matt Fitzpatrick', country: 'GB', owgr: 12 },
      { name: 'Justin Rose', country: 'GB', owgr: 13 },
      { name: 'Hideki Matsuyama', country: 'JP', owgr: 14 },
      { name: 'Shane Lowry', country: 'IE', owgr: 15 },
      { name: 'Sam Burns', country: 'US', owgr: 16 },
      { name: 'Russell Henley', country: 'US', owgr: 17 },
      { name: 'Justin Thomas', country: 'US', owgr: 18 },
      { name: 'Robert MacIntyre', country: 'GB', owgr: 19 },
      { name: 'Keegan Bradley', country: 'US', owgr: 20 },
      { name: 'Akshay Bhatia', country: 'US', owgr: 21 },
      { name: 'Min Woo Lee', country: 'AU', owgr: 22 },
      { name: 'Sepp Straka', country: 'AT', owgr: 23 },
      { name: 'Corey Conners', country: 'CA', owgr: 24 },
      { name: 'Jason Day', country: 'AU', owgr: 25 },
      { name: 'Brian Harman', country: 'US', owgr: 26 },
      { name: 'Tyrrell Hatton', country: 'GB', owgr: 27 },
      { name: 'Si Woo Kim', country: 'KR', owgr: 28 },
      { name: 'Kurt Kitayama', country: 'US', owgr: 29 },
      { name: 'Aaron Rai', country: 'GB', owgr: 30 },
      { name: 'Harris English', country: 'US', owgr: 31 },
      { name: 'Ryan Fox', country: 'NZ', owgr: 32 },
      { name: 'Adam Scott', country: 'AU', owgr: 33 },
      { name: 'Cameron Smith', country: 'AU', owgr: 34 },
      { name: 'Dustin Johnson', country: 'US', owgr: 35 },
      { name: 'Jordan Spieth', country: 'US', owgr: 36 },
      { name: 'Chris Gotterup', country: 'US', owgr: 37 },
      { name: 'Ben Griffin', country: 'US', owgr: 38 },
      { name: 'Jacob Bridgeman', country: 'US', owgr: 39 },
      { name: 'J.J. Spaun', country: 'US', owgr: 40 },
      { name: 'Alex Noren', country: 'SE', owgr: 41 },
      { name: 'Patrick Reed', country: 'US', owgr: 42 },
      { name: 'Maverick McNealy', country: 'US', owgr: 43 },
      { name: 'Ryan Gerard', country: 'US', owgr: 44 },
      { name: 'Daniel Berger', country: 'US', owgr: 45 },
      { name: 'Nicolas Echavarria', country: 'CO', owgr: 46 },
      { name: 'Jake Knapp', country: 'US', owgr: 47 },
      { name: 'Matt McCarty', country: 'US', owgr: 48 },
      { name: 'Nicolai Hojgaard', country: 'DK', owgr: 49 },
      { name: 'Michael Brennan', country: 'US', owgr: 50 },
      { name: 'Samuel Stevens', country: 'US', owgr: 51 },
      { name: 'Andrew Novak', country: 'US', owgr: 52 },
      { name: 'Kristoffer Reitan', country: 'NO', owgr: 53 },
      { name: 'Marco Penge', country: 'GB', owgr: 54 },
      { name: 'Max Greyserman', country: 'US', owgr: 55 },
      { name: 'Harry Hall', country: 'GB', owgr: 56 },
      { name: 'Michael Kim', country: 'US', owgr: 57 },
      { name: 'Carlos Ortiz', country: 'MX', owgr: 58 },
      { name: 'Sami Valimaki', country: 'FI', owgr: 59 },
      { name: 'Gary Woodland', country: 'US', owgr: 60 },
      { name: 'Haotong Li', country: 'CN', owgr: 61 },
      { name: 'Casey Jarvis', country: 'ZA', owgr: 62 },
      { name: 'Rasmus Neergaard-Petersen', country: 'DK', owgr: 63 },
      { name: 'Aldrich Potgieter', country: 'ZA', owgr: 64 },
      { name: 'Naoyuki Kataoka', country: 'JP', owgr: 65 },
      { name: 'Tom McKibbin', country: 'GB', owgr: 66 },
      { name: 'Rasmus Hojgaard', country: 'DK', owgr: 67 },
      { name: 'Phil Mickelson', country: 'US', owgr: 68 },
      { name: 'Sergio Garcia', country: 'ES', owgr: 69 },
      { name: 'Bubba Watson', country: 'US', owgr: 70 },
      { name: 'Charl Schwartzel', country: 'ZA', owgr: 71 },
      { name: 'Zach Johnson', country: 'US', owgr: 72 },
      { name: 'Danny Willett', country: 'GB', owgr: 73 },
      { name: 'Jose Maria Olazabal', country: 'ES', owgr: 74 },
      { name: 'Angel Cabrera', country: 'AR', owgr: 75 },
      { name: 'Mike Weir', country: 'CA', owgr: 76 },
      { name: 'Fred Couples', country: 'US', owgr: 77 },
      { name: 'Vijay Singh', country: 'FJ', owgr: 78 },
      { name: 'Tiger Woods', country: 'US', owgr: 79 },
      { name: 'Brian Campbell', country: 'US', owgr: 80 },
      { name: 'Jackson Herrington', country: 'US', owgr: 81 },
      { name: 'Brandon Holtz', country: 'US', owgr: 82 },
      { name: 'Mason Howell', country: 'US', owgr: 83 },
      { name: 'Ethan Fang', country: 'US', owgr: 84 },
      { name: 'Johnny Keefer', country: 'US', owgr: 85 },
      { name: 'Fifa Laopakdee', country: 'TH', owgr: 86 },
      { name: 'Mateo Pulcini', country: 'AR', owgr: 87 },
    ]
  }
};

export function getTemplates() {
  return Object.entries(templates).map(([id, t]) => ({
    id,
    name: t.name,
    sport: t.sport,
    icon: t.icon,
    description: t.description,
    playerCount: t.players.length
  }));
}

export function getTemplate(id) {
  return templates[id] || null;
}

export function getSuggestedRosterSize(templateId, ownerCount) {
  const t = templates[templateId];
  if (!t) return 5;
  return t.suggestedRosterSize[ownerCount] || Math.floor(t.players.length / ownerCount);
}

// Apply a tournament theme to the document root (CSS custom properties)
// Saves original values so we can revert cleanly
let originalTheme = null;

export function applyTheme(templateId) {
  const t = templates[templateId];
  if (!t?.theme) return;

  const root = document.documentElement;

  // Save original values on first apply
  if (!originalTheme) {
    originalTheme = {};
    Object.keys(t.theme).forEach(prop => {
      originalTheme[prop] = getComputedStyle(root).getPropertyValue(prop).trim();
    });
  }

  // Apply tournament theme
  Object.entries(t.theme).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
}

export function removeTheme() {
  if (!originalTheme) return;
  const root = document.documentElement;
  Object.entries(originalTheme).forEach(([prop, value]) => {
    if (value) {
      root.style.setProperty(prop, value);
    } else {
      root.style.removeProperty(prop);
    }
  });
  originalTheme = null;
}

export function getTheme(templateId) {
  return templates[templateId]?.theme || null;
}

export default templates;
