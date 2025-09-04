/**
 * 安全防护中间件
 */

import { validateUserAgent, validateOrigin, sanitizeHTML } from '../utils/validation.js';
import { getClientIP, getUserAgent, createErrorResponse } from '../utils/helpers.js';

/**
 * CORS 中间件
 * @param {Object} options - CORS 配置
 * @returns {Function} 中间件函数
 */
export function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Token'],
    credentials = false,
    maxAge = 86400
  } = options;

  return async (c, next) => {
    const requestOrigin = c.req.header('Origin');
    
    // 设置 CORS 头
    if (origin === '*' || (Array.isArray(origin) && origin.includes(requestOrigin)) || origin === requestOrigin) {
      c.res.headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? requestOrigin : origin);
    }
    
    c.res.headers.set('Access-Control-Allow-Methods', methods.join(', '));
    c.res.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    c.res.headers.set('Access-Control-Max-Age', maxAge.toString());
    
    if (credentials) {
      c.res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // 处理预检请求
    if (c.req.method === 'OPTIONS') {
      c.res = new Response(null, { status: 204 });
      return c.res;
    }
    
    await next();
  };
}

/**
 * 安全头中间件
 * @param {Object} options - 安全头配置
 * @returns {Function} 中间件函数
 */
export function securityHeadersMiddleware(options = {}) {
  const {
    contentTypeOptions = 'nosniff',
    frameOptions = 'DENY',
    xssProtection = '1; mode=block',
    referrerPolicy = 'strict-origin-when-cross-origin',
    contentSecurityPolicy = null,
    strictTransportSecurity = 'max-age=31536000; includeSubDomains',
    permissionsPolicy = 'geolocation=(), microphone=(), camera=()'
  } = options;

  return async (c, next) => {
    await next();
    
    // 设置安全头
    c.res.headers.set('X-Content-Type-Options', contentTypeOptions);
    c.res.headers.set('X-Frame-Options', frameOptions);
    c.res.headers.set('X-XSS-Protection', xssProtection);
    c.res.headers.set('Referrer-Policy', referrerPolicy);
    c.res.headers.set('Permissions-Policy', permissionsPolicy);
    
    if (strictTransportSecurity) {
      c.res.headers.set('Strict-Transport-Security', strictTransportSecurity);
    }
    
    if (contentSecurityPolicy) {
      c.res.headers.set('Content-Security-Policy', contentSecurityPolicy);
    }
    
    // 移除可能泄露信息的头
    c.res.headers.delete('Server');
    c.res.headers.delete('X-Powered-By');
  };
}

/**
 * SQL 注入防护中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 中间件函数
 */
