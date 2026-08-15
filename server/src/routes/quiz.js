// 心有灵犀（默契测试）路由
const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const auth = require('../middleware/auth')
const { success, fail } = require('../utils/response')

// 保存当前用户的答题结果（每题一个选择下标数组 answers，score 为 0-100 自评默契度）
router.post('/submit', auth, async (req, res) => {
  const { quizId, answers, score } = req.body
  if (!quizId || !Array.isArray(answers)) return res.json(fail('参数不完整'))

  try {
    await pool.query(
      `INSERT INTO quiz_records (couple_id, user_id, quiz_id, answers, score) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE answers = VALUES(answers), score = VALUES(score)`,
      [req.coupleId, req.userId, quizId, JSON.stringify(answers), score || 0]
    )
    res.json(success(null, '答案已提交'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 获取某套题的双方答题情况与默契度
router.get('/result', auth, async (req, res) => {
  const quizId = req.query.quizId
  if (!quizId) return res.json(fail('缺少 quizId'))

  try {
    const [rows] = await pool.query(
      'SELECT * FROM quiz_records WHERE couple_id = ? AND quiz_id = ?',
      [req.coupleId, quizId]
    )

    const mine = rows.find(r => r.user_id === req.userId) || null
    const partner = rows.find(r => r.user_id !== req.userId) || null

    const parse = (r) => r ? { user_id: r.user_id, answers: JSON.parse(r.answers || '[]'), score: r.score, updated_at: r.updated_at } : null

    const myData = parse(mine)
    const partnerData = parse(partner)

    // 双方都答过才计算默契度
    let matchCount = 0
    let total = 0
    if (myData && partnerData && myData.answers.length && partnerData.answers.length) {
      total = Math.min(myData.answers.length, partnerData.answers.length)
      for (let i = 0; i < total; i++) {
        if (myData.answers[i] === partnerData.answers[i]) matchCount++
      }
    }
    const matchRate = total > 0 ? Math.round((matchCount / total) * 100) : null

    res.json(success({
      quizId,
      mine: myData,
      partner: partnerData,
      partnerDone: !!partnerData,
      bothDone: !!(myData && partnerData),
      matchCount,
      total,
      matchRate
    }))
  } catch (e) {
    res.json(fail(e.message))
  }
})

module.exports = router
