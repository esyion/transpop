下面这份是偏 **专业产品/UI团队** 使用的设计文档，而不是简单的页面说明。按照这个文档，设计师或 AI（如 Figma AI、v0、Lovable 等）都可以直接开始出稿。

---

# UI Design Specification

> Project: TransPop
> Version: V1.0
> Platform: Windows / macOS / Linux
> Style: Minimal / Native / Raycast-like

---

# 1. Design Principle

## 产品定位

一个始终驻留后台的 AI 翻译工具。

设计目标：

* 极快
* 极简
* 零学习成本
* 尽量减少鼠标操作

用户操作流程应控制在：

```text
Alt + Space

↓

输入

↓

Enter

↓

查看翻译

↓

Esc
```

整个流程无需离开当前工作环境。

---

# 2. Design Keywords

整个产品保持以下关键词：

```
Minimal

Modern

Native

Floating

Elegant

Fast

Lightweight
```

禁止：

❌ 花哨动画

❌ 大面积颜色

❌ 复杂布局

❌ 多层菜单

---

# 3. Visual Style

参考产品：

* Raycast ⭐⭐⭐⭐⭐
* Bob
* ChatWise
* Arc Browser
* Notion Calendar

整体风格：

```
大量留白

弱边框

低对比

圆角

半透明

轻阴影

毛玻璃（支持时）
```

---

# 4. Color System

## Light

| 名称             | Color   |
| -------------- | ------- |
| Background     | #FFFFFF |
| Surface        | #FAFAFA |
| Border         | #E5E5E5 |
| Primary Text   | #111827 |
| Secondary Text | #6B7280 |
| Accent         | #3B82F6 |

---

## Dark

| 名称             | Color   |
| -------------- | ------- |
| Background     | #18181B |
| Surface        | #27272A |
| Border         | #3F3F46 |
| Primary Text   | #FAFAFA |
| Secondary Text | #A1A1AA |
| Accent         | #60A5FA |

---

# 5. Typography

字体：

Windows

```
Segoe UI Variable
```

macOS

```
SF Pro Display
```

Linux

```
Inter
```

字体层级：

| 用途          | Size | Weight   |
| ----------- | ---- | -------- |
| Title       | 20   | SemiBold |
| Input       | 18   | Regular  |
| Result      | 18   | Medium   |
| Description | 14   | Regular  |
| Hint        | 12   | Regular  |

行高：

```
1.5
```

---

# 6. Radius

| Component   | Radius |
| ----------- | ------ |
| Main Window | 20px   |
| Card        | 16px   |
| Input       | 12px   |
| Button      | 10px   |

---

# 7. Shadow

```
shadow-xl

Opacity 15%
Blur 30
```

不要使用厚重阴影。

---

# 8. Layout

窗口：

```
宽

720px
```

```
高

Auto

Min 180px

Max 500px
```

Padding：

```
24px
```

间距：

```
16px
```

Grid：

```
8pt
```

---

# 9. Window

属性：

```
Borderless

Always On Top

Transparent

Hide Taskbar

Center Screen
```

支持：

```
Windows Acrylic

Windows Mica

macOS Vibrancy
```

---

# 10. Main Interface

```
╭────────────────────────────────────╮
│ 🌍 Translate                  ⚙️    │
│                                    │
│ Hello World                       │
│────────────────────────────────────│
│ 你好，世界                         │
│                                    │
│ Copy          Retry                │
╰────────────────────────────────────╯
```

---

# 11. Components

## Input

高度：

```
52px
```

Placeholder：

```
Type something...
```

支持：

* 自动 Focus
* Ctrl+A
* Ctrl+V
* Ctrl+C
* Undo
* Redo

---

## Result Card

高度：

Auto

背景：

```
Surface
```

Padding：

```
16px
```

支持：

```
Copy

Retry
```

---

## Buttons

Primary：

Accent

Secondary：

Ghost

Hover：

Opacity

95%

Active：

90%

---

## Loading

翻译过程中：

```
Thinking...

•••
```

不要使用旋转 Loading。

推荐：

渐变 Skeleton。

---

# 12. Animation

动画原则：

```
Short

Natural

No Bounce
```

---

窗口：

```
Opacity

0

↓

1

Duration

160ms
```

Scale：

```
96%

↓

100%
```

---

翻译完成：

```
Fade In

120ms
```

---

按钮 Hover：

```
100ms
```

---

# 13. Keyboard Experience

打开：

```
Alt + Space
```

关闭：

```
Esc
```

翻译：

```
Enter
```

换行：

```
Shift + Enter
```

复制：

```
Ctrl + C
```

全部：

```
Ctrl + A
```

历史：

```
↑
↓

```

---

# 14. Settings

左侧：

```
General

Translation

Appearance

Shortcut

About
```

右侧：

```
API

Language

Theme

Startup

Shortcut
```

---

# 15. Empty State

```
Start typing...

Translation will appear here.
```

---

# 16. Error State

```
Unable to translate.

Check your API key.
```

按钮：

Retry

---

# 17. Accessibility

支持：

* Keyboard Only
* Screen Reader
* High Contrast
* Font Scaling

---

# 18. Responsive Rules

最小宽度：

```
520px
```

推荐：

```
720px
```

最大：

```
900px
```

---

# 19. Design Tokens

```json
{
  "radius": {
    "window": 20,
    "card": 16,
    "input": 12,
    "button": 10
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "font": {
    "title": 20,
    "body": 16,
    "input": 18,
    "caption": 12
  }
}
```

---

# 20. 推荐的组件库

| 类型         | 推荐              |
| ---------- | --------------- |
| 基础组件       | **shadcn/ui**   |
| 样式         | Tailwind CSS v4 |
| 动画         | Framer Motion   |
| 图标         | lucide-react    |
| Toast      | sonner          |
| 命令面板（后续扩展） | cmdk            |
| 状态管理       | Zustand         |

## 后续可扩展的设计方向（V2.0）

为了避免后续推倒重来，建议从 V1 开始预留这些能力：

* **命令模式**：`/translate`、`/rewrite`、`/summarize` 等，采用类似 Raycast 的命令面板交互。
* **多结果视图**：支持同时展示多个翻译引擎结果（如 GPT、DeepL、Google）。
* **插件区域**：底部预留扩展入口，例如 OCR、截图翻译、AI 写作。
* **主题系统**：支持浅色、深色以及跟随系统，并通过 Design Tokens 管理颜色和间距，方便后续扩展品牌主题。

这套规范既适合作为设计团队的 UI 规范，也适合作为 AI 生成 Figma 或前端页面时的输入文档。
