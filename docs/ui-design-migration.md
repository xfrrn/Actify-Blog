# Actify Portfolio UI 风格与迁移说明

基于 2026-09-16 当前工作区源码整理，包含工作区尚未提交的界面调整。本文记录实际实现；迁移后的渲染效果仍需在目标项目中对照检查。

这套设计可以概括为：**黑白灰中性色、Geist 字体、居中窄栏、局部 Bento 卡片、细边框、底部浮动 Dock，以及短促的模糊淡入和弹簧交互。** 视觉层次主要来自字号、留白、灰度和边框，彩色主要出现在内容图片、品牌图标、代码高亮和引用块。

## 1. 先保留这些视觉特征

| 维度 | 当前设计规则 |
| --- | --- |
| 页面骨架 | 居中窄栏；内容沿纵向展开；局部使用双列卡片 |
| 风格密度 | 页面区块之间留白较大，卡片内部紧凑，正文舒展 |
| 配色 | Light / Dark 两套语义变量；主色本身也是黑白灰 |
| 字体 | Geist 正文与标题；Geist Mono 代码、编号 |
| 表面 | 1px 细边框、小幅圆角、少量中性阴影 |
| 卡片交互 | Hover 增加浅色外环、文字或背景变色 |
| 入场 | 透明度 + 6–8px 模糊 + 6–8px 垂直位移 |
| 导航 | 底部胶囊 Dock，桌面端相邻图标随指针弹簧放大 |
| 背景点缀 | 页顶和 Contact 上半部的细小闪烁网格，向下透明渐隐 |
| 阅读体验 | 标题、摘要、元信息分层；正文稳定；代码和表格在自身容器内横向滚动 |

当前首页是窄栏页面里的局部 Bento：Now 首卡横跨两列，Projects 使用等高双列。迁移时保留这个比例关系。全屏宽面板、彩色渐变 Hero、大面积玻璃卡片、卡片倾斜和持续旋转背景都会明显改变原风格。

## 2. 精确配色

权威来源：`src/app/globals.css`。迁移时保留 OKLCH 原值，组件继续使用语义类名，如 `bg-background`、`text-muted-foreground`、`border-border`。

