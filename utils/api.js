// utils/api.js - 后端API请求工具

const BASE_URL = 'http://localhost:3000/api' // 本地开发地址，部署后替换为服务器地址
const ROOT_URL = 'http://localhost:3000' // 后端根地址（用于拼接图片等静态资源路径）

// 获取本地存储的 token
function getToken() {
  return wx.getStorageSync('token') || ''
}

// 封装请求
function request(url, method, data) {
  // 兼容旧版本调用：登录类请求自动附带设备ID，确保降级模式可用
  const payload = Object.assign({}, data || {})
  if (payload.code !== undefined && payload.deviceId === undefined) {
    payload.deviceId = getDeviceId()
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: method || 'GET',
      data: payload,
      header: {
        'Content-Type': 'application/json',
        'Authorization': getToken() ? 'Bearer ' + getToken() : ''
      },
      success: (res) => {
        if (res.data.code === 401) {
          // 登录过期，跳转登录页
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.reLaunch({ url: '/pages/login/login' })
          reject(new Error('登录已过期'))
          return
        }
        resolve(res.data)
      },
      fail: (err) => {
        console.error('请求失败:', url, err)
        reject(err)
      }
    })
  })
}

// 微信登录（获取code）
// 开发者工具/异常环境下拿不到 code 时返回空串，由后端降级用设备ID兜底
function wxLogin() {
  return new Promise((resolve) => {
    wx.login({
      success: (res) => resolve(res.code || ''),
      fail: () => resolve('')
    })
  })
}

// 稳定的设备标识（本地开发降级模式用：保证同一设备登录始终是同一身份）
function getDeviceId() {
  let id = wx.getStorageSync('deviceId')
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8)
    wx.setStorageSync('deviceId', id)
  }
  return id
}

// 获取完整图片URL（后端返回的是相对路径 /uploads/xxx.jpg）
function getFullUrl(relativeUrl) {
  if (!relativeUrl) return ''
  if (relativeUrl.startsWith('http')) return relativeUrl
  return ROOT_URL + relativeUrl
}

// 图片上传（单张）
function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/upload',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': getToken() ? 'Bearer ' + getToken() : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0) {
            resolve(data.data.url) // 返回相对路径如 /uploads/xxx.jpg
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (e) {
          reject(new Error('解析上传响应失败'))
        }
      },
      fail: reject
    })
  })
}

// 批量上传图片
async function uploadImages(filePaths) {
  const urls = []
  for (const fp of filePaths) {
    const url = await uploadImage(fp)
    urls.push(url)
  }
  return urls
}

// 认证相关
const auth = {
  // 登录（首次登录，生成配对码），内部调用 wx.login 获取 code
  async login(nickName, loveDate) {
    const deviceId = getDeviceId()
    const code = await wxLogin()
    // 拿不到微信 code 时用设备ID兜底，保证任何环境下都能登录测试
    return request('/auth/login', 'POST', { code: code || deviceId, deviceId, nickName, loveDate })
  },
  // 接受配对（被邀请方），内部调用 wx.login 获取 code
  async pair(nickName, pairingCode, loveDate) {
    const deviceId = getDeviceId()
    const code = await wxLogin()
    return request('/auth/pair', 'POST', { code: code || deviceId, deviceId, nickName, pairingCode, loveDate })
  },
  // 获取用户信息
  profile() {
    return request('/auth/profile', 'GET')
  },
  // 更新用户资料（昵称/恋爱纪念日）
  updateProfile(data) {
    return request('/auth/profile', 'PUT', data)
  }
}

// 菜品相关
const menu = {
  list() { return request('/menus', 'GET') },
  add(data) { return request('/menus', 'POST', data) },
  update(id, data) { return request('/menus/' + id, 'PUT', data) },
  remove(id) { return request('/menus/' + id, 'DELETE') },
  setToday(id) { return request('/menus/' + id + '/today', 'PUT') }
}

// 纪念日相关
const anniversary = {
  list() { return request('/anniversaries', 'GET') },
  add(data) { return request('/anniversaries', 'POST', data) },
  update(id, data) { return request('/anniversaries/' + id, 'PUT', data) },
  remove(id) { return request('/anniversaries/' + id, 'DELETE') }
}

