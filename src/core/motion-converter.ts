import type { MotionFrame } from './types'

export class MotionConverter {
  static cloud38ToLocal29(cloudData: number[][]): MotionFrame {
    const frames = cloudData.length
    const joint_pos: number[][] = []
    const root_pos: number[][] = []
    const root_quat: number[][] = []

    for (let i = 0; i < frames; i++) {
      const frame = cloudData[i]

      // 提取19个关节位置 (索引0-18)
      const joints19 = frame.slice(0, 19)
      // 扩展到29个关节 (补零)
      const joints29 = [...joints19, ...new Array(10).fill(0)]
      joint_pos.push(joints29)

      // 提取根节点高度 (索引25)
      const height = frame[25]
      root_pos.push([0, 0, height])

      // 从旋转矩阵提取四元数 (索引26-37)
      const rotMat = frame.slice(26, 38)
      const quat = this.rotMatToQuat(rotMat)
      root_quat.push(quat)
    }

    return { joint_pos, root_pos, root_quat }
  }

  private static rotMatToQuat(mat: number[]): number[] {
    // 简化：从3x4旋转矩阵提取四元数
    const m00 = mat[0], m01 = mat[1], m02 = mat[2]
    const m10 = mat[4], m11 = mat[5], m12 = mat[6]
    const m20 = mat[8], m21 = mat[9], m22 = mat[10]

    const trace = m00 + m11 + m22
    let w, x, y, z

    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2
      w = 0.25 * s
      x = (m21 - m12) / s
      y = (m02 - m20) / s
      z = (m10 - m01) / s
    } else {
      w = 1
      x = y = z = 0
    }

    return [w, x, y, z]
  }
}
