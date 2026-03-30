# 01 - 项目搭建

## 目标
搭建 Vite + Vue3 + TypeScript 工程，配置 MuJoCo WASM 运行环境。

## 核心依赖

```json
{
  "three": "^0.183.2",           // 3D 渲染
  "onnxruntime-web": "^1.24.3",  // ONNX 推理
  "vue": "^3.5.30"               // UI 框架
}
```

## 关键配置

### vite.config.ts

MuJoCo WASM 需要 `SharedArrayBuffer`，必须设置这两个 HTTP header：

```ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

**为什么？** SharedArrayBuffer 是多线程共享内存的 API，浏览器出于安全考虑要求页面处于"跨域隔离"状态才能使用。

## 项目结构

```
ECHO-rebuild/
├── src/
│   ├── core/           # 核心模块
│   │   ├── mujoco.ts   # MuJoCo 加载器
│   │   ├── motion.ts   # 动作数据解析
│   │   └── policy.ts   # ONNX 推理
│   ├── App.vue
│   └── main.ts
├── docs/               # 学习文档
└── public/             # 静态资源
```

## 资源引用

本项目引用 `/c/Project/ECHO/web/examples/` 下的资源：
- `checkpoints/g1/policy_amass.onnx` - ONNX 模型
- `checkpoints/g1/tracking_policy_amass.json` - 策略配置
- `checkpoints/g1/motions.json` - 动作索引
- `scenes/g1/g1.xml` - MuJoCo 场景
- `scenes/g1/meshes/*.STL` - 机器人网格

## 运行

```bash
npm run dev
```

访问 http://localhost:5173
