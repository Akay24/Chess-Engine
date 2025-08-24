/**
 * Time control settings and clock management
 */

export interface TimeControl {
  /** Base time in milliseconds */
  base: number;
  /** Increment in milliseconds */
  increment: number;
}

export enum TimeControlPreset {
  BULLET_1_0 = '1+0',
  BULLET_1_1 = '1+1',
  BULLET_2_1 = '2+1',
  BLITZ_3_0 = '3+0',
  BLITZ_3_2 = '3+2',
  BLITZ_5_0 = '5+0',
  BLITZ_5_3 = '5+3',
  RAPID_10_0 = '10+0',
  RAPID_10_5 = '10+5',
  RAPID_15_10 = '15+10',
  CLASSICAL_30_0 = '30+0',
  CLASSICAL_30_20 = '30+20',
}

export const TIME_CONTROL_PRESETS: Record<TimeControlPreset, TimeControl> = {
  [TimeControlPreset.BULLET_1_0]: { base: 60 * 1000, increment: 0 },
  [TimeControlPreset.BULLET_1_1]: { base: 60 * 1000, increment: 1000 },
  [TimeControlPreset.BULLET_2_1]: { base: 120 * 1000, increment: 1000 },
  [TimeControlPreset.BLITZ_3_0]: { base: 180 * 1000, increment: 0 },
  [TimeControlPreset.BLITZ_3_2]: { base: 180 * 1000, increment: 2000 },
  [TimeControlPreset.BLITZ_5_0]: { base: 300 * 1000, increment: 0 },
  [TimeControlPreset.BLITZ_5_3]: { base: 300 * 1000, increment: 3000 },
  [TimeControlPreset.RAPID_10_0]: { base: 600 * 1000, increment: 0 },
  [TimeControlPreset.RAPID_10_5]: { base: 600 * 1000, increment: 5000 },
  [TimeControlPreset.RAPID_15_10]: { base: 900 * 1000, increment: 10000 },
  [TimeControlPreset.CLASSICAL_30_0]: { base: 1800 * 1000, increment: 0 },
  [TimeControlPreset.CLASSICAL_30_20]: { base: 1800 * 1000, increment: 20000 },
};

export class Clock {
  private whiteTime: number;
  private blackTime: number;
  private increment: number;
  private isRunning: boolean = false;
  private activeSide: 'w' | 'b' = 'w';
  private lastTickTime: number = 0;
  private intervalId: number | null = null;
  private onTick: (whiteTime: number, blackTime: number) => void;
  private onFlag: (side: 'w' | 'b') => void;

  /**
   * Creates a new chess clock
   * @param timeControl Time control settings
   * @param onTick Callback when the clock ticks
   * @param onFlag Callback when a player flags (runs out of time)
   */
  constructor(
    timeControl: TimeControl,
    onTick: (whiteTime: number, blackTime: number) => void,
    onFlag: (side: 'w' | 'b') => void
  ) {
    this.whiteTime = timeControl.base;
    this.blackTime = timeControl.base;
    this.increment = timeControl.increment;
    this.onTick = onTick;
    this.onFlag = onFlag;
  }

  /**
   * Starts the clock for the specified side
   * @param side 'w' for white, 'b' for black
   */
  start(side: 'w' | 'b'): void {
    if (this.isRunning) {
      this.stop();
    }

    this.activeSide = side;
    this.isRunning = true;
    this.lastTickTime = Date.now();

    // Use setInterval for the clock tick
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 100) as unknown as number;
  }

  /**
   * Stops the clock
   */
  stop(): void {
    if (this.isRunning && this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;

      // Add increment to the side that just moved
      if (this.activeSide === 'w') {
        this.whiteTime += this.increment;
      } else {
        this.blackTime += this.increment;
      }
    }
  }

  /**
   * Pauses both clocks without adding increment
   */
  pause(): void {
    if (this.isRunning && this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
    }
  }

  /**
   * Updates the clock on each tick
   */
  private tick(): void {
    const now = Date.now();
    const elapsed = now - this.lastTickTime;
    this.lastTickTime = now;

    if (this.activeSide === 'w') {
      this.whiteTime = Math.max(0, this.whiteTime - elapsed);
      if (this.whiteTime === 0) {
        this.stop();
        this.onFlag('w');
      }
    } else {
      this.blackTime = Math.max(0, this.blackTime - elapsed);
      if (this.blackTime === 0) {
        this.stop();
        this.onFlag('b');
      }
    }

    this.onTick(this.whiteTime, this.blackTime);
  }

  /**
   * Gets the current time for white
   * @returns Time in milliseconds
   */
  getWhiteTime(): number {
    return this.whiteTime;
  }

  /**
   * Gets the current time for black
   * @returns Time in milliseconds
   */
  getBlackTime(): number {
    return this.blackTime;
  }

  /**
   * Resets the clock to the initial time control
   * @param timeControl Time control settings
   */
  reset(timeControl: TimeControl): void {
    this.stop();
    this.whiteTime = timeControl.base;
    this.blackTime = timeControl.base;
    this.increment = timeControl.increment;
  }

  /**
   * Sets custom times for both sides
   * @param whiteTime Time for white in milliseconds
   * @param blackTime Time for black in milliseconds
   */
  setTimes(whiteTime: number, blackTime: number): void {
    this.stop();
    this.whiteTime = whiteTime;
    this.blackTime = blackTime;
  }
}
