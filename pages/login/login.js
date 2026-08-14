// pages/login/login.js
const util = require('../../utils/util.js')

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
    partnerName: ''       // 配对成功后的对方昵称
  },

  onLoad(query) {
    const sysInfo = wx.getSystemInfoSync()
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')

    // 检查是否已有登录信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.nickName) {
      // 已登录，检查是否已配对
      const coupleInfo = wx.getStorageSync('coupleInfo')
      if (coupleInfo && coupleInfo.partnered) {
        // 已配对，直接跳首页
        wx.switchTab({ url: '/pages/index/index' })
        return
      }
      // 已登录但未配对，显示等待页
      this.setData({
        step: 'waiting',
        nickName: userInfo.nickName,
        pairingCode: userInfo.pairingCode || '',
        statusBarHeight: sysInfo.statusBarHeight || 20
      })
    } else {
      this.setData({
        statusBarHeight: sysInfo.statusBarHeight || 20,
        todayStr: today,
        loveDate: today
      })
    }

    // 检测分享链接带入的配对码
    if (query && query.code) {
      this.setData({
        inviteCode: query.code,
        inviterName: query.name || '你的另一半'
      })
    }
  },

  // 输入昵称
  onNameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ loveDate: e.detail.value })
  },

  // 生成配对码（6位随机大写字母+数字）
  generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  },

  // 登录/配对
  handleLogin() {
    const name = this.data.nickName.trim()
    if (!name) {
      wx.showToast({ title: '请输入昵称~', icon: 'none' })
      return
    }

    if (this.data.inviteCode) {
      // ===== 被邀请方：接受配对 =====
      const inviterName = this.data.inviterName
      const userInfo = {
        nickName: name,
        pairingCode: this.data.inviteCode,
        role: 'partner',
        loginAt: new Date().toISOString()
      }
      wx.setStorageSync('userInfo', userInfo)

      // 写入 coupleInfo（配对成功）
      const loveDate = this.data.loveDate || util.formatDate(new Date(), 'YYYY-MM-DD')
      const coupleInfo = {
        partnerName1: inviterName,
        partnerName2: name,
        loveDate: loveDate,
        avatar1: '',
        avatar2: '',
        partnered: true,
        pairedAt: new Date().toISOString()
      }
      wx.setStorageSync('coupleInfo', coupleInfo)

      // 更新全局数据
      const app = getApp()
      app.globalData.userInfo = userInfo
      app.globalData.coupleInfo = coupleInfo

      this.setData({
        step: 'success',
        partnerName: inviterName
      })
    } else {
      // ===== 首次登录方：生成配对码 =====
      const code = this.generatePairingCode()
      const userInfo = {
        nickName: name,
        pairingCode: code,
        role: 'inviter',
        loginAt: new Date().toISOString()
      }
      wx.setStorageSync('userInfo', userInfo)

      // 预写入 coupleInfo（等待对方加入）
      const loveDate = this.data.loveDate || util.formatDate(new Date(), 'YYYY-MM-DD')
      const coupleInfo = {
        partnerName1: name,
        partnerName2: '',
        loveDate: loveDate,
        avatar1: '',
        avatar2: '',
        partnered: false,
        pairedAt: ''
      }
      wx.setStorageSync('coupleInfo', coupleInfo)

      // 更新全局数据
      const app = getApp()
      app.globalData.userInfo = userInfo
      app.globalData.coupleInfo = coupleInfo

      this.setData({
        step: 'waiting',
        pairingCode: code
      })
    }
  },

  // 分享给好友
  onShareAppMessage() {
    const name = this.data.nickName
    const code = this.data.pairingCode
    return {
      title: name + ' 邀请你成为情侣 💕 来「甜蜜日记」配对吧~',
      path: '/pages/login/login?code=' + code + '&name=' + encodeURIComponent(name),
      imageUrl: ''
    }
  },

  // 复制配对码
  copyCode() {
    wx.setClipboardData({
      data: this.data.pairingCode,
      success: () => {
        wx.showToast({ title: '配对码已复制', icon: 'success' })
      }
    })
  },

  // 进入首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
