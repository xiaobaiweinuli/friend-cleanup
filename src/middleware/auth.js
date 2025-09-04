/**
 * 认证中间件
 */

import { AdminSessionOperations } from '../database/operations.js';
import { generateSessionToken } from '../utils/crypto.js';
import { getClientIP, getUserAgent, createErrorResponse, createErrorPageResponse } from '../utils/helpers.js';

/**
 * Basic Auth 认证中间件
 * @returns {Function} 中间件函数
 */
export function basicAuthMiddleware() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      c.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
          'Content-Type': 'text/plain'
        }
      });
      return c.res;
    }
    
    try {
      const base64Credentials = authHeader.slice(6);
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(':');
      
      const adminUsername = c.env.ADMIN_USERNAME || 'admin';
      const adminPassword = c.env.ADMIN_PASSWORD || 'admin123';
      
      if (username !== adminUsername || password !== adminPassword) {
        c.res = new Response('Unauthorized', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Admin Area"',
            'Content-Type': 'text/plain'
          }
        });
        return c.res;
      }
      
      // 创建或更新管理员会话
      const sessionOps = new AdminSessionOperations(c.env.DB);
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + (c.env.SESSION_TIMEOUT || 3600) * 1000).toISOString();
      
      await sessionOps.createSession({
        sessionToken,
        ipAddress: getClientIP(c.req.raw),
        userAgent: getUserAgent(c.req.raw),
        expiresAt
      });
      
      // 将会话信息添加到上下文
      c.set('adminSession', {
        sessionToken,
        username,
        expiresAt
      });
      
      return await next();
    } catch (error) {
      console.error('Basic auth error:', error);
      c.res = new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
          'Content-Type': 'text/plain'
        }
      });
      return c.res;
    }
  };
}

/**
 * 会话认证中间件（统一处理页面和 API）
 * @returns {Function} 中间件函数
 */
export function sessionAuthMiddleware() {
  return async (c, next) => {
    // 调试日志：记录请求路径和尝试获取Cookie的过程
    console.log(`[Auth Debug] Request to: ${c.req.path}`);
    
    // 多种方式尝试获取sessionToken，适配不同Hono版本
    let sessionToken = null;
    
    // 1. 尝试从请求头获取
    sessionToken = c.req.header('X-Session-Token');
    console.log(`[Auth Debug] Token from header: ${sessionToken ? 'found' : 'not found'}`);
    
    // 2. 尝试从查询参数获取
    if (!sessionToken) {
      sessionToken = c.req.query('session_token');
      console.log(`[Auth Debug] Token from query: ${sessionToken ? 'found' : 'not found'}`);
    }
    
    // 3. 尝试从Cookie获取 - 多种方式适配不同Hono版本
    if (!sessionToken) {
      // 方式1：尝试Hono v4.x的c.req.cookies.get()
      if (c.req.cookies && typeof c.req.cookies.get === 'function') {
        sessionToken = c.req.cookies.get('admin_auth');
        console.log(`[Auth Debug] Token from cookies.get(): ${sessionToken ? 'found' : 'not found'}`);
      }
      
      // 方式2：尝试直接访问c.req.cookie (可能是旧版本API)
      if (!sessionToken && typeof c.req.cookie === 'function') {
        sessionToken = c.req.cookie('admin_auth');
        console.log(`[Auth Debug] Token from cookie(): ${sessionToken ? 'found' : 'not found'}`);
      }
      
      // 方式3：尝试从c.req.raw.headers获取Cookie字符串并手动解析
      if (!sessionToken && c.req.raw && c.req.raw.headers) {
        const cookieHeader = c.req.raw.headers.get('Cookie') || '';
        const match = cookieHeader.match(/admin_auth=([^;]+)/);
        sessionToken = match ? match[1] : null;
        console.log(`[Auth Debug] Token from manual parsing: ${sessionToken ? 'found' : 'not found'}`);
      }
    }
    
    let session = null;
    if (sessionToken) {
      try {
        const sessionOps = new AdminSessionOperations(c.env.DB);
        session = await sessionOps.validateSession(sessionToken);
        console.log(`[Auth Debug] Session validation result: ${session ? 'valid' : 'invalid'}`);
      } catch (error) {
        console.error('Session auth error:', error);
        // 数据库或验证逻辑出错，视为未认证
        session = null;
      }
    }
    
    if (!session) {
      // 根据请求类型决定响应方式
      const isApiRequest = c.req.path.startsWith('/api/admin/');
      
      if (isApiRequest) {
        // 对于 API 请求，返回 401 JSON 错误
        c.res = createErrorResponse('Invalid or expired session', 401, 'UNAUTHORIZED');
      } else {
        console.log(`[Auth Debug] Redirecting to login page for path: ${c.req.path}`);
        // 对于页面请求，重定向到登录页面
        const loginUrl = new URL('/login', c.req.url);
        loginUrl.searchParams.set('error', 'unauthorized');
        loginUrl.searchParams.set('redirect', c.req.path); // 登录后跳回原页面
        c.res = c.redirect(loginUrl.toString(), 302);
      }
      return c.res;
    }
    
    // 认证成功，将会话信息添加到上下文，供后续处理器使用
    console.log(`[Auth Debug] Authentication successful for path: ${c.req.path}`);
    c.set('adminSession', session);
    await next();
  };
}

