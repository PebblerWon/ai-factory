#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjNzY2NjMyZC03YThjLTQ2ODItYWZlNy1iMDNkNTJhODcyYTYiLCJyb2xlIjoidXNlciIsImlhdCI6MTc3NDI3NTc3NiwiZXhwIjoxNzc0ODgwNTc2fQ.3iYT2ds40UPa6YbeLDTGgZvPswyVmAw9R1ol1GgWmZo"

echo "发布翻译任务..."
curl -s -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"translation","input":{"text":"Hello World","sourceLanguage":"英文","targetLanguage":"中文"},"requirements":{"deadline":60}}' | jq .

echo ""
echo "发布图片生成任务..."
curl -s -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"image_generation","input":{"content":"Sunset","imageStyles":["写实"],"imageCount":1,"imageSize":"1024x1024"},"requirements":{"deadline":120}}' | jq .

echo ""
echo "发布数据转换任务..."
curl -s -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"data_conversion","input":{"content":"name,age\n张三,25","inputFormat":"csv","outputFormat":"json"},"requirements":{"deadline":60}}' | jq .

echo ""
echo "最终余额："
curl -s http://localhost:3001/api/wallet/balance -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "所有任务："
curl -s http://localhost:3001/api/tasks -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id: .id, type, status, pointsCost}'
