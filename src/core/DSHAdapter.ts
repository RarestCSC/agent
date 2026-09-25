import type { AgentEvent, ContextUsage, Session } from './types';
import type { AgentRuntime, DshRuntimeEvent, DshStartOptions } from './DSHDesktopAPI';

export class DSHAdapter implements AgentRuntime {
  private started = new Set<string>();
  private queues = new Map<string, AgentEvent[]>();
  private waiters = new Map<string, Array<(event: AgentEvent | undefined) => void>>();
  private unsubscribe?: () => void;

  constructor() {
    this.unsubscribe = window.dshDesktopAPI?.dsh.onEvent((event) => {
      const sessionId = event.sessionId;
      if (!sessionId) return;

      const normalized: AgentEvent = {
        type: event.type === 'tool' ? 'tool' : event.type === 'checkpoint' ? 'checkpoint' : 'assistant',
        message: event.message,
        createdAt: new Date().toISOString(),
      };
      this.push(sessionId, normalized);
    });
  }

  async startSession(title: string): Promise<Session> {
    const sessionId = `session-${Date.now()}`;
    const result = await window.dshDesktopAPI?.dsh.start({
      sessionId,
      provider: 'deepseek-official',
      model: 'deepseek-v4-flash',
    });

    const id = result?.sessionId || sessionId;
    this.started.add(id);

    return {
      id,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerId: 'deepseek-official',
      modelId: 'deepseek-v4-flash',
    };
  }

  async *sendMessage(sessionId: string, prompt: string): AsyncIterable<AgentEvent> {
    if (!this.started.has(sessionId)) {
      await this.startSession(sessionId);
    }

    const response = await window.dshDesktopAPI?.dsh.send(sessionId, prompt);
    if (!response) throw new Error('DSH Desktop API is unavailable');

    const assistantEvent: AgentEvent = {
      type: 'assistant',
      message: response.finalResponse || 'Request completed.',
      createdAt: new Date().toISOString(),
    };

    const checkpointEvent: AgentEvent = {
      type: 'checkpoint',
      message: 'DSH session completed.',
      createdAt: new Date().toISOString(),
    };

    yield assistantEvent;
    yield checkpointEvent;
  }

  async cancel(_sessionId: string): Promise<void> {
    await window.dshDesktopAPI?.dsh.stop();
  }

  async getContextUsage(_sessionId: string): Promise<ContextUsage> {
    return { system: 2000, tools: 3000, conversation: 0, files: 0, total: 5000, limit: 128000 };
  }

  dispose(): void {
    this.unsubscribe?.();
  }

  private push(sessionId: string, event: AgentEvent): void {
    const waiters = this.waiters.get(sessionId);
    const waiter = waiters?.shift();
    if (waiter) {
      waiter(event);
      return;
    }
    this.queues.set(sessionId, [...(this.queues.get(sessionId) || []), event]);
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
