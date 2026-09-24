import type { Checkpoint, ChatMessage, Provider, Session } from './types';

export interface DesktopState {
  sessions: Session[];
  messages: Record<string, ChatMessage[]>;
  providers: Provider[];
  checkpoints: Checkpoint[];
}

const STORAGE_KEY = 'dsh-desktop-agent.state.v1';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function loadDesktopState(fallback: DesktopState): DesktopState {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DesktopState>;
    return {
      sessions: Array.isArray(parsed.sessions) && parsed.sessions.length ? parsed.sessions : fallback.sessions,
      messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : fallback.messages,
      providers: Array.isArray(parsed.providers) && parsed.providers.length ? parsed.providers : fallback.providers,
      checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : fallback.checkpoints,
    };
  } catch {
    return fallback;
  }
}

export function saveDesktopState(state: DesktopState): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearDesktopState(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
