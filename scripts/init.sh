#!/bin/bash

# 好友清理系统初始化脚本
# 使用方法: ./scripts/init.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 初始化好友清理系统${NC}"

# 检查必要的工具
check_requirements() {
    echo -e "${YELLOW}📋 检查系统要求...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js 16+${NC}"
        echo -e "${BLUE}💡 安装方法: https://nodejs.org/${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 16 ]]; then
        echo -e "${RED}❌ Node.js 版本过低，需要 16+，当前版本: $(node --version)${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 系统要求检查完成${NC}"
}

# 安装 Wrangler CLI
install_wrangler() {
    if ! command -v wrangler &> /dev/null; then
        echo -e "${YELLOW}📦 安装 Wrangler CLI...${NC}"
        npm install -g wrangler
        echo -e "${GREEN}✅ Wrangler CLI 安装完成${NC}"
    else
        echo -e "${GREEN}✅ Wrangler CLI 已安装${NC}"
    fi
}

# 登录 Cloudflare
login_cloudflare() {
    echo -e "${YELLOW}🔐 登录 Cloudflare...${NC}"
    
    if wrangler whoami &> /dev/null; then
        CURRENT_USER=$(wrangler whoami | grep "You are logged in as" | cut -d' ' -f6)
        echo -e "${GREEN}✅ 已登录 Cloudflare，当前用户: $CURRENT_USER${NC}"
        
        read -p "是否需要切换账号？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wrangler logout
            wrangler login
        fi
    else
        echo -e "${BLUE}🌐 请在浏览器中完成 Cloudflare 登录...${NC}"
        wrangler login
    fi
}

# 安装项目依赖
install_dependencies() {
    echo -e "${YELLOW}📦 安装项目依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 项目依赖安装完成${NC}"
}

# 创建 D1 数据库
create_database() {
    echo -e "${YELLOW}🗄️  创建 D1 数据库...${NC}"
    
    DB_NAME="friend-cleanup-db"
    
    # 检查数据库是否已存在
    if wrangler d1 list | grep -q "$DB_NAME"; then
        echo -e "${GREEN}✅ 数据库 $DB_NAME 已存在${NC}"
        # 从列表中获取已存在的数据库ID
        DB_ID=$(wrangler d1 list --json | grep -o "\"id\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)
        echo "$DB_ID" > .db_id_temp
        return
    fi
    
    echo -e "${BLUE}📊 创建数据库: $DB_NAME${NC}"
    DB_OUTPUT=$(wrangler d1 create "$DB_NAME")
    
    # 尝试多种方式提取数据库 ID
    # 方式1: 从标准输出提取
    DB_ID=$(echo "$DB_OUTPUT" | grep -o "[0-9a-f\-]\{36\}" | head -1)
    
    # 如果方式1失败，尝试方式2
    if [[ -z "$DB_ID" ]]; then
        echo -e "${YELLOW}🔄 尝试另一种方式提取数据库ID...${NC}"
        # 方式2: 直接列出所有数据库并提取
        DB_ID=$(wrangler d1 list --json | grep -o "\"id\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)
    fi
    
    # 如果仍然失败，提供手动输入选项
    if [[ -z "$DB_ID" ]]; then
        echo -e "${YELLOW}💡 无法自动提取数据库ID，请手动创建并输入。${NC}"
        echo -e "${BLUE}请先在浏览器中访问 Cloudflare Dashboard 手动创建数据库:${NC}"
        echo -e "${BLUE}1. 访问 https://dash.cloudflare.com/${NC}"
        echo -e "${BLUE}2. 导航到 Workers & Pages > D1${NC}"
        echo -e "${BLUE}3. 创建名为 '$DB_NAME' 的数据库${NC}"
        echo -e "${BLUE}4. 复制数据库ID并粘贴到下方${NC}"
        read -p "请输入数据库ID: " DB_ID
    fi
    
    if [[ -z "$DB_ID" ]]; then
        echo -e "${RED}❌ 数据库ID不能为空，初始化失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 数据库创建完成，ID: $DB_ID${NC}"
    
    # 保存数据库 ID 到临时文件
    echo "$DB_ID" > .db_id_temp
}

# 创建 KV 命名空间
create_kv_namespace() {
    echo -e "${YELLOW}🗂️  创建 KV 命名空间...${NC}"
    
    KV_NAME="CACHE"
    
    # 创建生产环境 KV 命名空间
    echo -e "${BLUE}📁 创建生产环境 KV 命名空间...${NC}"
    KV_OUTPUT=$(wrangler kv:namespace create "$KV_NAME")
    KV_ID=$(echo "$KV_OUTPUT" | grep "id" | cut -d'"' -f4)
    
    # 创建预览环境 KV 命名空间
    echo -e "${BLUE}📁 创建预览环境 KV 命名空间...${NC}"
    KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "$KV_NAME" --preview)
    KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep "preview_id" | cut -d'"' -f4)
    
    if [[ -z "$KV_ID" ]] || [[ -z "$KV_PREVIEW_ID" ]]; then
        echo -e "${RED}❌ 无法获取 KV 命名空间 ID${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ KV 命名空间创建完成${NC}"
    echo -e "   生产环境 ID: $KV_ID"
    echo -e "   预览环境 ID: $KV_PREVIEW_ID"
    
    # 保存 KV ID 到临时文件
    echo "$KV_ID" > .kv_id_temp
    echo "$KV_PREVIEW_ID" > .kv_preview_id_temp
}

