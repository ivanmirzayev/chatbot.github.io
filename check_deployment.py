#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GalaxyChat - 部署前检查脚本
用于验证项目是否可以正常部署到 GitHub Pages
"""

import os
import sys
import re
from urllib.parse import urlparse

# 定义需要检查的文件
REQUIRED_FILES = [
    'index.html',
    'script.js',
    'proxy_config.js',
    'README.md',
    '.gitignore'
]

# 定义颜色常量用于输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'

# 检查是否在Windows环境
IS_WINDOWS = os.name == 'nt'

# 跨平台颜色输出函数
def print_color(text, color):
    if IS_WINDOWS:
        print(text)
    else:
        print(f"{color}{text}{Colors.ENDC}")

def print_success(text):
    print_color(f"✓ {text}", Colors.GREEN)

def print_error(text):
    print_color(f"✗ {text}", Colors.RED)

def print_warning(text):
    print_color(f"⚠ {text}", Colors.YELLOW)

def print_info(text):
    print_color(f"ℹ {text}", Colors.BLUE)

# 检查文件是否存在
def check_files():
    print_info("检查必要文件...")
    all_files_exist = True
    
    for file in REQUIRED_FILES:
        if os.path.exists(file):
            print_success(f"找到文件: {file}")
        else:
            print_error(f"未找到文件: {file}")
            all_files_exist = False
    
    return all_files_exist

# 检查文件内容是否有效
def check_file_contents():
    print_info("检查文件内容...")
    
    # 检查index.html是否包含必要的标签
    if os.path.exists('index.html'):
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()
            
            # 检查是否包含HTML基本结构
            if re.search(r'<html.*?>.*?</html>', content, re.DOTALL):
                print_success("index.html 包含完整的HTML结构")
            else:
                print_error("index.html 缺少完整的HTML结构")
                return False
            
            # 检查是否引用了script.js
            if re.search(r'<script.*?src=["\']script\.js["\'].*?>', content):
                print_success("index.html 正确引用了script.js")
            else:
                print_error("index.html 未引用script.js")
                return False
    
    # 检查script.js是否包含必要的功能
    if os.path.exists('script.js'):
        with open('script.js', 'r', encoding='utf-8') as f:
            content = f.read()
            
            # 检查是否包含localStorage相关代码（用于存储API密钥）
            if 'localStorage' in content:
                print_success("script.js 包含localStorage相关功能")
            else:
                print_error("script.js 缺少localStorage相关功能")
                return False
            
            # 检查是否包含OpenAI API调用相关代码
            if 'fetch' in content and ('openai.com' in content or 'proxy' in content.lower()):
                print_success("script.js 包含API调用相关功能")
            else:
                print_error("script.js 缺少API调用相关功能")
                return False
    
    # 检查.gitignore是否包含常见的忽略规则
    if os.path.exists('.gitignore'):
        with open('.gitignore', 'r', encoding='utf-8') as f:
            content = f.read().lower()
            required_rules = ['node_modules', '.env', '.gitignore', 'thumbs.db']
            missing_rules = []
            
            for rule in required_rules:
                if rule not in content:
                    missing_rules.append(rule)
            
            if not missing_rules:
                print_success(".gitignore 包含必要的忽略规则")
            else:
                print_warning(f".gitignore 缺少以下忽略规则: {', '.join(missing_rules)}")
    
    return True

# 检查是否适合GitHub Pages部署
def check_github_pages_compatibility():
    print_info("检查GitHub Pages兼容性...")
    
    # 检查是否没有使用服务器端代码
    server_side_indicators = [
        '#!/usr/bin/env node',
        'require(',
        'import \w+ from',
        'express\.',
        'app\.get',
        'app\.post',
        'server\.listen',
        'from flask import'
    ]
    
    has_server_code = False
    
    # 检查HTML和JS文件
    for file in ['index.html', 'script.js', 'proxy_config.js']:
        if os.path.exists(file):
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                for indicator in server_side_indicators:
                    if re.search(indicator, content):
                        print_warning(f"文件 {file} 可能包含服务器端代码: {indicator}")
                        has_server_code = True
    
    if not has_server_code:
        print_success("项目适合GitHub Pages部署（纯前端应用）")
    
    # 检查是否包含API密钥
    if check_api_key_exposure():
        return False
    
    return True

# 检查是否暴露了API密钥
def check_api_key_exposure():
    print_info("检查API密钥暴露...")
    
    # 检查常见的API密钥模式
    api_key_patterns = [
        r'sk-[a-zA-Z0-9]{20,}',  # OpenAI API密钥格式
        r'api[_-]key[\s]*=[\s]*["\']?[a-zA-Z0-9]{20,}["\']?',
        r'api[_-]secret[\s]*=[\s]*["\']?[a-zA-Z0-9]{20,}["\']?',
        r'token[\s]*=[\s]*["\']?[a-zA-Z0-9]{20,}["\']?'
    ]
    
    has_exposed_key = False
    
    # 检查所有HTML和JS文件
    for file in ['index.html', 'script.js', 'proxy_config.js']:
        if os.path.exists(file):
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                for pattern in api_key_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        print_error(f"在文件 {file} 中发现可能的API密钥: {match.group(0)[:10]}...")
                        has_exposed_key = True
    
    # 检查是否有名为apikey.txt的文件
    if os.path.exists('apikey.txt'):
        print_warning("发现apikey.txt文件，请注意不要将其提交到GitHub仓库")
        
        # 检查apikey.txt是否包含API密钥
        with open('apikey.txt', 'r', encoding='utf-8') as f:
            content = f.read().strip()
            for pattern in api_key_patterns:
                if re.search(pattern, content):
                    print_error("apikey.txt文件包含可能的API密钥")
                    has_exposed_key = True
    
    if not has_exposed_key:
        print_success("未发现暴露的API密钥")
    
    return has_exposed_key

# 显示部署指南
def show_deployment_guide():
    print("\n" + "="*60)
    print_info("GitHub Pages 部署指南")
    print("="*60)
    print("1. 将项目代码推送到GitHub仓库:")
    print("   git init")
    print("   git add .")
    print("   git commit -m \"Initial commit\"")
    print("   git remote add origin https://github.com/ivanmirzayev/chatbot.github.io.git")
    print("   git push -u origin main")
    print()
    print("2. 在GitHub仓库设置中启用GitHub Pages:")
    print("   - 访问仓库的Settings页面")
    print("   - 点击左侧菜单中的Pages")
    print("   - 选择分支（通常是main）和根目录")
    print("   - 点击Save")
    print()
    print("3. 等待几分钟，GitHub Pages会自动构建和部署您的网站")
    print()
    print("4. 访问提供的URL开始使用GalaxyChat")
    print("="*60 + "\n")

# 主函数
def main():
    print("\n" + "*"*60)
    print_color("GalaxyChat - GitHub Pages 部署检查工具", Colors.BLUE)
    print("*"*60 + "\n")
    
    # 运行所有检查
    files_ok = check_files()
    contents_ok = check_file_contents()
    gh_pages_ok = check_github_pages_compatibility()
    
    print("\n" + "*"*60)
    
    # 总结检查结果
    if files_ok and contents_ok and gh_pages_ok:
        print_success("✅ 所有检查通过！项目已准备好部署到GitHub Pages")
        show_deployment_guide()
        return 0
    else:
        print_error("❌ 检查未通过，请修复上述问题后再尝试部署")
        return 1

if __name__ == "__main__":
    sys.exit(main())