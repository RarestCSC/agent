import { useEffect, useMemo, useState } from 'react';
import { createMockRuntime, createMockSession, mockModels, mockProviders } from '../core/AgentRuntime';
import type { Checkpoint, ChatMessage, MessageRole, PermissionRequest, Provider, Session, SessionTab } from '../core/types';

const runtime = createMockRuntime();

const initialSession = createMockSession('初始化 Workspace');

const defaultSessions: Session[] = [
  initialSession,
  createMockSession('修复配置问题'),
  createMockSession('分析构建失败'),
  createMockSession('生成文档说明'),
];

const defaultMessages: Record<string, ChatMessage[]> = {
  [initialSession.id]: [
    { id: 'm1', role: 'user', text: '请帮我检查这个项目的配置，并说明最适合的工作流。' },
    { id: 'm2', role: 'assistant', text: '我先分析项目结构，检查依赖、运行脚本和桌面启动入口，然后给出最稳定的实现方案。' },
    { id: 'm3', role: 'tool', text: '读取 package.json · 检查 Electron / Vite 配置 · 评估 DSH adapter 类型。' },
    { id: 'm4', role: 'assistant', text: '结论：应该先保留一个最小桌面 UI，并用 DSHAdapter 统一封装 DSH runtime。' },
  ],
};