/**
 * API Key 认证中间件（可选）
 * @returns {Function} 中间件函数
 */
export function apiKeyAuthMiddleware() {
  return async (c, next) => {
    const apiKey = c.req.header('X-API-Key') || c.req.query('api_key');
    
    if (!apiKey) {
      c.res = createErrorResponse('Missing API key', 401, 'MISSING_API_KEY');
      return c.res;
    }
    
    const validApiKey = c.env.API_KEY;
    if (!validApiKey) {
      c.res = createErrorResponse('API key authentication not configured', 500, 'CONFIG_ERROR');
      return c.res;
    }
    
    if (apiKey !== validApiKey) {
      c.res = createErrorResponse('Invalid API key', 401, 'INVALID_API_KEY');
      return c.res;
    }
    
    await next();
  };
}

/**
 * 权限检查中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 * @returns {Function} 中间件函数
 */
export function permissionMiddleware(requiredPermissions = []) {
  return async (c, next) => {
    const adminSession = c.get('adminSession');
    
    if (!adminSession) {
      c.res = createErrorResponse('No active session', 401, 'NO_SESSION');
      return c.res;
    }
    
    // 这里可以扩展权限系统
    // 目前简单实现：所有认证用户都有全部权限
    const userPermissions = ['read', 'write', 'delete', 'admin'];
    
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      c.res = createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
      return c.res;
    }
    
    await next();
  };
}

/**
 * 登录尝试限制中间件
 * @returns {Function} 中间件函数
 */
export function loginAttemptLimitMiddleware() {
  return async (c, next) => {
    const clientIP = getClientIP(c.req.raw);
    const cacheKey = `login_attempts:${clientIP}`;
    
    try {
      // 使用 KV 存储记录登录尝试
      const attemptsData = await c.env.CACHE.get(cacheKey);
      const attempts = attemptsData ? JSON.parse(attemptsData) : { count: 0, lastAttempt: 0 };
      
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15分钟窗口
      const maxAttempts = 5;
      
      // 如果超过时间窗口，重置计数
      if (now - attempts.lastAttempt > windowMs) {
        attempts.count = 0;
      }
      
      // 检查是否超过限制
      if (attempts.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((attempts.lastAttempt + windowMs - now) / 1000 / 60);
        // 不再返回 JSON，而是渲染漂亮的 HTML 错误页面
        const title = "登录尝试次数过多";
        const message = `由于登录尝试过于频繁，您的访问已被暂时限制。请在 ${remainingMinutes} 分钟后重试。`;
        
        c.res = createErrorPageResponse(title, message, 429, 'fa-hand-paper');
        return c.res;
      }
      
      // 记录当前尝试
      attempts.count++;
      attempts.lastAttempt = now;
      
      await c.env.CACHE.put(cacheKey, JSON.stringify(attempts), {
        expirationTtl: Math.ceil(windowMs / 1000)
      });
      
      return await next();
    } catch (error) {
      console.error('Login attempt limit error:', error);
      // 在错误情况下允许继续，避免服务中断
      return await next();
    }
  };
}

/**
 * 验证码验证中间件（可选）
 * @returns {Function} 中间件函数
 */
export function captchaMiddleware() {
  return async (c, next) => {
    // 检查是否启用验证码
    const captchaEnabled = c.env.ENABLE_CAPTCHA === 'true';
    if (!captchaEnabled) {
      await next();
      return;
    }
    
    const captchaToken = c.req.header('X-Captcha-Token');
    const captchaResponse = c.req.header('X-Captcha-Response');
    
    if (!captchaToken || !captchaResponse) {
      c.res = createErrorResponse('Captcha verification required', 400, 'CAPTCHA_REQUIRED');
      return c.res;
    }
    
    try {
      // 这里可以集成第三方验证码服务，如 reCAPTCHA
      // 目前简单实现：检查缓存中的验证码
      const cacheKey = `captcha:${captchaToken}`;
      const storedResponse = await c.env.CACHE.get(cacheKey);
      
      if (!storedResponse || storedResponse !== captchaResponse) {
        c.res = createErrorResponse('Invalid captcha', 400, 'INVALID_CAPTCHA');
        return c.res;
      }
      
      // 验证成功后删除验证码
      await c.env.CACHE.delete(cacheKey);
      
      await next();
    } catch (error) {
      console.error('Captcha verification error:', error);
      c.res = createErrorResponse('Captcha verification failed', 500, 'CAPTCHA_ERROR');
      return c.res;
    }
  };
}

/**
 * 管理员会话清理工具
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 清理结果
 */
export async function cleanupExpiredSessions(env) {
  try {
    const sessionOps = new AdminSessionOperations(env.DB);
    
    const stmt = env.DB.prepare(`
      DELETE FROM admin_sessions 
      WHERE expires_at < datetime('now')
    `);
    
    const result = await stmt.run();
    
    return {
      success: true,
      deletedSessions: result.meta.changes
    };
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 生成安全的会话 Cookie
 * @param {string} sessionToken - 会话令牌
 * @param {number} maxAge - 过期时间（秒）
 * @returns {string} Cookie 字符串
 */
export function generateSessionCookie(sessionToken, maxAge = 3600) {
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  
  return `admin_auth=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Expires=${expires}`;
}

/**
 * 清除会话 Cookie
 * @returns {string} Cookie 字符串
 */
export function clearSessionCookie() {
  return 'admin_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

