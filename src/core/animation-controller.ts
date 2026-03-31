import type { MotionFrame } from './types'

export class AnimationController {
  private motionData: MotionFrame | null = null
  private frameIndex = 0
  private playing = false

  loadMotion(data: MotionFrame) {
    this.motionData = data
    this.frameIndex = 0
  }

  play() {
    this.playing = true
  }

  pause() {
    this.playing = false
  }

  getCurrentFrame() {
    if (!this.motionData || !this.playing) return null

    const totalFrames = this.motionData.joint_pos.length
    const frame = {
      jointPos: this.motionData.joint_pos[this.frameIndex],
      rootPos: this.motionData.root_pos[this.frameIndex],
      rootQuat: this.motionData.root_quat[this.frameIndex]
    }

    this.frameIndex = (this.frameIndex + 1) % totalFrames
    return frame
  }
}
