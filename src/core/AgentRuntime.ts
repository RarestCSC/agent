import type { AgentEvent, ContextUsage, Model, Provider, Session } from './types';

export interface AgentRuntime {
  startSession(title: string): Promise<Session>;
  sendMessage(sessionId: string, prompt: string): AsyncIterable<AgentEvent>;
  cancel(sessionId: string): Promise<void>;
  getContextUsage(sessionId: string): Promise<ContextUsage>;
}

export const mockProviders: Provider[] = [
  {
    id: 'provider-openai-compatible',
    name: 'OpenAI Compatible',
    protocol: 'openai-compatible',
    baseUrl: 'https://example.com/v1',
    enabled: true,
    apiKeySet: true,
  },
  {
    id: 'provider-openai',
    name: 'OpenAI',
    protocol: 'openai',
    enabled: true,
    apiKeySet: true,
  },
];

export const mockModels: Model[] = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    providerId: 'provider-openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    providerId: 'provider-openai-compatible',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
];

export function createMockSession(title: string): Session {
  const now = new Date().toISOString();

  return {
    id: `session-${Math.random().toString(36).slice(2, 9)}`,
    title,
    createdAt: now,
    updatedAt: now,
    providerId: 'provider-openai-compatible',
    modelId: 'gpt-4o-mini',
  };
}

export function createMockRuntime(): AgentRuntime {
  return {
    async startSession(title: string) {
      return createMockSession(title);
    },

    async *sendMessage(sessionId: string, prompt: string) {
      const steps = [
        { type: 'assistant', message: `开始处理：${prompt}` },
        { type: 'thinking', message: '正在分析任务、读取上下文与工作区状态。' },
        { type: 'tool', message: '读取 package.json 与项目结构。' },
        { type: 'assistant', message: 'I have identified the likely root cause and I am preparing a minimal fix.' },
        { type: 'checkpoint', message: '已创建检查点，支持后续恢复。' },
      ] as AgentEvent[];

      for (const step of steps) {
        yield step;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    },

    async cancel() {
      return undefined;
    },

    async getContextUsage() {
      return {
        system: 2100,
        tools: 3400,
        conversation: 9800,
        files: 5200,
        total: 20500,
        limit: 128000,
      };
    },
  };
}
