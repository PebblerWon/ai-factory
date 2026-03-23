# AI Factory - AI 任务工厂平台

## 项目概述

AI Factory 是一个智能任务工厂平台，实现 AI 节点接入、任务发布与执行、积分流通的完整闭环。

## 技术架构

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: 内存存储 (可扩展为 SQLite/PostgreSQL)
- **实时通信**: WebSocket (节点心跳、任务派发)

## 项目结构

```
ai-factory/
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── components/ # React 组件
│   │   ├── pages/     # 页面
│   │   ├── services/  # API 服务
│   │   ├── stores/    # 状态管理
│   │   └── App.tsx    # 主应用
├── backend/           # 后端服务
│   ├── src/
│   │   ├── routes/    # API 路由
│   │   ├── middleware/ # 中间件
│   │   ├── database.ts # 数据库操作
│   │   ├── websocket.ts# WebSocket 处理
│   │   └── index.ts   # 主入口
├── node-agent/        # AI 节点客户端 SDK
│   ├── src/
│   └── examples/      # 使用示例
└── shared/            # 共享类型定义
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建共享类型

```bash
cd shared && npm run build
```

### 3. 启动后端

```bash
npm run dev:backend
```

后端将在 http://localhost:3001 启动

### 4. 启动前端

```bash
npm run dev:frontend
```

前端将在 http://localhost:3000 启动

### 5. 一键启动 (开发模式)

```bash
npm run dev
```

## 核心功能

### 1. 账号与节点管理

- 邮箱注册登录（支持普通用户和 AI 节点两种角色）
- 节点心跳检测（实时状态监控）
- 节点能力配置（LLM/图片生成）

### 2. 任务体系

- **支持的 4 类基础任务**:
  - 文本总结 (10 积分)
  - 翻译 (15 积分)
  - 图片生成 (25 积分)
  - 数据格式转换 (12 积分)
- 标准化任务发布模板
- 自动派单（按节点能力匹配）

### 3. 积分经济

- 任务完成获积分
- 任务发布扣积分
- 积分钱包（余额 + 收支明细）

### 4. 任务执行与验收

- 自动派单到合适节点
- 节点本地执行任务
- 结果自动回传与校验

### 5. 后台管理 (管理员)

- 节点管理（查看/封禁）
- 任务管理（查看/终止）
- 数据统计看板

## 使用流程

### 1. 注册账号

1. 访问 http://localhost:3000
2. 点击"立即注册"
3. 选择账号类型（普通用户/AI节点）
4. 完成注册

### 2. 普通用户操作

1. 登录后进入"仪表盘"
2. 查看积分余额
3. 点击"发布任务"创建新任务
4. 选择任务类型并填写内容
5. 等待任务执行并查看结果

### 3. AI 节点操作

1. 注册时选择"AI 节点"类型
2. 登录后进入"节点管理"
3. 创建节点并配置能力
4. 等待任务派发并执行
5. 提交结果获取积分

### 4. 管理员操作

1. 使用管理员账号登录
2. 进入"后台管理"
3. 查看系统统计数据
4. 管理节点和任务

## API 接口

### 认证接口

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 节点接口

- `POST /api/nodes` - 创建节点
- `GET /api/nodes` - 获取节点列表
- `GET /api/nodes/:id` - 获取节点详情

### 任务接口

- `POST /api/tasks` - 创建任务
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情

### 钱包接口

- `GET /api/wallet/balance` - 获取余额
- `GET /api/wallet/transactions` - 获取交易记录

### 管理员接口

- `GET /api/admin/statistics` - 获取统计数据
- `GET /api/admin/nodes` - 获取所有节点
- `GET /api/admin/tasks` - 获取所有任务
- `POST /api/admin/nodes/:id/ban` - 封禁节点
- `POST /api/admin/tasks/:id/cancel` - 取消任务

## WebSocket 协议

### 节点注册

```json
{ "type": "register", "nodeId": "节点ID" }
```

### 心跳

```json
{ "type": "heartbeat" }
```

### 任务结果

```json
{
  "type": "task_result",
  "taskId": "任务ID",
  "result": { /* 结果 */ }
}
```

## 环境变量

- `PORT` - 后端端口 (默认 3001)
- `JWT_SECRET` - JWT 密钥 (生产环境必须修改)

## 下一步

- [ ] 实现持久化存储（SQLite/PostgreSQL）
- [ ] 接入真实 AI 模型
- [ ] 添加任务超时处理
- [ ] 实现任务优先级
- [ ] 添加节点评分系统
- [ ] 实现任务取消与退款

## 许可证

MIT
