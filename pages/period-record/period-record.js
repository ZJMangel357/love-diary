// pages/period-record/period-record.js
const util = require('../../utils/util.js')

Page({
  data: {
    records: [],
    startDate: '',
    note: '',
    todayStr: '',
    commonSymptoms: [
      { key: 'cramp', label: '痛经', emoji: '😖' },
      { key: 'headache', label: '头痛', emoji: '🤕' },
      { key: 'tired', label: '疲劳', emoji: '😴' },
      { key: 'mood', label: '情绪波动', emoji: '😫' },
      { key: 'bloating', label: '腹胀', emoji: '🫃' },
      { key: 'breast', label: '胸胀', emoji: '💔' },
      { key: 'acne', label: '长痘', emoji: '😣' },
      { key: 'backache', label: '腰酸', emoji: '🥺' },
      { key: 'normal', label: '无不适', emoji: '😊' }
    ],
    selectedSymptoms: [],
    flowLevel: 2,
    flowLevels: [
      { level: 1, label: '少量', emoji: '💧' },
      { level: 2, label: '正常', emoji: '💧💧' },
      { level: 3, label: '较多', emoji: '💧💧💧' },
      { level: 4, label: '大量', emoji: '🚿' }
    ]
  },

  onLoad() {
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')
    const periods = wx.getStorageSync('periods') || { records: [] }
    this.setData({
      todayStr: today,
      startDate: today,
      records: [...periods.records].sort((a, b) =>
        new Date(b.startDate.replace(/-/g, '/')) - new Date(a.startDate.replace(/-/g, '/'))
      )
    })
  },

  changeDate(e) {
    this.setData({ startDate: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  toggleSymptom(e) {
    const { key } = e.currentTarget.dataset
    let list = [...this.data.selectedSymptoms]
    if (list.includes(key)) {
      list = list.filter(k => k !== key)
    } else {
      // 无不适互斥
      if (key === 'normal') {
        list = ['normal']
      } else {
        list = list.filter(k => k !== 'normal')
        if (list.length < 6) list.push(key)
        else wx.showToast({ title: '最多选6个', icon: 'none' })
      }
    }
    this.setData({ selectedSymptoms: list })
  },

  changeFlow(e) {
    this.setData({ flowLevel: Number(e.currentTarget.dataset.level) })
  },

  addRecord() {
    if (!this.data.startDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    const periods = wx.getStorageSync('periods') || { records: [], cycleLength: 28, periodLength: 5 }
    const newRecord = {
      id: Date.now(),
      startDate: this.data.startDate,
      note: this.data.note.trim(),
      symptoms: this.data.selectedSymptoms,
      flowLevel: this.data.flowLevel,
      createdAt: new Date().toISOString()
    }
    periods.records.push(newRecord)
    wx.setStorageSync('periods', periods)
    wx.showToast({ title: '记录成功 🌸', icon: 'success' })
    this.setData({
      records: [...periods.records].sort((a, b) =>
        new Date(b.startDate.replace(/-/g, '/')) - new Date(a.startDate.replace(/-/g, '/'))
      ),
      note: '',
      selectedSymptoms: [],
      flowLevel: 2
    })
  },

  deleteRecord(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条记录吗？',
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm) {
          const periods = wx.getStorageSync('periods') || { records: [] }
          periods.records = periods.records.filter(r => r.id !== id)
          wx.setStorageSync('periods', periods)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({
            records: [...periods.records].sort((a, b) =>
              new Date(b.startDate.replace(/-/g, '/')) - new Date(a.startDate.replace(/-/g, '/'))
            )
          })
        }
      }
    })
  }
})
