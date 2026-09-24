import type { AgentEvent, ContextUsage, Session } from './types';
import type { AgentRuntime, DshStartOptions } from './DSHDesktopAPI';

export class DSHAdapter implements AgentRuntime {
  private started = new Set<string>();
  private queues = new Map<string, AgentEvent[]>();
  private waiters = new Map<string, Array<(event: AgentEvent | undefined) => void>>();
  private unsubscribe?: () => void;

  constructor() {
    this.unsubscribe = window.dshDesktopAPI?.dsh.onEvent((event) => {
      const normalized: AgentEvent = {
        type: event.type === 'tool' ? 'tool' : event.type === 'agent.completed' ? 'checkpoint' : 'assistant',
        message: event.message,
        createdAt: new Date().toISOString(),
      };
      this.push(event.raw && typeof event.raw === 'object' ? String(event.message) : normalized.message, normalized);
    });
  }

  async startSession(title: string): Promise<Session> {
    const options: DshStartOptions = { provider: 'deepseek-official', model: 'deepseek-v4-flash' };
    const result = await window.dshDesktopAPI?.dsh.start(options);
    const id = result?.sessionId || `dsh-${Date.now()}`;
    this.started.add(id);
    return {
      id,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerId: options.provider!,
      modelId: options.model!,
    };
  }

  async *sendMessage(sessionId: string, prompt: string): AsyncIterable<AgentEvent> {
    if (!this.started.has(sessionId)) await this.startSession(sessionId);
    const sendPromise = window.dshDesktopAPI?.dsh.send(sessionId, prompt);
    if (!sendPromise) throw new Error('DSH Desktop API is unavailable');
    void sendPromise.catch((error) => this.push(sessionId, {
      type: 'error', message: error instanceof Error ? error.message : String(error), createdAt: new Date().toISOString(),
    }));

    while (true) {
      const event = await this.next(sessionId);
      if (!event) break;
      yield event;
      if (event.type === 'checkpoint') break;
    }
  }

  async cancel(_sessionId: string): Promise<void> {
    await window.dshDesktopAPI?.dsh.stop();
  }

  async getContextUsage(_sessionId: string): Promise<ContextUsage> {
    return { system: 2000, tools: 3000, conversation: 0, files: 0, total: 5000, limit: 128000 };
  }

  dispose(): void { this.unsubscribe?.(); }

  private push(sessionId: string, event: AgentEvent): void {
    const waiters = this.waiters.get(sessionId);
    const waiter = waiters?.shift();
    if (waiter) waiter(event);
    else this.queues.set(sessionId, [...(this.queues.get(sessionId) || []), event]);
  }

  private next(sessionId: string): Promise<AgentEvent | undefined> {
    const queue = this.queues.get(sessionId) || [];
    if (queue.length) {
      this.queues.set(sessionId, queue.slice(1));
      return Promise.resolve(queue[0]);
    }
    return new Promise((resolve) => {
      this.waiters.set(sessionId, [...(this.waiters.get(sessionId) || []), resolve]);
    });
  }
}
