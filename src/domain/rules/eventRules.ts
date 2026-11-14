/** Deterministic Moon Base emergencies. All quantities are illustrative game units. */
import type { EmergencyChoice, EmergencyState, GameState } from '../models/types';
import { BALANCE } from '../../game/config/balance';
import { applyEnvironmentalDamage, clamp, trimNotices } from './survivalRules';

const storm = BALANCE.emergencies.storm;
const leak = BALANCE.emergencies.leak;

export const stormIdForDay = (day: number): string => `solar-day-${day}`;
export function isValidEmergencyId(id: unknown, day: number): id is string {
  if (id === leak.id) return day >= leak.triggerAfterDays + 1;
  if (typeof id !== 'string' || !/^solar-day-[1-9]\d*$/.test(id)) return false;
  const eventDay = Number(id.slice('solar-day-'.length));
  return Number.isSafeInteger(eventDay) && eventDay >= storm.triggerAfterDays + 1 && eventDay <= day;
}

export const EMERGENCY_CATALOG = {
  [storm.id]: { id: storm.id, type: 'solar-storm', triggerAfterDays: storm.triggerAfterDays,
    warningSeconds: storm.warningSeconds, choices: ['shelter', 'shield', 'ignore'],
    costs: { shelter: {}, shield: { energy: BALANCE.shield.activationEnergy }, ignore: {} },
    outcomes: { success: 'Storm survived with protection.', failure: 'Unprotected exposure harms health.' }, xp: storm.xp,
    takeaway: 'On the Moon, shelter and shielding reduce radiation risk. This is a simulated hazard, not a NASA dose forecast.' },
  [leak.id]: { id: leak.id, type: 'oxygen-leak', triggerAfterDays: leak.triggerAfterDays,
    warningSeconds: leak.warningSeconds, choices: ['repair', 'isolate', 'ignore'],
    costs: { repair: { energy: BALANCE.repair.energyCost }, isolate: { energy: leak.isolateEnergyCost, oxygen: leak.isolateOxygenCost }, ignore: {} },
    outcomes: { success: 'Leak stopped; base oxygen is safe.', failure: 'Escaping oxygen can harm life support.' },
    xp: { repair: leak.repairXp, isolate: leak.isolateXp },
    takeaway: 'A sealed habitat needs stored oxygen. Repairing a leak saves supplies; isolation can shut down another system.' },
} as const;

function tell(state: GameState, text: string, tone: 'info' | 'good' | 'warn'): GameState {
  const id = Math.max(0, ...state.notices.map((item) => item.id)) + 1;
  return { ...state, notices: trimNotices([...state.notices, { id, text, tone }]) };
}

function begin(state: GameState, type: EmergencyState['type'], id: string): GameState {
  const spec = type === 'solar-storm' ? storm : leak;
  const event: EmergencyState = { id, type, phase: 'warning', remainingSeconds: spec.warningSeconds,
    pulseSeconds: 0, tookDamage: false, ignored: false };
  const buildings = type === 'oxygen-leak'
    ? { ...state.buildings, habitat: { ...state.buildings.habitat, condition: 'damaged' as const } }
    : state.buildings;
  return tell({ ...state, buildings, activeEventId: event.id, activeEvent: event },
    type === 'solar-storm' ? 'Solar storm incoming! Find shelter!' : 'Oxygen leak detected! Fix it quickly!', 'warn');
}

/** The Day 3 leak precedes that day's storm; both stay queued and once-only. */
export function triggerEmergency(state: GameState): GameState {
  if (state.status !== 'playing' || state.paused || state.scene !== 'moon-base') return state;
  const candidates = state.day === leak.triggerAfterDays + 1
    ? [leak.id, stormIdForDay(state.day)] : state.day >= storm.triggerAfterDays + 1 ? [stormIdForDay(state.day)] : [];
  const pending = [...state.pendingEventIds];
  for (const id of candidates) {
    if (state.activeEventId !== id && !state.completedEventIds.includes(id) && !pending.includes(id)) pending.push(id);
  }
  if (state.activeEvent) return pending.length === state.pendingEventIds.length ? state : { ...state, pendingEventIds: pending };
  if (!pending.length) return state;
  const [id, ...remaining] = pending;
  return begin({ ...state, pendingEventIds: remaining }, id === leak.id ? 'oxygen-leak' : 'solar-storm', id);
}

function finish(state: GameState, choice: EmergencyChoice, xpEarned: number, message: string, takeaway: string): GameState {
  const event = state.activeEvent;
  if (!event || state.completedEventIds.includes(event.id) || !Number.isSafeInteger(state.xp + xpEarned)) return state;
  const next: GameState = { ...state, activeEvent: null, activeEventId: null,
    completedEventIds: [...state.completedEventIds, event.id], xp: state.xp + xpEarned,
    lastEventOutcome: { id: event.id, choice, xpEarned, message, takeaway } };
  const announced = tell(next, `${message}${xpEarned ? ` +${xpEarned} XP` : ''}`, xpEarned ? 'good' : 'warn');
  return triggerEmergency(announced);
}

function finishStorm(state: GameState): GameState {
  const location = state.astronaut.location;
  const sheltered = location === 'shelter' && state.resources.energy > 0 && state.buildings.shield.condition !== 'broken';
  const shielded = location === 'outside' && applyEnvironmentalDamage(state, 1) === state && state.buildings.shield.active;
  const safeChoice: EmergencyChoice = sheltered ? 'shelter' : shielded ? 'shield' : location === 'habitat' ? 'habitat' : 'ignore';
  const earned = !state.activeEvent?.tookDamage && (sheltered || shielded) ? storm.xp : 0;
  return finish(state, safeChoice, earned, earned ? 'Great sheltering! Storm passed.' : 'The storm passed. Check your supplies.', EMERGENCY_CATALOG[storm.id].takeaway);
}

