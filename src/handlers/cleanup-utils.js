// 清理所有日志功能
async function cleanupAllLogs() {
    if (!confirm('确定要清理所有日志数据吗？此操作不可撤销，将删除系统中的全部日志记录！')) {
        return;
    }
    
    try {
        // 添加时间戳参数避免缓存
        const response = await fetch(`/api/admin/cleanup-all-logs?t=${Date.now()}`, {
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 显示详细的清理结果
            const deletedLogs = result.data?.deletedLogs || 0;
            alert(`日志清理完成\n已删除 ${deletedLogs} 条日志数据`);
            
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
        console.error('Cleanup all logs error:', error);
        alert('清理失败');
    }
}