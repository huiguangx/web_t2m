export interface GenerateRequest {
  text: string
  motion_length?: number
  num_inference_steps?: number
}

export interface GenerateResponse {
  motion_id: string
  status: string
}

export interface MotionDataResponse {
  motion_id: string
  motion_data: number[][]
  duration: number
  fps: number
  status: string
}

export class CloudAPI {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    return await response.json()
  }

  async getMotion(motionId: string): Promise<MotionDataResponse> {
    const response = await fetch(`${this.baseUrl}/motions/${motionId}`)
    return await response.json()
  }

  async pollMotion(motionId: string, maxAttempts = 30): Promise<MotionDataResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const data = await this.getMotion(motionId)
      if (data.status === 'completed') return data
      if (data.status === 'failed') throw new Error('生成失败')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    throw new Error('超时')
  }
}
