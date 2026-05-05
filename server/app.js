import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

loadEnvFile(path.join(__dirname, '.env'));

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

// 配置
const CONFIG = {
  uploadDir: process.env.UPLOAD_DIR || '/var/guyue/s.guyue.me/starstill',
  fullDir: 'img/full',
  thumbDir: 'img/thumb',
  jsonPath: 'images.json',
  port: process.env.PORT || 2655,
  auth: {
    username: process.env.UPLOAD_USER || 'admin',
    password: process.env.UPLOAD_PASS || 'admin'
  },
  imagemagick: process.env.IMAGEMAGICK_COMMAND || 'magick',
  thumbnailWidth: process.env.THUMB_WIDTH || '1600',
  thumbnailQuality: process.env.THUMB_QUALITY || '90',
  thumbnailSharpen: process.env.THUMB_SHARPEN || '0x0.6',
  // 图片基础 URL（用于前端显示缩略图）
  // 例如: https://s.guyue.me/starstill/img 或 /starstill/img (相对路径)
  imageBaseUrl: process.env.IMAGE_BASE_URL || '/starstill/img'
};

// 多媒体上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 基础路径前缀（用于 Nginx 反向代理）
const BASE_PATH = process.env.BASE_PATH || '';

// Basic Auth 中间件
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    res.set('WWW-Authenticate', 'Basic realm="Starstill Photo Upload"');
    return res.status(401).json({ error: 'Authorization required' });
  }

  const [scheme, credentials] = auth.split(' ');
  if (scheme !== 'Basic' || !credentials) {
    res.set('WWW-Authenticate', 'Basic realm="Starstill Photo Upload"');
    return res.status(401).json({ error: 'Invalid auth scheme' });
  }

  const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  if (username !== CONFIG.auth.username || password !== CONFIG.auth.password) {
    res.set('WWW-Authenticate', 'Basic realm="Starstill Photo Upload"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
};

// 中间件
app.use(express.json());
app.use(BASE_PATH || '/', basicAuth, express.static(path.join(__dirname, 'public')));

// 生成缩略图
async function generateThumbnail(sourceFile, targetFile) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.imagemagick, [
      sourceFile,
      '-auto-orient',
      '-resize',
      `${CONFIG.thumbnailWidth}x`,
      '-unsharp',
      CONFIG.thumbnailSharpen,
      '-quality',
      CONFIG.thumbnailQuality,
      targetFile
    ]);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ImageMagick failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// 读取 images.json
async function readImagesList() {
  const jsonPath = path.join(CONFIG.uploadDir, CONFIG.jsonPath);
  try {
    const data = await readFile(jsonPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { images: [] };
    }
    throw err;
  }
}

// 写入 images.json
async function writeImagesList(data) {
  const jsonPath = path.join(CONFIG.uploadDir, CONFIG.jsonPath);
  await writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// 上传图片端点
app.post(BASE_PATH + '/api/upload', basicAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // 验证上传目录
    const fullPath = path.join(CONFIG.uploadDir, CONFIG.fullDir);
    const thumbPath = path.join(CONFIG.uploadDir, CONFIG.thumbDir);

    try {
      await access(fullPath);
      await access(thumbPath);
    } catch {
      await mkdir(fullPath, { recursive: true });
      await mkdir(thumbPath, { recursive: true });
    }

    // 生成文件名
    const ext = path.extname(req.file.originalname);
    const basename = path.basename(req.file.originalname, ext);
    const timestamp = Date.now();
    const filename = `${basename}-${timestamp}${ext}`;
    const fullFilePath = path.join(fullPath, filename);
    const thumbFilePath = path.join(thumbPath, filename);

    // 写入原图
    const fs = await import('fs/promises');
    await fs.writeFile(fullFilePath, req.file.buffer);

    // 生成缩略图
    await generateThumbnail(fullFilePath, thumbFilePath);

    // 更新 images.json
    const imagesList = await readImagesList();
    const newImage = {
      src: `full/${filename}`,
      thumb: `thumb/${filename}`,
      alt: req.body.alt || '',
      position: req.body.position || 'center center'
    };

    imagesList.images.unshift(newImage); // 新图放在前面
    await writeImagesList(imagesList);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        filename,
        src: newImage.src,
        thumb: newImage.thumb,
        alt: newImage.alt,
        position: newImage.position
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error.message || 'Upload failed'
    });
  }
});

// 获取图片列表端点
app.get(BASE_PATH + '/api/images', basicAuth, async (req, res) => {
  try {
    const imagesList = await readImagesList();
    res.json(imagesList);
  } catch (error) {
    console.error('Error reading images list:', error);
    res.status(500).json({ error: 'Failed to read images list' });
  }
});

// 删除图片端点
app.delete(BASE_PATH + '/api/images/:filename', basicAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const fullPath = path.join(CONFIG.uploadDir, CONFIG.fullDir, filename);
    const thumbPath = path.join(CONFIG.uploadDir, CONFIG.thumbDir, filename);

    // 从文件系统删除
    const fs = await import('fs/promises');
    try {
      await fs.unlink(fullPath);
      await fs.unlink(thumbPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 从 JSON 删除
    const imagesList = await readImagesList();
    imagesList.images = imagesList.images.filter(
      (img) => img.src !== `full/${filename}`
    );
    await writeImagesList(imagesList);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

// 根路由（管理界面）
if (BASE_PATH) {
  app.get(BASE_PATH + '/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// 配置端点（前端获取图片基础 URL 和其他配置）
app.get(BASE_PATH + '/api/config', basicAuth, (req, res) => {
  res.json({
    imageBaseUrl: CONFIG.imageBaseUrl,
    basePath: BASE_PATH
  });
});

// 健康检查
app.get(BASE_PATH + '/health', basicAuth, (req, res) => {
  res.json({ status: 'ok', config: { uploadDir: CONFIG.uploadDir }, basePath: BASE_PATH });
});

// 启动服务器
app.listen(CONFIG.port, () => {
  console.log(`Upload server running on port ${CONFIG.port}`);
  console.log(`Upload directory: ${CONFIG.uploadDir}`);
});
