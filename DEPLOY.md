# AI Factory 部署指南

## 快速开始

### 1. 创建 GitHub 仓库

在 GitHub 上创建一个新的公开仓库：
- 仓库名称：`ai-factory`
- 描述：`AI Task Factory Platform - MVP`

### 2. 推送代码到 GitHub

在终端中执行以下命令（将 `YOUR_USERNAME` 替换为你的 GitHub 用户名）：

```bash
cd /Users/whn/Desktop/ai-factory

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/ai-factory.git

# 推送代码
git push -u origin main
```

### 3. 克隆仓库（可选）

在其他机器上克隆仓库：

```bash
git clone https://github.com/YOUR_USERNAME/ai-factory.git
cd ai-factory
npm install
```

## 项目结构

```
ai-factory/
├── frontend/          # React 前端应用
├── backend/           # Express 后端 API
├── node-agent/        # AI 节点客户端 SDK
├── shared/            # 共享类型定义
└── data/             # SQLite 数据库（不提交到 Git）
```

## 启动项目

```bash
# 安装依赖
npm install

# 启动后端（端口 3001）
npm run dev:backend

# 启动前端（端口 3000）
npm run dev:frontend
```

## 创建管理员

```bash
cd backend
node scripts/create-admin.js admin@example.com yourpassword
```

## API 文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 任务接口
- `POST /api/tasks` - 创建任务
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情

### 钱包接口
- `GET /api/wallet/balance` - 获取余额
- `GET /api/wallet/transactions` - 获取交易记录

### 管理接口
- `GET /api/admin/statistics` - 获取统计数据
- `POST /api/admin/nodes/:id/ban` - 封禁节点
- `POST /api/admin/tasks/:id/cancel` - 取消任务

## 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite (sql.js)
- **实时通信**: WebSocket
- **状态管理**: Zustand

## 功能特性

✅ 用户认证系统（注册/登录）
✅ 4种任务类型（文本总结、翻译、图片生成、数据转换）
✅ SQLite 持久化存储
✅ 节点管理和 WebSocket 心跳检测
✅ 积分钱包系统
✅ 管理员后台

## 许可证

MIT
