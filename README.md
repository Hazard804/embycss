# Emby 增强脚本集合

这是一套用于增强 Emby 媒体服务器体验的 JavaScript 脚本合集，提供了首页轮播图和剧照/预告片展示功能。

## 📦 包含脚本

### 1. HomeSwiper.js - 首页轮播图

为 Emby 首页添加一个精美的轮播图组件，展示您的媒体库内容。

**主要功能：**
- 🎨 现代化的 3D 轮播效果
- 🖼️ 自动从媒体库随机选取内容
- 📱 完全响应式设计，支持移动端
- ⚡ 智能缓存机制，每日自动更新
- 🎬 支持直接播放和查看详情
- 🔄 右下角刷新按钮，随时更新内容
- 🎯 图片尺寸验证，确保展示质量

**特色：**
- 支持背景图、Logo 和封面的智能展示
- 平滑的过渡动画和悬停效果
- 自动播放轮播，可自定义延迟
- 支持键盘导航
- 智能加载提示

### 2. extrafanart&trailers.js - 剧照与预告片

在媒体详情页面自动加载并展示剧照和预告片。

**主要功能：**
- 🖼️ 自动获取并展示所有剧照
- 🎬 支持预告片播放（本地视频 + YouTube）
- 🔍 点击放大查看剧照
- ⌨️ 键盘快捷键支持（方向键/ESC）
- 🎨 美观的网格布局
- 📊 显示剧照数量统计
- 🌐 完全响应式设计

**特色：**
- 智能图片预加载
- 平滑的放大缩小动画
- 鼠标滚轮切换图片
- YouTube 视频自动识别和嵌入播放
- 预告片预加载优化
- 自适应窗口大小

**关于预告片：**
- 预告片链接来自 Emby 媒体的元数据（`RemoteTrailers` 字段）
- 需要刮削器在元数据中写入预告片链接才能显示
- 特别适合日本 AV (JAV) 内容，支持 DMM 等网站的预告片链接
- 如果元数据中没有预告片链接，则只显示剧照
- 支持多种视频源格式（直链 MP4、YouTube 等）

## ️ 安装方法

这两个脚本需要配合 [Emby.CustomCssJS](https://github.com/Shurelol/Emby.CustomCssJS) 程序使用。

### 步骤：

1. 安装 Emby.CustomCssJS 程序
   - 访问 https://github.com/Shurelol/Emby.CustomCssJS
   - 按照该项目的说明完成安装

2. 获取脚本代码
   - 访问本仓库，复制所需脚本的完整代码
   - `HomeSwiper.js` - 首页轮播图功能
   - `extrafanart&trailers.js` - 剧照和预告片功能

3. 在 Emby.CustomCssJS 中添加脚本
   - 打开 Emby.CustomCssJS 的管理界面
   - 将复制的脚本代码直接粘贴到自定义 JavaScript 区域
   - 可以同时添加两个脚本，或根据需要选择其中一个

4. 保存并刷新
   - 保存设置
   - 刷新 Emby 页面即可看到效果

## 📖 使用说明

### HomeSwiper.js

安装后，访问 Emby 首页即可看到轮播图。轮播图会：
- 自动从您的媒体库中随机选取内容
- 每天自动更新缓存
- 点击"PLAY"按钮直接播放
- 点击"MORE"按钮查看详情
- 点击右下角刷新按钮手动刷新内容

**自定义选项：**
```javascript
// 在脚本中可以调整这些参数：
this.showItemNum = 25;  // 显示的项目数量
this.itemQuery.Limit = 200;  // 查询限制

// 图片配置（统一管理图片尺寸相关参数）
this.imageConfig = {
    minWidth: 1500,           // 图片最小宽度验证标准（低于此值的图片会被过滤）
    coverMaxWidth: 99999,     // 封面图片最大宽度（API请求参数）
    logoMaxWidth: 500,        // Logo最大宽度（API请求参数）
    backdropMaxWidth: 99999   // 背景图最大宽度（API请求参数）
};
```

### extrafanart&trailers.js

在任何媒体详情页面会自动显示"剧照"区域（如果有内容）。

**操作方式：**
- 点击剧照放大查看
- 使用方向键切换剧照
- 按 ESC 键关闭放大视图
- 滚动鼠标滚轮切换图片
- 点击预告片缩略图播放视频

**自定义选项：**
```javascript
// 调整起始索引
this.startImageIndex = 2;  // 从第几张图片开始显示
```

## 🙏 鸣谢

- **轮播图脚本** 源自 [Nolovenodie/emby-crx](https://github.com/Nolovenodie/emby-crx) 项目
- **脚本加载器** 使用 [Shurelol/Emby.CustomCssJS](https://github.com/Shurelol/Emby.CustomCssJS)
- 使用了 [Swiper](https://swiperjs.com/) 轮播组件库

## 🔧 兼容性

- ✅ Emby 服务器 4.x
- ✅ 现代浏览器（Chrome, Firefox, Edge, Safari）
- ✅ Emby 桌面客户端
- ✅ 移动端浏览器

## 📝 注意事项

1. 这些脚本会修改 Emby 的前端界面，请确保您有权限进行此类修改
2. 轮播图会缓存内容以提高性能，每天自动清理一次
3. **剧照和预告片功能依赖于媒体文件的元数据**：
   - 剧照：需要媒体文件包含背景图（Backdrop）元数据
   - 预告片：需要刮削器在元数据中写入 `RemoteTrailers` 字段
   - 对于 JAV 内容，推荐使用支持 DMM 预告片的刮削器
   - 确保您的媒体库已正确刮削元数据
4. 脚本需要通过 Emby.CustomCssJS 加载才能生效

## 🐛 问题反馈

如遇到问题，请在本仓库提交 Issue，并提供：
- Emby 服务器版本
- 浏览器类型和版本
- 控制台错误信息（如有）
- 问题复现步骤

## 📄 许可证

MIT License

## 🔗 相关链接

- [Emby 官网](https://emby.media/)
- [Emby.CustomCssJS](https://github.com/Shurelol/Emby.CustomCssJS)
- [emby-crx](https://github.com/Nolovenodie/emby-crx)
- [Swiper](https://swiperjs.com/)

---

**享受您的 Emby 增强体验！** 🎉
