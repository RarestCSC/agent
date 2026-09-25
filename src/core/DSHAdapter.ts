import type { AgentEvent, ContextUsage, Session } from './types';
import type { DshStartOptions, DshRuntimeEvent } from './DSHDesktopAPI';
import type { AgentRuntime } from './AgentRuntime';

export class DSHAdapter implements AgentRuntime {
  private unsubscribe?: () => void;
  private events = new Map<string, DshRuntimeEvent[]>();

  constructor() {
    this.unsubscribe = window.dshDesktopAPI?.dsh.onEvent((event) => {
      const queue = this.events.get(event.sessionId) || [];
      this.events.set(event.sessionId, [...queue, event]);
    });
  }

  async startSession(title: string): Promise<Session> {
    const options: DshStartOptions = { provider: 'deepseek-official', model: 'deepseek-v4-flash' };
    const result = await window.dshDesktopAPI?.dsh.start(options);
    const id = result?.sessionId || `dsh-${Date.now()}`;
    return { id, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), providerId: options.provider!, modelId: options.model! };
  }

  async *sendMessage(sessionId: string, prompt: string): AsyncIterable<AgentEvent> {
    const response = await window.dshDesktopAPI?.dsh.send(sessionId, prompt);
    if (!response) throw new Error('DSH runtime is unavailable. Start Electron instead of Vite-only mode.');
    const pending = this.events.get(sessionId) || [];
    this.events.delete(sessionId);
    for (const event of pending) {
      yield { type: event.type === 'tool' ? 'tool' : event.type === 'error' ? 'error' : 'assistant', message: event.message, createdAt: new Date().toISOString() };
    }
    yield { type: 'assistant', message: response.finalResponse, createdAt: new Date().toISOString() };
    yield { type: 'checkpoint', message: 'DSH turn completed', createdAt: new Date().toISOString() };
  }

  async cancel(): Promise<void> { await window.dshDesktopAPI?.dsh.stop(); }
  async getContextUsage(): Promise<ContextUsage> { return { system: 2000, tools: 3000, conversation: 0, files: 0, total: 5000, limit: 128000 }; }
  dispose(): void { this.unsubscribe?.(); }
}
