// pages/profile/profile.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    coupleInfo: {},
    userInfo: null,
    themeOptions: [
      { name: '蜜桃甜心', primary: '#FF6B9D', secondary: '#A8E6CF', accent: '#FFD93D', emoji: '🍑' },
      { name: '薄荷清新', primary: '#5CC9A5', secondary: '#A8E6CF', accent: '#C9B1FF', emoji: '🌿' },
      { name: '薰衣草梦', primary: '#9B7FED', secondary: '#C9B1FF', accent: '#FFB4CC', emoji: '💜' },
      { name: '阳光芒果', primary: '#FFB347', secondary: '#FFD93D', accent: '#FF8FB3', emoji: '🥭' }
    ],
    currentTheme: 0,
    dataStats: {
      menus: 0,
      anniversaries: 0,
      moments: 0,
      periods: 0
    }
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  async refreshData() {
    try {
      const [profileRes, menusRes, annivRes, momentRes, periodRes] = await Promise.all([
        api.auth.profile(),
        api.menu.list(),
        api.anniversary.list(),
        api.moment.list(),
        api.period.records()
      ])

      let coupleInfo = {}
      let userInfo = null
      let isPartnered = false
      if (profileRes.code === 0 && profileRes.data) {
        const d = profileRes.data
        userInfo = d
        isPartnered = !!d.partnered
        const partnerName1 = d.nickName || '我'
        const partnerName2 = d.partnered ? (d.partnerName || 'TA') : '她'
        coupleInfo = {
          partnerName1,
          partnerName2,
          avatarText1: partnerName1.charAt(0),
          avatarText2: partnerName2.charAt(0),
          loveDate: d.loveDate || '',
          partnered: isPartnered,
          pairingCode: d.pairingCode
        }
        wx.setStorageSync('userInfo', d)
      }

      const themeInfo = wx.getStorageSync('themeInfo')
      let currentTheme = 0
      if (themeInfo) {
        const idx = this.data.themeOptions.findIndex(t => t.name === themeInfo.themeName)
        if (idx >= 0) currentTheme = idx
      }

      const dataStats = {
        menus: menusRes.code === 0 ? (menusRes.data || []).length : 0,
        anniversaries: annivRes.code === 0 ? (annivRes.data || []).length : 0,
        moments: momentRes.code === 0 ? (momentRes.data || []).length : 0,
        periods: periodRes.code === 0 ? (periodRes.data || []).length : 0
      }

      const loveDays = coupleInfo.loveDate
        ? util.getDaysBetween(coupleInfo.loveDate, util.formatDate(new Date(), 'YYYY-MM-DD'))
        : 0

      this.setData({
        coupleInfo,
        userInfo,
        currentTheme,
        dataStats,
        loveDays,
        isPartnered
      })
    } catch (e) {
      console.error('加载个人中心失败', e)
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  // 编辑我的昵称
  editCouple() {
    const self = this.data.coupleInfo
    wx.showModal({
      title: '修改我的昵称',
      editable: true,
      placeholderText: self.partnerName1 || '输入新昵称',
      confirmColor: '#FF6B9D',
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          try {
            const r = await api.auth.updateProfile({ nickName: res.content.trim() })
            if (r.code === 0) {
              wx.showToast({ title: '昵称已更新 💖', icon: 'none' })
              this.refreshData()
            } else {
              wx.showToast({ title: r.message || '更新失败', icon: 'none' })
            }
          } catch (e) {
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  },

  // 设置恋爱纪念日（同步到后端）
  setLoveDate() {
    wx.navigateTo({
      url: '/pages/anniversary-add/anniversary-add?from=loveDate'
    })
  },

  // 切换主题
  switchTheme(e) {
    const { idx } = e.currentTarget.dataset
    const theme = this.data.themeOptions[idx]
    wx.setStorageSync('themeInfo', {
      primaryColor: theme.primary,
      secondaryColor: theme.secondary,
      accentColor: theme.accent,
      themeName: theme.name
    })
    this.setData({ currentTheme: idx })
    wx.showToast({ title: `已切换到${theme.name} ${theme.emoji}`, icon: 'none' })
  },

  // 数据统计详情
  showStats() {
    const s = this.data.dataStats
    const content = `🍽️ 菜品：${s.menus}道\n🎀 纪念日：${s.anniversaries}个\n💝 时光记录：${s.moments}条\n🌸 经期记录：${s.periods}次`
    wx.showModal({
      title: '📊 数据统计',
      content,
      showCancel: false,
      confirmColor: '#FF6B9D'
    })
  },

  // 导出数据（从后端拉取所有数据备份）
  async exportData() {
    wx.showLoading({ title: '正在导出...' })
    try {
      const [mRes, aRes, moRes, pRes] = await Promise.all([
        api.menu.list(),
        api.anniversary.list(),
        api.moment.list(),
        api.period.records()
      ])
      const data = {
        menus: mRes.data || [],
        anniversaries: aRes.data || [],
        moments: moRes.data || [],
        periods: pRes.data || [],
        exportTime: new Date().toISOString()
      }
      wx.hideLoading()
      const jsonStr = JSON.stringify(data, null, 2)
      wx.setClipboardData({
        data: jsonStr,
        success: () => {
          wx.showModal({
            title: '✅ 数据已复制',
            content: '所有数据已复制到剪贴板，可以粘贴保存到备忘录哦~',
            showCancel: false,
            confirmColor: '#5CC9A5'
          })
        }
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '导出失败', icon: 'none' })
    }
  },

  // 重置所有数据（清空后端各类数据）
  resetAll() {
    wx.showModal({
      title: '⚠️ 重置所有数据',
      content: '将删除所有菜品、纪念日、时光和经期记录，且不可恢复！建议先导出备份！',
      confirmText: '确认清除',
      confirmColor: '#FF6B9D',
      cancelColor: '#8A7F8A',
      success: (res) => {
        if (!res.confirm) return
        wx.showModal({
          title: '再次确认',
          content: '真的真的要清除所有数据吗？',
          confirmColor: '#FF6B9D',
          success: (res2) => {
            if (res2.confirm) this.doResetAll()
          }
        })
      }
    })
  },

  async doResetAll() {
    wx.showLoading({ title: '清除中...' })
    try {
      const [mRes, aRes, moRes, pRes] = await Promise.all([
        api.menu.list(),
        api.anniversary.list(),
        api.moment.list(),
        api.period.records()
      ])
      const tasks = []
      ;(mRes.data || []).forEach(i => tasks.push(api.menu.remove(i.id)))
      ;(aRes.data || []).forEach(i => tasks.push(api.anniversary.remove(i.id)))
      ;(moRes.data || []).forEach(i => tasks.push(api.moment.remove(i.id)))
      ;(pRes.data || []).forEach(i => tasks.push(api.period.removeRecord(i.id)))
      await Promise.all(tasks)
      wx.hideLoading()
      wx.showToast({ title: '已重置', icon: 'success' })
      this.refreshData()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '重置失败', icon: 'none' })
    }
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '💝 甜蜜日记',
      content: '版本：1.0.0\n\n一款为情侣量身打造的专属小程序\n记录每一个爱的瞬间\n\n© 2024 Love Diary',
      showCancel: false,
      confirmColor: '#FF6B9D'
    })
  },

  // 分享
  onShareAppMessage() {
    const userInfo = this.data.userInfo
    if (userInfo && !this.data.isPartnered) {
      // 未配对时分享配对链接
      return {
        title: userInfo.nickName + ' 邀请你成为情侣 💕 来「甜蜜日记」配对吧~',
        path: '/pages/login/login?code=' + (userInfo.pairingCode || '') + '&name=' + encodeURIComponent(userInfo.nickName || '')
      }
    }
    return {
      title: '💕 甜蜜日记 - 记录我们爱的每一刻',
      path: '/pages/index/index'
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录和配对，确定吗？',
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('singleMode')
          app.globalData.userInfo = null
          app.globalData.coupleInfo = null
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  },

  onShareTimeline() {
    return {
      title: '💕 甜蜜日记 - 记录我们爱的每一刻'
    }
  }
})
