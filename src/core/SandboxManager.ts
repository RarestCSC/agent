import type { PermissionRequest } from './types';

export interface SandboxProfile {
  filesystem: 'project-only' | 'unrestricted';
  shell: 'ask' | 'allowed' | 'denied';
  network: 'ask' | 'allowed' | 'denied';
  dangerousCommands: 'ask' | 'allowed' | 'denied';
}

export const defaultSandboxProfile: SandboxProfile = {
  filesystem: 'project-only',
  shell: 'ask',
  network: 'ask',
  dangerousCommands: 'ask',
};

export function permissionForCommand(command: string, profile = defaultSandboxProfile): PermissionRequest | null {
  const dangerous = /(^|\s)(rm\s+-rf|git\s+reset\s+--hard|drop\s+table|mkfs|shutdown)(\s|$)/i.test(command);
  if (dangerous && profile.dangerousCommands === 'ask') {
    return {
      id: `permission-${Date.now()}`,
      action: 'shell',
      description: `Agent 请求执行危险命令：${command}`,
      allowOnce: true,
      allowSession: true,
    };
  }
  if (profile.shell === 'ask') {
    return {
      id: `permission-${Date.now()}`,
      action: 'shell',
      description: `Agent 请求执行命令：${command}`,
      allowOnce: true,
      allowSession: true,
    };
  }
  return null;
}
