#!/bin/bash

echo "Testing /api/dishes endpoint..."
curl -X GET http://localhost:3000/api/dishes \
  -H "Content-Type: application/json" \
  -v

echo -e "\n\n=== Response ==="
