// Motion data types
export interface MotionFrame {
  joint_pos: number[][];
  root_quat: number[][];
  root_pos: number[][];
}

export interface MotionInfo {
  name: string;
  file: string;
}

export interface MotionIndex {
  format: string;
  base_path: string;
  motions: MotionInfo[];
}

// Policy config types
export interface PolicyConfig {
  onnx: {
    meta: {
      in_keys: string[];
      out_keys: string[];
      in_shapes: number[][][];
    };
    path: string;
  };
  policy_joint_names: string[];
  action_scale: number[];
  default_joint_pos: number[];
}
