# 03 - 动作数据解析

## 数据格式

### motions.json (索引文件)
```json
{
  "format": "tracking-motion-index-v1",
  "base_path": "./motions",
  "motions": [
    {"name": "walk1_subject1", "file": "walk1_subject1.json"}
  ]
}
```

### 单个动作文件 (如 walk1_subject1.json)
```json
{
  "joint_pos": [[...], [...], ...],  // 每帧 29 个关节角度
  "root_quat": [[w,x,y,z], ...],     // 根节点四元数
  "root_pos": [[x,y,z], ...]         // 根节点位置
}
```

## 关节顺序

29 个关节按此顺序排列（来自 tracking_policy_amass.json）：
```
left_hip_pitch, right_hip_pitch, waist_yaw,
left_hip_roll, right_hip_roll, waist_roll,
left_hip_yaw, right_hip_yaw, waist_pitch,
left_knee, right_knee,
left_shoulder_pitch, right_shoulder_pitch,
left_ankle_pitch, right_ankle_pitch,
left_shoulder_roll, right_shoulder_roll,
left_ankle_roll, right_ankle_roll,
left_shoulder_yaw, right_shoulder_yaw,
left_elbow, right_elbow,
left_wrist_roll, right_wrist_roll,
left_wrist_pitch, right_wrist_pitch,
left_wrist_yaw, right_wrist_yaw
```

## 使用示例

```ts
const loader = new MotionLoader();
const motions = await loader.loadIndex();
const motion = await loader.loadMotion('walk1_subject1.json');

// 播放第 i 帧
const frame = motion.joint_pos[i];
// frame 是长度 29 的数组，对应上述关节顺序
```
