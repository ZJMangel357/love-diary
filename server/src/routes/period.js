// 经期路由
const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const auth = require('../middleware/auth')
const { success, fail } = require('../utils/response')

// 获取经期记录列表
router.get('/records', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM period_records WHERE couple_id = ? ORDER BY start_date DESC', [req.coupleId])
    const list = rows.map(r => ({
      ...r,
      symptoms: r.symptoms ? JSON.parse(r.symptoms) : []
    }))
    res.json(success(list))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 添加经期记录
router.post('/records', auth, async (req, res) => {
  const { startDate, note, symptoms, flowLevel } = req.body
  if (!startDate) return res.json(fail('请选择日期'))
  try {
    const [result] = await pool.query(
      'INSERT INTO period_records (couple_id, start_date, note, symptoms, flow_level) VALUES (?, ?, ?, ?, ?)',
      [req.coupleId, startDate, note || '', JSON.stringify(symptoms || []), flowLevel || 2]
    )
    res.json(success({ id: result.insertId }, '记录成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 删除经期记录
router.delete('/records/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM period_records WHERE id = ? AND couple_id = ?', [req.params.id, req.coupleId])
    res.json(success(null, '删除成功'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 获取经期配置
router.get('/config', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM period_config WHERE couple_id = ?', [req.coupleId])
    const config = rows[0] || { cycle_length: 28, period_length: 5 }
    res.json(success(config))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 更新经期配置
router.put('/config', auth, async (req, res) => {
  const { cycleLength, periodLength } = req.body
  try {
    // upsert
    await pool.query(
      `INSERT INTO period_config (couple_id, cycle_length, period_length) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cycle_length = ?, period_length = ?`,
      [req.coupleId, cycleLength || 28, periodLength || 5, cycleLength || 28, periodLength || 5]
    )
    res.json(success(null, '配置已更新'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

module.exports = router
