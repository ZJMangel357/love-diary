// utils/api.js - 后端API请求工具

const BASE_URL = 'http://localhost:3000/api' // 本地开发地址，部署后替换为服务器地址
const ROOT_URL = 'http://localhost:3000' // 后端根地址（用于拼接图片等静态资源路径）

// 获取本地存储的 token
function getToken() {
  return wx.getStorageSync('token') || ''
}

// 封装请求
function request(url, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: method || 'GET',
      data: data || {},
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
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) resolve(res.code)
        else reject(new Error('wx.login 失败'))
      },
      fail: reject
    })
  })
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
    const code = await wxLogin()
    return request('/auth/login', 'POST', { code, nickName, loveDate })
  },
  // 接受配对（被邀请方），内部调用 wx.login 获取 code
  async pair(nickName, pairingCode, loveDate) {
    const code = await wxLogin()
    return request('/auth/pair', 'POST', { code, nickName, pairingCode, loveDate })
  },
  // 获取用户信息
  profile() {
    return request('/auth/profile', 'GET')
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

module.exports = {
  BASE_URL,
  getToken,
  request,
  auth,
  menu,
  anniversary,
  period,
  moment,
  wxLogin,
  uploadImage,
  uploadImages,
  getFullUrl
}
