import React from 'react';
import { render, screen } from '@testing-library/react';
import { EvalBar } from './EvalBar';
import { EngineStats } from './EngineStats';
import { ClockDisplay } from './ClockDisplay';
import { OpponentRadarChart } from './OpponentRadarChart';

describe('UI Components', () => {
  describe('EvalBar', () => {
    it('renders centipawn evaluation score correctly', () => {
      render(<EvalBar evalCp={150} isMate={false} mateIn={null} orientation="white" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('+1.5')).toBeInTheDocument();
    });

    it('renders mate evaluation correctly', () => {
      render(<EvalBar evalCp={0} isMate={true} mateIn={3} orientation="white" />);
      expect(screen.getByText('M3')).toBeInTheDocument();
    });
  });

  describe('EngineStats', () => {
    it('renders engine statistics and depth', () => {
      render(
        <EngineStats
          isThinking={true}
          depth={15}
          nodes={250000}
          nps={500000}
          currentPv={['e2e4', 'e7e5']}
          multiPvLines={[]}
          levelName="L10 – International Master"
        />
      );

      expect(screen.getByText('L10 – International Master')).toBeInTheDocument();
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
      expect(screen.getByText('250.0k')).toBeInTheDocument();
      expect(screen.getByText('e2e4 e7e5')).toBeInTheDocument();
    });
  });

  describe('ClockDisplay', () => {
    it('displays clocks in mm:ss format', () => {
      render(
        <ClockDisplay
          clock={{
            whiteMs: 300000,
            blackMs: 300000,
            incrementMs: 0,
            isRunning: false
          }}
          turn="w"
          orientation="white"
        />
      );

      expect(screen.getAllByText('5:00').length).toBe(2);
    });
  });

  describe('OpponentRadarChart', () => {
    it('renders radar chart SVG elements', () => {
      render(
        <OpponentRadarChart
          vector={{
            aggression: { value: 0.7, confidence: 0.8 },
            tactical: { value: 0.6, confidence: 0.8 },
            openness: { value: 0.5, confidence: 0.8 },
            kingSafety: { value: 0.6, confidence: 0.8 },
            blunderRate: { value: 0.2, confidence: 0.8 }
          }}
        />
      );

      expect(screen.getByLabelText('Opponent style radar chart')).toBeInTheDocument();
      expect(screen.getByText('Aggression')).toBeInTheDocument();
      expect(screen.getByText('Tactical')).toBeInTheDocument();
      expect(screen.getByText('Openness')).toBeInTheDocument();
    });
  });
});
