#!/bin/bash
cd backend
pm2 start dist/index.js --name "shadow-backend"
cd ../frontend
pm2 start "npm start" --name "shadow-frontend"
pm2 save
echo "Server started! Access at http://localhost:3000"
