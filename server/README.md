# 照片上传系统

> 为星依旧摄影作品集提供的照片上传和管理系统

## 📋 概述

本系统包含：

1. **Node.js 上传服务器** - 处理照片上传、生成缩略图、管理元数据
2. **Web 管理界面** - 美观的上传和管理 UI
3. **API 接口** - RESTful API 支持第三方集成

## 🚀 快速开始

### 本地测试

```bash
# 1. 安装依赖
cd server
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件（仅本地测试可用默认值）

# 3. 创建本地上传目录
mkdir -p data/img/full
mkdir -p data/img/thumb

# 4. 初始化 images.json
echo '{"images": []}' > data/images.json

# 5. 启动服务器
npm run dev
```

访问 http://localhost:2655 即可看到管理界面。

### 生产部署 (Cloudflare + 个人服务器)

这个系统设计用于与 Cloudflare 前端部署配合使用：

- **前端网站**: 部署在 Cloudflare（如 starstill.art）
- **图片 + 上传管理**: 部署在个人服务器（s.guyue.me/starstill/manage）

**快速开始**：查看 [INSTALL.md](./INSTALL.md) 获取完整的部署步骤

**简要流程**:

1. 在个人服务器上部署本上传服务器
2. 配置 Nginx 反向代理 `/starstill/manage` → Node.js
3. 配置 Nginx 静态文件服务 `/starstill/img/` → 图片目录
4. 启动 Node.js 应用（使用 PM2 或 systemd）
5. 前端网站访问 `https://s.guyue.me/starstill/manage` 来上传照片
6. 前端从 `https://s.guyue.me/starstill/images.json` 读取图片列表

详细的 Nginx 配置示例见 [nginx.conf.example](./nginx.conf.example)

## 📚 API 文档

### 1. 上传照片

**POST** `/api/upload`

请求头:
```
Authorization: Basic <base64(username:password)>
Content-Type: multipart/form-data
```

请求体:
```
- image: File (必需) - 照片文件
- alt: string (可选) - 图片说明
- position: string (可选) - 背景定位，默认 "center center"
```

响应:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "image": {
    "filename": "photo-1714982400000.jpg",
    "src": "full/photo-1714982400000.jpg",
    "thumb": "thumb/photo-1714982400000.jpg",
    "alt": "照片说明",
    "position": "center center"
  }
}
```

### 2. 获取图片列表

**GET** `/api/images`

响应:
```json
{
  "images": [
    {
      "src": "full/photo-1714982400000.jpg",
      "thumb": "thumb/photo-1714982400000.jpg",
      "alt": "照片说明",
      "position": "center center"
    }
  ]
}
```

### 3. 删除照片

**DELETE** `/api/images/{filename}`

请求头:
```
Authorization: Basic <base64(username:password)>
```

响应:
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

## 🔒 认证

系统使用 HTTP Basic Authentication。

**获取凭证**:
```bash
# 用户名:密码 进行 Base64 编码
echo -n "admin:password" | base64
# aWQtcGFzc3dvcmQtY2FsbHVzZXI=
```

**在 curl 中使用**:
```bash
curl -u admin:password http://localhost:2655/api/images
```

## 📦 文件结构

```
server/
├── app.js              # Express 服务器主文件
├── package.json        # 依赖配置
├── .env.example        # 环境变量示例
├── public/
│   └── index.html      # Web 管理界面
├── DEPLOYMENT.md       # 部署指南
└── README.md          # 本文件
```

## 🎨 Web 界面功能

### 上传标签

- 拖拽上传或点击选择图片
- 实时图片预览
- 输入图片说明和背景定位
- 自动生成缩略图

### 管理标签

- 查看所有已上传的照片
- 缩略图预览
- 批量或单个删除
- 复制文件名

## ⚙️ 配置参数

| 参数 | 说明 | 默认值 |
|-----|------|--------|
| `UPLOAD_DIR` | 上传目录绝对路径 | `/var/guyue/s.guyue.me/starstill` |
| `UPLOAD_USER` | 认证用户名 | `admin` |
| `UPLOAD_PASS` | 认证密码 | `admin` |
| `PORT` | 服务器端口 | `2655` |
| `IMAGEMAGICK_COMMAND` | ImageMagick 命令 | `magick` |
| `THUMB_WIDTH` | 缩略图宽度 | `1600` |
| `THUMB_QUALITY` | 缩略图质量 (0-100) | `90` |
| `THUMB_SHARPEN` | 缩略图锐化参数 | `0x0.6` |

## 🔄 工作流程

```
用户上传图片
      ↓
Express 接收请求并验证认证
      ↓
保存原图到 img/full/
      ↓
调用 ImageMagick 生成缩略图到 img/thumb/
      ↓
读取 images.json
      ↓
添加新图片元数据到 JSON
      ↓
写入 images.json
      ↓
返回成功响应
      ↓
前端自动从 images.json 加载新图片
```

## 📷 图片格式支持

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)
- HEIC/HEIF (.heic, .heif)

最大文件大小: 100MB

## 🐛 常见问题

**Q: 上传后找不到缩略图？**
A: 确保 ImageMagick 已安装，运行 `magick -version` 检查。

**Q: 403 Unauthorized？**
A: 检查用户名和密码是否正确，或者 credentials 本地存储是否过期。

**Q: images.json 格式错误？**
A: 可以手动重置为 `{"images": []}`，系统会自动恢复。

## 📝 与前端集成

前端会从以下地址加载图片:

```javascript
// 配置在 _config.yml
image_base_url: https://s.guyue.me/starstill/img
images_json_url: https://s.guyue.me/starstill/images.json
```

前端 JavaScript 会:
1. 从 `images_json_url` 获取 images.json
2. 根据 `image_base_url` 拼接完整的图片 URL
3. 显示缩略图并支持弹出全图

## 🔐 安全建议

- 修改默认用户名和密码
- 使用 HTTPS/TLS 加密传输
- 限制上传目录访问权限
- 定期备份 images.json
- 监控磁盘空间使用

## 📜 许可证

GPL-3.0

## 👨‍💻 作者

星依旧 (hi@starstill.art)
