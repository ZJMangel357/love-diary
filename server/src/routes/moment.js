// 时光记录路由
const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const auth = require('../middleware/auth')
const { success, fail } = require('../utils/response')

// 获取时光列表
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM moments WHERE couple_id = ? ORDER BY date DESC', [req.coupleId])
    const list = rows.map(r => ({
      ...r,
      images: r.images ? JSON.parse(r.images) : []
    }))
    res.json(success(list))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 添加时光
router.post('/', auth, async (req, res) => {
  const { title, content, date, images, mood, location } = req.body
  if (!title || !date) return res.json(fail('标题和日期不能为空'))
  try {
    const [result] = await pool.query(
      'INSERT INTO moments (couple_id, title, content, date, images, mood, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.coupleId, title, content || '', date, JSON.stringify(images || []), mood || '💕', location || '']
    )
    res.json(success({ id: result.insertId }, '添加成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 更新时光
router.put('/:id', auth, async (req, res) => {
  const { title, content, date, images, mood, location } = req.body
  try {
    await pool.query(
      'UPDATE moments SET title=?, content=?, date=?, images=?, mood=?, location=? WHERE id=? AND couple_id=?',
      [title, content || '', date, JSON.stringify(images || []), mood || '💕', location || '', req.params.id, req.coupleId]
    )
    res.json(success(null, '更新成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 删除时光
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM moments WHERE id = ? AND couple_id = ?', [req.params.id, req.coupleId])
    res.json(success(null, '删除成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

module.exports = router
