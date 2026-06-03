#!/bin/bash
# Economic 项目部署准备脚本
# 用途：帮助你完成部署前的配置检查和不全工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Economic 项目部署准备脚本"
echo -e "${BLUE}================================================${NC}"
echo ""

# 检查函数
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    return 0
  else
    echo -e "${RED}✗${NC} $2 ${YELLOW}(缺失)${NC}"
    return 1
  fi
}

check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $2 已安装"
    return 0
  else
    echo -e "${RED}✗${NC} $2 未安装"
    return 1
  fi
}

# 检查必需文件
echo -e "${BLUE}[1/5] 检查项目文件...${NC}"
echo ""

MISSING_FILES=0

check_file "apps/server/Dockerfile" "Dockerfile" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "apps/server/docker-compose.yml" "docker-compose.yml (本地)" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "apps/server/docker-compose.prod.yml" "docker-compose.prod.yml (生产)" || MISSING_FILES=$((MISSING_FILES + 1))
check_file ".github/workflows/ci.yml" "GitHub Actions CI" || MISSING_FILES=$((MISSING_FILES + 1))
check_file ".github/workflows/deploy.yml" "GitHub Actions Deploy" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "nginx/nginx.conf" "Nginx 配置" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "apps/server/docker-entrypoint.sh" "Docker 入口脚本" || MISSING_FILES=$((MISSING_FILES + 1))

echo ""

if [ $MISSING_FILES -eq 0 ]; then
  echo -e "${GREEN}✓ 所有必需文件已就绪${NC}"
else
  echo -e "${RED}✗ 缺失 $MISSING_FILES 个必需文件${NC}"
fi

echo ""

# 检查健康检查端点
echo -e "${BLUE}[2/5] 检查健康检查端点...${NC}"
echo ""

if grep -r "health" apps/server/src/ 2>/dev/null | grep -q "@Get.*health"; then
  echo -e "${GREEN}✓${NC} 找到健康检查端点"
else
  echo -e "${YELLOW}!${NC} 未找到健康检查端点 ${YELLOW}(需要补充)${NC}"
  echo "  建议：在 apps/server/src/app.controller.ts 中添加："
  echo ""
  echo "  @Get('health')"
  echo "  healthCheck() {"
  echo "    return { status: 'ok', timestamp: new Date().toISOString() };"
  echo "  }"
fi

echo ""

# 检查环境变量模板
echo -e "${BLUE}[3/5] 检查环境变量配置...${NC}"
echo ""

if [ -f "apps/server/.env.production.example" ]; then
  echo -e "${GREEN}✓${NC} .env.production.example 存在"
  
  # 检查是否包含必需变量
  REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET" "NODE_ENV" "DATABASE_URL")
  
  for VAR in "${REQUIRED_VARS[@]}"; do
    if grep -q "$VAR" apps/server/.env.production.example; then
      echo -e "${GREEN}  ✓${NC} $VAR"
    else
      echo -e "${YELLOW}  !${NC} $VAR ${YELLOW}(缺失)${NC}"
    fi
  done
else
  echo -e "${RED}✗${NC} .env.production.example 缺失 ${YELLOW}(需要创建)${NC}"
fi

echo ""

# 检查 Docker 安装
echo -e "${BLUE}[4/5] 检查本地环境...${NC}"
echo ""

check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose"
check_command "node" "Node.js"
check_command "pnpm" "pnpm"
check_command "git" "Git"

echo ""

# 检查 SSH 密钥
echo -e "${BLUE}[5/5] 检查 SSH 密钥...${NC}"
echo ""

if [ -f ~/.ssh/economic_deploy ]; then
  echo -e "${GREEN}✓${NC} SSH 私钥已生成"
  
  if [ -f ~/.ssh/economic_deploy.pub ]; then
    echo -e "${GREEN}✓${NC} SSH 公钥已生成"
    echo ""
    echo -e "${YELLOW}提示：${NC}请将以下公钥添加到服务器："
    cat ~/.ssh/economic_deploy.pub
    echo ""
  fi
else
  echo -e "${YELLOW}!${NC} SSH 密钥未生成 ${YELLOW}(需要生成)${NC}"
  echo ""
  echo "  运行以下命令生成密钥："
  echo "  ssh-keygen -t ed25519 -C \"github-actions-deploy\" -f ~/.ssh/economic_deploy"
  echo ""
fi

echo ""

# 生成报告
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   部署准备报告"
echo -e "${BLUE}================================================${NC}"
echo ""

if [ $MISSING_FILES -eq 0 ]; then
  echo -e "${GREEN}✓ 项目文件：完整${NC}"
else
  echo -e "${RED}✗ 项目文件：缺失 $MISSING_FILES 个文件${NC}"
fi

echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""

if [ $MISSING_FILES -gt 0 ]; then
  echo "1. 补充缺失的配置文件"
fi

echo "2. 生成 SSH 密钥对（如果未生成）"
echo "3. 将公钥添加到服务器 ~/.ssh/authorized_keys"
echo "4. 在 GitHub 仓库配置 Secrets"
echo "5. 在服务器创建 /opt/economic 目录和 .env.production 文件"
echo "6. 推送代码到 main 分支触发部署"

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   生成 JWT 密钥（本地执行）${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "运行以下命令生成 JWT 密钥："
echo ""
echo "  openssl rand -hex 32  # JWT_SECRET"
echo "  openssl rand -hex 32  # JWT_REFRESH_SECRET"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   部署测试命令${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "本地测试 Docker 构建："
echo ""
echo "  docker build -t economic-server:test -f apps/server/Dockerfile ."
echo "  docker run -p 3000:3000 --env-file apps/server/.env.example economic-server:test"
echo ""
echo "服务器部署测试："
echo ""
echo "  ssh user@your-server"
echo "  cd /opt/economic"
echo "  docker-compose pull"
echo "  docker-compose up -d"
echo "  curl http://localhost:3000/health"
echo ""

echo -e "${GREEN}脚本执行完成！${NC}"
