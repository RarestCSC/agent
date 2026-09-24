export type DesktopEventMap = {
  'session.created': { sessionId: string };
  'session.updated': { sessionId: string };
  'session.deleted': { sessionId: string };
  'agent.started': { sessionId: string };
  'agent.completed': { sessionId: string };
  'agent.error': { sessionId: string; error: string };
  'permission.required': { sessionId: string; description: string };
  'checkpoint.created': { sessionId: string; checkpointId: string };
  'checkpoint.restored': { sessionId: string; checkpointId: string };
  'context.updated': { sessionId: string; total: number; limit: number };
};

type Listener<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof DesktopEventMap, Set<Listener<never>>>();

  on<K extends keyof DesktopEventMap>(event: K, listener: Listener<DesktopEventMap[K]>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<Listener<never>>();
    listeners.add(listener as Listener<never>);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as Listener<never>);
  }

  emit<K extends keyof DesktopEventMap>(event: K, payload: DesktopEventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload as never));
  }
}

export const eventBus = new EventBus();