export function sqlInjectionProtectionMiddleware(options = {}) {
  const {
    checkBody = true,
    checkQuery = true,
    checkHeaders = false,
    strictMode = false
  } = options;

  // SQL 注入检测模式
  const sqlPatterns = [
    // 基本 SQL 关键词
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b/i,
    // SQL 注释
    /(--|\/\*|\*\/|#)/,
    // SQL 字符串操作
    /('.*'|".*")/,
    // SQL 函数
    /\b(CONCAT|SUBSTRING|ASCII|CHAR|LEN|CAST|CONVERT)\b/i,
    // 时间延迟攻击
    /\b(SLEEP|WAITFOR|DELAY)\b/i,
    // 信息泄露
    /\b(INFORMATION_SCHEMA|SYS\.|MASTER\.|MSDB\.)/i
  ];

  const strictPatterns = [
    // 更严格的模式
    /[';"].*[';"]/, // 引号包围的内容
    /\b\d+\s*=\s*\d+/, // 数字比较
    /\b\w+\s*=\s*\w+/, // 字段比较
    /(AND|OR)\s+\d+\s*=\s*\d+/i // 逻辑操作
  ];

  function detectSQLInjection(text) {
    if (!text || typeof text !== 'string') return false;

    // 简单的、不包含特殊字符的单词（如 "delete"）不应被误判
    // 这个正则匹配一个或多个字母、数字、下划线或连字符组成的字符串
    const isSimpleWord = /^[a-zA-Z0-9_-]+$/.test(text);

    // 只有当值不是一个简单的单词时，我们才用最严格的规则去检查
    if (!isSimpleWord) {
        const patterns = strictMode ? [...sqlPatterns, ...strictPatterns] : sqlPatterns;
        return patterns.some(pattern => pattern.test(text));
    }

    // 对于简单的单词，我们只检查它是否是SQL关键词
    // 并且我们可以把 'delete' 排除在外
    const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'UNION'];
    const isKeyword = new RegExp(`^(${keywords.join('|')})$`, 'i').test(text);
    
    return isKeyword;
  }

  function checkObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return null;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' && detectSQLInjection(value)) {
        return { field: currentPath, value };
      }
      
      if (typeof value === 'object' && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) return result;
      }
    }
    
    return null;
  }

  return async (c, next) => {
    try {
      // 检查查询参数
      if (checkQuery) {
        const queryParams = c.req.query();
        const queryResult = checkObject(queryParams);
        if (queryResult) {
          c.res = createErrorResponse(
            'Potential SQL injection detected in query parameters',
            400,
            'SQL_INJECTION_DETECTED'
          );
          return c.res;
        }
      }
      
      // 检查请求体
      if (checkBody && (c.req.method === 'POST' || c.req.method === 'PUT')) {
        try {
          // 1. 克隆请求，以防 body 被消费
          const clonedReq = c.req.raw.clone();
          // 2. 从克隆的请求中解析 JSON
          const body = await clonedReq.json();
          
          const bodyResult = checkObject(body);
          if (bodyResult) {
            c.res = createErrorResponse(
              'Potential SQL injection detected in request body',
              400,
              'SQL_INJECTION_DETECTED'
            );
            return c.res;
          }
        } catch (error) {
          // 如果不是 JSON 或解析失败，安静地跳过检查
          // 因为我们的目标是检查 JSON 内容，非 JSON 内容不在此中间件的处理范围内
        }
      }
      
      // 检查请求头
      if (checkHeaders) {
        const headers = {};
        c.req.raw.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        const headerResult = checkObject(headers);
        if (headerResult) {
          c.res = createErrorResponse(
            'Potential SQL injection detected in headers',
            400,
            'SQL_INJECTION_DETECTED'
          );
          return c.res;
        }
      }
      
      await next();
    } catch (error) {
      console.error('SQL injection protection error:', error);
      await next();
    }
  };
}

/**
 * XSS 防护中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 中间件函数
 */
export function xssProtectionMiddleware(options = {}) {
  const {
    sanitizeInput = true,
    sanitizeOutput = false,
    allowedTags = [],
    strictMode = false
  } = options;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<\s*\w.*?>/gi
  ];

  function detectXSS(text) {
    if (!text || typeof text !== 'string') return false;
    return xssPatterns.some(pattern => pattern.test(text));
  }

  function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    return sanitizeHTML(text);
  }

  function processObject(obj, sanitize = false) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const processed = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        if (detectXSS(value)) {
          if (sanitize) {
            processed[key] = sanitizeText(value);
          } else {
            throw new Error(`XSS detected in field: ${key}`);
          }
        } else {
          processed[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        processed[key] = processObject(value, sanitize);
      } else {
        processed[key] = value;
      }
    }
    
    return processed;
  }

  return async (c, next) => {
    try {
      // 检查和清理输入
      if (sanitizeInput && (c.req.method === 'POST' || c.req.method === 'PUT')) {
        try {
          // 1. 克隆请求
          const clonedReq = c.req.raw.clone();
          // 2. 从克隆中解析 JSON
          const body = await clonedReq.json();
          
          const processedBody = processObject(body, true);
          
          // 3. 将处理过的数据放入缓存，供后续使用
          // Hono 的 c.req 对象是可写的，我们可以直接修改它
          // 但为了安全，我们创建一个新的属性来存储
          c.set('sanitizedBody', processedBody);

        } catch (error) {
          if (error.message.includes('XSS detected')) {
            c.res = createErrorResponse(
              'Potential XSS attack detected',
              400,
              'XSS_DETECTED'
            );
            return c.res;
          }
          // 如果不是 JSON 或解析失败，同样安静地跳过
        }
      }
      
      await next();
      
      // 检查和清理输出
      if (sanitizeOutput) {
        const contentType = c.res.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const responseText = await c.res.text();
            const responseData = JSON.parse(responseText);
            const sanitizedData = processObject(responseData, true);
            
            c.res = new Response(JSON.stringify(sanitizedData), {
              status: c.res.status,
              headers: c.res.headers
            });
          } catch (error) {
            // 如果处理失败，保持原响应
          }
        }
      }
    } catch (error) {
      console.error('XSS protection error:', error);
      await next();
    }
  };
}

