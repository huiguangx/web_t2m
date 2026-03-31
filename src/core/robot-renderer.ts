import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export class RobotRenderer {
  private scene: THREE.Scene;
  private robot: THREE.Group;
  private loader: STLLoader;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.robot = new THREE.Group();
    this.robot.visible = false;
    this.loader = new STLLoader();
    this.scene.add(this.robot);
  }

  async loadRobot(xmlPath: string) {
    const xmlRes = await fetch(xmlPath);
    const xmlText = await xmlRes.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const basePath = xmlPath.substring(0, xmlPath.lastIndexOf('/'));

    // 解析 meshdir
    const compiler = xmlDoc.querySelector('compiler');
    const meshdir = compiler?.getAttribute('meshdir') || './meshes/';
    const meshPath = `${basePath}/${meshdir}`;

    // 解析所有 mesh 定义
    const meshMap = new Map<string, string>();
    xmlDoc.querySelectorAll('asset > mesh').forEach(mesh => {
      const name = mesh.getAttribute('name');
      const file = mesh.getAttribute('file');
      if (name && file) {
        meshMap.set(name, file);
      }
    });

    console.log(`找到 ${meshMap.size} 个 mesh 定义`);

    // 解析 worldbody
    const worldbody = xmlDoc.querySelector('worldbody');
    if (worldbody) {
      await this.parseBody(worldbody, this.robot, meshPath, meshMap);
    }

    this.robot.position.set(0, 0, 0);
    // MuJoCo Z-up 转 Three.js Y-up：绕 X 轴旋转 -90 度
    this.robot.rotation.x = -Math.PI / 2;

    this.robot.visible = true;
  }

  private async parseBody(
    bodyElement: Element,
    parent: THREE.Object3D,
    meshPath: string,
    meshMap: Map<string, string>
  ) {
    const bodies = bodyElement.querySelectorAll(':scope > body');

    for (const body of bodies) {
      const name = body.getAttribute('name') || 'unnamed';
      const pos = this.parseVector3(body.getAttribute('pos'));

      const group = new THREE.Group();
      group.name = name;
      group.position.copy(pos);
      parent.add(group);

      // 加载该 body 的所有 geom
      const geoms = body.querySelectorAll(':scope > geom');
      for (const geom of geoms) {
        const meshName = geom.getAttribute('mesh');
        if (meshName && meshMap.has(meshName)) {
          const meshFile = meshMap.get(meshName)!;
          await this.loadMesh(`${meshPath}${meshFile}`, group);
        }
      }

      // 递归解析子 body
      await this.parseBody(body, group, meshPath, meshMap);
    }
  }

  private async loadMesh(path: string, parent: THREE.Object3D) {
    try {
      const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
        this.loader.load(path, resolve, undefined, reject);
      });

      geometry.computeVertexNormals();

      const material = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        specular: 0x111111,
        shininess: 50
      });

      const mesh = new THREE.Mesh(geometry, material);
      parent.add(mesh);
    } catch (e) {
      console.warn(`加载失败: ${path}`);
    }
  }

  private parseVector3(str: string | null): THREE.Vector3 {
    if (!str) return new THREE.Vector3(0, 0, 0);
    const parts = str.trim().split(/\s+/).map(Number);
    return new THREE.Vector3(parts[0] || 0, parts[1] || 0, parts[2] || 0);
  }
}