以下中性颜色均为 `oklch(L 0 0)`，表中的十六进制值仅便于目测，约等于源码颜色。

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `background` | `oklch(1 0 0)` ≈ `#ffffff` | `oklch(0.18 0 0)` ≈ `#121212` | 页面底色 |
| `foreground` | `oklch(0.145 0 0)` ≈ `#0a0a0a` | `oklch(0.985 0 0)` ≈ `#fafafa` | 正文、标题 |
| `card` / `popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` ≈ `#171717` | 卡片、浮层 |
| `card-foreground` / `popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | 表面上的文字 |
| `primary` | `oklch(0.205 0 0)` ≈ `#171717` | `oklch(0.922 0 0)` ≈ `#e5e5e5` | 主按钮、强调元素 |
| `primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | 主按钮上的文字 |
| `secondary` / `muted` / `accent` | `oklch(0.97 0 0)` ≈ `#f5f5f5` | `oklch(0.269 0 0)` ≈ `#262626` | 次级表面、标签、Hover |
| `secondary-foreground` / `accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | 次级表面上的文字 |
| `muted-foreground` | `oklch(0.556 0 0)` ≈ `#737373` | `oklch(0.708 0 0)` ≈ `#a1a1a1` | 摘要、日期、说明 |
| `border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | 边框、分隔线 |
| `input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | 输入框边框 |
| `ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | 键盘焦点 |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | 错误状态 |

Dark 的页面底色和卡片底色有细微差别；边框使用半透明白色，最终观感随底色变化。保留这些差别才能还原深色层次。

仓库另外保留了 shadcn 图表和侧栏变量。它们不是当前 Portfolio 的主视觉配色，但完整复制主题时可以保留：

| Token | Light | Dark |
| --- | --- | --- |
| `chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| `chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.696 0.17 162.48)` |
| `chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)` |
| `chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)` |
| `chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.645 0.246 16.439)` |
| `sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.488 0.243 264.376)` |
| `sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` |
| `sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `sidebar-accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `sidebar-ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |

局部例外：项目的 GitHub / Demo 按钮明确使用 `bg-black text-white`，在深色模式下也保持黑底白字；正文引用块使用 `border-amber-500`；代码使用 GitHub Light / Dark 高亮色。全站没有蓝紫色品牌主色。

## 3. 字体、字号与排版

字体在 `src/app/layout.tsx` 中通过 `next/font/google` 加载：

- Geist：400、500、600、700，变量 `--font-sans`。
- Geist Mono：300、400、500、600、700，变量 `--font-mono`。
- 两者配置的 subset 都是 `latin`。中文依靠字体回退；跨操作系统核对中文时，要考虑回退字体差异。
- 页面启用 `antialiased`。目标项目不使用 Next.js 时，可以通过自身字体加载方式提供同样的字体与 CSS 变量。

| 场景 | 字号与字重 | 细节 |
| --- | --- | --- |
| Hero 姓名 | 30px → `sm` 36px → `lg` 48px；600 | `tracking-tighter`，字距 -0.05em |
| 身份标签 | 14px；500 | 保持紧凑 |
| Hero 简介 | 16px → `md` 18px → `lg` 20px | 灰色，最大宽度 600px |
| 常规区块标题 | 20px；700 | About、Now、Latest Writing 等 |
| Projects 大标题 | 30px → `sm` 36px；700 | 居中，紧字距 |
| Contact 大标题 | 30px → `sm` 48px；700 | 居中，紧字距 |
| 项目 / Now 卡片标题 | 16px；600 | 标题允许长词换行 |
| 文章列表标题 | 18px；500 | `tracking-tight` = -0.025em |
| 文章列表摘要 | 14px；400 | `leading-relaxed` = 1.625 |
| 列表日期、阅读时间 | 12px | `text-muted-foreground` |
| 项目标签 / 文章标签 | 常用 11px | 小而克制，不承担主要标题层级 |
| 博客详情页主标题 | 30px → `md` 36px；600 | `leading-tight`，`tracking-tighter` |
| 文章正文 | 基础 16px | 1.625 行高，`text-foreground/90` |
| 正文内部 H1 / H2 / H3 | 24px / 20px / 18px；600 | 与页面主标题区分 |
| 正文内部 H4–H6 | 16px；500 | 保持阅读节奏 |
| 行内代码 / 代码块 | 13px，等宽字体 | 代码块保留原始换行与缩进 |

简介、说明、项目文案会用到 `text-balance` 或 `text-pretty`。迁移时同时保留 `min-w-0` 和长标题的 `wrap-anywhere`，避免内容撑开卡片。

## 4. 尺寸、留白与圆角

以下 px 换算按 16px 根字号计算。

| 项目 | 实际值 |
| --- | --- |
| 页面主容器 | `max-w-2xl` = 672px，水平居中 |
| 页面左右内边距 | `px-6` = 每侧 24px；最大可用内容宽约 624px |
| 小屏上下留白 | 顶部 48px、底部 112px，为 Dock 留空间 |
| `sm` 起上下留白 | 96px |
| 首页主要区块间距 | `gap-14` = 56px |
| 小模块间距 | 常见 8px / 12px / 16px / 24px / 32px |
| Bento / Projects 网格间距 | `gap-3` = 12px |
| Now 卡片内边距 | 20px |
| Project Card 内容内边距 | 24px |
| Contact 卡片内边距 | 24px → `sm` 40px |
| Hero 头像 | 96px → `md` 128px；圆形；1px 边框 + 4px muted 外环 + `shadow-lg` |
| 常规边框 / 分隔线 | 1px |

基础圆角变量 `--radius: 0.625rem`，即 10px：

| Class | 本项目实际圆角 | 主要场景 |
| --- | --- | --- |
| `rounded-sm` | 6px | 小型焦点容器 |
| `rounded-md` | 8px | Button、Badge、行内代码、输入框 |
| `rounded-lg` | 10px | 基础 Card、上一篇 / 下一篇 |
| `rounded-xl` | 14px | Now、Projects、Contact、代码块、TOC、Tooltip |
| `rounded-3xl` | 24px | Dock 内部图标表面 |
| `rounded-full` | 圆形 / 胶囊 | Dock 外壳、头像、圆形按钮 |

`rounded-xl` 被项目主题重新映射过。只复制 JSX 而漏掉 `@theme inline`，就会改变圆角。

## 5. 动效参数

### BlurFade：区块入场

源码：`src/components/magicui/blur-fade.tsx`。

```text
初始：opacity 0，translateY(-6px)，filter blur(6px)
结束：opacity 1，translateY(0)，filter blur(0)
duration：0.4s
ease：easeOut
实际 delay：调用方传入的 delay + 0.04s
默认 inView：false，挂载时播放
显式启用 inView 时：once = true，margin = -50px
```

元素从最终位置上方轻微向下落定。Hero 可传入 `yOffset={8}`。首页使用 0.04s 作为延迟单位，卡片常按索引递增 0.05s。项目卡片传入 `0.48 + index × 0.05`，文章列表传入 `0.12 + index × 0.05`；还需加上组件内部的 0.04s。页面存在嵌套动画容器，应保留调用处参数。

### BlurFadeText：文字淡入

源码：`src/components/magicui/blur-fade-text.tsx`。

```text
初始：opacity 0，translateY(-8px)，filter blur(8px)
结束：opacity 1，translateY(0)，filter blur(0)
duration：0.4s；ease：easeOut
delay：直接使用调用方值，没有额外的 0.04s
默认 animateByCharacter：false
可选逐字模式：每字额外延迟 0.03s，空白宽度 0.2em
```

当前介绍采用整段淡入。逐字效果是组件具备的能力，不需要把所有文案改成逐字播放。

### Dock：鼠标距离驱动的弹簧缩放

源码：`src/components/magicui/dock.tsx`、`src/components/layout/navbar.tsx`。

| 参数 | 值 |
| --- | --- |
| 桌面图标容器尺寸 | 基础 40px，鼠标靠近时最大 60px |
| 桌面内部图标 | 基础 20px，最大 30px |
| 指针影响距离 | 左右各 100px |
| 映射 | 距离 `[-100, 0, 100]` → 容器 `[40, 60, 40]` |
| Spring mass | 0.1 |
| Spring stiffness | 150 |
| Spring damping | 12 |
| 小屏 `<640px` | 容器固定 36px，内部图标固定 16px |

图标宽高通过 `motion/react` 的 `useTransform` + `useSpring` 更新；相邻图标也受影响；容器底部对齐。复刻时需要复制该行为，单个图标的 CSS Hover scale 无法还原邻近联动。

Dock 外观：

- 固定底部居中，底部间距 `max(16px, env(safe-area-inset-bottom))`。
- 外壳高 56px，圆形胶囊；内边距 6px → `sm` 8px，图标间距 4px → `sm` 8px。
- 背景 `bg-card/90`；`backdrop-blur-3xl`，模糊半径 64px；1px 边框。
- 阴影 `0 0 10px 3px`，颜色 `primary / 5%`。
- 图标表面 `bg-background`，Hover `bg-muted`，文字由 muted 变 foreground。
- 外层 `pointer-events-none`，Dock 本体 `pointer-events-auto`，保留页面周围的点击能力。
- 当前语言按钮固定 36px，独立于 DockIcon 弹簧缩放。

### FlickeringGrid：微弱闪烁网格

源码：`src/components/magicui/flickering-grid.tsx`。

| 参数 | 页面实际使用值 |
| --- | --- |
| 方格尺寸 | 2px × 2px |
| 方格间距 | 2px |
| 色彩 | 随主题读取 `--foreground` |
| 最大随机透明度 | 0.3 |
| `flickerChance` | 0.3 |
| 每帧重新随机透明度的概率 | `flickerChance × deltaTime（秒）`，按格计算 |
| 顶部范围 | 页面顶端 100px 高 |
| Contact 范围 | 卡片上半部 |
| 渐隐遮罩 | `linear-gradient(to bottom, black, transparent)`，同时保留 WebKit 写法 |

组件默认方格 4px、间距 6px，但当前两个调用处都覆盖为 2px / 2px。原样复用组件时应一起复制调用参数。方格位置固定，只改变透明度；组件处理 DPR、尺寸变化、主题变化，并在离开视口时暂停动画。

### 其余微交互

| 场景 | 当前行为 |
| --- | --- |
| Now / Project Card Hover | `ring-2 ring-muted`；`transition-all duration-200`；卡片本身不位移 |
| 文章标题箭头 | 200ms；透明度 0 → 1，X 从 -8px → 0 |
| Button / 普通链接 | 颜色或下划线变化；沿用 Tailwind / 组件原有 transition |
| Tooltip | 淡入 + scale 0.95 → 1 + 来向 8px 位移；关闭反向播放 |
| Tooltip 延迟 | 全局 Provider `delayDuration={0}` |
| Dock Tooltip | 上方 8px；14px 圆角；内边距 16px / 8px；黑白反色；带小箭头 |
| Tooltip 阴影 | Light：`0 10px 40px -10px rgba(0,0,0,.3)`；Dark 改为 `.5` |
| 履历折叠 | Radix Accordion 高度展开 / 收起；依赖 `tw-animate-css` |
| 履历箭头 | 右箭头 Hover 300ms 显现并右移 4px；展开箭头 200ms 旋转 180° |
| 分类下拉 | 原生 details 展开，Chevron 随 open 状态旋转 180° |
| 复制代码反馈 | Copy 切换为 Check，约 2 秒后还原 |
| 主题切换 | 根元素 `.dark` 切换与图标替换，没有额外的全屏揭幕动画 |

当前源码没有统一的 reduced-motion 降级策略。目标项目如需补充，应作为明确的无障碍适配处理，不能把它描述为当前已经实现的效果。

## 6. 页面与组件配方

### 首页 / Now

- Hero 在 `<768px` 时纵向排列，头像在前；`md` 起横向排列，文字在左、头像在右。
- About 使用现有正文排版和灰色文字，避免再包一层装饰卡片。
- Now 单列起步，`sm` 起双列，第一张卡片跨两列；图标 16px，说明标签 12px，标题 16px，正文 14px。
- Work、Education、Hackathons 按数据决定是否出现；现有头像、Accordion、Timeline 风格可继续复用。
- 当前首页没有单独渲染 Tech Stack 区块；技术标签主要在项目卡片中。迁移时以实际页面为准。

### 项目区块与 Project Card

- 区块顶部是一个小型反色标签，两侧为 1px 中性渐隐分隔线。
- 标题和简介居中；网格 `grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr`。
- 网格虽然声明最大 800px，但当前受页面外层 672px 容器限制；实际内容区约 624px。
- 卡片外框：`border rounded-xl overflow-hidden`，全高 flex column，Hover 2px muted 外环。
- **封面为 16:9**，`object-cover`；底部 1px 分隔线；视频自动播放、静音、循环、内联播放。
- 缺图或图片加载失败时，使用 muted 底色 + 小标签 + 项目名称的文字封面。
- 内容区 `p-6 gap-3 flex-1`；GitHub / Demo 链接在图片下方，使用黑底白字 Badge。
- 标题 16px 半粗，日期 12px 灰色，状态用 secondary 小 Badge，右侧 16px 外链箭头。
- 描述沿用 `text-xs prose ... leading-relaxed text-muted-foreground`，保留 Typography 的段落样式。
- 技术标签在底部自动对齐，outline，11px，24px 高，横向 padding 8px，间距 4px，可换行。
- 首页和 `/projects` 复用同一套卡片与区块。

### Latest Writing 与博客归档

- Latest Writing 使用纯列表行，行间距 24px；左侧可带两位数等宽编号。
- 标题 18px，摘要 14px，日期 / 阅读时间 / 分类 12px，标签 11px。
- 列表项的箭头 Hover 进入；文章行使用轻量 BlurFade。
- `/blog` 当前使用分类筛选和按月归档时间线。
- 分类筛选：上下边框区域，原生 details；小屏全宽，`sm` 起 256px；下拉层圆角 14px、1px 边框、`shadow-md`。
- 月份导航：手机横向滚动，顶部 sticky，激活项下划线；`sm` 起为左侧 120px 竖向导航。
- 归档正文左侧 1px 时间线，月份节点为 8px 实心圆；月份标题 18px，月份区块间距 48px。
- 当前月份根据滚动位置更新；保留横向导航滚动与键盘访问行为。

### 博客详情与 Markdown

- 页面标题、摘要、日期与标签在正文上方；封面原比例显示，14px 圆角、1px 边框。
- TOC 使用默认展开的原生 details，14px 圆角、1px 边框、16px padding；三级目录缩进 16px。
- 正文使用 `prose dark:prose-invert max-w-full font-sans leading-relaxed text-foreground/90`，保留 `wrap-anywhere`。
- 正文不套区块入场动画，阅读过程中保持稳定。
- 正文链接：primary 色、下划线、4px underline offset。
- 行内代码：13px 等宽字体、1px 边框、8px 圆角、padding 6px / 2px；背景 Light muted/60、Dark muted/40。
- 引用块：4px amber 左边框、muted/50 背景、16px padding、斜体；右侧 8px 圆角，左侧直角。
- 普通图片：最大宽度 100%，高度自动，边框与 14px 圆角，延迟加载。
- `MediaContainer` 是另一种可选媒体样式：300px 高、10px 圆角、4px muted 外环、`object-cover`；视频带 controls。它与普通正文图片的尺寸规则不同。
- 分隔线：1px，横向透明渐隐 mask；文章头部分隔线外边距 24px，MDX 内分隔线外边距 40px。
- 上一篇 / 下一篇：10px 圆角、1px 边框、16px padding、Hover accent/50；手机纵向、`sm` 起横向。

代码块配方：

- Shiki `github-light` / `github-dark` 双主题；当前由 `shiki/bundle/web` 客户端高亮，未知语言回退到 text。
- 外框 `my-6 border rounded-xl overflow-hidden`。
- 可选文件名条：12px 字号，12px padding，muted/50 背景、底边框。
- 代码区 16px padding，右侧预留 56px，13px 等宽字体。
- `white-space: pre`，保留长代码行；只在代码容器内横向滚动；滚动容器可聚焦。
- 复制按钮 32px 方形，右侧 12px；手机持续可见，`lg` 起 Hover 或键盘聚焦时显现。
- `.shiki` 的色彩变量和前景回退必须随正文 CSS 一起复制，才能保证两种主题下的纯文本可读。

表格配方：

- 外框 14px 圆角、1px 边框，上下 margin 24px。
- 内层横向滚动，表格宽度至少 100%；单元格 `white-space: nowrap`。
- 表头 muted/50 背景、半粗文字，12px 水平 padding / 8px 垂直 padding。
- 正文单元格灰色文字、14px 字号、8px padding。
- 单元格间细边框，最后一行没有底边框；行 Hover accent/50。
- 原实现行上有 pointer cursor，样式本身不意味着存在行点击业务。

### Contact

- 大卡片边框 + 14px 圆角，顶部中间的反色标签向上突出 16px。
- 上半部闪烁网格，内容层相对定位覆盖在网格上。
- 标题、描述、联系链接均居中；元素间距 16px。
- 链接带下划线与 16px 图标，默认灰色，Hover 转前景色。

### 基础 UI 组件

| 组件 | 本项目实现要点 |
| --- | --- |
| Card | 基础只有 10px 圆角和 card 色；边框、padding 常由调用处增加 |
| Button | 8px 圆角、14px medium；default 高 36px、sm 32px、lg 40px、icon 36px 圆形 |
| Button variants | default 主色反白；outline 背景色 + 边框；secondary 次级灰；ghost Hover accent；link 下划线 |
| Badge | 8px 圆角、默认 12px 半粗、padding 10px / 2px；业务卡片会覆盖字号和高度 |
| Avatar | 基础 40px 圆形；业务位置覆盖为不同尺寸；失败时 muted fallback |
| Separator | 1px；跟随 border 色 |
| 图标 | Lucide 线性图标、Radix 日夜图标及现有社交 SVG；大小通常 12 / 16 / 20px |
| Focus | 保留 ring / outline；公共链接、summary、滚动区域可见焦点，offset 常为 4px |

`components.json` 使用 shadcn `new-york`、`neutral`、CSS variables。现有本地组件包含定制；重新生成一套默认组件可能丢失这些细节。

### 当前附加界面

反馈区沿用主站表单风格：顶部细分隔线、20px 区块标题、14px label、16px input、8px 圆角、1px input 边框、12px / 10px 输入内边距。提交按钮高 44px，手机全宽；状态文字用 muted 或 destructive 色。只迁移视觉时，无需复制反馈 API、数据库和管理业务。

404 使用 200px 等宽大数字、由上至下的中性渐变与透明遮罩，前景标题 36px，配 outline 按钮。源码中的描边仍写作 `hsl(var(--primary)/0.6)`，与当前 OKLCH token 不匹配；若迁移描边效果，应改为与实际颜色变量兼容的写法，不把这个无效声明当成视觉参数。

分享图 Open Graph 是独立的 1200×630 输出：白底、40px 外留白、内层 `#fafafa`、`#e5e5e5` 边框、12px 圆角；标题 Clash Display 48px / 600，说明 20px；左上为 140px 方形标识，24px 圆角、4px 边框。它使用本地 Clash Display / Cabinet Grotesk 字体，与网站正文 Geist 配置不同。

