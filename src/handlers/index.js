/**
 * 入口页面处理器
 */

import { createHTMLResponse } from '../utils/helpers.js';

/**
 * 首页处理器
 * @param {Object} c - Hono 上下文
 * @returns {Response} HTML 响应
 */
export async function indexHandler(c) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>好友清理系统</title>
    <meta name="description" content="安全的好友清理系统，支持QQ、微信好友管理">
    <meta name="keywords" content="好友清理,QQ,微信,好友管理">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #007bff;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8;
            --light-color: #f8f9fa;
            --dark-color: #343a40;
        }
        
        /* 确保body有足够的高度和flex布局来支持居中 */
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100% );
            background-attachment: fixed; /* 添加固定背景 */
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px; /* 将 padding 从 main-container 移到 body */
            box-sizing: border-box; /* 确保 padding 不会增加 body 的总宽高 */
        }
        
        /* 优化主容器样式，确保更好的居中效果 */
        .main-container {
            /* 以下样式被移除，因为不再需要它来居中 */
            /* min-height: 100vh; */
            /* display: flex; */
            /* align-items: center; */
            /* justify-content: center; */
            /* padding: 20px; */
        }
        
        /* 卡片样式 - 实现上下平均分割 */
        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: none;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); /* 调整阴影与后台一致 */
            max-width: 500px;
            width: 100%;
            margin: 20px auto; /* 增加垂直方向的外边距，以防万一 */
            transition: all 0.3s ease; /* 添加过渡效果 */
            display: flex;
            flex-direction: column;
            min-height: 500px; /* 设置最小高度确保良好显示 */
        }
        
        /* 修改 .row.justify-content-center，让它撑满高度 */
        .row.justify-content-center {
            min-height: calc(100vh - 40px); /* 100vh 减去 body 的上下 padding */
            align-items: center; /* 利用 Flexbox 的 align-items 在 row 内部垂直居中 */
        }
        
        /* 卡片主体样式 - 与头部平均分割 */
        .card-body {

            height: 50%; 
            display: flex;
            flex-direction: column;
            padding: 2rem 1.5rem;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15); /* 添加悬浮效果 */
        }
        
        /* 卡片头部样式 - 与主体平均分割 */
        .card-header {
            text-align: center;
            padding: 2rem 1.5rem;

            height: 50%; 
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        /* Logo 样式 */
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            color: white;
            font-size: 2rem;
        }
        
        /* 统一按钮样式 */
        .btn {
            border-radius: 15px;
            padding: 12px 25px;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
            position: relative;
            overflow: hidden;
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
            background: linear-gradient(135deg, var(--danger-color), #e83e8c);
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 123, 255, 0.3);
        }
        
        .btn-success {
            background: linear-gradient(135deg, var(--success-color), #20c997);
            border: none;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, var(--danger-color), #e83e8c);
            border: none;
        }
        
        .btn:disabled {
            opacity: 0.6;
            transform: none !important;
        }
        
        .loading {
            display: none;
        }
        
        .loading.show {
            display: inline-block;
        }
        
        .alert {
            border-radius: 15px;
            border: none;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        /* 控制视图显示和隐藏的样式 - 确保一次只显示一个视图 */
        #queryForm, #actionButtons, #statusDisplay {
            display: none;
        }
        
        #queryForm.active, #actionButtons.active, #statusDisplay.active {
            display: flex; /* 使用 flex 以便更好地控制内部布局 */
        }

        #queryForm {
            flex-direction: column;
        }
        
        /* 操作按钮的样式调整 */
        #actionButtons {
            gap: 15px;
            justify-content: center;
            align-items: center; /* 垂直居中按钮 */
            flex: 1; /* 填充可用空间 */
        }
        
        .status-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0; /* 移除 margin，由 gap 控制间距 */
            font-size: 2rem;
            color: white;
        }

        #resetBtn {
            padding: 10px 25px;
            font-size: 0.9rem;
            width: 280px;
            display: inline-block;
            margin: 0; /* 移除 margin */
        }

        .status-keep {
            background: linear-gradient(135deg, var(--success-color), #20c997);
        }

        .status-delete {
            background: linear-gradient(135deg, var(--danger-color), #e83e8c);
        }

        /* --- 优化后的 #statusDisplay 样式 --- */
        #statusDisplay {
            text-align: center;
            flex-direction: column; /* 垂直排列 */
            justify-content: center; /* 垂直居中对齐 */
            align-items: center; /* 水平居中对齐 */
            flex: 1; /* 填充父容器的剩余空间 */
            gap: 0.6rem; /* 设置元素之间的统一间距 */
        }
        
        #statusTitle, #statusMessage {
            margin: 0; /* 移除默认的 margin */
            line-height: 1;
        }

        .footer {
            text-align: center;
            margin-top: 1.5rem;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
        }
        
        .security-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 0.8rem;
            margin-top: 0.8rem;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
        }
        
        @media (max-width: 576px) {
            .main-container {
                padding: 10px;
            }
            
            .card-header,
            .card-body {
                padding: 1.5rem;
            }
            
            .btn {
                width: 100%;
                margin-bottom: 0.5rem;
            }
            
            #actionButtons {
                flex-direction: column;
            }
        }
        
        /* 动画效果 */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
        
        /* 加载动画 */
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #ffffff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 8px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="main-container">
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="col-12 col-md-8 col-lg-6 col-xl-5">
                    <div class="card fade-in">
                        <div class="card-header">
                            <div class="logo pulse">
                                <i class="fas fa-users"></i>
                            </div>
                            <h1 class="h3 mb-0">好友清理系统</h1>
                            <p class="text-muted mt-2">安全、快速的好友管理工具</p>
                        </div>
                        <div class="card-body">
                            <!-- 查询表单，初始显示 -->
                            <div id="queryForm" class="active">
                                <div class="mb-4">
                                    <label for="uidInput" class="form-label">
                                        <i class="fas fa-user me-2"></i>请输入您的账号
                                    </label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="uidInput" 
                                           placeholder="QQ号、微信号"
                                           maxlength="50">
                                    <div class="form-text">
                                        <i class="fas fa-shield-alt me-1"></i>
                                        您的账号信息将被安全加密处理
                                    </div>
                                </div>
                                
                                <div class="d-grid">
                                    <button type="button" class="btn btn-primary" id="queryBtn">
                                        <span class="loading" id="queryLoading">
                                            <span class="spinner"></span>
                                        </span>
                                        <span id="queryBtnText">
                                            <i class="fas fa-search me-2"></i>查询状态
                                        </span>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 操作按钮 -->
                            <div id="actionButtons">
                                <button type="button" class="btn btn-success flex-fill" id="keepBtn">
                                    <i class="fas fa-heart me-2"></i>保留
                                </button>
                                <button type="button" class="btn btn-danger flex-fill" id="deleteBtn">
                                    <i class="fas fa-trash me-2"></i>删除
                                </button>
                            </div>
                            
                            <!-- 状态显示 -->
                            <div id="statusDisplay">
                                <div id="statusIcon" class="status-icon">
                                    <i class="fas fa-check"></i>
                                </div>
                                <h4 id="statusTitle">操作完成</h4>
                                <p id="statusMessage" class="text-muted"></p>
                                <button type="button" class="btn btn-primary" id="resetBtn">
                                    <i class="fas fa-redo me-2"></i>重新查询
                                </button>
                            </div>
                            
                            <!-- 提示信息 -->
                            <div id="alertContainer"></div>
                        </div>
                    </div>
                    
                    <!-- 页脚信息 -->
                    <div class="footer">
                        <div class="security-info">
                            <div class="row text-center">
                                <div class="col-md-4 mb-2">
                                    <i class="fas fa-lock me-2"></i>
                                    <small>数据加密传输</small>
                                </div>
                                <div class="col-md-4 mb-2">
                                    <i class="fas fa-shield-alt me-2"></i>
                                    <small>隐私安全保护</small>
                                </div>
                                <div class="col-md-4 mb-2">
                                    <i class="fas fa-clock me-2"></i>
                                    <small>7天有效期</small>
                                </div>
                            </div>
                        </div>
                        <p class="mt-3 mb-0">
                            <small>© 2024 好友清理系统 | 安全可靠的好友管理服务</small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        class FriendCleanupApp {
            constructor( ) {
                this.currentUID = null;
                this.currentStatus = null;
                this.initializeElements();
                this.bindEvents();
                this.resetForm();
            }
            
            initializeElements() {
                this.elements = {
                    uidInput: document.getElementById('uidInput'),
                    queryBtn: document.getElementById('queryBtn'),
                    queryBtnText: document.getElementById('queryBtnText'),
                    queryLoading: document.getElementById('queryLoading'),
                    queryForm: document.getElementById('queryForm'),
                    actionButtons: document.getElementById('actionButtons'),
                    keepBtn: document.getElementById('keepBtn'),
                    deleteBtn: document.getElementById('deleteBtn'),
                    statusDisplay: document.getElementById('statusDisplay'),
                    statusIcon: document.getElementById('statusIcon'),
                    statusTitle: document.getElementById('statusTitle'),
                    statusMessage: document.getElementById('statusMessage'),
                    resetBtn: document.getElementById('resetBtn'),
                    alertContainer: document.getElementById('alertContainer')
                };
            }
            
            bindEvents() {
                this.elements.queryBtn.addEventListener('click', () => this.handleQuery());
                this.elements.keepBtn.addEventListener('click', () => this.handleAction('keep'));
                this.elements.deleteBtn.addEventListener('click', () => this.handleAction('delete'));
                this.elements.resetBtn.addEventListener('click', () => this.resetForm());
                
                this.elements.uidInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleQuery();
                    }
                });
                
                this.elements.uidInput.addEventListener('input', (e) => {
                    this.clearAlert();
                });
            }
            
            async handleQuery() {
                const uid = this.elements.uidInput.value.trim();
                
                if (!uid) {
                    this.showAlert('请输入您的账号', 'warning');
                    return;
                }
                
                if (!this.validateUID(uid)) {
                    this.showAlert('请输入有效的QQ号、微信号', 'danger');
                    return;
                }
                
                this.setLoading(true);
                this.clearAlert();
                
                try {
                    const response = await fetch('/api/query', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ uid })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.currentUID = uid;
                        this.handleQueryResult(result.data);
                    } else {
                        this.showAlert(result.error?.message || '查询失败', 'danger');
                    }
                } catch (error) {
                    console.error('Query error:', error);
                    this.showAlert('网络错误，请稍后重试', 'danger');
                } finally {
                    this.setLoading(false);
                }
            }
            
            handleQueryResult(data) {
                if (!data.exists) {
                    this.showAlert('请确认账号是否正确', 'warning');
                    return;
                }
                
                this.currentStatus = data.status;
                
                if (data.status === 'pending') {
                    if (data.isExpired) {
                        this.showAlert('操作已过期，请联系管理员', 'warning');
                    } else {
                        this.showActionButtons();
                    }
                } else {
                    this.showStatusDisplay(data.status);
                }
            }
            
            async handleAction(action) {
                if (!this.currentUID) {
                    this.showAlert('请先查询账号状态', 'warning');
                    return;
                }
                
                const btn = action === 'keep' ? this.elements.keepBtn : this.elements.deleteBtn;
                const originalText = btn.innerHTML;
                
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner"></span> 处理中...';
                
                try {
                    const response = await fetch('/api/action', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            uid: this.currentUID, 
                            action 
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.currentStatus = action;
                        this.showStatusDisplay(action, result.message);
                    } else {
                        this.showAlert(result.error?.message || '操作失败', 'danger');
                    }
                } catch (error) {
                    console.error('Action error:', error);
                    this.showAlert('网络错误，请稍后重试', 'danger');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
            
            showView(viewId) {
                ['queryForm', 'actionButtons', 'statusDisplay'].forEach(id => {
                    const el = this.elements[id.replace(/s$/, '') + (id.endsWith('s') ? 's' : '')]; // Handle plural/singular
                    if (id === viewId) {
                        el.classList.add('active');
                    } else {
                        el.classList.remove('active');
                    }
                });
                this.clearAlert();
            }

            showActionButtons() {
                this.showView('actionButtons');
            }

            showStatusDisplay(status, message = null) {
                const isKeep = status === 'keep';
                const statusText = isKeep ? '保留' : '删除';
                const iconClass = isKeep ? 'fa-heart' : 'fa-trash';
                const statusClass = isKeep ? 'status-keep' : 'status-delete';
                let displayMessage = message;
                if (!displayMessage || displayMessage.toLowerCase() === 'success') {
                displayMessage = \`您的好友关系将按选择的“\${statusText}”状态处理。\`;
                }
                
                this.elements.statusIcon.className = \`status-icon \${statusClass}\`;
                this.elements.statusIcon.innerHTML = \`<i class="fas \${iconClass}"></i>\`;
                this.elements.statusTitle.textContent = \`您已选择：\${statusText}\`;
                this.elements.statusMessage.textContent = displayMessage;
                
                this.showView('statusDisplay');
            }

            resetForm() {
                this.currentUID = null;
                this.currentStatus = null;
                
                this.elements.uidInput.value = '';
                this.showView('queryForm');
                
                this.elements.uidInput.focus();
            }
            
            setLoading(loading) {
                this.elements.queryBtn.disabled = loading;
                this.elements.queryLoading.classList.toggle('show', loading);
                this.elements.queryBtnText.style.display = loading ? 'none' : 'inline';
            }
            
            validateUID(uid) {
                const qqPattern = /^[1-9][0-9]{4,11}$/;
                const wechatPattern = /^[a-zA-Z][a-zA-Z0-9_]{5,19}$/;
                const phonePattern = /^1[3-9][0-9]{9}$/;
                
                return qqPattern.test(uid) || wechatPattern.test(uid) || phonePattern.test(uid);
            }
            
            showAlert(message, type = 'info') {
                const alertClass = \`alert-\${type}\`;
                const iconMap = {
                    success: 'fa-check-circle',
                    danger: 'fa-exclamation-circle',
                    warning: 'fa-exclamation-triangle',
                    info: 'fa-info-circle'
                };
                
                const alertHTML = \`
                    <div class="alert \${alertClass} fade-in" role="alert">
                        <i class="fas \${iconMap[type]} me-2"></i>
                        \${message}
                    </div>
                \`;
                
                this.elements.alertContainer.innerHTML = alertHTML;
                
                if (type === 'success') {
                    setTimeout(() => this.clearAlert(), 3000);
                }
            }
            
            clearAlert() {
                this.elements.alertContainer.innerHTML = '';
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            new FriendCleanupApp();
            adjustContainerHeight(); // 初始化时调整高度
        });
        
        // 新增的动态高度调整函数作为备用方案
        function adjustContainerHeight() {
            const row = document.querySelector('.row.justify-content-center');
            if (row) {
                // window.innerHeight 是在移动端更可靠的视口高度
                row.style.minHeight = window.innerHeight - 40 + 'px';
            }
        }
        
        // 在窗口大小改变时执行调整
        window.addEventListener('resize', adjustContainerHeight);
        
        window.addEventListener('beforeunload', (e) => {
            const queryBtn = document.getElementById('queryBtn');
            const keepBtn = document.getElementById('keepBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            
            if (queryBtn?.disabled || keepBtn?.disabled || deleteBtn?.disabled) {
                e.preventDefault();
                e.returnValue = '操作正在进行中，确定要离开吗？';
            }
        });
    </script>
</body>
</html>
  `;
  
  return createHTMLResponse(html);
}