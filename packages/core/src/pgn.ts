import { GameManager } from './game-manager';

/**
 * PGN header tag interface
 */
export interface PgnTag {
  name: string;
  value: string;
}

/**
 * Standard PGN tags
 */
export enum StandardTag {
  EVENT = 'Event',
  SITE = 'Site',
  DATE = 'Date',
  ROUND = 'Round',
  WHITE = 'White',
  BLACK = 'Black',
  RESULT = 'Result',
  WHITE_ELO = 'WhiteElo',
  BLACK_ELO = 'BlackElo',
  ECO = 'ECO',
  OPENING = 'Opening',
  TIME_CONTROL = 'TimeControl',
  TERMINATION = 'Termination',
}

/**
 * Exports the current game state to PGN format
 * @param game GameManager instance
 * @param tags Optional array of PGN tags
 * @returns PGN string
 */
export function exportPGN(game: GameManager, tags: PgnTag[] = []): string {
  // Get the raw PGN
  let pgn = game.getPGN();
  
  // Replace default tags with custom ones
  const processedTags = new Set<string>();
  
  tags.forEach(tag => {
    const regex = new RegExp(`\\[${tag.name} "[^"]*"\\]`, 'i');
    if (pgn.match(regex)) {
      pgn = pgn.replace(regex, `[${tag.name} "${tag.value}"]`);
    } else {
      pgn = `[${tag.name} "${tag.value}"]\n${pgn}`;
    }
    processedTags.add(tag.name.toLowerCase());
  });
  
  return pgn;
}

/**
 * Creates a standard set of PGN tags
 * @param white White player name
 * @param black Black player name
 * @param result Game result
 * @param timeControl Time control string
 * @returns Array of PGN tags
 */
export function createStandardTags(
  white: string,
  black: string,
  result: string = '*',
  timeControl: string = '-'
): PgnTag[] {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '.');
  
  return [
    { name: StandardTag.EVENT, value: 'TwentyFish Game' },
    { name: StandardTag.SITE, value: 'TwentyFish App' },
    { name: StandardTag.DATE, value: dateStr },
    { name: StandardTag.ROUND, value: '1' },
    { name: StandardTag.WHITE, value: white },
    { name: StandardTag.BLACK, value: black },
    { name: StandardTag.RESULT, value: result },
    { name: StandardTag.TIME_CONTROL, value: timeControl },
  ];
}

/**
 * Imports a PGN string into a GameManager
 * @param pgn PGN string to import
 * @returns A new GameManager instance with the imported game, or null if import failed
 */
export function importPGN(pgn: string): GameManager | null {
  try {
    const game = new GameManager();
    const success = game.loadPGN(pgn);
    
    return success ? game : null;
  } catch (e) {
    console.error('Error importing PGN:', e);
    return null;
  }
}

/**
 * Extracts tags from a PGN string
 * @param pgn PGN string
 * @returns Array of PGN tags
 */
export function extractTags(pgn: string): PgnTag[] {
  const tags: PgnTag[] = [];
  const tagRegex = /\[([^\s]+)\s+"([^"]*)"\]/g;
  
  let match;
  while ((match = tagRegex.exec(pgn)) !== null) {
    tags.push({
      name: match[1],
      value: match[2]
    });
  }
  
  return tags;
}

/**
 * Gets a specific tag value from a PGN string
 * @param pgn PGN string
 * @param tagName Tag name to find
 * @returns Tag value or null if not found
 */
export function getTagValue(pgn: string, tagName: string): string | null {
  const tags = extractTags(pgn);
  const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
  return tag ? tag.value : null;
}
