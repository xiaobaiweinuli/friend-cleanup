# 快速开始指南

这是好友清理系统的快速部署指南，帮助您在 5 分钟内完成系统部署。

## 🚀 一键部署

### 前置要求
- Node.js 16+ 
- Cloudflare 账号
- 5 分钟时间

### 步骤 1: 克隆项目
```bash
git clone <repository-url>
cd friend-cleanup-system
```

### 步骤 2: 运行初始化脚本
```bash
./scripts/init.sh
```

初始化脚本将自动完成：
- ✅ 安装依赖
- ✅ 登录 Cloudflare
- ✅ 创建数据库和 KV 存储
- ✅ 配置环境变量
- ✅ 设置管理员账号
- ✅ 运行数据库迁移

### 步骤 3: 本地测试（可选）
```bash
npm run dev
```
访问 http://localhost:8787 测试功能

### 步骤 4: 部署到生产环境
```bash
./scripts/deploy.sh
```

### 步骤 5: 验证部署
```bash
npm run test
```

## 🎯 核心功能

### 前台功能
- **统一入口**: 用户输入 QQ/微信号查询状态
- **操作界面**: 选择保留或删除好友
- **移动适配**: 完美支持手机和平板
- **安全防护**: IP 限速、防暴力破解

### 后台功能
- **用户管理**: 查看、搜索、筛选用户
- **批量导入**: 支持批量导入好友列表
- **数据统计**: 实时图表和仪表盘
- **操作日志**: 详细的审计记录

### 安全特性
- **参数化查询**: 防止 SQL 注入
- **数据加密**: UID 哈希存储
- **访问控制**: Basic Auth 认证
- **限速保护**: 防止滥用攻击

## 📱 使用方法

### 用户操作流程
1. 访问系统首页
2. 输入 QQ 号、微信号
3. 点击"查询状态"
4. 选择"保留"或"删除"
5. 查看操作结果

### 管理员操作
1. 访问 `/admin` 路径
2. 输入管理员账号密码
3. 查看仪表盘统计
4. 管理用户和导入数据

## 🔧 配置说明

### 环境变量
| 变量 | 说明 | 默认值 |
|------|------|--------|
| ADMIN_USERNAME | 管理员用户名 | admin |
| ADMIN_PASSWORD | 管理员密码 | - |
| RATE_LIMIT_WINDOW | 限速时间窗口 | 60秒 |
| RATE_LIMIT_MAX_REQUESTS | 最大请求数 | 5次 |

### 自定义配置
编辑 `wrangler.toml` 文件修改：
- 限速参数
- 数据库配置
- KV 存储设置

## 🛠️ 常用命令

```bash
# 本地开发
npm run dev

# 部署应用
npm run deploy

# 查看日志
npm run tail

# 运行测试
npm run test

# 数据库操作
npm run db:shell "SELECT * FROM users LIMIT 10"

# 查看密钥
npm run secrets:list
```

## 🔍 故障排除

### 常见问题

**Q: 部署失败，提示数据库 ID 错误**
```bash
# 重新创建数据库
wrangler d1 create friend-cleanup-db
# 更新 wrangler.toml 中的 database_id
```

**Q: 管理员无法登录**
```bash
# 重新设置管理员密码
wrangler secret put ADMIN_PASSWORD
```

**Q: 限速过于严格**
```bash
# 编辑 wrangler.toml，调整限速参数
RATE_LIMIT_MAX_REQUESTS = "10"
```

### 调试方法

1. **查看实时日志**
   ```bash
   wrangler tail
   ```

2. **本地调试**
   ```bash
   npm run dev
   ```

3. **测试 API**
   ```bash
   curl -X POST https://your-worker.workers.dev/api/health
   ```

## 📊 监控指标

### 关键指标
- 请求量和响应时间
- 用户操作统计
- 错误率和异常
- 数据库性能

### 监控方法
- Cloudflare Analytics
- Worker 日志
- 管理后台统计

## 🔒 安全建议

1. **使用强密码**: 管理员账号使用复杂密码
2. **定期更新**: 定期更换密钥和密码
3. **监控访问**: 关注异常访问模式
4. **数据备份**: 定期备份重要数据
5. **限制访问**: 配置适当的 IP 限速

## 📈 扩展功能

### 可选增强
- 集成验证码服务
- 添加邮件通知
- 支持更多账号类型
- 实现更复杂的权限管理

### 自定义开发
- 修改 UI 样式和布局
- 添加新的 API 接口
- 集成第三方服务
- 扩展数据分析功能

## 📞 技术支持

如遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 查看 Cloudflare Workers 文档
4. 联系技术支持

---

**🎉 恭喜！您已成功部署好友清理系统！**

现在可以开始使用系统管理好友关系了。记得定期查看管理后台的统计数据和操作日志。

