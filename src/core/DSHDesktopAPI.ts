import type { AgentEvent, ContextUsage, Session } from './types';

export type DshRuntimeEventType = 'assistant' | 'tool' | 'status' | 'completed' | 'runtime' | 'error';

export interface DshRuntimeEvent {
  sessionId: string;
  type: DshRuntimeEventType;
  message: string;
  raw?: unknown;
}

export interface DshStartOptions {
  sessionId?: string;
  cwd?: string;
  provider?: string;
  model?: string;
  profile?: string;
  maxTokens?: number;
  requestTimeoutMs?: number;
}

export interface DshDesktopAPI {
  version: string;
  platform: string;
  openExternal?: (url: string) => Promise<void>;
  dsh: {
    start(options?: DshStartOptions): Promise<{ sessionId: string; runtime: string; profile: string }>;
    send(sessionId: string, prompt: string): Promise<{ sessionId: string; finalResponse: string }>;
    stop(): Promise<void>;
    onEvent(listener: (event: DshRuntimeEvent) => void): () => void;
  };
}

declare global {
  interface Window {
    dshDesktopAPI?: DshDesktopAPI;
  }
}

export interface AgentRuntime {
  startSession(title: string): Promise<Session>;
  sendMessage(sessionId: string, prompt: string): AsyncIterable<AgentEvent>;
  cancel(sessionId: string): Promise<void>;
  getContextUsage(sessionId: string): Promise<ContextUsage>;
}
