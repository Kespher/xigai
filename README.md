# 习概客观题刷题助手 Cloudflare 部署版

这个项目严格仿照 `Kespher/maogai` 的 Cloudflare Pages + Pages Functions 结构，把 `xi_test.json` 中的习概客观题整理成可部署刷题网页。

## 题库范围

- 总题数：274 道客观题
- 单选题：131 道
- 多选题：112 道
- 判断题：31 道
- 已排除：填空题 30 道

## 项目结构

```text
xigai-cloudflare-site/
├── public/                         # Cloudflare Pages 静态资源目录
│   ├── index.html                   # 页面结构，只保留 HTML
│   ├── _routes.json                 # 只让 /api/* 走 Function，静态资源不触发函数
│   ├── _headers                     # 基础安全响应头与缓存策略
│   └── assets/
│       ├── css/
│       │   └── app.css              # 自定义样式、动画、答题状态样式
│       └── js/
│           ├── main.js              # 刷题主逻辑：渲染、判题、进度、总结
│           ├── data/
│           │   └── questions.js     # 274 道习概客观题数据
│           └── services/
│               └── aiService.js     # 前端 AI 请求封装
├── functions/
│   └── api/
│       └── ai.js                    # Cloudflare Pages Function：代理 Gemini API
├── docs/
│   └── dynamic-roadmap.md           # 后续动态化建议
├── package.json
├── wrangler.toml
└── .gitignore
```

## 本地运行

```bash
npm install
npm run dev
```

默认会用 Wrangler 启动 Pages 本地环境，静态页面在 `public/`，API 路由在 `/api/ai`。

## 部署到 Cloudflare Pages

### 方式 A：Dashboard 连接 GitHub

1. 把整个 `xigai-cloudflare-site` 文件夹上传到 GitHub。
2. Cloudflare 控制台进入 Workers & Pages → Create application → Pages。
3. 选择仓库。
4. 构建设置：
   - Framework preset：None
   - Build command：留空
   - Build output directory：`public`
5. 环境变量里添加：
   - `DEEPSEEK_API_KEY`：你的 DeepSeek API Key
   - `DEEPSEEK_MODEL`：可选，默认 `deepseek-v4-flash`
6. 部署。

### 方式 B：Wrangler 命令行

```bash
npm install
npx wrangler login
npm run deploy:pages
```

## 说明

前端 UI 保持毛概版的卡片式刷题风格、配色、反馈区、AI 讲解区与总结页，只把课程名、题库和 AI prompt 改成习概。
