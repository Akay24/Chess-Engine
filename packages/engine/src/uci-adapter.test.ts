import { UciAdapter } from './uci-adapter';

describe('UciAdapter', () => {
  describe('parseInfo', () => {
    it('should parse basic info line correctly', () => {
      const infoLine = 'info depth 10 seldepth 14 time 54 nodes 34524 nps 639333 score cp 45 pv e2e4 e7e5';
      const result = UciAdapter.parseInfo(infoLine);

      expect(result.depth).toBe(10);
      expect(result.seldepth).toBe(14);
      expect(result.time).toBe(54);
      expect(result.nodes).toBe(34524);
      expect(result.nps).toBe(639333);
      expect(result.score).toEqual({ unit: 'cp', value: 45 });
      expect(result.pv).toEqual(['e2e4', 'e7e5']);
    });

    it('should parse mate score correctly', () => {
      const infoLine = 'info depth 20 score mate 5 pv g1f3 b8c6';
      const result = UciAdapter.parseInfo(infoLine);

      expect(result.depth).toBe(20);
      expect(result.score).toEqual({ unit: 'mate', value: 5 });
      expect(result.pv).toEqual(['g1f3', 'b8c6']);
    });

    it('should handle partial info lines', () => {
      const infoLine = 'info depth 5 nodes 100';
      const result = UciAdapter.parseInfo(infoLine);

      expect(result.depth).toBe(5);
      expect(result.nodes).toBe(100);
      expect(result.time).toBeUndefined();
      expect(result.score).toBeUndefined();
      expect(result.pv).toBeUndefined();
    });

    it('should handle negative centipawn scores', () => {
      const infoLine = 'info score cp -120 pv d2d4 d7d5';
      const result = UciAdapter.parseInfo(infoLine);

      expect(result.score).toEqual({ unit: 'cp', value: -120 });
      expect(result.pv).toEqual(['d2d4', 'd7d5']);
    });
  });
});
