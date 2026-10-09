// Preview metadata only. A gallery entry never grants access or launches an app.
// These are the same separately installed games offered by the original room.
// Explicit contracts: a catalog key is not necessarily the download repository.
export const FAMILY_GAME_DOWNLOADS = Object.freeze({
  'berean-rpg': { repository: 'vexonastudios/berean-rpg-releases', asset: 'BereanRPG-Setup.exe' },
  'family-paintball-showdown': { repository: 'vexonastudios/family-paintball-showdown-releases', asset: 'FamilyPaintballShowdown-Setup.exe' },
  'rally-rascals': { repository: 'vexonastudios/rally-rascals-releases', asset: 'RallyRascals-Setup.exe' },
  'conquering-canaan': { repository: 'vexonastudios/conquering-canaan-releases', asset: 'ConqueringOfCanaan-Setup.exe' },
  'mountain-rush': { repository: 'vexonastudios/atv-racing-releases', asset: 'MountainRush-Windows.zip' },
  'marshland-hunt': { repository: 'vexonastudios/huntinggame-releases', asset: 'MarshlandHunt-Setup.exe', available: true }
});
export function familyGameDownloadUrl(key) {
  const game = FAMILY_GAME_DOWNLOADS[key];
  return game ? 'https://github.com/' + game.repository + '/releases/latest/download/' + game.asset : null;
}
export const FAMILY_GAME_PREVIEWS = Object.freeze([
  { id: 'berean-rpg', name: 'The Lesson Village', genre: 'Explore & learn', icon: 'trees', color: '#58dbac', image: 'lesson-village.webp', alt: 'The Lesson Village: paths, houses and the village square', description: 'Explore a growing village, meet its people and learn through an adventure of your own.', players: 'Single player' },
  { id: 'family-paintball-showdown', name: 'Family Paintball Showdown', genre: 'Team action', icon: 'crosshair', color: '#c49cff', image: 'paintball.webp', alt: 'Family Paintball Showdown: a paintball match in the downtown arena', description: 'Choose your arena and team up for colorful family paintball matches.', players: 'Up to 12 players · home network' },
  { id: 'rally-rascals', name: 'Rally Rascals', genre: 'Racing', icon: 'flag', color: '#ffc566', image: 'rally-rascals.webp', alt: 'Rally Rascals: karts lined up on the race track', description: 'Pick a kart, race around lively tracks and challenge your family to the finish line.', players: 'Up to 12 players · home network' },
  { id: 'conquering-canaan', name: 'Conquering of Canaan', genre: 'Biblical strategy', icon: 'shield', color: '#6bcfff', image: 'canaan.webp', alt: 'Conquering of Canaan: a settlement in the Valley of Elah', description: 'Build a settlement, gather resources and lead your people in a Biblical strategy game.', players: 'Up to 4 players · home network' },
  { id: 'mountain-rush', name: 'Mountain Rush', genre: 'Downhill ATV racing', icon: 'mountain', color: '#d7f778', image: 'mountain-rush.webp', alt: 'Mountain Rush: ATV riders racing down a muddy mountain trail', images: [{ image: 'mountain-rush.webp', alt: 'ATV racers on a mountain trail' }, { image: 'mountain-rush-wildfall.webp', alt: 'Wildfall: roadless descent with short race and full descent options' }], description: 'Race down six mountains on an ATV, hit jumps, slide through mud, and race your family over LAN. Choose quick 2–3 minute races, full descents, or roadless Wildfall.', players: '1–6 players · home network · keyboard or controller' },
  { id: 'marshland-hunt', name: 'Critter County Hunting', genre: 'Hunting & clay practice', icon: 'crosshair', color: '#a8cc86', image: 'marshland-hunt.webp', alt: 'Critter County Hunting: reeds and water in the marsh', images: [{ image: 'marshland-hunt.webp', alt: 'The marsh in Critter County Hunting' }, { image: 'marshland-woods.webp', alt: 'Squirrel hunting in the Missouri woods' }, { image: 'marshland-clay.webp', alt: 'Solo clay-target practice at the range' }], description: 'Explore the marsh, Missouri woods and a farm with your family. Choose duck, squirrel or hog hunting, or practice your accuracy at the clay range.', players: 'Solo or up to 12 players · home network; clay practice: solo or 1v1 LAN', details: 'Windows x64 · Gameplay and recorded voices work offline. Includes stylized animal hunting and a clay-target activity.', help: 'One player hosts and the others join on the same home network, using matching game versions. Esc opens the exit menu; F11 toggles full screen; Alt+F4 exits. Ctrl+Shift+G returns to BodeeGuard. Saves, settings and camp progress are shared on the same Windows account; clay records use the entered shooter name.', availability: 'Available for Windows · Play solo or with your family on the same home network.' },
]);
