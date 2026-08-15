// pages/quiz/quiz.js - 心有灵犀默契测试
const api = require('../../utils/api.js')

const QUIZ_ID = 'quiz1'

// 题库：10 道情侣主观偏好题，每题 2 个选项
const QUESTIONS = [
  { question: '周末最理想的约会？', options: [{ text: 'A.宅家看电影' }, { text: 'B.出门探店' }] },
  { question: '谁更会哄人开心？', options: [{ text: 'A.我' }, { text: 'B.TA' }] },
  { question: '旅行更想去？', options: [{ text: 'A.海边' }, { text: 'B.雪山' }] },
  { question: '纪念日最想怎么过？', options: [{ text: 'A.仪式感大餐' }, { text: 'B.简单陪伴' }] },
  { question: '谁先主动认错？', options: [{ text: 'A.我' }, { text: 'B.TA' }] },
  { question: '理想晚餐是？', options: [{ text: 'A.火锅' }, { text: 'B.日料' }] },
  { question: '生气时希望对方？', options: [{ text: 'A.立刻哄我' }, { text: 'B.给点空间' }] },
  { question: '谁更粘人？', options: [{ text: 'A.我' }, { text: 'B.TA' }] },
  { question: '睡前最后一件事？', options: [{ text: 'A.互道晚安' }, { text: 'B.各自刷手机' }] },
  { question: '爱情里最重要的是？', options: [{ text: 'A.陪伴' }, { text: 'B.惊喜' }] }
]

const TOTAL = QUESTIONS.length

// 根据默契度返回等级评语
function getLevel(rate) {
  if (rate > 80) return { text: '天作之合', emoji: '💞' }
  if (rate > 60) return { text: '心有灵犀', emoji: '💘' }
  if (rate > 40) return { text: '渐入佳境', emoji: '🌸' }
  return { text: '继续磨合', emoji: '💪' }
}

Page({
  data: {
    step: 'start', // start | doing | result
    questions: QUESTIONS,
    currentIndex: 0,
    answers: [],
    loading: false,
    resultData: null,

    // 答题页（预计算展示字段）
    currentQuestion: QUESTIONS[0],
    currentNum: '1',
    totalNum: TOTAL + '',
    progressPercent: 0,

    // 开始页（上次结果入口）
    hasLastResult: false,
    lastMatchRate: 0,

    // 结果页（预计算展示字段）
    bothDone: false,
    matchRate: 0,
    levelText: '',
    levelEmoji: '',
    compareList: []
  },

  onLoad() {
    this.loadResult()
  },

  onPullDownRefresh() {
    this.loadResult()
    wx.stopPullDownRefresh()
  },

  onShareAppMessage() {
    return {
      title: '💞 心有灵犀默契测试，测测你们的默契度！',
      path: '/pages/quiz/quiz'
    }
  },

  // 开始测试 / 再测一次：进入答题
  startQuiz() {
    this.setData({
      step: 'doing',
      currentIndex: 0,
      answers: [],
      currentQuestion: this.data.questions[0],
      currentNum: '1',
      progressPercent: 0
    })
  },

  // 从开始页查看上次结果
  viewResult() {
    this.setData({ step: 'result' })
    this.loadResult()
  },

  // 选择选项：点击即选中，进入下一题，最后一题自动提交
  chooseOption(e) {
    if (this.data.loading) return
    const idx = Number(e.currentTarget.dataset.idx)
    const answers = this.data.answers.concat(idx)

    if (answers.length >= TOTAL) {
      this.setData({ answers })
      this.submitQuiz()
      return
    }

    const nextIndex = this.data.currentIndex + 1
    this.setData({
      answers,
      currentIndex: nextIndex,
      currentQuestion: this.data.questions[nextIndex],
      currentNum: nextIndex + 1 + '',
      progressPercent: Math.round((answers.length / TOTAL) * 100)
    })
  },

  // 提交答案
  async submitQuiz() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api.quiz.submit(QUIZ_ID, this.data.answers, 0)
      if (res.code !== 0) {
        this.setData({ loading: false })
        wx.showToast({ title: res.message || '提交失败', icon: 'none' })
        return
      }
      this.setData({ step: 'result', loading: false })
      this.loadResult()
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    }
  },

  // 加载结果
  async loadResult() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api.quiz.result(QUIZ_ID)
      this.setData({ loading: false })
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        return
      }
      this.applyResult(res.data || {})
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '网络错误，请检查后端服务', icon: 'none' })
    }
  },

  // 把接口返回的结果预处理成页面展示字段
  applyResult(data) {
    const mine = data.mine
    const partner = data.partner
    const bothDone = !!data.bothDone

    const patch = {
      resultData: data,
      bothDone
    }

    // 开始页「上次默契度」入口：我已答过才展示
    patch.hasLastResult = !!mine
    patch.lastMatchRate = bothDone ? (data.matchRate || 0) : 0

    if (bothDone && mine && partner && mine.answers && partner.answers) {
      patch.matchRate = data.matchRate || 0
      const level = getLevel(patch.matchRate)
      patch.levelText = level.text
      patch.levelEmoji = level.emoji

      // 逐题对比：在 js 里预计算好再渲染
      patch.compareList = this.data.questions.map((q, i) => {
        const myIdx = mine.answers[i]
        const taIdx = partner.answers[i]
        return {
          no: i + 1,
          question: q.question,
          myAnswer: q.options[myIdx] ? q.options[myIdx].text : '',
          partnerAnswer: q.options[taIdx] ? q.options[taIdx].text : '',
          match: myIdx === taIdx
        }
      })
    }

    this.setData(patch)
  }
})
