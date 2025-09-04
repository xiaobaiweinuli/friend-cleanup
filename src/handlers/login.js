/**
 * 登录页面处理器
 */
import { createHTMLResponse } from '../utils/helpers.js';
import { AdminSessionOperations } from '../database/operations.js';
import { generateSessionToken } from '../utils/crypto.js';
import { getClientIP, getUserAgent } from '../utils/helpers.js';
import { basicAuthMiddleware } from '../middleware/auth.js';

/**
 * 登录页面处理器
 * @param {Object} c - Hono 上下文
 * @returns {Response} HTML 响应
 */
export async function loginHandler(c) {
  // 检查是否有错误信息
  const error = c.req.query('error') || '';
  const errorMessage = error === 'invalid' ? '用户名或密码错误' : 
                       error === 'limit' ? '登录尝试次数过多，请稍后再试' : '';
  
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - 好友清理系统</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8;
            --light-color: #f8f9fa;
            --dark-color: #343a40;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-attachment: fixed;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        
        .login-container {
            width: 100%;
            max-width: 420px;
        }
        
        .login-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            padding: 2.5rem;
            transition: all 0.3s ease;
        }
        
        .login-card:hover {
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .login-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--dark-color);
            margin-bottom: 0.5rem;
        }
        
        .login-subtitle {
            color: var(--secondary-color);
            font-size: 1rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-label {
            font-weight: 600;
            color: var(--dark-color);
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .form-control {
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 0.75rem 1rem;
            font-size: 1rem;
            transition: all 0.3s ease;
            background-color: rgba(255, 255, 255, 0.7);
        }
        
        .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            outline: none;
            background-color: white;
        }
        
        .input-icon {
            position: relative;
        }
        
        .input-icon i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--secondary-color);
        }
        
        .input-icon .form-control {
            padding-left: 40px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            border: none;
            border-radius: 12px;
            padding: 0.75rem;
            font-size: 1.1rem;
            font-weight: 600;
            width: 100%;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 123, 255, 0.3);
        }
        
        .btn-primary:active {
            transform: translateY(0);
        }
        
        .btn-primary::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }
        
        .btn-primary:hover::after {
            left: 100%;
        }
        
        .error-message {
            background-color: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 10px;
            color: var(--danger-color);
            padding: 0.75rem 1rem;
            margin-bottom: 1.5rem;
            text-align: center;
            font-size: 0.95rem;
        }
        
        .form-text {
            color: var(--secondary-color);
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
        }
        
        .login-footer {
            text-align: center;
            margin-top: 1.5rem;
            color: var(--secondary-color);
            font-size: 0.9rem;
        }
        
        /* 响应式设计 */
        @media (max-width: 576px) {
            .login-card {
                padding: 2rem;
                border-radius: 15px;
            }
            
            .login-title {
                font-size: 1.5rem;
            }
        }
        
        /* 加载动画 */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <h1 class="login-title">好友清理系统</h1>
                <p class="login-subtitle">请输入您的管理员账号和密码</p>
            </div>
            
            ${errorMessage ? `
            <div class="error-message">
                <i class="fas fa-exclamation-circle me-2"></i>${errorMessage}
            </div>
            ` : ''}
            
            <form id="loginForm" action="/api/login" method="POST">
                <div class="form-group">
                    <label for="username" class="form-label">用户名</label>
                    <div class="input-icon">
                        <i class="fas fa-user"></i>
                        <input type="text" class="form-control" id="username" name="username" placeholder="请输入用户名" required autofocus>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="password" class="form-label">密码</label>
                    <div class="input-icon">
                        <i class="fas fa-lock"></i>
                        <input type="password" class="form-control" id="password" name="password" placeholder="请输入密码" required>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary">
                    <span id="loginButtonText">
                        <i class="fas fa-sign-in-alt me-2"></i>登录
                    </span>
                </button>
            </form>
            
            <div class="login-footer">
                <a href="/" class="text-primary">返回首页</a>
            </div>
        </div>
    </div>
    
    <script>
        // 登录表单提交处理
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const buttonText = document.getElementById('loginButtonText');
            
            // 显示加载状态
            buttonText.innerHTML = '<span class="loading"></span> 登录中...';
            
            // 创建表单数据
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            // 提交登录请求
            fetch('/api/login', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    // 登录成功，重定向到管理后台
                    window.location.href = '/admin';
                } else {
                    // 登录失败，显示错误信息
                    window.location.href = '/login?error=invalid';
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                window.location.href = '/login?error=invalid';
            });
        });
    </script>
</body>
</html>
  `;
  
  return createHTMLResponse(html);
}

/**
 * 登录API处理器
 * @param {Object} c - Hono 上下文
 * @returns {Response} JSON 响应
 */
export async function loginAPIHandler(c) {
  try {
    // 解析表单数据
    const formData = await c.req.formData();
    
    const username = formData.get('username') || '';
    const password = formData.get('password') || '';
    
    // --- 调试代码开始 ---
    console.log("--- 登录验证调试信息 ---");
    console.log("用户输入的用户名为:", username);
    console.log("用户输入的密码为:", password);
    console.log("从环境变量读取的 ADMIN_USERNAME:", c.env.ADMIN_USERNAME);
    console.log("从环境变量读取的 ADMIN_PASSWORD:", c.env.ADMIN_PASSWORD);
    // --- 调试代码结束 ---
    
    // 验证凭据
    const adminUsername = c.env.ADMIN_USERNAME || 'admin';
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123';
    
    if (username !== adminUsername || password !== adminPassword) {
      // 记录失败尝试
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    // 创建安全的数据库会话
    const sessionOps = new AdminSessionOperations(c.env.DB);
    const sessionToken = generateSessionToken();
    const sessionTimeout = (c.env.SESSION_TIMEOUT || 3600); // 默认1小时
    const expiresAt = new Date(Date.now() + sessionTimeout * 1000).toISOString();
    
    await sessionOps.createSession({
      sessionToken,
      ipAddress: getClientIP(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      expiresAt
    });
    
    // 生成Cookie，根据环境决定是否使用Secure标志
    // 在开发环境中，Secure标志可能导致Cookie无法正常设置
    const isDevelopment = c.env.ENVIRONMENT === 'development' || !c.env.ENVIRONMENT;
    const secureFlag = isDevelopment ? '' : 'Secure;';
    
    // 调试日志
    console.log(`[Auth Debug] Creating session cookie - Token: ${sessionToken.substring(0, 8)}...`);
    console.log(`[Auth Debug] Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`[Auth Debug] Cookie Secure flag: ${secureFlag ? 'Enabled' : 'Disabled'}`);
    
    const cookie = `admin_auth=${sessionToken}; Path=/; HttpOnly; ${secureFlag} SameSite=Strict; Max-Age=${sessionTimeout}`;
    
    return new Response('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Set-Cookie': cookie
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}