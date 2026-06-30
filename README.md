# 深度研究 AI 工具

基于 Dify 工作流的深度研究前端应用。输入问题后，AI 会自动进行多步骤研究：意图识别 → 子问题拆解 → 关键词生成 → 网络搜索 → 内容提取 → 质量评估 → 去重整合 → 生成研究报告。

## 功能特性

- **SSE 流式输出** — 实时展示研究过程和结果
- **多会话管理** — 同时运行多个独立研究会话，支持切换和删除
- **应用内设置** — 可在浏览器中直接配置 API Key 和 Base URL
- **下载报告** — 研究完成后可将结果下载为 Markdown 文件
- **会话持久化** — 刷新页面后会话数据自动恢复
- **深色模式** — 跟随系统主题自动切换

## 快速开始

### 1. 部署 Dify 工作流

1. 打开你的 [Dify](https://dify.ai) 平台（自托管或云端版）
2. 进入 **工作室** → 点击 **导入DSL文件**
3. 选择本项目中的 [`深度研究ai工具.yml`](./深度研究ai工具.yml) 文件导入
4. 导入后需要在工作流中配置以下插件的 API Key：
   - **OpenAI 插件**（用于 LLM 节点）— 需要 OpenAI API Key 或兼容的 API Key
   - **Tavily 插件**（用于网络搜索）— 在 [tavily.com](https://tavily.com) 注册获取 API Key
5. 配置完成后点击 **发布**
6. 在 **访问 API** 页面获取：
   - **API Base URL**（例如 `https://api.dify.ai/v1` 或你的自托管地址）
   - **API Key**（以 `app-` 开头）

### 2. 启动前端

```bash
# 克隆项目
git clone https://github.com/yylcom/dify-deep-research.git
cd dify-deep-research

# 安装依赖
npm install

# 方式一：创建 .env 文件配置（可选）
cp .env.example .env
# 编辑 .env 填入你的 API Key 和 Base URL

# 启动开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

### 3. 配置 API

有两种方式配置 API：

**方式一：页面内设置（推荐）**

首次打开时会自动弹出设置面板，填入：
- **API Base URL**：你的 Dify API 地址
- **API Key**：以 `app-` 开头的应用密钥

点击保存即可，配置会保存在浏览器 localStorage 中。

**方式二：环境变量**

创建 `.env` 文件：

```env
VITE_DIFY_BASE_URL=https://api.dify.ai/v1
VITE_DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
```

> 环境变量仅在构建时生效，作为默认值。页面内设置会覆盖环境变量。

## 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

构建产物在 `dist/` 目录，可部署到任何静态托管服务（Vercel、Netlify、Nginx 等）。

## 技术栈

- React 19 + TypeScript + Vite
- Dify Workflow API（SSE 流式）
- react-markdown + remark-gfm + react-syntax-highlighter

## 项目结构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 主组件（会话管理、配置状态）
├── App.css                     # 样式
├── types.ts                    # 共享类型定义
├── services/
│   └── dify.ts                 # Dify API 客户端（SSE 流式解析）
└── components/
    ├── SettingsModal.tsx        # 设置面板
    ├── SessionSidebar.tsx       # 会话侧栏
    ├── SessionPanel.tsx         # 单个会话面板
    ├── ResearchInput.tsx        # 输入框
    ├── ResearchResult.tsx       # 结果展示 + 下载
    └── MarkdownRenderer.tsx     # Markdown 渲染器
```
