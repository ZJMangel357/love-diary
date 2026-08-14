// pages/menu/menu.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    categories: [],
    activeCategory: '全部',
    menus: [],
    filteredMenus: [],
    todayMenu: null,
    searchKeyword: '',
    sortBy: 'default', // default, favorite, difficulty
    showRandomModal: false,
    randomResult: null
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  async refreshData() {
    try {
      const res = await api.menu.list()
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        return
      }
      const menus = res.data || []
      // 生成分类列表
      const categorySet = new Set(['全部'])
      menus.forEach(m => {
        if (m.category) categorySet.add(m.category)
      })

      // 今日菜单：取 is_today 标记的菜品
      const todayMenu = menus.find(m => m.is_today) || null

      this.setData({
        menus,
        todayMenu,
        categories: Array.from(categorySet)
      })
      this.applyFilter()
    } catch (e) {
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  // 切换分类
  switchCategory(e) {
    const { category } = e.currentTarget.dataset
    this.setData({ activeCategory: category }, () => {
      this.applyFilter()
    })
  },

  // 搜索
  onSearch(e) {
    this.setData({ searchKeyword: e.detail.value }, () => {
      this.applyFilter()
    })
  },

  // 排序
  changeSort(e) {
    this.setData({ sortBy: e.currentTarget.dataset.sort }, () => {
      this.applyFilter()
    })
  },

  // 应用过滤和排序
  applyFilter() {
    let list = [...this.data.menus]
    
    // 分类过滤
    if (this.data.activeCategory !== '全部') {
      list = list.filter(m => m.category === this.data.activeCategory)
    }
    
    // 关键词搜索
    if (this.data.searchKeyword) {
      const kw = this.data.searchKeyword.toLowerCase()
      list = list.filter(m => 
        m.name.toLowerCase().includes(kw) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(kw)))
      )
    }
    
    // 排序
    switch (this.data.sortBy) {
      case 'favorite':
        list.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
        break
      case 'difficulty':
        list.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1))
        break
    }

    // 预计算难度星级（WXML 不支持 .repeat()）
    list = list.map(m => ({
      ...m,
      difficultyStars: '⭐'.repeat(m.difficulty || 1) + '☆'.repeat(Math.max(0, 3 - (m.difficulty || 1)))
    }))

    this.setData({ filteredMenus: list })
  },

  // 切换收藏
  async toggleFavorite(e) {
    const { id } = e.currentTarget.dataset
    const menu = this.data.menus.find(m => m.id === id)
    if (!menu) return
    const newFav = !menu.favorite
    try {
      const res = await api.menu.update(id, { ...menu, favorite: newFav })
      if (res.code === 0) {
        wx.showToast({
          title: newFav ? '已加入收藏 💖' : '取消收藏',
          icon: 'none'
        })
        this.refreshData()
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  // 设为今日菜单
  async setAsToday(e) {
    const { id } = e.currentTarget.dataset
    try {
      const res = await api.menu.setToday(id)
      if (res.code === 0) {
        wx.showToast({ title: '已设为今日菜单 🎉', icon: 'none' })
        this.refreshData()
      } else {
        wx.showToast({ title: res.message || '设置失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  // 删除菜单
  deleteMenu(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除菜品',
      content: '确定要删除这道菜吗？',
      confirmColor: '#FF6B9D',
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await api.menu.remove(id)
            if (r.code === 0) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.refreshData()
            } else {
              wx.showToast({ title: r.message || '删除失败', icon: 'none' })
            }
          } catch (e) {
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  },

  // 随机选菜
  openRandom() {
    const menus = this.data.menus
    if (menus.length === 0) {
      wx.showToast({ title: '菜单还是空的~', icon: 'none' })
      return
    }
    this.setData({ showRandomModal: true, randomResult: null })
    
    // 模拟滚动效果
    let count = 0
    const maxCount = 15
    const interval = setInterval(() => {
      count++
      const randomIdx = Math.floor(Math.random() * menus.length)
      this.setData({ randomResult: menus[randomIdx] })
      if (count >= maxCount) {
        clearInterval(interval)
        // 最终结果
        const finalIdx = Math.floor(Math.random() * menus.length)
        wx.vibrateShort({ type: 'light' })
        this.setData({ randomResult: menus[finalIdx] })
      }
    }, 80)
  },

  closeRandom() {
    this.setData({ showRandomModal: false })
  },

  async confirmRandom() {
    if (this.data.randomResult) {
      try {
        const res = await api.menu.setToday(this.data.randomResult.id)
        if (res.code === 0) {
          wx.showToast({ title: '就决定是它啦！🎉', icon: 'none' })
          this.setData({ showRandomModal: false })
          this.refreshData()
        } else {
          wx.showToast({ title: res.message || '设置失败', icon: 'none' })
        }
      } catch (e) {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    }
  },

  // 添加菜品
  goAdd() {
    wx.navigateTo({ url: '/pages/menu-add/menu-add' })
  }
})
