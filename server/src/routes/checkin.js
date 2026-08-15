// 恋爱打卡路由
const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const auth = require('../middleware/auth')
const { success, fail } = require('../utils/response')

// 今天日期字符串 YYYY-MM-DD（本地时区）
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日期加减
function addDays(dateStr, offset) {
  const d = new Date(dateStr.replace(/-/g, '/'))
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 当前用户是 couple 里的 user1 还是 user2
function getRole(couple, userId) {
  if (couple.user1_id === userId) return 'user1'
  if (couple.user2_id === userId) return 'user2'
  return null
}

// 获取情侣关系（含 user1_id/user2_id）
async function getCouple(coupleId) {
  const [rows] = await pool.query('SELECT * FROM couples WHERE id = ?', [coupleId])
  return rows[0] || null
}

// 打卡状态（今天 + 连续天数 + 双方状态）
router.get('/status', auth, async (req, res) => {
  try {
    const couple = await getCouple(req.coupleId)
    if (!couple) return res.json(fail('情侣关系不存在'))

    const role = getRole(couple, req.userId)
    const today = todayStr()
    const [rows] = await pool.query('SELECT * FROM checkins WHERE couple_id = ? ORDER BY check_date DESC LIMIT 30', [req.coupleId])
    const map = {}
    rows.forEach(r => { map[r.check_date] = r })

    const todayRow = map[today] || { check_date: today, user1_done: 0, user2_done: 0, note: '' }
    const myDone = role === 'user1' ? !!todayRow.user1_done : !!todayRow.user2_done
    const partnerDone = role === 'user1' ? !!todayRow.user2_done : !!todayRow.user1_done

    // 共同连续打卡天数：今天双方都完成则从今天起算；否则从昨天起算（今天进行中不断签）
    let streak = 0
    let cursor = today
    if (!(myDone && partnerDone)) cursor = addDays(today, -1)
    for (let i = 0; i < 30; i++) {
      const row = map[cursor]
      if (row && row.user1_done && row.user2_done) {
        streak++
        cursor = addDays(cursor, -1)
      } else {
        break
      }
    }

    res.json(success({
      today: {
        check_date: today,
        myDone,
        partnerDone,
        bothDone: myDone && partnerDone,
        note: todayRow.note || ''
      },
      streak,
      myRole: role,
      history: rows.map(r => ({
        check_date: r.check_date,
        user1_done: !!r.user1_done,
        user2_done: !!r.user2_done,
        bothDone: !!(r.user1_done && r.user2_done),
        note: r.note || '',
        // 按当前用户视角提供字段，前端直接使用
        my_done: role === 'user1' ? !!r.user1_done : !!r.user2_done,
        partner_done: role === 'user1' ? !!r.user2_done : !!r.user1_done
      }))
    }))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 打卡（标记当前用户今天已打卡，可携带寄语）
router.post('/', auth, async (req, res) => {
  const { note } = req.body
  try {
    const couple = await getCouple(req.coupleId)
    if (!couple) return res.json(fail('情侣关系不存在'))
    const role = getRole(couple, req.userId)
    if (!role) return res.json(fail('用户不属于该情侣关系'))

    const today = todayStr()
    // 存在则更新，不存在则插入
    await pool.query(
      `INSERT INTO checkins (couple_id, check_date, user1_done, user2_done, note) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ${role === 'user1' ? 'user1_done' : 'user2_done'} = 1, note = VALUES(note)`,
      [req.coupleId, today, role === 'user1' ? 1 : 0, role === 'user2' ? 1 : 0, note || '']
    )
    res.json(success(null, '打卡成功 💖'))
  } catch (e) {
    res.json(fail(e.message))
  }
})

// 打卡记录（最近N天，用于日历展示）
router.get('/history', auth, async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90)
  try {
    const start = addDays(todayStr(), -days)
    const [rows] = await pool.query(
      'SELECT * FROM checkins WHERE couple_id = ? AND check_date >= ? ORDER BY check_date ASC',
      [req.coupleId, start]
    )
    res.json(success(rows.map(r => ({
      check_date: r.check_date,
      user1_done: !!r.user1_done,
      user2_done: !!r.user2_done,
      bothDone: !!(r.user1_done && r.user2_done),
      note: r.note || ''
    }))))
  } catch (e) {
    res.json(fail(e.message))
  }
})

module.exports = router
