import type { GameAction } from '../models/GameAction';
import type { GameState } from '../models/types';
import { createInitialState, trimNotices } from '../rules/survivalRules';

type Listener = (state: GameState) => void;

const buildingMessages: Record<string, string> = {
  habitat: 'Habitat online! Your crew has a safe home.',
  greenhouse: 'Greenhouse ready! Farming unlocks soon.',
  solar: 'Solar array ready! It will power the base.',
  shield: 'Radiation shelter ready! Protection unlocks soon.',
  landingPad: 'Landing pad ready! Supply missions unlock soon.',
};

/** The single session source for Phaser and React. Feature 1 has no economy. */
export class GameSessionStore {
  private state: GameState;
  private listeners = new Set<Listener>();
  private noticeId = 100;

  constructor(initialState: GameState = createInitialState()) {
    this.state = initialState;
  }

  getState = (): GameState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispatch = (action: GameAction): void => {
    switch (action.type) {
      case 'MOVE_PLAYER':
        if (this.state.astronaut.position.x === action.x && this.state.astronaut.position.y === action.y) return;
        this.state = {
          ...this.state,
          astronaut: { ...this.state.astronaut, position: { x: action.x, y: action.y } },
        };
        break;
      case 'INTERACT_BUILDING': {
        if (!this.state.buildings[action.buildingId]) return;
        this.noticeId += 1;
        this.state = {
          ...this.state,
          notices: trimNotices([
            ...this.state.notices,
            { id: this.noticeId, text: buildingMessages[action.buildingId] ?? 'Building ready!', tone: 'good' },
          ]),
        };
        break;
      }
      case 'LOAD_GAME':
        this.state = action.state;
        break;
      case 'RESTART_GAME':
        this.state = createInitialState();
        break;
      case 'DISMISS_NOTICE':
        this.state = { ...this.state, notices: this.state.notices.filter((n) => n.id !== action.noticeId) };
        break;
      default:
        // Future survival and mission actions are deliberately not simulated here.
        return;
    }
    this.listeners.forEach((listener) => listener(this.state));
  };

  destroy(): void {
    this.listeners.clear();
  }
}
