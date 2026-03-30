# 04 - ONNX 推理引擎

## 模型信息

- **路径**: `policy_amass.onnx` (8.9MB)
- **输入**: `policy` - shape [1, 475]
- **输出**: `action` - shape [1, 29]

## 观测向量构成 (475 维)

根据 `tracking_policy_amass.json` 的 `obs_config`：

1. **BootIndicator** (1维) - 启动标志
2. **TrackingCommandObsRaw** (5帧 × 38维 = 190维) - 目标动作指令
3. **TargetRootZObs** (5帧 × 1维 = 5维) - 目标根高度
4. **TargetJointPosObs** (5帧 × 29维 = 145维) - 目标关节位置
5. **TargetProjectedGravityBObs** (5帧 × 3维 = 15维) - 目标重力投影
6. **RootAngVelB** (3维) - 根角速度
7. **ProjectedGravityB** (3维) - 当前重力投影
8. **JointPos** (6帧 × 29维 = 174维) - 历史关节位置
9. **PrevActions** (3帧 × 29维 = 87维) - 历史动作

**总计**: 1+190+5+145+15+3+3+174+87 = 623维 (需核对)

## 动作输出

29 维动作对应 29 个关节的目标位置增量，需乘以 `action_scale` 后应用。

## 使用示例

```ts
const policy = new PolicyInference();
await policy.load(
  '/c/Project/ECHO/web/examples/checkpoints/g1/policy_amass.onnx',
  '/c/Project/ECHO/web/examples/checkpoints/g1/tracking_policy_amass.json'
);

const obs = new Float32Array(475); // 填充观测
const action = await policy.infer(obs);
```
