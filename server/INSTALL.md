# 部署指南 - Cloudflare + 个人服务器

> 前端部署在 Cloudflare（starstill.art），图片和上传管理系统部署在个人服务器（s.guyue.me）

## 📋 系统架构

```
┌─────────────────────────────────────────────┐
│        Cloudflare (starstill.art)           │
│                                             │
│  ✓ 前端网站静态文件                        │
│  ✓ Jekyll 生成的 HTML/CSS/JS               │
│  ✗ 不存放图片、不存放上传系统              │
└──────────┬──────────────────────────────────┘
           │
           │ 调用 /starstill/images.json 获取图片列表
           │ 调用 /starstill/manage 上传新照片
           │
           ▼
┌──────────────────────────────────────────────────────┐
│     个人服务器 (s.guyue.me/starstill)                │
│                                                      │
│  ✓ 照片原文件 (/img/full/)                          │
│  ✓ 照片缩略图 (/img/thumb/)                         │
│  ✓ 元数据文件 (images.json)                         │
│  ✓ 上传管理系统 (/manage)                           │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Nginx 反向代理                              │  │
│  │  • /starstill/manage → Node.js (2655)        │  │
│  │  • /starstill/img → 静态文件                 │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## 🚀 部署步骤

### 第一步：准备服务器

1. **克隆项目**

```bash
cd /var/www
git clone https://github.com/guyue2203/photo.git
cd photo/server
```

2. **安装依赖**

```bash
npm install
```

3. **检查 ImageMagick**

```bash
magick -version  # 或 convert -version
```

如果未安装，使用包管理器安装：

```bash
# Ubuntu/Debian
sudo apt-get install imagemagick

# CentOS/RHEL
sudo yum install ImageMagick

# macOS
brew install imagemagick
```

### 第二步：配置上传系统

1. **复制并编辑环境变量**

```bash
cp .env.example .env
vim .env
```

**重要配置**：

```env
# 上传目录（必须是绝对路径）
UPLOAD_DIR=/var/guyue/s.guyue.me/starstill

# 认证凭证（建议修改为强密码）
UPLOAD_USER=admin
UPLOAD_PASS=your_very_secure_password_123

# 服务器端口（本地监听）
PORT=2655

# 图片基础 URL（前端用来拼接图片 URL）
IMAGE_BASE_URL=/starstill/img

# ImageMagick 命令
IMAGEMAGICK_COMMAND=magick

# 缩略图配置
THUMB_WIDTH=800
THUMB_QUALITY=82
```

2. **创建目录结构**

```bash
sudo mkdir -p /var/guyue/s.guyue.me/starstill/img/full
sudo mkdir -p /var/guyue/s.guyue.me/starstill/img/thumb
sudo chown -R www-data:www-data /var/guyue/s.guyue.me/starstill
```

3. **初始化 images.json**

```bash
echo '{"images": []}' | sudo tee /var/guyue/s.guyue.me/starstill/images.json
sudo chmod 644 /var/guyue/s.guyue.me/starstill/images.json
```

### 第三步：配置 Nginx

1. **查看 Nginx 配置示例**

```bash
cat nginx.conf.example
```

2. **创建或修改 Nginx 配置**

```bash
sudo vim /etc/nginx/sites-available/s.guyue.me
```

**关键配置块** (copy from `nginx.conf.example`)：

```nginx
# 上传管理系统反向代理
location ~ ^/starstill/manage(/.*)?$ {
    proxy_pass http://127.0.0.1:2655;
    rewrite ^/starstill/manage(/.*)?$ $1 break;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 100M;
}

