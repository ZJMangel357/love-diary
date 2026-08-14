// pages/period/period.js
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    periods: { records: [], cycleLength: 28, periodLength: 5 },
    currentPhase: null,
    nextStart: '',
    ovulationDate: '',
    ovulationStart: '',
    ovulationEnd: '',
    daysToNext: 0,
    cycleDays: [],
    monthCalendar: [],
    selectedSettings: false,
    cycleOptions: Array.from({ length: 15 }, (_, i) => 21 + i),
    periodOptions: Array.from({ length: 8 }, (_, i) => 3 + i),
    healthTips: [
      { phase: 'period', emoji: '🛁', title: '注意保暖', desc: '避免受凉，多喝热水或红糖姜茶~' },
      { phase: 'period', emoji: '😴', title: '充分休息', desc: '保证充足睡眠，避免剧烈运动' },
      { phase: 'period', emoji: '🥗', title: '清淡饮食', desc: '少吃生冷辛辣，多吃补血食物' },
      { phase: 'follicular', emoji: '💪', title: '代谢旺盛期', desc: '适合运动健身，效果翻倍！' },
      { phase: 'follicular', emoji: '💄', title: '状态最佳', desc: '皮肤变好，适合约会拍照~' },
      { phase: 'fertile', emoji: '🌡️', title: '关注体温', desc: '基础体温可能会轻微上升' },
      { phase: 'fertile', emoji: '💧', title: '注意观察', desc: '分泌物可能变得清亮拉丝' },
      { phase: 'luteal', emoji: '😫', title: '警惕PMS', desc: '可能出现情绪波动、胸胀等' },
      { phase: 'luteal', emoji: '🍫', title: '补充营养', desc: '适当吃点黑巧克力、香蕉缓解情绪' },
      { phase: 'luteal', emoji: '🧘', title: '放松身心', desc: '冥想、瑜伽有助于缓解不适' },
      { phase: 'ovulation', emoji: '💖', title: '受孕几率高', desc: '今天是排卵日，受孕率最高' },
      { phase: 'ovulation', emoji: '🌹', title: '魅力高峰', desc: '女性魅力值达到最高点~' }
    ],
    currentTips: []
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    const periods = wx.getStorageSync('periods') || { records: [], cycleLength: 28, periodLength: 5 }
    let currentPhase = null
    let nextStart = ''
    let ovulationDate = ''
    let ovulationStart = ''
    let ovulationEnd = ''
    let daysToNext = 0
    let currentTips = this.data.healthTips.filter(t => t.phase === 'luteal' || t.phase === 'follicular')

    if (periods.records.length > 0) {
      const lastRecord = periods.records[periods.records.length - 1]
      currentPhase = util.periodUtils.getCurrentPhase(lastRecord.startDate, periods.cycleLength, periods.periodLength)
      nextStart = util.periodUtils.getNextPeriodStart(lastRecord.startDate, periods.cycleLength)
      ovulationDate = util.periodUtils.getOvulationDate(nextStart)
      const ovuPeriod = util.periodUtils.getOvulationPeriod(lastRecord.startDate, periods.cycleLength)
      ovulationStart = ovuPeriod.start
      ovulationEnd = ovuPeriod.end
      daysToNext = util.getDaysBetween(util.formatDate(new Date(), 'YYYY-MM-DD'), nextStart)
      
      // 获取对应阶段的建议
      currentTips = this.data.healthTips.filter(t => t.phase === currentPhase.phase)
      if (currentTips.length === 0) {
        currentTips = this.data.healthTips.filter(t => t.phase === currentPhase.phase === 'period' ? 'period' : 'luteal')
      }
    }

    // 生成日历
    const monthCalendar = this.generateCalendar(periods, nextStart, ovulationDate, ovulationStart, ovulationEnd)

    this.setData({
      periods,
      currentPhase,
      nextStart,
      ovulationDate,
      ovulationStart,
      ovulationEnd,
      daysToNext,
      monthCalendar,
      currentTips
    })
  },

  generateCalendar(periods, nextStart, ovulationDate, ovuStart, ovuEnd) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay() // 0 is Sunday
    const totalDays = lastDay.getDate()

    // 收集有记录的日期
    const periodDays = new Set()
    periods.records.forEach(r => {
      const start = new Date(r.startDate.replace(/-/g, '/'))
      for (let i = 0; i < periods.periodLength; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        if (d.getMonth() === month && d.getFullYear() === year) {
          periodDays.add(d.getDate())
        }
      }
    })

    // 下次经期
    const nextStartDate = new Date(nextStart.replace(/-/g, '/'))
    if (nextStartDate.getMonth() === month && nextStartDate.getFullYear() === year) {
      for (let i = 0; i < periods.periodLength; i++) {
        const d = new Date(nextStartDate)
        d.setDate(d.getDate() + i)
        if (d.getMonth() === month) {
          periodDays.add(d.getDate()) // 用负数或标记区分
        }
      }
    }

    // 排卵期
    const ovuSet = new Set()
    const ovuS = new Date(ovuStart.replace(/-/g, '/'))
    const ovuE = new Date(ovuEnd.replace(/-/g, '/'))
    const ovuD = new Date(ovulationDate.replace(/-/g, '/'))
    for (let d = new Date(ovuS); d <= ovuE; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === month && d.getFullYear() === year) {
        ovuSet.add(d.getDate())
      }
    }
    const ovuDay = ovuD.getMonth() === month && ovuD.getFullYear() === year ? ovuD.getDate() : -1

    // 今天
    const today = now.getDate()
    const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

    const days = []
    for (let i = 0; i < startWeekday; i++) {
      days.push({ empty: true })
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        day: d,
        isPeriod: periodDays.has(d) && (d <= today || this.isFuturePeriod(d, nextStartDate)),
        isPredicted: new Date(dateStr.replace(/-/g, '/')) > now && periodDays.has(d),
        isOvu: ovuSet.has(d),
        isOvulation: d === ovuDay,
        isToday: d === today
      })
    }

    return {
      monthLabel: `${year}年${month + 1}月`,
      weekLabels,
      days
    }
  },

  isFuturePeriod(day, nextStartDate) {
    // 判断是否是预测的未来经期
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const d = new Date(now.getFullYear(), now.getMonth(), day)
    return d > now
  },

  goRecord() {
    wx.navigateTo({ url: '/pages/period-record/period-record' })
  },

  recordToday() {
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')
    const periods = this.data.periods
    const newRecord = {
      id: util.generateId(),
      startDate: today,
      note: '',
      symptoms: []
    }
    periods.records.push(newRecord)
    wx.setStorageSync('periods', periods)
    wx.showToast({ title: '已记录今天开始', icon: 'success' })
    this.refreshData()
  },

  toggleSettings() {
    this.setData({ selectedSettings: !this.data.selectedSettings })
  },

  changeCycle(e) {
    const value = this.data.cycleOptions[e.detail.value]
    const periods = { ...this.data.periods, cycleLength: value }
    wx.setStorageSync('periods', periods)
    this.refreshData()
  },

  changePeriod(e) {
    const value = this.data.periodOptions[e.detail.value]
    const periods = { ...this.data.periods, periodLength: value }
    wx.setStorageSync('periods', periods)
    this.refreshData()
  },

  deleteRecord(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条经期记录吗？',
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm) {
          const periods = this.data.periods
          periods.records = periods.records.filter(r => r.id !== id)
          wx.setStorageSync('periods', periods)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.refreshData()
        }
      }
    })
  }
})
