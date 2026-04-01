# 测试指南（无需后端）

## 测试步骤

1. 打开浏览器访问 http://localhost:5174
2. 打开浏览器开发者工具（F12）查看Console

## 预期结果

### ✅ 成功标志
- 看到3D机器人模型
- 机器人在走路（默认walk1动作）
- 状态显示"就绪"或"播放中"
- 动作选择下拉菜单有17个选项
- 可以切换不同动作

### ❌ 如果失败
检查Console错误信息，常见问题：
- CORS错误：检查vite.config.ts的headers配置
- 文件404：检查public/examples/目录是否完整
- MuJoCo错误：SharedArrayBuffer不支持

## 快速验证

在浏览器Console输入：
```javascript
// 检查动作列表是否加载
console.log(document.querySelector('select')?.options.length)
// 应该显示 17

// 检查机器人是否渲染
console.log(document.querySelector('canvas'))
// 应该显示 <canvas>
```
