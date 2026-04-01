export async function loadMeshesToVFS(mujoco: any, basePath: string) {
  const meshFiles = [
    'pelvis.STL', 'pelvis_contour_link.STL',
    'left_hip_pitch_link.STL', 'left_hip_roll_link.STL', 'left_hip_yaw_link.STL',
    'left_knee_link.STL', 'left_ankle_pitch_link.STL', 'left_ankle_roll_link.STL',
    'right_hip_pitch_link.STL', 'right_hip_roll_link.STL', 'right_hip_yaw_link.STL',
    'right_knee_link.STL', 'right_ankle_pitch_link.STL', 'right_ankle_roll_link.STL',
    'waist_yaw_link_rev_1_0.STL', 'waist_roll_link_rev_1_0.STL', 'torso_link_rev_1_0.STL',
    'left_shoulder_pitch_link.STL', 'left_shoulder_roll_link.STL', 'left_shoulder_yaw_link.STL',
    'left_elbow_link.STL', 'left_wrist_yaw_link.STL', 'left_wrist_roll_link.STL',
    'left_wrist_pitch_link.STL', 'left_rubber_hand.STL',
    'right_shoulder_pitch_link.STL', 'right_shoulder_roll_link.STL', 'right_shoulder_yaw_link.STL',
    'right_elbow_link.STL', 'right_wrist_yaw_link.STL', 'right_wrist_roll_link.STL',
    'right_wrist_pitch_link.STL', 'right_rubber_hand.STL',
    'logo_link.STL', 'head_link.STL'
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
