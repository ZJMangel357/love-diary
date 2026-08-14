// 纪念日路由
const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const auth = require('../middleware/auth')
const { success, fail } = require('../utils/response')

// 获取纪念日列表
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM anniversaries WHERE couple_id = ? ORDER BY date ASC', [req.coupleId])
    const list = rows.map(r => ({
      ...r,
      repeat: r.repeat_type,
      important: !!r.important
    }))
    res.json(success(list))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 添加纪念日
router.post('/', auth, async (req, res) => {
  const { title, date, type, repeat, emoji, important } = req.body
  if (!title || !date) return res.json(fail('标题和日期不能为空'))
  try {
    const [result] = await pool.query(
      'INSERT INTO anniversaries (couple_id, title, date, type, repeat_type, emoji, important) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.coupleId, title, date, type || 'other', repeat || 'yearly', emoji || '💝', important ? 1 : 0]
    )
    res.json(success({ id: result.insertId }, '添加成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 更新纪念日
router.put('/:id', auth, async (req, res) => {
  const { title, date, type, repeat, emoji, important } = req.body
  try {
    await pool.query(
      'UPDATE anniversaries SET title=?, date=?, type=?, repeat_type=?, emoji=?, important=? WHERE id=? AND couple_id=?',
      [title, date, type || 'other', repeat || 'yearly', emoji || '💝', important ? 1 : 0, req.params.id, req.coupleId]
    )
    res.json(success(null, '更新成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 删除纪念日
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM anniversaries WHERE id = ? AND couple_id = ?', [req.params.id, req.coupleId])
    res.json(success(null, '删除成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

module.exports = router
