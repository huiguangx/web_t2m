import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { G1_MESHES } from './meshes';

export class MujocoRenderer {
  private scene: THREE.Scene;
  private robot: THREE.Group;
  private loader: STLLoader;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.robot = new THREE.Group();
    this.loader = new STLLoader();
    this.scene.add(this.robot);
  }

  async loadRobot(basePath: string) {
    const material = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      specular: 0x111111,
      shininess: 200
    });

    console.log('开始加载机器人模型...');
    let loadedCount = 0;

    for (const file of G1_MESHES) {
      try {
        const geometry = await this.loadSTL(`${basePath}/meshes/${file}`);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, material);
        this.robot.add(mesh);
        loadedCount++;
        console.log(`✓ 加载成功: ${file}`);
      } catch (e) {
        console.error(`✗ 加载失败: ${file}`, e);
      }
    }

    console.log(`总共加载了 ${loadedCount}/${G1_MESHES.length} 个部件`);
    this.robot.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(this.robot);
    const size = box.getSize(new THREE.Vector3());
    console.log('模型尺寸:', size);
  }

  private loadSTL(path: string): Promise<THREE.BufferGeometry> {
    return new Promise((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject);
    });
  }
}
