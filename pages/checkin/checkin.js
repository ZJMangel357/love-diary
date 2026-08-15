// pages/checkin/checkin.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

Page({
  data: {
    today: {},
    streak: 0,
    weekCells: [],
    history: [],
    checking: false
  },

  onShow() {
    this.loadStatus()
  },

  // 加载打卡状态
  async loadStatus() {
    try {
      const res = await api.checkin.status()
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        return
      }
      const data = res.data || {}
      const rawToday = data.today || {}
      const rawHistory = data.history || []
      this.setData({
        today: this.buildTodayView(rawToday),
        streak: data.streak || 0,
        weekCells: this.buildWeekCells(rawToday, rawHistory),
        history: this.buildHistoryList(rawHistory)
      })
    } catch (e) {
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  // 增强今日数据，预计算所有显示字段
  buildTodayView(rawToday) {
    const today = Object.assign({}, rawToday)
    today.myDone = !!today.myDone
    today.partnerDone = !!today.partnerDone
    today.bothDone = !!today.bothDone
    today.heartClass = today.myDone ? 'heart-done' : 'heart-empty'
    today.heartTip = today.myDone ? '已点亮今日爱心' : '点击打卡'
    today.myStatusText = today.myDone ? '✓' : '✗'
    today.myStatusCls = today.myDone ? 'ok' : 'no'
    today.partnerStatusText = today.partnerDone ? '✓' : '✗'
    today.partnerStatusCls = today.partnerDone ? 'ok' : 'no'
    today.btnText = today.myDone ? '今天已打卡 💖' : '今日打卡'
    today.btnClass = today.myDone ? 'btn-done' : ''
    return today
  },

  // 预计算最近 7 天打卡格子
  buildWeekCells(rawToday, rawHistory) {
    const historyMap = {}
    rawHistory.forEach(h => {
      if (h.check_date) historyMap[h.check_date] = h
    })
    const cells = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = util.formatDate(d, 'YYYY-MM-DD')
      const isToday = i === 0
      const h = historyMap[dateStr]
      let myDone = false
      let partnerDone = false
      let bothDone = false
      if (isToday) {
        myDone = !!rawToday.myDone
        partnerDone = !!rawToday.partnerDone
        bothDone = !!rawToday.bothDone
      } else if (h) {
        myDone = !!h.my_done
        partnerDone = !!h.partner_done
        bothDone = !!h.bothDone
      }
      let cls = 'empty'
      let mark = ''
      if (bothDone) {
        cls = 'both'
        mark = '💖'
      } else if (myDone) {
        cls = 'done'
        mark = '✓'
      } else if (partnerDone) {
        cls = 'done'
      }
      cells.push({
        dayLabel: WEEK_LABELS[d.getDay()],
        dateLabel: util.formatDate(d, 'MM-DD'),
        isToday,
        myDone,
        partnerDone,
        bothDone,
        cls,
        mark
      })
    }
    return cells
  },

  // 预计算打卡历史列表显示字段
  buildHistoryList(rawHistory) {
    const todayStr = util.formatDate(new Date(), 'YYYY-MM-DD')
    const sorted = rawHistory.slice().sort((a, b) => {
      if (!a.check_date) return 1
      if (!b.check_date) return -1
      return a.check_date < b.check_date ? 1 : -1
    })
    return sorted.map(h => {
      const dateStr = h.check_date || ''
      const myDone = !!h.my_done
      const partnerDone = !!h.partner_done
      const bothDone = !!h.bothDone
      let statusEmoji = '🤍'
      if (bothDone) statusEmoji = '💖'
      else if (myDone || partnerDone) statusEmoji = '💗'
      return {
        dateLabel: dateStr ? dateStr.slice(5) : '',
        isToday: dateStr === todayStr,
        myDone,
        partnerDone,
        bothDone,
        myText: myDone ? '✓' : '✗',
        partnerText: partnerDone ? '✓' : '✗',
        statusEmoji,
        note: h.note || ''
      }
    })
  },

  // 打卡
  doCheckin() {
    if (this.data.checking) return
    if (this.data.today.myDone) {
      wx.showToast({ title: '今天已打卡啦', icon: 'none' })
      return
    }
    wx.showModal({
      title: '今日寄语',
      editable: true,
      placeholderText: '写句情话吧~',
      success: (res) => {
        if (!res.confirm) return
        const note = (res.content || '').trim()
        this.setData({ checking: true })
        api.checkin.doCheckin(note).then(r => {
          this.setData({ checking: false })
          if (r.code === 0) {
            wx.showToast({ title: '打卡成功 💖', icon: 'none' })
            this.loadStatus()
          } else {
            wx.showToast({ title: r.message || '打卡失败', icon: 'none' })
          }
        }).catch(() => {
          this.setData({ checking: false })
          wx.showToast({ title: '网络错误', icon: 'none' })
        })
      }
    })
  }
})
