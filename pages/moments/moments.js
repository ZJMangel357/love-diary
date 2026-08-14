// pages/moments/moments.js
const util = require('../../utils/util.js')
const app = getApp()

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

  refreshData() {
    const moments = wx.getStorageSync('moments') || []
    const sorted = moments
      .map(m => ({
        ...m,
        dateObj: new Date(m.date.replace(/-/g, '/')),
        relativeTime: util.getRelativeTime(m.date)
      }))
      .sort((a, b) => b.dateObj - a.dateObj)

    // 生成年份选项
    const years = new Set(['all'])
    sorted.forEach(m => years.add(String(m.dateObj.getFullYear())))
    const yearOptions = Array.from(years)

    const viewCount = wx.getStorageSync('momentsViewCount') || 0
    wx.setStorageSync('momentsViewCount', viewCount + 1)

    this.setData({
      moments: sorted,
      yearOptions,
      viewCount: viewCount + 1
    }, () => {
      this.applyFilter()
    })
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
      success: (res) => {
        if (res.confirm) {
          const list = wx.getStorageSync('moments') || []
          const filtered = list.filter(m => m.id !== id)
          wx.setStorageSync('moments', filtered)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.refreshData()
        }
      }
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
