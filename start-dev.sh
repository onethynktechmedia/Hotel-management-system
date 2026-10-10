#!/bin/bash
cd "/home/tejas/Documents/hotel (copy)"
while true; do
  echo "Starting Next.js dev server..."
  npm run dev
  echo "Server exited. Restarting in 5 seconds..."
  sleep 5
done
