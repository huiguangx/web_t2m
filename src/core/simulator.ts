import loadMujoco from '@mujoco/mujoco';
import * as THREE from 'three';

export class MujocoSimulator {
  private mujoco: any = null;
  private model: any = null;
  private state: any = null;
  private simulation: any = null;

  async init(xmlPath: string) {
    this.mujoco = await loadMujoco();

    const xmlRes = await fetch(xmlPath);
    const xmlText = await xmlRes.text();

    this.model = new this.mujoco.Model(xmlText);
    this.state = new this.mujoco.State(this.model);
    this.simulation = new this.mujoco.Simulation(this.model, this.state);

    console.log('MuJoCo 初始化成功');
  }

  getRenderer() {
    return this.simulation;
  }

  step() {
    if (this.simulation) {
      this.simulation.step();
    }
  }

  setJointPositions(positions: number[]) {
    if (!this.state) return;
    for (let i = 0; i < positions.length; i++) {
      this.state.qpos[i + 7] = positions[i];
    }
  }
}
