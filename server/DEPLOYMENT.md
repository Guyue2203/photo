# 照片上传服务器 - 部署指南

## 功能介绍

这是一个 Node.js 照片上传服务器，可以：
- 🖼️ 上传照片并自动生成缩略图
- 📝 管理照片元数据 (images.json)
- 🔒 Basic Auth 身份认证
- 🎨 漂亮的 Web 管理界面

## 前置要求

1. **Node.js** >= 16.0.0
2. **ImageMagick** - 用于生成缩略图
   - macOS: `brew install imagemagick`
   - Ubuntu: `sudo apt-get install imagemagick`
   - CentOS: `sudo yum install ImageMagick`
3. **服务器目录结构**:
   ```
   /var/guyue/s.guyue.me/starstill/
   ├── img/
   │   ├── full/        (原图目录)
   │   └── thumb/       (缩略图目录)
   └── images.json      (图片元数据)
   ```

## 安装步骤

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下配置：

```env
UPLOAD_DIR=/var/guyue/s.guyue.me/starstill
UPLOAD_USER=admin
UPLOAD_PASS=your_secure_password_here
PORT=2655
```

### 3. 创建目录结构

```bash
mkdir -p /var/guyue/s.guyue.me/starstill/img/full
mkdir -p /var/guyue/s.guyue.me/starstill/img/thumb
```

### 4. 初始化 images.json

```bash
echo '{"images": []}' > /var/guyue/s.guyue.me/starstill/images.json
```

## 运行服务器

### 开发模式（监听文件变化）

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

## 使用 API

### 访问 Web 管理界面

打开浏览器访问: `http://your-server:2655`

### 上传照片 API

```bash
curl -u admin:password -F "image=@photo.jpg" \
  -F "alt=照片说明" \
  -F "position=center center" \
  http://your-server:2655/api/upload
```

### 获取图片列表

```bash
curl http://your-server:2655/api/images
```

### 删除照片

```bash
curl -u admin:password -X DELETE \
  http://your-server:2655/api/images/filename.jpg
```

## Nginx 反向代理配置

### 场景：通过 s.guyue.me/starstill/manage 访问上传界面

```nginx
upstream upload_server {
    server 127.0.0.1:2655;
    keepalive 64;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name s.guyue.me;

    # SSL 配置（如果使用 HTTPS）
    # ssl_certificate /path/to/certificate.crt;
    # ssl_certificate_key /path/to/private.key;

    # 上传管理界面 - 反向代理到 Node.js 服务器
    location ~ ^/starstill/manage(/.*)?$ {
        proxy_pass http://upload_server;
        
        # 重要：重写路径，将 /starstill/manage/* 转换为 /*
        rewrite ^/starstill/manage(/.*)?$ $1 break;
        
        # 代理头部设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # HTTP 1.1 连接复用
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 上传文件大小限制
        client_max_body_size 100M;
    }

    # 静态图片文件 - 直接从文件系统提供
    location ~ ^/starstill/img/ {
        alias /var/guyue/s.guyue.me/starstill/img/;
        
        # 长期缓存
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # 打开文件缓存
        open_file_cache max=1000 inactive=20s;
        open_file_cache_valid 30s;
        open_file_cache_min_uses 2;
        open_file_cache_errors on;
    }

    # 图片元数据 - 前端网站从这里读取照片列表
    location = /starstill/images.json {
        alias /var/guyue/s.guyue.me/starstill/images.json;
        add_header Access-Control-Allow-Origin "*";
        add_header Cache-Control "no-cache";
    }
}
```

### 环境变量配置（对应上面的 Nginx 配置）

在 `.env` 文件中配置：

```env
# 上传服务器在本地监听的端口
PORT=2655

# 上传目录（绝对路径）
UPLOAD_DIR=/var/guyue/s.guyue.me/starstill

# 基础路径前缀（用于 URL 重写）
# 由于 Nginx 使用 rewrite 将 /starstill/manage/* 改写为 /*，
# 所以这里不需要设置 BASE_PATH
BASE_PATH=

# 图片基础 URL（前端使用，用来拼接缩略图 URL）
IMAGE_BASE_URL=/starstill/img

# 认证凭证
UPLOAD_USER=admin
UPLOAD_PASS=your_secure_password_here

# ImageMagick 配置
IMAGEMAGICK_COMMAND=magick
THUMB_WIDTH=1600
THUMB_QUALITY=90
THUMB_SHARPEN=0x0.6
```