## 7. 响应式规则

Tailwind 当前断点：`sm=640px`、`md=768px`、`lg=1024px`、`xl=1280px`、`2xl=1536px`。

| 场景 | 手机 | 较大屏幕 |
| --- | --- | --- |
| 主栏 | 宽度随屏幕，左右各 24px | 最大外宽 672px |
| Hero | 头像在上，文字在下 | `md` 起左右布局 |
| Now / Projects | 单列 | `sm` 起双列；Now 首卡跨列 |
| Dock | 36px 图标容器、16px 图标 | 40–60px 弹簧缩放 |
| 月份导航 | 顶部横向滚动 | `sm` 起左侧竖向导航 |
| 文章邻接导航 | 纵向 | `sm` 起横向 |
| 代码复制按钮 | 持续可见 | `lg` 起 Hover / Focus 可见 |
| 长代码 / 宽表格 | 容器内横向滚动 | 同样保留溢出处理 |

大屏继续保持窄栏。迁移时检查 375px、390px、768px、1440px，并同时查看 Light / Dark。确保页面整体没有横向滚动，Dock 不遮挡末尾内容，长标题和标签可换行。

## 8. 迁移文件清单

以下路径相对源项目根目录；目标项目可以遵循自己的文件结构。优先复制本地实现，再适配 import、路由与数据。

