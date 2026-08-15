// pages/anniversary-add/anniversary-add.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

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
    emoji: '💕',
    saving: false
  },

  async onLoad(options) {
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
      try {
        const res = await api.anniversary.list()
        if (res.code === 0) {
          const item = res.data.find(a => a.id === Number(options.id))
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
      } catch (e) {
        console.error('获取纪念日详情失败', e)
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

  async save() {
    if (this.data.saving) return
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入纪念标题', icon: 'none' })
      return
    }
    if (!this.data.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    // 如果是设置恋爱纪念日：更新后端的 loveDate
    if (this.data.fromLoveDate) {
      this.setData({ saving: true })
      wx.showLoading({ title: '保存中...' })
      try {
        const res = await api.auth.updateProfile({ loveDate: this.data.date })
        wx.hideLoading()
        this.setData({ saving: false })
        if (res.code === 0) {
          wx.showToast({ title: '设置成功 💖', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 800)
        } else {
          wx.showToast({ title: res.message || '设置失败', icon: 'none' })
        }
      } catch (e) {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
      return
    }

    const payload = {
      title: this.data.title.trim(),
      date: this.data.date,
      type: this.data.type,
      repeat: this.data.repeat,
      emoji: this.data.emoji,
      important: this.data.important
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })
    try {
      if (this.data.isEdit) {
        const res = await api.anniversary.update(this.data.editId, payload)
        wx.hideLoading()
        this.setData({ saving: false })
        if (res.code === 0) {
          wx.showToast({ title: '修改成功 ✅', icon: 'success' })
        } else {
          wx.showToast({ title: res.message || '修改失败', icon: 'none' })
          return
        }
      } else {
        const res = await api.anniversary.add(payload)
        wx.hideLoading()
        this.setData({ saving: false })
        if (res.code === 0) {
          wx.showToast({ title: '添加成功 🎉', icon: 'success' })
        } else {
          wx.showToast({ title: res.message || '添加失败', icon: 'none' })
          return
        }
      }
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (e) {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  }
})
