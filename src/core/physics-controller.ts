import { MujocoLoader } from './mujoco'
import { PolicyInference } from './policy'

export class PhysicsController {
  private mujoco: MujocoLoader
  private policy: PolicyInference | null = null
  private usePhysics = false

  constructor() {
    this.mujoco = new MujocoLoader()
  }

  async init(xmlPath: string, policyPath?: string, configPath?: string) {
    await this.mujoco.init(xmlPath)

    if (policyPath && configPath) {
      this.policy = new PolicyInference()
      await this.policy.load(policyPath, configPath)
      this.usePhysics = true
    }
  }

  async step(targetJointPos: number[]): Promise<number[]> {
    if (this.usePhysics && this.policy) {
      const currentPos = this.mujoco.getJointPositions()
      const obs = new Float32Array([...targetJointPos, ...currentPos])
      const action = await this.policy.infer(obs)

      this.mujoco.setJointPositions(Array.from(action))
      this.mujoco.step()

      return Array.from(this.mujoco.getJointPositions())
    } else {
      this.mujoco.setJointPositions(targetJointPos)
      return targetJointPos
    }
  }

  enablePhysics(enable: boolean) {
    this.usePhysics = enable && this.policy !== null
  }
}