/** Advances only on the existing bounded domain TICK; one pulse per full second. */
export function tickEmergency(state: GameState, deltaSeconds: number): GameState {
  if (state.status !== 'playing' || state.paused || state.scene !== 'moon-base' || !state.activeEvent
    || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 5) return state;
  const current = state.activeEvent;
  if (current.phase === 'warning') {
    const remainingSeconds = Math.max(0, current.remainingSeconds - deltaSeconds);
    if (remainingSeconds > 0) return { ...state, activeEvent: { ...current, remainingSeconds } };
    const next = { ...state, activeEvent: { ...current, phase: 'danger' as const,
      remainingSeconds: current.type === 'solar-storm' ? storm.dangerSeconds : 0, pulseSeconds: 0 } };
    const announced = tell(next, current.type === 'solar-storm' ? 'Storm overhead! Stay protected!' : 'Air is escaping! Repair or isolate the leak!', 'warn');
    const spillover = deltaSeconds - current.remainingSeconds;
    return spillover > 0 ? tickEmergency(announced, spillover) : announced;
  }
  const activeSeconds = current.type === 'solar-storm' ? Math.min(deltaSeconds, current.remainingSeconds) : deltaSeconds;
  const total = current.pulseSeconds + activeSeconds;
  const pulses = Math.floor(total / (current.type === 'solar-storm' ? storm.pulseSeconds : leak.pulseSeconds));
  let next: GameState = { ...state, activeEvent: { ...current,
    remainingSeconds: current.type === 'solar-storm' ? Math.max(0, current.remainingSeconds - deltaSeconds) : 0,
    pulseSeconds: total % (current.type === 'solar-storm' ? storm.pulseSeconds : leak.pulseSeconds) } };
  if (pulses > 0 && current.type === 'solar-storm') {
    const beforeHealth = next.astronaut.health;
    next = applyEnvironmentalDamage(next, Math.min(100, pulses * storm.damagePerPulse));
    const hit = next.astronaut.health < beforeHealth;
    next = { ...next, astronaut: { ...next.astronaut, radiationExposure: clamp(next.astronaut.radiationExposure + (hit ? pulses * storm.exposurePerPulse : 0)) },
      activeEvent: { ...next.activeEvent!, tookDamage: current.tookDamage || hit } };
  }
  if (pulses > 0 && current.type === 'oxygen-leak') {
    const oxygen = clamp(next.resources.oxygen - pulses * leak.oxygenLossPerPulse);
    const healthBefore = next.astronaut.health;
    const health = clamp(healthBefore - (oxygen <= leak.criticalOxygen ? pulses * leak.criticalHpLossPerPulse : 0));
    next = { ...next, resources: { ...next.resources, oxygen }, astronaut: { ...next.astronaut, health },
      activeEvent: { ...next.activeEvent!, tookDamage: current.tookDamage || health < healthBefore },
      status: health === 0 ? 'defeat' : next.status, scene: health === 0 ? 'result' : next.scene };
  }
  if (next.status !== 'playing') return next;
  return current.type === 'solar-storm' && next.activeEvent!.remainingSeconds <= 0 ? finishStorm(next) : next;
}

/** Contextual habitat repair is the fast, full-service leak response. */
export function repairOxygenLeak(state: GameState): GameState {
  const event = state.activeEvent;
  if (event?.type !== 'oxygen-leak' || state.selectedBuildingId !== 'habitat'
    || state.resources.energy < BALANCE.repair.energyCost) return state;
  const next: GameState = { ...state, resources: { ...state.resources, energy: state.resources.energy - BALANCE.repair.energyCost },
    buildings: { ...state.buildings, habitat: { ...state.buildings.habitat, condition: 'good', active: true } } };
  return finish(next, 'repair', leak.repairXp, 'Leak sealed! Oxygen is safe.', EMERGENCY_CATALOG[leak.id].takeaway);
}

/** Isolation saves oxygen but disables greenhouse until a later paid repair. */
export function resolveEmergency(state: GameState, eventId: string, choiceId: 'ignore' | 'isolate'): GameState {
  const event = state.activeEvent;
  if (!event || event.id !== eventId || state.completedEventIds.includes(eventId)) return state;
  if (choiceId === 'ignore') {
    if (event.ignored) return state;
    return tell({ ...state, activeEvent: { ...event, ignored: true } },
      event.type === 'solar-storm' ? 'Keep moving, but radiation is dangerous!' : 'The leak is still draining oxygen!', 'warn');
  }
  if (choiceId !== 'isolate') return state;
  if (event.type !== 'oxygen-leak' || state.astronaut.location !== 'habitat'
    || state.resources.energy < leak.isolateEnergyCost || state.resources.oxygen < leak.isolateOxygenCost) return state;
  const next: GameState = { ...state,
    resources: { ...state.resources, energy: state.resources.energy - leak.isolateEnergyCost,
      oxygen: state.resources.oxygen - leak.isolateOxygenCost },
    buildings: { ...state.buildings, habitat: { ...state.buildings.habitat, condition: 'good', active: true },
      greenhouse: { ...state.buildings.greenhouse, condition: 'damaged', active: false } } };
  return finish(next, 'isolate', leak.isolateXp, 'Section isolated! Greenhouse needs repair.', EMERGENCY_CATALOG[leak.id].takeaway);
}
