// Express 主入口
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 路由
app.use('/api/auth', require('./routes/auth'))
app.use('/api/menus', require('./routes/menu'))
app.use('/api/anniversaries', require('./routes/anniversary'))
app.use('/api/period', require('./routes/period'))
app.use('/api/moments', require('./routes/moment'))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'running', time: new Date().toISOString() } })
})

// 启动服务
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('==================================')
  console.log('  甜蜜日记后端服务已启动')
  console.log('  地址: http://localhost:' + PORT)
  console.log('  健康检查: http://localhost:' + PORT + '/api/health')
  console.log('==================================')
})
