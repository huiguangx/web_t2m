# ECHO-rebuild 完全教程：从零到一搭建机器人运动控制项目

## 目录

1. [项目简介](#1-项目简介)
2. [核心概念扫盲](#2-核心概念扫盲)
3. [环境准备](#3-环境准备)
4. [第一步：创建项目骨架](#4-第一步创建项目骨架)
5. [第二步：加载 MuJoCo 物理引擎](#5-第二步加载-mujoco-物理引擎)
6. [第三步：解析动作数据](#6-第三步解析动作数据)
7. [第四步：ONNX 神经网络推理](#7-第四步onnx-神经网络推理)
8. [第五步：Three.js 3D 渲染](#8-第五步threejs-3d-渲染)
9. [第六步：整合仿真循环](#9-第六步整合仿真循环)
10. [常见问题](#10-常见问题)

---

## 1. 项目简介

**ECHO-rebuild** 是一个机器人运动控制的学习项目，它展示了如何让虚拟机器人：
- 在物理引擎中模拟真实的物理运动
- 使用神经网络控制关节动作
- 在浏览器中实时 3D 渲染

**最终效果**：在网页上看到一个 3D 机器人，它会根据预训练的神经网络模型做出流畅的动作。

---

## 2. 核心概念扫盲

### 2.1 MuJoCo 是什么？

**MuJoCo** (Multi-Joint dynamics with Contact) 是一个物理仿真引擎。

**类比理解**：
- 就像游戏引擎处理碰撞、重力一样
- MuJoCo 专门模拟机器人的关节、肌肉、接触力

**在本项目中的作用**：
- 加载机器人模型（XML 文件描述机器人结构）
- 计算每一帧的物理状态（关节角度、位置、速度）

**关键文件**：
- `g1.xml` - 描述机器人有多少个关节、每个关节的限制
- `*.STL` - 机器人各部件的 3D 网格模型

### 2.2 ONNX 是什么？

**ONNX** (Open Neural Network Exchange) 是神经网络模型的通用格式。

**类比理解**：
- 就像 MP3 是音频的通用格式
- ONNX 是神经网络的通用格式，可以在不同平台运行

**在本项目中的作用**：
- 加载预训练的控制策略模型 `policy_amass.onnx`
- 输入：当前机器人状态（关节角度、速度等）
- 输出：下一步应该如何控制关节

**为什么需要神经网络？**
- 传统方法：手写规则控制机器人（复杂、不自然）
- 神经网络：从真实人类动作数据学习（流畅、自然）

### 2.3 Three.js 是什么？

**Three.js** 是一个 3D 图形库，封装了 WebGL。

**类比理解**：
- WebGL 是底层 API（像汇编语言）
- Three.js 是高级封装（像 Python）

**在本项目中的作用**：
- 创建 3D 场景（相机、光源、地面）
- 加载机器人网格模型
- 每帧更新机器人姿态并渲染

### 2.4 机器人关节系统

**关节 (Joint)**：机器人身体的连接点，可以旋转或移动。

**类比理解**：
- 人体：肩关节、肘关节、膝关节
- 机器人：每个关节有名字（如 `left_shoulder_pitch`）

**关节角度**：
- 每个关节当前的旋转角度（单位：弧度）
- 例如：`[0.1, -0.5, 0.3, ...]` 表示所有关节的角度

**根位置和旋转**：
- `root_pos`：机器人整体在空间中的位置 `[x, y, z]`
- `root_quat`：机器人整体的旋转（四元数表示）

---

## 3. 环境准备

### 3.1 安装 Node.js

下载并安装 Node.js（推荐 v18 或更高版本）：
https://nodejs.org/

验证安装：
```bash
node -v
npm -v
```

### 3.2 准备资源文件

本项目需要以下资源文件（通常从 ECHO 原项目获取）：

```
public/examples/
├── checkpoints/g1/
│   ├── policy_amass.onnx           # 神经网络模型
│   ├── tracking_policy_amass.json  # 策略配置
│   ├── motions.json                # 动作索引
│   └── motions/
│       └── *.json                  # 具体动作数据
└── scenes/g1/
    ├── g1.xml                      # MuJoCo 场景描述
    └── meshes/
        └── *.STL                   # 机器人网格模型
```

---

## 4. 第一步：创建项目骨架

### 4.1 初始化项目

```bash
npm create vite@latest echo-rebuild -- --template vue-ts
cd echo-rebuild
npm install
```

### 4.2 安装核心依赖

```bash
npm install three @types/three
npm install @mujoco/mujoco
npm install onnxruntime-web
```

**依赖说明**：
- `three` - 3D 渲染库
- `@mujoco/mujoco` - MuJoCo WASM 版本（可在浏览器运行）
- `onnxruntime-web` - ONNX 推理引擎（浏览器版）

### 4.3 配置 Vite

编辑 `vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

**为什么需要这些 headers？**
- MuJoCo 使用 `SharedArrayBuffer`（多线程共享内存）
- 浏览器安全策略要求页面必须"跨域隔离"才能使用
- 这两个 header 启用跨域隔离

### 4.4 创建项目结构

```bash
mkdir -p src/core
mkdir -p docs
mkdir -p public/examples
```

```
src/
├── core/
│   ├── types.ts          # TypeScript 类型定义
│   ├── mujoco.ts         # MuJoCo 加载器
│   ├── motion.ts         # 动作数据解析
│   ├── policy.ts         # ONNX 推理
│   ├── renderer.ts       # Three.js 渲染器
│   ├── robot-renderer.ts # 机器人渲染
│   ├── simulator.ts      # 仿真循环
│   └── meshes.ts         # 网格加载
├── App.vue
└── main.ts
```

---

## 5. 第二步：加载 MuJoCo 物理引擎

### 5.1 定义类型

创建 `src/core/types.ts`：

```ts
// 动作数据类型
export interface MotionFrame {
  joint_pos: number[][];      // 关节角度 [帧数][关节数]
  root_quat: number[][];      // 根旋转 [帧数][4]
  root_pos: number[][];       // 根位置 [帧数][3]
}

export interface MotionInfo {
  name: string;               // 动作名称
  file: string;               // 文件名
}

export interface MotionIndex {
  format: string;
  base_path: string;
  motions: MotionInfo[];
}

// 策略配置类型
export interface PolicyConfig {
  onnx: {
    meta: {
      in_keys: string[];      // 输入键名
      out_keys: string[];     // 输出键名
      in_shapes: number[][][];
    };
    path: string;
  };
  policy_joint_names: string[];
  action_scale: number[];
  default_joint_pos: number[];
}
```

### 5.2 创建 MuJoCo 加载器

创建 `src/core/mujoco.ts`：

```ts
import loadMujoco from '@mujoco/mujoco';

export class MujocoLoader {
  private mujoco: any = null;
  private model: any = null;
  private data: any = null;

  async init(xmlPath: string) {
    // 1. 加载 MuJoCo WASM 模块
    this.mujoco = await loadMujoco();

    // 2. 获取 XML 场景描述
    const xmlRes = await fetch(xmlPath);
    const xmlText = await xmlRes.text();

    // 3. 从 XML 创建模型
    this.model = this.mujoco.Model.load_from_xml(xmlText);
    
    // 4. 创建仿真数据
    this.data = this.mujoco.Data.create(this.model);
  }

  // 执行一步物理仿真
  step() {
    if (this.model && this.data) {
      this.mujoco.mj_step(this.model, this.data);
    }
  }

  // 设置关节位置
  setJointPositions(positions: number[]) {
    if (!this.data) return;
    // qpos 前 7 个是自由关节 (root)，跳过
    for (let i = 0; i < positions.length; i++) {
      this.data.qpos[i + 7] = positions[i];
    }
  }

  // 获取关节位置
  getJointPositions(): Float32Array {
    return this.data?.qpos.slice(7) || new Float32Array(0);
  }
}
```

**关键概念**：
- `qpos`：广义位置，包含根位置 (3) + 根旋转 (4) + 关节角度 (N)
- 前 7 个自由度是机器人整体的位置和旋转
- 后面的是各个关节的角度

---

## 6. 第三步：解析动作数据

### 6.1 动作数据格式

动作数据是预先录制的机器人运动轨迹，格式如下：

```json
{
  "joint_pos": [
    [0.1, -0.2, 0.3, ...],  // 第 0 帧的关节角度
    [0.11, -0.19, 0.31, ...], // 第 1 帧
    ...
  ],
  "root_quat": [
    [1, 0, 0, 0],  // 第 0 帧的根旋转（四元数）
    [0.99, 0.01, 0, 0],
    ...
  ],
  "root_pos": [
    [0, 0, 0.85],  // 第 0 帧的根位置
    [0.01, 0, 0.85],
    ...
  ]
}
```

### 6.2 创建动作加载器

创建 `src/core/motion.ts`：

```ts
import type { MotionFrame, MotionIndex, MotionInfo } from './types';

export class MotionLoader {
  private baseUrl: string;
  private motionIndex: MotionIndex | null = null;

  constructor(baseUrl: string = '/examples/checkpoints/g1') {
    this.baseUrl = baseUrl;
  }

  // 加载动作索引
  async loadIndex(): Promise<MotionInfo[]> {
    const res = await fetch(`${this.baseUrl}/motions.json`);
    this.motionIndex = await res.json();
    return this.motionIndex!.motions;
  }

  // 加载具体动作
  async loadMotion(filename: string): Promise<MotionFrame> {
    const path = `${this.baseUrl}/motions/${filename}`;
    const res = await fetch(path);
    return await res.json();
  }
}
```

**使用示例**：
```ts
const loader = new MotionLoader();
const motions = await loader.loadIndex();
const motion = await loader.loadMotion(motions[0].file);
console.log(motion.joint_pos[0]); // 第一帧的关节角度
```

---

## 7. 第四步：ONNX 神经网络推理

### 7.1 神经网络的作用

**问题**：如何让机器人做出自然的动作？

**传统方法**：
```ts
// 手写规则（僵硬、不自然）
if (leftLegAngle > 30) {
  rightLegAngle = -30;
}
```

**神经网络方法**：
```ts
// 从真实人类动作学习
const action = neuralNetwork.predict(currentState);
```

### 7.2 ONNX 推理流程

```
输入 (观测值)          神经网络          输出 (动作)
┌─────────────┐      ┌─────────┐      ┌─────────────┐
│ 当前关节角度 │ ───> │  ONNX   │ ───> │ 下一步控制量 │
│ 当前速度    │      │  模型   │      │ (关节目标)  │
│ 目标动作    │      └─────────┘      └─────────────┘
└─────────────┘
```

### 7.3 创建推理引擎

创建 `src/core/policy.ts`：

```ts
import * as ort from 'onnxruntime-web';
import type { PolicyConfig } from './types';

export class PolicyInference {
  private session: ort.InferenceSession | null = null;
  private config: PolicyConfig | null = null;

  async load(modelPath: string, configPath: string) {
    // 1. 并行加载模型和配置
    const [modelRes, configRes] = await Promise.all([
      fetch(modelPath),
      fetch(configPath)
    ]);

    // 2. 创建 ONNX 推理会话
    const modelBuffer = await modelRes.arrayBuffer();
    this.session = await ort.InferenceSession.create(modelBuffer);
    
    // 3. 加载配置
    this.config = await configRes.json();
  }

  async infer(obs: Float32Array): Promise<Float32Array> {
    if (!this.session) throw new Error('Model not loaded');

    // 1. 创建输入张量
    const tensor = new ort.Tensor('float32', obs, [1, obs.length]);
    
    // 2. 执行推理
    const feeds = { policy: tensor };
    const results = await this.session.run(feeds);

    // 3. 返回动作
    return results.action.data as Float32Array;
  }
}
```

**关键概念**：
- `Tensor`：多维数组，神经网络的输入输出格式
- `InferenceSession`：ONNX 运行时，执行模型推理
- `obs`：观测值（当前状态）
- `action`：动作（控制指令）

---

## 8. 第五步：Three.js 3D 渲染

### 8.1 Three.js 基础概念

**Three.js 三要素**：
1. **Scene（场景）**：容器，包含所有 3D 对象
2. **Camera（相机）**：观察视角
3. **Renderer（渲染器）**：将场景绘制到画布

```
┌─────────────────────────────────┐
│         Scene (场景)            │
│  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │ 机器人 │  │ 地面  │  │ 光源  │  │
│  └──────┘  └──────┘  └──────┘  │
└─────────────────────────────────┘
         ↓
    Camera (相机)
         ↓
    Renderer (渲染器)
         ↓
      Canvas (画布)
```

### 8.2 创建基础渲染器

创建 `src/core/renderer.ts`：

```ts
import * as THREE from 'three';

export class SceneRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    // 1. 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // 2. 创建相机
    this.camera = new THREE.PerspectiveCamera(
      50,  // 视野角度
      container.clientWidth / container.clientHeight,  // 宽高比
      0.1,  // 近裁剪面
      1000  // 远裁剪面
    );
    this.camera.position.set(3, 2, 3);
    this.camera.lookAt(0, 0, 0);

    // 3. 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 4. 添加光源
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0x404040));

    // 5. 添加地面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
```

### 8.3 加载机器人模型

创建 `src/core/robot-renderer.ts`：

```ts
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export class RobotRenderer {
  private scene: THREE.Scene;
  private robot: THREE.Group;
  private loader: STLLoader;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.robot = new THREE.Group();
    this.loader = new STLLoader();
    this.scene.add(this.robot);
  }

  async loadRobot(xmlPath: string) {
    // 1. 解析 XML 获取 mesh 列表
    const xmlRes = await fetch(xmlPath);
    const xmlText = await xmlRes.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // 2. 获取 mesh 路径
    const basePath = xmlPath.substring(0, xmlPath.lastIndexOf('/'));
    const meshdir = xmlDoc.querySelector('compiler')?.getAttribute('meshdir') || './meshes/';
    const meshPath = `${basePath}/${meshdir}`;

    // 3. 加载所有 STL 文件
    const meshes = xmlDoc.querySelectorAll('asset > mesh');
    for (const mesh of meshes) {
      const file = mesh.getAttribute('file');
      if (file) {
        await this.loadMesh(`${meshPath}${file}`);
      }
    }

    // 4. 坐标系转换：MuJoCo (Z-up) → Three.js (Y-up)
    this.robot.rotation.x = -Math.PI / 2;
  }

  private async loadMesh(path: string) {
    const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject);
    });

    const material = new THREE.MeshPhongMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);
    this.robot.add(mesh);
  }
}
```

**关键点**：
- STL 文件：3D 模型格式，描述物体表面的三角形网格
- Group：Three.js 的容器，可以包含多个 mesh
- 坐标系转换：MuJoCo 使用 Z 轴向上，Three.js 使用 Y 轴向上

---

## 9. 第六步：整合仿真循环

### 9.1 仿真循环原理

**核心流程**：

```
┌─────────────────────────────────────────┐
│          仿真循环 (每帧执行)             │
├─────────────────────────────────────────┤
│ 1. 获取当前状态 (关节角度、速度)        │
│         ↓                               │
│ 2. 神经网络推理 (计算控制指令)          │
│         ↓                               │
│ 3. 应用控制指令到 MuJoCo                │
│         ↓                               │
│ 4. MuJoCo 物理仿真 (计算下一帧)         │
│         ↓                               │
│ 5. Three.js 渲染 (显示画面)             │
│         ↓                               │
│ 回到步骤 1                              │
└─────────────────────────────────────────┘
```

### 9.2 创建仿真器

创建 `src/core/simulator.ts`：

```ts
import { MujocoLoader } from './mujoco';
import { PolicyInference } from './policy';
import { RobotRenderer } from './robot-renderer';

export class Simulator {
  private mujoco: MujocoLoader;
  private policy: PolicyInference;
  private renderer: RobotRenderer;
  private running = false;

  constructor(
    mujoco: MujocoLoader,
    policy: PolicyInference,
    renderer: RobotRenderer
  ) {
    this.mujoco = mujoco;
    this.policy = policy;
    this.renderer = renderer;
  }

  start() {
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
  }

  private async loop() {
    if (!this.running) return;

    // 1. 获取当前状态
    const jointPos = this.mujoco.getJointPositions();
    
    // 2. 神经网络推理
    const action = await this.policy.infer(jointPos);
    
    // 3. 应用控制指令
    this.mujoco.setJointPositions(Array.from(action));
    
    // 4. 物理仿真
    this.mujoco.step();
    
    // 5. 渲染
    this.renderer.render();

    // 下一帧
    requestAnimationFrame(() => this.loop());
  }
}
```

### 9.3 在 Vue 中使用

编辑 `src/App.vue`：

```vue
<template>
  <div ref="container" class="container"></div>
  <div class="controls">
    <button @click="start">开始</button>
    <button @click="stop">停止</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SceneRenderer } from './core/renderer';
import { MujocoLoader } from './core/mujoco';
import { PolicyInference } from './core/policy';
import { RobotRenderer } from './core/robot-renderer';
import { Simulator } from './core/simulator';

const container = ref<HTMLElement>();
let simulator: Simulator;

onMounted(async () => {
  // 1. 初始化渲染器
  const sceneRenderer = new SceneRenderer(container.value!);
  
  // 2. 加载 MuJoCo
  const mujoco = new MujocoLoader();
  await mujoco.init('/examples/scenes/g1/g1.xml');
  
  // 3. 加载神经网络
  const policy = new PolicyInference();
  await policy.load(
    '/examples/checkpoints/g1/policy_amass.onnx',
    '/examples/checkpoints/g1/tracking_policy_amass.json'
  );
  
  // 4. 加载机器人模型
  const robotRenderer = new RobotRenderer(sceneRenderer.scene);
  await robotRenderer.loadRobot('/examples/scenes/g1/g1.xml');
  
  // 5. 创建仿真器
  simulator = new Simulator(mujoco, policy, robotRenderer);
});

const start = () => simulator?.start();
const stop = () => simulator?.stop();
</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
}
.controls {
  position: fixed;
  top: 20px;
  left: 20px;
}
</style>
```

---

## 10. 常见问题

### 10.1 SharedArrayBuffer 错误

**错误信息**：
```
ReferenceError: SharedArrayBuffer is not defined
```

**原因**：缺少跨域隔离 headers

**解决方案**：检查 `vite.config.ts` 是否配置了：
```ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

### 10.2 ONNX 模型加载失败

**错误信息**：
```
Failed to load ONNX model
```

**可能原因**：
1. 文件路径错误
2. 模型文件损坏
3. CORS 问题

**解决方案**：
- 检查 `public/examples/` 目录结构
- 在浏览器 Network 面板查看请求状态
- 确保文件可访问

### 10.3 机器人不显示

**可能原因**：
1. STL 文件未加载
2. 相机位置不对
3. 坐标系转换错误

**调试方法**：
```ts
// 打印机器人位置
console.log(robot.position);

// 打印场景中的对象
console.log(scene.children);

// 添加辅助坐标轴
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);
```

### 10.4 性能问题

**症状**：帧率低、卡顿

**优化方案**：
1. 减少 mesh 数量（合并相邻部件）
2. 降低推理频率（不是每帧都推理）
3. 使用 Web Worker 执行推理

```ts
// 每 5 帧推理一次
let frameCount = 0;
if (frameCount % 5 === 0) {
  const action = await policy.infer(obs);
}
frameCount++;
```

---

## 11. 进阶学习

### 11.1 理解坐标系转换

**MuJoCo 坐标系**：Z 轴向上（工程常用）
```
    Z (up)
    |
    |_____ Y
   /
  X
```

**Three.js 坐标系**：Y 轴向上（图形学常用）
```
    Y (up)
    |
    |_____ X
   /
  Z
```

**转换方法**：绕 X 轴旋转 -90°
```ts
robot.rotation.x = -Math.PI / 2;
```

### 11.2 四元数 vs 欧拉角

**欧拉角**：三个旋转角度 (roll, pitch, yaw)
- 优点：直观易懂
- 缺点：万向锁问题

**四元数**：四个数 [w, x, y, z]
- 优点：无万向锁、插值平滑
- 缺点：不直观

**在本项目中**：
- MuJoCo 使用四元数表示旋转
- Three.js 两者都支持

### 11.3 神经网络训练流程

本项目使用预训练模型，训练流程如下：

1. **数据采集**：录制真实人类动作（动作捕捉）
2. **数据处理**：转换为机器人关节角度
3. **训练策略**：强化学习（模仿学习）
4. **导出模型**：PyTorch → ONNX

### 11.4 扩展方向

**添加交互控制**：
```ts
// 键盘控制
document.addEventListener('keydown', (e) => {
  if (e.key === 'w') targetVelocity.z = 1;
  if (e.key === 's') targetVelocity.z = -1;
});
```

**切换动作**：
```ts
const motions = await motionLoader.loadIndex();
const motion = await motionLoader.loadMotion(motions[0].file);
// 播放动作序列
```

**添加物理交互**：
```ts
// 在 MuJoCo 中添加外力
mujoco.data.xfrc_applied[bodyId] = [fx, fy, fz, 0, 0, 0];
```

---

## 12. 总结

### 12.1 技术栈回顾

| 技术 | 作用 | 关键概念 |
|------|------|----------|
| **MuJoCo** | 物理仿真 | qpos, qvel, mj_step |
| **ONNX** | 神经网络推理 | Tensor, InferenceSession |
| **Three.js** | 3D 渲染 | Scene, Camera, Renderer |
| **Vue3** | UI 框架 | 组件化、响应式 |

### 12.2 数据流总览

```
资源文件                核心模块              输出
┌─────────────┐        ┌─────────────┐      ┌─────────────┐
│ g1.xml      │───────>│ MujocoLoader│      │             │
│ *.STL       │        └─────────────┘      │             │
└─────────────┘               │             │             │
                              │             │   浏览器    │
┌─────────────┐        ┌─────────────┐      │   3D 画面   │
│ policy.onnx │───────>│   Policy    │─────>│             │
│ config.json │        │  Inference  │      │             │
└─────────────┘        └─────────────┘      │             │
                              │             │             │
┌─────────────┐        ┌─────────────┐      │             │
│ motions.json│───────>│ MotionLoader│      │             │
└─────────────┘        └─────────────┘      └─────────────┘
                              │
                       ┌─────────────┐
                       │  Simulator  │
                       │   (循环)    │
                       └─────────────┘
```

### 12.3 关键要点

1. **MuJoCo WASM 需要 SharedArrayBuffer**
   - 必须配置 COOP 和 COEP headers

2. **坐标系转换很重要**
   - MuJoCo: Z-up
   - Three.js: Y-up
   - 转换：`rotation.x = -Math.PI / 2`

3. **神经网络是控制核心**
   - 输入：当前状态
   - 输出：控制指令
   - 每帧执行推理

4. **仿真循环是主线**
   - 状态 → 推理 → 控制 → 物理 → 渲染

### 12.4 学习路径建议

**初学者**：
1. 先运行起来，看到效果
2. 修改相机位置、光源颜色
3. 尝试加载不同的动作

**进阶**：
1. 理解 MuJoCo XML 格式
2. 学习 ONNX 模型结构
3. 实现键盘控制

**高级**：
1. 训练自己的控制策略
2. 添加物理交互
3. 优化性能（Web Worker）

---

## 13. 参考资源

### 13.1 官方文档

- **MuJoCo**: https://mujoco.readthedocs.io/
- **ONNX Runtime**: https://onnxruntime.ai/docs/
- **Three.js**: https://threejs.org/docs/
- **Vue3**: https://vuejs.org/guide/

### 13.2 相关项目

- **ECHO 原项目**: 机器人运动控制研究
- **Isaac Gym**: NVIDIA 的机器人仿真平台
- **PyBullet**: 另一个物理仿真引擎

### 13.3 学习资源

**MuJoCo 入门**：
- 官方教程：Understanding MuJoCo XML
- 示例场景：`mujoco/model/` 目录

**Three.js 入门**：
- 官方示例：https://threejs.org/examples/
- 推荐教程：Three.js Journey

**ONNX 入门**：
- 模型转换：PyTorch → ONNX
- 浏览器推理：onnxruntime-web

### 13.4 调试工具

**浏览器开发者工具**：
- Console：查看日志
- Network：检查资源加载
- Performance：分析性能

**Three.js 调试**：
```ts
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 添加轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);

// 添加坐标轴辅助
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 添加网格辅助
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);
```

---

## 附录 A：完整代码清单

### A.1 项目结构

```
ECHO-rebuild/
├── public/
│   └── examples/
│       ├── checkpoints/g1/
│       │   ├── policy_amass.onnx
│       │   ├── tracking_policy_amass.json
│       │   ├── motions.json
│       │   └── motions/*.json
│       └── scenes/g1/
│           ├── g1.xml
│           └── meshes/*.STL
├── src/
│   ├── core/
│   │   ├── types.ts
│   │   ├── mujoco.ts
│   │   ├── motion.ts
│   │   ├── policy.ts
│   │   ├── renderer.ts
│   │   ├── robot-renderer.ts
│   │   └── simulator.ts
│   ├── App.vue
│   └── main.ts
├── docs/
│   ├── 00-complete-tutorial.md  (本文档)
│   ├── 01-project-setup.md
│   ├── 02-mujoco-loader.md
│   ├── 03-motion-data.md
│   └── 04-onnx-inference.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### A.2 package.json

```json
{
  "name": "echo-rebuild",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mujoco/mujoco": "^3.6.1",
    "onnxruntime-web": "^1.24.3",
    "three": "^0.183.2",
    "vue": "^3.5.30"
  },
  "devDependencies": {
    "@types/node": "^24.12.0",
    "@types/three": "^0.183.1",
    "@vitejs/plugin-vue": "^6.0.5",
    "@vue/tsconfig": "^0.9.0",
    "typescript": "~5.9.3",
    "vite": "^8.0.1",
    "vue-tsc": "^3.2.5"
  }
}
```

### A.3 vite.config.ts

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
```

