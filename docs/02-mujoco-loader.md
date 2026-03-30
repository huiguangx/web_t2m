# 02 - MuJoCo 模型加载

## MuJoCo WASM

使用官方包 `@mujoco/mujoco` 在浏览器中运行物理仿真。

## 安装

```bash
npm install @mujoco/mujoco
```

## 使用

```ts
import loadMujoco from '@mujoco/mujoco';

const mujoco = await loadMujoco();
const model = mujoco.Model.load_from_xml(xmlText);
const data = mujoco.Data.create(model);

// 仿真步进
mujoco.mj_step(model, data);
```

## G1 机器人模型

- **g1.xml** - MJCF 格式
- **29 个关节** + 7 DOF 自由关节（根节点）
- `data.qpos[0:7]` - 根位置和姿态
- `data.qpos[7:36]` - 29 个关节角度

## 参考

- [官方文档](https://github.com/google-deepmind/mujoco)
- [npm 包](https://www.npmjs.com/package/@mujoco/mujoco)

