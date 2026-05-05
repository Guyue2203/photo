# 项目架构和快速参考指南

## 📐 系统架构（部署在 Cloudflare + 个人服务器）

```
┌────────────────────────────────────────────────────────────────┐
│             Cloudflare (starstill.art)                         │
│                                                                │
│  ✅ 前端网站 (Jekyll 静态网页)                                 │
│     - 从 s.guyue.me/starstill/images.json 读取图片列表        │
│     - 从 s.guyue.me/starstill/img/ 加载图片                   │
│     - 提供上传入口链接到 s.guyue.me/starstill/manage         │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        │ 图片 URL: s.guyue.me/starstill/img/thumb/
                        │ 元数据: s.guyue.me/starstill/images.json
                        │ 上传管理: s.guyue.me/starstill/manage
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│          个人服务器 (s.guyue.me)                               │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Nginx 反向代理                                          │ │
│  │                                                          │ │
│  │  /starstill/manage → localhost:2655 (上传管理系统)      │ │
│  │  /starstill/img → 静态文件服务 (图片文件)              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                        │                 ▲                     │
│                        │                 │                     │
│  ┌─────────────────────▼──────────────┐  │                     │
│  │  Node.js 应用 (localhost:2655)    │  │                     │
│  │                                   │  │                     │
│  │  • GET /              → index.html│  │                     │
│  │  • POST /api/upload   → 处理上传  │  │                     │
│  │  • GET /api/images    → 返回列表  │  │                     │
│  │  • GET /api/config    → 返回配置  │  │                     │
│  │  • DELETE /api/images → 删除照片  │  │                     │
│  │  • GET /health        → 健康检查  │  │                     │
│  └─────────────────────┬─────────────┘  │                     │
│                        │                 │                     │
│                        │ 读写            │ 访问                │
│                        ▼                 │                     │
│  ┌──────────────────────────────────┐   │                     │
│  │  /var/guyue/s.guyue.me/starstill/    │                     │
│  │  ├── img/                        │   │                     │
│  │  │   ├── full/                  │───┘                     │
│  │  │   │   └── photo-*.jpg        │  (原图)                 │
│  │  │   └── thumb/                 │                         │
│  │  │       └── photo-*.jpg        │  (缩略图)               │
│  │  └── images.json                 │                         │
│  │      (元数据: src, thumb, alt)  │                         │
│  │                                  │                         │
│  │  ImageMagick 处理               │                         │
│  │  (auto-orient, resize, compress) │                         │
│  └──────────────────────────────────┘                         │
└────────────────────────────────────────────────────────────────┘
```

## 🔄 用户上传流程

```
1. 用户访问: https://starstill.art
   ↓
2. 点击"上传照片"按钮，进入: s.guyue.me/starstill/manage
   ↓
3. 输入用户名/密码登录
   ↓
4. 选择照片并填写说明
   ↓
5. 点击"上传"
   ↓
6. Nginx 转发请求到 Node.js 应用
   ↓
7. 后端:
   • 保存原图到 img/full/
   • 使用 ImageMagick 生成缩略图到 img/thumb/
   • 更新 images.json (添加新图片元数据)
   ↓
8. 返回成功响应
   ↓
9. 用户刷新 starstill.art，看到新照片 ✅
```

## 📁 项目目录结构

```
photo/
├── 前端网站文件
│   ├── _config.yml                # Jekyll 配置（图片加载 URL）
│   ├── index.html                 # 主页面
│   ├── _layouts/default.html      # Jekyll 布局
│   ├── _includes/                 # Jekyll includes
│   ├── assets/
│   │   ├── js/
│   │   │   ├── main.js            # 图片加载和展示逻辑 ⭐
│   │   │   ├── jquery.poptrox.js  # 弹出式图片浏览
│   │   │   └── exif.js            # EXIF 数据读取
│   │   ├── css/                   # 样式文件
│   │   └── sass/                  # SASS 源文件
│   ├── gulpfile.mjs               # Gulp 构建配置
│   └── wrangler.jsonc             # Cloudflare Workers 配置
│
├── 图片处理脚本
│   └── scripts/
│       └── prepare-images.mjs      # 缩略图生成脚本
│           (旧方式：手动在服务器运行)
│
├── 📸 上传服务器 (新增) ⭐⭐⭐
│   └── server/
│       ├── app.js                 # Express 应用入口
│       ├── package.json           # 依赖配置
│       ├── .env.example           # 环境变量示例
│       ├── setup.sh               # 初始化脚本
│       ├── public/
│       │   └── index.html         # 上传管理 Web 界面
│       ├── README.md              # 上传系统文档
│       ├── DEPLOYMENT.md          # 部署指南
│       └── data/                  # 本地测试数据目录
│           └── img/
│               ├── full/          # 原图（测试）
│               └── thumb/         # 缩略图（测试）
│
└── 通用文件
    ├── README.md                  # 项目说明
    ├── package.json               # 主项目依赖
    ├── LICENSE
    └── .gitignore
```

## 🚀 快速开始

### 开发本地测试

