/**
 * API 接口处理器
 */

import { UserOperations, ActionLogOperations, SystemConfigOperations } from '../database/operations.js';
import { hashUID } from '../utils/crypto.js';
import { validateUID, validateAction } from '../utils/validation.js';
import { 
  getClientIP, 
  getUserAgent, 
  createSuccessResponse, 
  createErrorResponse,
  parseRequestJSON 
} from '../utils/helpers.js';

/**
 * 查询用户状态 API
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function queryUserAPI(c) {
  try {
    const requestData = await parseRequestJSON(c.req.raw);
    const { uid } = requestData;
    
    // 验证 UID
    const uidValidation = validateUID(uid);
    if (!uidValidation.valid) {
      return createErrorResponse(uidValidation.message, 400, 'INVALID_UID');
    }
    
    const userOps = new UserOperations(c.env.DB);
    const logOps = new ActionLogOperations(c.env.DB);
    
    // 生成 UID 哈希
    const uidHash = await hashUID(uidValidation.uid);
    
    // 查找用户
    const user = await userOps.findByUIDHash(uidHash);
    
    // 记录查询操作
    await logOps.logAction({
      userId: user?.id || null,
      uidHash,
      action: 'query',
      ipAddress: getClientIP(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      success: true
    });
    
    if (!user) {
      // 统一返回消息，不泄露用户是否存在
      return createSuccessResponse({
        exists: false,
        message: '请确认账号是否正确'
      });
    }
    
    // 检查是否过期（7天未操作）
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const isExpired = user.status === 'pending' && daysDiff >= 7;
    
    return createSuccessResponse({
      exists: true,
      status: user.status,
      isExpired,
      lastActionAt: user.last_action_at,
      createdAt: user.created_at,
      daysSinceCreated: daysDiff,
      remark: user.remark || ''
    });
    
  } catch (error) {
    console.error('Query user API error:', error);
    
    // 记录错误日志
    try {
      const logOps = new ActionLogOperations(c.env.DB);
      await logOps.logAction({
        userId: null,
        uidHash: 'unknown',
        action: 'query',
        ipAddress: getClientIP(c.req.raw),
        userAgent: getUserAgent(c.req.raw),
        success: false,
        errorMessage: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return createErrorResponse('查询失败，请稍后重试', 500, 'QUERY_FAILED');
  }
}

/**
 * 执行用户操作 API
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function actionUserAPI(c) {
  try {
    const requestData = await parseRequestJSON(c.req.raw);
    const { uid, action } = requestData;
    
    // 验证 UID
    const uidValidation = validateUID(uid);
    if (!uidValidation.valid) {
      return createErrorResponse(uidValidation.message, 400, 'INVALID_UID');
    }
    
    // 验证操作类型
    const actionValidation = validateAction(action);
    if (!actionValidation.valid) {
      return createErrorResponse(actionValidation.message, 400, 'INVALID_ACTION');
    }
    
    const userOps = new UserOperations(c.env.DB);
    const logOps = new ActionLogOperations(c.env.DB);
    
    // 生成 UID 哈希
    const uidHash = await hashUID(uidValidation.uid);
    
    // 查找用户
    const user = await userOps.findByUIDHash(uidHash);
    
    if (!user) {
      // 记录失败的操作尝试
      await logOps.logAction({
        userId: null,
        uidHash,
        action: actionValidation.action,
        ipAddress: getClientIP(c.req.raw),
        userAgent: getUserAgent(c.req.raw),
        success: false,
        errorMessage: 'User not found'
      });
      
      return createErrorResponse('用户不存在或已被删除', 404, 'USER_NOT_FOUND');
    }
    
    // 检查是否已经操作过
    if (user.status !== 'pending') {
      const statusText = user.status === 'keep' ? '保留' : '删除';
      return createErrorResponse(`您已选择：${statusText}`, 400, 'ALREADY_OPERATED');
    }
    
    // 检查是否过期
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 7) {
      return createErrorResponse('操作已过期，请联系管理员', 400, 'OPERATION_EXPIRED');
    }
    
    // 更新用户状态
    const updateResult = await userOps.updateUserStatus(
      uidHash,
      actionValidation.action,
      getClientIP(c.req.raw)
    );
    
    if (!updateResult.success) {
      throw new Error('Failed to update user status');
    }
    
    // 记录操作日志
    await logOps.logAction({
      userId: user.id,
      uidHash,
      action: actionValidation.action,
      ipAddress: getClientIP(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      success: true
    });
    
    const actionText = actionValidation.action === 'keep' ? '保留' : '删除';
    
    return createSuccessResponse({
      action: actionValidation.action,
      message: `操作成功！您已选择：${actionText}`
    });
    
  } catch (error) {
    console.error('Action user API error:', error);
    
    // 记录错误日志
    try {
      const logOps = new ActionLogOperations(c.env.DB);
      await logOps.logAction({
        userId: null,
        uidHash: 'unknown',
        action: 'unknown',
        ipAddress: getClientIP(c.req.raw),
        userAgent: getUserAgent(c.req.raw),
        success: false,
        errorMessage: error.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return createErrorResponse('操作失败，请稍后重试', 500, 'ACTION_FAILED');
  }
}

/**
 * 批量导入用户 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function bulkImportUsersAPI(c) {
  try {
    const requestData = await parseRequestJSON(c.req.raw);
    const { uids } = requestData;
    
    if (!Array.isArray(uids) || uids.length === 0) {
      return createErrorResponse('UID列表不能为空', 400, 'EMPTY_UID_LIST');
    }
    
    if (uids.length > 1000) {
      return createErrorResponse('单次导入不能超过1000个UID', 400, 'TOO_MANY_UIDS');
    }
    
    const userOps = new UserOperations(c.env.DB);
    
    // 验证和清理 UID 列表（支持字符串或包含 remark 的对象）
    const validEntries = [];
    const invalidUIDs = [];
    
    for (let i = 0; i < uids.length; i++) {
      const item = uids[i];
      const rawUid = typeof item === 'string' ? item : item?.uid;
      const remark = typeof item === 'object' && item ? (item.remark ?? '') : '';
      const uidValidation = validateUID(rawUid);
      if (uidValidation.valid) {
        const entry = remark ? { uid: uidValidation.uid, remark: String(remark).trim() } : uidValidation.uid;
        validEntries.push(entry);
      } else {
        invalidUIDs.push({
          index: i + 1,
          uid: rawUid,
          error: uidValidation.message
        });
      }
    }
    
    if (validEntries.length === 0) {
      return createErrorResponse('没有有效的UID', 400, 'NO_VALID_UIDS');
    }
    
    // 执行批量导入
    const importResult = await userOps.bulkImportUsers(
      validEntries,
      getClientIP(c.req.raw)
    );
    
    return createSuccessResponse({
      imported: importResult.imported,
      duplicates: importResult.duplicates,
      errors: importResult.errors,
      invalidUIDs,
      total: uids.length,
      validCount: validEntries.length
    }, '批量导入完成');
    
  } catch (error) {
    console.error('Bulk import API error:', error);
    if (error.message === 'Invalid JSON format') {
      return createErrorResponse('请求体格式错误，期望一个包含"uids"数组的JSON对象。', 400, 'BAD_REQUEST');
    }
    return createErrorResponse('批量导入失败', 500, 'BULK_IMPORT_FAILED');
  }
}

/**
 * 获取用户列表 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function getUserListAPI(c) {
  try {
    const query = c.req.query();
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 50, 100);
    const status = query.status || 'all';
    const search = query.search || '';
    const offset = (page - 1) * limit;
    
    const userOps = new UserOperations(c.env.DB);
    
    const result = await userOps.getUserList({
      page,
      limit,
      status,
      search,
      offset
    });
    
    return createSuccessResponse(result);
    
  } catch (error) {
    console.error('Get user list API error:', error);
    return createErrorResponse('获取用户列表失败', 500, 'GET_USER_LIST_FAILED');
  }
}

/**
 * 获取统计数据 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function getStatisticsAPI(c) {
  try {
    const userOps = new UserOperations(c.env.DB);
    const stats = await userOps.getStatistics();
    
    // 添加额外的统计信息
    const additionalStats = {
      // 操作分布
      operationDistribution: {
        keep: stats.statusCounts.keep,
        delete: stats.statusCounts.delete,
        pending: stats.statusCounts.pending
      },
      
      // 完成率
      completionRate: stats.operationRate,
      
      // 过期率
      expiredRate: stats.totalUsers > 0 ? 
        Math.round((stats.expiredUsers / stats.totalUsers) * 100) : 0,
      
      // 今日活跃度
      todayActivity: {
        newUsers: stats.todayNewUsers,
        actions: stats.todayActions
      }
    };
    
    return createSuccessResponse({
      ...stats,
      ...additionalStats
    });
    
  } catch (error) {
    console.error('Get statistics API error:', error);
    return createErrorResponse('获取统计数据失败', 500, 'GET_STATISTICS_FAILED');
  }
}

/**
 * 导出用户数据 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function exportUsersAPI(c) {
  try {
    const query = c.req.query();
    const status = query.status || 'all';
    const format = query.format || 'csv';
    
    if (!['csv', 'json'].includes(format)) {
      return createErrorResponse('不支持的导出格式', 400, 'UNSUPPORTED_FORMAT');
    }
    
    const userOps = new UserOperations(c.env.DB);
    const users = await userOps.exportUsers({ status, format });
    
    if (format === 'csv') {
      const headers = ['UID', '状态', '创建时间', '最后操作时间', '操作IP', '备注'];
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.UID,
          user.状态,
          user.创建时间,
          user.最后操作时间,
          user.操作IP,
          (user.备注 || '').replaceAll('"', '""')
        ].join(','))
      ].join('\n');
      
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="users_${status}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      return new Response(JSON.stringify(users, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="users_${status}_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }
    
  } catch (error) {
    console.error('Export users API error:', error);
    return createErrorResponse('导出数据失败', 500, 'EXPORT_FAILED');
  }
}

/**
 * 获取操作日志 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function getActionLogsAPI(c) {
  try {
    const query = c.req.query();
    const limit = Math.min(parseInt(query.limit) || 100, 500);
    const offset = parseInt(query.offset) || 0;
    const action = query.action || null;
    const ipAddress = query.ip || null;
    const startTime = query.start || null;
    const endTime = query.end || null;
    
    const logOps = new ActionLogOperations(c.env.DB);
    const logs = await logOps.getActionLogs({
      limit,
      offset,
      action,
      ipAddress,
      startTime,
      endTime
    });
    
    return createSuccessResponse({
      logs,
      pagination: {
        limit,
        offset,
        hasMore: logs.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get action logs API error:', error);
    return createErrorResponse('获取操作日志失败', 500, 'GET_LOGS_FAILED');
  }
}

/**
 * 系统健康检查 API
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function healthCheckAPI(c) {
  try {
    const startTime = Date.now();
    
    // 检查数据库连接
    const dbCheck = await c.env.DB.prepare('SELECT 1 as test').first();
    const dbLatency = Date.now() - startTime;
    
    // 检查 KV 存储
    const kvStartTime = Date.now();
    await c.env.CACHE.get('health_check');
    const kvLatency = Date.now() - kvStartTime;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbCheck ? 'healthy' : 'unhealthy',
          latency: `${dbLatency}ms`
        },
        cache: {
          status: 'healthy',
          latency: `${kvLatency}ms`
        }
      },
      uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown'
    };
    
    return createSuccessResponse(health);
    
  } catch (error) {
    console.error('Health check error:', error);
    return createErrorResponse('Health check failed', 500, 'HEALTH_CHECK_FAILED');
  }
}

/**
 * 清理过期数据 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function cleanupDataAPI(c) {
  try {
    const query = c.req.query();
    const days = parseInt(query.days) || 30;
    
    if (days < 1 || days > 365) {
      return createErrorResponse('清理天数必须在1-365之间', 400, 'INVALID_DAYS');
    }
    
    const userOps = new UserOperations(c.env.DB);
    const result = await userOps.cleanupExpiredData(days);
    
    return createSuccessResponse(result, '数据清理完成');
    
  } catch (error) {
    console.error('Cleanup data API error:', error);
    return createErrorResponse('数据清理失败', 500, 'CLEANUP_FAILED');
  }
}

/**
 * 清理所有日志数据 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function cleanupAllLogsAPI(c) {
  try {
    const userOps = new UserOperations(c.env.DB);
    // 通过传递0天来清理所有日志
    const result = await userOps.cleanupAllLogs();
    
    return createSuccessResponse(result, '所有日志清理完成');
    
  } catch (error) {
    console.error('Cleanup all logs API error:', error);
    return createErrorResponse('清理所有日志失败', 500, 'CLEANUP_ALL_FAILED');
  }
}

/**
 * 保存系统设置 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function saveSettingsAPI(c) {
  try {
    const requestData = await parseRequestJSON(c.req.raw);
    const { rateLimitWindow, rateLimitMax, cleanupDays, maintenanceMode } = requestData;
    
    // 验证参数
    if (rateLimitWindow < 1 || rateLimitMax < 1 || cleanupDays < 1) {
      return createErrorResponse('请输入有效的设置值', 400, 'INVALID_SETTINGS');
    }
    
    const configOps = new SystemConfigOperations(c.env.DB);
    
    // 批量设置配置
    await configOps.setConfigs({
      rate_limit_window: rateLimitWindow.toString(),
      rate_limit_max: rateLimitMax.toString(),
      cleanup_days: cleanupDays.toString(),
      maintenance_mode: maintenanceMode ? 'true' : 'false'
    });
    
    // 记录操作日志
    const logOps = new ActionLogOperations(c.env.DB);
    await logOps.logAction({
      userId: null,
      uidHash: 'system',
      action: 'save_settings',
      ipAddress: getClientIP(c.req.raw),
      userAgent: getUserAgent(c.req.raw),
      success: true,
      details: JSON.stringify({
        rateLimitWindow,
        rateLimitMax,
        cleanupDays,
        maintenanceMode
      })
    });
    
    return createSuccessResponse({}, '设置保存成功');
  } catch (error) {
    console.error('Save settings API error:', error);
    return createErrorResponse('保存设置失败', 500, 'SAVE_SETTINGS_FAILED');
  }
}

/**
 * 获取系统设置 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function getSettingsAPI(c) {
  try {
    const configOps = new SystemConfigOperations(c.env.DB);
    const configs = await configOps.getAllConfigs();
    
    // 返回默认值和实际值的合并结果
    return createSuccessResponse({
      rateLimitWindow: parseInt(configs.rate_limit_window || '60'),
      rateLimitMax: parseInt(configs.rate_limit_max || '100'),
      cleanupDays: parseInt(configs.cleanup_days || '30'),
      maintenanceMode: configs.maintenance_mode === 'true'
    });
  } catch (error) {
    console.error('Get settings API error:', error);
    return createErrorResponse('获取设置失败', 500, 'GET_SETTINGS_FAILED');
  }
}

/**
 * 批量删除用户 API（管理员）
 * @param {Object} c - Hono 上下文
 * @returns {Response} API 响应
 */
export async function bulkDeleteUsersAPI(c) {
  try {
    const requestData = await parseRequestJSON(c.req.raw);
    const { uidHashes } = requestData;
    if (!Array.isArray(uidHashes) || uidHashes.length === 0) {
      return createErrorResponse('请选择要删除的用户', 400, 'EMPTY_SELECTION');
    }

    const userOps = new UserOperations(c.env.DB);
    const del = await userOps.bulkDeleteUsers(uidHashes);

    // 记录日志（仅写 uid_hash、操作类型）
    const logOps = new ActionLogOperations(c.env.DB);
    for (const uidHash of uidHashes) {
      await logOps.logAction({
        userId: null,
        uidHash,
        action: 'delete',
        ipAddress: getClientIP(c.req.raw),
        userAgent: getUserAgent(c.req.raw),
        success: true
      });
    }

    return createSuccessResponse({ deleted: del.deleted, logsDeleted: del.logsDeleted }, '批量删除完成');
  } catch (error) {
    console.error('Bulk delete users API error:', error);
    return createErrorResponse('批量删除失败', 500, 'BULK_DELETE_FAILED');
  }
}

