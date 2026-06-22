# Rent Agent

Rent Agent 是一个租房辅助 MVP，用于根据预算、位置、通勤、偏好等条件整理房源，并通过筛选、评分、收藏和对话面板帮助用户比较候选房源。

## 功能概览

- 房源列表、筛选条件和匹配评分
- 租房偏好与会话记忆本地保存
- 收藏、导出和摘要复制
- 设置页配置大模型 API
- 设置页配置房源平台 API，支持只配置一个平台
- Node.js 服务端代理外部 API，避免把 Token 写死在源码里

## 本地运行

### 方式一：正式模式，推荐测试 API 时使用

在项目目录运行：

```powershell
Set-Location 'E:\codex空间\rent-agent'
npm install
npm run build
npm start
```

启动后打开：

```text
http://localhost:3000
```

### 方式二：开发模式

开发模式需要两个终端。

终端 1 启动 Node 服务端：

```powershell
Set-Location 'E:\codex空间\rent-agent'
npm run build
npm start
```

终端 2 启动 Vite 前端：

```powershell
Set-Location 'E:\codex空间\rent-agent'
npm run dev
```

打开：

```text
http://localhost:5173
```

Vite 已配置 `/api` 代理到 `http://127.0.0.1:3000`。

## 房源平台 API 配置

打开应用后进入左侧的 `设置`，在 `Listing platform APIs` 区域配置。

每个平台都是独立的：

- 只配置贝壳可以运行
- 配置贝壳 + 安居客可以运行
- 三个平台都配置也可以运行
- 没配置的平台会自动跳过

### 贝壳 API 示例配置

根据你提供的 curl 示例，可以这样填：

```text
Enable Beike: 勾选
Method: POST
Base URL: https://gw-open.ke.com
Endpoint: /Open/In/Building/Add
Auth header: access_token
Token / API Key: 从 getToken 接口拿到的 access_token
```

`POST form body / GET query` 每行填一个 `key=value`：

```text
city_name=北京市
district_name=海淀区
resblock_name=弘源首著大厦
building_name=1号楼
address=北京市海淀区
stat_usage=xzl
trade_owner=notreal
property_age=y50
build_area=30000.00
resblock_lat=40.049317
resblock_lng=116.311989
building_lat=40.049383
building_lng=116.312053
unit_count=2
floor_count=8
stand_high=2.5
stand_area=10.00
house_rate=78.00
cubage_rate=90.00
lift_count=6
developers=北京新奥特集团物业管理事业部
property=北京新奥特集团物业管理事业部
build_date=2000年1月1号
car_count=150
resblock_images=https://images.url.com
building_images=https://images.url.com
```

然后点击：

```text
Test enabled APIs
```

如果贝壳返回：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "building_id": 21001467
  }
}
```

页面会显示请求成功。这个接口是楼盘/楼栋新增示例，不一定会返回房源列表；它适合先验证 Token、请求头和表单格式是否正确。

## API 请求规则

服务端会根据设置页配置自动组装请求：

- `POST`：使用 `application/x-www-form-urlencoded`
- `GET`：把表单内容作为 query 参数
- `access_token`：发送请求头 `access_token: <token>`
- `bearer`：发送请求头 `Authorization: Bearer <token>`
- `x-api-key`：发送请求头 `x-api-key: <token>`

Token 保存在当前浏览器的 localStorage 中。不要把真实 Token 提交到 GitHub。

## 常用命令

```powershell
npm install
npm run dev
npm run build
npm start
npm run preview
```

## 测试截图

以下截图来自本地浏览器中的实际用户操作路径，覆盖主要功能页面。

### Agent 对话

![Agent 对话功能测试](docs/screenshots/user-agent-chat.png)

### 房源聚合与筛选

![房源聚合与筛选功能测试](docs/screenshots/user-listing-filter.png)

### 地图找房

![地图找房功能测试](docs/screenshots/user-map-search.png)

### 收藏房源

![收藏房源功能测试](docs/screenshots/user-favorites.png)

### 设置与 API 配置

![设置与 API 配置功能测试](docs/screenshots/user-settings-api.png)

停止服务：

```text
Ctrl + C
```

## 目录

- `src/`：前端界面、数据和租房评分逻辑
- `server/`：Node.js 服务端和 API 代理
- `docs/`：需求、设计、测试和部署说明
- `.env.example`：环境变量示例，当前设置页也可直接配置平台 API
