/**
 * 辅助函数工具
 */

/**
 * 获取客户端 IP 地址
 * @param {Request} request - 请求对象
 * @returns {string} IP 地址
 */
export function getClientIP(request) {
  // 尝试从各种头部获取真实 IP
  const headers = [
    'CF-Connecting-IP',      // Cloudflare
    'X-Forwarded-For',       // 代理服务器
    'X-Real-IP',             // Nginx
    'X-Client-IP',           // Apache
    'X-Forwarded',           // 其他代理
    'Forwarded-For',         // RFC 7239
    'Forwarded'              // RFC 7239
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // X-Forwarded-For 可能包含多个 IP，取第一个
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }
  
  // 如果都没有，返回默认值
  return '0.0.0.0';
}

/**
 * 获取用户代理字符串
 * @param {Request} request - 请求对象
 * @returns {string} User-Agent
 */
export function getUserAgent(request) {
  return request.headers.get('User-Agent') || 'Unknown';
}

/**
 * 生成响应对象
 * @param {Object} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @param {Object} headers - 额外的响应头
 * @returns {Response} 响应对象
 */
export function createJSONResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers
  };
  
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: defaultHeaders
  });
}

/**
 * 生成 HTML 响应对象
 * @param {string} html - HTML 内容
 * @param {number} status - HTTP 状态码
 * @param {Object} headers - 额外的响应头
 * @returns {Response} 响应对象
 */
export function createHTMLResponse(html, status = 200, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers
  };
  
  return new Response(html, {
    status,
    headers: defaultHeaders
  });
}

/**
 * 生成错误响应
 * @param {string} message - 错误消息
 * @param {number} status - HTTP 状态码
 * @param {string} code - 错误代码
 * @returns {Response} 错误响应
 */
export function createErrorResponse(message, status = 400, code = 'ERROR') {
  return createJSONResponse({
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  }, status);
}

/**
 * 生成一个可视化的 HTML 错误页面响应
 * @param {string} title - 页面标题 (例如 "访问受限")
 * @param {string} message - 显示给用户的详细信息
 * @param {number} status - HTTP 状态码 (例如 429)
 * @param {string} iconClass - Font Awesome 图标类 (例如 "fa-ban")
 * @returns {Response} HTML 响应对象
 */
export function createErrorPageResponse(title, message, status = 429, iconClass = 'fa-ban') {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 好友清理系统</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100% );
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            color: #343a40;
            text-align: center;
            padding: 20px;
        }
        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
            padding: 3rem 2rem;
        }
        .icon-wrapper {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #dc3545, #e83e8c);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: white;
            font-size: 2.5rem;
        }
        h1 {
            font-size: 1.75rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }
        p {
            color: #6c757d;
            font-size: 1.1rem;
            line-height: 1.6;
        }
        .btn {
            border-radius: 15px;
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
            margin-top: 2rem;
            background: linear-gradient(135deg, #007bff, #17a2b8);
            color: white;
            border: none;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 123, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrapper">
            <i class="fas ${iconClass}"></i>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">返回首页</a>
    </div>
</body>
</html>`;
  
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * 生成成功响应
 * @param {Object} data - 成功数据
 * @param {string} message - 成功消息
 * @returns {Response} 成功响应
 */
export function createSuccessResponse(data = {}, message = 'Success') {
  return createJSONResponse({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * 解析请求体 JSON。
 * 这个版本更健壮，能同时处理 HonoRequest 和标准的 Request 对象。
 * @param {import('hono').HonoRequest | Request} req - Hono请求对象或标准请求对象
 * @returns {Promise<Object>} 解析后的 JSON 对象
 */
export async function parseRequestJSON(req) {
  // 检查 Content-Type，确保是 JSON
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // 如果不是 JSON，根据情况可以抛出错误或返回空对象
    // 在批量导入场景下，我们期望是 JSON，所以抛出错误更合适
    throw new Error('Invalid Content-Type, expected application/json');
  }

  try {
    // Hono v3+ 和 Cloudflare Workers 环境中，.json() 是最推荐的方式
    // 它能正确处理各种边缘情况
    const data = await req.json();
    return data;
  } catch (error) {
    // 如果 .json() 失败，这通常意味着请求体为空或格式确实有问题
    console.error('Failed to parse JSON with .json() method:', error);
    throw new Error('Invalid JSON format');
  }
}

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期对象或字符串
 * @param {string} format - 格式类型
 * @returns {string} 格式化后的日期字符串
 */
export function formatDateTime(date, format = 'full') {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const options = {
    full: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    },
    date: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Shanghai'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    }
  };
  
  return d.toLocaleString('zh-CN', options[format] || options.full);
}

/**
 * 计算时间差
 * @param {Date|string} startDate - 开始时间
 * @param {Date|string} endDate - 结束时间（默认为当前时间）
 * @returns {Object} 时间差对象
 */
export function calculateTimeDiff(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: 'Invalid date' };
  }
  
  const diffMs = end.getTime() - start.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  return {
    valid: true,
    milliseconds: diffMs,
    seconds: diffSeconds,
    minutes: diffMinutes,
    hours: diffHours,
    days: diffDays,
    humanReadable: formatTimeDiff(diffSeconds)
  };
}

/**
 * 格式化时间差为人类可读格式
 * @param {number} seconds - 秒数
 * @returns {string} 人类可读的时间差
 */
export function formatTimeDiff(seconds) {
  if (seconds < 60) {
    return `${seconds}秒前`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分钟前`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}小时前`;
  } else {
    return `${Math.floor(seconds / 86400)}天前`;
  }
}

/**
 * 生成分页信息
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} limit - 每页记录数
 * @returns {Object} 分页信息
 */
export function generatePaginationInfo(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex: (page - 1) * limit + 1,
    endIndex: Math.min(page * limit, total)
  };
}

/**
 * 生成 CSV 格式数据
 * @param {Array} data - 数据数组
 * @param {Array} headers - 表头数组
 * @returns {string} CSV 字符串
 */
export function generateCSV(data, headers) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  const csvHeaders = headers || Object.keys(data[0]);
  const csvRows = [csvHeaders.join(',')];
  
  for (const row of data) {
    const csvRow = csvHeaders.map(header => {
      const value = row[header] || '';
      // 处理包含逗号、引号或换行符的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(csvRow.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * 生成随机颜色
 * @param {string} type - 颜色类型 (hex, rgb, hsl)
 * @returns {string} 颜色值
 */
export function generateRandomColor(type = 'hex') {
  switch (type) {
    case 'hex':
      return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    case 'rgb':
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return `rgb(${r}, ${g}, ${b})`;
    case 'hsl':
      const h = Math.floor(Math.random() * 360);
      const s = Math.floor(Math.random() * 100);
      const l = Math.floor(Math.random() * 100);
      return `hsl(${h}, ${s}%, ${l}%)`;
    default:
      return '#000000';
  }
}

/**
 * 延迟执行
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise 对象
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的 JSON 解析
 * @param {string} jsonString - JSON 字符串
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析结果或默认值
 */
export function safeJSONParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 检查是否为移动设备
 * @param {string} userAgent - User-Agent 字符串
 * @returns {boolean} 是否为移动设备
 */
export function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i
  ];
  
  return mobilePatterns.some(pattern => pattern.test(userAgent));
}

/**
 * 生成缓存键
 * @param {string} prefix - 前缀
 * @param {...string} parts - 键的各个部分
 * @returns {string} 缓存键
 */
export function generateCacheKey(prefix, ...parts) {
  return [prefix, ...parts].filter(Boolean).join(':');
}

