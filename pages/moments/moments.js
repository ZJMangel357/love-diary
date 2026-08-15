// pages/moments/moments.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

Page({
  data: {
    moments: [],
    displayMoments: [],
    viewMode: 'timeline', // timeline, gallery
    selectedYear: 'all',
    yearOptions: ['all'],
    viewCount: 0
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData()
    wx.stopPullDownRefresh()
  },

  async refreshData() {
    try {
      const res = await api.moment.list()
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        return
      }
      const moments = (res.data || []).map(m => {
        // 兼容 images 为 JSON 字符串或数组的情况，并转为完整URL用于展示
        let images = m.images || []
        if (typeof images === 'string') {
          try { images = JSON.parse(images) } catch (e) { images = [] }
        }
        images = images.map(url => api.getFullUrl(url))
        return {
          ...m,
          images,
          coverImage: images.length > 0 ? images[0] : '',
          dateObj: new Date(m.date.replace(/-/g, '/')),
          relativeTime: util.getRelativeTime(m.date)
        }
      })
      const sorted = moments.sort((a, b) => b.dateObj - a.dateObj)

      // 生成年份选项
      const years = new Set(['all'])
      sorted.forEach(m => years.add(String(m.dateObj.getFullYear())))
      const yearOptions = Array.from(years)

      const viewCount = (wx.getStorageSync('momentsViewCount') || 0) + 1
      wx.setStorageSync('momentsViewCount', viewCount)

      this.setData({
        moments: sorted,
        yearOptions,
        viewCount
      }, () => {
        this.applyFilter()
      })
    } catch (e) {
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  switchView() {
    this.setData({
      viewMode: this.data.viewMode === 'timeline' ? 'gallery' : 'timeline'
    })
  },

  switchYear(e) {
    const { year } = e.currentTarget.dataset
    this.setData({ selectedYear: year }, () => {
      this.applyFilter()
    })
  },

  applyFilter() {
    let list = [...this.data.moments]
    if (this.data.selectedYear !== 'all') {
      list = list.filter(m => String(m.dateObj.getFullYear()) === this.data.selectedYear)
    }

    // 按月份分组（timeline模式）
    if (this.data.viewMode === 'timeline') {
      const groups = {}
      list.forEach(m => {
        const key = `${m.dateObj.getFullYear()}年${m.dateObj.getMonth() + 1}月`
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(m)
      })
      const result = Object.keys(groups).map(key => ({
        monthKey: key,
        count: groups[key].length,
        items: groups[key]
      }))
      this.setData({ displayMoments: result })
    } else {
      this.setData({ displayMoments: list })
    }
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/moments-add/moments-add' })
  },

  editItem(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/moments-add/moments-add?id=${id}` })
  },

  deleteItem(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条美好回忆吗？',
      confirmColor: '#FF6B9D',
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await api.moment.remove(id)
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

  // 预览图片
  previewImages(e) {
    const { urls, current } = e.currentTarget.dataset
    if (!urls || urls.length === 0) return
    wx.previewImage({
      current: current || urls[0],
      urls
    })
  },

  previewItem(e) {
    const { id } = e.currentTarget.dataset
    const moment = this.data.moments.find(m => m.id === id)
    if (!moment) return

    wx.showActionSheet({
      itemList: ['查看详情', '编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showDetail(moment)
        } else if (res.tapIndex === 1) {
          this.editItem(e)
        } else if (res.tapIndex === 2) {
          this.deleteItem(e)
        }
      }
    })
  },

  showDetail(moment) {
    const content = `${moment.mood || '💕'} ${moment.title}\n\n${moment.content || '（没有文字记录）'}\n\n📅 ${moment.date}${moment.location ? '\n📍 ' + moment.location : ''}`
    wx.showModal({
      title: '美好回忆',
      content,
      showCancel: false,
      confirmText: '好的',
      confirmColor: '#5CC9A5'
    })
  }
})
