// pages/index/index.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')
const app = getApp()

// tab 页面路径（用 switchTab 跳转）
const TAB_PAGES = ['/pages/index/index', '/pages/moments/moments', '/pages/anniversary/anniversary', '/pages/profile/profile']

Page({
  data: {
    statusBarHeight: 20,
    todayStr: '',
    coupleInfo: {},
    loveDays: 0,
    loveQuote: '',
    todayMenu: null,
    nearestAnniversaries: [],
    nextAnniversary: null,    // 最近的纪念日（Hero 区倒计时展示）
    periodInfo: null,
    recentMoments: [],
    checkin: null,            // 恋爱打卡状态
    singleMode: false,        // 单人体验模式
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    quickActions: [
      { id: 'checkin', icon: '💖', title: '恋爱打卡', desc: '每天一起签到', color: 'pink', page: '/pages/checkin/checkin' },
      { id: 'quiz', icon: '🧠', title: '心有灵犀', desc: '测测默契度', color: 'purple', page: '/pages/quiz/quiz' },
      { id: 'menu', icon: '🍳', title: '今天吃什么', desc: '随机菜品推荐', color: 'yellow', page: '/pages/menu/menu' },
      { id: 'period', icon: '🌸', title: '经期助手', desc: '预测身体周期', color: 'mint', page: '/pages/period/period' },
      { id: 'add-anniv', icon: '🎀', title: '添加纪念', desc: '记录重要日子', color: 'orange', page: '/pages/anniversary-add/anniversary-add' },
      { id: 'add-moment', icon: '📸', title: '记录时光', desc: '保存美好瞬间', color: 'blue', page: '/pages/moments-add/moments-add' }
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
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  async refreshData() {
    try {
      // 拉取用户信息，检测配对状态
      const profileRes = await api.auth.profile()
      if (profileRes.code === 0 && profileRes.data) {
        const d = profileRes.data
        wx.setStorageSync('userInfo', d)

        // 配对状态变化处理
        const wasSingle = wx.getStorageSync('singleMode')
        if (d.partnered && wasSingle) {
          // 从单人模式变为已配对
          wx.removeStorageSync('singleMode')
          wx.showToast({ title: 'TA已加入，开启双人模式 💕', icon: 'none' })
        }
        this.setData({ singleMode: !d.partnered })

        // 构建 coupleInfo（单人模式下 partnerName2 留空，WXML 显示虚线占位框）
        const partnerName1 = d.nickName || '我'
        const partnerName2 = d.partnered ? (d.partnerName || 'TA') : ''
        const coupleInfo = {
          partnerName1,
          partnerName2,
          avatarText1: partnerName1.charAt(0),       // 头像首字（无真实头像时展示）
          avatarText2: partnerName2.charAt(0),
          loveDate: d.loveDate,
          partnered: d.partnered
        }

        // 计算相爱天数
        let loveDays = 0
        if (coupleInfo.loveDate) {
          loveDays = util.getDaysBetween(coupleInfo.loveDate, util.formatDate(new Date(), 'YYYY-MM-DD'))
        }

        this.setData({
          coupleInfo,
          loveDays,
          loveQuote: util.getRandomLoveQuote()
        })

        // 一次性迁移旧版本地存储的数据到后端（仅首次，失败则下次重试）
        if (!wx.getStorageSync('dataMigrated')) {
          await api.migrateLocalData()
          wx.setStorageSync('dataMigrated', true)
        }

        // 并行加载各模块数据
        await Promise.all([
          this.loadCheckin(),
          this.loadMenus(),
          this.loadAnniversaries(),
          this.loadMoments(),
          this.loadPeriod()
        ])
      }
    } catch (e) {
      console.error('加载数据失败', e)
      // 网络错误时使用本地缓存兜底
      const userInfo = wx.getStorageSync('userInfo') || {}
      const fallbackName = userInfo.nickName || '我'
      this.setData({
        coupleInfo: {
          partnerName1: fallbackName,
          partnerName2: '',
          avatarText1: fallbackName.charAt(0),
          avatarText2: '',
          partnered: false
        },
        singleMode: true
      })
    }
  },

  // 加载恋爱打卡状态
  async loadCheckin() {
    try {
      const res = await api.checkin.status()
      if (res.code === 0 && res.data) {
        const d = res.data
        const t = d.today || {}
        this.setData({
          checkin: {
            streak: d.streak || 0,
            myDone: !!t.myDone,
            partnerDone: !!t.partnerDone,
            bothDone: !!(t.myDone && t.partnerDone),
            note: t.note || ''
          }
        })
      }
    } catch (e) {
      console.error('加载打卡状态失败', e)
    }
  },

  // 加载菜品数据
  async loadMenus() {
    try {
      const res = await api.menu.list()
      if (res.code === 0) {
        const menus = (res.data || []).map(m => ({
          ...m,
          image: m.image ? api.getFullUrl(m.image) : ''
        }))
        const todayMenu = menus.find(m => m.is_today) || (menus.length > 0 ? menus[0] : null)
        this.setData({ todayMenu })
      }
    } catch (e) {
      console.error('加载菜品失败', e)
    }
  },

  // 加载纪念日数据
  async loadAnniversaries() {
    try {
      const res = await api.anniversary.list()
      if (res.code === 0) {
        const anniversaries = res.data || []
        const sortedAnniversaries = anniversaries
          .map(a => ({
            ...a,
            daysTo: util.getDaysToAnniversary(a.date, a.repeat_type || a.repeat),
            displayDate: (a.repeat_type || a.repeat) === 'yearly' ? util.getAnniversaryThisYear(a.date) : a.date
          }))
          .sort((a, b) => a.daysTo - b.daysTo)
          .slice(0, 3)
        // 取 daysTo 最小的作为下个纪念日，用于 Hero 区倒计时展示
        const nextAnniversary = sortedAnniversaries.length > 0 ? sortedAnniversaries[0] : null
        this.setData({ nearestAnniversaries: sortedAnniversaries, nextAnniversary })
      }
    } catch (e) {
      console.error('加载纪念日失败', e)
    }
  },

  // 加载时光记录
  async loadMoments() {
    try {
      const res = await api.moment.list()
      if (res.code === 0) {
        const moments = (res.data || []).map(m => {
          let images = m.images || []
          if (typeof images === 'string') {
            try { images = JSON.parse(images) } catch (e) { images = [] }
          }
          images = images.map(url => api.getFullUrl(url))
          return { ...m, images, coverImage: images.length > 0 ? images[0] : '' }
        })
        const recentMoments = moments
          .sort((a, b) => new Date(b.date.replace(/-/g, '/')) - new Date(a.date.replace(/-/g, '/')))
          .slice(0, 2)
        this.setData({ recentMoments })
      }
    } catch (e) {
      console.error('加载时光记录失败', e)
    }
  },

  // 加载经期状态
  async loadPeriod() {
    try {
      const [configRes, recordsRes] = await Promise.all([
        api.period.getConfig(),
        api.period.records()
      ])
      const cfg = configRes.code === 0 ? (configRes.data || {}) : {}
      const records = recordsRes.code === 0 ? (recordsRes.data || []) : []
      if (records.length > 0) {
        const lastRecord = records[records.length - 1]
        const cycleLength = cfg.cycle_length || 28
        const periodLength = cfg.period_length || 5
        const phase = util.periodUtils.getCurrentPhase(lastRecord.start_date, cycleLength, periodLength)
        const nextStart = util.periodUtils.getNextPeriodStart(lastRecord.start_date, cycleLength)
        const daysToNext = util.getDaysBetween(util.formatDate(new Date(), 'YYYY-MM-DD'), nextStart)
        this.setData({ periodInfo: { ...phase, daysToNext } })
      }
    } catch (e) {
      console.error('加载经期失败', e)
    }
  },

  // 换一句情话
  changeQuote() {
    this.setData({
      loveQuote: util.getRandomLoveQuote()
    })
  },

  // 跳转打卡页
  goToCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },

  // 随机今日菜品
  async randomMenu() {
    try {
      const res = await api.menu.list()
      if (res.code !== 0 || !res.data || res.data.length === 0) {
        wx.showToast({ title: '菜单空空如也~', icon: 'none' })
        return
      }
      const randomMenu = util.getRandomItem(res.data)
      const setRes = await api.menu.setToday(randomMenu.id)
      if (setRes.code === 0) {
        this.setData({
          todayMenu: { ...randomMenu, image: randomMenu.image ? api.getFullUrl(randomMenu.image) : '' }
        })
        wx.showToast({ title: '今日菜品已更新 🎉', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  // 跳转功能页（tab 页用 switchTab，普通页用 navigateTo）
  goToPage(e) {
    const { page } = e.currentTarget.dataset
    if (!page) return
    if (TAB_PAGES.indexOf(page) >= 0) {
      wx.switchTab({ url: page })
    } else {
      wx.navigateTo({ url: page })
    }
  },

  // 去菜单详情
  goToMenuDetail() {
    wx.navigateTo({ url: '/pages/menu/menu' })
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
