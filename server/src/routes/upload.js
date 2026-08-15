// 图片上传路由
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const auth = require('../middleware/auth')

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `img_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, filename)
  }
})

// 文件过滤（仅图片）
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('仅支持 JPG/PNG/GIF/WebP 格式'), false)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})

// 单图上传（需登录）
router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ code: 1, message: '请选择要上传的图片' })
  }
  // 返回可访问URL（使用相对路径，前端拼接BASE_URL）
  const url = `/uploads/${req.file.filename}`
  res.json({
    code: 0,
    message: '上传成功',
    data: { url, filename: req.file.filename, size: req.file.size }
  })
})

// 多图上传（需登录，最多9张）
router.post('/multi', auth, upload.array('files', 9), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.json({ code: 1, message: '请选择要上传的图片' })
  }
  const urls = req.files.map(f => `/uploads/${f.filename}`)
  res.json({ code: 0, message: '上传成功', data: { urls } })
})

module.exports = router