const defaultCheckpoints: Checkpoint[] = [
  {
    id: 'checkpoint-1',
    sessionId: initialSession.id,
    title: 'Initial Checkpoint',
    createdAt: new Date().toISOString(),
    summary: '项目骨架已初始化，UI 运行正常。',
  },
];

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(defaultSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSession.id);
  const [providerOptions, setProviderOptions] = useState<Provider[]>(mockProviders);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(mockProviders[0].id);
  const [selectedModelId, setSelectedModelId] = useState<string>(mockModels[0].id);
  const [activeTab, setActiveTab] = useState<SessionTab>('Files');
  const [input, setInput] = useState('检查项目并给出初始化方案');
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(defaultMessages);
  const [contextUsage, setContextUsage] = useState({
    system: 2100,
    tools: 3400,
    conversation: 9800,
    files: 5200,
    total: 20500,
    limit: 128000,
  });
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(defaultCheckpoints);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [showProviderEditor, setShowProviderEditor] = useState(false);
  const [providerForm, setProviderForm] = useState({
    name: 'VortexAI',
    protocol: 'openai-compatible' as Provider['protocol'],
    baseUrl: 'https://gateway.example.com/v1',
    apiKey: 'demo-key',
  });

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0],
    [sessions, selectedSessionId],
  );

  const currentMessages = messages[selectedSessionId] ?? [];

  const availableModels = useMemo(
    () => mockModels.filter((model) => model.providerId === selectedProviderId),
    [selectedProviderId],
  );

  useEffect(() => {
    if (!availableModels.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(availableModels[0]?.id ?? mockModels[0].id);
    }
  }, [availableModels, selectedModelId]);

  useEffect(() => {
    const loadUsage = async () => {
      const usage = await runtime.getContextUsage(selectedSessionId);
      setContextUsage(usage);
    };

    void loadUsage();
  }, [selectedSessionId]);

  const getNextSessionAfterDelete = (sessionId: string) => {
    const remaining = sessions.filter((session) => session.id !== sessionId);
    return remaining[0] ?? null;
  };

  const handleAddSession = () => {
    const newSession = createMockSession(`New Session ${sessions.length + 1}`);
    setSessions((prev) => [newSession, ...prev]);
    setSelectedSessionId(newSession.id);
    setMessages((prev) => ({
      ...prev,
      [newSession.id]: [{ id: `m-${newSession.id}`, role: 'assistant', text: '新会话已创建，可以开始执行任务。' }],
    }));

    setCheckpoints((prev) => [
      {
        id: `checkpoint-${Date.now()}`,
        sessionId: newSession.id,
        title: 'Initial state',
        createdAt: new Date().toISOString(),
        summary: '会话已初始化。',
      },
      ...prev,
    ]);
  };

  const handleRenameSession = () => {
    const nextTitle = window.prompt('重命名会话', selectedSession.title);
    if (!nextTitle || !nextTitle.trim()) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === selectedSessionId
          ? {
              ...session,
              title: nextTitle.trim(),
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
  };

  const handleDeleteSession = () => {
    if (!window.confirm('确认删除当前会话？')) return;

    const next = getNextSessionAfterDelete(selectedSessionId);
    setSessions((prev) => prev.filter((session) => session.id !== selectedSessionId));
    setMessages((prev) => {
      const nextMap = { ...prev };
      delete nextMap[selectedSessionId];
      return nextMap;
    });

    if (next) {
      setSelectedSessionId(next.id);
    }
  };

  const handleCreateCheckpoint = () => {
    const checkpoint: Checkpoint = {
      id: `checkpoint-${Date.now()}`,
      sessionId: selectedSessionId,
      title: `Checkpoint ${checkpoints.length + 1}`,
      createdAt: new Date().toISOString(),
      summary: '自动保存当前会话状态。',
    };

    setCheckpoints((prev) => [checkpoint, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [selectedSessionId]: [
        ...(prev[selectedSessionId] ?? []),
        {
          id: `checkpoint-${Date.now()}`,
          role: 'system',
          text: `已创建检查点：${checkpoint.title}`,
        },
      ],
    }));
  };

  const handleResumeCheckpoint = (checkpoint: Checkpoint) => {
    setMessages((prev) => ({
      ...prev,
      [selectedSessionId]: [
        ...(prev[selectedSessionId] ?? []),
        {
          id: `resume-${Date.now()}`,
          role: 'assistant',
          text: `已从检查点恢复：${checkpoint.title}，状态已恢复到该节点。`,
        },
      ],
    }));
  };

  const handlePermissionReply = (approved: boolean) => {
    if (!permissionRequest) return;

    if (approved) {
      setMessages((prev) => ({
        ...prev,
        [selectedSessionId]: [
          ...(prev[selectedSessionId] ?? []),
          {
            id: `permission-${Date.now()}`,
            role: 'system',
            text: `已授权：${permissionRequest.description}`,
          },
        ],
      }));
    }

    setPermissionRequest(null);
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isRunning) return;

    const dangerous = /rm\s+-rf|delete.*(file|folder)|drop\s+table|git reset --hard/i.test(prompt);

    if (dangerous) {
      setPermissionRequest({
        id: `permission-${Date.now()}`,
        action: 'shell',
        description: 'Agent 想执行危险命令：' + prompt,
        allowOnce: true,
        allowSession: true,
      });
      return;
    }

    const sessionId = selectedSession.id;
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: prompt,
    };

    setMessages((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), userMessage],
    }));
    setInput('');
    setIsRunning(true);

    const placeholder: ChatMessage = {
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
          const existing = prev[sessionId] ?? [];
          const next = [...existing];
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

  const handleAddProvider = () => {
    const proto = providerForm.protocol;
    const newProvider: Provider = {
      id: `provider-${Date.now()}`,
      name: providerForm.name,
      protocol: proto,
      baseUrl: providerForm.baseUrl,
      enabled: true,
      apiKeySet: Boolean(providerForm.apiKey),
    };

    setProviderOptions((prev) => [...prev, newProvider]);
    setSelectedProviderId(newProvider.id);
    setShowProviderEditor(false);
    setProviderForm({
      name: 'VortexAI',
      protocol: 'openai-compatible',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'demo-key',
    });
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
          <button className="toolbar-button" onClick={handleCreateCheckpoint}>Checkpoint</button>
          <button className="toolbar-button">Resume</button>
          <button className="toolbar-button" disabled={isRunning}>{isRunning ? '处理中…' : '继续执行'}</button>
          <button className="toolbar-button">停止</button>
        </div>

        <div className="topbar-right">
          <button className="toolbar-button" onClick={() => setShowProviderEditor(true)}>Providers</button>
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
            <button onClick={() => setShowProviderEditor(true)}>Providers</button>
            <button>Settings</button>
          </div>
        </aside>

        <main className="chat-panel">
          <div className="chat-header">
            <div>
              <div className="chat-title">{selectedSession?.title ?? 'Session'}</div>
              <div className="chat-subtitle">单 Agent · DSH Runtime</div>
            </div>
            <div className="chat-actions">
              <button onClick={handleCreateCheckpoint}>Checkpoint</button>
              <button onClick={() => handleResumeCheckpoint(checkpoints[0])}>Resume</button>
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
              <div className="diff-box">
                <div>{`+ DSH Desktop Agent`}</div>
                <div>{`+ Session Manager`}</div>
                <div>{`+ Provider / Model UI`}</div>
                <div>{`+ Context Manager`}</div>
                <div>{`+ DSH Adapter`}</div>
                <div className="checkpoint-list">
                  {checkpoints.map((checkpoint) => (
                    <button key={checkpoint.id} className="checkpoint-item" onClick={() => handleResumeCheckpoint(checkpoint)}>
                      {checkpoint.title}
                    </button>
                  ))}
                </div>
              </div>
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

      {showProviderEditor && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong>Add Provider</strong>
              <button onClick={() => setShowProviderEditor(false)}>×</button>
            </div>

            <div className="provider-form">
              <label>
                <span>Name</span>
                <input value={providerForm.name} onChange={(event) => setProviderForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>

              <label>
                <span>Protocol</span>
                <select value={providerForm.protocol} onChange={(event) => setProviderForm((prev) => ({ ...prev, protocol: event.target.value as Provider['protocol'] }))}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai-compatible">OpenAI Compatible</option>
                </select>
              </label>

              <label>
                <span>Base URL</span>
                <input value={providerForm.baseUrl} onChange={(event) => setProviderForm((prev) => ({ ...prev, baseUrl: event.target.value }))} />
              </label>

              <label>
                <span>API Key</span>
                <input value={providerForm.apiKey} onChange={(event) => setProviderForm((prev) => ({ ...prev, apiKey: event.target.value }))} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowProviderEditor(false)}>Cancel</button>
              <button className="primary" onClick={handleAddProvider}>Save Provider</button>
            </div>
          </div>
        </div>
      )}

      {permissionRequest && (
        <div className="modal-overlay">
          <div className="modal-card narrow">
            <div className="modal-header">
              <strong>Permission Required</strong>
            </div>

            <p>{permissionRequest.description}</p>

            <div className="modal-actions">
              <button className="secondary" onClick={() => handlePermissionReply(false)}>Deny</button>
              <button className="secondary" onClick={() => handlePermissionReply(true)}>Allow Once</button>
              <button className="primary" onClick={() => handlePermissionReply(true)}>Allow Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
