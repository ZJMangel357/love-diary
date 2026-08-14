// pages/menu-add/menu-add.js
const util = require('../../utils/util.js')
const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    isEdit: false,
    editId: null,
    name: '',
    category: '家常菜',
    categories: [],
    tags: [],
    tagInput: '',
    difficulty: 1,
    creator: '她',
    creators: ['他', '她', '一起'],
    image: '',
    presetTags: ['快手', '下饭', '硬菜', '健康', '聚会', '夜宵', '早餐', '甜点', '辣', '清淡', '汤品', '约会'],
    selectedPreset: []
  },

  async onLoad(options) {
    const categories = util.menuCategories
    this.setData({ categories })
    
    if (options.id) {
      // 编辑模式：从后端拉取菜品详情
      try {
        const res = await api.menu.list()
        if (res.code === 0) {
          const menu = res.data.find(m => m.id === Number(options.id))
          if (menu) {
            this.setData({
              isEdit: true,
              editId: menu.id,
              name: menu.name,
              category: menu.category || '家常菜',
              tags: menu.tags || [],
              selectedPreset: menu.tags || [],
              difficulty: menu.difficulty || 1,
              creator: menu.creator || '她',
              image: menu.image || ''
            })
            wx.setNavigationBarTitle({ title: '编辑菜品' })
          }
        }
      } catch (e) {
        console.error('获取菜品详情失败', e)
      }
    }
  },

  onInputName(e) {
    this.setData({ name: e.detail.value })
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value })
  },

  addTag() {
    const tag = this.data.tagInput.trim()
    if (!tag) return
    if (this.data.tags.includes(tag)) {
      wx.showToast({ title: '已添加过该标签', icon: 'none' })
      return
    }
    if (this.data.tags.length >= 6) {
      wx.showToast({ title: '最多6个标签', icon: 'none' })
      return
    }
    this.setData({
      tags: [...this.data.tags, tag],
      tagInput: ''
    })
  },

  togglePresetTag(e) {
    const { tag } = e.currentTarget.dataset
    let { tags, selectedPreset } = this.data
    if (selectedPreset.includes(tag)) {
      selectedPreset = selectedPreset.filter(t => t !== tag)
      tags = tags.filter(t => t !== tag)
    } else {
      if (tags.length >= 6) {
        wx.showToast({ title: '最多6个标签', icon: 'none' })
        return
      }
      selectedPreset = [...selectedPreset, tag]
      tags = [...tags, tag]
    }
    this.setData({ tags, selectedPreset })
  },

  removeTag(e) {
    const { tag } = e.currentTarget.dataset
    let { tags, selectedPreset } = this.data
    tags = tags.filter(t => t !== tag)
    selectedPreset = selectedPreset.filter(t => t !== tag)
    this.setData({ tags, selectedPreset })
  },

  changeCategory(e) {
    this.setData({ category: this.data.categories[e.detail.value] })
  },

  changeDifficulty(e) {
    this.setData({ difficulty: Number(e.currentTarget.dataset.level) })
  },

  changeCreator(e) {
    this.setData({ creator: this.data.creators[e.detail.value] })
  },

  async save() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' })
      return
    }

    const payload = {
      name: this.data.name.trim(),
      category: this.data.category,
      tags: this.data.tags,
      difficulty: this.data.difficulty,
      creator: this.data.creator,
      image: this.data.image,
      favorite: false
    }

    try {
      if (this.data.isEdit) {
        const res = await api.menu.update(this.data.editId, payload)
        if (res.code === 0) {
          wx.showToast({ title: '修改成功 ✅', icon: 'success' })
        } else {
          wx.showToast({ title: res.message || '修改失败', icon: 'none' })
          return
        }
      } else {
        const res = await api.menu.add(payload)
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
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  }
})
