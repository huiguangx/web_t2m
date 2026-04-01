import type { MotionFrame, MotionIndex, MotionInfo } from './types';

export class MotionLoader {
  private baseUrl: string;
  private motionIndex: MotionIndex | null = null;

  constructor(baseUrl: string = '/examples/checkpoints/g1') {
    this.baseUrl = baseUrl;
  }

  async loadIndex(): Promise<MotionInfo[]> {
    const res = await fetch(`${this.baseUrl}/motions.json`);
    this.motionIndex = await res.json();
    return this.motionIndex!.motions;
  }

  async loadMotionIndex(): Promise<MotionIndex> {
    const res = await fetch(`${this.baseUrl}/motions.json`);
    this.motionIndex = await res.json();
    return this.motionIndex!;
  }

  async loadMotion(filename: string): Promise<MotionFrame> {
    const path = `${this.baseUrl}/motions/${filename}`;
    const res = await fetch(path);
    return await res.json();
  }
}
