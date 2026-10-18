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

    it('should parse multipv lines correctly', () => {
      const line1 = 'info depth 12 multipv 1 score cp 35 nodes 50000 nps 1000000 pv e2e4 e7e5 g1f3';
      const line2 = 'info depth 12 multipv 2 score cp 12 nodes 50000 nps 1000000 pv d2d4 d7d5 c2c4';
      
      const parsed1 = UciAdapter.parseInfo(line1);
      const parsed2 = UciAdapter.parseInfo(line2);

      expect(parsed1.multipv).toBe(1);
      expect(parsed1.score).toEqual({ unit: 'cp', value: 35 });
      expect(parsed1.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);

      expect(parsed2.multipv).toBe(2);
      expect(parsed2.score).toEqual({ unit: 'cp', value: 12 });
      expect(parsed2.pv).toEqual(['d2d4', 'd7d5', 'c2c4']);
    });
  });
});
