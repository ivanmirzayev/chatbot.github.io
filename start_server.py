#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GalaxyChat - 本地开发服务器
用于在本地启动一个简单的Web服务器来测试项目
"""

import os
import sys
import http.server
import socketserver
import webbrowser
from threading import Timer

# 定义端口号，默认为8000
PORT = 8000

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

# 检查必要文件是否存在
def check_required_files():
    print_info("检查必要文件...")
    required_files = ['index.html', 'script.js']
    all_exist = True
    
    for file in required_files:
        if os.path.exists(file):
            print_success(f"找到文件: {file}")
        else:
            print_error(f"未找到文件: {file}")
            all_exist = False
    
    return all_exist

# 启动本地服务器
def start_server():
    # 定义处理器
    Handler = http.server.SimpleHTTPRequestHandler
    
    # 设置目录为当前目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        # 创建服务器
        with socketserver.TCPServer(('', PORT), Handler) as httpd:
            print("\n" + "*"*60)
            print_color(f"GalaxyChat 本地开发服务器已启动", Colors.BLUE)
            print(f"服务地址: http://localhost:{PORT}")
            print(f"服务目录: {os.getcwd()}")
            print("*"*60)
            print_info("按 Ctrl+C 停止服务器")
            print("*"*60 + "\n")
            
            # 自动打开浏览器
            Timer(1, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n" + "*"*60)
        print_success("服务器已停止")
        print("*"*60)
    except OSError as e:
        if "address already in use" in str(e):
            print_error(f"端口 {PORT} 已被占用，请尝试使用其他端口。")
            print_info(f"使用方法: python start_server.py <端口号>")
        else:
            print_error(f"启动服务器时发生错误: {e}")
        sys.exit(1)

# 显示部署指南
def show_deployment_info():
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
    global PORT
    
    # 解析命令行参数（端口号）
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
            if PORT < 1024 or PORT > 65535:
                print_error("端口号必须在1024-65535之间")
                sys.exit(1)
        except ValueError:
            print_error("无效的端口号")
            print_info("使用方法: python start_server.py <端口号>")
            sys.exit(1)
    
    print("\n" + "*"*60)
    print_color("GalaxyChat - 本地开发服务器", Colors.BLUE)
    print("*"*60 + "\n")
    
    # 检查必要文件
    if check_required_files():
        # 显示部署信息
        show_deployment_info()
        # 启动服务器
        start_server()
    else:
        print_error("缺少必要文件，无法启动服务器")
        sys.exit(1)

if __name__ == "__main__":
    main()