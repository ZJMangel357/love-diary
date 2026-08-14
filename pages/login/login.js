// pages/login/login.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    step: 'input',        // input: 输入昵称 | waiting: 等待配对 | success: 配对成功
    nickName: '',
    loveDate: '',
    todayStr: '',
    inviteCode: '',       // 从分享链接带入的配对码
    inviterName: '',      // 邀请人昵称
    pairingCode: '',      // 自己的配对码
    partnerName: '',      // 配对成功后的对方昵称
    loading: false
  },

  onLoad(query) {
    const sysInfo = wx.getSystemInfoSync()
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')

    // 检查本地是否已有 token
    const token = wx.getStorageSync('token')
    if (token) {
      // 已有 token，验证并获取用户信息
      api.auth.profile().then(res => {
        if (res.code === 0 && res.data) {
          const d = res.data
          wx.setStorageSync('userInfo', d)
          if (d.partnered) {
            wx.switchTab({ url: '/pages/index/index' })
          } else if (d.pairingCode) {
            this.setData({ step: 'waiting', nickName: d.nickName, pairingCode: d.pairingCode })
          }
        }
      }).catch(() => {})
    }

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      todayStr: today,
      loveDate: today
    })

    // 检测分享链接带入的配对码
    if (query && query.code) {
      this.setData({
        inviteCode: query.code,
        inviterName: query.name ? decodeURIComponent(query.name) : '你的另一半'
      })
    }
  },

  onNameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ loveDate: e.detail.value })
  },

  // 登录/配对
  async handleLogin() {
    const name = this.data.nickName.trim()
    if (!name) {
      wx.showToast({ title: '请输入昵称~', icon: 'none' })
      return
    }
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      if (this.data.inviteCode) {
        // 被邀请方：接受配对
        const res = await api.auth.pair(name, this.data.inviteCode, this.data.loveDate)
        if (res.code === 0) {
          wx.setStorageSync('token', res.data.token)
          wx.setStorageSync('userInfo', res.data)
          this.setData({ step: 'success', partnerName: res.data.partnerName, loading: false })
        } else {
          wx.showToast({ title: res.message, icon: 'none' })
          this.setData({ loading: false })
        }
      } else {
        // 首次登录：生成配对码
        const res = await api.auth.login(name, this.data.loveDate)
        if (res.code === 0) {
          wx.setStorageSync('token', res.data.token)
          wx.setStorageSync('userInfo', res.data)
          this.setData({ step: 'waiting', pairingCode: res.data.pairingCode, loading: false })
        } else {
          wx.showToast({ title: res.message, icon: 'none' })
          this.setData({ loading: false })
        }
      }
    } catch (e) {
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onShareAppMessage() {
    const name = this.data.nickName
    const code = this.data.pairingCode
    return {
      title: name + ' 邀请你成为情侣 💕 来「甜蜜日记」配对吧~',
      path: '/pages/login/login?code=' + code + '&name=' + encodeURIComponent(name)
    }
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.pairingCode,
      success: () => wx.showToast({ title: '配对码已复制', icon: 'success' })
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
