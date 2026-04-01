<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RobotRenderer } from './core/robot-renderer'
import { MotionLoader } from './core/motion'
import { AnimationController } from './core/animation-controller'
import { PhysicsController } from './core/physics-controller'
import { CloudAPI } from './core/cloud-api'
import { MotionConverter } from './core/motion-converter'
import type { MotionIndex } from './core/types'

const canvasContainer = ref<HTMLDivElement>()
const status = ref('初始化中...')
const motionList = ref<MotionIndex['motions']>([])
const selectedMotion = ref('')
const isPlaying = ref(false)
const usePhysics = ref(false)
const textInput = ref('')
const isGenerating = ref(false)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let robotRenderer: RobotRenderer
let animController: AnimationController
let motionLoader: MotionLoader
let physicsController: PhysicsController
let cloudAPI: CloudAPI

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
    console.log('✅ 机器人模型加载完成')

    status.value = '初始化物理引擎（测试g1模型）...'
    physicsController = new PhysicsController()
    await physicsController.init('/examples/scenes/g1/g1.xml')
    console.log('✅ 物理引擎初始化完成')

    cloudAPI = new CloudAPI()

    status.value = '加载动作列表...'
    motionLoader = new MotionLoader()
    const index = await motionLoader.loadMotionIndex()
    motionList.value = index.motions
    console.log('✅ 动作列表加载完成:', motionList.value.length)

    if (motionList.value.length > 0) {
      selectedMotion.value = motionList.value[0].file
      await loadSelectedMotion()
    }

    status.value = '就绪'
  } catch (e) {
    status.value = '错误: ' + (e as Error).message
    console.error('❌ 初始化错误:', e)
  }
}

async function loadSelectedMotion() {
  if (!selectedMotion.value) return
  try {
    status.value = '加载动作...'
    const motionData = await motionLoader.loadMotion(selectedMotion.value)

    if (!animController) {
      animController = new AnimationController()
    }
    animController.loadMotion(motionData)
    animController.play()
    isPlaying.value = true
    status.value = '播放中'
  } catch (e) {
    status.value = '加载失败: ' + (e as Error).message
  }
}

function togglePlayPause() {
  if (!animController) return
  if (isPlaying.value) {
    animController.pause()
    status.value = '已暂停'
  } else {
    animController.play()
    status.value = '播放中'
  }
  isPlaying.value = !isPlaying.value
}

function togglePhysics() {
  usePhysics.value = !usePhysics.value
  if (physicsController) {
    physicsController.enablePhysics(usePhysics.value)
  }
  status.value = usePhysics.value ? '物理模式' : '直接播放'
}

async function generateMotion() {
  if (!textInput.value.trim() || isGenerating.value) return

  try {
    isGenerating.value = true
    status.value = '生成中...'

    const result = await cloudAPI.generate({
      text: textInput.value,
      motion_length: 5.0,
      num_inference_steps: 10
    })

    status.value = '等待生成完成...'
    const motionData = await cloudAPI.pollMotion(result.motion_id)

    const localFormat = MotionConverter.cloud38ToLocal29(motionData.motion_data)

    if (!animController) {
      animController = new AnimationController()
    }
    animController.loadMotion(localFormat)
    animController.play()
    isPlaying.value = true

    status.value = '生成完成'
  } catch (e) {
    status.value = '生成失败: ' + (e as Error).message
  } finally {
    isGenerating.value = false
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
      if (usePhysics.value && physicsController) {
        physicsController.step(frame.jointPos).then(actualPos => {
          robotRenderer.updatePose(actualPos, frame.rootPos)
        })
      } else {
        robotRenderer.updatePose(frame.jointPos, frame.rootPos)
      }
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

      <div class="control-group">
        <label>动作选择:</label>
        <select v-model="selectedMotion" @change="loadSelectedMotion">
          <option v-for="motion in motionList" :key="motion.file" :value="motion.file">
            {{ motion.name }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label>文本生成:</label>
        <input
          v-model="textInput"
          type="text"
          placeholder="输入动作描述..."
          @keyup.enter="generateMotion"
        />
        <button @click="generateMotion" :disabled="isGenerating">
          {{ isGenerating ? '生成中...' : '生成' }}
        </button>
      </div>

      <div class="control-group">
        <button @click="togglePlayPause">
          {{ isPlaying ? '暂停' : '播放' }}
        </button>
      </div>

      <div class="control-group">
        <button @click="togglePhysics">
          {{ usePhysics ? '关闭物理' : '启用物理' }}
        </button>
      </div>
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
  margin-bottom: 15px;
}

.control-group {
  margin-bottom: 10px;
}

.control-group label {
  display: block;
  font-size: 12px;
  margin-bottom: 5px;
  color: #ccc;
}

.controls select, .controls button {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #555;
  background: #333;
  color: white;
  cursor: pointer;
}

.controls input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #555;
  background: #333;
  color: white;
  margin-bottom: 5px;
}

.controls button:hover {
  background: #444;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>
