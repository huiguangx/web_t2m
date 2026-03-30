import loadMujoco from '@mujoco/mujoco';

export class MujocoLoader {
  private mujoco: any = null;
  private model: any = null;
  private data: any = null;

  async init(xmlPath: string) {
    this.mujoco = await loadMujoco();

    const xmlRes = await fetch(xmlPath);
    const xmlText = await xmlRes.text();

    this.model = this.mujoco.Model.load_from_xml(xmlText);
    this.data = this.mujoco.Data.create(this.model);
  }

  step() {
    if (this.model && this.data) {
      this.mujoco.mj_step(this.model, this.data);
    }
  }

  setJointPositions(positions: number[]) {
    if (!this.data) return;
    for (let i = 0; i < positions.length; i++) {
      this.data.qpos[i + 7] = positions[i]; // skip 7 DOF free joint
    }
  }

  getJointPositions(): Float32Array {
    return this.data?.qpos.slice(7) || new Float32Array(0);
  }
}
