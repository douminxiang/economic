# Economic 项目部署准备脚本 (PowerShell 版本)

Write-Host "================================================" -ForegroundColor Blue
Write-Host "   Economic 项目部署准备脚本" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""

# 检查函数
function Check-File {
    param([string]$FilePath, [string]$Description)
    
    if (Test-Path $FilePath) {
        Write-Host "✓ $Description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ $Description (缺失)" -ForegroundColor Red
        return $false
    }
}

function Check-Command {
    param([string]$Command, [string]$Description)
    
    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Host "✓ $Description 已安装" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ $Description 未安装" -ForegroundColor Red
        return $false
    }
}

# 检查必需文件
Write-Host "[1/5] 检查项目文件..." -ForegroundColor Blue
Write-Host ""

$MissingFiles = 0

Check-File -FilePath "apps/server/Dockerfile" -Description "Dockerfile" | Out-Null
if (-not (Test-Path "apps/server/Dockerfile")) { $MissingFiles++ }

Check-File -FilePath "apps/server/docker-compose.yml" -Description "docker-compose.yml (本地)" | Out-Null
if (-not (Test-Path "apps/server/docker-compose.yml")) { $MissingFiles++ }

Check-File -FilePath "apps/server/docker-compose.prod.yml" -Description "docker-compose.prod.yml (生产)" | Out-Null
if (-not (Test-Path "apps/server/docker-compose.prod.yml")) { $MissingFiles++ }

Check-File -FilePath ".github/workflows/ci.yml" -Description "GitHub Actions CI" | Out-Null
if (-not (Test-Path ".github/workflows/ci.yml")) { $MissingFiles++ }

Check-File -FilePath ".github/workflows/deploy.yml" -Description "GitHub Actions Deploy" | Out-Null
if (-not (Test-Path ".github/workflows/deploy.yml")) { $MissingFiles++ }

Check-File -FilePath "nginx/nginx.conf" -Description "Nginx 配置" | Out-Null
if (-not (Test-Path "nginx/nginx.conf")) { $MissingFiles++ }

Check-File -FilePath "apps/server/docker-entrypoint.sh" -Description "Docker 入口脚本" | Out-Null
if (-not (Test-Path "apps/server/docker-entrypoint.sh")) { $MissingFiles++ }

Write-Host ""

if ($MissingFiles -eq 0) {
    Write-Host "✓ 所有必需文件已就绪" -ForegroundColor Green
} else {
    Write-Host "✗ 缺失 $MissingFiles 个必需文件" -ForegroundColor Red
}

Write-Host ""

# 检查健康检查端点
Write-Host "[2/5] 检查健康检查端点..." -ForegroundColor Blue
Write-Host ""

$HealthCheckFound = $false
if (Test-Path "apps/server/src") {
    Get-ChildItem -Path "apps/server/src" -Recurse -Filter "*.ts" | ForEach-Object {
        $Content = Get-Content $_.FullName -Raw
        if ($Content -match "health" -and $Content -match "@Get") {
            Write-Host "✓ 找到健康检查端点" -ForegroundColor Green
            $HealthCheckFound = $true
        }
    }
}

if (-not $HealthCheckFound) {
    Write-Host "! 未找到健康检查端点 (需要补充)" -ForegroundColor Yellow
    Write-Host "  建议在 apps/server/src/app.controller.ts 中添加：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  @Get('health')"
    Write-Host "  healthCheck() {"
    Write-Host "    return { status: 'ok', timestamp: new Date().toISOString() };"
    Write-Host "  }"
}

Write-Host ""

# 检查环境变量模板
Write-Host "[3/5] 检查环境变量配置..." -ForegroundColor Blue
Write-Host ""

