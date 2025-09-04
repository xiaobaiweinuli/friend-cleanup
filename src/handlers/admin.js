/**
 * 后台管理页面处理器
 */

import { createHTMLResponse } from '../utils/helpers.js';

/**
 * 管理员后台首页处理器
 * @param {Object} c - Hono 上下文
 * @returns {Response} HTML 响应
 */
export async function adminHandler(c) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - 好友清理系统</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <style>
        :root {
            --sidebar-width: 280px;
            --header-height: 60px;
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8;
            --light-color: #f8f9fa;
            --dark-color: #343a40;
        }
        
        /* 第一步：全局背景和字体 */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-attachment: fixed;
            min-height: 100vh;
            margin: 0;
            padding: 0;
        }
        
        /* 第二步：新增通用卡片基类 */
        .content-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        .content-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }
        
        /* 小屏幕卡片样式优化 */
        @media (max-width: 768px) {
            .content-card {
                padding: 1.25rem;
                margin-left: 1rem;
                margin-right: 1rem;
                border-radius: 15px;
            }
        }
        
        /* 超小屏幕优化 */
        @media (max-width: 480px) {
            .content-card {
                padding: 1rem;
                margin-left: 0.75rem;
                margin-right: 0.75rem;
            }
        }
        
        /* 侧边栏样式 */
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: var(--sidebar-width);
            background: #2c3e50;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            z-index: 1000;
            transition: transform 0.3s ease;
            overflow-y: auto;
        }
        
        .sidebar.collapsed {
            transform: translateX(-100%);
        }
        
        .sidebar-header {
            padding: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-brand {
            font-size: 1.25rem;
            font-weight: 600;
            color: white;
            text-decoration: none;
        }
        
        .sidebar-nav {
            padding: 1rem 0;
        }
        
        .nav-item {
            margin-bottom: 0.25rem;
        }
        
        .nav-link {
            color: rgba(255, 255, 255, 0.8);
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        
        .nav-link:hover,
        .nav-link.active {
            color: white;
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .nav-link i {
            width: 20px;
            margin-right: 0.75rem;
        }
        
        /* 主内容区域 */
        .main-content {
            margin-left: var(--sidebar-width);
            min-height: 100vh;
            transition: margin-left 0.3s ease;
        }
        
        .main-content.expanded {
            margin-left: 0;
        }
        
        /* 第三步：优化顶部导航栏 */
        .top-navbar {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            height: var(--header-height);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            padding: 0 1.5rem;
            position: sticky;
            top: 0;
            z-index: 999;
        }
        
        .navbar-toggle {
            background: none;
            border: none;
            font-size: 1.25rem;
            color: var(--dark-color);
            margin-right: 1rem;
        }
        
        .navbar-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--dark-color);
            margin: 0;
        }
        
        .navbar-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        /* 内容区域 */
        .content-wrapper {
            padding: 2rem;
        }
        
        /* 统计卡片 - 使用新的内容卡片样式 */
        .stats-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            border-left: 4px solid var(--primary-color);
            transition: all 0.3s ease;
            margin-bottom: 1.5rem;
        }
        
        .stats-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }
        
        .stats-card.success {
            border-left-color: var(--success-color);
        }
        
        .stats-card.danger {
            border-left-color: var(--danger-color);
        }
        
        .stats-card.warning {
            border-left-color: var(--warning-color);
        }
        
        .stats-card.info {
            border-left-color: var(--info-color);
        }
        
        .stats-number {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .stats-label {
            color: var(--secondary-color);
            font-size: 0.9rem;
            margin-bottom: 0;
        }
        
        .stats-icon {
            font-size: 2.5rem;
            opacity: 0.3;
            float: right;
            margin-top: -1rem;
        }
        
        /* 表格样式 - 现代卡片式设计 */
        
        /* 复用内容卡片样式作为表格容器 */
        
        /* 修改表格头部样式 */
        .table-header {
            background: transparent; /* 让它透明，与卡片背景融为一体 */
            padding: 1.25rem 1.5rem; /* 增加一点垂直内边距 */
            border-bottom: 1px solid rgba(0, 0, 0, 0.05); /* 使用更柔和的分割线 */
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .table-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0;
        }
        
        .table-responsive {
            max-height: 600px;
            overflow-y: auto;
        }
        
        /* --- 优化表格样式，确保所有表格显示一致 --- */
        
        /* 基础表格样式 */
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
            table-layout: auto;
        }
        
        /* 表头样式 */
        .table th {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            color: #212529;
            font-weight: 600;
            font-size: 0.9rem;
            padding: 0.75rem 1rem;
            text-align: left;
            white-space: nowrap;
        }
        
        /* 表格单元格样式 */
        .table td {
            border: 1px solid #dee2e6;
            color: #212529;
            font-weight: 400;
            padding: 0.75rem 1rem;
            vertical-align: middle;
            word-break: break-word;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }
        
        /* 表格行样式 */
        .table tbody tr {
            background-color: white;
            transition: background-color 0.2s ease-in-out;
        }
        
        .table tbody tr:hover {
            background-color: #f8f9fa;
        }
        
        /* 固定列宽设置 */
        /* 时间列默认宽度 */
        .table th:first-child,
        .table td:first-child {
            width: 160px;
            text-align: left;
        }
        
        /* 复选框列特殊处理 */
        .table th:first-child:has(input[type="checkbox"]),
        .table td:first-child:has(input[type="checkbox"]) {
            width: 50px;
            text-align: center;
        }
        
        /* 状态徽章样式 - 统一设置 */
        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        /* 状态徽章具体样式 */
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-keep {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-delete {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-expired {
            background-color: #f1f3f4;
            color: #5f6368;
        }
        
        /* 表格响应式增强 */
        @media (max-width: 992px) {
            .table-responsive {
                font-size: 0.9rem;
                overflow-x: auto;
            }
            
            .table th,
            .table td {
                padding: 0.5rem 0.75rem;
            }
        }
        
        @media (max-width: 768px) {
            .table-responsive {
                font-size: 0.85rem;
            }
            
            /* 在小屏幕上隐藏部分不重要的列 */
            .hide-on-mobile {
                display: none;
            }
        }
        
        /* 图表容器 - 使用新的内容卡片样式 */
        .chart-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            height: 400px;
            margin-bottom: 1.5rem;
        }
        
        /* 表单容器 - 使用新的内容卡片样式 */
        .form-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin-bottom: 1.5rem;
        }
        
        /* --- 新增样式，用于美化筛选工具栏 --- */
        
        .filter-toolbar {
            display: flex;                 /* 1. 启用 Flexbox 布局 */
            justify-content: space-between;/* 2. 两端对齐：让控件组和操作组分别靠在左右两侧 */
            align-items: center;           /* 3. 垂直居中对齐所有元素 */
            gap: 1rem;                     /* 4. 在主容器的子元素间添加间距 */
            flex-wrap: wrap;               /* 5. 在小屏幕上允许换行 */
        }
        
        .filter-controls {
            display: flex;
            align-items: center;
            gap: 1rem;                     /* 在筛选控件内部也添加间距 */
            flex-grow: 1;                  /* 允许该组伸展以占据可用空间 */
        }
        
        .filter-controls .form-control {
            min-width: 200px;              /* 给搜索框一个最小宽度 */
        }
        
        .filter-actions {
            /* 这个容器目前不需要特定样式，留作未来扩展 */
        }
        
        /* 响应式调整：在小屏幕上，让工具栏垂直堆叠 */
        @media (max-width: 768px) {
            .filter-toolbar {
                flex-direction: column;    /* 垂直排列 */
                align-items: stretch;      /* 让子元素撑满宽度 */
            }
        
            .filter-controls {
                flex-direction: column;
                width: 100%;
            }
        
            .filter-controls .btn {
                width: 100%;
            }
        
            .filter-actions .btn {
                width: 100%;
            }
        }
        
        /* 统一表单控件样式 */
        .form-control,
        .form-select {
            border-radius: 15px;
            border: 2px solid #e9ecef;
            padding: 12px 20px;
            font-size: 1rem;
            transition: all 0.3s ease;
            max-width: 100%;
            box-sizing: border-box;
        }
        
        .form-control:focus,
        .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        /* 移动端文本域优化 */
        .form-control[type="text"],
        .form-control[type="email"],
        .form-control[type="password"],
        .form-control[type="number"],
        textarea.form-control {
            width: 100%;
            resize: vertical;
            min-height: 42px;
        }
        
        /* 小屏幕优化 */
        @media (max-width: 768px) {
            .form-control,
            .form-select {
                padding: 10px 15px;
                font-size: 0.9rem;
            }
        }
        
        /* 统一按钮样式 */
        .btn {
            border-radius: 15px;
            padding: 12px 25px;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            color: white;
        }
        
        .btn-success {
            background: linear-gradient(135deg, var(--success-color), #20c997);
            color: white;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, var(--danger-color), #e03131);
            color: white;
        }
        
        .btn-warning {
            background: linear-gradient(135deg, var(--warning-color), #fd7e14);
            color: #212529;
        }
        
        .btn-outline-primary {
            border: 1px solid var(--primary-color);
            color: var(--primary-color);
            background-color: transparent;
            border-radius: 15px;
            padding: 12px 25px;
        }
        
        .btn-outline-primary:hover {
            background-color: var(--primary-color);
            color: white;
        }
        
        .btn-outline-secondary {
            border: 1px solid var(--secondary-color);
            color: var(--secondary-color);
            background-color: transparent;
            border-radius: 15px;
            padding: 12px 25px;
        }
        
        .btn-outline-secondary:hover {
            background-color: var(--secondary-color);
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .btn-sm {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            border-radius: 10px;
        }
        
        /* 分页样式 */
        .pagination {
            justify-content: center;
            margin-top: 1rem;
        }
        
        .page-link {
            border-radius: 10px;
            margin: 0 0.25rem;
            border: 1px solid #ddd;
            transition: all 0.3s ease;
        }
        
        .page-item.active .page-link {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            border-color: var(--primary-color);
            color: white;
        }
        
        .page-link:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }
            
            .sidebar.show {
                transform: translateX(0);
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .content-wrapper {
                padding: 1rem;
            }
            
            .stats-card {
                margin-bottom: 1rem;
            }
        }
        
        /* 加载动画 */
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* 隐藏类 */
        .d-none {
            display: none !important;
        }
        
        .show {
            display: block !important;
        }
        
        /* 允许textarea的placeholder中的换行符生效 */
        textarea::placeholder {
            white-space: pre-line;
        }
    </style>
</head>
<body>
    <!-- 侧边栏 -->
    <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <a href="#" class="sidebar-brand">
                <i class="fas fa-users-cog me-2"></i>
                管理后台
            </a>
        </div>
        <ul class="sidebar-nav">
            <li class="nav-item">
                <a href="#dashboard" class="nav-link active" data-page="dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    仪表盘
                </a>
            </li>
            <li class="nav-item">
                <a href="#users" class="nav-link" data-page="users">
                    <i class="fas fa-users"></i>
                    用户管理
                </a>
            </li>
            <li class="nav-item">
                <a href="#import" class="nav-link" data-page="import">
                    <i class="fas fa-upload"></i>
                    批量导入
                </a>
            </li>
            <li class="nav-item">
                <a href="#logs" class="nav-link" data-page="logs">
                    <i class="fas fa-list-alt"></i>
                    操作日志
                </a>
            </li>
            <li class="nav-item">
                <a href="#settings" class="nav-link" data-page="settings">
                    <i class="fas fa-cog"></i>
                    系统设置
                </a>
            </li>
        </ul>
    </nav>

    <!-- 主内容区域 -->
    <div class="main-content" id="mainContent">
        <!-- 顶部导航栏 -->
        <nav class="top-navbar">
            <button class="navbar-toggle" id="sidebarToggle">
                <i class="fas fa-bars"></i>
            </button>
            <h1 class="navbar-title" id="pageTitle">仪表盘</h1>
            <div class="navbar-actions">
                <span class="text-muted me-3">
                    <i class="fas fa-clock me-1"></i>
                    <span id="currentTime"></span>
                </span>
                <a href="/" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-home me-1"></i>
                    返回首页
                </a>
            </div>
        </nav>

        <!-- 内容区域 -->
        <div class="content-wrapper">
            <!-- 仪表盘页面 -->
            <div id="dashboardPage" class="page-content">
                <!-- 统计卡片 -->
                <div class="row mb-4">
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="stats-card" id="cardTotal" style="cursor:pointer">
                            <div class="stats-number text-primary" id="totalUsers">-</div>
                            <div class="stats-label">总用户数</div>
                            <i class="fas fa-users stats-icon text-primary"></i>
                        </div>
                    </div>
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="stats-card success" id="cardKeep" style="cursor:pointer">
                            <div class="stats-number text-success" id="keepUsers">-</div>
                            <div class="stats-label">选择保留</div>
                            <i class="fas fa-heart stats-icon text-success"></i>
                        </div>
                    </div>
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="stats-card danger" id="cardDelete" style="cursor:pointer">
                            <div class="stats-number text-danger" id="deleteUsers">-</div>
                            <div class="stats-label">选择删除</div>
                            <i class="fas fa-trash stats-icon text-danger"></i>
                        </div>
                    </div>
                    <div class="col-xl-3 col-md-6 mb-3">
                        <div class="stats-card warning" id="cardPending" style="cursor:pointer">
                            <div class="stats-number text-warning" id="pendingUsers">-</div>
                            <div class="stats-label">待操作</div>
                            <i class="fas fa-clock stats-icon text-warning"></i>
                        </div>
                    </div>
                </div>

                <!-- 图表区域 -->
                <div class="row mb-4">
                    <div class="col-lg-8 mb-3">
                        <div class="chart-container">
                            <h5 class="mb-3">操作统计</h5>
                            <canvas id="operationChart"></canvas>
                        </div>
                    </div>
                    <div class="col-lg-4 mb-3">
                        <div class="chart-container">
                            <h5 class="mb-3">状态分布</h5>
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- 最近活动 -->
                <div class="row">
                    <div class="col-12">
                        <div class="table-container">
                            <div class="table-header">
                                <h5 class="table-title">最近活动</h5>
                                <div class="d-flex gap-2">
                                    <a href="#logs" class="btn btn-outline-primary btn-sm" onclick="adminPanel.switchPage('logs'); return false;">
                                        <i class="fas fa-list me-1"></i>查看全部
                                    </a>
                                    <button class="btn btn-outline-primary btn-sm" onclick="refreshRecentActivity()">
                                        <i class="fas fa-refresh me-1"></i>刷新
                                    </button>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>时间</th>
                                            <th>备注</th>
                                            <th>操作</th>
                                            <th>结果</th>
                                        </tr>
                                    </thead>
                                    <tbody id="recentActivityTable">
                                        <tr>
                                            <td colspan="4" class="text-center">
                                                <div class="loading">
                                                    <div class="spinner"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 用户管理页面 -->
            <div id="usersPage" class="page-content d-none">
                <!-- 搜索和筛选 -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="form-container">
                            <div class="filter-toolbar">
                                <!-- 1. 筛选控件组 -->
                                <div class="filter-controls">
                                    <input type="text" class="form-control" id="userSearch" placeholder="搜索用户...">
                                    <select class="form-select" id="statusFilter">
                                        <option value="all">所有状态</option>
                                        <option value="pending">待操作</option>
                                        <option value="keep">保留</option>
                                        <option value="delete">删除</option>
                                        <option value="expired">已过期</option>
                                    </select>
                                    <button class="btn btn-primary" onclick="searchUsers()">
                                        <i class="fas fa-search me-1"></i>搜索
                                    </button>
                                </div>
                            
                                <!-- 2. 操作按钮组 -->
                                <div class="filter-actions">
                                    <button class="btn btn-success" onclick="exportUsers()">
                                        <i class="fas fa-download me-1"></i>导出数据
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 用户列表 -->
                <div class="row">
                    <div class="col-12">
                        <div class="table-container">
                            <div class="table-header">
                                <h5 class="table-title">用户列表</h5>
                                <div>
                                    <span class="text-muted me-3" id="userCount">总计: 0 个用户</span>
                                    <button class="btn btn-danger btn-sm me-2" onclick="bulkDeleteSelected()">
                                        <i class="fas fa-trash me-1"></i>批量删除
                                    </button>
                                    <button class="btn btn-outline-primary btn-sm" onclick="refreshUsers()">
                                        <i class="fas fa-refresh me-1"></i>刷新
                                    </button>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:50px"><input type="checkbox" id="selectAllUsers"></th>
                                            <th>用户ID</th>
                                            <th>状态</th>
                                            <th>创建时间</th>
                                            <th class="hide-on-mobile">最后操作</th>
                                            <th class="hide-on-mobile">操作IP</th>
                                            <th>备注</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="usersTable">
                                        <tr>
                                            <td colspan="8" class="text-center">
                                                <div class="loading">
                                                    <div class="spinner"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!-- 分页 -->
                            <nav aria-label="用户列表分页" class="p-3">
                                <ul class="pagination" id="usersPagination">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 批量导入页面 -->
            <div id="importPage" class="page-content d-none">
                <!-- 1. 使用 Flexbox 实现垂直居中容器 -->
                <div class="d-flex justify-content-center align-items-center px-4 py-6" style="min-height: 70vh;">
                    <!-- 2. 响应式容器 - 在移动端自动适应宽度 -->
                    <div class="w-100 max-w-2xl">
                        <!-- 3. 应用我们之前定义的通用卡片样式 -->
                        <div class="content-card">
                            <div class="card-body p-4">
                                <!-- 3. 更具设计感的标题 -->
                                <div class="text-center mb-4">
                                    <h2 class="h3 fw-bold">批量导入用户</h2>
                                    <p class="text-muted">请在下方粘贴用户ID列表，每行一个。</p>
                                </div>

                                <!-- 4. 文本输入区 -->
                                <div class="mb-4">
                                    <textarea class="form-control" id="importText" rows="12" 
                                              placeholder="例如：
12345678
wxid_example
13800138000"></textarea>
                                    <div class="form-text mt-2">
                                        <i class="fas fa-info-circle me-1"></i>
                                        支持QQ号、微信号、手机号等格式。
                                    </div>
                                </div>

                                <!-- 5. 现代化的按钮对齐 -->
                                <div class="d-flex justify-content-end gap-3">
                                    <button class="btn btn-outline-secondary" onclick="clearImportText()">
                                        <i class="fas fa-eraser me-1"></i>清空
                                    </button>
                                    <button class="btn btn-primary" onclick="importUsers()" id="importBtn">
                                        <i class="fas fa-upload me-1"></i>开始导入
                                    </button>
                                </div>
                                
                                <!-- 6. 导入结果显示区域 -->
                                <div id="importResult" class="mt-4 d-none">
                                    <div class="alert alert-info rounded-3">
                                        <h6 class="fw-bold"><i class="fas fa-check-circle me-2"></i>导入结果</h6>
                                        <div id="importSummary"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 操作日志页面 -->
            <div id="logsPage" class="page-content d-none">
                <div class="row">
                    <div class="col-12">
                        <div class="table-container">
                            <div class="table-header">
                                <h5 class="table-title">操作日志</h5>
                                <button class="btn btn-outline-primary btn-sm" onclick="refreshLogs()">
                                    <i class="fas fa-refresh me-1"></i>刷新
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>时间</th>
                                            <th>用户</th>
                                            <th>操作</th>
                                            <th>状态</th>
                                            <th class="hide-on-mobile">IP地址</th>
                                            <th class="hide-on-mobile">用户代理</th>
                                        </tr>
                                    </thead>
                                    <tbody id="logsTable">
                                        <tr>
                                            <td colspan="6" class="text-center">
                                                <div class="loading">
                                                    <div class="spinner"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 系统设置页面 -->
            <div id="settingsPage" class="page-content d-none">
                <div class="row">
                    <div class="col-lg-8 mx-auto">
                        <div class="form-container">
                            <h5 class="mb-4">系统设置</h5>
                            
                            <!-- 限速设置 -->
                            <div class="mb-4">
                                <h6>访问限制</h6>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label for="rateLimitWindow" class="form-label">限速时间窗口（秒）</label>
                                        <input type="number" class="form-control" id="rateLimitWindow" value="60">
                                    </div>
                                    <div class="col-md-6">
                                        <label for="rateLimitMax" class="form-label">最大请求次数</label>
                                        <input type="number" class="form-control" id="rateLimitMax" value="5">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 清理设置 -->
                            <div class="mb-4">
                                <h6>数据清理</h6>
                                <div class="row g-3 mb-3">
                                    <div class="col-md-6">
                                        <label for="cleanupDays" class="form-label">数据保留天数</label>
                                        <input type="number" class="form-control" id="cleanupDays" value="30">
                                        <small class="form-text text-muted">设置后会清理早于该天数的日志数据</small>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="d-grid gap-2">
                                            <label class="form-label">&nbsp;</label>
                                            <button class="btn btn-warning" onclick="cleanupData()">
                                                <i class="fas fa-broom me-1"></i>清理过期日志
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="row g-3">
                                    <div class="col">
                                        <div class="d-grid gap-2">
                                            <button class="btn btn-danger" onclick="cleanupAllLogs()">
                                                <i class="fas fa-trash-alt me-1"></i>清理所有日志
                                            </button>
                                            <small class="form-text text-danger">警告：此操作将删除所有日志数据，不可撤销！</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 维护模式 -->
                            <div class="mb-4">
                                <h6>维护模式</h6>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="maintenanceMode">
                                    <label class="form-check-label" for="maintenanceMode">
                                        启用维护模式（前台用户将无法访问）
                                    </label>
                                </div>
                            </div>
                            
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button class="btn btn-primary" onclick="saveSettings()">
                                    <i class="fas fa-save me-1"></i>保存设置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- 清理工具 JS -->
    <script src="/cleanup-utils.js"></script>
    
    <!-- 明细列表弹窗 -->
    <div class="modal fade" id="statusDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered modal-fullscreen-sm-down">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="statusDetailTitle">明细</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="statusDetailContent" class="list-group"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
          </div>
        </div>
      </div>
    </div>

    <script>
        class AdminPanel {
            constructor( ) {
                this.currentPage = 'dashboard';
                this.currentUserPage = 1;
                this.userPageSize = 50;
                this.charts = {};
                
                this.initializeElements();
                this.bindEvents();
                this.updateTime();
                this.loadDashboard();
                
                // 每30秒更新一次时间
                setInterval(() => this.updateTime(), 30000);
            }
            
            initializeElements() {
                this.elements = {
                    sidebar: document.getElementById('sidebar'),
                    sidebarToggle: document.getElementById('sidebarToggle'),
                    mainContent: document.getElementById('mainContent'),
                    pageTitle: document.getElementById('pageTitle'),
                    currentTime: document.getElementById('currentTime'),
                    cardTotal: document.getElementById('cardTotal'),
                    cardKeep: document.getElementById('cardKeep'),
                    cardDelete: document.getElementById('cardDelete'),
                    cardPending: document.getElementById('cardPending'),
                    statusDetailModal: document.getElementById('statusDetailModal'),
                    statusDetailTitle: document.getElementById('statusDetailTitle'),
                    statusDetailContent: document.getElementById('statusDetailContent')
                };
            }
            
            bindEvents() {
                // 侧边栏切换
                this.elements.sidebarToggle.addEventListener('click', () => {
                    this.toggleSidebar();
                });
                
                // 导航链接点击
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const page = link.dataset.page;
                        this.switchPage(page);
                    });
                });
                // 统计卡片点击
                this.elements.cardTotal?.addEventListener('click', () => this.showStatusDetails('all', '总用户数'));
                this.elements.cardKeep?.addEventListener('click', () => this.showStatusDetails('keep', '选择保留'));
                this.elements.cardDelete?.addEventListener('click', () => this.showStatusDetails('delete', '选择删除'));
                this.elements.cardPending?.addEventListener('click', () => this.showStatusDetails('pending', '待操作'));
                
                // 响应式处理
                window.addEventListener('resize', () => {
                    this.handleResize();
                });
            }

            async showStatusDetails(status, title) {
                try {
                    const params = new URLSearchParams({
                        page: '1',
                        limit: '500',
                        search: '',
                        status: status,
                        ts: Date.now().toString()
                    });
                    const response = await fetch('/api/admin/users?' + params.toString());
                    const result = await response.json();
                    if (!result.success) return;

                    const users = (result.data?.users) || [];
                    this.elements.statusDetailTitle.textContent = title + '（' + users.length + '）';
                    const html = users.map(u => {
                        const text = (u.remark ? this.escapeHTML(u.remark) + ' - ' : '') + this.escapeHTML(u.uid);
                        return '<div class="list-group-item">' + text + '</div>';
                    }).join('');
                    this.elements.statusDetailContent.innerHTML = html || '<div class="text-muted">暂无数据</div>';

                    const modal = new bootstrap.Modal(this.elements.statusDetailModal);
                    modal.show();
                } catch (e) {
                    console.error('Show status details error:', e);
                }
            }
            
            toggleSidebar() {
                if (window.innerWidth <= 768) {
                    this.elements.sidebar.classList.toggle('show');
                } else {
                    this.elements.sidebar.classList.toggle('collapsed');
                    this.elements.mainContent.classList.toggle('expanded');
                }
            }
            
            handleResize() {
                if (window.innerWidth > 768) {
                    this.elements.sidebar.classList.remove('show');
                }
            }
            
            switchPage(page) {
                // 更新导航状态
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                document.querySelector(\`[data-page="\${page}"]\`).classList.add('active');
                
                // 隐藏所有页面
                document.querySelectorAll('.page-content').forEach(pageEl => {
                    pageEl.classList.add('d-none');
                });
                
                // 显示目标页面
                document.getElementById(\`\${page}Page\`).classList.remove('d-none');
                
                // 更新页面标题
                const titles = {
                    dashboard: '仪表盘',
                    users: '用户管理',
                    import: '批量导入',
                    logs: '操作日志',
                    settings: '系统设置'
                };
                this.elements.pageTitle.textContent = titles[page];
                
                // 加载页面数据
                this.loadPageData(page);
                this.currentPage = page;
                
                // 移动端自动收起侧边栏
                if (window.innerWidth <= 768) {
                    this.elements.sidebar.classList.remove('show');
                }
            }
            
            loadPageData(page) {
                switch (page) {
                    case 'dashboard':
                        this.loadDashboard();
                        break;
                    case 'users':
                        this.loadUsers();
                        break;
                    case 'logs':
                        this.loadLogs();
                        break;
                    case 'settings':
                        this.loadSettings();
                        break;
                }
            }
            
            updateTime() {
                const now = new Date();
                const timeString = now.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                this.elements.currentTime.textContent = timeString;
            }
            
            async loadDashboard() {
                try {
                    const response = await fetch('/api/admin/stats');
                    const result = await response.json();
                    
                    if (result.success) {
                        this.updateDashboardStats(result.data);
                        this.updateCharts(result.data);
                    }
                } catch (error) {
                    console.error('Failed to load dashboard:', error);
                }
                
                // 加载最近活动
                this.loadRecentActivity();
            }
            
            updateDashboardStats(stats) {
                document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                document.getElementById('keepUsers').textContent = stats.statusCounts?.keep || 0;
                document.getElementById('deleteUsers').textContent = stats.statusCounts?.delete || 0;
                document.getElementById('pendingUsers').textContent = stats.statusCounts?.pending || 0;
            }
            
            updateCharts(stats) {
                const keep = stats.statusCounts?.keep || 0;
                const del = stats.statusCounts?.delete || 0;
                const pending = stats.statusCounts?.pending || 0;
                const total = (keep + del + pending) || 0;

                // 操作统计图表（优化：圆角柱、最大宽度、柔和网格、数值提示）
                const operationCtx = document.getElementById('operationChart').getContext('2d');
                if (this.charts.operation) this.charts.operation.destroy();
                this.charts.operation = new Chart(operationCtx, {
                    type: 'bar',
                    data: {
                        labels: ['保留', '删除', '待操作'],
                        datasets: [{
                            label: '用户数量',
                            data: [keep, del, pending],
                            backgroundColor: [
                                'rgba(40, 167, 69, 0.85)',
                                'rgba(220, 53, 69, 0.85)',
                                'rgba(255, 193, 7, 0.85)'
                            ],
                            borderRadius: 10,
                            maxBarThickness: 60,
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { bottom: 24 } },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: {
                                    maxRotation: 0,
                                    autoSkip: true,
                                    padding: 8
                                }
                            },
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.05)' },
                                ticks: { precision: 0 }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => ' ' + ctx.dataset.label + ': ' + ctx.parsed.y
                                }
                            },
                            legend: { display: false }
                        },
                        animation: { duration: 600, easing: 'easeOutQuart' }
                    }
                });

                // 状态分布（优化：环形厚度、悬浮偏移、百分比提示、中心总数）
                const statusCtx = document.getElementById('statusChart').getContext('2d');
                if (this.charts.status) this.charts.status.destroy();
                const centerText = {
                    id: 'centerText',
                    afterDraw(chart) {
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return;
                        ctx.save();
                        ctx.fillStyle = '#6c757d';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '600 16px Segoe UI, Tahoma';
                        const centerX = (chartArea.left + chartArea.right) / 2;
                        const centerY = (chartArea.top + chartArea.bottom) / 2;
                        ctx.fillText('总数', centerX, centerY - 12);
                        ctx.font = '700 22px Segoe UI, Tahoma';
                        ctx.fillStyle = '#343a40';
                        ctx.fillText(String(total), centerX, centerY + 12);
                        ctx.restore();
                    }
                };
                this.charts.status = new Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['保留', '删除', '待操作'],
                        datasets: [{
                            data: [keep, del, pending],
                            backgroundColor: [
                                'rgba(40, 167, 69, 0.85)',
                                'rgba(220, 53, 69, 0.85)',
                                'rgba(255, 193, 7, 0.85)'
                            ],
                            hoverOffset: 8,
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { bottom: 16 } },
                        cutout: '65%',
                        plugins: {
                            legend: { position: 'bottom' },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => {
                                        const value = ctx.parsed;
                                        const pct = total ? Math.round((value / total) * 100) : 0;
                                        return ' ' + ctx.label + ': ' + value + '（' + pct + '%）';
                                    }
                                }
                            }
                        },
                        animation: { duration: 600, easing: 'easeOutQuart' }
                    },
                    plugins: [centerText]
                });
            }
            
            async loadRecentActivity() {
                try {
                    const response = await fetch('/api/admin/logs?limit=10');
                    const result = await response.json();
                    
                    if (result.success) {
                        this.updateRecentActivityTable(result.data.logs);
                    }
                } catch (error) {
                    console.error('Failed to load recent activity:', error);
                }
            }
            
            updateRecentActivityTable(logs) {
                const tbody = document.getElementById('recentActivityTable');
                
                if (!logs || logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">暂无活动记录</td></tr>';
                    return;
                }
                
                tbody.innerHTML = logs.map(log => \`
                    <tr>
                        <td>\${log.createdAtFormatted}</td>
                        <td>\${log.remark || '-'} - \${log.uid || '-'}</td>
                        <td>
                            <span class="status-badge \${log.success ? 'status-keep' : 'status-delete'}">
                                \${this.getActionText(log.action)}
                            </span>
                        </td>
                        <td>\${log.success ? '成功' : '失败'}</td>
                    </tr>
                \`).join('');
            }
            
            async loadUsers(page = 1) {
                this.currentUserPage = page;
                try {
                    const search = document.getElementById('userSearch')?.value || '';
                    const status = document.getElementById('statusFilter')?.value || 'all';
                    
                    const params = new URLSearchParams({
                        page: page.toString(),
                        limit: this.userPageSize.toString(),
                        search,
                        status
                    });
                    params.set('ts', Date.now().toString());
                    
                    const response = await fetch('/api/admin/users?' + params.toString());
                    const result = await response.json();
                    
                    if (result.success) {
                        this.updateUsersTable(result.data.users);
                        this.updateUsersPagination(result.data.pagination);
                        document.getElementById('userCount').textContent = \`总计: \${result.data.pagination.total} 个用户\`;
                    }
                } catch (error) {
                    console.error('Failed to load users:', error);
                }
            }
            
            updateUsersTable(users) {
                const tbody = document.getElementById('usersTable');
                
                if (!users || users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无用户数据</td></tr>';
                    return;
                }
                
                tbody.innerHTML = users.map(user => \`
                    <tr>
                        <td><input type="checkbox" class="user-select" value="\${user.uid_hash}" /></td>
                        <td>\${user.uid}</td>
                        <td>
                            <span class="status-badge status-\${user.status} \${user.isExpired ? 'status-expired' : ''}">
                                \${this.getStatusText(user.status, user.isExpired)}
                            </span>
                        </td>
                        <td>\${user.createdAtFormatted}</td>
                        <td class="hide-on-mobile">\${user.lastActionAtFormatted}</td>
                        <td class="hide-on-mobile">\${user.ip_address || '-'}</td>
                        <td>\${user.remark ? this.escapeHTML(user.remark) : '-'}</td>
                        <td>
                            <button class="btn btn-outline-info btn-sm" onclick="viewUserDetails('\${user.uid_hash}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                \`).join('');
                const selectAll = document.getElementById('selectAllUsers');
                if (selectAll) {
                    selectAll.checked = false;
                    selectAll.onclick = () => {
                        document.querySelectorAll('.user-select').forEach(cb => cb.checked = selectAll.checked);
                    };
                }
            }

            escapeHTML(str) {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
            
            updateUsersPagination(pagination) {
                const paginationEl = document.getElementById('usersPagination');
                
                if (!pagination || pagination.totalPages <= 1) {
                    paginationEl.innerHTML = '';
                    return;
                }

                const { page, totalPages, hasPrevPage, hasNextPage } = pagination;
                
                let html = '';
                
                // 上一页
                html += \`
                    <li class="page-item \${!hasPrevPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="event.preventDefault(); adminPanel.loadUsers(\${page - 1})">上一页</a>
                    </li>
                \`;
                
                // 页码
                const startPage = Math.max(1, page - 2);
                const endPage = Math.min(totalPages, page + 2);
                
                for (let i = startPage; i <= endPage; i++) {
                    html += \`
                        <li class="page-item \${i === page ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); adminPanel.loadUsers(\${i})">\${i}</a>
                        </li>
                    \`;
                }
                
                // 下一页
                html += \`
                    <li class="page-item \${!hasNextPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="event.preventDefault(); adminPanel.loadUsers(\${page + 1})">下一页</a>
                    </li>
                \`;
                
                paginationEl.innerHTML = html;
            }
            
            async loadLogs() {
                try {
                    // 添加时间戳参数避免缓存
                    const response = await fetch('/api/admin/logs?limit=100&t=' + Date.now(), {
                        headers: {
                            'Cache-Control': 'no-cache'
                        }
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        // 清空现有表格内容，然后再填充新数据，确保用户看到更新过程
                        const logsTable = document.getElementById('logsTable');
                        logsTable.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-5"><div class="spinner"></div><p class="mt-2">加载日志中...</p></td></tr>';
                        
                        // 短暂延迟后再更新表格，确保用户看到刷新效果
                        setTimeout(() => {
                            this.updateLogsTable(result.data.logs);
                        }, 100);
                    }
                } catch (error) {
                    console.error('Failed to load logs:', error);
                    document.getElementById('logsTable').innerHTML = '<tr><td colspan="6" class="text-center text-danger p-5">加载日志失败，请刷新页面重试</td></tr>';
                }
            }
            
            updateLogsTable(logs) {
                const tbody = document.getElementById('logsTable');
                
                if (!logs || logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-5">暂无日志记录</td></tr>';
                    return;
                }
                
                tbody.innerHTML = logs.map(log => {
                    // 优雅地截断 User-Agent
                    const userAgent = log.user_agent || '';
                    const shortUserAgent = userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;

                    return \`
                        <tr>
                            <td>\${log.createdAtFormatted}</td>
                            <td>\${log.uid_hash ? log.uid_hash.substring(0, 8) + '...' : '-'}</td>
                            <td>\${this.getActionText(log.action)}</td>
                            <td>
                                <span class="status-badge \${log.success ? 'status-keep' : 'status-delete'}">
                                    \${log.success ? '成功' : '失败'}
                                </span>
                            </td>
                            <td class="hide-on-mobile">\${log.ip_address || '-'}</td>
                            <td class="hide-on-mobile" title="\${userAgent}">\${shortUserAgent}</td>
                        </tr>
                    \`;
                }).join('');
            }
            
            loadSettings() {
                // 加载当前设置
                // 这里可以从API获取当前配置
            }
            
            getStatusText(status, isExpired = false) {
                if (isExpired) return '已过期';
                const statusMap = {
                    pending: '待操作',
                    keep: '保留',
                    delete: '删除'
                };
                return statusMap[status] || status;
            }
            
            getActionText(action) {
                const actionMap = {
                    query: '查询',
                    keep: '保留',
                    delete: '删除'
                };
                return actionMap[action] || action;
            }
        }
        
        // 全局函数
        let adminPanel;
        
        document.addEventListener('DOMContentLoaded', () => {
            adminPanel = new AdminPanel();
        });
        
        function refreshRecentActivity() {
            adminPanel.loadRecentActivity();
        }
        
        function refreshUsers() {
            adminPanel.loadUsers(adminPanel.currentUserPage);
        }
        
        function refreshLogs() {
            adminPanel.loadLogs();
        }
        
        function searchUsers() {
            adminPanel.loadUsers(1);
        }
        
        async function exportUsers() {
            try {
                const status = document.getElementById('statusFilter').value;
                const response = await fetch(\`/api/admin/export?status=\${status}&format=csv\`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`users_\${status}_\${new Date().toISOString().split('T')[0]}.csv\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } else {
                    alert('导出失败');
                }
            } catch (error) {
                console.error('Export error:', error);
                alert('导出失败');
            }
        }
        
        function clearImportText() {
            document.getElementById('importText').value = '';
            document.getElementById('importResult').classList.add('d-none');
        }
        
        // --- START OF MODIFIED FUNCTION ---
        async function importUsers() {
            const text = document.getElementById('importText').value.trim();
            if (!text) {
                alert('请输入要导入的用户ID');
                return;
            }
            
            const lines = text.split('\\n').map(line => line.trim()).filter(line => line);
            const uids = lines.map(line => {
                const commaIndex = line.indexOf(',');
                const tabIndex = line.indexOf('\t');
                let uid = line;
                let remark = '';
                if (commaIndex > -1) {
                    uid = line.slice(0, commaIndex).trim();
                    remark = line.slice(commaIndex + 1).trim();
                } else if (tabIndex > -1) {
                    uid = line.slice(0, tabIndex).trim();
                    remark = line.slice(tabIndex + 1).trim();
                }
                return remark ? { uid, remark } : uid;
            });

            if (uids.length === 0) {
                alert('请输入有效的用户ID');
                return;
            }
            
            const btn = document.getElementById('importBtn');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>导入中...';
            
            try {
                const requestBody = {
                    uids: uids
                };

                const response = await fetch('/api/admin/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const { imported, duplicates, errors, invalidUIDs } = result.data;
                    let summary = \`
                        <p><strong>导入完成</strong></p>
                        <ul>
                            <li>成功导入: \${imported} 个</li>
                            <li>重复跳过: \${duplicates} 个</li>
                            <li>导入失败: \${(errors || []).length} 个</li>
                            <li>格式错误: \${(invalidUIDs || []).length} 个</li>
                        </ul>
                    \`;
                    
                    document.getElementById('importSummary').innerHTML = summary;
                    document.getElementById('importResult').classList.remove('d-none');
                } else {
                    alert('导入失败: ' + (result.error?.message || '未知错误'));
                }
            } catch (error) {
                console.error('Import error:', error);
                alert('导入过程中发生网络或脚本错误');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
        // --- END OF MODIFIED FUNCTION ---
        
        async function cleanupData() {
            if (!confirm('确定要清理过期数据吗？此操作不可撤销。')) {
                return;
            }
            
            try {
                const days = document.getElementById('cleanupDays').value;
                // 添加时间戳参数避免缓存
                const response = await fetch(\`/api/admin/cleanup?days=\${days}&t=\${Date.now()}\`, {
                    method: 'POST',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // 显示详细的清理结果
                    const deletedLogs = result.data?.deletedLogs || 0;
                    alert(\`\数据清理完成\n已删除 \${deletedLogs} 条过期日志\`\);
                    
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
                console.error('Cleanup error:', error);
                alert('清理失败');
            }
        }
        
        async function saveSettings() {
            // 获取设置值
            const rateLimitWindow = document.getElementById('rateLimitWindow').value;
            const rateLimitMax = document.getElementById('rateLimitMax').value;
            const cleanupDays = document.getElementById('cleanupDays').value;
            const maintenanceMode = document.getElementById('maintenanceMode').checked;
            
            // 简单验证
            if (rateLimitWindow < 1 || rateLimitMax < 1 || cleanupDays < 1) {
                alert('请输入有效的设置值');
                return;
            }
            
            try {
                const response = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        rateLimitWindow: parseInt(rateLimitWindow),
                        rateLimitMax: parseInt(rateLimitMax),
                        cleanupDays: parseInt(cleanupDays),
                        maintenanceMode
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('设置保存成功');
                    
                    // 如果启用了维护模式，显示额外提示
                    if (maintenanceMode) {
                        alert('维护模式已启用，前台用户将无法访问');
                    }
                } else {
                    alert('保存失败: ' + (result.error?.message || '未知错误'));
                }
            } catch (error) {
                console.error('Save settings error:', error);
                alert('保存失败');
            }
        }
        
        function viewUserDetails(uidHash) {
            alert('用户详情功能待实现');
        }

        // 初始化系统设置表单
        async function initSettingsForm() {
            try {
                const response = await fetch('/api/admin/settings');
                const result = await response.json();
                
                if (result.success) {
                    const settings = result.data;
                    document.getElementById('rateLimitWindow').value = settings.rateLimitWindow;
                    document.getElementById('rateLimitMax').value = settings.rateLimitMax;
                    document.getElementById('cleanupDays').value = settings.cleanupDays;
                    document.getElementById('maintenanceMode').checked = settings.maintenanceMode;
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
                // 加载失败时使用默认值
                document.getElementById('rateLimitWindow').value = 60;
                document.getElementById('rateLimitMax').value = 100;
                document.getElementById('cleanupDays').value = 30;
            }
        }
        
        // 页面加载时初始化设置表单
        document.addEventListener('DOMContentLoaded', async function() {
            // 如果当前是设置页面，初始化设置表单
            if (document.getElementById('systemSettings')) {
                await initSettingsForm();
            }
        });
        
        async function bulkDeleteSelected() {
            const checks = Array.from(document.querySelectorAll('.user-select:checked'));
            if (checks.length === 0) {
                alert('请先选择要删除的用户');
                return;
            }
            if (!confirm('确认删除选中的 ' + checks.length + ' 个用户吗？')) return;
            const uidHashes = checks.map(c => c.value);
            try {
                const res = await fetch('/api/admin/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uidHashes })
                });
                const result = await res.json();
                if (result.success) {
                    alert('删除完成，影响 ' + (result.data.deleted ?? 0) + ' 个用户');
                    refreshUsers();
                } else {
                    alert('删除失败: ' + (result.error?.message || '未知错误'));
                }
            } catch (e) {
                console.error(e);
                alert('删除失败');
            }
        }
    </script>
</body>
</html>
  `;
  
  return createHTMLResponse(html);
}
