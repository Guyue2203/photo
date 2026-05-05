# 快速部署指南 - 5 分钟上手

> 适合 Cloudflare 前端 + 个人服务器的部署方案

## 🎯 目标

- 前端：已部署在 Cloudflare (starstill.art)
- 图片：存储在个人服务器 (s.guyue.me/starstill/img)
- 上传管理：部署在个人服务器 (s.guyue.me/starstill/manage)

## ⚡ 部署流程 (15 分钟)

### 1️⃣ 初始化 (3 分钟)

```bash
cd /var/www/photo/server

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env
vim .env
```

### 2️⃣ 配置 .env (2 分钟)

```env
PORT=2655
UPLOAD_DIR=/var/guyue/s.guyue.me/starstill
UPLOAD_USER=admin
UPLOAD_PASS=your_secure_password
IMAGE_BASE_URL=/starstill/img
```

### 3️⃣ 创建目录结构 (1 分钟)

```bash
sudo mkdir -p /var/guyue/s.guyue.me/starstill/img/{full,thumb}
sudo chown -R www-data:www-data /var/guyue/s.guyue.me/starstill
echo '{"images": []}' | sudo tee /var/guyue/s.guyue.me/starstill/images.json
```

### 4️⃣ 配置 Nginx (3 分钟)

从 `nginx.conf.example` 中复制配置：

```nginx
# 上传管理系统
location ~ ^/starstill/manage(/.*)?$ {
    proxy_pass http://127.0.0.1:2655;
    rewrite ^/starstill/manage(/.*)?$ $1 break;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 100M;
}

# 静态图片服务
location ~ ^/starstill/img/ {
    alias /var/guyue/s.guyue.me/starstill/img/;
    expires 30d;
}
```

然后：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5️⃣ 启动应用 (2 分钟)

**使用 PM2**（推荐）：

```bash
sudo npm install -g pm2
cd /var/www/photo/server
pm2 start app.js --name photo-upload --env production
pm2 save
pm2 startup
```

或**使用 systemd**（见 [INSTALL.md](./server/INSTALL.md)）

### 6️⃣ 测试 (1 分钟)

```bash
# 验证管理界面
curl https://s.guyue.me/starstill/manage

# 测试上传 API
curl -u admin:password \
  -F "image=@test.jpg" \
  https://s.guyue.me/starstill/manage/api/upload

# 查看图片列表
curl https://s.guyue.me/starstill/manage/api/images
```

## 📋 完整文档

- **详细部署**：[server/INSTALL.md](./server/INSTALL.md)
- **Nginx 配置**：[server/nginx.conf.example](./server/nginx.conf.example)
- **系统架构**：[ARCHITECTURE.md](./ARCHITECTURE.md)
- **API 文档**：[server/README.md](./server/README.md)

## 🚀 使用

### 访问上传界面

打开浏览器访问：

```
https://s.guyue.me/starstill/manage
```

登录凭证：
- 用户名：admin
- 密码：（.env 中配置的密码）

### 上传照片流程

1. 点击"上传照片"标签
2. 拖拽或选择图片
3. 输入图片说明（可选）
4. 点击"上传"按钮

系统会自动：
- ✅ 保存原图
- ✅ 生成缩略图
- ✅ 更新 images.json
- ✅ 图片立即显示在网站上

### 管理已有照片

1. 点击"管理照片"标签
2. 查看所有已上传的照片
3. 删除不需要的照片

## 🔧 常见操作

### 查看运行日志

```bash
# PM2
pm2 logs photo-upload

# systemd
sudo journalctl -u photo-upload -f
```

### 重启应用

```bash
# PM2
pm2 restart photo-upload

# systemd
sudo systemctl restart photo-upload
```

### 修改密码

编辑 `/var/www/photo/server/.env`：

```env
UPLOAD_PASS=new_password
```

然后重启应用。

### 备份图片元数据

```bash
# 备份 images.json
cp /var/guyue/s.guyue.me/starstill/images.json \
   ~/backup/images.json.$(date +%Y%m%d_%H%M%S)

# 创建定期备份 cron 任务
0 2 * * * cp /var/guyue/s.guyue.me/starstill/images.json ~/backup/images.json.\$(date +\%Y\%m\%d)
```

## ⚠️ 故障排除

### 502 Bad Gateway

检查应用是否运行：
```bash
pm2 status
# 或
curl http://localhost:2655/health
```

### 上传失败 (401 Unauthorized)

清除浏览器本地存储：
- F12 打开开发者工具
- 进入 "Storage" → "Local Storage"
- 删除 `uploadCredentials`

### 缩略图生成失败

检查 ImageMagick：
```bash
magick -version
```

## 📞 需要帮助？

- 查看详细文档：[server/INSTALL.md](./server/INSTALL.md)
- 查看 API 文档：[server/README.md](./server/README.md)
- 查看 Nginx 配置示例：[server/nginx.conf.example](./server/nginx.conf.example)

---

**祝部署顺利！** 🎉
