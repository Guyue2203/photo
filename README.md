# 摄影 | 星依旧

星依旧的摄影作品集。

> 碰个拳，要开心。

## 站点信息

- 网站：<https://starstill.art>
- 作者：星依旧
- 邮箱：<hi@starstill.art>
- 小红书：<https://xhslink.com/m/37fRDCXH57i>

## 添加照片

照片统一上传到：

```text
https://s.guyue.me/starstill/img/
```

然后在这里维护图片列表：

```text
https://s.guyue.me/starstill/images.json
```

推荐格式：

```json
{
  "images": [
    "example.jpg",
    "another-photo.jpg"
  ]
}
```

也支持为单张图片补充信息：

```json
{
  "images": [
    {
      "src": "example.jpg",
      "alt": "照片说明",
      "position": "center center"
    }
  ]
}
```

网站会先读取 `images.json`，再从 `https://s.guyue.me/starstill/img/文件名` 加载图片。本项目不再需要提交本地图片或缩略图。

## 本地预览

```bash
bundle install
bundle exec jekyll serve
```

如果本地预览时资源路径不正确，可以临时把 `_config.yml` 里的 `baseurl` 改为空字符串。

## 构建资源

安装依赖：

```bash
npm install
```

编译 CSS 和压缩 JS：

```bash
npx gulp build
```

当前图片从远程地址读取，通常不需要运行图片缩略图生成任务。

## 部署

项目仓库：<https://github.com/guyue2203/photo/>

如果使用 GitHub Pages 默认域名，不需要 `CNAME` 文件。自定义域名 `starstill.art` 可以在 GitHub Pages 设置中配置。

## Credits

基于开源 Jekyll 摄影模板修改，页面设计来自 AJ。
