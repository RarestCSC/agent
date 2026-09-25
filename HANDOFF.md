# DSH Desktop Agent 交接文档

## 1. 项目是什么

DSH Desktop Agent 是一个基于 Electron + React 的单 Agent 桌面应用。它提供类似 Codex Desktop 的三栏工作区：

- 左侧：Workspace 和 Session 管理
- 中间：Agent 对话和执行过程
- 右侧：Files、Diff、Preview、Terminal、Logs

底层 Agent Runtime 使用 DeepSeek Harness（DSH）。UI 不直接加载 DSH Web UI，也不在 Renderer 进程启动内核。

```text
Renderer UI
  -> preload IPC
     -> Electron Main Process
        -> @deepseek-ai/dsh-sdk-client
           -> dsh --profile sdk
              -> DSH Kernel / DSH Plugins
```

## 2. 当前已经实现

### 桌面基础

- Electron 主进程和安全 preload
- React + Vite Renderer
- 三栏布局
- Vite 开发模式和 Electron 启动脚本
- CommonJS Electron 入口，避免 `type: module` 与 `require` 冲突

### DSH 内核桥接

- 固定使用同版本 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-sdk-client`（`0.1.7-rc.2`）
- Electron Main Process 创建并持有 `DeepSeekHarness`
- 支持 `profile`、`cwd`、`provider`、`model`、`maxTokens`、超时参数
- 支持 DSH session ID 创建和复用
- 支持向 DSH 发送 prompt
- 支持 DSH 运行时关闭
- 通过 IPC 转发 DSH notification
- 将 `assistant/message`、tool 事件、session status 转换成桌面事件

### 核心模块

仓库已有以下基础模块：

- `AgentRuntime.ts`：Mock Runtime 和统一 Runtime 类型
- `DSHAdapter.ts`：Renderer 到真实 DSH IPC 的适配器
- `DSHDesktopAPI.ts`：preload API 类型
- `SessionManager.ts`
- `ProviderManager.ts`
- `ContextManager.ts`
- `CheckpointManager.ts`
- `PermissionManager.ts`
- `SandboxManager.ts`
- `Storage.ts`
- `EventBus.ts`

### 已有 UI 能力

- Session 列表和基本会话切换
- Provider / Model 选择入口
- 右侧结果 Tab
- Token / Context 状态栏基础展示
- Checkpoint、Permission、Provider 表单的基础模块已建立

## 3. 如何运行

```bash
npm install
npm run dev
```

如果使用本地构建的 DSH，可指定：

```bash
DSH_BIN=/absolute/path/to/deepseek-harness/apps/cli/lib/bin.js npm run dev
```

DSH 官方仓库：<https://github.com/deepseek-ai/deepseek-harness>

DSH SDK 设计要求：SDK client 与 `@deepseek-ai/dsh` 版本必须一致；DSH 当前仍是 developer preview，升级时需要重新验证协议。

## 4. 当前限制

- Renderer 主页面仍有一部分早期演示 UI，需要继续绑定 `DSHAdapter`，目前不能把它视为完整生产界面。
- Provider 表单目前主要是前端状态，API Key 尚未接入系统 Keychain/Credential Manager。
- Context token 统计暂时是占位数据，尚未读取 DSH token-meter 实际数据。
- Checkpoint 目前保存的是桌面层记录，尚未调用 DSH 的真实 session checkpoint/文件快照能力。
- Sandbox 和 Permission 是策略层原型，尚未把每一个 DSH tool execution 全部接入确认流程。
- Files、Diff、Terminal、Preview 目前主要是面板骨架，尚未接入真实工作区数据。
- 尚未完成完整的安装、启动、DSH 握手和真实模型请求验证。

## 5. 下一步建议

按这个顺序继续，不要再扩大范围：

1. 在 `App.tsx` 中实例化 `DSHAdapter`，发送消息改为真实 DSH runtime。
2. 增加 DSH runtime 状态：未启动、连接中、运行中、错误、已停止。
3. 用 `Storage.ts` 持久化 sessions/messages/providers/checkpoints。
4. 将 API Key 改为 Electron safeStorage 或系统 Keychain，不写入 localStorage。
5. 把 DSH tool notifications 映射到 Tool Call / Tool Result 卡片。
6. 接入真实 workspace 文件树、diff 和 terminal 输出。
7. 接入 DSH token/context 数据；没有数据时明确显示 unavailable，不要伪造统计。
8. 增加 build smoke test：`npm install`、`npm run build`、Electron 启动、DSH `start`、一次 `send`、正常 `stop`。

## 6. 重要约束

- 不要在 Renderer 中 import `@deepseek-ai/dsh-sdk-client`。
- 不要把 API Key 传入普通 React 状态后写入 localStorage。
- 不要复制 DSH Web UI；只使用 SDK/runtime 和 DSH Plugin。
- 保持单 Agent 设计，不引入多 Agent 编排。
- DSH 协议和 SDK 处于快速迭代阶段，升级必须锁定版本并重新验证。
