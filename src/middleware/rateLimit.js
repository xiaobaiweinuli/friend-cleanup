/**
 * 限速中间件
 */

import { RateLimitOperations } from '../database/operations.js';
import { getClientIP, createErrorResponse } from '../utils/helpers.js';

/**
 * 基于数据库的限速中间件
 * @param {Object} options - 限速配置
 * @returns {Function} 中间件函数
 */
export function databaseRateLimitMiddleware(options = {}) {
  const {
    windowSeconds = 60,
    maxRequests = 5,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null
  } = options;

  return async (c, next) => {
    const clientIP = getClientIP(c.req.raw);
    const key = keyGenerator ? keyGenerator(c.req.raw) : clientIP;
    
    try {
      const rateLimitOps = new RateLimitOperations(c.env.DB);
      const result = await rateLimitOps.checkAndUpdateRateLimit(key, windowSeconds, maxRequests);
      
      // 添加限速信息到响应头
      const headers = {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - result.currentCount).toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString()
      };
      
      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
        
        c.res = createErrorResponse(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          429,
          'RATE_LIMIT_EXCEEDED',
          {
            ...headers,
            'Retry-After': retryAfter.toString()
          }
        );
        return c.res;
      }
      
      // 将限速信息添加到上下文
      c.set('rateLimit', {
        limit: maxRequests,
        remaining: maxRequests - result.currentCount,
        reset: result.resetTime,
        current: result.currentCount
      });
      
      await next();
      
      // 在响应中添加限速头
      Object.entries(headers).forEach(([key, value]) => {
        c.res.headers.set(key, value);
      });
      
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // 在错误情况下允许请求继续，避免服务中断
      await next();
    }
  };
}

/**
 * 基于 KV 存储的限速中间件（更高性能）
 * @param {Object} options - 限速配置
 * @returns {Function} 中间件函数
 */
export function kvRateLimitMiddleware(options = {}) {
  const {
    windowSeconds = 60,
    maxRequests = 5,
    keyPrefix = 'rate_limit',
    keyGenerator = null
  } = options;

  return async (c, next) => {
    const clientIP = getClientIP(c.req.raw);
    const key = keyGenerator ? keyGenerator(c.req.raw) : clientIP;
    const cacheKey = `${keyPrefix}:${key}`;
    
    try {
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      
      // 获取当前计数
      const currentData = await c.env.CACHE.get(cacheKey);
      let requestData = currentData ? JSON.parse(currentData) : {
        count: 0,
        windowStart: now,
        requests: []
      };
      
      // 清理过期的请求记录
      requestData.requests = requestData.requests.filter(
        timestamp => now - timestamp < windowMs
      );
      
      // 更新计数
      requestData.count = requestData.requests.length;
      
      // 检查是否超过限制
      if (requestData.count >= maxRequests) {
        const oldestRequest = Math.min(...requestData.requests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
        
        c.res = createErrorResponse(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          429,
          'RATE_LIMIT_EXCEEDED',
          {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((oldestRequest + windowMs) / 1000).toString(),
            'Retry-After': retryAfter.toString()
          }
        );
        return c.res;
      }
      
      // 记录当前请求
      requestData.requests.push(now);
      requestData.count = requestData.requests.length;
      
      // 保存到 KV
      await c.env.CACHE.put(cacheKey, JSON.stringify(requestData), {
        expirationTtl: windowSeconds + 60 // 额外60秒缓冲
      });
      
      // 将限速信息添加到上下文
      c.set('rateLimit', {
        limit: maxRequests,
        remaining: maxRequests - requestData.count,
        reset: new Date(Math.min(...requestData.requests) + windowMs),
        current: requestData.count
      });
      
      await next();
      
      // 在响应中添加限速头
      const rateLimitInfo = c.get('rateLimit');
      c.res.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
      c.res.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      c.res.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset.getTime() / 1000).toString());
      
    } catch (error) {
      console.error('KV rate limit middleware error:', error);
      // 在错误情况下允许请求继续
      await next();
    }
  };
}

