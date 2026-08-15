-- 甜蜜日记数据库建表脚本
-- 使用方法: mysql -u root -p < database/init.sql

CREATE DATABASE IF NOT EXISTS love_diary DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE love_diary;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  open_id VARCHAR(64) UNIQUE COMMENT '微信openID',
  nick_name VARCHAR(32) NOT NULL COMMENT '昵称',
  avatar VARCHAR(500) DEFAULT '' COMMENT '头像URL',
  pairing_code VARCHAR(8) DEFAULT NULL COMMENT '配对码',
  role ENUM('inviter', 'partner') DEFAULT 'inviter' COMMENT '角色: 邀请方/被邀请方',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pairing_code (pairing_code),
  INDEX idx_open_id (open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 情侣关系表
CREATE TABLE IF NOT EXISTS couples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL COMMENT '邀请方用户ID',
  user2_id INT DEFAULT NULL COMMENT '被邀请方用户ID',
  love_date DATE DEFAULT NULL COMMENT '恋爱起始日',
  partnered TINYINT(1) DEFAULT 0 COMMENT '是否已配对: 0未配对 1已配对',
  paired_at TIMESTAMP NULL COMMENT '配对时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user1 (user1_id),
  INDEX idx_user2 (user2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='情侣关系表';

-- 菜品表
CREATE TABLE IF NOT EXISTS menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  name VARCHAR(64) NOT NULL COMMENT '菜名',
  category VARCHAR(32) DEFAULT '家常菜' COMMENT '分类',
  tags VARCHAR(200) DEFAULT '' COMMENT '标签(JSON数组)',
  difficulty TINYINT DEFAULT 1 COMMENT '难度1-3',
  image VARCHAR(500) DEFAULT '' COMMENT '图片URL',
  creator VARCHAR(32) DEFAULT '' COMMENT '添加人',
  favorite TINYINT(1) DEFAULT 0 COMMENT '是否收藏',
  is_today TINYINT(1) DEFAULT 0 COMMENT '是否今日菜单',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  INDEX idx_couple (couple_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品表';

-- 纪念日表
CREATE TABLE IF NOT EXISTS anniversaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  title VARCHAR(64) NOT NULL COMMENT '标题',
  date DATE NOT NULL COMMENT '日期',
  type ENUM('love', 'birthday', 'memory', 'other') DEFAULT 'other' COMMENT '类型',
  repeat_type ENUM('yearly', 'once') DEFAULT 'yearly' COMMENT '重复方式',
  emoji VARCHAR(16) DEFAULT '💝' COMMENT 'emoji图标',
  important TINYINT(1) DEFAULT 0 COMMENT '是否重要',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  INDEX idx_couple (couple_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='纪念日表';

-- 经期配置表
CREATE TABLE IF NOT EXISTS period_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  cycle_length INT DEFAULT 28 COMMENT '周期天数',
  period_length INT DEFAULT 5 COMMENT '经期天数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  UNIQUE KEY uk_couple (couple_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='经期配置表';

-- 经期记录表
CREATE TABLE IF NOT EXISTS period_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  start_date DATE NOT NULL COMMENT '经期开始日期',
  note TEXT COMMENT '备注',
  symptoms VARCHAR(200) DEFAULT '' COMMENT '症状(JSON数组)',
  flow_level TINYINT DEFAULT 2 COMMENT '经量1-4',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  INDEX idx_couple (couple_id),
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='经期记录表';

-- 时光记录表
CREATE TABLE IF NOT EXISTS moments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  title VARCHAR(128) NOT NULL COMMENT '标题',
  content TEXT COMMENT '内容',
  date DATE NOT NULL COMMENT '日期',
  images VARCHAR(2000) DEFAULT '' COMMENT '图片URL列表(JSON数组)',
  mood VARCHAR(16) DEFAULT '💕' COMMENT '心情emoji',
  location VARCHAR(128) DEFAULT '' COMMENT '地点',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  INDEX idx_couple (couple_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='时光记录表';

-- 恋爱打卡表
CREATE TABLE IF NOT EXISTS checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  check_date DATE NOT NULL COMMENT '打卡日期',
  user1_done TINYINT(1) DEFAULT 0 COMMENT '邀请方是否打卡',
  user2_done TINYINT(1) DEFAULT 0 COMMENT '被邀请方是否打卡',
  note VARCHAR(200) DEFAULT '' COMMENT '当天寄语',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  UNIQUE KEY uk_couple_date (couple_id, check_date),
  INDEX idx_couple (couple_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='恋爱打卡表';

-- 默契测试答题记录表
CREATE TABLE IF NOT EXISTS quiz_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  couple_id INT NOT NULL COMMENT '情侣关系ID',
  user_id INT NOT NULL COMMENT '答题用户ID',
  quiz_id VARCHAR(32) NOT NULL COMMENT '题目套ID',
  answers VARCHAR(500) DEFAULT '' COMMENT '答案(JSON数组)',
  score INT DEFAULT 0 COMMENT '得分0-100',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  UNIQUE KEY uk_couple_user_quiz (couple_id, user_id, quiz_id),
  INDEX idx_couple (couple_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='默契测试答题记录表';

-- 插入示例数据（可选）
-- INSERT INTO users (nick_name, pairing_code, role) VALUES ('他', 'LD2024', 'inviter');
