# 好友清理系统

一个基于 Cloudflare Workers 的安全、高效的好友管理系统，支持 QQ、微信、手机号等多种账号类型，具备完整的前后台功能、移动端适配、安全防护和数据可视化。

## 功能特性

### 🔐 安全防护
- **参数化查询**：防止 SQL 注入攻击
- **IP 限速**：防止暴力破解和 DDoS 攻击
- **数据加密**：UID 使用 SHA-256 哈希存储
- **错误信息模糊化**：不泄露敏感信息
- **多层安全中间件**：XSS 防护、CSRF 防护等

### 📱 用户体验
- **响应式设计**：完美适配桌面和移动设备
- **直观界面**：现代化 UI 设计，操作简单
- **实时反馈**：操作按钮颜色状态反馈
- **统一入口**：无需为每个用户生成专属链接

### 📊 管理后台
- **用户管理**：查看、搜索、筛选用户
- **批量导入**：支持批量导入好友 UID
- **数据可视化**：实时统计图表和仪表盘
- **操作日志**：详细的操作记录和审计
- **数据导出**：支持 CSV/JSON 格式导出

### ⚡ 高性能
- **边缘计算**：基于 Cloudflare Workers 全球分布式部署
- **数据库优化**：使用 D1 数据库，支持高并发
- **缓存策略**：KV 存储提供高速缓存
- **自动扩缩容**：根据流量自动调整资源

## 技术架构

### 后端技术栈
- **Cloudflare Workers**：边缘计算平台
- **D1 数据库**：SQLite 兼容的分布式数据库
- **KV 存储**：高性能键值存储
- **Hono.js**：轻量级 Web 框架

### 前端技术栈
- **HTML5 + CSS3**：现代化响应式界面
- **JavaScript (ES6+)**：客户端交互逻辑
- **Bootstrap 5**：响应式 UI 框架
- **Chart.js**：数据可视化图表

### 安全技术
- **参数化查询**：防止 SQL 注入
- **SHA-256 哈希**：敏感数据加密
- **Basic Auth**：管理员认证
- **IP 限速**：防止滥用

## 快速开始

### 环境要求
- Node.js 16+
- Cloudflare 账号
- Wrangler CLI

