// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-env-id', // 上线时替换为你的云开发环境ID
        traceUser: true
      })
    }

    // 检查本地存储是否有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const coupleInfo = wx.getStorageSync('coupleInfo')
    const themeInfo = wx.getStorageSync('themeInfo')

    // 初始化默认数据
    this.globalData = {
      userInfo: userInfo || null,
      coupleInfo: coupleInfo || {
        partnerName1: '他',
        partnerName2: '她',
        loveDate: '2023-05-20',
        avatar1: '',
        avatar2: ''
      },
      themeInfo: themeInfo || {
        primaryColor: '#FF6B9D',
        secondaryColor: '#A8E6CF',
        accentColor: '#FFD93D',
        themeName: '蜜桃甜心'
      },
      // 示例数据（首次启动时初始化到本地存储）
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
      }
    }

    // 首次启动初始化数据
    if (!wx.getStorageSync('initialized')) {
      this.globalData.initDefaultData()
      wx.setStorageSync('initialized', true)
    }
  },

  globalData: {}
})
