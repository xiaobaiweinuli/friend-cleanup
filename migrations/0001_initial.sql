-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE NOT NULL,                    -- 原始 QQ/微信号
    uid_hash TEXT UNIQUE NOT NULL,               -- UID 哈希值（用于安全查询）
    status TEXT DEFAULT 'pending',               -- 状态：pending/keep/delete
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_action_at DATETIME,                     -- 最后操作时间
    ip_address TEXT,                             -- 操作 IP
    user_agent TEXT,                             -- 用户代理
    remark TEXT                                  -- 备注信息
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    uid_hash TEXT NOT NULL,                      -- 用户 UID 哈希
    action TEXT NOT NULL,                        -- 操作类型：query/keep/delete
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,                -- 操作是否成功
    error_message TEXT,                          -- 错误信息
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- IP 限速表
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_uid_hash ON users(uid_hash);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_remark ON users(remark);
CREATE INDEX IF NOT EXISTS idx_action_logs_uid_hash ON action_logs(uid_hash);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- 插入默认系统配置
INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES
('rate_limit_window', '60', '限速时间窗口（秒）'),
('rate_limit_max_requests', '5', '时间窗口内最大请求次数'),
('session_timeout', '3600', '管理员会话超时时间（秒）'),
('cleanup_days', '7', '未操作用户清理天数'),
('enable_captcha', 'false', '是否启用验证码'),
('maintenance_mode', 'false', '维护模式开关');

