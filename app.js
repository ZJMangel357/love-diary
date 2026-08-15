// app.js
App({
  onLaunch() {
    // 数据已全部迁移到后端（Node.js + MySQL），本地只保留主题等 UI 偏好
    const themeInfo = wx.getStorageSync('themeInfo')

    this.globalData = {
      userInfo: wx.getStorageSync('userInfo') || null,
      coupleInfo: null,
      themeInfo: themeInfo || {
        primaryColor: '#FF6B9D',
        secondaryColor: '#A8E6CF',
        accentColor: '#FFD93D',
        themeName: '蜜桃甜心'
      }
    }
  },

  // 检查是否已登录（依据 token），未登录则跳转登录页
  checkLogin() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' })
      return false
    }
    return true
  },

  // 检查是否已配对
  isPartnered() {
    const userInfo = wx.getStorageSync('userInfo')
    return !!(userInfo && userInfo.partnered)
  },

  globalData: {}
})
