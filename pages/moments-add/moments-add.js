// pages/moments-add/moments-add.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')

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
    images: [],
    saving: false
  },

  async onLoad(options) {
    const today = util.formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({
      todayStr: today,
      date: today,
      moodList: util.moodList
    })

    if (options.id) {
      try {
        const res = await api.moment.list()
        if (res.code === 0) {
          const item = res.data.find(m => m.id === Number(options.id))
          if (item) {
            // 后端返回的images可能是JSON字符串或数组，统一处理
            let images = item.images || []
            if (typeof images === 'string') {
              try { images = JSON.parse(images) } catch (e) { images = [] }
            }
            // 转为完整URL用于显示
            images = images.map(url => api.getFullUrl(url))
            this.setData({
              isEdit: true,
              editId: item.id,
              title: item.title || '',
              content: item.content || '',
              date: item.date,
              location: item.location || '',
              mood: item.mood || '😍',
              images
            })
            wx.setNavigationBarTitle({ title: '编辑时光' })
          }
        }
      } catch (e) {
        console.error('获取时光详情失败', e)
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

  async save() {
    if (this.data.saving) return
    if (!this.data.title.trim() && !this.data.content.trim() && this.data.images.length === 0) {
      wx.showToast({ title: '至少写点什么吧~', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })

    try {
      // 上传新选择的本地图片（非http开头的），已是服务器URL的直接保留
      const uploadTasks = this.data.images.map(img => {
        if (img.startsWith('http')) return Promise.resolve(img)
        return api.uploadImage(img)
      })
      const serverUrls = await Promise.all(uploadTasks)

      const payload = {
        title: this.data.title.trim(),
        content: this.data.content.trim(),
        date: this.data.date,
        location: this.data.location.trim(),
        mood: this.data.mood,
        images: serverUrls
      }

      if (this.data.isEdit) {
        const res = await api.moment.update(this.data.editId, payload)
        wx.hideLoading()
        if (res.code === 0) {
          wx.showToast({ title: '修改成功 ✅', icon: 'success' })
        } else {
          wx.showToast({ title: res.message || '修改失败', icon: 'none' })
          this.setData({ saving: false })
          return
        }
      } else {
        const res = await api.moment.add(payload)
        wx.hideLoading()
        if (res.code === 0) {
          wx.showToast({ title: '记录成功 💖', icon: 'success' })
        } else {
          wx.showToast({ title: res.message || '保存失败', icon: 'none' })
          this.setData({ saving: false })
          return
        }
      }
      this.setData({ saving: false })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: '保存失败: ' + e.message, icon: 'none' })
    }
  }
})