| 层级 | 来源文件 | 迁移内容 |
| --- | --- | --- |
| 主题核心 | `src/app/globals.css` | imports、dark variant、theme 映射、Light / Dark 变量、base、prose、Shiki 样式 |
| 工具 | `src/lib/utils.ts` | `cn` 使用 clsx + tailwind-merge；其他日期工具按调用需要复用 |
| 字体 / 容器 | `src/app/layout.tsx` | 字体加载、内容宽度、留白、Provider、顶部网格、Dock 的组合 |
| Theme | `src/components/layout/theme-provider.tsx`、`src/components/layout/mode-toggle.tsx` | class 模式，默认 light，切换按钮 |
| 核心特效 | `src/components/magicui/blur-fade.tsx`、`src/components/magicui/blur-fade-text.tsx` | 两种不同的入场与 delay 规则 |
| 核心特效 | `src/components/magicui/dock.tsx`、`src/components/magicui/flickering-grid.tsx` | 弹簧联动、固定格点闪烁 |
| Dock 组装 | `src/components/layout/navbar.tsx` | 外壳、图标表面、Tooltip、Separator、主题入口 |
| UI 基础 | `src/components/ui/button.tsx`、`src/components/ui/badge.tsx`、`src/components/ui/card.tsx` | 本地 variants、尺寸与圆角 |
| UI 基础 | `src/components/ui/avatar.tsx`、`src/components/ui/separator.tsx`、`src/components/ui/tooltip.tsx`、`src/components/ui/accordion.tsx` | Radix 封装及动画 class |
| 项目卡片 | `src/components/projects/project-card.tsx`、`src/components/projects/projects-section.tsx` | 图片比例、内容间距、标签、Hover、区块标题 |
| 首页配方 | `src/app/page.tsx`、`src/components/home/contact-section.tsx` | Hero、Now、各区块间距、Contact |
| 可选履历 | `src/components/home/work-section.tsx`、`src/components/home/hackathons-section.tsx`、`src/components/home/timeline.tsx` | 履历折叠、头像与时间线 |
| 博客列表 | `src/components/blog/post-list.tsx`、`src/components/blog/category-filter.tsx`、`src/components/blog/archive-timeline.tsx` | 文章行、分类菜单、月份导航 |
| 博客阅读 | `src/app/blog/page.tsx`、`src/app/blog/[slug]/page.tsx`、`src/mdx-components.tsx` | 页面排版、TOC、正文组件映射 |
| 代码 / 媒体 | `src/components/blog/code-block.tsx`、`src/components/blog/scrollable-table.tsx`、`src/components/blog/media-container.tsx` | 高亮、复制、滚动、媒体边框 |
| 图标 | `src/components/icons/social.tsx` 及该目录下用到的品牌图标 | 社交与技术品牌 SVG |
| 可选表单 | `src/components/home/feedback-form.tsx`、`src/components/home/feedback-section.tsx` | 只提取需要的输入框、状态与布局样式 |
| 可选辅助页 | `src/app/not-found.tsx`、`src/lib/opengraph-image.tsx` | 404 与分享图视觉 |
| 可选分享图资源 | `public/fonts/ClashDisplay-Semibold.ttf`、`public/fonts/CabinetGrotesk-Medium.ttf` | 仅 Open Graph 使用的本地字体 |

