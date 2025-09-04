/**
 * 加密和哈希工具函数
 */

/**
 * 生成 UID 的 SHA-256 哈希值
 * @param {string} uid - 用户 ID
 * @returns {Promise<string>} 哈希值
 */
export async function hashUID(uid) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('Invalid UID provided');
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(uid.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成随机会话令牌
 * @param {number} length - 令牌长度（默认 32）
 * @returns {string} 随机令牌
 */
export function generateSessionToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }
  return result;
}

/**
 * 生成安全的随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
export function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }
  return result;
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {Object} 验证结果
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '密码不能为空' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少需要8位' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (strength < 3) {
    return { 
      valid: false, 
      message: '密码需要包含大写字母、小写字母、数字和特殊字符中的至少3种' 
    };
  }
  
  return { valid: true, strength };
}

/**
 * 简单的字符串加密（用于敏感数据）
 * @param {string} text - 要加密的文本
 * @param {string} key - 加密密钥
 * @returns {Promise<string>} 加密后的文本
 */
export async function encryptText(text, key) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const textData = encoder.encode(text);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    textData
  );
  
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...result));
}

/**
 * 解密文本
 * @param {string} encryptedText - 加密的文本
 * @param {string} key - 解密密钥
 * @returns {Promise<string>} 解密后的文本
 */
export async function decryptText(encryptedText, key) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyData = encoder.encode(key);
  
  const data = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

/**
 * 生成 CSRF 令牌
 * @returns {string} CSRF 令牌
 */
export function generateCSRFToken() {
  return generateRandomString(32);
}

/**
 * 验证 CSRF 令牌
 * @param {string} token - 提交的令牌
 * @param {string} sessionToken - 会话中的令牌
 * @returns {boolean} 验证结果
 */
export function validateCSRFToken(token, sessionToken) {
  if (!token || !sessionToken) {
    return false;
  }
  return token === sessionToken;
}

