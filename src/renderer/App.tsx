import { useEffect, useMemo, useState } from 'react';
import { createMockRuntime, createMockSession, mockModels, mockProviders } from '../core/AgentRuntime';
import { providerManager } from '../core/ProviderManager';
import { sessionManager } from '../core/SessionManager';
import type { Provider, Session, SessionTab } from '../core/types';

const runtime = createMockRuntime();

const initialSession = createMockSession('初始化 Workspace');

const defaultSessions: Session[] = [
  initialSession,
  createMockSession('修复配置问题'),
  createMockSession('分析构建失败'),
  createMockSession('生成文档说明'),
];

const defaultMessages: Record<string, Array<{ id: string; role: 'user' | 'assistant' | 'tool' | 'system'; text: string }>> = {
  [initialSession.id]: [
    { id: 'm1', role: 'user', text: '请帮我检查这个项目的配置，并说明最适合的工作流。' },
    { id: 'm2', role: 'assistant', text: '我先分析项目结构，检查依赖、运行脚本和桌面启动入口，然后给出最稳定的实现方案。' },
    { id: 'm3', role: 'tool', text: '读取 package.json · 检查 Electron / Vite 配置 · 评估 DSH adapter 类型。' },
    { id: 'm4', role: 'assistant', text: '结论：应该先保留一个最小桌面 UI，并用 DSHAdapter 统一封装 DSH runtime。' },
  ],
};