### 工作流程

1. **用户访问**：`https://s.guyue.me/starstill/manage`
2. **Nginx 处理**：
   - 匹配 `^/starstill/manage(/.*)?$` 规则
   - 使用 `rewrite` 将路径改写为 `/`
   - 转发到 `http://127.0.0.1:2655/`
3. **后端响应**：
   - 路由 `/` 返回 `public/index.html`
   - 路由 `/api/config` 返回配置信息（包括 `imageBaseUrl: /starstill/img`）
4. **前端加载**：
   - JavaScript 调用 `/api/config` 获取图片基础 URL
   - 当用户上传照片时，调用 `/api/upload`
5. **图片访问**：
   - 图片请求：`/starstill/img/thumb/photo.jpg`
   - Nginx 直接从文件系统返回（不走 Node.js）

### 测试部署

```bash
# 测试上传
curl -u admin:password -F "image=@test.jpg" \
  -F "alt=测试照片" \
  https://s.guyue.me/starstill/manage/api/upload

# 测试获取图片列表
curl https://s.guyue.me/starstill/manage/api/images

# 测试获取配置
curl https://s.guyue.me/starstill/manage/api/config

# 测试图片访问
curl -I https://s.guyue.me/starstill/img/thumb/test.jpg
```

### 简化配置（不使用 rewrite）

如果不想使用 Nginx `rewrite`，可以配置 `BASE_PATH` 环境变量：

```env
BASE_PATH=/starstill/manage
IMAGE_BASE_URL=/starstill/img
```

对应的 Nginx 配置：

```nginx
location /starstill/manage {
    proxy_pass http://127.0.0.1:2655;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 100M;
}
```

**优点**：Nginx 配置简单
**缺点**：Node.js 需要处理 `/starstill/manage` 路径

### 完整配置示例

详见 [nginx.conf.example](./nginx.conf.example)

## Systemd 服务配置

复制模板并按需调整路径:

```bash
sudo cp /path/to/photo/server/photo-upload.service.example /etc/systemd/system/photo-upload.service
sudo vim /etc/systemd/system/photo-upload.service
```

模板内容:

```ini
[Unit]
Description=Starstill Photo Upload Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/guyue/s.guyue.me/starstill/server
EnvironmentFile=/var/guyue/s.guyue.me/starstill/server/.env
ExecStart=/usr/bin/node /var/guyue/s.guyue.me/starstill/server/app.js
Restart=on-failure
RestartSec=10

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/guyue/s.guyue.me/starstill

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
sudo systemctl start photo-upload
sudo systemctl enable photo-upload
sudo systemctl status photo-upload
```

## PM2 进程管理

安装 PM2:

```bash
npm install -g pm2
```

启动服务:

```bash
cd /path/to/photo/server
pm2 start app.js --name "photo-upload" --env production
pm2 save
pm2 startup
```

## 安全性建议

1. ✅ 修改默认密码
2. ✅ 使用 HTTPS（通过 Nginx 或反向代理）
3. ✅ 限制上传文件大小
4. ✅ 定期备份 images.json
5. ✅ 使用防火墙限制访问

## 故障排除

### 502 Bad Gateway

检查 Node.js 服务是否运行:
```bash
ps aux | grep node
```

### ImageMagick not found

验证 ImageMagick 安装:
```bash
magick -version
# or
convert -version
```

### 文件权限错误

检查上传目录权限:
```bash
ls -la /var/guyue/s.guyue.me/starstill/img/
chmod 755 /var/guyue/s.guyue.me/starstill/img/*
```

## 与前端集成

前端已配置为从以下地址加载图片:

- 图片地址: `https://s.guyue.me/starstill/img/full/{filename}`
- 缩略图: `https://s.guyue.me/starstill/img/thumb/{filename}`
- 元数据: `https://s.guyue.me/starstill/images.json`

确保这些 URLs 在你的 Nginx 配置中正确配置。

## 备份 images.json

定期备份元数据文件:

```bash
# 每天备份
0 2 * * * cp /var/guyue/s.guyue.me/starstill/images.json /backup/images.json.$(date +%Y%m%d)
```