/**
 * 请求大小限制中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 中间件函数
 */
export function requestSizeLimitMiddleware(options = {}) {
  const {
    maxSize = 1024 * 1024, // 1MB
    skipPaths = [],
    message = 'Request too large'
  } = options;

  return async (c, next) => {
    const path = c.req.path;
    
    // 跳过指定路径
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      await next();
      return;
    }
    
    const contentLength = c.req.header('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      c.res = createErrorResponse(
        message,
        413,
        'REQUEST_TOO_LARGE'
      );
      return c.res;
    }
    
    await next();
  };
}

/**
 * User-Agent 验证中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 中间件函数
 */
export function userAgentValidationMiddleware(options = {}) {
  const {
    required = true,
    blockSuspicious = true,
    whitelist = [],
    blacklist = []
  } = options;

  return async (c, next) => {
    const userAgent = getUserAgent(c.req.raw);
    
    if (required && !userAgent) {
      c.res = createErrorResponse(
        'User-Agent header is required',
        400,
        'MISSING_USER_AGENT'
      );
      return c.res;
    }
    
    if (userAgent) {
      const validation = validateUserAgent(userAgent);
      
      if (!validation.valid) {
        c.res = createErrorResponse(
          validation.message,
          400,
          'INVALID_USER_AGENT'
        );
        return c.res;
      }
      
      // 检查白名单
      if (whitelist.length > 0) {
        const isWhitelisted = whitelist.some(pattern => 
          new RegExp(pattern, 'i').test(userAgent)
        );
        if (!isWhitelisted) {
          c.res = createErrorResponse(
            'User-Agent not allowed',
            403,
            'USER_AGENT_NOT_ALLOWED'
          );
          return c.res;
        }
      }
      
      // 检查黑名单
      if (blacklist.length > 0) {
        const isBlacklisted = blacklist.some(pattern => 
          new RegExp(pattern, 'i').test(userAgent)
        );
        if (isBlacklisted) {
          c.res = createErrorResponse(
            'User-Agent blocked',
            403,
            'USER_AGENT_BLOCKED'
          );
          return c.res;
        }
      }
      
      // 检查可疑 User-Agent
      if (blockSuspicious && validation.isSuspicious) {
          c.res = createErrorResponse(
            'Suspicious User-Agent detected',
            403,
            'SUSPICIOUS_USER_AGENT'
          );
          return c.res;
        }
    }
    
    await next();
  };
}

/**
 * IP 黑名单中间件
 * @param {Array} blacklist - 黑名单 IP 列表
 * @returns {Function} 中间件函数
 */
export function ipBlacklistMiddleware(blacklist = []) {
  return async (c, next) => {
    if (blacklist.length === 0) {
      await next();
      return;
    }
    
    const clientIP = getClientIP(c.req.raw);
    
    // 检查是否在黑名单中
    const isBlacklisted = blacklist.some(ip => {
      if (ip.includes('/')) {
        // CIDR 格式支持（简化实现）
        const [network, prefixLength] = ip.split('/');
        const networkParts = network.split('.');
        const clientParts = clientIP.split('.');
        const maskBits = parseInt(prefixLength);
        const maskBytes = Math.floor(maskBits / 8);
        
        for (let i = 0; i < maskBytes; i++) {
          if (networkParts[i] !== clientParts[i]) {
            return false;
          }
        }
        
        if (maskBits % 8 !== 0) {
          const remainingBits = maskBits % 8;
          const mask = (0xFF << (8 - remainingBits)) & 0xFF;
          const networkByte = parseInt(networkParts[maskBytes]) & mask;
          const clientByte = parseInt(clientParts[maskBytes]) & mask;
          return networkByte === clientByte;
        }
        
        return true;
      }
      return clientIP === ip;
    });
    
    if (isBlacklisted) {
      c.res = createErrorResponse(
        'Access denied',
        403,
        'IP_BLOCKED'
      );
      return c.res;
    }
    
    await next();
  };
}

