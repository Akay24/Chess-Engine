import React, { useState } from 'react';
import { LEVEL_PRESETS, LevelPreset } from '@twentyfish/engine';
import { RotateCcw, Undo2, Flag, Handshake, Share2, FileText, ChevronDown, Check } from 'lucide-react';

interface GameControlsProps {
  activeLevelId: number;
  onSelectLevel: (id: number) => void;
  playerColor: 'w' | 'b';
  onChangeSide: (color: 'w' | 'b') => void;
  onNewGame: () => void;
  onUndo: () => void;
  onResign: () => void;
  onOfferDraw: () => boolean;
  onExportPgn: () => string;
  onImportPgn: (pgn: string) => boolean;
  onShareLink: () => string;
}

export const GameControls: React.FC<GameControlsProps> = ({
  activeLevelId,
  onSelectLevel,
  playerColor,
  onChangeSide,
  onNewGame,
  onUndo,
  onResign,
  onOfferDraw,
  onExportPgn,
  onImportPgn,
  onShareLink
}) => {
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [pgnText, setPgnText] = useState('');
  const [pgnError, setPgnError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [drawFeedback, setDrawFeedback] = useState<string | null>(null);

  const activeLevel = LEVEL_PRESETS.find((l) => l.id === activeLevelId) || LEVEL_PRESETS[4];

  const handleCopyShare = () => {
    const url = onShareLink();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenPgnModal = () => {
    setPgnText(onExportPgn());
    setPgnError(false);
    setShowPgnModal(true);
  };

  const handleImportPgn = () => {
    const success = onImportPgn(pgnText);
    if (success) {
      setShowPgnModal(false);
      setPgnError(false);
    } else {
      setPgnError(true);
    }
  };

  const handleOfferDraw = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Offer a draw to TwentyFish?');
      if (!confirmed) return;
    }
    const accepted = onOfferDraw();
    if (!accepted) {
      setDrawFeedback('Draw declined: The game has fewer than 10 moves.');
      setTimeout(() => setDrawFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col space-y-4">
      {/* Level Selector */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
          Difficulty Preset (L1–L20)
        </label>
        <div className="relative">
          <select
            value={activeLevelId}
            onChange={(e) => onSelectLevel(parseInt(e.target.value, 10))}
            className="w-full appearance-none bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-100 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {LEVEL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} (~{preset.targetElo} Elo)
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Level details badge */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1.5 px-1 font-mono">
          <span>Target: ~{activeLevel.targetElo}</span>
          <span>Depth: {activeLevel.searchCaps.depth || 'Auto'}</span>
          <span>Time: {activeLevel.searchCaps.movetimeMs}ms</span>
        </div>
      </div>

      {/* Side Selector */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
          Play As
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChangeSide('w')}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center space-x-1.5 transition-colors ${
              playerColor === 'w'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                : 'bg-neutral-50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-400" />
            <span>White</span>
          </button>

          <button
            onClick={() => onChangeSide('b')}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center space-x-1.5 transition-colors ${
              playerColor === 'b'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                : 'bg-neutral-50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-600" />
            <span>Black</span>
          </button>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onNewGame}
          className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Game</span>
        </button>

        <button
          onClick={onUndo}
          className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Takeback</span>
        </button>
      </div>

      {/* Secondary Controls (Resign, Draw, PGN, Share) */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-700">
        <button
          onClick={onResign}
          title="Resign"
          className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-600 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 flex flex-col items-center justify-center text-[10px] transition-colors"
        >
          <Flag className="w-4 h-4 mb-0.5" />
          <span>Resign</span>
        </button>

        <button
          onClick={handleOfferDraw}
          title="Offer Draw"
          className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 flex flex-col items-center justify-center text-[10px] transition-colors"
        >
          <Handshake className="w-4 h-4 mb-0.5" />
          <span>Draw</span>
        </button>

        <button
          onClick={handleOpenPgnModal}
          title="PGN Import/Export"
          className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 flex flex-col items-center justify-center text-[10px] transition-colors"
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>PGN</span>
        </button>

        <button
          onClick={handleCopyShare}
          title="Share Game Link"
          className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 flex flex-col items-center justify-center text-[10px] transition-colors"
        >
          {copiedLink ? <Check className="w-4 h-4 mb-0.5 text-emerald-500" /> : <Share2 className="w-4 h-4 mb-0.5" />}
          <span>{copiedLink ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      {drawFeedback && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-lg text-center animate-fade-in font-medium">
          {drawFeedback}
        </div>
      )}

      {/* PGN Modal */}
      {showPgnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
            <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
              PGN Game Notation
            </h3>
            <textarea
              rows={8}
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder="Paste PGN here or copy current game..."
              className="w-full font-mono text-xs p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {pgnError && (
              <p className="text-xs text-rose-500 font-medium">Invalid PGN format. Could not load game.</p>
            )}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowPgnModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Close
              </button>
              <button
                onClick={handleImportPgn}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Load PGN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
