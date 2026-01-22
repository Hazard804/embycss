# Emby 增强脚本集合

一套功能强大的 JavaScript 脚本，为 Emby 媒体服务器提供首页轮播图、剧照预览、预告片播放、JavDB短评等增强功能。

## 📦 包含脚本

### 1. HomeSwiper.js - 首页轮播图

为 Emby 首页添加精美的 3D 轮播图，自动展示媒体库精选内容。

**核心功能：**
- 🎨 现代化 3D 轮播效果，支持键盘导航
- 🖼️ 从媒体库随机选取内容，智能图片质量验证
- 📱 完全响应式设计，移动端友好
- ⚡ 智能缓存机制，每日自动更新
- 🎬 直接播放或查看详情
- 🔄 手动刷新按钮
- 🎲 **支持指定媒体库ID**，精准控制内容来源

### 2. extrafanart&trailers.js - 剧照与预告片增强

媒体详情页的全方位增强：剧照展示、预告片播放、相似影片推荐、演员作品展示、JavDB短评等。

**核心功能：**
- 🖼️ **剧照展示**：自动加载所有剧照，点击放大查看，支持键盘/滚轮切换
- 🎬 **预告片播放**：支持本地视频和 YouTube，智能预加载
- 🎯 **相似影片推荐**：基于 Emby 推荐算法，展示相关内容
- 👥 **演员作品模块**：自动提取演员信息，展示其他作品
- 🎥 **悬停预告片**：鼠标悬停卡片自动播放预告，全屏播放按钮
- 🔗 **网络链接集成**：番号识别、一键复制、多站点搜索（javdb/javbus/dmm等）
- 💬 **JavDB短评**：获取并展示 JavDB 社区短评，支持按点赞数排序
- 🔊 **音量持久化**：记住用户音量设置
- ⚙️ **灵活配置**：可自定义网络链接和短评功能的开关

**JavDB 短评功能：**
- 🔐 **安全凭据管理**：首次使用时输入 JavDB 账号密码，加密存储在本地浏览器
- 📊 **短评展示**：显示用户评分、点赞数、评论内容
- 🔄 **分页浏览**：支持翻页查看更多短评
- ⚙️ **一键清除**：齿轮图标快速清除已保存的账号
- 💾 **智能缓存**：本地缓存短评数据，减少API请求，24小时自动过期
- 🎯 **自动排序**：按点赞数降序展示最受欢迎的短评

**JavDB 短评使用说明：**
1. **首次使用**：点击"JavDB短评"按钮 → 弹出登录窗口 → 输入 JavDB 账号密码
2. **凭据存储**：登录成功后，凭据会加密保存在浏览器本地（不会上传到任何服务器）
3. **后续使用**：再次点击"短评"按钮，自动使用已保存的凭据，无需重复输入
4. **清除凭据**：点击"短评"按钮旁边的齿轮图标 ⚙️ 即可清除已保存的账号
5. **安全性**：凭据使用 Base64 + 字符偏移加密存储，相对安全

### 3. DefaultMuteVolume.js - 默认静音播放

自动将视频播放器默认音量设为 0，避免突然的声音打扰。

**核心功能：**
- 🔇 所有视频自动静音（音量0）
- 🎚️ 记住用户手动调整的音量
- 🎬 不影响预告片播放器
- ⚡ 多重检测机制确保生效

**适用场景：**
- 深夜浏览、办公环境、防止高音量尴尬

### 4. RememberPlaybackSpeed.js - 记住播放速度

自动记住每个媒体的播放速度，下次观看时自动恢复。

**核心功能：**
- ⚡ 自动记住每个媒体的播放速度设置
- 🔄 切换媒体或刷新页面后自动恢复速度
- 💾 使用 localStorage 持久化存储
- 🎯 支持精确到每个媒体项目的速度记忆
- 🛡️ 防护机制：防止系统重置倍速为 1x
- 🔧 兼容 Web 端和 Emby Theater 客户端

**使用场景：**
- 习惯看 1.25 倍速的用户
- 喜欢加速看重复剧情
- 节省时间的快速浏览

### 5. HoverGlowEffect.css - 卡片悬停光晕效果

为 Emby 卡片添加优雅的悬停放大和发光效果，鼠标移开即复原。

