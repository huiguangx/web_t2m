import load_mujoco from 'mujoco-js/dist/mujoco_wasm.js';
import { loadMeshesToVFS } from './mesh-loader';

export class MujocoLoader {
  private mujoco: any = null;
  private model: any = null;
  private data: any = null;

  async init(xmlPath: string) {
    console.log('1. 加载MuJoCo...')
    this.mujoco = await load_mujoco();
    console.log('2. MuJoCo加载完成')

    console.log('3. 设置虚拟文件系统...')
    this.mujoco.FS.mkdir('/working');
    this.mujoco.FS.mount(this.mujoco.MEMFS, { root: '.' }, '/working');

    console.log('4. 加载mesh文件...')
    const basePath = xmlPath.substring(0, xmlPath.lastIndexOf('/'));
    await loadMeshesToVFS(this.mujoco, basePath);
    console.log('5. Mesh加载完成')

    // 验证mesh文件是否存在
    try {
      const files = this.mujoco.FS.readdir('/working/meshes');
      console.log('虚拟文件系统中的mesh文件:', files);
    } catch (e) {
      console.error('无法读取/working/meshes目录:', e);
    }

    console.log('6. 获取XML...')
    const xmlRes = await fetch(xmlPath);
    let xmlText = await xmlRes.text();

    // 修改meshdir为绝对路径
    xmlText = xmlText.replace('meshdir="./meshes/"', 'meshdir="/working/meshes/"');

    this.mujoco.FS.writeFile('/working/model.xml', xmlText);
    console.log('7. XML写入完成')

    console.log('8. 加载模型...')
    this.model = this.mujoco.MjModel.loadFromXML('/working/model.xml');
    this.data = new this.mujoco.MjData(this.model);
    console.log('9. 初始化完成')
  }

  step() {
    if (this.model && this.data && this.mujoco) {
      this.mujoco.mj_step(this.model, this.data);
    }
  }

  setJointPositions(positions: number[]) {
    if (!this.data) return;
    for (let i = 0; i < positions.length; i++) {
      this.data.qpos[i + 7] = positions[i];
    }
  }

  getJointPositions(): Float32Array {
    return this.data?.qpos.slice(7) || new Float32Array(0);
  }
}
