// pages/anniversary-add/anniversary-add.js
const util = require('../../utils/util.js')

Page({
  data: {
    isEdit: false,
    editId: null,
    fromLoveDate: false,
    title: '',
    date: '',
    todayStr: '',
    type: 'love',
    types: [
      { key: 'love', label: '恋爱纪念', emoji: '💕' },
      { key: 'birthday', label: '生日', emoji: '🎂' },
      { key: 'memory', label: '回忆纪念', emoji: '🌹' },
      { key: 'custom', label: '其他', emoji: '🎁' }
    ],
    repeat: 'yearly',
    repeatOptions: [
      { key: 'yearly', label: '每年重复' },
      { key: 'once', label: '只此一次' }
    ],
    important: false,
    emojiList: ['💕', '🎂', '🌹', '🎁', '🎉', '💖', '💍', '👰', '🤵', '✈️', '🏠', '💝', '🧸', '🌸', '⭐', '🥰', '💓', '💐'],
    emoji: '💕'
  },

  onLoad(options) {
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({
      todayStr: today,
      date: today
    })

    if (options.from === 'loveDate') {
      this.setData({
        fromLoveDate: true,
        title: '在一起的日子',
        type: 'love',
        emoji: '💕',
        important: true
      })
      wx.setNavigationBarTitle({ title: '设置恋爱纪念日' })
    } else if (options.id) {
      const list = wx.getStorageSync('anniversaries') || []
      const item = list.find(a => a.id === Number(options.id))
      if (item) {
        this.setData({
          isEdit: true,
          editId: item.id,
          title: item.title,
          date: item.date,
          type: item.type,
          repeat: item.repeat,
          important: item.important || false,
          emoji: item.emoji || '💕'
        })
        wx.setNavigationBarTitle({ title: '编辑纪念日' })
      }
    }
  },

  onInputTitle(e) {
    this.setData({ title: e.detail.value })
  },

  changeDate(e) {
    this.setData({ date: e.detail.value })
  },

  changeType(e) {
    const { key, emoji } = e.currentTarget.dataset
    this.setData({
      type: key,
      emoji: emoji
    })
  },

  changeRepeat(e) {
    this.setData({ repeat: this.data.repeatOptions[e.detail.value].key })
  },

  chooseEmoji(e) {
    this.setData({ emoji: e.currentTarget.dataset.emoji })
  },

  toggleImportant(e) {
    this.setData({ important: e.detail.value })
  },

  save() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入纪念标题', icon: 'none' })
      return
    }
    if (!this.data.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    // 如果是设置恋爱纪念日
    if (this.data.fromLoveDate) {
      const coupleInfo = wx.getStorageSync('coupleInfo') || {}
      coupleInfo.loveDate = this.data.date
      wx.setStorageSync('coupleInfo', coupleInfo)
    }

    let list = wx.getStorageSync('anniversaries') || []
    const payload = {
      title: this.data.title.trim(),
      date: this.data.date,
      type: this.data.type,
      repeat: this.data.repeat,
      emoji: this.data.emoji,
      important: this.data.important
    }

    if (this.data.isEdit) {
      list = list.map(a => a.id === this.data.editId ? { ...a, ...payload } : a)
      wx.showToast({ title: '修改成功 ✅', icon: 'success' })
    } else {
      list.unshift({
        id: Date.now(),
        ...payload
      })
      wx.showToast({ title: '添加成功 🎉', icon: 'success' })
    }

    wx.setStorageSync('anniversaries', list)
    setTimeout(() => {
      wx.navigateBack()
    }, 800)
  }
})