**核心功能：**
- ✨ 鼠标悬停时卡片平滑放大（1.05倍）
- 🌟 发光边框效果（蓝色边框）
- 🎬 鼠标移开立即复原，不会卡住
- 🎨 流畅的 cubic-bezier 动画过渡（0.25s）
- 📱 兼容所有 Emby 主题
- 🖱️ 纯 CSS 实现，无性能影响

**视觉效果：**
- 悬停：卡片缩放 1.05 倍 + 蓝色发光边框（3px）
- 离开：立即还原到原始状态
- 动画：平滑过渡，视觉反馈清晰

## 🚀 快速开始

### 前置要求

这些脚本需要配合 [Emby.CustomCssJS](https://github.com/Shurelol/Emby.CustomCssJS) 程序使用。

### 安装步骤

1. **安装 Emby.CustomCssJS**
   - 访问 https://github.com/Shurelol/Emby.CustomCssJS
   - 按照说明安装该插件到您的 Emby 服务器

2. **获取脚本/样式**
   - 访问本仓库，选择需要的脚本
   - 复制脚本的完整代码

3. **添加到 Emby**
   - 打开 Emby.CustomCssJS 管理界面
   - **JavaScript 脚本**：粘贴到"自定义 JavaScript"区域
   - **CSS 样式**（如 HoverGlowEffect.css）：粘贴到"自定义 CSS"区域
   - 可同时添加多个脚本

4. **保存并生效**
   - 保存设置后刷新 Emby 页面即可看到效果

**安装位置参考：**
```
Emby.CustomCssJS 管理界面
├── 自定义 JavaScript（粘贴 *.js 文件）
│   ├── HomeSwiper.js
│   ├── extrafanart&trailers.js
│   ├── DefaultMuteVolume.js
│   └── RememberPlaybackSpeed.js
└── 自定义 CSS（粘贴 *.css 文件）
    └── HoverGlowEffect.css
```

**推荐组合：**
- 基础组合：`extrafanart&trailers.js` + `DefaultMuteVolume.js`
- 完整体验：`HomeSwiper.js` + `extrafanart&trailers.js` + `DefaultMuteVolume.js` + `RememberPlaybackSpeed.js` + `HoverGlowEffect.css`
- 视觉增强：`extrafanart&trailers.js` + `HoverGlowEffect.css`（卡片视觉效果很棒）

## 📖 详细使用指南

### HomeSwiper.js - 首页轮播图

**基本使用：**
访问 Emby 首页即可看到轮播图，支持以下操作：
- 点击"PLAY"直接播放，点击"MORE"查看详情
- 右下角刷新按钮手动更新内容
- 左右箭头或键盘方向键切换

**配置选项（脚本开头第3-7行）：**

```javascript
// 指定媒体库ID（留空表示从所有媒体库随机获取）
this.targetLibraryIds = [];

// 显示数量
this.showItemNum = 25;

// 图片质量配置
this.imageConfig = {
    minWidth: 1500,           // 最小宽度（低于此值的图片会被过滤）
    coverMaxWidth: 99999,     // 封面最大宽度
    logoMaxWidth: 500,        // Logo最大宽度
    backdropMaxWidth: 99999   // 背景图最大宽度
};
```

**如何获取媒体库ID：**

在 Emby 首页按 `F12` 打开开发者工具，在控制台执行：
```javascript
ApiClient.getUserViews({}, ApiClient.getCurrentUserId()).then(data => {
    data.Items.forEach(lib => console.log(`${lib.Name}: ${lib.Id}`));
});
```

**配置示例：**
```javascript
// 从所有媒体库随机获取
this.targetLibraryIds = [];

// 只从指定的两个媒体库获取
this.targetLibraryIds = ['abc123', 'def456'];
```

---

### extrafanart&trailers.js - 剧照与预告片增强

**基本使用：**
在媒体详情页自动显示剧照、预告片、相似影片、演员作品和 JavDB 短评（如果有内容）。

**配置选项（脚本开头第3-20行）：**

```javascript
// 是否显示网络链接容器（番号搜索链接）
this.enableWebLinks = true;

// 是否启用 JavDB 短评功能
this.enableJavdbReviews = true;

// 是否启用相似影片功能（true=启用，false=禁用）
this.enableSimilarItems = true;
// 相似影片最多显示数量（默认20部，可调整）
this.maxSimilarItems = 20;

// 是否启用演员其他作品功能（true=启用，false=禁用）
this.enableActorMoreItems = true;
// 演员其他作品最多显示数量（每个演员，默认20部，可调整）
this.maxActorMoreItems = 20;
```

**功能说明：**

1. **剧照展示**
   - 自动加载所有背景图
   - 点击放大，方向键/滚轮切换，ESC关闭

2. **预告片播放**
   - 支持本地视频和 YouTube
   - 需要刮削器在元数据中写入 `RemoteTrailers` 字段
   - 推荐使用支持 DMM 预告片的刮削器

3. **网络链接**
   - 自动识别番号（支持 `[ABC-123]` 或 `ABC-123` 格式）
   - 点击番号复制到剪贴板
   - 生成 javdb、javbus、dmm 等网站的搜索链接
   - 设置 `enableWebLinks = false` 可隐藏

4. **相似影片推荐** ⭐ **新增可配置功能**
   - 基于 Emby 推荐算法自动获取相关影片
   - 设置 `enableSimilarItems = false` 可完全隐藏此功能
   - 修改 `maxSimilarItems` 调整显示数量（默认20部，可设置1-50）
   - 鼠标悬停自动播放预告片预览
   - 支持智能滚动：自动计算当前视口能显示几部影片，点击按钮直接切换下一段

5. **演员作品展示** ⭐ **新增可配置功能**
   - 自动提取前3位主演
   - 设置 `enableActorMoreItems = false` 可完全隐藏此功能
   - 修改 `maxActorMoreItems` 调整每个演员的显示作品数（默认20部，可设置1-50）
   - 展示演员的其他作品
   - 鼠标悬停自动播放预告片预览
   - 支持智能滚动：自动计算当前视口能显示几部影片，点击按钮直接切换下一段

6. **JavDB 短评**
   - 点击"JavDB短评"按钮查看社区评论
   - 首次使用需输入 JavDB 账号密码
   - 凭据加密存储在本地浏览器，不会上传
   - 点击齿轮图标 ⚙️ 可清除已保存的账号
   - 短评按点赞数排序，支持分页浏览
   - 24小时智能缓存，减少API请求

**配置示例：**

```javascript
// 只显示剧照和预告片，隐藏相似影片和演员作品
this.enableSimilarItems = false;
this.enableActorMoreItems = false;

// 相似影片显示最多30部
this.maxSimilarItems = 30;

// 演员作品每人最多显示10部
this.maxActorMoreItems = 10;

// 只隐藏相似影片，保留演员作品
this.enableSimilarItems = false;
this.enableActorMoreItems = true;
```

**智能滚动说明：** ⭐ **新增功能**

相似影片和演员作品容器现已支持**自适应智能滚动**：
- ✅ 自动计算当前屏幕宽度能显示几张卡片
- ✅ 点击滚动按钮直接切换到下一个完整页面
- ✅ 无需连续点击多次，大大提高用户体验
- ✅ 自动适应窗口大小变化
- ✅ 支持所有屏幕尺寸（桌面、平板、移动端）

**JavDB 短评详细说明：**

📌 **首次设置：**
1. 点击"JavDB短评"按钮
2. 弹出登录窗口
3. 输入您的 JavDB 账号和密码
4. 登录成功后，凭据会加密保存在浏览器本地

📌 **日常使用：**
- 直接点击"短评"按钮即可查看，无需重复登录
- 短评会缓存24小时，快速响应

📌 **清除账号：**
- 点击"短评"按钮旁边的齿轮图标 ⚙️
- 确认后清除已保存的凭据
- 下次使用需重新输入

📌 **安全性：**
- 凭据使用 Base64 + 字符偏移加密
- 仅存储在本地浏览器，不会发送到其他服务器
- 可随时清除

📌 **注意事项：**
- 需要有效的 JavDB 账号
- 如果登录失败，会提示重新输入
- 短评数据来自 JavDB API
- 缓存限制：最多500KB或50个项目

---

### DefaultMuteVolume.js - 默认静音

**功能：**
- 所有视频播放时自动静音（音量0）
- 手动调整音量后记住设置
- 不影响预告片播放器

**使用：**
安装后自动生效，无需配置。手动调整音量滑块即可恢复声音。

---

### RememberPlaybackSpeed.js - 记住播放速度

**功能：**
- 自动记住每个媒体的播放速度
- 下次观看时自动恢复
- 支持浏览器刷新和客户端重启
- 多重保护机制防止系统重置倍速

**使用：**
安装后自动生效，调整播放速度后会自动保存。

**工作原理：**
1. 用户调整播放倍速（例如设为 1.5x）
2. 脚本自动保存到浏览器本地
3. 刷新页面或重新打开视频，倍速自动恢复为 1.5x
4. 支持多个视频同时记忆（每个视频独立保存）

**调试：**
在浏览器控制台可查看工作状态：
```javascript
// 查看当前保存的倍速
localStorage.getItem('emby_playback_speed');

// 手动清除倍速记忆
localStorage.removeItem('emby_playback_speed');
```

---

### HoverGlowEffect.css - 卡片悬停光晕效果

⚠️ **特殊说明**：此脚本为 **CSS 样式文件**，安装方式与其他脚本不同

**使用方式：**
1. 打开 Emby.CustomCssJS 管理界面
2. **找到"自定义 CSS"区域**（不是 JavaScript）
3. 复制 `HoverGlowEffect.css` 的全部内容到 CSS 区域
4. **保存设置并刷新页面**

❌ **不要**粘贴到 JavaScript 区域！

**功能说明：**
- 鼠标悬停时卡片平滑放大 1.05 倍
- 添加蓝色发光边框（3px）
- 0.25 秒平滑过渡动画
- 鼠标移开即刻复原（不会卡住）
- 纯 CSS 实现，零性能影响

**效果预览：**
```
悬停前：卡片原始大小，无边框
    ↓
悬停中：卡片放大 1.05 倍 + 蓝色发光边框 + 动画过渡
    ↓
移开后：立即还原到原始状态
```

**自定义效果（可选）：**
如果你想修改效果，可以编辑 CSS 中的以下参数：

```css
/* 修改放大倍数（默认 1.05） */
transform: scale(1.05);  /* 改为 scale(1.1) 放大更多 */

/* 修改边框颜色（默认蓝色） */
box-shadow: 0 0 0 3px #00a4dc !important;  /* 改成你喜欢的颜色 */

/* 修改动画时间（默认 0.25s） */
transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), ...
/* 改为 0.5s 会更慢 */
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

## ⚠️ 重要提示

### 元数据要求

**剧照和预告片功能依赖于完整的元数据：**

| 功能 | 元数据要求 | 说明 |
|-----|----------|-----|
| 剧照展示 | Backdrop（背景图） | 媒体文件需包含背景图元数据 |
| 预告片播放 | RemoteTrailers 字段 | 刮削器需写入预告片链接 |
| 相似影片 | 标签和类型 | Emby 自动推荐算法 |
| 演员作品 | People（演员）元数据 | 需要演员信息 |
| 网络链接 | 标题包含番号 | 自动识别番号格式 |
| JavDB短评 | 标题包含番号 | 需要有效的JavDB账号 |

**对于 JAV 内容的建议：**
- 使用支持 DMM 预告片的刮削器
- 确保刮削器能写入演员信息
- 标题格式建议：`[番号] 标题` 或 `番号 标题`

### 使用注意事项

1. ✅ **安装要求**：必须配合 Emby.CustomCssJS 使用
2. 🔄 **缓存机制**：轮播图每天自动更新，JavDB短评缓存24小时
3. 💾 **本地存储**：音量、播放速度、JavDB凭据都存储在浏览器本地
4. 🖥️ **桌面优先**：悬停预告片仅在非触摸设备启用
5. 🔇 **默认静音**：DefaultMuteVolume.js 会将所有视频默认静音
6. 🔐 **凭据安全**：JavDB凭据加密存储，仅在本地，可随时清除
7. 🎯 **脚本兼容**：所有脚本互相兼容，可同时使用
8. 📱 **响应式设计**：支持移动端浏览器，但桌面端体验更佳

### JavDB 短评特别说明

- 需要有效的 JavDB 账号（免费注册即可）
- 凭据仅存储在您的浏览器，不会发送到 Emby 服务器或其他地方
- 如果凭据过期或登录失败，会自动提示重新输入
- 缓存限制：最多 500KB 或 50 个项目，超出后自动清理最旧的
- API 请求频率建议：避免短时间内大量请求

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
