import { useMemo, useState } from 'react';
import { createMockSession, mockProviders, mockModels } from '../core/AgentRuntime';
import type { Provider, Session, SessionTab } from '../core/types';

const initialSession = createMockSession('初始化 Workspace');

const leftSessions = [
  initialSession,
  createMockSession('修复配置问题'),
  createMockSession('分析构建失败'),
  createMockSession('生成文档说明'),
];

const providerOptions: Provider[] = mockProviders;

export default function App() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(leftSessions[0].id);
  const [activeTab, setActiveTab] = useState<SessionTab>('Files');
  const [selectedModelId, setSelectedModelId] = useState<string>(mockModels[0].id);

  const selectedSession = useMemo(
    () => leftSessions.find((session) => session.id === selectedSessionId) ?? leftSessions[0],
    [selectedSessionId],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-dot" />
          <span>DSH Desktop Agent</span>
        </div>

        <div className="topbar-center">
          <button className="toolbar-button">新建会话</button>
          <button className="toolbar-button">继续执行</button>
          <button className="toolbar-button">停止</button>
        </div>

        <div className="topbar-right">
          <label className="select-wrap">
            <span>Provider</span>
            <select defaultValue={providerOptions[0].id}>
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>

          <label className="select-wrap">
            <span>Model</span>
            <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)}>
              {mockModels.map((model) => (
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
            <button>＋</button>
          </div>

          <div className="session-list">
            {leftSessions.map((session) => (
              <button
                key={session.id}
                className={`session-item ${session.id === selectedSessionId ? 'active' : ''}`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="session-title">{session.title}</div>
                <div className="session-meta">{session.updatedAt}</div>
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
            <div className="message user">
              <div className="message-role">User</div>
              <div className="message-body">请帮我检查这个项目的配置，并说明最适合的工作流。</div>
            </div>

            <div className="message assistant">
              <div className="message-role">Assistant</div>
              <div className="message-body">
                我先分析项目结构，检查依赖、运行脚本和桌面启动入口，然后给出最稳定的实现方案。
              </div>
            </div>

            <div className="message tool">
              <div className="message-role">Tool</div>
              <div className="message-body">读取 package.json · 检查 Electron / Vite 配置 · 评估 DSH adapter 类型。</div>
            </div>

            <div className="message assistant">
              <div className="message-role">Assistant</div>
              <div className="message-body">
                结论：应该先保留一个最小桌面 UI，并用 DSHAdapter 统一封装 DSH runtime；UI 不直接绑定 DSH Web 层。
              </div>
            </div>
          </div>

          <div className="composer">
            <textarea placeholder="给 Agent 发送任务…" defaultValue="检查项目并给出初始化方案" />
            <div className="composer-actions">
              <button className="primary">发送</button>
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
        <span>Token: 12.4K / 128K</span>
        <span>Context: 38%</span>
        <span>Provider: OpenAI Compatible</span>
        <span>Model: GPT-4.1</span>
      </footer>
    </div>
  );
}
