/**
 * 数据库操作模块
 */

import { hashUID } from '../utils/crypto.js';
import { formatDateTime, calculateTimeDiff } from '../utils/helpers.js';

/**
 * 用户相关数据库操作
 */
export class UserOperations {
  constructor(db) {
    this.db = db;
  }

  async ensureRemarkColumn() {
    try {
      const infoStmt = this.db.prepare("PRAGMA table_info('users')");
      const infoResult = await infoStmt.all();
      const columns = infoResult && Array.isArray(infoResult.results) ? infoResult.results : [];
      const hasRemark = columns.some(col => col.name === 'remark');
      if (!hasRemark) {
        await this.db.prepare("ALTER TABLE users ADD COLUMN remark TEXT").run();
        try {
          await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_users_remark ON users(remark)').run();
        } catch (_) {
          // ignore index creation errors
        }
      }
    } catch (_) {
      // ignore - best effort safeguard
    }
  }

  /**
   * 根据 UID 哈希查找用户
   * @param {string} uidHash - UID 哈希值
   * @returns {Promise<Object|null>} 用户信息
   */
  async findByUIDHash(uidHash) {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE uid_hash = ?');
      const result = await stmt.bind(uidHash).first();
      return result || null;
    } catch (error) {
      console.error('Error finding user by UID hash:', error);
      throw new Error('Database query failed');
    }
  }

  /**
   * 创建新用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 创建结果
   */
  async createUser(userData) {
    const { uid, ipAddress, userAgent } = userData;
    
    try {
      const uidHash = await hashUID(uid);
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO users (uid, uid_hash, status, created_at, updated_at, ip_address, user_agent)
        VALUES (?, ?, 'pending', ?, ?, ?, ?)
      `);
      
      const result = await stmt.bind(uid, uidHash, now, now, ipAddress, userAgent).run();
      
      if (result.success) {
        return {
          success: true,
          userId: result.meta.last_row_id,
          uidHash
        };
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * 更新用户状态
   * @param {string} uidHash - UID 哈希值
   * @param {string} action - 操作类型 (keep/delete)
   * @param {string} ipAddress - IP 地址
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserStatus(uidHash, action, ipAddress) {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        UPDATE users 
        SET status = ?, last_action_at = ?, updated_at = ?, ip_address = ?
        WHERE uid_hash = ?
      `);
      
      const result = await stmt.bind(action, now, now, ipAddress, uidHash).run();
      
      return {
        success: result.success,
        changes: result.meta.changes
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Failed to update user status');
    }
  }

  /**
   * 批量更新用户状态
   * @param {string[]} uidHashes - UID 哈希列表
   * @param {string} action - 操作类型 (keep/delete)
   * @param {string} ipAddress - IP 地址
   * @returns {Promise<Object>} 更新结果统计
   */
  async bulkUpdateUserStatus(uidHashes, action, ipAddress) {
    try {
      if (!Array.isArray(uidHashes) || uidHashes.length === 0) {
        return { success: true, updated: 0 };
      }
      const now = new Date().toISOString();
      let updated = 0;
      for (const uidHash of uidHashes) {
        const stmt = this.db.prepare(`
          UPDATE users 
          SET status = ?, last_action_at = ?, updated_at = ?, ip_address = ?
          WHERE uid_hash = ?
        `);
        const result = await stmt.bind(action, now, now, ipAddress, uidHash).run();
        updated += result?.meta?.changes || 0;
      }
      return { success: true, updated };
    } catch (error) {
      console.error('Error bulk updating user status:', error);
      throw new Error('Failed to bulk update user status');
    }
  }

  /**
   * 批量删除用户（硬删除）
   * @param {string[]} uidHashes - UID 哈希列表
   * @returns {Promise<Object>} 删除结果统计
   */
  async bulkDeleteUsers(uidHashes) {
    try {
      if (!Array.isArray(uidHashes) || uidHashes.length === 0) {
        return { success: true, deleted: 0, logsDeleted: 0 };
      }
      let deleted = 0;
      let logsDeleted = 0;
      for (const uidHash of uidHashes) {
        // 先删除关联日志
        const delLogsStmt = this.db.prepare('DELETE FROM action_logs WHERE uid_hash = ?');
        const logRes = await delLogsStmt.bind(uidHash).run();
        logsDeleted += logRes?.meta?.changes || 0;

        // 删除用户
        const delUserStmt = this.db.prepare('DELETE FROM users WHERE uid_hash = ?');
        const userRes = await delUserStmt.bind(uidHash).run();
        deleted += userRes?.meta?.changes || 0;
      }
      return { success: true, deleted, logsDeleted };
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      throw new Error('Failed to bulk delete users');
    }
  }

  /**
   * 批量导入用户
   * @param {Array} uids - UID 列表
   * @param {string} ipAddress - 操作者 IP
   * @returns {Promise<Object>} 导入结果
   */
  async bulkImportUsers(uidsOrEntries, ipAddress) {
    await this.ensureRemarkColumn();
    const results = {
      imported: 0,
      duplicates: 0,
      errors: []
    };

    try {
      const now = new Date().toISOString();
      
      for (const entry of uidsOrEntries) {
        try {
          const uid = typeof entry === 'string' ? entry : entry.uid;
          const remark = typeof entry === 'object' && entry && entry.remark ? String(entry.remark).trim() : null;
          const uidHash = await hashUID(uid);
          
          // 检查是否已存在
          const existing = await this.findByUIDHash(uidHash);
          if (existing) {
            results.duplicates++;
            continue;
          }
          
          const stmt = this.db.prepare(`
            INSERT INTO users (uid, uid_hash, status, created_at, updated_at, ip_address, user_agent, remark)
            VALUES (?, ?, 'pending', ?, ?, ?, 'Bulk Import', ?)
          `);
          
          const result = await stmt.bind(uid, uidHash, now, now, ipAddress, remark).run();
          
          if (result.success) {
            results.imported++;
          } else {
            results.errors.push({ uid, error: 'Database insert failed' });
          }
        } catch (error) {
          const uidForError = typeof entry === 'string' ? entry : entry?.uid;
          results.errors.push({ uid: uidForError, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk import:', error);
      throw new Error('Bulk import failed');
    }
  }

  /**
   * 获取用户列表（分页）
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 用户列表和分页信息
   */
  async getUserList(params) {
    await this.ensureRemarkColumn();
    const { page = 1, limit = 50, status = 'all', search = '', offset = 0 } = params;
    
    try {
      let whereClause = '1=1';
      let bindParams = [];
      
      // 状态筛选
      if (status !== 'all') {
        if (status === 'expired') {
          whereClause += ` AND status = 'pending' AND created_at < datetime('now', '-7 days')`;
        } else {
          whereClause += ` AND status = ?`;
          bindParams.push(status);
        }
      }
      
      // 搜索条件
      if (search) {
        whereClause += ` AND (uid LIKE ? OR uid_hash LIKE ? OR remark LIKE ?)`;
        bindParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      // 获取总数
      const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`);
      const countResult = await countStmt.bind(...bindParams).first();
      const total = countResult.total;
      
      // 获取数据
      const dataStmt = this.db.prepare(`
        SELECT id, uid, uid_hash, status, created_at, updated_at, last_action_at, ip_address, remark
        FROM users 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      
      const usersResult = await dataStmt.bind(...bindParams, limit, offset).all();
      const users = usersResult && Array.isArray(usersResult.results) ? usersResult.results : [];
      
      // 计算过期状态
      const processedUsers = users.map(user => {
        const timeDiff = calculateTimeDiff(user.created_at);
        const isExpired = user.status === 'pending' && timeDiff.days >= 7;
        
        return {
          ...user,
          isExpired,
          createdAtFormatted: formatDateTime(user.created_at),
          lastActionAtFormatted: user.last_action_at ? formatDateTime(user.last_action_at) : '未操作',
          timeSinceCreated: timeDiff.humanReadable
        };
      });
      
      return {
        users: processedUsers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting user list:', error);
      throw new Error('Failed to get user list');
    }
  }

  /**
   * 获取统计数据
   * @returns {Promise<Object>} 统计信息
   */
  async getStatistics() {
    try {
      const stats = {};
      
      // 总用户数
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
      const totalResult = await totalStmt.first();
      stats.totalUsers = totalResult.count;
      
      // 各状态用户数
      const statusStmt = this.db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM users 
        GROUP BY status
      `);
      const statusResults = await statusStmt.all();
      
      stats.statusCounts = {
        pending: 0,
        keep: 0,
        delete: 0
      };
      
      if (statusResults && Array.isArray(statusResults.results)) { // 确保 statusResults 和其 results 属性存在且为数组
        statusResults.results.forEach(row => {
          stats.statusCounts[row.status] = row.count;
        });
      }
      
      // 过期用户数（7天未操作）
      const expiredStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE status = 'pending' AND created_at < datetime('now', '-7 days')
      `);
      const expiredResult = await expiredStmt.first();
      stats.expiredUsers = expiredResult.count;
      
      // 今日新增用户
      const todayStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE date(created_at) = date('now')
      `);
      const todayResult = await todayStmt.first();
      stats.todayNewUsers = todayResult.count;
      
      // 今日操作数
      const todayActionStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE date(last_action_at) = date('now')
      `);
      const todayActionResult = await todayActionStmt.first();
      stats.todayActions = todayActionResult.count;
      
      // 操作率
      const operatedUsers = stats.statusCounts.keep + stats.statusCounts.delete;
      stats.operationRate = stats.totalUsers > 0 ? 
        Math.round((operatedUsers / stats.totalUsers) * 100) : 0;
      
      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }

  /**
   * 导出用户数据
   * @param {Object} params - 导出参数
   * @returns {Promise<Array>} 用户数据
   */
  async exportUsers(params) {
    await this.ensureRemarkColumn();
    const { status = 'all', format = 'csv' } = params;
    
    try {
      let whereClause = '1=1';
      let bindParams = [];
      
      if (status !== 'all') {
        if (status === 'expired') {
          whereClause += ` AND status = 'pending' AND created_at < datetime('now', '-7 days')`;
        } else {
          whereClause += ` AND status = ?`;
          bindParams.push(status);
        }
      }
      
      const stmt = this.db.prepare(`
        SELECT uid, status, created_at, last_action_at, ip_address, remark
        FROM users 
        WHERE ${whereClause}
        ORDER BY created_at DESC
      `);
      
      const usersResult = await stmt.bind(...bindParams).all();
      const users = usersResult && Array.isArray(usersResult.results) ? usersResult.results : [];
      
      return users.map(user => ({
        UID: user.uid,
        状态: this.getStatusText(user.status),
        创建时间: formatDateTime(user.created_at),
        最后操作时间: user.last_action_at ? formatDateTime(user.last_action_at) : '未操作',
        操作IP: user.ip_address || '未知',
        备注: user.remark || ''
      }));
    } catch (error) {
      console.error('Error exporting users:', error);
      throw new Error('Failed to export users');
    }
  }

  /**
   * 获取状态文本
   * @param {string} status - 状态代码
   * @returns {string} 状态文本
   */
  getStatusText(status) {
    const statusMap = {
      pending: '未操作',
      keep: '保留',
      delete: '删除'
    };
    return statusMap[status] || status;
  }

  /**
   * 清理过期数据
   * @param {number} days - 清理天数
   * @returns {Promise<Object>} 清理结果
   */
  async cleanupExpiredData(days = 30) {
    try {
      // 清理过期的操作日志
      const logStmt = this.db.prepare(`
        DELETE FROM action_logs 
        WHERE created_at < datetime('now', '-${days} days')
      `);
      const logResult = await logStmt.run();
      
      // 清理过期的限速记录
      const rateStmt = this.db.prepare(`
        DELETE FROM rate_limits 
        WHERE created_at < datetime('now', '-1 days')
      `);
      const rateResult = await rateStmt.run();
      
      // 清理过期的会话
      const sessionStmt = this.db.prepare(`
        DELETE FROM admin_sessions 
        WHERE expires_at < datetime('now')
      `);
      const sessionResult = await sessionStmt.run();
      
      return {
        success: true,
        deletedLogs: logResult.meta.changes,
        deletedRateLimits: rateResult.meta.changes,
        deletedSessions: sessionResult.meta.changes
      };
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
      throw new Error('Failed to cleanup expired data');
    }
  }
  
  /**
   * 清理所有日志数据
   * @returns {Promise<Object>} 清理结果
   */
  async cleanupAllLogs() {
    try {
      // 清理所有的操作日志
      const logStmt = this.db.prepare(`
        DELETE FROM action_logs
      `);
      const logResult = await logStmt.run();
      
      // 保持现有的限速记录和会话的清理逻辑不变
      const rateStmt = this.db.prepare(`
        DELETE FROM rate_limits 
        WHERE created_at < datetime('now', '-1 days')
      `);
      const rateResult = await rateStmt.run();
      
      const sessionStmt = this.db.prepare(`
        DELETE FROM admin_sessions 
        WHERE expires_at < datetime('now')
      `);
      const sessionResult = await sessionStmt.run();
      
      return {
        success: true,
        deletedLogs: logResult.meta.changes,
        deletedRateLimits: rateResult.meta.changes,
        deletedSessions: sessionResult.meta.changes
      };
    } catch (error) {
      console.error('Error cleaning up all logs:', error);
      throw new Error('Failed to cleanup all logs');
    }
  }
}

/**
 * 操作日志相关数据库操作
 */
export class ActionLogOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * 记录操作日志
   * @param {Object} logData - 日志数据
   * @returns {Promise<Object>} 记录结果
   */
  async logAction(logData) {
    const { userId, uidHash, action, ipAddress, userAgent, success = true, errorMessage = null } = logData;
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO action_logs (user_id, uid_hash, action, ip_address, user_agent, success, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const result = await stmt.bind(userId, uidHash, action, ipAddress, userAgent, success, errorMessage).run();
      
      return {
        success: result.success,
        logId: result.meta.last_row_id
      };
    } catch (error) {
      console.error('Error logging action:', error);
      throw new Error('Failed to log action');
    }
  }

  /**
   * 获取操作日志
   * @param {Object} params - 查询参数
   * @returns {Promise<Array>} 日志列表
   */
  async getActionLogs(params) {
    const { limit = 100, offset = 0, action = null, ipAddress = null, startTime = null, endTime = null } = params;
    
    try {
      let whereClause = '1=1';
      let bindParams = [];
      
      if (action) {
        whereClause += ' AND action = ?';
        bindParams.push(action);
      }
      
      if (ipAddress) {
        whereClause += ' AND ip_address = ?';
        bindParams.push(ipAddress);
      }
      
      if (startTime) {
        whereClause += ' AND datetime(created_at) >= datetime(?)';
        bindParams.push(startTime);
      }
      if (endTime) {
        whereClause += ' AND datetime(created_at) <= datetime(?)';
        bindParams.push(endTime);
      }
      
      const stmt = this.db.prepare(`
        SELECT al.*, u.remark as remark, u.uid as uid
        FROM action_logs al
        LEFT JOIN users u ON u.uid_hash = al.uid_hash
        WHERE ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `);
      
      const logsResult = await stmt.bind(...bindParams, limit, offset).all();
      const logs = logsResult && Array.isArray(logsResult.results) ? logsResult.results : [];
      
      return logs.map(log => ({
        ...log,
        createdAtFormatted: formatDateTime(log.created_at)
      }));
    } catch (error) {
      console.error('Error getting action logs:', error);
      throw new Error('Failed to get action logs');
    }
  }
}

/**
 * 限速相关数据库操作
 */
export class RateLimitOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * 检查和更新限速
   * @param {string} ipAddress - IP 地址
   * @param {number} windowSeconds - 时间窗口（秒）
   * @param {number} maxRequests - 最大请求数
   * @returns {Promise<Object>} 限速检查结果
   */
  async checkAndUpdateRateLimit(ipAddress, windowSeconds = 60, maxRequests = 5) {
    try {
      const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
      
      // 查找当前时间窗口内的记录
      const findStmt = this.db.prepare(`
        SELECT * FROM rate_limits 
        WHERE ip_address = ? AND window_start > ?
        ORDER BY window_start DESC
        LIMIT 1
      `);
      
      const existing = await findStmt.bind(ipAddress, windowStart).first();
      
      if (existing) {
        // 更新现有记录
        const newCount = existing.request_count + 1;
        
        if (newCount > maxRequests) {
          return {
            allowed: false,
            currentCount: newCount,
            maxRequests,
            resetTime: new Date(new Date(existing.window_start).getTime() + windowSeconds * 1000)
          };
        }
        
        const updateStmt = this.db.prepare(`
          UPDATE rate_limits 
          SET request_count = ?, last_request = datetime('now')
          WHERE id = ?
        `);
        
        await updateStmt.bind(newCount, existing.id).run();
        
        return {
          allowed: true,
          currentCount: newCount,
          maxRequests,
          resetTime: new Date(new Date(existing.window_start).getTime() + windowSeconds * 1000)
        };
      } else {
        // 创建新记录
        const insertStmt = this.db.prepare(`
          INSERT INTO rate_limits (ip_address, request_count, window_start, last_request, created_at)
          VALUES (?, 1, datetime('now'), datetime('now'), datetime('now'))
        `);
        
        await insertStmt.run(ipAddress);
        
        return {
          allowed: true,
          currentCount: 1,
          maxRequests,
          resetTime: new Date(Date.now() + windowSeconds * 1000)
        };
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // 在错误情况下允许请求，避免服务中断
      return {
        allowed: true,
        currentCount: 0,
        maxRequests,
        error: error.message
      };
    }
  }
}

/**
 * 系统配置相关数据库操作
 */
export class SystemConfigOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * 获取系统配置
   * @param {string} configKey - 配置键
   * @returns {Promise<string|null>} 配置值
   */
  async getConfig(configKey) {
    try {
      const stmt = this.db.prepare(`
        SELECT config_value 
        FROM system_config 
        WHERE config_key = ?
      `);
      
      const result = await stmt.bind(configKey).first();
      return result?.config_value || null;
    } catch (error) {
      console.error('Error getting config:', error);
      throw new Error('Failed to get config');
    }
  }

  /**
   * 设置系统配置
   * @param {string} configKey - 配置键
   * @param {string} configValue - 配置值
   * @returns {Promise<Object>} 设置结果
   */
  async setConfig(configKey, configValue) {
    try {
      // 先尝试更新
      const updateStmt = this.db.prepare(`
        UPDATE system_config 
        SET config_value = ? 
        WHERE config_key = ?
      `);
      
      const updateResult = await updateStmt.bind(configValue, configKey).run();
      
      if (updateResult.meta.changes === 0) {
        // 如果没有更新记录，则插入新记录
        const insertStmt = this.db.prepare(`
          INSERT INTO system_config (config_key, config_value) 
          VALUES (?, ?)
        `);
        
        await insertStmt.bind(configKey, configValue).run();
      }
      
      return {
        success: true,
        configKey,
        configValue
      };
    } catch (error) {
      console.error('Error setting config:', error);
      throw new Error('Failed to set config');
    }
  }

  /**
   * 批量设置系统配置
   * @param {Object} configs - 配置对象，键为配置键，值为配置值
   * @returns {Promise<Object>} 设置结果
   */
  async setConfigs(configs) {
    try {
      const results = {};
      
      for (const [key, value] of Object.entries(configs)) {
        const result = await this.setConfig(key, value.toString());
        results[key] = result;
      }
      
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error setting multiple configs:', error);
      throw new Error('Failed to set configs');
    }
  }

  /**
   * 获取所有系统配置
   * @returns {Promise<Object>} 所有配置
   */
  async getAllConfigs() {
    try {
      const stmt = this.db.prepare('SELECT config_key, config_value FROM system_config');
      const result = await stmt.all();
      
      const configs = {};
      if (result.results && Array.isArray(result.results)) {
        for (const row of result.results) {
          configs[row.config_key] = row.config_value;
        }
      }
      
      return configs;
    } catch (error) {
      console.error('Error getting all configs:', error);
      throw new Error('Failed to get all configs');
    }
  }
}

/**
 * 管理员会话相关数据库操作
 */
export class AdminSessionOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * 创建管理员会话
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<Object>} 创建结果
   */
  async createSession(sessionData) {
    const { sessionToken, ipAddress, userAgent, expiresAt } = sessionData;
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO admin_sessions (session_token, ip_address, user_agent, expires_at, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      const result = await stmt.bind(sessionToken, ipAddress, userAgent, expiresAt).run();
      
      return {
        success: result.success,
        sessionId: result.meta.last_row_id
      };
    } catch (error) {
      console.error('Error creating admin session:', error);
      throw new Error('Failed to create admin session');
    }
  }

  /**
   * 验证管理员会话
   * @param {string} sessionToken - 会话令牌
   * @returns {Promise<Object|null>} 会话信息
   */
  async validateSession(sessionToken) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM admin_sessions 
        WHERE session_token = ? AND expires_at > datetime('now')
      `);
      
      const session = await stmt.bind(sessionToken).first();
      return session || null;
    } catch (error) {
      console.error('Error validating admin session:', error);
      return null;
    }
  }

  /**
   * 删除管理员会话
   * @param {string} sessionToken - 会话令牌
   * @returns {Promise<Object>} 删除结果
   */
  async deleteSession(sessionToken) {
    try {
      const stmt = this.db.prepare('DELETE FROM admin_sessions WHERE session_token = ?');
      const result = await stmt.bind(sessionToken).run();
      
      return {
        success: result.success,
        deleted: result.meta.changes > 0
      };
    } catch (error) {
      console.error('Error deleting admin session:', error);
      throw new Error('Failed to delete admin session');
    }
  }
}

