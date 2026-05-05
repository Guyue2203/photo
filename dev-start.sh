#!/usr/bin/env bash

# 照片系统本地快速测试脚本
# 快速启动前端和后端，用于本地开发测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  摄影作品集 - 本地测试快速启动${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 检查依赖
echo "📋 检查依赖..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

if ! command -v ruby &> /dev/null; then
    echo -e "${RED}✗ Ruby 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Ruby $(ruby -v | cut -d' ' -f2)${NC}"

if ! command -v bundle &> /dev/null; then
    echo "📦 安装 bundler..."
    gem install bundler
fi
echo -e "${GREEN}✓ Bundler 已安装${NC}"

echo ""
echo "📦 安装依赖..."

# 主项目依赖
if [ ! -d "node_modules" ]; then
    npm install
fi

# 前端依赖
if [ ! -f "Gemfile.lock" ]; then
    bundle install
fi

# 上传服务器依赖
if [ ! -d "server/node_modules" ]; then
    cd server
    npm install
    cd ..
fi

echo -e "${GREEN}✓ 所有依赖已安装${NC}"

echo ""
echo -e "${YELLOW}启动服务...${NC}"
echo ""

# 创建 tmux session（如果支持）
if command -v tmux &> /dev/null; then
    echo "使用 tmux 启动多个服务..."
    
    SESSION="photo-dev"
    
    # 清理旧 session
    tmux kill-session -t $SESSION 2>/dev/null || true
    
    # 创建新 session
    tmux new-session -d -s $SESSION -x 200 -y 50
    
    # 窗口 1: 上传服务器
    tmux new-window -t $SESSION -n "upload-server"
    tmux send-keys -t $SESSION:upload-server "cd server && npm run dev" Enter
    
    # 窗口 2: 前端服务器
    tmux new-window -t $SESSION -n "frontend"
    tmux send-keys -t $SESSION:frontend "bundle exec jekyll serve" Enter
    
    # 窗口 3: 日志查看（可选）
    tmux new-window -t $SESSION -n "logs"
    tmux send-keys -t $SESSION:logs "echo '📋 实时日志将在这里显示...' && sleep 10" Enter
    
    echo ""
    echo -e "${GREEN}✅ 服务已启动！${NC}"
    echo ""
    echo "📍 访问以下地址进行测试:"
    echo -e "   ${BLUE}上传管理界面: ${YELLOW}http://localhost:2655${NC}"
    echo -e "   ${BLUE}照片网站: ${YELLOW}http://localhost:4000${NC}"
    echo ""
    echo "🔐 默认登录凭证:"
    echo -e "   ${BLUE}用户名: ${YELLOW}admin${NC}"
    echo -e "   ${BLUE}密码: ${YELLOW}admin${NC}"
    echo ""
    echo "🛑 停止服务:"
    echo -e "   ${YELLOW}tmux kill-session -t $SESSION${NC}"
    echo ""
    echo "📺 查看输出:"
    echo -e "   ${YELLOW}tmux attach -t $SESSION${NC}"
    echo ""
    
    # 等待服务启动
    sleep 3
    
    # 尝试打开浏览器
    if command -v open &> /dev/null; then
        echo "🌐 正在打开浏览器..."
        sleep 2
        open http://localhost:2655
    elif command -v xdg-open &> /dev/null; then
        sleep 2
        xdg-open http://localhost:2655
    fi
    
else
    echo "❌ tmux 未安装，请手动启动两个终端："
    echo ""
    echo "终端 1 - 上传服务器:"
    echo -e "   ${YELLOW}cd server && npm run dev${NC}"
    echo ""
    echo "终端 2 - 前端网站:"
    echo -e "   ${YELLOW}bundle exec jekyll serve${NC}"
    echo ""
    echo "然后访问:"
    echo -e "   ${BLUE}上传界面: ${YELLOW}http://localhost:2655${NC}"
    echo -e "   ${BLUE}网站: ${YELLOW}http://localhost:4000${NC}"
fi
