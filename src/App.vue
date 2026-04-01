<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats.js'
import { RobotRenderer } from './core/robot-renderer'
import { MotionLoader } from './core/motion'
import { AnimationController } from './core/animation-controller'
import { PhysicsController } from './core/physics-controller'
import { CloudAPI } from './core/cloud-api'
import { MotionConverter } from './core/motion-converter'
import { Reflector } from './core/Reflector'
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
let stats: Stats

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

    status.value = '初始化物理引擎...'
    physicsController = new PhysicsController()
    try {
      await physicsController.init(
        '/examples/scenes/g1/g1.xml',
        '/examples/checkpoints/g1/policy_amass.onnx',
        '/examples/checkpoints/g1/tracking_policy_amass.json'
      )
      console.log('✅ 物理引擎初始化完成')
    } catch (e) {
      console.warn('⚠️ 物理引擎初始化失败，仅支持动作播放:', e)
    }

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
  scene.background = new THREE.Color(0.15, 0.25, 0.35)
  scene.fog = new THREE.Fog(scene.background, 15, 25.5)

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 100)
  camera.position.set(2.0, 1.7, 1.7)
  scene.add(camera)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(1.0)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  THREE.ColorManagement.enabled = false
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  canvasContainer.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.7, 0)
  controls.panSpeed = 2
  controls.zoomSpeed = 1
  controls.enableDamping = true
  controls.dampingFactor = 0.10
  controls.screenSpacePanning = true
  controls.update()

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2 * 3.14)
  scene.add(ambientLight)

  const spotlight = new THREE.SpotLight()
  spotlight.angle = 1.5
  spotlight.distance = 10000
  spotlight.penumbra = 0.5
  spotlight.castShadow = true
  spotlight.intensity = spotlight.intensity * 3.14 * 15.0
  spotlight.shadow.mapSize.width = 1024
  spotlight.shadow.mapSize.height = 1024
  spotlight.shadow.camera.near = 0.1
  spotlight.shadow.camera.far = 100
  spotlight.position.set(0, 5, 0)
  const targetObject = new THREE.Object3D()
  scene.add(targetObject)
  spotlight.target = targetObject
  targetObject.position.set(0, 1, 0)
  scene.add(spotlight)

  const groundGeometry = new THREE.PlaneGeometry(100, 100)

  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 360
  const ctx = canvas.getContext('2d')!
  const tileSize = 18
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? 'rgb(51, 77, 102)' : 'rgb(26, 51, 77)'
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(10, 10)

  const reflector = new Reflector(groundGeometry, { clipBias: 0.003, texture })
  reflector.rotateX(-Math.PI / 2)
  scene.add(reflector)

  stats = new Stats()
  stats.dom.style.position = 'absolute'
  stats.dom.style.top = '0px'
  stats.dom.style.right = '0px'
  stats.dom.style.left = 'auto'
  document.body.appendChild(stats.dom)

  robotRenderer = new RobotRenderer(scene)

  window.addEventListener('resize', onWindowResize)
  animate()
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
  if (!renderer) return
  requestAnimationFrame(animate)

  stats.begin()

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

  stats.end()
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