/**
 * 滑动窗口限速中间件
 * @param {Object} options - 限速配置
 * @returns {Function} 中间件函数
 */
export function slidingWindowRateLimitMiddleware(options = {}) {
  const {
    windowSeconds = 60,
    maxRequests = 5,
    keyPrefix = 'sliding_rate_limit',
    keyGenerator = null
  } = options;

  return async (c, next) => {
    const clientIP = getClientIP(c.req.raw);
    const key = keyGenerator ? keyGenerator(c.req.raw) : clientIP;
    const cacheKey = `${keyPrefix}:${key}`;
    
    try {
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      
      // 获取当前窗口数据
      const windowData = await c.env.CACHE.get(cacheKey);
      let requests = windowData ? JSON.parse(windowData) : [];
      
      // 移除过期的请求
      requests = requests.filter(timestamp => now - timestamp < windowMs);
      
      // 检查是否超过限制
      if (requests.length >= maxRequests) {
        const oldestRequest = Math.min(...requests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
        
        c.res = createErrorResponse(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          429,
          'RATE_LIMIT_EXCEEDED',
          {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((oldestRequest + windowMs) / 1000).toString(),
            'Retry-After': retryAfter.toString()
          }
        );
        return c.res;
      }
      
      // 添加当前请求
      requests.push(now);
      
      // 保存更新后的数据
      await c.env.CACHE.put(cacheKey, JSON.stringify(requests), {
        expirationTtl: windowSeconds + 60
      });
      
      // 设置限速信息
      c.set('rateLimit', {
        limit: maxRequests,
        remaining: maxRequests - requests.length,
        reset: new Date(Math.min(...requests) + windowMs),
        current: requests.length
      });
      
      await next();
      
      // 添加响应头
      const rateLimitInfo = c.get('rateLimit');
      c.res.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
      c.res.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      c.res.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset.getTime() / 1000).toString());
      
    } catch (error) {
      console.error('Sliding window rate limit error:', error);
      await next();
    }
  };
}

/**
 * 自适应限速中间件
 * @param {Object} options - 限速配置
 * @returns {Function} 中间件函数
 */
