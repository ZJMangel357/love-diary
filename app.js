// app.js
App({
  onLaunch() {
    // 纯本地存储模式，不使用云开发

    // 读取本地存储
    const userInfo = wx.getStorageSync('userInfo')
    const coupleInfo = wx.getStorageSync('coupleInfo')
    const themeInfo = wx.getStorageSync('themeInfo')

    this.globalData = {
      userInfo: userInfo || null,
      coupleInfo: coupleInfo || null,
      themeInfo: themeInfo || {
        primaryColor: '#FF6B9D',
        secondaryColor: '#A8E6CF',
        accentColor: '#FFD93D',
        themeName: '蜜桃甜心'
      }
    }

    // 首次启动初始化示例数据
    if (!wx.getStorageSync('initialized')) {
      this.initDefaultData()
      wx.setStorageSync('initialized', true)
    }
  },

  // 检查是否已登录，未登录则跳转登录页
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.nickName) {
      wx.navigateTo({ url: '/pages/login/login' })
      return false
    }
    return true
  },

  // 检查是否已配对
  isPartnered() {
    const coupleInfo = wx.getStorageSync('coupleInfo')
    return !!(coupleInfo && coupleInfo.partnered)
  },

  // 示例数据初始化
  initDefaultData() {
    const defaults = {
      menus: [
        { id: 1, name: '番茄炒蛋', category: '家常菜', tags: ['快手', '下饭'], difficulty: 1, image: '', creator: '她', favorite: true },
        { id: 2, name: '红烧肉', category: '家常菜', tags: ['硬菜', '聚会'], difficulty: 3, image: '', creator: '他', favorite: true },
        { id: 3, name: '糖醋排骨', category: '家常菜', tags: ['酸甜', '下饭'], difficulty: 2, image: '', creator: '她', favorite: false },
        { id: 4, name: '水煮鱼', category: '川菜', tags: ['辣', '聚餐'], difficulty: 3, image: '', creator: '他', favorite: true },
        { id: 5, name: '蒜蓉西兰花', category: '素菜', tags: ['健康', '快手'], difficulty: 1, image: '', creator: '她', favorite: false },
        { id: 6, name: '蛋炒饭', category: '主食', tags: ['快手', '夜宵'], difficulty: 1, image: '', creator: '他', favorite: true }
      ],
      todayMenu: null,
      anniversaries: [
        { id: 1, title: '在一起的日子', date: '2023-05-20', type: 'love', repeat: 'yearly', emoji: '💕', important: true },
        { id: 2, title: '她的生日', date: '2026-10-15', type: 'birthday', repeat: 'yearly', emoji: '🎂', important: true },
        { id: 3, title: '他的生日', date: '2026-03-08', type: 'birthday', repeat: 'yearly', emoji: '🎁', important: true },
        { id: 4, title: '第一次约会', date: '2023-05-01', type: 'memory', repeat: 'yearly', emoji: '🌹', important: false }
      ],
      periods: {
        records: [],
        cycleLength: 28,
        periodLength: 5
      },
      moments: [
        { id: 1, title: '第一次一起看电影', content: '看了《泰坦尼克号》，她哭的稀里哗啦', date: '2023-05-10', images: [], mood: '😍', location: '万达影城' },
        { id: 2, title: '一起去海边', content: '海风很舒服，我们在沙滩上画了两颗心', date: '2023-07-15', images: [], mood: '🥰', location: '厦门鼓浪屿' }
      ]
    }
    Object.keys(defaults).forEach(key => {
      if (!wx.getStorageSync(key)) {
        wx.setStorageSync(key, defaults[key])
      }
    })
  },

  globalData: {}
})