```bash
# 1. 克隆项目
git clone https://github.com/guyue2203/photo.git
cd photo

# 2. 设置上传服务器
cd server
bash setup.sh
vim .env  # 配置本地路径（可用默认的 data/ 目录）

# 3. 启动上传服务器（开发模式）
npm run dev
# 访问 http://localhost:2655

# 4. 另开终端，启动前端本地预览
cd ..
bundle exec jekyll serve
# 访问 http://localhost:4000
```

### 生产部署

```bash
# 在服务器上
cd /var/www/photo/server
bash setup.sh

# 编辑 .env 配置
# UPLOAD_DIR=/var/guyue/s.guyue.me/starstill
# UPLOAD_USER=admin
# UPLOAD_PASS=secure_password

# 启动服务（使用 PM2 或 systemd）
npm start

# Nginx 配置反向代理到 localhost:2655
```

## 📋 工作流对比

### 旧方式（还支持）

```
1. 手动上传原图到服务器 img/full/ 目录
   ↓
2. 在服务器运行脚本
   npm run photos -- --root /var/guyue/s.guyue.me/starstill
   ↓
3. 脚本自动生成缩略图和 images.json
   ↓
4. 访问网站查看新照片
```

### 新方式（推荐）⭐

```
1. 访问 http://s.guyue.me/upload
   ↓
2. 输入用户名密码登录
   ↓
3. 上传照片并填写说明
   ↓
4. 点击"上传"按钮
   ↓
5. 后端自动：
   • 保存原图
   • 调用 ImageMagick 生成缩略图
   • 更新 images.json
   ↓
6. 页面自动刷新显示新照片 ✅
```

## 🔑 关键配置

### 前端配置 (_config.yml)

```yaml
image_base_url: "https://s.guyue.me/starstill/img"
images_json_url: "https://s.guyue.me/starstill/images.json"

exif: '[
  {"tag": "Model", "icon": "fa fa-camera-retro"},
  {"tag": "FNumber", "icon": "far fa-dot-circle"},
  {"tag": "ExposureTime", "icon": "far fa-clock"},
  {"tag": "ISOSpeedRatings", "icon": "fa fa-info-circle"}
]'
```

### 上传服务器配置 (.env)

```bash
UPLOAD_DIR=/var/guyue/s.guyue.me/starstill
UPLOAD_USER=admin
UPLOAD_PASS=your_secure_password
PORT=2655
THUMB_WIDTH=800
THUMB_QUALITY=82
```

## 🎨 images.json 数据格式

```json
{
  "images": [
    {
      "src": "full/photo-1714982400000.jpg",
      "thumb": "thumb/photo-1714982400000.jpg",
      "alt": "照片说明",
      "position": "center center"
    },
    {
      "src": "full/another-photo.jpg",
      "thumb": "thumb/another-photo.jpg",
      "alt": "另一张照片",
      "position": "center center"
    }
  ]
}
```

## 🛠️ 常用命令

```bash
# 前端相关
npm install                      # 安装前端依赖
npx gulp build                   # 构建前端资源（SASS + JS）
bundle exec jekyll serve         # 本地预览

# 上传服务器相关
npm run upload-server:install    # 安装服务器依赖
npm run upload-server:dev        # 开发模式启动
npm run upload-server:start      # 生产模式启动

# 缩略图生成（旧方式）
npm run photos -- --root /path/to/starstill
```

## 📱 前端交互流程

1. 用户访问 https://starstill.art
2. Jekyll 加载 index.html
3. main.js 从 `data-images-json-url` 获取 images.json
4. 解析图片列表，为每张图片创建 `<article class="thumb">`
5. 设置缩略图为背景
6. 用户点击缩略图 → Poptrox 弹出大图查看
7. 从 EXIF 数据读取相机参数（如可用）

## 🔒 安全性

- ✅ 上传 API 使用 HTTP Basic Auth
- ✅ 敏感文件（.env）在 .gitignore 中
- ✅ 建议使用 HTTPS + Nginx 反向代理
- ✅ 建议定期备份 images.json

## 📊 API 端点参考

| 方法 | 端点 | 认证 | 描述 |
|-----|------|------|------|
| POST | `/api/upload` | ✅ | 上传照片 |
| GET | `/api/images` | ❌ | 获取图片列表 |
| DELETE | `/api/images/{filename}` | ✅ | 删除图片 |
| GET | `/` | ❌ | 管理 Web 界面 |
| GET | `/health` | ❌ | 健康检查 |

## 🐛 常见问题

**Q: 如何修改已上传照片的说明？**
A: 访问管理界面删除后重新上传，或手动编辑 images.json。

**Q: 支持哪些图片格式？**
A: JPEG, PNG, WebP, GIF, HEIC/HEIF，最大 100MB。

**Q: 缩略图尺寸如何调整？**
A: 修改 .env 中的 `THUMB_WIDTH` 和 `THUMB_QUALITY`。

**Q: 可以在前端添加上传功能吗？**
A: 可以，但不推荐。上传系统独立是为了安全性和管理方便。

## 📚 相关文档

- [README.md](./README.md) - 项目总体说明
- [server/README.md](./server/README.md) - 上传系统详细文档
- [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) - 生产部署指南
- [_config.yml](./_config.yml) - Jekyll 配置

---

**最后更新**: 2026-05-05  
**作者**: 星依旧  
**许可证**: GPL-3.0
