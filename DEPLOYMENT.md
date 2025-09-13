# GitHub Pages 部署指南

本指南将帮助您将 GalaxyChat 项目部署到 GitHub Pages 上，使其可以作为静态网站在线访问。

## 📋 前提条件

- 已安装 Git
- 有 GitHub 账号
- 目标仓库：`https://github.com/ivanmirzayev/chatbot.github.io.git`

## 🚀 部署方法

### 方法一：直接通过 GitHub 网站上传

1. 访问 [GitHub](https://github.com/) 并登录您的账号
2. 打开目标仓库：`https://github.com/ivanmirzayev/chatbot.github.io.git`
3. 点击 "Add file" -> "Upload files"
4. 上传本项目的所有文件（index.html, script.js, proxy_config.js, README.md, .gitignore 等）
5. 填写提交信息，然后点击 "Commit changes"
6. 等待 GitHub Pages 自动构建和部署

### 方法二：使用 Git 命令行

1. 克隆目标仓库到本地
   ```bash
   git clone https://github.com/ivanmirzayev/chatbot.github.io.git
   cd chatbot.github.io
   ```

2. 将本项目的所有文件复制到克隆的仓库目录中

3. 添加、提交并推送更改
   ```bash
   git add .
   git commit -m "Initial commit of GalaxyChat"
   git push origin main
   ```

4. 等待 GitHub Pages 自动构建和部署

## ⚙️ 配置 GitHub Pages

如果是首次部署到该仓库，您可能需要手动启用 GitHub Pages：

1. 访问仓库的设置页面
2. 在左侧菜单中点击 "Pages"
3. 在 "Source" 部分，从下拉菜单中选择一个分支（通常是 `main` 或 `master`）
4. 选择根目录（`/ (root)`）
5. 点击 "Save"
6. 等待几分钟，GitHub Pages 将会构建您的网站
7. 页面顶部会显示部署成功的消息和访问链接

## 🔑 API 密钥和代理配置

部署到 GitHub Pages 后，用户需要自行配置 OpenAI API 密钥：

1. 访问部署好的网站
2. 点击右上角的 ⚙️ 设置按钮
3. 输入 OpenAI API 密钥
4. （可选）根据需要配置代理设置
5. 点击 "保存设置"

API 密钥和代理配置仅存储在用户的浏览器本地存储中，不会被发送到 GitHub 服务器或其他任何第三方服务器。

## 🧪 验证部署

部署完成后，您可以通过以下方式验证：

1. 访问 GitHub Pages 提供的 URL（通常是 `https://ivanmirzayev.github.io/chatbot.github.io/`）
2. 检查网站是否正常加载
3. 尝试设置 API 密钥并发送一条测试消息
4. 确认 AI 能够正常回复

## ❓ 常见问题与解决方案

### 问题：网站加载后无法正常显示或功能异常

**解决方案：**
- 检查浏览器控制台是否有错误信息
- 确认所有文件都已正确上传
- 清除浏览器缓存并刷新页面

### 问题：API 调用失败，显示网络错误

**解决方案：**
- 确认 API 密钥正确无误
- 尝试配置代理服务器（在设置中启用代理并输入有效的代理 URL）
- 检查网络连接是否正常

### 问题：GitHub Pages 部署后没有更新

**解决方案：**
- 确认所有更改已推送到 GitHub
- 等待几分钟，GitHub Pages 可能需要时间构建
- 清除浏览器缓存
- 检查仓库设置中的 GitHub Pages 配置是否正确

## 📞 技术支持

如果您在部署过程中遇到任何问题，请在 GitHub 仓库提交 Issue 或联系项目维护者。

## 🚀 部署成功！

恭喜您成功部署 GalaxyChat 到 GitHub Pages！现在您可以与朋友分享这个链接，让他们也能体验 AI 聊天助手的强大功能。