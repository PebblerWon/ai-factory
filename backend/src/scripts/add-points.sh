#!/bin/bash

# 管理员登录
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aifactory.com","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.token')
echo "Admin Token: ${ADMIN_TOKEN:0:50}..."

# test 用户登录
TEST_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}')

TEST_ID=$(echo "$TEST_RESPONSE" | jq -r '.data.user.id')
echo "Test User ID: $TEST_ID"

# 添加积分
echo ""
echo "Adding 100 points to user $TEST_ID..."
curl -s -X POST "http://localhost:3001/api/admin/users/$TEST_ID/points" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"amount": 100}'

echo ""
echo "Verifying balance..."
TEST_TOKEN=$(echo "$TEST_RESPONSE" | jq -r '.data.token')
curl -s http://localhost:3001/api/wallet/balance \
  -H "Authorization: Bearer $TEST_TOKEN"
