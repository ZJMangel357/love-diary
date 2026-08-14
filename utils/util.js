// utils/util.js - 通用工具函数

/**
 * 格式化日期
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date.replace(/-/g, '/')) : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 获取相对时间描述
 */
const getRelativeTime = (dateStr) => {
  const now = new Date()
  const target = new Date(dateStr.replace(/-/g, '/'))
  const diff = target - now
  const absDiff = Math.abs(diff)
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return diff >= 0 ? '就是今天' : '就在今天'
  } else if (diff > 0) {
    if (days === 1) return '明天'
    if (days < 7) return `${days}天后`
    if (days < 30) return `${Math.floor(days / 7)}周后`
    if (days < 365) return `${Math.floor(days / 30)}个月后`
    return `${(days / 365).toFixed(1)}年后`
  } else {
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`
    return `${(days / 365).toFixed(1)}年前`
  }
}

/**
 * 计算两个日期之间的天数
 */
const getDaysBetween = (date1, date2) => {
  const d1 = new Date(date1.replace(/-/g, '/'))
  const d2 = new Date(date2.replace(/-/g, '/'))
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

/**
 * 获取今年的周年日期
 */
const getAnniversaryThisYear = (dateStr) => {
  const d = new Date(dateStr.replace(/-/g, '/'))
  const now = new Date()
  const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate())
  if (thisYear < now) {
    thisYear.setFullYear(now.getFullYear() + 1)
  }
  return formatDate(thisYear, 'YYYY-MM-DD')
}

/**
 * 计算下一个周年日距今天数
 */
const getDaysToAnniversary = (dateStr, repeat = 'yearly') => {
  if (repeat === 'once') {
    return getDaysBetween(formatDate(new Date(), 'YYYY-MM-DD'), dateStr)
  }
  const nextDate = getAnniversaryThisYear(dateStr)
  return getDaysBetween(formatDate(new Date(), 'YYYY-MM-DD'), nextDate)
}

/**
 * 经期预测工具
 */
const periodUtils = {
  // 计算下次经期开始日期
  getNextPeriodStart(lastStartDate, cycleLength = 28) {
    const last = new Date(lastStartDate.replace(/-/g, '/'))
    last.setDate(last.getDate() + cycleLength)
    return formatDate(last, 'YYYY-MM-DD')
  },

  // 计算排卵日（下次经期前14天）
  getOvulationDate(nextPeriodStart) {
    const next = new Date(nextPeriodStart.replace(/-/g, '/'))
    next.setDate(next.getDate() - 14)
    return formatDate(next, 'YYYY-MM-DD')
  },

  // 计算排卵期（排卵日前5天到后4天）
  getOvulationPeriod(lastStartDate, cycleLength = 28) {
    const nextStart = this.getNextPeriodStart(lastStartDate, cycleLength)
    const ovulation = new Date(this.getOvulationDate(nextStart).replace(/-/g, '/'))
    const start = new Date(ovulation)
    start.setDate(start.getDate() - 5)
    const end = new Date(ovulation)
    end.setDate(end.getDate() + 4)
    return {
      start: formatDate(start, 'YYYY-MM-DD'),
      end: formatDate(end, 'YYYY-MM-DD'),
      ovulationDate: formatDate(ovulation, 'YYYY-MM-DD')
    }
  },

  // 计算当前所处阶段
  getCurrentPhase(lastStartDate, cycleLength = 28, periodLength = 5) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastStart = new Date(lastStartDate.replace(/-/g, '/'))
    lastStart.setHours(0, 0, 0, 0)

    const daysSinceStart = Math.floor((today - lastStart) / (1000 * 60 * 60 * 24))
    const cycleDay = daysSinceStart % cycleLength
    const nextStart = this.getNextPeriodStart(lastStartDate, cycleLength)

    const ovulationInfo = this.getOvulationPeriod(lastStartDate, cycleLength)
    const ovulationStart = new Date(ovulationInfo.start.replace(/-/g, '/'))
    const ovulationEnd = new Date(ovulationInfo.end.replace(/-/g, '/'))
    const ovulationDate = new Date(ovulationInfo.ovulationDate.replace(/-/g, '/'))

    if (cycleDay >= 0 && cycleDay < periodLength) {
      const day = cycleDay + 1
      return {
        phase: 'period',
        phaseName: `经期第${day}天`,
        color: '#FF6B9D',
        bgColor: 'rgba(255, 107, 157, 0.15)',
        description: '记得好好休息，注意保暖哦~',
        progress: Math.min((cycleDay + 1) / periodLength * 100, 100),
        nextEvent: `经期预计还有${periodLength - cycleDay - 1}天结束`
      }
    }

    if (today >= ovulationStart && today <= ovulationEnd) {
      if (formatDate(today, 'YYYY-MM-DD') === ovulationInfo.ovulationDate) {
        return {
          phase: 'ovulation',
          phaseName: '排卵日',
          color: '#9B7FED',
          bgColor: 'rgba(155, 127, 237, 0.15)',
          description: '今天是排卵日，受孕几率最高！',
          progress: 50,
          nextEvent: '今日受孕几率最高'
        }
      }
      return {
        phase: 'fertile',
        phaseName: '排卵期',
        color: '#C9B1FF',
        bgColor: 'rgba(201, 177, 255, 0.2)',
        description: '处于排卵期，注意身体变化~',
        progress: 30 + ((today - ovulationStart) / (ovulationEnd - ovulationStart) * 40),
        nextEvent: `距离排卵日还有${Math.ceil((ovulationDate - today) / (1000 * 60 * 60 * 24))}天`
      }
    }

    if (cycleDay < cycleLength - 14) {
      return {
        phase: 'follicular',
        phaseName: '卵泡期',
        color: '#A8E6CF',
        bgColor: 'rgba(168, 230, 207, 0.3)',
        description: '心情愉悦的好日子，适合约会~',
        progress: 20 + (cycleDay - periodLength) / (cycleLength - 14 - periodLength) * 30,
        nextEvent: `距离下次排卵期还有${Math.ceil((ovulationStart - today) / (1000 * 60 * 60 * 24))}天`
      }
    }

    return {
      phase: 'luteal',
      phaseName: '黄体期',
      color: '#FFD93D',
      bgColor: 'rgba(255, 217, 61, 0.3)',
      description: '快来例假啦，注意饮食和休息~',
      progress: 70 + (cycleDay - (cycleLength - 14)) / 14 * 30,
      nextEvent: `距离下次经期还有${getDaysBetween(formatDate(today, 'YYYY-MM-DD'), nextStart)}天`
    }
  }
}

/**
 * 生成唯一ID
 */
const generateId = () => {
  return Date.now() + Math.random().toString(36).substr(2, 9)
}

/**
 * 获取随机元素
 */
const getRandomItem = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 爱的甜言蜜语库
 */
const loveQuotes = [
  '遇见你，是我此生最美的意外 💕',
  '和你在一起，每一天都是情人节 🌹',
  '愿得一人心，白首不分离 🤍',
  '你是我藏在心底的温柔 🌸',
  '有你在，就是最幸福的时光 ✨',
  '爱你不是两三天，是岁岁年年 💗',
  '我的心跳，每一下都是你的名字 💓',
  '想和你一起，看遍世界的风景 🌅',
  '你的笑容，是我最珍贵的宝藏 😊',
  '一想到能和你共度余生，我就充满期待 🥰',
  '你是我平淡生活里的糖 🍬',
  '在我眼里，你就是全世界的中心 🌍',
  '愿意和你一起，把平凡的日子过成诗 📖',
  '想牵你的手，走过春夏秋冬 👫',
  '有你真好，真的真的很好 🫶'
]

const getRandomLoveQuote = () => getRandomItem(loveQuotes)

/**
 * 菜品分类
 */
const menuCategories = ['家常菜', '川菜', '粤菜', '湘菜', '素菜', '主食', '汤羹', '甜品', '早餐', '夜宵']

/**
 * 心情列表
 */
const moodList = [
  { emoji: '😍', label: '超级开心' },
  { emoji: '🥰', label: '甜蜜' },
  { emoji: '😊', label: '开心' },
  { emoji: '🤗', label: '温暖' },
  { emoji: '😄', label: '愉悦' },
  { emoji: '😢', label: '难过' },
  { emoji: '😤', label: '生气' },
  { emoji: '😴', label: '疲惫' }
]

/**
 * 难度星级
 */
const getDifficultyStars = (level) => {
  return '⭐'.repeat(level) + '☆'.repeat(Math.max(0, 3 - level))
}

module.exports = {
  formatDate,
  getRelativeTime,
  getDaysBetween,
  getAnniversaryThisYear,
  getDaysToAnniversary,
  periodUtils,
  generateId,
  getRandomItem,
  getRandomLoveQuote,
  menuCategories,
  moodList,
  getDifficultyStars
}
