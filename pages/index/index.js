// pages/index/index.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')
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
    singleMode: false,        // 单人体验模式
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

        // 构建 coupleInfo
        const coupleInfo = {
          partnerName1: d.nickName,
          partnerName2: d.partnerName || 'TA',
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

        // 并行加载各模块数据
        await Promise.all([
          this.loadMenus(),
          this.loadAnniversaries(),
          this.loadMoments()
        ])
      }
    } catch (e) {
      console.error('加载数据失败', e)
      // 网络错误时使用本地缓存兜底
      const userInfo = wx.getStorageSync('userInfo') || {}
      this.setData({
        coupleInfo: { partnerName1: userInfo.nickName || '我', partnerName2: 'TA' },
        singleMode: true
      })
    }
  },

  // 加载菜品数据
  async loadMenus() {
    try {
      const res = await api.menu.list()
      if (res.code === 0) {
        const menus = res.data || []
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
        this.setData({ nearestAnniversaries: sortedAnniversaries })
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
        const moments = res.data || []
        const recentMoments = moments
          .sort((a, b) => new Date(b.date.replace(/-/g, '/')) - new Date(a.date.replace(/-/g, '/')))
          .slice(0, 2)
        this.setData({ recentMoments })
      }
    } catch (e) {
      console.error('加载时光记录失败', e)
    }
  },

  // 换一句情话
  changeQuote() {
    this.setData({
      loveQuote: util.getRandomLoveQuote()
    })
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
        this.setData({ todayMenu: randomMenu })
        wx.showToast({ title: '今日菜品已更新 🎉', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
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