// 经期相关
const period = {
  records() { return request('/period/records', 'GET') },
  addRecord(data) { return request('/period/records', 'POST', data) },
  removeRecord(id) { return request('/period/records/' + id, 'DELETE') },
  getConfig() { return request('/period/config', 'GET') },
  updateConfig(data) { return request('/period/config', 'PUT', data) }
}

// 时光记录
const moment = {
  list() { return request('/moments', 'GET') },
  add(data) { return request('/moments', 'POST', data) },
  update(id, data) { return request('/moments/' + id, 'PUT', data) },
  remove(id) { return request('/moments/' + id, 'DELETE') }
}

// 恋爱打卡
const checkin = {
  status() { return request('/checkin/status', 'GET') },
  doCheckin(note) { return request('/checkin', 'POST', { note }) },
  history(days) { return request('/checkin/history?days=' + (days || 30), 'GET') }
}

// 心有灵犀默契测试
const quiz = {
  submit(quizId, answers, score) { return request('/quiz/submit', 'POST', { quizId, answers, score }) },
  result(quizId) { return request('/quiz/result?quizId=' + quizId, 'GET') }
}

// 一次性迁移本地存储的历史数据到后端（旧版本地存储模式升级用）
async function migrateLocalData() {
  try {
    const [menuRes, annivRes, momentRes, periodRes] = await Promise.all([
      menu.list(),
      anniversary.list(),
      moment.list(),
      period.records()
    ])

    // 菜品（后端为空时才迁移，避免重复）
    const localMenus = wx.getStorageSync('menus') || []
    if (localMenus.length > 0 && menuRes.code === 0 && (menuRes.data || []).length === 0) {
      for (const m of localMenus) {
        try {
          await menu.add({ name: m.name, category: m.category, tags: m.tags || [], difficulty: m.difficulty || 1, image: m.image || '', creator: m.creator || '', favorite: !!m.favorite })
        } catch (e) { console.error('迁移菜品失败', m.name, e) }
      }
    }

    // 纪念日
    const localAnniv = wx.getStorageSync('anniversaries') || []
    if (localAnniv.length > 0 && annivRes.code === 0 && (annivRes.data || []).length === 0) {
      for (const a of localAnniv) {
        try {
          await anniversary.add({ title: a.title, date: a.date, type: a.type || 'other', repeat: a.repeat || 'yearly', emoji: a.emoji || '💝', important: !!a.important })
        } catch (e) { console.error('迁移纪念日失败', a.title, e) }
      }
    }

    // 时光
    const localMoments = wx.getStorageSync('moments') || []
    if (localMoments.length > 0 && momentRes.code === 0 && (momentRes.data || []).length === 0) {
      for (const mo of localMoments) {
        try {
          await moment.add({ title: mo.title, content: mo.content || '', date: mo.date, images: mo.images || [], mood: mo.mood || '💕', location: mo.location || '' })
        } catch (e) { console.error('迁移时光失败', mo.title, e) }
      }
    }

    // 经期记录与配置
    const localPeriods = wx.getStorageSync('periods') || { records: [], cycleLength: 28, periodLength: 5 }
    if ((localPeriods.records || []).length > 0 && periodRes.code === 0 && (periodRes.data || []).length === 0) {
      for (const p of localPeriods.records) {
        try {
          await period.addRecord({ startDate: p.startDate, note: p.note || '', symptoms: p.symptoms || [], flowLevel: p.flowLevel || 2 })
        } catch (e) { console.error('迁移经期记录失败', p.startDate, e) }
      }
    }
    try {
      await period.updateConfig({ cycleLength: localPeriods.cycleLength || 28, periodLength: localPeriods.periodLength || 5 })
    } catch (e) { console.error('迁移经期配置失败', e) }

    // 迁移完成后清理本地数据
    wx.removeStorageSync('menus')
    wx.removeStorageSync('anniversaries')
    wx.removeStorageSync('moments')
    wx.removeStorageSync('periods')
    wx.removeStorageSync('todayMenu')
  } catch (e) {
    console.error('本地数据迁移失败', e)
  }
}

module.exports = {
  BASE_URL,
  getToken,
  request,
  auth,
  menu,
  anniversary,
  period,
  moment,
  checkin,
  quiz,
  wxLogin,
  uploadImage,
  uploadImages,
  getFullUrl,
  migrateLocalData
}
