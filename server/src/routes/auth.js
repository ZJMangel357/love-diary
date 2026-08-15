// 认证路由 - 微信登录/配对
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const axios = require('axios')
const pool = require('../config/database')
const { success, fail } = require('../utils/response')
require('dotenv').config()

// 生成6位配对码
function genPairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// 生成JWT token
function genToken(userId, coupleId) {
  return jwt.sign({ userId, coupleId }, process.env.JWT_SECRET || 'love-diary-secret-key-2024', {
    expiresIn: process.env.JWT_EXPIRES || '7d'
  })
}

// 调用微信 code2Session 接口换取 openid
// 失败时降级使用 code 作为临时 openId，便于本地开发测试
async function code2Session(code) {
  const appid = process.env.WX_APPID
  const secret = process.env.WX_SECRET

  // 没有配置 AppID/AppSecret，直接降级（本地开发）
  if (!appid || !secret) {
    console.warn('[微信登录] 未配置 WX_APPID/WX_SECRET，使用 code 作为临时 openId')
    return { openid: 'dev_' + code, session_key: '' }
  }

  try {
    const { data } = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid,
        secret,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 5000
    })
    if (data.errcode) {
      console.warn('[微信登录] code2Session 返回错误:', data.errcode, data.errmsg)
      // 降级：用 code 作为临时 openId
      return { openid: 'dev_' + code, session_key: '' }
    }
    return { openid: data.openid, session_key: data.session_key || '' }
  } catch (e) {
    console.warn('[微信登录] code2Session 请求失败，降级使用 code 作为临时 openId:', e.message)
    return { openid: 'dev_' + code, session_key: '' }
  }
}

// 用户登录（首次登录 → 创建用户 + 生成配对码）
router.post('/login', async (req, res) => {
  const { code, nickName, loveDate } = req.body
  if (!nickName) return res.json(fail('请输入昵称'))
  if (!code) return res.json(fail('缺少微信登录凭证 code'))

  try {
    // 用 code 换取 openid
    const { openid } = await code2Session(code)
    if (!openid) return res.json(fail('获取 openid 失败'))

    // 检查是否已有该 openId 用户
    const [existing] = await pool.query('SELECT * FROM users WHERE open_id = ?', [openid])
    if (existing.length > 0) {
      const user = existing[0]
      const [couples] = await pool.query('SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?', [user.id, user.id])
      const couple = couples[0] || null
      return res.json(success({
        userId: user.id,
        nickName: user.nick_name,
        pairingCode: user.pairing_code,
        role: user.role,
        coupleId: couple?.id || null,
        partnered: couple?.partnered || false,
        token: genToken(user.id, couple?.id || null)
      }))
    }

    // 创建新用户
    const pairingCode = genPairingCode()
    const [result] = await pool.query(
      'INSERT INTO users (open_id, nick_name, pairing_code, role) VALUES (?, ?, ?, ?)',
      [openid, nickName, pairingCode, 'inviter']
    )
    const userId = result.insertId

    // 创建情侣关系记录
    const [coupleResult] = await pool.query(
      'INSERT INTO couples (user1_id, love_date, partnered) VALUES (?, ?, 0)',
      [userId, loveDate || null]
    )
    const coupleId = coupleResult.insertId

    res.json(success({
      userId,
      nickName,
      pairingCode,
      role: 'inviter',
      coupleId,
      partnered: false,
      token: genToken(userId, coupleId)
    }, '登录成功'))
  } catch (e) {
    console.error(e)
    res.json(fail('登录失败: ' + e.message))
  }
})

// 接受配对（被邀请方登录 + 配对）
router.post('/pair', async (req, res) => {
  const { code, nickName, pairingCode, loveDate } = req.body
  if (!nickName) return res.json(fail('请输入昵称'))
  if (!pairingCode) return res.json(fail('缺少配对码'))
  if (!code) return res.json(fail('缺少微信登录凭证 code'))

  try {
    // 查找配对码对应的邀请方
    const [inviters] = await pool.query('SELECT * FROM users WHERE pairing_code = ? AND role = ?', [pairingCode, 'inviter'])
    if (inviters.length === 0) return res.json(fail('配对码无效'))

    const inviter = inviters[0]

    // 查找邀请方的 couple 记录
    const [couples] = await pool.query('SELECT * FROM couples WHERE user1_id = ?', [inviter.id])
    if (couples.length === 0) return res.json(fail('邀请方数据异常'))
    const couple = couples[0]

    if (couple.partnered) return res.json(fail('该配对码已被使用'))

    // 用 code 换取 openid
    const { openid } = await code2Session(code)
    if (!openid) return res.json(fail('获取 openid 失败'))

    // 创建被邀请方用户
    const [result] = await pool.query(
      'INSERT INTO users (open_id, nick_name, pairing_code, role) VALUES (?, ?, ?, ?)',
      [openid, nickName, pairingCode, 'partner']
    )
    const partnerUserId = result.insertId

    // 更新情侣关系
    await pool.query(
      'UPDATE couples SET user2_id = ?, partnered = 1, paired_at = NOW(), love_date = IFNULL(love_date, ?) WHERE id = ?',
      [partnerUserId, loveDate || null, couple.id]
    )

    // 更新邀请方的配对码（使原配对码失效）
    await pool.query('UPDATE users SET pairing_code = NULL WHERE id = ?', [inviter.id])

    res.json(success({
      userId: partnerUserId,
      nickName,
      role: 'partner',
      coupleId: couple.id,
      partnerName: inviter.nick_name,
      loveDate: loveDate || couple.love_date,
      token: genToken(partnerUserId, couple.id)
    }, '配对成功！'))
  } catch (e) {
    console.error(e)
    res.json(fail('配对失败: ' + e.message))
  }
})

// 获取用户信息
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.json(fail('未登录', 401))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'love-diary-secret-key-2024')
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId])
    if (users.length === 0) return res.json(fail('用户不存在', 401))

    const user = users[0]
    const [couples] = await pool.query('SELECT * FROM couples WHERE user1_id = ? OR user2_id = ?', [user.id, user.id])
    const couple = couples[0] || null

    let partnerName = ''
    if (couple && couple.partnered) {
      const partnerId = user.id === couple.user1_id ? couple.user2_id : couple.user1_id
      const [partners] = await pool.query('SELECT nick_name FROM users WHERE id = ?', [partnerId])
      partnerName = partners[0]?.nick_name || ''
    }

    res.json(success({
      userId: user.id,
      nickName: user.nick_name,
      pairingCode: user.pairing_code,
      role: user.role,
      coupleId: couple?.id || null,
      partnered: couple?.partnered || false,
      partnerName,
      loveDate: couple?.love_date || null
    }))
  } catch (e) {
    res.json(fail('登录已过期', 401))
  }
})

// 更新用户资料（昵称 / 恋爱纪念日）
router.put('/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.json(fail('未登录', 401))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'love-diary-secret-key-2024')
    const { nickName, loveDate } = req.body

    if (nickName && nickName.trim()) {
      await pool.query('UPDATE users SET nick_name = ? WHERE id = ?', [nickName.trim(), decoded.userId])
    }
    if (loveDate) {
      await pool.query(
        'UPDATE couples SET love_date = ? WHERE user1_id = ? OR user2_id = ?',
        [loveDate, decoded.userId, decoded.userId]
      )
    }

    res.json(success(null, '更新成功'))
  } catch (e) {
    res.json(fail('登录已过期', 401))
  }
})

module.exports = router
