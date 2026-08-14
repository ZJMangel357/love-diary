// cloudfunctions/syncData/index.js
// 云函数：数据同步 - 本地与云端数据互相同步

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 各集合名称
const COLLECTIONS = {
  menus: 'menus',
  anniversaries: 'anniversaries',
  moments: 'moments',
  periods: 'periods',
  coupleInfo: 'couple_info',
  themeInfo: 'theme_info'
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, payload } = event

  try {
    switch (action) {
      case 'pull':
        return await pullAllData(OPENID)
      case 'push':
        return await pushAllData(OPENID, payload)
      case 'syncCouple':
        return await syncCoupleData(OPENID, payload)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('[syncData error]', err)
    return { success: false, error: err.message }
  }
}

// 拉取用户全部云端数据
async function pullAllData(openid) {
  const results = {}

  for (const [key, col] of Object.entries(COLLECTIONS)) {
    try {
      const res = await db.collection(col).where({ _openid: openid }).get()
      results[key] = res.data
    } catch (e) {
      results[key] = []
    }
  }

  // 拉取 todayMenu（情侣共享字段，存在 couple_info 里）
  try {
    const coupleRes = await db.collection('couple_info').where({
      _openid: openid
    }).orderBy('updateTime', 'desc').limit(1).get()
    results.todayMenu = (coupleRes.data[0] && coupleRes.data[0].todayMenu) || null
  } catch (e) {
    results.todayMenu = null
  }

  return { success: true, data: results }
}

// 推送全部本地数据到云端（增量+覆盖，以 id 为主键）
async function pushAllData(openid, payload) {
  const tasks = []

  for (const [key, col] of Object.entries(COLLECTIONS)) {
    if (payload[key] && Array.isArray(payload[key])) {
      const list = payload[key]
      for (const item of list) {
        const task = upsertItem(col, openid, item)
        tasks.push(task.catch(e => console.log(`${col}写入失败`, e)))
      }
    }
  }

  await Promise.all(tasks)

  // 保存 todayMenu
  if (payload.todayMenu) {
    try {
      await db.collection('couple_info').add({
        data: {
          _openid: openid,
          todayMenu: payload.todayMenu,
          updateTime: db.serverDate()
        }
      })
    } catch (e) { /* ignore */ }
  }

  return { success: true, syncedAt: new Date().toISOString() }
}

// 情侣绑定后的双向同步（预留）
async function syncCoupleData(openid, { coupleCode, data }) {
  // 简易实现：同一 coupleCode 的用户共享数据
  // coupleCode 可以在 我的-情侣绑定 中生成并分享
  if (!coupleCode) return { success: false, message: '缺少情侣码' }

  return {
    success: true,
    message: '情侣同步功能已就绪，请生成情侣码后绑定',
    coupleCode
  }
}

// 按 id 插入或更新（无 id 则新增）
async function upsertItem(collectionName, openid, item) {
  const col = db.collection(collectionName)
  const queryItem = { ...item, _openid: openid }
  delete queryItem._id // 避免冲突

  if (item.id) {
    const existed = await col.where({ id: item.id, _openid: openid }).get()
    if (existed.data.length > 0) {
      const recordId = existed.data[0]._id
      delete queryItem.id
      return await col.doc(recordId).update({
        data: { ...queryItem, updateTime: db.serverDate() }
      })
    }
  }

  return await col.add({
    data: { ...queryItem, createTime: db.serverDate(), updateTime: db.serverDate() }
  })
}