---

## 附录 B：术语表

| 术语 | 英文 | 解释 |
|------|------|------|
| 关节 | Joint | 机器人身体的连接点，可旋转或移动 |
| 自由度 | DOF (Degrees of Freedom) | 可独立运动的方向数量 |
| 四元数 | Quaternion | 表示旋转的四维数 [w, x, y, z] |
| 欧拉角 | Euler Angles | 表示旋转的三个角度 [roll, pitch, yaw] |
| 张量 | Tensor | 多维数组，神经网络的数据格式 |
| 推理 | Inference | 使用训练好的模型进行预测 |
| 网格 | Mesh | 3D 模型的表面，由三角形组成 |
| 场景 | Scene | 包含所有 3D 对象的容器 |
| 渲染 | Render | 将 3D 场景绘制成 2D 图像 |
| 帧率 | FPS (Frames Per Second) | 每秒渲染的画面数 |

---

## 结语

恭喜你完成了这个教程！现在你应该理解了：

✅ 如何搭建 Vue3 + Three.js 项目  
✅ MuJoCo 物理引擎的基本使用  
✅ ONNX 神经网络推理流程  
✅ Three.js 3D 渲染原理  
✅ 机器人运动控制的完整流程  

**下一步**：
- 尝试修改代码，添加自己的功能
- 学习如何训练自己的控制策略
- 探索更多机器人模型和动作

**遇到问题？**
- 查看项目 `docs/` 目录下的详细文档
- 检查浏览器控制台的错误信息
- 参考官方文档和示例代码

祝你学习愉快！🚀
