/**
 * Storage keys for the app
 */
export enum StorageKey {
  SETTINGS = 'twentyfish.settings',
  THEME = 'twentyfish.theme',
  CURRENT_GAME = 'twentyfish.currentGame',
  LEVEL = 'twentyfish.level',
  TIME_CONTROL = 'twentyfish.timeControl',
  BOARD_THEME = 'twentyfish.boardTheme',
  PIECE_SET = 'twentyfish.pieceSet',
  RECENT_GAMES = 'twentyfish.recentGames',
}

/**
 * Interface for app settings
 */
export interface AppSettings {
  showLegalMoves: boolean;
  showEvaluation: boolean;
  sound: boolean;
  showCoordinates: boolean;
  darkMode: boolean;
  useOpeningBook: boolean;
  openingBookDepth: number;
  allowTakeback: boolean;
  boardTheme: string;
  pieceSet: string;
}

/**
 * Default app settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  showLegalMoves: true,
  showEvaluation: true,
  sound: true,
  showCoordinates: true,
  darkMode: false,
  useOpeningBook: true,
  openingBookDepth: 10,
  allowTakeback: true,
  boardTheme: 'standard',
  pieceSet: 'standard',
};

/**
 * Saves settings to localStorage
 * @param key Storage key
 * @param value Value to save
 */
export function saveSettings<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

/**
 * Loads settings from localStorage
 * @param key Storage key
 * @param defaultValue Default value if key doesn't exist
 * @returns Parsed value from localStorage or defaultValue
 */
export function loadSettings<T>(key: StorageKey, defaultValue: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return defaultValue;
  }
}

/**
 * Removes an item from localStorage
 * @param key Storage key
 */
export function removeSettings(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing from localStorage:', e);
  }
}

/**
 * Clears all app settings from localStorage
 */
export function clearAllSettings(): void {
  try {
    Object.values(StorageKey).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
}

/**
 * Gets app settings with defaults for missing values
 * @returns Current app settings with defaults for missing fields
 */
export function getAppSettings(): AppSettings {
  const settings = loadSettings<AppSettings>(StorageKey.SETTINGS, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

/**
 * Saves app settings
 * @param settings Settings to save
 */
export function saveAppSettings(settings: Partial<AppSettings>): void {
  const currentSettings = getAppSettings();
  saveSettings(StorageKey.SETTINGS, { ...currentSettings, ...settings });
}

/**
 * Creates a sharable URL for the current game state
 * @param fen Current FEN position
 * @param level Engine level
 * @param timeControl Time control string
 * @returns URL with game state params
 */
export function createShareableUrl(fen: string, level: number, timeControl: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('fen', fen);
  url.searchParams.set('level', level.toString());
  url.searchParams.set('tc', timeControl);
  return url.toString();
}

/**
 * Parses a sharable URL to extract game state
 * @returns Object with parsed game state or null if no state found
 */
export function parseShareableUrl(): { fen: string; level: number; timeControl: string } | null {
  try {
    const url = new URL(window.location.href);
    const fen = url.searchParams.get('fen');
    const level = url.searchParams.get('level');
    const timeControl = url.searchParams.get('tc');

    if (fen && level && timeControl) {
      return {
        fen,
        level: parseInt(level, 10),
        timeControl,
      };
    }
    return null;
  } catch (e) {
    console.error('Error parsing URL:', e);
    return null;
  }
}