if (Test-Path "apps/server/.env.production.example") {
    Write-Host "✓ .env.production.example 存在" -ForegroundColor Green
    
    $Content = Get-Content "apps/server/.env.production.example" -Raw
    $RequiredVars = @("DB_PASSWORD", "JWT_SECRET", "JWT_REFRESH_SECRET", "NODE_ENV", "DATABASE_URL")
    
    foreach ($Var in $RequiredVars) {
        if ($Content -match $Var) {
            Write-Host "  ✓ $Var" -ForegroundColor Green
        } else {
            Write-Host "  ! $Var (缺失)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ .env.production.example 缺失 (需要创建)" -ForegroundColor Red
}

Write-Host ""

# 检查命令
Write-Host "[4/5] 检查本地环境..." -ForegroundColor Blue
Write-Host ""

Check-Command -Command "docker" -Description "Docker" | Out-Null
Check-Command -Command "docker-compose" -Description "Docker Compose" | Out-Null
Check-Command -Command "node" -Description "Node.js" | Out-Null
Check-Command -Command "pnpm" -Description "pnpm" | Out-Null
Check-Command -Command "git" -Description "Git" | Out-Null

Write-Host ""

# 检查 SSH 密钥
Write-Host "[5/5] 检查 SSH 密钥..." -ForegroundColor Blue
Write-Host ""

$SSHKeyPath = "$env:USERPROFILE\.ssh\economic_deploy"
if (Test-Path $SSHKeyPath) {
    Write-Host "✓ SSH 私钥已生成" -ForegroundColor Green
    
    if (Test-Path "$SSHKeyPath.pub") {
        Write-Host "✓ SSH 公钥已生成" -ForegroundColor Green
        Write-Host ""
        Write-Host "提示：请将以下公钥添加到服务器：" -ForegroundColor Yellow
        Get-Content "$SSHKeyPath.pub"
        Write-Host ""
    }
} else {
    Write-Host "! SSH 密钥未生成 (需要生成)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  运行以下命令生成密钥：" -ForegroundColor Yellow
    Write-Host "  ssh-keygen -t ed25519 -C ""github-actions-deploy"" -f $env:USERPROFILE\.ssh\economic_deploy"
    Write-Host ""
}

Write-Host ""

# 生成报告
Write-Host "================================================" -ForegroundColor Blue
Write-Host "   部署准备报告" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""

if ($MissingFiles -eq 0) {
    Write-Host "✓ 项目文件：完整" -ForegroundColor Green
} else {
    Write-Host "✗ 项目文件：缺失 $MissingFiles 个文件" -ForegroundColor Red
}

Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Yellow
Write-Host ""

if ($MissingFiles -gt 0) {
    Write-Host "1. 补充缺失的配置文件"
}

Write-Host "2. 生成 SSH 密钥对（如果未生成）"
Write-Host "3. 将公钥添加到服务器 ~/.ssh/authorized_keys"
Write-Host "4. 在 GitHub 仓库配置 Secrets"
Write-Host "5. 在服务器创建 /opt/economic 目录和 .env.production 文件"
Write-Host "6. 推送代码到 main 分支触发部署"

Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host "   生成 JWT 密钥（本地执行）" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "运行以下命令生成 JWT 密钥：" -ForegroundColor Yellow
Write-Host ""
Write-Host "  openssl rand -hex 32  # JWT_SECRET"
Write-Host "  openssl rand -hex 32  # JWT_REFRESH_SECRET"
Write-Host ""

Write-Host "================================================" -ForegroundColor Blue
Write-Host "   部署测试命令" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "本地测试 Docker 构建：" -ForegroundColor Yellow
Write-Host ""
Write-Host "  docker build -t economic-server:test -f apps/server/Dockerfile ."
Write-Host "  docker run -p 3000:3000 --env-file apps/server/.env.example economic-server:test"
Write-Host ""
Write-Host "服务器部署测试：" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ssh user@your-server"
Write-Host "  cd /opt/economic"
Write-Host "  docker-compose pull"
Write-Host "  docker-compose up -d"
Write-Host "  curl http://localhost:3000/health"
Write-Host ""

Write-Host "脚本执行完成！" -ForegroundColor Green
