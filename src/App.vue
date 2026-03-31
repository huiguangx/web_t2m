<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RobotRenderer } from './core/robot-renderer'
import { MotionLoader } from './core/motion'
import { AnimationController } from './core/animation-controller'

const canvasContainer = ref<HTMLDivElement>()
const status = ref('初始化中...')

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let robotRenderer: RobotRenderer
let animController: AnimationController

onMounted(async () => {
  try {
    initThreeJS()
    await init()
  } catch (e) {
    status.value = '初始化失败: ' + (e as Error).message
    console.error(e)
  }
})

async function init() {
  if (!robotRenderer) {
    status.value = '初始化失败'
    return
  }
  try {
    status.value = '加载机器人模型...'
    await robotRenderer.loadRobot('/examples/scenes/g1/g1.xml')

    status.value = '加载动作数据...'
    const motionLoader = new MotionLoader()
    const motionData = await motionLoader.loadMotion('walk1_subject1.json')

    animController = new AnimationController()
    animController.loadMotion(motionData)
    animController.play()

    status.value = '就绪'
  } catch (e) {
    status.value = '错误: ' + (e as Error).message
    console.error(e)
  }
}

function initThreeJS() {
  if (!canvasContainer.value) {
    throw new Error('Canvas container not found')
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2a3f5f)

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(3, 2, 4)

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: document.createElement('canvas'),
      context: undefined,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    canvasContainer.value.appendChild(renderer.domElement)
  } catch (e) {
    throw new Error('WebGL初始化失败，请刷新页面重试')
  }

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.8, 0)
  controls.update()

  const light1 = new THREE.DirectionalLight(0xffffff, 0.8)
  light1.position.set(2, 3, 4)
  scene.add(light1)

  const light2 = new THREE.DirectionalLight(0xffffff, 0.5)
  light2.position.set(-2, 3, 3)
  scene.add(light2)

  scene.add(new THREE.AmbientLight(0x404040, 0.5))

  const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
  scene.add(grid)

  robotRenderer = new RobotRenderer(scene)

  animate()
}

function animate() {
  if (!renderer) return
  requestAnimationFrame(animate)

  if (animController && robotRenderer) {
    const frame = animController.getCurrentFrame()
    if (frame) {
      robotRenderer.updatePose(frame.jointPos, frame.rootPos)
    }
  }

  controls.update()
  renderer.render(scene, camera)
}


</script>

<template>
  <div id="echo-app">
    <div class="controls">
      <h1>ECHO: Humanoid Motion Control</h1>
      <div class="status">{{ status }}</div>
    </div>
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<style scoped>
#echo-app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  padding: 20px;
  border-radius: 8px;
  color: white;
}

.controls h1 {
  font-size: 18px;
  margin: 0 0 10px 0;
}

.status {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 10px;
}

.controls select, .controls button {
  margin: 5px;
  padding: 8px 12px;
  font-size: 14px;
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>