页面和部分组件目前依赖 `getLanguage` / `useLanguage` 以及 `src/data/site.tsx`。目标项目如果已有数据和国际化体系，保留目标体系，替换这些接入点即可。若要一并移植当前双语行为，再带上 `src/components/layout/language-provider.tsx`、`src/lib/i18n.ts`、`src/lib/server-language.ts`。

`projects-section.tsx`、博客页面和反馈区还会导入本项目的数据层。视觉迁移时让它们消费目标项目的数据；复制视觉不要求复制所有后端。

## 9. 依赖与 CSS 接入

以下是本仓库 `package.json` 的声明版本，用于说明源码依赖，并非要求目标项目整体升级。

| 用途 | 本仓库依赖 |
| --- | --- |
| 当前运行框架 | Next `16.3.5`、React `^19.2.3` |
| 样式引擎 | `tailwindcss ^4.1.18`、`@tailwindcss/postcss ^4.1.18` |
| CSS 动画 | `tw-animate-css ^1.4.0` |
| 排版 | `@tailwindcss/typography ^0.5.19` |
| 动画 | `motion ^12.23.27`，导入路径 `motion/react` |
| 主题 | `next-themes ^0.4.6` |
| 图标 | `lucide-react ^0.562.0`、`@radix-ui/react-icons ^1.3.2` |
| UI primitives | Radix accordion `^1.2.12`、avatar `^1.1.11`、separator `^1.1.8`、slot `^1.2.4`、tooltip `^1.2.8` |
| class 组合 | `class-variance-authority ^0.7.1`、`clsx ^2.1.1`、`tailwind-merge ^3.4.0` |
| 项目 Markdown 描述 | `react-markdown ^10.1.0` |
| 代码高亮 | `shiki ^3.20.0` |

