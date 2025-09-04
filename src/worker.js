/**
 * Cloudflare Worker 主文件
 * 好友清理系统
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// 导入处理器
import { indexHandler } from './handlers/index.js';
import { adminHandler } from './handlers/admin.js';
import { loginHandler, loginAPIHandler } from './handlers/login.js';
import {
  queryUserAPI,
  actionUserAPI,
  bulkImportUsersAPI,
  getUserListAPI,
  getStatisticsAPI,
  exportUsersAPI,
  getActionLogsAPI,
  healthCheckAPI,
  cleanupDataAPI,
  cleanupAllLogsAPI,
  bulkDeleteUsersAPI,
  saveSettingsAPI,
  getSettingsAPI
} from './handlers/api.js';

// 导入中间件
import { basicAuthMiddleware, sessionAuthMiddleware, loginAttemptLimitMiddleware } from './middleware/auth.js';
import { kvRateLimitMiddleware, databaseRateLimitMiddleware } from './middleware/rateLimit.js';
import {
  corsMiddleware,
  securityHeadersMiddleware,
  sqlInjectionProtectionMiddleware,
  xssProtectionMiddleware,
  requestSizeLimitMiddleware,
  userAgentValidationMiddleware,
  maintenanceModeMiddleware
} from './middleware/security.js';

// 导入工具函数
import { createErrorResponse, createSuccessResponse } from './utils/helpers.js';

// 创建 Hono 应用实例
const app = new Hono();

// 全局中间件
app.use('*', async (c, next) => {
  // 设置环境变量到上下文
  c.env = c.env || {};
  await next();
});

// CORS 中间件
app.use('*', corsMiddleware({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Token'],
  credentials: false
}));

// 安全头中间件
app.use('*', securityHeadersMiddleware({
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self';"
}));

// 维护模式检查
app.use('*', maintenanceModeMiddleware());

// 请求大小限制
app.use('*', requestSizeLimitMiddleware({
  maxSize: 10 * 1024 * 1024, // 10MB
  skipPaths: ['/admin/export']
}));

// User-Agent 验证（对 API 路径更严格）
app.use('/api/*', userAgentValidationMiddleware({
  required: true,
  blockSuspicious: true
}));

// SQL 注入防护
app.use('/api/*', sqlInjectionProtectionMiddleware({
  checkBody: true,
  checkQuery: true,
  strictMode: false
}));

// XSS 防护
app.use('/api/*', xssProtectionMiddleware({
  sanitizeInput: true,
  sanitizeOutput: false
}));

// 前台 API 限速（更严格）
app.use('/api/query', async (c, next) => {
  await kvRateLimitMiddleware({
    windowSeconds: 60,
    maxRequests: 5,
    keyPrefix: 'query_rate_limit'
  })(c, next);
});

app.use('/api/action', async (c, next) => {
  await kvRateLimitMiddleware({
    windowSeconds: 300, // 5分钟
    maxRequests: 3,     // 最多3次操作
    keyPrefix: 'action_rate_limit'
  })(c, next);
});

// 登录页面路由
app.get('/login', loginHandler);
app.post('/api/login', loginAttemptLimitMiddleware(), loginAPIHandler);

// 应用统一的会话认证中间件
app.use('/admin/*', sessionAuthMiddleware());
app.use('/api/admin/*', sessionAuthMiddleware());

// 管理员 API 限速（相对宽松）
app.use('/api/admin/*', async (c, next) => {
  await kvRateLimitMiddleware({
    windowSeconds: 60,
    maxRequests: 30,
    keyPrefix: 'admin_rate_limit'
  })(c, next);
});

// 路由定义

// 首页
app.get('/', indexHandler);

// 管理员后台
app.get('/admin', adminHandler);
app.get('/admin/', adminHandler);

// 前台 API
app.post('/api/query', queryUserAPI);
app.post('/api/action', actionUserAPI);

// 管理员 API
app.post('/api/admin/import', bulkImportUsersAPI);
app.get('/api/admin/users', getUserListAPI);
app.get('/api/admin/stats', getStatisticsAPI);
app.get('/api/admin/export', exportUsersAPI);
app.get('/api/admin/logs', getActionLogsAPI);
app.post('/api/admin/cleanup', cleanupDataAPI);
app.post('/api/admin/cleanup-all-logs', cleanupAllLogsAPI);
app.post('/api/admin/bulk-delete', bulkDeleteUsersAPI);
app.post('/api/admin/settings', saveSettingsAPI);
app.get('/api/admin/settings', getSettingsAPI);

// 系统 API
app.get('/api/health', healthCheckAPI);

// 静态资源处理
app.get('/favicon.ico', (c) => {
  return new Response(null, { status: 404 });
});

// 提供清理工具JS文件
app.get('/cleanup-utils.js', async (c) => {
  try {
    const cleanupUtilsContent = `// 清理所有日志功能
async function cleanupAllLogs() {
    if (!confirm('确定要清理所有日志数据吗？此操作不可撤销，将删除系统中的全部日志记录！')) {
        return;
    }
    
    try {
        // 添加时间戳参数避免缓存
        const response = await fetch(\`/api/admin/cleanup-all-logs?t=\${Date.now()}\`, {
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 显示详细的清理结果
            const deletedLogs = result.data?.deletedLogs || 0;
            alert(\`日志清理完成\\n已删除 \${deletedLogs} 条日志数据\`);
            
            // 强制刷新日志列表
            refreshLogs();
            
            // 强制刷新仪表盘最近活动列表
            if (document.getElementById('dashboardPage') && !document.getElementById('dashboardPage').classList.contains('d-none')) {
                adminPanel.loadRecentActivity();
            }
            
            // 如果当前在用户管理页面，也刷新用户列表
            if (document.getElementById('usersPage') && !document.getElementById('usersPage').classList.contains('d-none')) {
                refreshUsers();
            }
        } else {
            alert('清理失败: ' + result.error?.message);
        }
    } catch (error) {
        console.error('Cleanup all logs error:', error);
        alert('清理失败');
    }
}`;
    
    return new Response(cleanupUtilsContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error serving cleanup-utils.js:', error);
    return new Response('Error loading cleanup utilities', { status: 500 });
  }
});

app.get('/robots.txt', (c) => {
  const robotsTxt = `User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /

Sitemap: ${new URL(c.req.url).origin}/sitemap.xml`;
  
  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain'
    }
  });
});

// 404 处理
app.notFound((c) => {
  const accept = c.req.header('Accept') || '';
  
  if (accept.includes('application/json')) {
    return createErrorResponse('API endpoint not found', 404, 'NOT_FOUND');
  }
  
  // 返回简单的 404 页面
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面未找到 - 好友清理系统</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            color: white;
            text-align: center;
        }
        .container {
            max-width: 500px;
            padding: 2rem;
        }
        .error-code {
            font-size: 6rem;
            font-weight: 700;
            margin-bottom: 1rem;
            opacity: 0.8;
        }
        .error-message {
            font-size: 1.5rem;
            margin-bottom: 2rem;
        }
        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">404</div>
        <div class="error-message">页面未找到</div>
        <p>抱歉，您访问的页面不存在。</p>
        <a href="/" class="btn">返回首页</a>
    </div>
</body>
</html>
  `;
  
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
});

// 错误处理
app.onError((err, c) => {
  console.error('Application error:', err);
  
  const accept = c.req.header('Accept') || '';
  
  if (accept.includes('application/json')) {
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
  
  // 返回简单的错误页面
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>服务器错误 - 好友清理系统</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            color: white;
            text-align: center;
        }
        .container {
            max-width: 500px;
            padding: 2rem;
        }
        .error-code {
            font-size: 6rem;
            font-weight: 700;
            margin-bottom: 1rem;
            opacity: 0.8;
        }
        .error-message {
            font-size: 1.5rem;
            margin-bottom: 2rem;
        }
        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">500</div>
        <div class="error-message">服务器错误</div>
        <p>抱歉，服务器遇到了一些问题。请稍后再试。</p>
        <a href="/" class="btn">返回首页</a>
    </div>
</body>
</html>
  `;
  
  return new Response(html, {
    status: 500,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
});

// 导出默认处理器
export default {
  async fetch(request, env, ctx) {
    try {
      // 设置环境变量
      const context = {
        req: { raw: request },
        env,
        executionCtx: ctx
      };
      
      return await app.fetch(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'WORKER_ERROR',
          message: 'Worker execution failed',
          timestamp: new Date().toISOString()
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  },

  // 定时任务处理器
  async scheduled(controller, env, ctx) {
    try {
      console.log('Running scheduled tasks...');
      
      // 清理过期数据
      const { UserOperations } = await import('./database/operations.js');
      const userOps = new UserOperations(env.DB);
      
      const cleanupResult = await userOps.cleanupExpiredData(30);
      console.log('Cleanup result:', cleanupResult);
      
      // 清理过期会话
      const { cleanupExpiredSessions } = await import('./middleware/auth.js');
      const sessionCleanup = await cleanupExpiredSessions(env);
      console.log('Session cleanup result:', sessionCleanup);
      
      console.log('Scheduled tasks completed');
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};

