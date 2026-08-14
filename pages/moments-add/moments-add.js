// pages/moments-add/moments-add.js
const util = require('../../utils/util.js')

Page({
  data: {
    isEdit: false,
    editId: null,
    title: '',
    content: '',
    date: '',
    todayStr: '',
    location: '',
    mood: '😍',
    moodList: [],
    images: []
  },

  onLoad(options) {
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({
      todayStr: today,
      date: today,
      moodList: util.moodList
    })

    if (options.id) {
      const list = wx.getStorageSync('moments') || []
      const item = list.find(m => m.id === Number(options.id))
      if (item) {
        this.setData({
          isEdit: true,
          editId: item.id,
          title: item.title,
          content: item.content,
          date: item.date,
          location: item.location || '',
          mood: item.mood || '😍',
          images: item.images || []
        })
        wx.setNavigationBarTitle({ title: '编辑时光' })
      }
    }
  },

  onInputTitle(e) { this.setData({ title: e.detail.value }) },
  onInputContent(e) { this.setData({ content: e.detail.value }) },
  onInputLocation(e) { this.setData({ location: e.detail.value }) },

  changeDate(e) { this.setData({ date: e.detail.value }) },

  chooseMood(e) {
    this.setData({ mood: e.currentTarget.dataset.mood })
  },

  chooseImage() {
    if (this.data.images.length >= 9) {
      wx.showToast({ title: '最多9张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImgs = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: [...this.data.images, ...newImgs] })
      }
    })
  },

  removeImage(e) {
    const { idx } = e.currentTarget.dataset
    const images = this.data.images.filter((_, i) => i !== idx)
    this.setData({ images })
  },

  previewImage(e) {
    const { idx } = e.currentTarget.dataset
    wx.previewImage({
      current: this.data.images[idx],
      urls: this.data.images
    })
  },

  getLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({ location: res.name || res.address })
      },
      fail: () => {
        wx.showToast({ title: '需要授权定位', icon: 'none' })
      }
    })
  },

  save() {
    if (!this.data.title.trim() && !this.data.content.trim() && this.data.images.length === 0) {
      wx.showToast({ title: '至少写点什么吧~', icon: 'none' })
      return
    }

    let list = wx.getStorageSync('moments') || []
    const payload = {
      title: this.data.title.trim(),
      content: this.data.content.trim(),
      date: this.data.date,
      location: this.data.location.trim(),
      mood: this.data.mood,
      images: this.data.images
    }

    if (this.data.isEdit) {
      list = list.map(m => m.id === this.data.editId ? { ...m, ...payload } : m)
      wx.showToast({ title: '修改成功 ✅', icon: 'success' })
    } else {
      list.unshift({
        id: Date.now(),
        ...payload
      })
      wx.showToast({ title: '记录成功 💖', icon: 'success' })
    }

    wx.setStorageSync('moments', list)
    setTimeout(() => {
      wx.navigateBack()
    }, 800)
  }
})
