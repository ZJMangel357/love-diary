// 菜品路由
const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const auth = require('../middleware/auth')
const { success, fail } = require('../utils/response')

// 获取菜品列表
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menus WHERE couple_id = ? ORDER BY created_at DESC', [req.coupleId])
    const list = rows.map(r => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
      favorite: !!r.favorite
    }))
    res.json(success(list))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 添加菜品
router.post('/', auth, async (req, res) => {
  const { name, category, tags, difficulty, image, creator, favorite } = req.body
  if (!name) return res.json(fail('菜名不能为空'))
  try {
    const [result] = await pool.query(
      'INSERT INTO menus (couple_id, name, category, tags, difficulty, image, creator, favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.coupleId, name, category || '家常菜', JSON.stringify(tags || []), difficulty || 1, image || '', creator || '', favorite ? 1 : 0]
    )
    res.json(success({ id: result.insertId }, '添加成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 更新菜品
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params
  const { name, category, tags, difficulty, image, creator, favorite } = req.body
  try {
    await pool.query(
      'UPDATE menus SET name=?, category=?, tags=?, difficulty=?, image=?, creator=?, favorite=? WHERE id=? AND couple_id=?',
      [name, category || '家常菜', JSON.stringify(tags || []), difficulty || 1, image || '', creator || '', favorite ? 1 : 0, id, req.coupleId]
    )
    res.json(success(null, '更新成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 删除菜品
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM menus WHERE id = ? AND couple_id = ?', [req.params.id, req.coupleId])
    res.json(success(null, '删除成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 设置/取消今日菜单
router.put('/:id/today', auth, async (req, res) => {
  try {
    // 先清除所有今日标记
    await pool.query('UPDATE menus SET is_today = 0 WHERE couple_id = ?', [req.coupleId])
    // 设置新的今日菜品
    await pool.query('UPDATE menus SET is_today = 1 WHERE id = ? AND couple_id = ?', [req.params.id, req.coupleId])
    res.json(success(null, '已设为今日菜单'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

module.exports = router
