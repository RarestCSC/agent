import type { PermissionRequest } from './types';

export type PermissionDecision = 'allow-once' | 'allow-session' | 'deny';

export class PermissionManager {
  private sessionAllowances = new Set<string>();

  request(action: PermissionRequest['action'], description: string): PermissionRequest {
    return {
      id: `permission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      description,
      allowOnce: true,
      allowSession: true,
    };
  }

  decide(request: PermissionRequest, decision: PermissionDecision): boolean {
    if (decision === 'deny') return false;
    if (decision === 'allow-session') this.sessionAllowances.add(request.action);
    return true;
  }

  isAllowed(action: PermissionRequest['action']): boolean {
    return this.sessionAllowances.has(action);
  }

  resetSession(): void {
    this.sessionAllowances.clear();
  }
}

export const permissionManager = new PermissionManager();
