// utils/api.js - 后端API请求工具

const BASE_URL = 'http://localhost:3000/api' // 本地开发地址，部署后替换为服务器地址

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

// 认证相关
const auth = {
  // 登录（首次登录，生成配对码）
  login(nickName, loveDate, openId) {
    return request('/auth/login', 'POST', { nickName, loveDate, openId })
  },
  // 接受配对
  pair(nickName, pairingCode, loveDate, openId) {
    return request('/auth/pair', 'POST', { nickName, pairingCode, loveDate, openId })
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
  moment
}
