#!/bin/bash

# 好友清理系统部署脚本
# 使用方法: ./scripts/deploy.sh [environment]
# environment: production (默认) 或 staging

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 环境参数
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 开始部署好友清理系统到 ${ENVIRONMENT} 环境${NC}"

# 检查必要的工具
check_requirements() {
    echo -e "${YELLOW}📋 检查部署要求...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js 16+${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${YELLOW}⚠️  Wrangler 未安装，正在安装...${NC}"
        npm install -g wrangler
    fi
    
    echo -e "${GREEN}✅ 部署要求检查完成${NC}"
}

# 检查配置文件
check_config() {
    echo -e "${YELLOW}🔧 检查配置文件...${NC}"
    
    if [[ ! -f "wrangler.toml" ]]; then
        if [[ -f "wrangler.toml.example" ]]; then
            echo -e "${YELLOW}⚠️  wrangler.toml 不存在，从示例文件复制...${NC}"
            cp wrangler.toml.example wrangler.toml
            echo -e "${RED}❌ 请编辑 wrangler.toml 文件，配置数据库 ID 和 KV 命名空间 ID${NC}"
            exit 1
        else
            echo -e "${RED}❌ wrangler.toml 和 wrangler.toml.example 都不存在${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ 配置文件检查完成${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${YELLOW}📦 安装项目依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 检查数据库
check_database() {
    echo -e "${YELLOW}🗄️  检查数据库配置...${NC}"
    
    # 从 wrangler.toml 中提取数据库名称
    DB_NAME=$(grep -A 5 "d1_databases" wrangler.toml | grep "database_name" | cut -d'"' -f2)
    
    if [[ -z "$DB_NAME" ]]; then
        echo -e "${RED}❌ 无法从 wrangler.toml 中找到数据库名称${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📊 数据库名称: $DB_NAME${NC}"
    
    # 检查数据库是否存在
    if ! wrangler d1 list | grep -q "$DB_NAME"; then
        echo -e "${YELLOW}⚠️  数据库 $DB_NAME 不存在，正在创建...${NC}"
        wrangler d1 create "$DB_NAME"
        echo -e "${RED}❌ 请更新 wrangler.toml 中的 database_id${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 数据库检查完成${NC}"
}

# 运行数据库迁移
run_migrations() {
    echo -e "${YELLOW}🔄 运行数据库迁移...${NC}"
    
    DB_NAME=$(grep -A 5 "d1_databases" wrangler.toml | grep "database_name" | cut -d'"' -f2)
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        wrangler d1 migrations apply "$DB_NAME"
    else
        wrangler d1 migrations apply "$DB_NAME" --env "$ENVIRONMENT"
    fi
    
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
}

# 检查密钥
check_secrets() {
    echo -e "${YELLOW}🔐 检查密钥配置...${NC}"
    
    REQUIRED_SECRETS=("ADMIN_USERNAME" "ADMIN_PASSWORD")
    MISSING_SECRETS=()
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if ! wrangler secret list | grep -q "$secret"; then
            MISSING_SECRETS+=("$secret")
        fi
    done
    
    if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 缺少以下密钥配置:${NC}"
        for secret in "${MISSING_SECRETS[@]}"; do
            echo -e "${RED}   - $secret${NC}"
        done
        echo -e "${YELLOW}请运行以下命令设置密钥:${NC}"
        for secret in "${MISSING_SECRETS[@]}"; do
            echo -e "${BLUE}   wrangler secret put $secret${NC}"
        done
        exit 1
    fi
    
    echo -e "${GREEN}✅ 密钥配置检查完成${NC}"
}

# 部署应用
deploy_app() {
    echo -e "${YELLOW}🚀 部署应用到 Cloudflare Workers...${NC}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        wrangler deploy
    else
        wrangler deploy --env "$ENVIRONMENT"
    fi
    
    echo -e "${GREEN}✅ 应用部署完成${NC}"
}

# 验证部署
verify_deployment() {
    echo -e "${YELLOW}🔍 验证部署结果...${NC}"
    
    # 获取部署的 URL
    if [[ "$ENVIRONMENT" == "production" ]]; then
        WORKER_NAME=$(grep "^name" wrangler.toml | cut -d'"' -f2)
    else
        WORKER_NAME=$(grep -A 5 "\[env.$ENVIRONMENT\]" wrangler.toml | grep "name" | cut -d'"' -f2)
    fi
    
    if [[ -z "$WORKER_NAME" ]]; then
        echo -e "${YELLOW}⚠️  无法确定 Worker 名称，请手动验证部署${NC}"
        return
    fi
    
    WORKER_URL="https://$WORKER_NAME.workers.dev"
    echo -e "${BLUE}🌐 应用 URL: $WORKER_URL${NC}"
    
    # 测试健康检查端点
    if command -v curl &> /dev/null; then
        echo -e "${YELLOW}🏥 测试健康检查端点...${NC}"
        if curl -s "$WORKER_URL/api/health" | grep -q "healthy"; then
            echo -e "${GREEN}✅ 健康检查通过${NC}"
        else
            echo -e "${YELLOW}⚠️  健康检查失败，请手动验证${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ 部署验证完成${NC}"
}

# 显示部署后信息
show_post_deploy_info() {
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo -e "${BLUE}📋 部署信息:${NC}"
    echo -e "   环境: $ENVIRONMENT"
    echo -e "   应用 URL: https://$WORKER_NAME.workers.dev"
    echo -e "   管理后台: https://$WORKER_NAME.workers.dev/admin"
    echo ""
    echo -e "${YELLOW}📝 后续步骤:${NC}"
    echo -e "   1. 访问应用 URL 测试前台功能"
    echo -e "   2. 访问管理后台测试后台功能"
    echo -e "   3. 在管理后台批量导入用户数据"
    echo -e "   4. 配置自定义域名（可选）"
    echo ""
    echo -e "${BLUE}🔧 管理命令:${NC}"
    echo -e "   查看日志: wrangler tail"
    echo -e "   更新部署: ./scripts/deploy.sh $ENVIRONMENT"
    echo -e "   回滚部署: wrangler rollback"
}

# 主函数
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    好友清理系统部署脚本 v1.0${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    check_requirements
    check_config
    install_dependencies
    check_database
    run_migrations
    check_secrets
    deploy_app
    verify_deployment
    show_post_deploy_info
    
    echo ""
    echo -e "${GREEN}🚀 部署成功完成！${NC}"
}

# 错误处理
trap 'echo -e "${RED}❌ 部署过程中发生错误${NC}"; exit 1' ERR

# 运行主函数
main

