import {
  Color,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Plane,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  HalfFloatType,
  NoToneMapping,
  LinearSRGBColorSpace,
  MeshPhysicalMaterial,
  BufferGeometry,
  Texture,
  WebGLRenderer,
  Scene,
  Camera
} from 'three';

interface ReflectorOptions {
  color?: number;
  textureWidth?: number;
  textureHeight?: number;
  clipBias?: number;
  multisample?: number;
  texture?: Texture;
}

export class Reflector extends Mesh {
  isReflector = true;
  type = 'Reflector';
  camera: PerspectiveCamera;
  private renderTarget: WebGLRenderTarget;

  constructor(geometry: BufferGeometry, options: ReflectorOptions = {}) {
    super(geometry);

    const textureWidth = options.textureWidth || 1024;
    const textureHeight = options.textureHeight || 1024;
    const clipBias = options.clipBias || 0;
    const multisample = options.multisample ?? 4;
    const blendTexture = options.texture;

    const reflectorPlane = new Plane();
    const normal = new Vector3();
    const reflectorWorldPosition = new Vector3();
    const cameraWorldPosition = new Vector3();
    const rotationMatrix = new Matrix4();
    const lookAtPosition = new Vector3(0, 0, -1);
    const clipPlane = new Vector4();
    const view = new Vector3();
    const target = new Vector3();
    const q = new Vector4();
    const textureMatrix = new Matrix4();

    this.camera = new PerspectiveCamera();
    this.renderTarget = new WebGLRenderTarget(textureWidth, textureHeight, {
      samples: multisample,
      type: HalfFloatType
    });

    this.material = new MeshPhysicalMaterial({ map: blendTexture });
    (this.material as any).uniforms = {
      tDiffuse: { value: this.renderTarget.texture },
      textureMatrix: { value: textureMatrix }
    };

    this.material.onBeforeCompile = (shader) => {
      const bodyStart = shader.vertexShader.indexOf('void main() {');
      shader.vertexShader =
        shader.vertexShader.slice(0, bodyStart) +
        '\nuniform mat4 textureMatrix;\nvarying vec4 vUv3;\n' +
        shader.vertexShader.slice(bodyStart - 1, -1) +
        '	vUv3 = textureMatrix * vec4( position, 1.0 ); }';

      const fragBodyStart = shader.fragmentShader.indexOf('void main() {');
      shader.fragmentShader =
        '\nuniform sampler2D tDiffuse; \n varying vec4 vUv3;\n' +
        shader.fragmentShader.slice(0, fragBodyStart) +
        shader.fragmentShader.slice(fragBodyStart - 1, -1) +
        `	gl_FragColor = vec4( mix( texture2DProj( tDiffuse,  vUv3 ).rgb, gl_FragColor.rgb , 0.5), 1.0 );
					}`;

      shader.uniforms.tDiffuse = { value: this.renderTarget.texture };
      shader.uniforms.textureMatrix = { value: textureMatrix };
      (this.material as any).uniforms = shader.uniforms;
      (this.material as any).userData.shader = shader;
    };

    this.receiveShadow = true;

    this.onBeforeRender = (
      renderer: WebGLRenderer,
      scene: Scene,
      camera: Camera
    ) => {
      reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

      rotationMatrix.extractRotation(this.matrixWorld);
      normal.set(0, 0, 1);
      normal.applyMatrix4(rotationMatrix);

      view.subVectors(reflectorWorldPosition, cameraWorldPosition);
      if (view.dot(normal) > 0) return;

      view.reflect(normal).negate();
      view.add(reflectorWorldPosition);

      rotationMatrix.extractRotation(camera.matrixWorld);
      lookAtPosition.set(0, 0, -1);
      lookAtPosition.applyMatrix4(rotationMatrix);
      lookAtPosition.add(cameraWorldPosition);

      target.subVectors(reflectorWorldPosition, lookAtPosition);
      target.reflect(normal).negate();
      target.add(reflectorWorldPosition);

      this.camera.position.copy(view);
      this.camera.up.set(0, 1, 0);
      this.camera.up.applyMatrix4(rotationMatrix);
      this.camera.up.reflect(normal);
      this.camera.lookAt(target);

      this.camera.far = (camera as PerspectiveCamera).far;
      this.camera.updateMatrixWorld();
      this.camera.projectionMatrix.copy((camera as PerspectiveCamera).projectionMatrix);

      textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
      );
      textureMatrix.multiply(this.camera.projectionMatrix);
      textureMatrix.multiply(this.camera.matrixWorldInverse);
      textureMatrix.multiply(this.matrixWorld);

      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      reflectorPlane.applyMatrix4(this.camera.matrixWorldInverse);

      clipPlane.set(
        reflectorPlane.normal.x,
        reflectorPlane.normal.y,
        reflectorPlane.normal.z,
        reflectorPlane.constant
      );

      const projectionMatrix = this.camera.projectionMatrix;
      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      q.z = -1.0;
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
      projectionMatrix.elements[2] = clipPlane.x;
      projectionMatrix.elements[6] = clipPlane.y;
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
      projectionMatrix.elements[14] = clipPlane.w;

      this.visible = false;

      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      const currentOutputEncoding = renderer.outputColorSpace;
      const currentToneMapping = renderer.toneMapping;

      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.outputColorSpace = LinearSRGBColorSpace;
      renderer.toneMapping = NoToneMapping;

      renderer.setRenderTarget(this.renderTarget);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, this.camera);

      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.outputColorSpace = currentOutputEncoding;
      renderer.toneMapping = currentToneMapping;
      renderer.setRenderTarget(currentRenderTarget);

      const viewport = (camera as any).viewport;
      if (viewport !== undefined) {
        renderer.state.viewport(viewport);
      }

      this.visible = true;
    };
  }

  getRenderTarget() {
    return this.renderTarget;
  }

  dispose() {
    this.renderTarget.dispose();
    this.material.dispose();
  }
}