# 静态图片文件服务
location ~ ^/starstill/img/ {
    alias /var/guyue/s.guyue.me/starstill/img/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

location = /starstill/images.json {
    alias /var/guyue/s.guyue.me/starstill/images.json;
    add_header Access-Control-Allow-Origin "*";
    add_header Cache-Control "no-cache";
}
```

3. **测试和重载 Nginx**

```bash
# 测试配置语法
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

### 第四步：启动上传服务

**使用 PM2** (推荐)：

```bash
# 安装 PM2
sudo npm install -g pm2

# 在项目目录启动
cd /var/www/photo/server
pm2 start app.js --name "photo-upload" --env production

# 保存并开机自启
pm2 save
pm2 startup

# 查看状态
pm2 status
pm2 logs photo-upload
```

**或使用 systemd**：

复制模板并按需调整路径：

```bash
sudo cp /var/guyue/s.guyue.me/starstill/server/photo-upload.service.example /etc/systemd/system/photo-upload.service
sudo vim /etc/systemd/system/photo-upload.service
```

模板内容：

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

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl start photo-upload
sudo systemctl enable photo-upload
sudo systemctl status photo-upload
```

### 第五步：测试部署

1. **测试上传管理界面**

```bash
# 在浏览器访问
https://s.guyue.me/starstill/manage
```

使用凭证登录：
- 用户名：admin
- 密码：（.env 中配置的密码）

2. **测试 API**

```bash
# 获取配置
curl https://s.guyue.me/starstill/manage/api/config

# 上传测试照片
curl -u admin:password \
  -F "image=@test.jpg" \
  -F "alt=测试照片" \
  https://s.guyue.me/starstill/manage/api/upload

# 获取图片列表
curl https://s.guyue.me/starstill/manage/api/images

# 访问图片
curl -I https://s.guyue.me/starstill/img/thumb/test.jpg
```

3. **测试前端集成**

在 Cloudflare 前端网站的 `_config.yml` 中确保配置正确：

```yaml
image_base_url: "https://s.guyue.me/starstill/img"
images_json_url: "https://s.guyue.me/starstill/images.json"
```

刷新网站，验证新上传的照片是否显示。

## 📝 日常维护

### 查看日志

```bash
# PM2
pm2 logs photo-upload

# systemd
sudo journalctl -u photo-upload -f
```

### 监控磁盘空间

```bash
# 查看上传目录的大小
du -sh /var/guyue/s.guyue.me/starstill
```

### 备份 images.json

```bash
# 定期备份
cp /var/guyue/s.guyue.me/starstill/images.json \
   ~/backup/images.json.$(date +%Y%m%d_%H%M%S)

# 或创建 cron 任务 (每天备份)
0 2 * * * cp /var/guyue/s.guyue.me/starstill/images.json ~/backup/images.json.$(date +\%Y\%m\%d)
```

### 管理图片

**删除旧照片**：

可以通过管理界面删除，或者直接删除文件：

```bash
# 删除原图和缩略图
rm /var/guyue/s.guyue.me/starstill/img/full/photo-xxx.jpg
rm /var/guyue/s.guyue.me/starstill/img/thumb/photo-xxx.jpg

# 然后编辑 images.json 删除对应条目
```

**批量导入旧照片**：

```bash
# 1. 将原图放入 img/full 目录
# 2. 使用脚本生成缩略图
node /var/www/photo/scripts/prepare-images.mjs --root /var/guyue/s.guyue.me/starstill
```

## 🔒 安全建议

- ✅ 使用 HTTPS（通过 Let's Encrypt 获得免费证书）
- ✅ 修改默认的管理员密码
- ✅ 限制上传目录的访问权限
- ✅ 定期备份 images.json
- ✅ 监控磁盘空间（防止填满）
- ✅ 考虑添加速率限制（防止滥用）
- ✅ 定期检查日志中的异常

## 🐛 故障排除

### 502 Bad Gateway

**原因**：Node.js 服务未运行或超时

**解决**：
```bash
pm2 status
pm2 restart photo-upload
pm2 logs photo-upload
```

### 无法上传大文件

**原因**：Nginx 或 Node.js 限制

**解决**：
```bash
# 增加 Nginx 限制
client_max_body_size 500M;

# 增加 Node.js 超时
proxy_read_timeout 600s;
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
```

### 缩略图生成失败

**原因**：ImageMagick 未安装或路径错误

**解决**：
```bash
# 检查命令
which magick
which convert

# 测试生成缩略图
magick /var/guyue/s.guyue.me/starstill/img/full/test.jpg \
       -resize 800x \
       -quality 82 \
       /var/guyue/s.guyue.me/starstill/img/thumb/test.jpg
```

### 前端无法加载图片

**原因**：images.json 路径错误或 Nginx 配置问题

**解决**：
```bash
# 检查 images.json 是否存在
curl https://s.guyue.me/starstill/images.json

# 检查缩略图是否存在
curl -I https://s.guyue.me/starstill/img/thumb/xxx.jpg

# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/s.guyue.me_access.log
```

## 📊 性能优化

### 启用 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_types application/json;
gzip_min_length 1000;
```

### 启用 CDN 缓存

```nginx
location ~ ^/starstill/img/ {
    # ...
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header X-Cache-Status "MISS";
}
```

### 缩略图尺寸优化

根据实际需求调整 `.env` 中的参数：

```env
# 更小的尺寸 = 更快的加载 + 更少的带宽
THUMB_WIDTH=600      # 而不是 800
THUMB_QUALITY=75     # 而不是 82
```

## 📞 获取帮助

- 文档：[README.md](./README.md)
- API：[README.md](./README.md#-api-文档)
- 配置示例：[nginx.conf.example](./nginx.conf.example)
