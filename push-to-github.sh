#!/bin/bash

# GitHub 推送脚本
# 使用方法：
# bash push-to-github.sh <your_github_token>

if [ -z "$1" ]; then
    echo "错误：请提供 GitHub Token"
    echo "使用方式：bash push-to-github.sh <your_github_token>"
    echo ""
    echo "获取 Token 方法："
    echo "1. 访问 https://github.com/settings/tokens"
    echo "2. 点击 'Generate new token (classic)'"
    echo "3. 勾选 'repo' 权限"
    echo "4. 生成并复制 token"
    exit 1
fi

GITHUB_TOKEN="$1"
REPO_NAME="ai-factory"

echo "🔑 使用 GitHub Token 创建远程仓库..."

# 创建 GitHub 仓库
RESPONSE=$(curl -s -X POST "https://api.github.com/user/repos" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"AI Task Factory Platform - MVP\",\"private\":false}")

# 检查是否创建成功
if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ 仓库创建成功"
else
    if echo "$RESPONSE" | grep -q '"name":"'"$REPO_NAME"'"'; then
        echo "⚠️  仓库已存在，跳过创建"
    else
        echo "❌ 创建仓库失败"
        echo "$RESPONSE"
        exit 1
    fi
fi

# 获取 GitHub 用户名
USERNAME=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -o '"login": "[^"]*' | cut -d'"' -f4)

echo "👤 GitHub 用户名: $USERNAME"

# 检查是否已经有远程仓库
if git remote get-url origin &> /dev/null; then
    echo "📦 远程仓库已存在，更新地址..."
    git remote set-url origin "https://github.com/$USERNAME/$REPO_NAME.git"
else
    echo "📦 添加远程仓库..."
    git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
fi

# 推送代码
echo "🚀 正在推送代码到 GitHub..."
git push -u origin main

echo ""
echo "✅ 完成！"
echo "🌐 访问 https://github.com/$USERNAME/$REPO_NAME"
