import type { AgentRuntime } from './AgentRuntime';

export { createMockRuntime, createMockSession, mockModels, mockProviders } from './AgentRuntime';
export type { AgentRuntime } from './AgentRuntime';

export class DSHAdapter implements AgentRuntime {
  async startSession(title: string) {
    return {
      id: `dsh-${Date.now()}`,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerId: 'provider-openai-compatible',
      modelId: 'gpt-4o-mini',
    };
  }

  async *sendMessage() {
    yield {
      type: 'assistant',
      message: 'DSH adapter placeholder ready; actual DSH connection will be introduced here.',
      createdAt: new Date().toISOString(),
    };
  }

  async cancel() {
    return undefined;
  }

  async getContextUsage() {
    return {
      system: 2000,
      tools: 3000,
      conversation: 12000,
      files: 4000,
      total: 21000,
      limit: 128000,
    };
  }
}
