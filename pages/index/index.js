// pages/index/index.js
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    todayStr: '',
    coupleInfo: {},
    loveDays: 0,
    loveQuote: '',
    todayMenu: null,
    nearestAnniversaries: [],
    periodInfo: null,
    recentMoments: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    quickActions: [
      { id: 'menu', icon: '🍳', title: '今天吃什么', desc: '随机菜品推荐', color: 'pink', page: '/pages/menu/menu' },
      { id: 'period', icon: '🌸', title: '经期助手', desc: '预测身体周期', color: 'purple', page: '/pages/period/period' },
      { id: 'add-anniv', icon: '🎀', title: '添加纪念', desc: '记录重要日子', color: 'yellow', page: '/pages/anniversary-add/anniversary-add' },
      { id: 'add-moment', icon: '📸', title: '记录时光', desc: '保存美好瞬间', color: 'mint', page: '/pages/moments-add/moments-add' }
    ]
  },

  onLoad() {
    // 获取系统信息
    const sysInfo = wx.getSystemInfoSync()
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const weekDay = this.data.weekDays[now.getDay()]
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      todayStr: `${month}月${day}日 星期${weekDay}`
    })
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLogin()) return
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  refreshData() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const coupleInfo = wx.getStorageSync('coupleInfo') || {}
    // 兼容未配对情况：用登录昵称填充
    if (!coupleInfo.partnerName1 && userInfo.nickName) {
      coupleInfo.partnerName1 = userInfo.nickName
    }
    if (!coupleInfo.partnerName1) coupleInfo.partnerName1 = '他'
    if (!coupleInfo.partnerName2) coupleInfo.partnerName2 = '她'
    const menus = wx.getStorageSync('menus') || []
    const anniversaries = wx.getStorageSync('anniversaries') || []
    const moments = wx.getStorageSync('moments') || []
    const periods = wx.getStorageSync('periods') || { records: [], cycleLength: 28, periodLength: 5 }

    // 计算相爱天数
    let loveDays = 0
    if (coupleInfo.loveDate) {
      loveDays = util.getDaysBetween(coupleInfo.loveDate, util.formatDate(new Date(), 'YYYY-MM-DD'))
    }

    // 获取今日菜单
    let todayMenu = wx.getStorageSync('todayMenu')
    if (!todayMenu && menus.length > 0) {
      todayMenu = util.getRandomItem(menus)
    }

    // 获取最近的纪念日（按距离天数排序）
    const sortedAnniversaries = anniversaries
      .map(a => ({
        ...a,
        daysTo: util.getDaysToAnniversary(a.date, a.repeat),
        displayDate: a.repeat === 'yearly' ? util.getAnniversaryThisYear(a.date) : a.date
      }))
      .sort((a, b) => a.daysTo - b.daysTo)
      .slice(0, 3)

    // 经期预测
    let periodInfo = null
    if (periods.records && periods.records.length > 0) {
      const lastRecord = periods.records[periods.records.length - 1]
      const phase = util.periodUtils.getCurrentPhase(
        lastRecord.startDate,
        periods.cycleLength,
        periods.periodLength
      )
      const nextStart = util.periodUtils.getNextPeriodStart(
        lastRecord.startDate,
        periods.cycleLength
      )
      const ovulationDate = util.periodUtils.getOvulationDate(nextStart)
      periodInfo = {
        ...phase,
        nextStart,
        ovulationDate,
        daysToNext: util.getDaysBetween(util.formatDate(new Date(), 'YYYY-MM-DD'), nextStart)
      }
    }

    // 最近时光记录
    const recentMoments = moments
      .sort((a, b) => new Date(b.date.replace(/-/g, '/')) - new Date(a.date.replace(/-/g, '/')))
      .slice(0, 2)

    this.setData({
      coupleInfo,
      loveDays,
      loveQuote: util.getRandomLoveQuote(),
      todayMenu,
      nearestAnniversaries: sortedAnniversaries,
      periodInfo,
      recentMoments
    })
  },

  // 换一句情话
  changeQuote() {
    this.setData({
      loveQuote: util.getRandomLoveQuote()
    })
  },

  // 随机今日菜品
  randomMenu() {
    const menus = wx.getStorageSync('menus') || []
    if (menus.length === 0) {
      wx.showToast({ title: '菜单空空如也~', icon: 'none' })
      return
    }
    const randomMenu = util.getRandomItem(menus)
    wx.setStorageSync('todayMenu', randomMenu)
    this.setData({ todayMenu: randomMenu })
    wx.showToast({ title: '今日菜品已更新 🎉', icon: 'none' })
  },

  // 跳转功能页
  goToPage(e) {
    const { page } = e.currentTarget.dataset
    if (!page) return
    if (page.startsWith('/pages/menu') || page.startsWith('/pages/anniversary') || 
        page.startsWith('/pages/moments') || page.startsWith('/pages/period') ||
        page.startsWith('/pages/profile')) {
      wx.switchTab({
        url: page,
        fail: () => {
          wx.navigateTo({ url: page })
        }
      })
    } else {
      wx.navigateTo({ url: page })
    }
  },

  // 去菜单详情
  goToMenuDetail() {
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  // 去纪念日
  goToAnniversary() {
    wx.switchTab({ url: '/pages/anniversary/anniversary' })
  },

  // 去时光记录
  goToMoments() {
    wx.switchTab({ url: '/pages/moments/moments' })
  },

  // 去经期
  goToPeriod() {
    wx.navigateTo({ url: '/pages/period/period' })
  },

  // 头像点击
  onAvatarTap() {
    wx.showToast({ title: '💕 甜蜜暴击', icon: 'none' })
  }
})
