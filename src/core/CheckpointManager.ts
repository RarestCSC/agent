import type { Checkpoint } from './types';

export class CheckpointManager {
  private checkpoints = new Map<string, Checkpoint>();

  constructor(initial: Checkpoint[] = []) {
    initial.forEach((checkpoint) => this.checkpoints.set(checkpoint.id, checkpoint));
  }

  create(sessionId: string, title: string, summary: string): Checkpoint {
    const checkpoint: Checkpoint = {
      id: `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      title,
      summary,
      createdAt: new Date().toISOString(),
    };
    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  list(sessionId?: string): Checkpoint[] {
    const items = [...this.checkpoints.values()];
    return sessionId ? items.filter((checkpoint) => checkpoint.sessionId === sessionId) : items;
  }

  get(id: string): Checkpoint | undefined {
    return this.checkpoints.get(id);
  }

  remove(id: string): boolean {
    return this.checkpoints.delete(id);
  }
}