当前真正接入 CSS 的是：

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:where(.dark, .dark *));
```

随后还必须合并 `globals.css` 中的 `@theme inline`、`:root`、`.dark` 和 base/prose 规则。只复制上述四行不足以还原设计。PostCSS 当前使用 `@tailwindcss/postcss`。

迁移兼容注意：

1. 当前是 Tailwind v4，包含 `@theme inline`、`bg-linear-to-*`、`wrap-anywhere` 和尾部 `!` 写法。目标项目若用 v3，按目标版本转换配置与类名，保留实际视觉值。
2. `tailwindcss-animate` 虽然也在依赖里，但当前 CSS 引用的是 `tw-animate-css`，不需要为复刻同时接入两套动画样式。
3. 当前 CodeBlock 使用 Shiki 客户端高亮；`rehype-pretty-code` 出现在依赖中不代表它是当前代码块的实际渲染路径。
4. Magic UI 是仓库内的组件源码，迁移需要这些本地文件和调用处样式。
5. Motion、主题、Dock、代码复制等保留客户端组件边界；路由、字体加载与图片处理按目标框架接入。
6. Next、Cloudflare、内容编译、反馈服务不都是视觉依赖；按目标项目实际功能保留自己的架构。

## 10. 建议的迁移顺序与验收

1. 先合并字体、颜色变量、圆角映射、全局 base 和 dark variant。
2. 对齐主容器宽度、左右 padding、区块留白，再对齐字号与字重。
3. 复用 Button、Badge、Card、Avatar、Tooltip 等本地样式。
4. 迁移需要的 Now / Project Card / 文章列表与正文，接入目标项目数据。
5. 复制四个 Magic UI 组件，保留调用参数，接入 Dock 与顶部 / Contact 网格。
6. 补齐 Hover、Focus、复制反馈、主题切换、小屏覆盖规则。
7. 对照桌面 / 手机及两种主题，检查相同内容下的比例、换行与动效。

验收清单：

- [ ] 页面仍是最大 672px 的居中窄栏，左右留白正确。
- [ ] 暗色背景、卡片、边框、次级文字有原有层次。
- [ ] Geist / Geist Mono 加载正常；中文回退字体符合目标环境预期。
- [ ] `rounded-xl` 实际为 14px，基础 rounded-md 为 8px。
- [ ] Now 首卡跨列；项目封面 16:9；双列卡片等高。
- [ ] Hover 是外环与颜色变化，没有意外的跳动或重排。
- [ ] BlurFade 方向、模糊程度、时长、延迟与源码一致。
- [ ] 桌面 Dock 有相邻联动；手机保持 36px / 16px 尺寸。
- [ ] 网格只在原有范围显示，主题切换后颜色正确，离屏停止更新。
- [ ] 正文稳定，代码与表格只在各自容器横向滚动。
- [ ] Tooltip、菜单、TOC、复制按钮支持键盘访问及可见焦点。
- [ ] Dock 不挡末尾内容，页面没有整体横向溢出。
- [ ] 目标项目 lint / typecheck / build 通过，浏览器无新增明显错误。

## 11. 可直接交给另一个项目的迁移提示词

将本说明连同需要的源组件提供给目标项目，再使用下面的提示词：

```text
请把当前项目的 UI 改造为所附 Actify Portfolio UI 的视觉风格。
先阅读当前项目架构和《Actify Portfolio UI 风格与迁移说明》，再修改。
保持当前业务功能、路由和数据结构，优先复用当前项目组件；必要时复制参考项目的本地 UI / Magic UI 实现。

