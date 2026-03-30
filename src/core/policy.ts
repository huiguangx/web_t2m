import * as ort from 'onnxruntime-web';
import type { PolicyConfig } from './types';

export class PolicyInference {
  private session: ort.InferenceSession | null = null;
  private config: PolicyConfig | null = null;

  async load(modelPath: string, configPath: string) {
    const [modelRes, configRes] = await Promise.all([
      fetch(modelPath),
      fetch(configPath)
    ]);

    const modelBuffer = await modelRes.arrayBuffer();
    this.session = await ort.InferenceSession.create(modelBuffer);
    this.config = await configRes.json();
  }

  async infer(obs: Float32Array): Promise<Float32Array> {
    if (!this.session) throw new Error('Model not loaded');

    const tensor = new ort.Tensor('float32', obs, [1, obs.length]);
    const feeds = { policy: tensor };
    const results = await this.session.run(feeds);

    return results.action.data as Float32Array;
  }
}