const providerOptions: Provider[] = mockProviders;

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(defaultSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSession.id);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providerOptions[0].id);
  const [selectedModelId, setSelectedModelId] = useState<string>(mockModels[0].id);
  const [activeTab, setActiveTab] = useState<SessionTab>('Files');
  const [input, setInput] = useState('检查项目并给出初始化方案');
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Record<string, Array<{ id: string; role: 'user' | 'assistant' | 'tool' | 'system'; text: string }>>>(defaultMessages);
  const [contextUsage, setContextUsage] = useState({
    system: 2100,
    tools: 3400,
    conversation: 9800,
    files: 5200,
    total: 20500,
    limit: 128000,
  });

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0],
    [sessions, selectedSessionId],
  );

  const currentMessages = messages[selectedSessionId] ?? [];
  const availableModels = providerManager.listModels(selectedProviderId);

  useEffect(() => {
    const loadUsage = async () => {
      const usage = await runtime.getContextUsage(selectedSessionId);
      setContextUsage(usage);
    };

    void loadUsage();
  }, [selectedSessionId]);

  useEffect(() => {
    if (!availableModels.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(availableModels[0]?.id ?? mockModels[0].id);
    }
  }, [availableModels, selectedModelId]);

  const handleAddSession = () => {
    const newSession = sessionManager.create(`New Session ${sessions.length + 1}`);
    setSessions((prev) => [newSession, ...prev]);
    setSelectedSessionId(newSession.id);
    setMessages((prev) => ({
      ...prev,
      [newSession.id]: [{ id: `m-${newSession.id}`, role: 'assistant', text: '新会话已创建，可以开始执行任务。' }],
    }));
  };

  const handleRenameSession = () => {
    const nextTitle = window.prompt('重命名会话', selectedSession.title);
    if (!nextTitle || !nextTitle.trim()) return;

    const updated = sessionManager.updateTitle(selectedSessionId, nextTitle.trim());
    if (!updated) return;

    setSessions((prev) => prev.map((session) => (session.id === selectedSessionId ? { ...session, title: updated.title, updatedAt: updated.updatedAt } : session)));
  };

  const handleDeleteSession = () => {
    if (!window.confirm('确认删除当前会话？')) return;

    const removed = sessionManager.remove(selectedSessionId);
    if (!removed) return;

    setSessions((prev) => prev.filter((session) => session.id !== selectedSessionId));
    if (sessions.length > 1) {
      const next = prevAfterDelete();
      if (next) setSelectedSessionId(next.id);
    }
  };

  const prevAfterDelete = () => {
    const remaining = sessions.filter((session) => session.id !== selectedSessionId);
    return remaining[0] ?? null;
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isRunning) return;

    const sessionId = selectedSession.id;
    const userMessage = { id: `msg-user-${Date.now()}`, role: 'user' as const, text: prompt };

    setMessages((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), userMessage],
    }));
    setInput('');
    setIsRunning(true);

    const placeholder: { id: string; role: 'assistant'; text: string } = {
      id: `msg-assistant-${Date.now()}`,
      role: 'assistant',
      text: '',
    };

    setMessages((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), placeholder],
    }));

    try {
      for await (const event of runtime.sendMessage(sessionId, prompt)) {
        setMessages((prev) => {
          const previous = prev[sessionId] ?? [];
          const next = [...previous];
          const last = next[next.length - 1];

          if (last && last.role === 'assistant' && last.text === '') {
            last.text = event.message;
            return { ...prev, [sessionId]: next };
          }

          const nextRole = event.type === 'thinking' ? 'system' : event.type === 'tool' ? 'tool' : 'assistant';
          next.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: nextRole,
            text: event.message,
          });

          return { ...prev, [sessionId]: next };
        });
      }
    } finally {
      setIsRunning(false);
      const usage = await runtime.getContextUsage(sessionId);
      setContextUsage(usage);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-dot" />
          <span>DSH Desktop Agent</span>
        </div>

        <div className="topbar-center">
          <button className="toolbar-button" onClick={handleAddSession}>新建会话</button>
          <button className="toolbar-button" onClick={handleRenameSession}>重命名</button>
          <button className="toolbar-button" onClick={handleDeleteSession}>删除</button>
          <button className="toolbar-button" disabled={isRunning}>{isRunning ? '处理中…' : '继续执行'}</button>
          <button className="toolbar-button">停止</button>
        </div>

        <div className="topbar-right">
          <label className="select-wrap">
            <span>Provider</span>
            <select value={selectedProviderId} onChange={(event) => setSelectedProviderId(event.target.value)}>
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>

          <label className="select-wrap">
            <span>Model</span>
            <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="main-layout">
        <aside className="left-sidebar">
          <div className="sidebar-header">
            <strong>Workspace</strong>
          </div>

          <div className="workspace-box">
            <div className="workspace-label">项目</div>
            <div className="workspace-name">demo-app</div>
          </div>

          <div className="session-header-row">
            <strong>Sessions</strong>
            <button onClick={handleAddSession}>＋</button>
          </div>

          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`session-item ${session.id === selectedSessionId ? 'active' : ''}`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="session-title">{session.title}</div>
                <div className="session-meta">{new Date(session.updatedAt).toLocaleString()}</div>
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <button>Providers</button>
            <button>Settings</button>
          </div>
        </aside>

        <main className="chat-panel">
          <div className="chat-header">
            <div>
              <div className="chat-title">{selectedSession.title}</div>
              <div className="chat-subtitle">单 Agent · DSH Runtime</div>
            </div>
            <div className="chat-actions">
              <button>Checkpoint</button>
              <button>Resume</button>
            </div>
          </div>

          <div className="message-list">
            {currentMessages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-role">
                  {message.role === 'user' ? 'User' : message.role === 'tool' ? 'Tool' : message.role === 'system' ? 'System' : 'Assistant'}
                </div>
                <div className="message-body">{message.text || '正在处理…'}</div>
              </div>
            ))}
          </div>

          <div className="composer">
            <textarea
              placeholder="给 Agent 发送任务…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="composer-actions">
              <button className="primary" onClick={handleSend} disabled={isRunning}>
                {isRunning ? '运行中' : '发送'}
              </button>
              <button>停止</button>
            </div>
          </div>
        </main>

        <aside className="right-panel">
          <div className="panel-tabs">
            {(['Files', 'Diff', 'Preview', 'Terminal', 'Logs'] as SessionTab[]).map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="panel-content">
            {activeTab === 'Files' && (
              <ul className="file-list">
                <li>electron/main.js</li>
                <li>electron/preload.js</li>
                <li>src/core/AgentRuntime.ts</li>
                <li>src/core/DSHAdapter.ts</li>
                <li>src/renderer/App.tsx</li>
              </ul>
            )}

            {activeTab === 'Diff' && (
              <pre>{`+ DSH Desktop Agent\n+ Session Manager\n+ Provider / Model UI\n+ Context Manager\n+ DSH Adapter`}</pre>
            )}

            {activeTab === 'Preview' && (
              <div className="preview-box">Markdown / artifact preview will appear here.</div>
            )}

            {activeTab === 'Terminal' && (
              <pre>{`$ npm run dev\n> vite --host 0.0.0.0 --port 5173\n> wait-on http://127.0.0.1:5173 && electron electron/main.js`}</pre>
            )}

            {activeTab === 'Logs' && (
              <pre>{`[agent] started\n[tool] package.json loaded\n[context] usage 38%\n[session] saved`}</pre>
            )}
          </div>
        </aside>
      </div>

      <footer className="statusbar">
        <span>Token: {(contextUsage.total / 1000).toFixed(1)}K / {(contextUsage.limit / 1000).toFixed(0)}K</span>
        <span>Context: {Math.round((contextUsage.total / contextUsage.limit) * 100)}%</span>
        <span>Provider: {providerOptions.find((provider) => provider.id === selectedProviderId)?.name ?? 'OpenAI Compatible'}</span>
        <span>Model: {availableModels.find((model) => model.id === selectedModelId)?.name ?? 'GPT-4.1'}</span>
      </footer>
    </div>
  );
}
