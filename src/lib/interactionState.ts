export type InteractionState =
  | 'idle'
  | 'walking'
  | 'sitting-desk'
  | 'using-pc'
  | 'sitting-podcast'
  | 'sitting-couch'
  | 'playing-game';

export type SeatZone = 'desk' | 'gaming' | 'sofa' | 'podcast';

export const FAILSAFE_MS = 2000;

const TRANSITIONS: Record<InteractionState, InteractionState[]> = {
  idle: ['walking'],
  walking: ['idle', 'sitting-desk', 'sitting-podcast', 'sitting-couch'],
  'sitting-desk': ['walking', 'idle', 'using-pc'],
  'using-pc': ['sitting-desk', 'walking'],
  'sitting-podcast': ['walking', 'idle'],
  'sitting-couch': ['walking', 'playing-game', 'idle'],
  'playing-game': ['walking', 'sitting-couch', 'idle'],
};

export function stateForSeat(zone: SeatZone): InteractionState {
  if (zone === 'sofa') return 'sitting-couch';
  if (zone === 'podcast') return 'sitting-podcast';
  return 'sitting-desk';
}

/**
 * Explicit interaction state machine for the avatar.
 * Every seat/game entry is provisional until `confirm()` is called; if the
 * transition is interrupted, `tickFailsafe` requests a hard reset after 2 s.
 */
export class InteractionMachine {
  private current: InteractionState = 'idle';
  private pendingSince: number | null = null;
  private pendingTarget: InteractionState | null = null;

  get state(): InteractionState {
    return this.current;
  }

  get isSeated(): boolean {
    return this.current === 'sitting-desk' || this.current === 'using-pc' || this.current === 'sitting-podcast' || this.current === 'sitting-couch';
  }

  get isPlaying(): boolean {
    return this.current === 'playing-game';
  }

  get hasPending(): boolean {
    return this.pendingSince !== null;
  }

  private go(next: InteractionState): boolean {
    if (next === this.current) return true;
    if (!TRANSITIONS[this.current].includes(next)) return false;
    this.current = next;
    return true;
  }

  startWalking(): void {
    this.go('walking');
  }

  goIdle(): void {
    this.go('idle');
  }

  requestSeat(zone: SeatZone, now: number): InteractionState {
    const target = stateForSeat(zone);
    this.pendingSince = now;
    this.pendingTarget = target;
    this.go(target);
    return this.current;
  }

  requestPlay(now: number): void {
    this.pendingSince = now;
    this.pendingTarget = 'playing-game';
    this.go('playing-game');
  }

  /** Called once the seat/game visual state has been applied. */
  confirm(): void {
    this.pendingSince = null;
    this.pendingTarget = null;
  }

  standUp(): void {
    this.pendingSince = null;
    this.pendingTarget = null;
    if (this.current === 'playing-game' || this.current === 'sitting-couch') {
      this.go('sitting-couch');
    }
    this.go('walking');
  }

  enterPC(): boolean { return this.go('using-pc'); }
  exitPC(): boolean { return this.go('sitting-desk'); }

  exitGame(): void {
    this.pendingSince = null;
    this.pendingTarget = null;
    if (this.current === 'playing-game') this.go('sitting-couch');
  }

  stopWalking(): void {
    this.pendingSince = null;
    this.pendingTarget = null;
    this.go('idle');
  }

  forceWalk(): void {
    this.pendingSince = null;
    this.pendingTarget = null;
    this.current = 'walking';
  }

  forceIdle(): void {
    this.pendingSince = null;
    this.pendingTarget = null;
    this.current = 'idle';
  }

  /** Returns true once when a provisional transition exceeded the failsafe window. */
  tickFailsafe(now: number): boolean {
    if (this.pendingSince === null) return false;
    if (now - this.pendingSince < FAILSAFE_MS) return false;
    const target = this.pendingTarget;
    this.pendingSince = null;
    this.pendingTarget = null;
    if (this.current === target) {
      this.current = 'walking';
      return true;
    }
    return false;
  }
}
