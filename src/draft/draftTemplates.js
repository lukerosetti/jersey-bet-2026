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
    players: [
      'Scottie Scheffler',
      'Rory McIlroy',
      'Xander Schauffele',
      'Collin Morikawa',
      'Ludvig Aberg',
      'Jon Rahm',
      'Bryson DeChambeau',
      'Viktor Hovland',
      'Patrick Cantlay',
      'Tommy Fleetwood',
      'Cameron Young',
      'Matt Fitzpatrick',
      'Justin Rose',
      'Hideki Matsuyama',
      'Shane Lowry',
      'Sam Burns',
      'Russell Henley',
      'Justin Thomas',
      'Robert MacIntyre',
      'Keegan Bradley',
      'Akshay Bhatia',
      'Min Woo Lee',
      'Sepp Straka',
      'Corey Conners',
      'Jason Day',
      'Brian Harman',
      'Tyrrell Hatton',
      'Si Woo Kim',
      'Kurt Kitayama',
      'Aaron Rai',
      'Harris English',
      'Ryan Fox',
      'Adam Scott',
      'Cameron Smith',
      'Dustin Johnson',
      'Jordan Spieth',
      'Chris Gotterup',
      'Ben Griffin',
      'Jacob Bridgeman',
      'J.J. Spaun',
      'Alex Noren',
      'Patrick Reed',
      'Maverick McNealy',
      'Ryan Gerard',
      'Daniel Berger',
      'Nicolas Echavarria',
      'Jake Knapp',
      'Matt McCarty',
      'Nicolai Hojgaard',
      'Michael Brennan',
      'Samuel Stevens',
      'Andrew Novak',
      'Kristoffer Reitan',
      'Marco Penge',
      'Max Greyserman',
      'Harry Hall',
      'Michael Kim',
      'Carlos Ortiz',
      'Sami Valimaki',
      'Gary Woodland',
      'Haotong Li',
      'Casey Jarvis',
      'Rasmus Neergaard-Petersen',
      'Aldrich Potgieter',
      'Naoyuki Kataoka',
      'Tom McKibbin',
      'Rasmus Hojgaard',
      'Phil Mickelson',
      'Sergio Garcia',
      'Bubba Watson',
      'Charl Schwartzel',
      'Zach Johnson',
      'Danny Willett',
      'Jose Maria Olazabal',
      'Angel Cabrera',
      'Mike Weir',
      'Fred Couples',
      'Vijay Singh',
      'Tiger Woods',
      'Brian Campbell',
      'Jackson Herrington',
      'Brandon Holtz',
      'Mason Howell',
      'Ethan Fang',
      'Johnny Keefer',
      'Fifa Laopakdee',
      'Mateo Pulcini'
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

export default templates;
