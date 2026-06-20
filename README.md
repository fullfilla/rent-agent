# Rent Agent

Rent Agent 是一个租房辅助 MVP，用于根据预算、位置、通勤、偏好等条件整理房源，并通过界面化的筛选、评分和对话面板帮助用户比较候选房源。

## 功能概览

- 房源列表、筛选条件和评分展示
- 租房偏好设置与本地保存
- 对话式租房建议面板
- 简单的 Node.js 服务端接口
- Vite + React + TypeScript 前端

## 本地运行

```bash
npm install
npm run dev
```

开发服务器启动后，在浏览器打开终端提示的本地地址，通常是 `http://localhost:5173`。

如需启动服务端：

```bash
npm start
```

## 目录

- `src/`：前端界面、数据和租房评分逻辑
- `server/`：Node.js 服务端
- `docs/`：需求、设计、测试和部署说明
- `.env.example`：环境变量示例
