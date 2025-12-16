# 艾森豪威尔矩阵 - 工作日报管理

一个基于四象限工作法的任务管理工具，支持拖拽、完成事项管理和 AI 日报生成。

## 开发

### 安装依赖

```bash
npm install
```

### 运行应用

```bash
npm start
```

## 打包

### 打包为 DMG（macOS）

```bash
npm run build:dmg
```

打包完成后，DMG 文件会在 `dist` 目录中。

### 打包为其他格式

```bash
# 打包所有平台
npm run build

# 仅打包 macOS
npm run build:mac
```

## 功能特性

- ✅ 四象限任务管理
- ✅ 拖拽改变象限
- ✅ 已完成事项管理
- ✅ 数据本地存储
- ✅ AI 日报生成（需要 Gemini API Key）

## 技术栈

- Electron
- HTML/CSS/JavaScript
- Google Gemini API

