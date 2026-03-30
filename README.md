# ECHO-rebuild

逆向实现 ECHO 项目的源码工程，用于学习机器人动作控制。

## 已实现功能

✅ 项目搭建 - Vite + Vue3 + TypeScript
✅ MuJoCo 加载 - @mujoco/mujoco WASM
✅ 动作数据加载 - 解析 motion JSON 文件
✅ ONNX 推理 - 加载 policy_amass.onnx 模型
✅ Three.js 渲染 - 基础 3D 场景

## 学习文档

- [01-project-setup.md](docs/01-project-setup.md) - 项目配置
- [02-mujoco-loader.md](docs/02-mujoco-loader.md) - MuJoCo 模型
- [03-motion-data.md](docs/03-motion-data.md) - 动作数据格式
- [04-onnx-inference.md](docs/04-onnx-inference.md) - ONNX 推理

## 运行

```bash
npm run dev
```

访问 http://localhost:5173

## 项目结构

```
src/
├── core/
│   ├── types.ts    # 类型定义
│   ├── motion.ts   # 动作加载器
│   └── policy.ts   # ONNX 推理
└── App.vue         # 主界面
```
