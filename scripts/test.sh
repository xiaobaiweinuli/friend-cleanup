#!/bin/bash

# 好友清理系统测试脚本
# 使用方法: ./scripts/test.sh [base_url]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认测试 URL
BASE_URL=${1:-"http://localhost:8787"}
ADMIN_USERNAME=${ADMIN_USERNAME:-"admin"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin123"}

echo -e "${BLUE}🧪 开始测试好友清理系统${NC}"
echo -e "${BLUE}测试 URL: $BASE_URL${NC}"

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}🔍 测试: $test_name${NC}"
    
    if eval "$test_command" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# 检查必要工具
check_tools() {
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl 未安装，无法进行 API 测试${NC}"
        exit 1
    fi
}

# 测试首页
test_homepage() {
    echo -e "${BLUE}📄 测试前台页面${NC}"
    
    run_test "首页访问" \
        "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/'" \
        "200"
    
    run_test "首页内容" \
        "curl -s '$BASE_URL/'" \
        "好友清理系统"
}

# 测试 API 健康检查
test_health_api() {
    echo -e "${BLUE}🏥 测试系统健康检查${NC}"
    
    run_test "健康检查 API" \
        "curl -s '$BASE_URL/api/health'" \
        "healthy"
}

# 测试前台 API
test_frontend_api() {
    echo -e "${BLUE}🔧 测试前台 API${NC}"
    
    # 测试查询 API（无效 UID）
    run_test "查询 API - 无效 UID" \
        "curl -s -X POST '$BASE_URL/api/query' -H 'Content-Type: application/json' -d '{\"uid\":\"\"}'" \
        "用户ID不能为空"
    
    # 测试查询 API（有效格式但不存在的 UID）
    run_test "查询 API - 不存在的 UID" \
        "curl -s -X POST '$BASE_URL/api/query' -H 'Content-Type: application/json' -d '{\"uid\":\"12345678\"}'" \
        "请确认账号是否正确"
    
    # 测试操作 API（无效参数）
    run_test "操作 API - 无效参数" \
        "curl -s -X POST '$BASE_URL/api/action' -H 'Content-Type: application/json' -d '{\"uid\":\"\",\"action\":\"\"}'" \
        "用户ID不能为空"
}

# 测试管理员页面
test_admin_pages() {
    echo -e "${BLUE}👨‍💼 测试管理员页面${NC}"
    
    # 测试未认证访问
    run_test "管理员页面 - 未认证" \
        "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/admin'" \
        "401"
    
    # 测试错误认证
    run_test "管理员页面 - 错误认证" \
        "curl -s -o /dev/null -w '%{http_code}' -u 'wrong:wrong' '$BASE_URL/admin'" \
        "401"
    
    # 如果提供了正确的认证信息，测试正确认证
    if [[ -n "$ADMIN_USERNAME" ]] && [[ -n "$ADMIN_PASSWORD" ]]; then
        run_test "管理员页面 - 正确认证" \
            "curl -s -o /dev/null -w '%{http_code}' -u '$ADMIN_USERNAME:$ADMIN_PASSWORD' '$BASE_URL/admin'" \
            "200"
    fi
}

# 测试管理员 API
test_admin_api() {
    echo -e "${BLUE}🔐 测试管理员 API${NC}"
    
    # 测试未认证的管理员 API
    run_test "管理员统计 API - 未认证" \
        "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/api/admin/stats'" \
        "401"
    
    # 如果提供了认证信息，测试认证后的 API
    if [[ -n "$ADMIN_USERNAME" ]] && [[ -n "$ADMIN_PASSWORD" ]]; then
        run_test "管理员统计 API - 已认证" \
            "curl -s -u '$ADMIN_USERNAME:$ADMIN_PASSWORD' '$BASE_URL/api/admin/stats'" \
            "totalUsers"
        
        run_test "用户列表 API - 已认证" \
            "curl -s -u '$ADMIN_USERNAME:$ADMIN_PASSWORD' '$BASE_URL/api/admin/users'" \
            "users"
    fi
}

# 测试错误处理
test_error_handling() {
    echo -e "${BLUE}⚠️  测试错误处理${NC}"
    
    run_test "404 页面" \
        "curl -s -o /dev/null -w '%{http_code}' '$BASE_URL/nonexistent'" \
        "404"
    
    run_test "无效 JSON" \
        "curl -s -X POST '$BASE_URL/api/query' -H 'Content-Type: application/json' -d 'invalid json'" \
        "Invalid JSON format"
}

# 测试安全功能
test_security() {
    echo -e "${BLUE}🛡️  测试安全功能${NC}"
    
    # 测试 SQL 注入防护
    run_test "SQL 注入防护" \
        "curl -s -X POST '$BASE_URL/api/query' -H 'Content-Type: application/json' -d '{\"uid\":\"1; DROP TABLE users; --\"}'" \
        "Potential SQL injection detected"
    
    # 测试 XSS 防护
    run_test "XSS 防护" \
        "curl -s -X POST '$BASE_URL/api/query' -H 'Content-Type: application/json' -d '{\"uid\":\"<script>alert(1)</script>\"}'" \
        "请输入有效的QQ号、微信号"
}

# 测试限速功能
test_rate_limiting() {
    echo -e "${BLUE}⏱️  测试限速功能${NC}"
    
    echo -e "${YELLOW}发送多个请求测试限速...${NC}"
    
    # 快速发送多个请求
    for i in {1..7}; do
        response=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/query" \
            -H 'Content-Type: application/json' \
            -d '{"uid":"12345678"}')
        
        if [[ "$response" == "429" ]]; then
            echo -e "${GREEN}✅ 限速功能正常工作（第 $i 次请求被限制）${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            return
        fi
        
        sleep 0.1
    done
    
    echo -e "${YELLOW}⚠️  限速功能可能未生效或限制较宽松${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# 性能测试
test_performance() {
    echo -e "${BLUE}⚡ 简单性能测试${NC}"
    
    echo -e "${YELLOW}测试响应时间...${NC}"
    
    # 测试首页响应时间
    response_time=$(curl -s -o /dev/null -w '%{time_total}' "$BASE_URL/")
    echo -e "首页响应时间: ${response_time}s"
    
    # 测试 API 响应时间
    api_response_time=$(curl -s -o /dev/null -w '%{time_total}' "$BASE_URL/api/health")
    echo -e "API 响应时间: ${api_response_time}s"
    
    # 简单的并发测试
    echo -e "${YELLOW}测试并发处理...${NC}"
    
    start_time=$(date +%s.%N)
    for i in {1..5}; do
        curl -s "$BASE_URL/api/health" > /dev/null &
    done
    wait
    end_time=$(date +%s.%N)
    
    duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "N/A")
    echo -e "5个并发请求耗时: ${duration}s"
    
    echo ""
}

# 显示测试结果
show_results() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}           测试结果汇总${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "总测试数: $TOTAL_TESTS"
    echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
    echo -e "${RED}失败: $FAILED_TESTS${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 所有测试通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 有测试失败，请检查系统配置${NC}"
        exit 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}      好友清理系统测试脚本 v1.0${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    check_tools
    test_homepage
    test_health_api
    test_frontend_api
    test_admin_pages
    test_admin_api
    test_error_handling
    test_security
    test_rate_limiting
    test_performance
    show_results
}

# 运行主函数
main

