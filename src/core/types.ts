export type ProviderProtocol = 'openai' | 'anthropic' | 'openai-compatible';
export type SessionTab = 'Files' | 'Diff' | 'Preview' | 'Terminal' | 'Logs';

export interface Provider {
  id: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl?: string;
  enabled: boolean;
  apiKeySet: boolean;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  providerId: string;
  modelId: string;
}

export interface ContextUsage {
  system: number;
  tools: number;
  conversation: number;
  files: number;
  total: number;
  limit: number;
}

export interface ToolEvent {
  type: 'tool.started' | 'tool.completed' | 'tool.failed';
  toolName: string;
  result?: string;
  error?: string;
}

export interface AgentEvent {
  type: 'user' | 'assistant' | 'thinking' | 'tool' | 'file' | 'command' | 'error' | 'checkpoint';
  message: string;
  createdAt: string;
}
