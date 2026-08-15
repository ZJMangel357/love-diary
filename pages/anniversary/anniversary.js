// pages/anniversary/anniversary.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

Page({
  data: {
    anniversaries: [],
    displayList: [],
    filter: 'all', // all, love, birthday, memory, custom
    filterOptions: [
      { key: 'all', label: '全部', emoji: '🎨' },
      { key: 'love', label: '恋爱', emoji: '💕' },
      { key: 'birthday', label: '生日', emoji: '🎂' },
      { key: 'memory', label: '回忆', emoji: '🌹' },
      { key: 'custom', label: '其他', emoji: '🎁' }
    ]
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
      const res = await api.anniversary.list()
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        return
      }
      const anniversaries = res.data || []
      const nowStr = util.formatDate(new Date(), 'YYYY-MM-DD')

      const decorated = anniversaries.map(a => {
        const isYearly = a.repeat === 'yearly'
        const displayDate = isYearly ? util.getAnniversaryThisYear(a.date) : a.date
        const daysTo = util.getDaysToAnniversary(a.date, a.repeat)
        const totalDays = Math.abs(util.getDaysBetween(a.date, nowStr))

        // 计算经过的周年数
        let yearsPassed = 0
        if (isYearly) {
          const start = new Date(a.date.replace(/-/g, '/'))
          yearsPassed = new Date().getFullYear() - start.getFullYear()
        }

        return {
          ...a,
          displayDate,
          daysTo,
          totalDays,
          yearsPassed,
          isPast: daysTo < 0
        }
      })
      .sort((a, b) => {
        // 优先显示还没到的
        if (a.daysTo >= 0 && b.daysTo < 0) return -1
        if (a.daysTo < 0 && b.daysTo >= 0) return 1
        return Math.abs(a.daysTo) - Math.abs(b.daysTo)
      })

      this.setData({ anniversaries: decorated }, () => {
        this.applyFilter()
      })
    } catch (e) {
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  switchFilter(e) {
    const { key } = e.currentTarget.dataset
    this.setData({ filter: key }, () => {
      this.applyFilter()
    })
  },

  applyFilter() {
    let list = [...this.data.anniversaries]
    if (this.data.filter !== 'all') {
      list = list.filter(a => a.type === this.data.filter)
    }
    this.setData({ displayList: list })
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/anniversary-add/anniversary-add' })
  },

  editItem(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/anniversary-add/anniversary-add?id=${id}` })
  },

  deleteItem(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除纪念日',
      content: '确定要删除这个纪念日吗？',
      confirmColor: '#FF6B9D',
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await api.anniversary.remove(id)
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

  onItemLongPress(e) {
    const { id } = e.currentTarget.dataset
    const actions = ['编辑', '删除']
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.editItem(e)
        } else if (res.tapIndex === 1) {
          this.deleteItem(e)
        }
      }
    })
  }
})
