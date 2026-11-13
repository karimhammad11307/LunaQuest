import type { GameAction } from '../models/GameAction';
import type { GameState } from '../models/types';
import { createInitialState } from '../rules/survivalRules';
import { reduceGameState } from '../rules/gameRules';
import type { MissionCatalog } from '../rules/gameRules';
import { MISSION_CONFIG } from '../../game/config/gameConfig';

type Listener = (state: GameState) => void;
type TransitionListener = (state: GameState, action: GameAction) => void;

/** Single state owner shared by the Phaser scene and React HUD. */
export class GameSessionStore {
  private state: GameState;
  private listeners = new Set<Listener>();
  private transitionListeners = new Set<TransitionListener>();
  private readonly missions: MissionCatalog;
  private destroyed = false;

  constructor(initialState: GameState = createInitialState(), missions: MissionCatalog = MISSION_CONFIG) {
    this.state = initialState;
    this.missions = missions;
  }

  getState = (): GameState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    if (this.destroyed) return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Action-aware notification for persistence; React's state subscription stays unchanged. */
  subscribeTransitions = (listener: TransitionListener): (() => void) => {
    if (this.destroyed) return () => {};
    this.transitionListeners.add(listener);
    return () => this.transitionListeners.delete(listener);
  };

  /** Returns the current state; rejected actions retain its object identity. */
  dispatch = (action: GameAction): GameState => {
    if (this.destroyed) return this.state;
    const next = reduceGameState(this.state, action, this.missions);
    if (next !== this.state) {
      this.state = next;
      this.listeners.forEach((listener) => listener(next));
      this.transitionListeners.forEach((listener) => listener(next, action));
    }
    return this.state;
  };

  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
    this.transitionListeners.clear();
  }
}
