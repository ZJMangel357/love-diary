// pages/profile/profile.js
const util = require('../../utils/util.js')
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

  refreshData() {
    const coupleInfo = wx.getStorageSync('coupleInfo') || {}
    const userInfo = wx.getStorageSync('userInfo') || null
    const themeInfo = wx.getStorageSync('themeInfo')

    let currentTheme = 0
    if (themeInfo) {
      const idx = this.data.themeOptions.findIndex(t => t.name === themeInfo.themeName)
      if (idx >= 0) currentTheme = idx
    }

    const dataStats = {
      menus: (wx.getStorageSync('menus') || []).length,
      anniversaries: (wx.getStorageSync('anniversaries') || []).length,
      moments: (wx.getStorageSync('moments') || []).length,
      periods: (wx.getStorageSync('periods') || { records: [] }).records.length
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
      isPartnered: !!(coupleInfo && coupleInfo.partnered)
    })
  },

  // 编辑情侣昵称
  editCouple() {
    wx.showModal({
      title: '设置情侣昵称',
      editable: true,
      placeholderText: `他:${this.data.coupleInfo.partnerName1},她:${this.data.coupleInfo.partnerName2} （用逗号分隔）`,
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm && res.content) {
          const parts = res.content.split(/[,，]/).map(s => s.trim())
          const coupleInfo = { ...this.data.coupleInfo }
          if (parts[0]) coupleInfo.partnerName1 = parts[0]
          if (parts[1]) coupleInfo.partnerName2 = parts[1]
          wx.setStorageSync('coupleInfo', coupleInfo)
          wx.showToast({ title: '昵称已更新 💖', icon: 'none' })
          this.refreshData()
        }
      }
    })
  },

  // 设置恋爱纪念日
  setLoveDate() {
    wx.showActionSheet({
      itemList: ['选择日期', '清除设置'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({
            url: '/pages/anniversary-add/anniversary-add?from=loveDate'
          })
        } else if (res.tapIndex === 1) {
          const coupleInfo = { ...this.data.coupleInfo, loveDate: '2023-05-20' }
          wx.setStorageSync('coupleInfo', coupleInfo)
          wx.showToast({ title: '已重置', icon: 'success' })
          this.refreshData()
        }
      }
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

  // 导出数据
  exportData() {
    const data = {
      coupleInfo: wx.getStorageSync('coupleInfo') || {},
      themeInfo: wx.getStorageSync('themeInfo') || {},
      menus: wx.getStorageSync('menus') || [],
      anniversaries: wx.getStorageSync('anniversaries') || [],
      moments: wx.getStorageSync('moments') || [],
      periods: wx.getStorageSync('periods') || { records: [] },
      todayMenu: wx.getStorageSync('todayMenu') || null,
      exportTime: new Date().toISOString()
    }
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
  },

  // 导入数据
  importData() {
    wx.showModal({
      title: '📥 导入数据',
      content: '将之前复制的数据粘贴到输入框中，导入后将覆盖现有数据',
      editable: true,
      placeholderText: '粘贴JSON数据...',
      confirmColor: '#5CC9A5',
      success: (res) => {
        if (res.confirm && res.content) {
          try {
            const data = JSON.parse(res.content)
            if (data.coupleInfo) wx.setStorageSync('coupleInfo', data.coupleInfo)
            if (data.themeInfo) wx.setStorageSync('themeInfo', data.themeInfo)
            if (data.menus) wx.setStorageSync('menus', data.menus)
            if (data.anniversaries) wx.setStorageSync('anniversaries', data.anniversaries)
            if (data.moments) wx.setStorageSync('moments', data.moments)
            if (data.periods) wx.setStorageSync('periods', data.periods)
            if (data.todayMenu) wx.setStorageSync('todayMenu', data.todayMenu)
            wx.showToast({ title: '导入成功 🎉', icon: 'success' })
            this.refreshData()
          } catch (e) {
            wx.showToast({ title: '数据格式错误', icon: 'none' })
          }
        }
      }
    })
  },

  // 重置所有数据
  resetAll() {
    wx.showModal({
      title: '⚠️ 重置所有数据',
      content: '确定要清除所有数据吗？此操作不可恢复，建议先导出备份！',
      confirmText: '确认清除',
      confirmColor: '#FF6B9D',
      cancelColor: '#8A7F8A',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '再次确认',
            content: '真的真的要清除所有数据吗？',
            confirmColor: '#FF6B9D',
            success: (res2) => {
              if (res2.confirm) {
                wx.clearStorageSync()
                app.globalData.initDefaultData()
                wx.setStorageSync('initialized', true)
                wx.showToast({ title: '已重置', icon: 'success' })
                this.refreshData()
              }
            }
          })
        }
      }
    })
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
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('coupleInfo')
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