### 1. 克隆项目
\`\`\`bash
git clone <repository-url>
cd friend-cleanup-system
\`\`\`

### 2. 安装依赖
\`\`\`bash
npm install
\`\`\`

### 3. 配置环境
复制并编辑配置文件：
\`\`\`bash
cp wrangler.toml.example wrangler.toml
\`\`\`

编辑 \`wrangler.toml\`，配置以下信息：
- 数据库 ID
- KV 命名空间 ID
- 其他环境变量

### 4. 创建数据库
\`\`\`bash
# 创建 D1 数据库
wrangler d1 create friend-cleanup-db

# 运行数据库迁移
wrangler d1 migrations apply friend-cleanup-db
\`\`\`

### 5. 创建 KV 命名空间
\`\`\`bash
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview
\`\`\`

### 6. 设置密钥
\`\`\`bash
# 设置管理员账号密码
wrangler secret put ADMIN_USERNAME
wrangler secret put ADMIN_PASSWORD

# 设置加密密钥
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
\`\`\`

### 7. 本地开发
\`\`\`bash
npm run dev
\`\`\`

### 8. 部署到生产环境
\`\`\`bash
npm run deploy
\`\`\`

## 配置说明

### 环境变量
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| \`ADMIN_USERNAME\` | 管理员用户名 | admin |
| \`ADMIN_PASSWORD\` | 管理员密码 | - |
| \`RATE_LIMIT_WINDOW\` | 限速时间窗口（秒） | 60 |
| \`RATE_LIMIT_MAX_REQUESTS\` | 最大请求次数 | 5 |
| \`SESSION_TIMEOUT\` | 会话超时时间（秒） | 3600 |

### 数据库配置
系统使用 Cloudflare D1 数据库，主要表结构：
- \`users\`：用户信息表
- \`action_logs\`：操作日志表
- \`rate_limits\`：限速记录表
- \`admin_sessions\`：管理员会话表
- \`system_config\`：系统配置表

### 安全配置
- **IP 限速**：默认每分钟最多 5 次查询请求
- **操作限速**：每 5 分钟最多 3 次操作
- **会话超时**：管理员会话 1 小时后自动过期
- **数据过期**：用户数据 7 天未操作自动过期

## API 文档

### 前台 API

#### 查询用户状态
\`\`\`
POST /api/query
Content-Type: application/json

{
  "uid": "用户ID"
}
\`\`\`

#### 执行操作
\`\`\`
POST /api/action
Content-Type: application/json

{
  "uid": "用户ID",
  "action": "keep|delete"
}
\`\`\`

### 管理员 API

#### 批量导入用户
\`\`\`
POST /api/admin/import
Authorization: Basic <credentials>
Content-Type: application/json

{
  "uids": ["uid1", "uid2", ...]
}
\`\`\`

#### 获取用户列表
\`\`\`
GET /api/admin/users?page=1&limit=50&status=all&search=keyword
Authorization: Basic <credentials>
\`\`\`

#### 获取统计数据
\`\`\`
GET /api/admin/stats
Authorization: Basic <credentials>
\`\`\`

#### 导出数据
\`\`\`
GET /api/admin/export?status=all&format=csv
Authorization: Basic <credentials>
\`\`\`

## 部署指南

### Cloudflare Workers 部署

1. **准备 Cloudflare 账号**
   - 注册 Cloudflare 账号
   - 获取 API Token

2. **配置 Wrangler**
   \`\`\`bash
   wrangler login
   \`\`\`

3. **创建必要资源**
   \`\`\`bash
   # 创建 D1 数据库
   wrangler d1 create friend-cleanup-db
   
   # 创建 KV 命名空间
   wrangler kv:namespace create "CACHE"
   \`\`\`

4. **更新配置文件**
   将创建的资源 ID 更新到 \`wrangler.toml\`

5. **运行迁移**
   \`\`\`bash
   wrangler d1 migrations apply friend-cleanup-db
   \`\`\`

6. **设置密钥**
   \`\`\`bash
   wrangler secret put ADMIN_USERNAME
   wrangler secret put ADMIN_PASSWORD
   \`\`\`

7. **部署应用**
   \`\`\`bash
   wrangler deploy
   \`\`\`

### 自定义域名（可选）

1. 在 Cloudflare Dashboard 中添加自定义域名
2. 配置 DNS 记录指向 Worker
3. 启用 SSL/TLS 加密

## 使用说明

### 用户操作流程

1. **访问系统**
   - 打开系统首页
   - 输入 QQ 号、微信号

2. **查询状态**
   - 点击"查询状态"按钮
   - 系统验证账号并显示操作界面

3. **选择操作**
   - 点击"保留"或"删除"按钮
   - 系统记录操作并显示结果

4. **操作完成**
   - 显示操作结果
   - 可以重新查询其他账号

### 管理员操作

1. **登录后台**
   - 访问 \`/admin\` 路径
   - 输入管理员账号密码

2. **查看仪表盘**
   - 查看用户统计数据
   - 查看操作分布图表
   - 查看最近活动记录

3. **用户管理**
   - 查看用户列表
   - 搜索和筛选用户
   - 导出用户数据

4. **批量导入**
   - 批量导入好友 UID
   - 查看导入结果统计

5. **系统设置**
   - 配置限速参数
   - 清理过期数据
   - 启用维护模式

## 安全最佳实践

### 部署安全
- 使用强密码作为管理员账号
- 定期更换密钥和密码
- 启用 Cloudflare 的安全功能
- 监控异常访问和操作

### 数据安全
- UID 使用哈希存储，不保存明文
- 定期清理过期数据和日志
- 备份重要数据
- 限制数据访问权限

### 访问控制
- 配置适当的 IP 限速
- 监控可疑的访问模式
- 启用操作日志记录
- 定期审查访问日志

## 故障排除

### 常见问题

**Q: 部署后无法访问**
A: 检查域名配置和 DNS 设置，确保 Worker 已正确部署

**Q: 数据库连接失败**
A: 检查 D1 数据库配置和迁移是否完成

**Q: 管理员无法登录**
A: 检查 ADMIN_USERNAME 和 ADMIN_PASSWORD 是否正确设置

**Q: 限速过于严格**
A: 调整 wrangler.toml 中的限速参数

### 调试方法

1. **查看日志**
   \`\`\`bash
   wrangler tail
   \`\`\`

2. **本地测试**
   \`\`\`bash
   wrangler dev
   \`\`\`

3. **数据库查询**
   \`\`\`bash
   wrangler d1 execute friend-cleanup-db --command "SELECT * FROM users LIMIT 10"
   \`\`\`

## 性能优化

### 数据库优化
- 合理使用索引
- 定期清理过期数据
- 优化查询语句
- 监控数据库性能

### 缓存策略
- 使用 KV 存储缓存热点数据
- 设置合适的缓存过期时间
- 避免缓存穿透和雪崩

### 前端优化
- 压缩静态资源
- 使用 CDN 加速
- 优化图片和字体
- 减少 HTTP 请求

## 监控和维护

### 监控指标
- 请求量和响应时间
- 错误率和异常日志
- 数据库性能指标
- 用户操作统计

### 定期维护
- 清理过期数据
- 更新依赖包
- 检查安全漏洞
- 备份重要数据

### 扩展功能
- 添加更多账号类型支持
- 集成第三方验证码服务
- 实现更复杂的权限管理
- 添加邮件通知功能

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目。

---

**注意**：请确保在生产环境中使用强密码和适当的安全配置。

