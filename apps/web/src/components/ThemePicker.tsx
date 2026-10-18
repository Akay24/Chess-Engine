import React from 'react';
import { BoardTheme } from '../store/useGameStore';
import { Sun, Moon, Palette } from 'lucide-react';

interface ThemePickerProps {
  boardTheme: BoardTheme;
  onSelectTheme: (theme: BoardTheme) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const THEME_COLORS: Record<BoardTheme, { light: string; dark: string; name: string }> = {
  emerald: { light: '#ebecd0', dark: '#779556', name: 'Emerald' },
  wood: { light: '#f0d9b5', dark: '#b58863', name: 'Classic Wood' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad', name: 'Ocean' },
  midnight: { light: '#e2e8f0', dark: '#475569', name: 'Midnight Slate' },
  standard: { light: '#f7fafc', dark: '#cbd5e0', name: 'Standard Light' }
};

export const ThemePicker: React.FC<ThemePickerProps> = ({
  boardTheme,
  onSelectTheme,
  darkMode,
  onToggleDarkMode
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm text-xs">
      {/* Theme chips */}
      <div className="flex items-center space-x-1.5">
        <Palette className="w-4 h-4 text-neutral-400 mr-1" />
        {(Object.keys(THEME_COLORS) as BoardTheme[]).map((themeKey) => {
          const t = THEME_COLORS[themeKey];
          const isSelected = boardTheme === themeKey;
          return (
            <button
              key={themeKey}
              onClick={() => onSelectTheme(themeKey)}
              title={t.name}
              className={`flex items-center space-x-1 px-2 py-1 rounded-md border transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                  : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-600"
                style={{ backgroundColor: t.dark }}
              />
              <span className="hidden sm:inline text-[11px]">{t.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={onToggleDarkMode}
        aria-label="Toggle dark mode"
        className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 transition-colors"
      >
        {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
      </button>
    </div>
  );
};
