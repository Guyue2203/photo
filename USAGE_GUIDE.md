# 照片上传系统 - 用户指南

> 为 starstill.art 摄影作品集添加新照片的完整指南

## 🎯 目标

在最短的时间内，快速上传照片并显示在网站上，无需手动编辑代码或配置文件。

## 📋 系统概述

```
你 (上传者)
  ↓
  访问上传管理界面 (http://upload.你的域名.com)
  ↓
  输入用户名/密码登录
  ↓
  上传照片 + 输入说明
  ↓
  后端自动处理:
    • 保存原图
    • 生成缩略图
    • 更新元数据 JSON
  ↓
  网站自动显示新照片 ✅
```

## 🚀 快速开始 (本地测试)

### 一键启动

在项目根目录运行:

```bash
bash dev-start.sh
```

这会自动启动:
- 上传服务器 (http://localhost:2655)
- 前端网站 (http://localhost:4000)

### 手动启动

如果一键启动脚本不可用，分别启动两个服务:

**终端 1 - 上传服务器**:
```bash
cd server
npm install  # 首次运行需要
npm run dev  # 开发模式（支持热重载）
```

**终端 2 - 前端网站**:
```bash
bundle install  # 首次运行需要
bundle exec jekyll serve
```

然后访问:
- 📸 上传界面: http://localhost:2655
- 🌐 网站: http://localhost:4000

## 📸 如何上传照片

### 步骤 1: 访问上传界面

打开浏览器访问: **http://localhost:2655** (本地) 或 **http://s.guyue.me/upload** (实际服务器)

### 步骤 2: 登录认证

首次访问时会要求输入:
- **用户名**: admin
- **密码**: admin

（生产环境中建议修改这些凭证）

### 步骤 3: 选择照片

有两种方式:

**方式 1 - 拖拽上传**:
- 从文件夹拖拽图片到虚线框区域

**方式 2 - 点击选择**:
- 点击虚线框，从对话框选择图片

### 步骤 4: 添加说明 (可选)

在"图片说明"文本框输入照片的描述，例如:
```
在黄山顶峰的日出
```

### 步骤 5: 调整背景定位 (可选)

在"背景位置"输入框修改背景图片的定位方式，默认值:
```
center center
```

其他选项例如:
- `left center` - 左对齐
- `right center` - 右对齐
- `center top` - 顶部居中
- `center bottom` - 底部居中

### 步骤 6: 上传

点击"上传并生成缩略图"按钮。

系统会:
1. ⏳ 显示加载动画
2. 📤 上传照片到服务器
3. 🖼️ 调用 ImageMagick 生成缩略图
4. 📝 自动更新 images.json
5. ✅ 显示成功提示

## 👁️ 查看已上传照片

点击"管理照片"标签页，可以:
- 📷 查看所有已上传照片的缩略图
- 📝 查看每张照片的说明
- 📋 复制文件名
- 🗑️ 删除不需要的照片

## 🔒 认证和安全

### 本地存储凭证

一旦登录，凭证会保存在浏览器的本地存储 (localStorage) 中，后续访问时无需重复登录。

### 清除凭证

如果想退出登录，打开浏览器开发者工具:

**Chrome/Edge/Firefox**:
1. 按 `F12` 打开开发者工具
2. 进入 "应用" 或 "Storage" 标签
3. 找到 "Local Storage" → 本页面
4. 删除 "uploadCredentials" 键

### 修改密码

编辑服务器的 `.env` 文件:

```env
UPLOAD_USER=admin
UPLOAD_PASS=your_new_secure_password
```

然后重启上传服务器。

## 📐 支持的图片格式

✅ 支持:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)
- HEIC/HEIF (.heic, .heif) - iPhone 照片

⚠️ 限制:
- 最大文件大小: 100 MB
- 建议宽度: 800px 以上（会自动生成适应尺寸的缩略图）

## 🎨 生成的缩略图参数

系统会自动:
- 📐 将缩略图宽度设置为 **800px**
- 🎨 图片质量设置为 **82%** (平衡质量和文件大小)
- 🔄 自动旋转图片 (根据 EXIF 信息)

可以在 `.env` 文件修改这些参数:

```env
THUMB_WIDTH=800        # 缩略图宽度
THUMB_QUALITY=82       # 图片质量 (0-100)
```

## 📊 照片元数据 (images.json)

上传成功后，系统会自动维护 `images.json` 文件，格式如下:

```json
{
  "images": [
    {
      "src": "full/photo-1714982400000.jpg",
      "thumb": "thumb/photo-1714982400000.jpg",
      "alt": "在黄山顶峰的日出",
      "position": "center center"
    }
  ]
}
```

**字段说明**:
- `src` - 原图路径
- `thumb` - 缩略图路径
- `alt` - 图片说明
- `position` - 背景定位

## 🖼️ 网站如何显示照片

1. 前端从 `images.json` 读取照片列表
2. 根据 URL 拼接完整的图片地址:
   ```
   https://s.guyue.me/starstill/img/full/{filename}
   https://s.guyue.me/starstill/img/thumb/{filename}
   ```
3. 使用缩略图作为初始背景
4. 用户点击时显示原图（使用 Poptrox 库）

## ⚙️ 故障排除

### 问题 1: 上传失败 "401 Unauthorized"

**原因**: 凭证过期或错误

**解决**:
1. 清除浏览器本地存储 (见上面的认证部分)
2. 刷新页面，重新输入用户名密码

### 问题 2: 上传后找不到缩略图

**原因**: ImageMagick 未安装或路径错误

**解决**:
```bash
# 检查 ImageMagick
magick -version
# or
convert -version

# 如果未安装
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick
# CentOS: sudo yum install ImageMagick
```

### 问题 3: "No images found" 错误

**原因**: 上传目录不存在或权限错误

**解决**:
```bash
# 创建目录
mkdir -p /var/guyue/s.guyue.me/starstill/img/full
mkdir -p /var/guyue/s.guyue.me/starstill/img/thumb

# 修复权限
chmod 755 /var/guyue/s.guyue.me/starstill/img/*
```

### 问题 4: 502 Bad Gateway

**原因**: Node.js 服务不运行

**解决**:
```bash
# 检查服务状态
ps aux | grep node

# 重启服务
cd server && npm start
```

## 📝 高级用法

### 手动编辑 images.json

如果需要直接编辑 JSON 文件:

```bash
# 编辑文件
vim /var/guyue/s.guyue.me/starstill/images.json

# 修改后，前端会自动重新加载
```

### 导入旧照片

如果有旧照片想导入:

```bash
# 1. 将原图复制到 img/full/
cp old-photo.jpg /var/guyue/s.guyue.me/starstill/img/full/

# 2. 在服务器运行缩略图生成脚本
node /path/to/photo/scripts/prepare-images.mjs --root /var/guyue/s.guyue.me/starstill
```

### 批量删除照片

通过管理界面逐个删除，或直接编辑 JSON 文件。

## 🚀 生产环境部署

详见 [server/DEPLOYMENT.md](../server/DEPLOYMENT.md)

核心步骤:
1. 在服务器上初始化: `bash setup.sh`
2. 配置 .env 文件
3. 使用 Nginx 反向代理
4. 使用 PM2 或 systemd 管理进程
5. 配置 HTTPS

## 📞 需要帮助？

- 📚 详细文档: [server/README.md](../server/README.md)
- 🏗️ 架构说明: [ARCHITECTURE.md](../ARCHITECTURE.md)
- 📧 联系作者: hi@starstill.art

---

**提示**: 定期备份 images.json 文件!

```bash
cp /var/guyue/s.guyue.me/starstill/images.json ~/backup/images.json.$(date +%Y%m%d)
```