export function adaptiveRateLimitMiddleware(options = {}) {
  const {
    baseWindowSeconds = 60,
    baseMaxRequests = 5,
    keyPrefix = 'adaptive_rate_limit',
    keyGenerator = null,
    adaptationFactor = 0.5 // 适应因子
  } = options;

  return async (c, next) => {
    const clientIP = getClientIP(c.req.raw);
    const key = keyGenerator ? keyGenerator(c.req.raw) : clientIP;
    const cacheKey = `${keyPrefix}:${key}`;
    const statsKey = `${keyPrefix}_stats:${key}`;
    
    try {
      const now = Date.now();
      
      // 获取历史统计数据
      const statsData = await c.env.CACHE.get(statsKey);
      let stats = statsData ? JSON.parse(statsData) : {
        successCount: 0,
        errorCount: 0,
        lastUpdate: now,
        adaptedLimit: baseMaxRequests
      };
      
      // 计算自适应限制
      const errorRate = stats.errorCount / (stats.successCount + stats.errorCount + 1);
      const adaptedLimit = Math.max(1, Math.floor(baseMaxRequests * (1 - errorRate * adaptationFactor)));
      
      // 使用自适应限制进行限速检查
      const windowMs = baseWindowSeconds * 1000;
      const windowData = await c.env.CACHE.get(cacheKey);
      let requests = windowData ? JSON.parse(windowData) : [];
      
      requests = requests.filter(timestamp => now - timestamp < windowMs);
      
      if (requests.length >= adaptedLimit) {
        const oldestRequest = Math.min(...requests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
        
        // 记录错误
        stats.errorCount++;
        stats.lastUpdate = now;
        await c.env.CACHE.put(statsKey, JSON.stringify(stats), {
          expirationTtl: 24 * 60 * 60 // 24小时
        });
        
        c.res = createErrorResponse(
          `Adaptive rate limit exceeded. Try again in ${retryAfter} seconds.`,
          429,
          'ADAPTIVE_RATE_LIMIT_EXCEEDED',
          {
            'X-RateLimit-Limit': adaptedLimit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((oldestRequest + windowMs) / 1000).toString(),
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Adaptive': 'true'
          }
        );
        return c.res;
      }
      
      requests.push(now);
      await c.env.CACHE.put(cacheKey, JSON.stringify(requests), {
        expirationTtl: baseWindowSeconds + 60
      });
      
      c.set('rateLimit', {
        limit: adaptedLimit,
        remaining: adaptedLimit - requests.length,
        reset: new Date(Math.min(...requests) + windowMs),
        current: requests.length,
        adaptive: true
      });
      
      await next();
      
      // 根据响应状态更新统计
      const responseStatus = c.res.status;
      if (responseStatus >= 200 && responseStatus < 400) {
        stats.successCount++;
      } else {
        stats.errorCount++;
      }
      
      stats.lastUpdate = now;
      stats.adaptedLimit = adaptedLimit;
      
      await c.env.CACHE.put(statsKey, JSON.stringify(stats), {
        expirationTtl: 24 * 60 * 60
      });
      
      // 添加响应头
      const rateLimitInfo = c.get('rateLimit');
      c.res.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
      c.res.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      c.res.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset.getTime() / 1000).toString());
      c.res.headers.set('X-RateLimit-Adaptive', 'true');
      
    } catch (error) {
      console.error('Adaptive rate limit error:', error);
      await next();
    }
  };
}

/**
 * IP 白名单中间件
 * @param {Array} whitelist - 白名单 IP 列表
 * @returns {Function} 中间件函数
 */
export function ipWhitelistMiddleware(whitelist = []) {
  return async (c, next) => {
    if (whitelist.length === 0) {
      await next();
      return;
    }
    
    const clientIP = getClientIP(c.req.raw);
    
    // 检查是否在白名单中
    const isWhitelisted = whitelist.some(ip => {
      if (ip.includes('/')) {
        // CIDR 格式支持（简化实现）
        const [network, prefixLength] = ip.split('/');
        // 这里需要更复杂的 CIDR 匹配逻辑
        return clientIP.startsWith(network.split('.').slice(0, Math.floor(parseInt(prefixLength) / 8)).join('.'));
      }
      return clientIP === ip;
    });
    
    if (isWhitelisted) {
      // 白名单用户跳过限速
      c.set('skipRateLimit', true);
    }
    
    await next();
  };
}

/**
 * 动态限速配置中间件
 * @returns {Function} 中间件函数
 */
export function dynamicRateLimitMiddleware() {
  return async (c, next) => {
    try {
      // 从数据库或配置中获取动态限速设置
      const configStmt = c.env.DB.prepare(`
        SELECT config_key, config_value 
        FROM system_config 
        WHERE config_key IN ('rate_limit_window', 'rate_limit_max_requests')
      `);
      
      const configs = await configStmt.all();
      const configMap = {};
      configs.forEach(config => {
        configMap[config.config_key] = config.config_value;
      });
      
      const windowSeconds = parseInt(configMap.rate_limit_window) || 60;
      const maxRequests = parseInt(configMap.rate_limit_max_requests) || 5;
      
      // 应用动态配置的限速
      const rateLimitMiddleware = kvRateLimitMiddleware({
        windowSeconds,
        maxRequests,
        keyPrefix: 'dynamic_rate_limit'
      });
      
      await rateLimitMiddleware(c, next);
    } catch (error) {
      console.error('Dynamic rate limit error:', error);
      // 回退到默认限速
      const defaultRateLimit = kvRateLimitMiddleware();
      await defaultRateLimit(c, next);
    }
  };
}

