// pages/period-record/period-record.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

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

  async onLoad() {
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({
      todayStr: today,
      startDate: today
    })
    await this.loadRecords()
  },

  async loadRecords() {
    try {
      const res = await api.period.records()
      if (res.code === 0) {
        // 后端返回 snake_case，转为前端字段
        const records = (res.data || []).map(r => ({
          ...r,
          startDate: r.start_date,
          flowLevel: r.flow_level
        }))
        this.setData({ records: this.formatRecords(records) })
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  // 格式化记录数据（WXML 不支持复杂 JS 表达式，需预计算）
  formatRecords(records) {
    const symptomMap = {}
    this.data.commonSymptoms.forEach(s => { symptomMap[s.key] = s.label })
    const flowMap = {}
    this.data.flowLevels.forEach(f => { flowMap[f.level] = f })
    return [...records].sort((a, b) =>
      new Date(b.startDate.replace(/-/g, '/')) - new Date(a.startDate.replace(/-/g, '/'))
    ).map(r => {
      const parts = r.startDate.split('-')
      const flow = flowMap[r.flowLevel] || {}
      return {
        ...r,
        dateDay: parts[2],
        dateYM: parts[0] + '.' + parts[1],
        flowEmoji: flow.emoji || '',
        flowLabel: flow.label || '',
        symptomLabels: (r.symptoms || []).map(sk => symptomMap[sk] || sk)
      }
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

  async addRecord() {
    if (!this.data.startDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    try {
      const res = await api.period.addRecord({
        startDate: this.data.startDate,
        note: this.data.note.trim(),
        symptoms: this.data.selectedSymptoms,
        flowLevel: this.data.flowLevel
      })
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '记录失败', icon: 'none' })
        return
      }
      wx.showToast({ title: '记录成功 🌸', icon: 'success' })
      await this.loadRecords()
      this.setData({
        note: '',
        selectedSymptoms: [],
        flowLevel: 2
      })
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  deleteRecord(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条记录吗？',
      confirmColor: '#FF6B9D',
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await api.period.removeRecord(id)
            if (r.code === 0) {
              wx.showToast({ title: '已删除', icon: 'success' })
              await this.loadRecords()
            } else {
              wx.showToast({ title: r.message || '删除失败', icon: 'none' })
            }
          } catch (e) {
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  }
})
