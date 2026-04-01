export async function loadMeshesToVFS(mujoco: any, basePath: string) {
  const meshFiles = [
    'pelvis.stl', 'left_hip_pitch_link.stl', 'left_hip_roll_link.stl',
    'left_hip_yaw_link.stl', 'left_knee_link.stl', 'left_ankle_pitch_link.stl',
    'left_ankle_roll_link.stl', 'right_hip_pitch_link.stl', 'right_hip_roll_link.stl',
    'right_hip_yaw_link.stl', 'right_knee_link.stl', 'right_ankle_pitch_link.stl',
    'right_ankle_roll_link.stl', 'torso_link.stl', 'left_shoulder_pitch_link.stl',
    'left_shoulder_roll_link.stl', 'left_shoulder_yaw_link.stl', 'left_elbow_link.stl',
    'right_shoulder_pitch_link.stl', 'right_shoulder_roll_link.stl',
    'right_shoulder_yaw_link.stl', 'right_elbow_link.stl', 'logo_link.stl', 'head_link.stl'
  ]

  // 创建meshes目录在/working下
  try {
    mujoco.FS.mkdir('/working/meshes')
  } catch (e) {}

  for (const file of meshFiles) {
    try {
      const res = await fetch(`${basePath}/meshes/${file}`)
      const buffer = await res.arrayBuffer()
      mujoco.FS.writeFile(`/working/meshes/${file}`, new Uint8Array(buffer))
      console.log(`加载mesh: ${file}`)
    } catch (e) {
      console.warn(`跳过mesh: ${file}`)
    }
  }
}