/**
 * 请求方法限制中间件
 * @param {Array} allowedMethods - 允许的 HTTP 方法
 * @returns {Function} 中间件函数
 */
export function methodLimitMiddleware(allowedMethods = ['GET', 'POST']) {
  return async (c, next) => {
    const method = c.req.method;
    
    if (!allowedMethods.includes(method)) {
      c.res = createErrorResponse(
        `Method ${method} not allowed`,
        405,
        'METHOD_NOT_ALLOWED',
        {
          'Allow': allowedMethods.join(', ')
        }
      );
      return c.res;
    }
    
    await next();
  };
}

/**
 * 维护模式中间件
 * @returns {Function} 中间件函数
 */
export function maintenanceModeMiddleware() {
  return async (c, next) => {
    try {
      // 从数据库获取维护模式状态
      const stmt = c.env.DB.prepare(`
        SELECT config_value 
        FROM system_config 
        WHERE config_key = 'maintenance_mode'
      `);
      
      const result = await stmt.first();
      const maintenanceMode = result?.config_value === 'true';
      
      if (maintenanceMode) {
        // 检查是否是管理员路径或管理员API路径
        const path = c.req.path;
        const isAdminPath = path.startsWith('/admin') || path.startsWith('/api/admin');
        
        if (!isAdminPath) {
          // 检查是否是API调用还是浏览器访问
          const acceptHeader = c.req.header('accept') || '';
          const isApiRequest = path.startsWith('/api/') || acceptHeader.includes('application/json');
          
          if (isApiRequest) {
            // 对API调用返回JSON错误
            c.res = createErrorResponse(
              '系统正在维护中，请稍后再试。',
              503,
              'MAINTENANCE_MODE',
              {
                'Retry-After': '3600' // 1小时后重试
              }
            );
          } else {
            // 对浏览器访问返回友好的HTML页面
            const htmlResponse = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>系统维护中 - 好友清理系统</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .maintenance-container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 4rem;
      text-align: center;
      max-width: 500px;
      width: 90%;
    }
    .maintenance-icon {
      font-size: 6rem;
      color: #667eea;
      margin-bottom: 2rem;
    }
    .maintenance-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 1rem;
    }
    .maintenance-message {
      font-size: 1.1rem;
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .maintenance-footer {
      color: #999;
      font-size: 0.9rem;
    }
    @media (max-width: 768px) {
      .maintenance-container {
        padding: 2rem;
      }
      .maintenance-title {
        font-size: 2rem;
      }
      .maintenance-icon {
        font-size: 4rem;
      }
    }
  </style>
</head>
<body>
  <div class="maintenance-container">
    <div class="maintenance-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" fill="currentColor" class="bi bi-wrench" viewBox="0 0 16 16">
        <path d="M13.406 0.564a.5.5 0 0 1 .406.564l-1.5 15A.5.5 0 0 1 12 17H4a.5.5 0 0 1-.406-.736L6.5 0h6.906zm-0.492 9.5c.079-.297-.396-.697-1.208-.697l-.109-.001a2.184 2.184 0 0 0-2.233 0l-.078.003-.079.001c-.812 0-1.287.4-1.287.7 0 .303.475.701 1.296.7.812 0 1.287-.4 1.287-.7l.079-.001.108-.001.109.001z"/>
      </svg>
    </div>
    <h1 class="maintenance-title">系统维护中</h1>
    <p class="maintenance-message">
      我们正在对系统进行例行维护和升级，<br>
      预计将在1小时内完成。<br>
      感谢您的理解与支持！
    </p>
    <div class="maintenance-footer">
      <p>好友清理系统</p>
      <p>© 2024 版权所有</p>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
          
          c.res = new Response(htmlResponse, {
            status: 503,
            headers: {
              'Content-Type': 'text/html',
              'Retry-After': '3600'
            }
          });
        }
        
        return c.res;
      }
    }
      
      await next();
    } catch (error) {
      console.error('Maintenance mode check error:', error);
      // 在错误情况下允许访问
      await next();
    }
  };
}

