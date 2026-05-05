#!/bin/bash

# 照片上传服务器初始化脚本
# 用法: ./server/setup.sh

set -e

echo "🚀 开始初始化照片上传服务器..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    echo "请先安装 Node.js >= 16.0.0"
    exit 1
fi
echo -e "${GREEN}✓ Node.js$(node -v)${NC}"

# 检查 ImageMagick
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo -e "${RED}✗ ImageMagick 未安装${NC}"
    echo "请先安装 ImageMagick"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi
echo -e "${GREEN}✓ ImageMagick 已安装${NC}"

# 进入 server 目录
cd "$(dirname "$0")"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装 npm 依赖..."
    npm install
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ 依赖已存在${NC}"
fi

# 创建 .env 文件
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  请编辑 .env 文件并设置正确的配置${NC}"
    echo "   重要: 修改 UPLOAD_DIR 为实际的服务器路径"
else
    echo -e "${GREEN}✓ .env 文件已存在${NC}"
fi

# 创建本地测试目录
if [ ! -d "data" ]; then
    echo "📁 创建本地测试目录..."
    mkdir -p data/img/full
    mkdir -p data/img/thumb
    echo '{"images": []}' > data/images.json
    echo -e "${GREEN}✓ 本地测试目录创建完成${NC}"
fi

echo ""
echo -e "${GREEN}✅ 初始化完成！${NC}"
echo ""
echo "后续步骤:"
echo "  1. 编辑 .env 文件 (重要!)"
echo "  2. 运行: npm start (生产)"
echo "  3. 或运行: npm run dev (开发，支持热重载)"
echo ""
echo "访问管理界面: http://localhost:2655"
echo ""
echo "部署说明: 详见 DEPLOYMENT.md"
