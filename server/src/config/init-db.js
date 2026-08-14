// 数据库初始化脚本 - 自动建库建表
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function initDB() {
  const host = process.env.DB_HOST || 'localhost'
  const port = process.env.DB_PORT || 3306
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || '123456'
  const dbName = process.env.DB_NAME || 'love_diary'

  console.log('正在连接 MySQL...')

  // 不指定数据库连接，用于创建数据库
  const conn = await mysql.createConnection({
    host, port, user, password, charset: 'utf8mb4'
  })

  // 读取并执行 SQL 脚本
  const sqlFile = path.join(__dirname, '..', '..', 'database', 'init.sql')
  const sql = fs.readFileSync(sqlFile, 'utf-8')

  // 分割并逐条执行
  const statements = sql.split(';').filter(s => s.trim())
  for (const stmt of statements) {
    try {
      await conn.query(stmt)
    } catch (e) {
      if (e.code !== 'ER_DB_EXISTS') {
        console.error('执行出错:', e.message)
      }
    }
  }

  console.log('数据库 ' + dbName + ' 初始化完成！')
  console.log('包含表: users, couples, menus, anniversaries, period_config, period_records, moments')
  await conn.end()
}

initDB().catch(e => {
  console.error('初始化失败:', e.message)
  console.error('请确认 MySQL 已启动且账号密码正确')
  process.exit(1)
})
