# API密钥功能实现计划

## 目标
为AI工厂平台添加API密钥管理功能，允许用户创建、管理和使用API密钥来访问平台功能。

## 需求分析

### 功能需求
1. 用户可以生成多个API密钥
2. 每个API密钥有名称标识（如"我的应用"、"测试密钥"等）
3. API密钥仅在创建时显示一次，之后不再明文显示
4. 用户可以查看API密钥列表（不显示密钥内容，仅显示名称和创建时间）
5. 用户可以删除不需要的API密钥
6. API密钥可用于认证请求（作为Bearer Token）

### 技术架构
- **数据库**：新增 `api_keys` 表
- **后端**：新增API密钥路由，提供创建、列表、删除功能
- **前端**：新增API密钥管理页面

## 实现步骤

### 第一阶段：数据库和类型定义

#### 1.1 扩展共享类型定义
- 文件：`shared/src/index.ts`
- 添加 `ApiKey` 接口类型
- 添加 `ApiKeyScope` 类型定义（可选，用于限定密钥权限范围）

#### 1.2 数据库表创建
- 文件：`backend/src/sqlite.ts`
- 添加 `api_keys` 表创建语句
- 添加索引：`idx_api_keys_user_id`
- 表字段：
  - `id`: 主键UUID
  - `user_id`: 外键关联用户
  - `name`: 密钥名称（用户自定义）
  - `key_hash`: 密钥的SHA-256哈希值（存储）
  - `key_prefix`: 密钥前缀（显示用，如 "aif_sk_xxx"）
  - `created_at`: 创建时间
  - `last_used_at`: 最后使用时间（可选）
  - `expires_at`: 过期时间（可选，null表示永不过期）

#### 1.3 数据库操作函数
- `createApiKey()`: 创建新密钥
- `getApiKeysByUserId()`: 获取用户的所有密钥
- `getApiKeyById()`: 根据ID获取密钥
- `verifyApiKey()`: 验证密钥
- `deleteApiKey()`: 删除密钥
- `updateApiKeyLastUsed()`: 更新最后使用时间

### 第二阶段：后端API实现

#### 2.1 API密钥认证中间件
- 文件：`backend/src/middleware/auth.ts`
- 修改 `authMiddleware`，支持API密钥认证
- 从请求头 `X-API-Key` 或 `Authorization` 中提取密钥
- 验证密钥有效性，更新最后使用时间

#### 2.2 API密钥路由
- 文件：`backend/src/routes/api-keys.ts`（新建）
- 路由：
  - `POST /api-keys`: 创建新API密钥
  - `GET /api-keys`: 获取用户的所有API密钥列表
  - `DELETE /api-keys/:id`: 删除指定API密钥

#### 2.3 主路由注册
- 文件：`backend/src/index.ts`
- 注册新的API密钥路由

### 第三阶段：前端实现

#### 3.1 API服务扩展
- 文件：`frontend/src/services/api.ts`
- 添加 `apiKeyService` 对象：
  - `createApiKey(name: string)`
  - `listApiKeys()`
  - `deleteApiKey(id: string)`

#### 3.2 API密钥管理页面
- 文件：`frontend/src/pages/ApiKeys.tsx`（新建）
- 功能：
  - 显示API密钥列表（名称、创建时间、前缀）
  - 创建新API密钥表单
  - 删除API密钥功能
  - 安全提示（强调密钥仅显示一次）
  - 复制功能（创建后允许复制）

#### 3.3 导航集成
- 文件：`frontend/src/components/Layout.tsx`
- 在用户菜单或设置中添加API密钥管理入口

#### 3.4 路由配置
- 文件：`frontend/src/App.tsx`
- 添加路由： `/api-keys` -> `ApiKeys` 页面

### 第四阶段：安全考虑

#### 4.1 密钥生成
- 使用加密安全的随机数生成器
- 格式：`aif_sk_` + 32位随机字符
- 示例：`aif_sk_x7k9m2p4q8r1s5t3u6v0w2y4z8a`

#### 4.2 密钥存储
- 永远不在数据库中存储明文密钥
- 仅存储SHA-256哈希值
- 创建时返回明文密钥，仅此一次

#### 4.3 密钥验证
- 验证时对输入密钥进行哈希后比对
- 记录最后使用时间用于审计

## 文件清单

### 需要修改的文件
1. `shared/src/index.ts` - 添加类型定义
2. `backend/src/sqlite.ts` - 添加数据库表和操作函数
3. `backend/src/middleware/auth.ts` - 添加API密钥认证支持
4. `backend/src/index.ts` - 注册新路由
5. `frontend/src/services/api.ts` - 添加API服务
6. `frontend/src/components/Layout.tsx` - 添加导航入口
7. `frontend/src/App.tsx` - 添加路由

### 需要新建的文件
1. `backend/src/routes/api-keys.ts` - API密钥路由
2. `frontend/src/pages/ApiKeys.tsx` - API密钥管理页面

## 优先级和顺序

1. **优先级高**：数据库和类型定义（第一阶段）
2. **优先级高**：后端API实现（第二阶段）
3. **优先级中**：前端实现（第三阶段）
4. **优先级中**：安全加固（第四阶段）

## 测试要点

1. 创建API密钥，验证返回格式
2. 使用API密钥访问受保护端点
3. 删除API密钥后验证无法再使用
4. 验证密钥仅创建时显示一次
5. 验证多个密钥可以同时存在