需要准确迁移：
1. 黑白灰的 Light / Dark 语义主题、OKLCH 原值，以及 6/8/10/14px 圆角体系。
2. Geist / Geist Mono、标题紧字距、灰色摘要和日期、最大 672px 居中窄栏与 24px 左右内边距。
3. 适用区域的 Bento / 项目卡片：1px 边框、14px 圆角、12px 网格间距、16:9 封面、200ms muted Hover 外环。
4. BlurFade：opacity 0→1、Y -6→0、blur 6→0、0.4s easeOut，保留调用处延迟。
5. 文字淡入：Y -8→0、blur 8→0、0.4s；默认整段播放。
6. 底部 Dock：40→60px 容器、20→30px 图标、100px 指针影响距离；spring mass .1 / stiffness 150 / damping 12；手机固定 36px / 16px。
7. Dock 的 card/90 背景、64px backdrop blur、胶囊外壳、轻阴影、Tooltip 与主题切换。
8. 局部 FlickeringGrid：2px 方格、2px 间距、最大透明度 .3、随主题变色、向下渐隐；页顶高 100px。
9. 需要的文章列表、TOC、Shiki GitHub 双主题代码块、可复制代码、横向滚动表格、图片与引用排版。
10. 对应的 Hover、Focus、手机尺寸、长标题换行和安全区间距。

以附件中的精确参数和源代码为准，先还原配色、布局和组件比例，再加入特效。
保留当前项目的业务文案和数据，不照搬 Actify 身份信息。
普通正文保持稳定，不增加持续运动背景、粒子、3D、Neon 或新的重型 UI 库。
如当前项目框架或 Tailwind 版本不同，在原架构内适配等价视觉与交互。
完成后验证桌面/手机、Light/Dark、主要交互、控制台和构建，说明修改范围后停止。
```