# 配置 wrangler.toml
configure_wrangler() {
    echo -e "${YELLOW}🔧 配置 wrangler.toml...${NC}"
    
    if [[ ! -f "wrangler.toml.example" ]]; then
        echo -e "${RED}❌ wrangler.toml.example 文件不存在${NC}"
        exit 1
    fi
    
    # 复制示例配置文件
    cp wrangler.toml.example wrangler.toml
    
    # 读取临时文件中的 ID
    if [[ -f ".db_id_temp" ]]; then
        DB_ID=$(cat .db_id_temp)
        sed -i "s/your-database-id-here/$DB_ID/g" wrangler.toml
        rm .db_id_temp
    fi
    
    if [[ -f ".kv_id_temp" ]]; then
        KV_ID=$(cat .kv_id_temp)
        sed -i "s/your-kv-namespace-id-here/$KV_ID/g" wrangler.toml
        rm .kv_id_temp
    fi
    
    if [[ -f ".kv_preview_id_temp" ]]; then
        KV_PREVIEW_ID=$(cat .kv_preview_id_temp)
        sed -i "s/your-preview-kv-namespace-id-here/$KV_PREVIEW_ID/g" wrangler.toml
        rm .kv_preview_id_temp
    fi
    
    echo -e "${GREEN}✅ wrangler.toml 配置完成${NC}"
}

# 设置密钥
setup_secrets() {
    echo -e "${YELLOW}🔐 设置应用密钥...${NC}"
    
    echo -e "${BLUE}请设置管理员账号信息:${NC}"
    
    # 设置管理员用户名
    read -p "管理员用户名 (默认: admin): " ADMIN_USERNAME
    ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
    echo "$ADMIN_USERNAME" | wrangler secret put ADMIN_USERNAME
    
    # 设置管理员密码
    while true; do
        read -s -p "管理员密码 (至少8位): " ADMIN_PASSWORD
        echo
        if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then
            break
        else
            echo -e "${RED}❌ 密码长度至少8位，请重新输入${NC}"
        fi
    done
    echo "$ADMIN_PASSWORD" | wrangler secret put ADMIN_PASSWORD
    
    # 生成随机密钥
    echo -e "${BLUE}🔑 生成加密密钥...${NC}"
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET
    
    ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    echo "$ENCRYPTION_KEY" | wrangler secret put ENCRYPTION_KEY
    
    echo -e "${GREEN}✅ 密钥设置完成${NC}"
}

# 运行数据库迁移
run_migrations() {
    echo -e "${YELLOW}🔄 运行数据库迁移...${NC}"
    wrangler d1 migrations apply friend-cleanup-db
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
}

# 显示完成信息
show_completion_info() {
    echo -e "${GREEN}🎉 初始化完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 项目信息:${NC}"
    echo -e "   项目名称: 好友清理系统"
    echo -e "   数据库: friend-cleanup-db"
    echo -e "   KV 存储: CACHE"
    echo -e "   管理员用户名: $ADMIN_USERNAME"
    echo ""
    echo -e "${YELLOW}📝 下一步操作:${NC}"
    echo -e "   1. 运行 ${BLUE}npm run dev${NC} 启动本地开发服务器"
    echo -e "   2. 运行 ${BLUE}./scripts/deploy.sh${NC} 部署到生产环境"
    echo -e "   3. 访问 ${BLUE}http://localhost:8787${NC} 测试本地服务"
    echo ""
    echo -e "${BLUE}🔧 常用命令:${NC}"
    echo -e "   本地开发: ${BLUE}npm run dev${NC}"
    echo -e "   部署应用: ${BLUE}./scripts/deploy.sh${NC}"
    echo -e "   查看日志: ${BLUE}wrangler tail${NC}"
    echo -e "   数据库操作: ${BLUE}wrangler d1 execute friend-cleanup-db --command \"SELECT * FROM users LIMIT 10\"${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    好友清理系统初始化脚本 v1.0${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    check_requirements
    install_wrangler
    login_cloudflare
    install_dependencies
    create_database
    create_kv_namespace
    configure_wrangler
    setup_secrets
    run_migrations
    show_completion_info
    
    echo ""
    echo -e "${GREEN}🚀 初始化成功完成！${NC}"
}

# 错误处理
trap 'echo -e "${RED}❌ 初始化过程中发生错误${NC}"; exit 1' ERR

# 运行主函数
main

