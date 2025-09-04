/**
 * 数据验证工具函数
 */

/**
 * 验证 UID 格式（QQ号或微信号）
 * @param {string} uid - 用户 ID
 * @returns {Object} 验证结果
 */
export function validateUID(uid) {
  if (!uid || typeof uid !== 'string') {
    return { valid: false, message: '用户ID不能为空' };
  }
  
  const trimmedUID = uid.trim();
  
  if (trimmedUID.length === 0) {
    return { valid: false, message: '用户ID不能为空' };
  }
  
  if (trimmedUID.length > 50) {
    return { valid: false, message: '用户ID长度不能超过50个字符' };
  }
  
  // QQ号验证：5-12位数字
  const qqPattern = /^[1-9][0-9]{4,11}$/;
  // 微信号验证：6-20位字母数字下划线，以字母开头
  const wechatPattern = /^[a-zA-Z][a-zA-Z0-9_]{5,19}$/;
  // 手机号验证：11位数字，以1开头
  const phonePattern = /^1[3-9][0-9]{9}$/;
  
  if (qqPattern.test(trimmedUID) || wechatPattern.test(trimmedUID) || phonePattern.test(trimmedUID)) {
    return { valid: true, uid: trimmedUID };
  }
  
  return { valid: false, message: '请输入有效的QQ号、微信号' };
}

/**
 * 验证操作类型
 * @param {string} action - 操作类型
 * @returns {Object} 验证结果
 */
export function validateAction(action) {
  const validActions = ['keep', 'delete'];
  
  if (!action || typeof action !== 'string') {
    return { valid: false, message: '操作类型不能为空' };
  }
  
  if (!validActions.includes(action.toLowerCase())) {
    return { valid: false, message: '无效的操作类型' };
  }
  
  return { valid: true, action: action.toLowerCase() };
}

/**
 * 验证 IP 地址格式
 * @param {string} ip - IP 地址
 * @returns {boolean} 是否有效
 */
export function validateIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  
  // IPv4 验证
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 验证（简化版）
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * 验证分页参数
 * @param {Object} params - 分页参数
 * @returns {Object} 验证结果
 */
export function validatePaginationParams(params) {
  const { page = 1, limit = 50 } = params;
  
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return { valid: false, message: '页码必须是大于0的整数' };
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { valid: false, message: '每页数量必须是1-100之间的整数' };
  }
  
  return { 
    valid: true, 
    page: pageNum, 
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };
}

/**
 * 验证搜索关键词
 * @param {string} keyword - 搜索关键词
 * @returns {Object} 验证结果
 */
export function validateSearchKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return { valid: true, keyword: '' };
  }
  
  const trimmedKeyword = keyword.trim();
  
  if (trimmedKeyword.length > 100) {
    return { valid: false, message: '搜索关键词长度不能超过100个字符' };
  }
  
  // 防止 SQL 注入的基本检查
  const dangerousPatterns = [
    /['";]/,
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/i,
    /--/,
    /\/\*/,
    /\*\//
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedKeyword)) {
      return { valid: false, message: '搜索关键词包含非法字符' };
    }
  }
  
  return { valid: true, keyword: trimmedKeyword };
}

/**
 * 验证状态筛选参数
 * @param {string} status - 状态
 * @returns {Object} 验证结果
 */
export function validateStatusFilter(status) {
  const validStatuses = ['all', 'pending', 'keep', 'delete', 'expired'];
  
  if (!status || typeof status !== 'string') {
    return { valid: true, status: 'all' };
  }
  
  if (!validStatuses.includes(status.toLowerCase())) {
    return { valid: false, message: '无效的状态筛选参数' };
  }
  
  return { valid: true, status: status.toLowerCase() };
}

/**
 * 验证导出格式
 * @param {string} format - 导出格式
 * @returns {Object} 验证结果
 */
export function validateExportFormat(format) {
  const validFormats = ['csv', 'json'];
  
  if (!format || typeof format !== 'string') {
    return { valid: true, format: 'csv' };
  }
  
  if (!validFormats.includes(format.toLowerCase())) {
    return { valid: false, message: '不支持的导出格式' };
  }
  
  return { valid: true, format: format.toLowerCase() };
}

/**
 * 验证批量导入的 UID 列表
 * @param {Array} uids - UID 列表
 * @returns {Object} 验证结果
 */
export function validateBulkUIDs(uids) {
  if (!Array.isArray(uids)) {
    return { valid: false, message: 'UID列表必须是数组格式' };
  }
  
  if (uids.length === 0) {
    return { valid: false, message: 'UID列表不能为空' };
  }
  
  if (uids.length > 1000) {
    return { valid: false, message: '单次导入不能超过1000个UID' };
  }
  
  const validUIDs = [];
  const invalidUIDs = [];
  
  for (let i = 0; i < uids.length; i++) {
    const uidValidation = validateUID(uids[i]);
    if (uidValidation.valid) {
      validUIDs.push(uidValidation.uid);
    } else {
      invalidUIDs.push({ index: i + 1, uid: uids[i], error: uidValidation.message });
    }
  }
  
  return {
    valid: validUIDs.length > 0,
    validUIDs,
    invalidUIDs,
    message: invalidUIDs.length > 0 ? `发现 ${invalidUIDs.length} 个无效的UID` : 'UID验证通过'
  };
}

/**
 * 清理和转义 HTML 内容
 * @param {string} html - HTML 内容
 * @returns {string} 清理后的内容
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 验证请求来源
 * @param {string} origin - 请求来源
 * @param {Array} allowedOrigins - 允许的来源列表
 * @returns {boolean} 是否允许
 */
export function validateOrigin(origin, allowedOrigins = []) {
  if (!origin) {
    return false;
  }
  
  // 如果没有配置允许的来源，则允许所有来源（开发环境）
  if (allowedOrigins.length === 0) {
    return true;
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * 验证 User-Agent
 * @param {string} userAgent - User-Agent 字符串
 * @returns {Object} 验证结果
 */
export function validateUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return { valid: false, message: '缺少 User-Agent' };
  }
  
  if (userAgent.length > 500) {
    return { valid: false, message: 'User-Agent 过长' };
  }
  
  // 检测可疑的 User-Agent
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  return {
    valid: true,
    userAgent: userAgent.substring(0, 500), // 截断过长的 User-Agent
    isSuspicious
  };
}

