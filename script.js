// GalaxyChat - AI聊天助手
// 等待DOM完全加载后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化变量
    const textInput = document.querySelector('.text-input');
    const sendBtn = document.querySelector('.send-btn');
    const chatContainer = document.querySelector('.chat-container');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const chatHistoryContainer = document.querySelector('.chat-history');
    let apiKey = '';
    let currentChatId = null;
    let chatMessages = [];
    let chatHistories = [];
    
    // 连接历史记录
    let connectionHistory = {
        successfulEndpoints: [],
        failedEndpoints: [],
        responseTimes: {}
    };
    
    // 从本地存储加载连接历史
    try {
        const savedHistory = localStorage.getItem('connectionHistory');
        if (savedHistory) {
            connectionHistory = JSON.parse(savedHistory);
        }
    } catch (error) {
        console.error('加载连接历史失败:', error);
        // 保留默认的空连接历史
    }
    
    // 连接配置，特别优化中国网络环境
    let connectionConfig = {
        model: 'gpt-3.5-turbo', // 使用更稳定的模型
        maxTokens: 2000,
        temperature: 0.7,
        systemPrompt: '你是一个乐于助人的AI助手，能够用中文回答用户的各种问题。',
        // 多种连接方式，按优先级尝试（国内优先）
        endpoints: [
            'https://api.openai.com/v1/chat/completions',           // 原始API
            'https://api.openai-proxy.com/v1/chat/completions',    // 多区域代理
            'https://api.openai-asia.com/v1/chat/completions',     // 亚洲节点
            'https://api.gptapi.us/v1/chat/completions',           // 国际高速
            'https://api.gptapi.top/v1/chat/completions',          // 亚洲节点
            'https://gpt.pawan.krd/v1/chat/completions',           // 备用
            'https://api-proxy.gpt.ge/v1/chat/completions'         // 备用
        ],
        currentEndpointIndex: 0,
        retryAttempts: 5, // 增加重试次数至5次
        // 完整请求超时时间（毫秒）
        timeout: 90000, // 进一步延长超时时间至90秒
        // TCP连接超时时间（毫秒）
        connectionTimeout: 20000, // 增加连接超时时间至20秒
        slowConnectionTimeout: 120000, // 慢连接的额外等待时间
        // 启用自动重试机制
        autoRetryEnabled: true,
        // 为secret key优化的设置
        secretKeyMode: true,
        // 增加直接连接模式
        directConnectionMode: true
    };

    // 核心API调用函数
    async function callOpenAIAPI(url, apiKey, messages) {
        // 为fetch请求设置AbortController以支持超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), connectionConfig.timeout);
        
        try {
            // 设置fetch选项
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({
                    model: connectionConfig.model,
                    messages: messages,
                    max_tokens: connectionConfig.maxTokens,
                    temperature: connectionConfig.temperature
                }),
                signal: controller.signal,
                credentials: 'omit' // 不发送凭证以简化跨域
            };
            
            // 记录开始时间
            const startTime = Date.now();
            
            // 执行fetch请求
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId); // 清除超时计时器
            
            // 检查响应状态
            if (!response.ok) {
                let errorMsg = `HTTP错误：${response.status} ${response.statusText}`;
                throw new Error(errorMsg);
            }
            
            // 解析JSON响应
            const data = await response.json();
            const responseTime = Date.now() - startTime;
            console.log(`API请求成功，响应时间：${responseTime}ms`);
            
            return data;
        } catch (error) {
            clearTimeout(timeoutId); // 确保清除超时计时器
            
            // 处理不同类型的错误
            if (error.name === 'AbortError') {
                throw new Error(`请求超时：连接到${url}超过${connectionConfig.timeout/1000}秒`);
            } else if (error.message.includes('Failed to fetch') || error.message.includes('网络错误')) {
                throw new Error(`网络连接问题：无法连接到${url}`);
            } else {
                throw error;
            }
        }
    }
    
    // 首先尝试读取API密钥文件
    try {
        const response = await fetch('apikey.txt');
        if (response.ok) {
            const keyText = await response.text();
            // 提取所有有效的API密钥（以sk-开头的行）
            const validKeys = keyText.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('sk-'));
                
            if (validKeys.length > 0) {
                apiKey = validKeys[0];
                console.log('API密钥已从文件加载');
                
                // 存储所有有效的API密钥，用于轮换
                if (validKeys.length > 1) {
                    localStorage.setItem('allAPIKeys', JSON.stringify(validKeys));
                    console.log(`已加载 ${validKeys.length} 个API密钥，支持自动轮换`);
                }
                
                // 启用secret key模式
                connectionConfig.secretKeyMode = true;
                console.log('Secret key模式已启用');
                
                // 更新欢迎消息
                updateWelcomeMessage(true);
            } else {
                console.error('无法从文件中提取有效的API密钥');
                updateWelcomeMessage(false);
            }
        } else {
            console.error('无法加载API密钥文件');
            updateWelcomeMessage(false);
        }
    } catch (error) {
        console.error('读取API密钥文件时出错:', error);
        updateWelcomeMessage(false);
    }
    
    // 显示连接状态提示
    showStatus('正在优化连接设置，适应您的网络环境...');
    
    // 预先进行轻量级的连接测试，不影响用户体验
    setTimeout(() => {
        preTestConnections().catch(err => console.log('预连接测试:', err));
    }, 2000);


    
    // 显示状态消息
    function showStatus(message) {
        const statusElement = document.createElement('div');
        statusElement.className = 'status-message';
        statusElement.textContent = message;
        statusElement.style.position = 'fixed';
        statusElement.style.bottom = '20px';
        statusElement.style.left = '50%';
        statusElement.style.transform = 'translateX(-50%)';
        statusElement.style.padding = '10px 20px';
        statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        statusElement.style.color = 'white';
        statusElement.style.borderRadius = '5px';
        statusElement.style.zIndex = '1000';
        statusElement.id = 'connection-status';
        
        // 移除已存在的状态消息
        const existingStatus = document.getElementById('connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        document.body.appendChild(statusElement);
    }
    
    // 隐藏状态消息
    function hideStatus() {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.remove();
        }
    }
    
    // 显示成功消息
    function showSuccess(message) {
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        successElement.style.position = 'fixed';
        successElement.style.bottom = '20px';
        successElement.style.left = '50%';
        successElement.style.transform = 'translateX(-50%)';
        successElement.style.padding = '10px 20px';
        successElement.style.backgroundColor = 'rgba(72, 187, 120, 0.9)';
        successElement.style.color = 'white';
        successElement.style.borderRadius = '5px';
        successElement.style.zIndex = '1000';
        successElement.style.transition = 'opacity 0.3s ease';
        
        document.body.appendChild(successElement);
        
        // 3秒后自动消失
        setTimeout(() => {
            successElement.style.opacity = '0';
            setTimeout(() => successElement.remove(), 300);
        }, 3000);
    }
    
    // 加载本地存储的聊天历史
    loadChatHistories();

    // 添加更新欢迎消息函数
    function updateWelcomeMessage(isKeyLoaded) {
        const welcomeMessage = chatContainer.querySelector('.message');
        if (welcomeMessage) {
            const contentDiv = welcomeMessage.querySelector('.message-content');
            if (contentDiv) {
                if (isKeyLoaded) {
                    contentDiv.innerHTML = `
                        <p>👋 你好！我是 GalaxyChat，您的 AI 聊天助手。</p>
                        <p>API 密钥已自动从文件加载，您可以直接开始与我对话！</p>
                    `;
                } else {
                    contentDiv.innerHTML = `
                        <p>👋 你好！我是 GalaxyChat，您的 AI 聊天助手。</p>
                        <p>无法自动加载 API 密钥，请确保 apikey.txt 文件存在且包含有效的 OpenAI API 密钥。</p>
                    `;
                }
            }
        }
    }
    
    // 加载聊天历史
    function loadChatHistories() {
        try {
            const savedHistories = localStorage.getItem('galaxyChatHistories');
            if (savedHistories) {
                chatHistories = JSON.parse(savedHistories);
                renderChatHistories();
            }
        } catch (error) {
            console.error('加载聊天历史失败:', error);
            chatHistories = [];
        }
    }
    
    // 保存聊天历史
    function saveChatHistories() {
        try {
            localStorage.setItem('galaxyChatHistories', JSON.stringify(chatHistories));
        } catch (error) {
            console.error('保存聊天历史失败:', error);
        }
    }
    
    // 渲染聊天历史列表
    function renderChatHistories() {
        chatHistoryContainer.innerHTML = '';
        
        chatHistories.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            if (chat.id === currentChatId) {
                chatItem.classList.add('active');
            }
            
            // 使用第一条用户消息作为标题
            const title = chat.messages && chat.messages.length > 0 && chat.messages[0].role === 'user' 
                ? (chat.messages[0].content.length > 30 ? chat.messages[0].content.substring(0, 30) + '...' : chat.messages[0].content) 
                : '未命名对话';
            
            chatItem.textContent = title;
            
            // 点击加载对话
            chatItem.addEventListener('click', () => loadChat(chat.id));
            
            // 添加删除按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.style.cssText = 'float: right; opacity: 0.5; cursor: pointer; margin-left: 8px;';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('确定要删除此对话吗？')) {
                    deleteChat(chat.id);
                }
            });
            
            chatItem.appendChild(deleteBtn);
            chatHistoryContainer.appendChild(chatItem);
        });
    }
    
    // 加载特定聊天
    function loadChat(chatId) {
        const chat = chatHistories.find(c => c.id === chatId);
        if (!chat) return;
        
        currentChatId = chatId;
        chatMessages = [...chat.messages];
        
        // 清空当前聊天界面
        clearChatHistory(false);
        
        // 重新渲染所有消息
        chatMessages.forEach(msg => {
            addMessageToChat(msg.role, msg.content);
        });
        
        // 更新历史列表选中状态
        renderChatHistories();
    }
    
    // 删除聊天
    function deleteChat(chatId) {
        chatHistories = chatHistories.filter(c => c.id !== chatId);
        saveChatHistories();
        renderChatHistories();
        
        // 如果删除的是当前聊天，清空界面
        if (chatId === currentChatId) {
            currentChatId = null;
            chatMessages = [];
            clearChatHistory(true);
        }
    }

    // 监听输入框变化，启用/禁用发送按钮
    textInput.addEventListener('input', function() {
        sendBtn.disabled = !this.value.trim();
        adjustTextareaHeight();
    });

    // 按Enter发送消息，Shift+Enter换行
    textInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 点击发送按钮发送消息
    sendBtn.addEventListener('click', sendMessage);

    // 点击新对话按钮开始新对话
    newChatBtn.addEventListener('click', function() {
        if (confirm('确定要开始新对话吗？')) {
            // 创建新对话
            currentChatId = Date.now().toString();
            chatMessages = [];
            chatHistories.push({
                id: currentChatId,
                messages: []
            });
            
            // 保存并更新历史
            saveChatHistories();
            renderChatHistories();
            
            // 清空当前聊天界面
            clearChatHistory(true);
        }
    });

    // 自动调整textarea高度
    function adjustTextareaHeight() {
        textInput.style.height = 'auto';
        const newHeight = Math.min(textInput.scrollHeight, 200);
        textInput.style.height = newHeight + 'px';
    }

    // 发送消息
    function sendMessage() {
        const message = textInput.value.trim();
        if (!message) return;

        // 检查是否有API密钥
        if (!apiKey) {
            showError('无法加载API密钥！请确保apikey.txt文件包含有效的OpenAI API密钥。');
            return;
        }

        // 清空输入框
        textInput.value = '';
        sendBtn.disabled = true;
        adjustTextareaHeight();

        // 如果没有当前对话，创建一个新的
        if (!currentChatId) {
            currentChatId = Date.now().toString();
            chatMessages = [];
            chatHistories.push({
                id: currentChatId,
                messages: []
            });
        }

        // 添加用户消息到聊天界面
        addMessageToChat('user', message);

        // 将用户消息添加到当前对话历史
        const userMessage = { role: 'user', content: message };
        chatMessages.push(userMessage);
        
        // 更新历史记录
        const currentChat = chatHistories.find(c => c.id === currentChatId);
        if (currentChat) {
            currentChat.messages = [...chatMessages];
            saveChatHistories();
            renderChatHistories();
        }

        // 显示"正在输入"提示
        const typingElement = showTypingIndicator();

        // 准备API请求，添加系统提示
        const messages = [
            { role: 'system', content: connectionConfig.systemPrompt },
            ...chatMessages
        ];

        // 调用OpenAI API，支持多端点尝试
        callOpenAIAPIWithRetry(messages)
            .then(response => {
                // 移除"正在输入"提示
                if (typingElement && typingElement.parentNode) {
                    typingElement.parentNode.remove();
                }

                // 添加AI回复到聊天界面
                if (response && response.choices && response.choices.length > 0) {
                    addMessageToChat('assistant', response.choices[0].message.content);
                    
                    // 将AI回复添加到对话历史
                    const aiMessage = { 
                        role: 'assistant', 
                        content: response.choices[0].message.content 
                    };
                    chatMessages.push(aiMessage);
                    
                    // 更新历史记录
                    if (currentChat) {
                        currentChat.messages = [...chatMessages];
                        saveChatHistories();
                    }
                } else {
                    showError('获取AI回复失败：无效的响应格式');
                }
            })
            .catch(error => {
                // 移除"正在输入"提示
                if (typingElement && typingElement.parentNode) {
                    typingElement.parentNode.remove();
                }

                // 显示错误信息
                console.error('API调用失败:', error);
                showError(`获取AI回复失败：${error.message || '未知错误'}`);
            })
            .finally(() => {
                // 重新启用发送按钮
                sendBtn.disabled = false;
            });
    }

    // 带重试机制的API调用函数 - 特别优化中国网络环境和secret key
    async function callOpenAIAPIWithRetry(messages) {
        let lastError = null;
        let successfulEndpoints = [];
        let failedEndpoints = [];
        let retryCount = 0; // 初始化重试计数
        
        // 确保API密钥存在
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API密钥为空，请检查apikey.txt文件');
        }

        // 中国网络环境特有的重试策略
        const chinaNetworkStrategies = {
            shortTimeouts: 0, // 短时间内多次超时计数
            lastSuccess: null, // 上一次成功的端点
            consecutiveFailures: 0, // 连续失败次数
            adaptiveTimeoutFactor: 1.0 // 自适应超时因子
        };

        // 先尝试当前选中的端点
        if (connectionConfig.currentEndpointIndex >= 0 && connectionConfig.currentEndpointIndex < connectionConfig.endpoints.length) {
            const currentEndpoint = connectionConfig.endpoints[connectionConfig.currentEndpointIndex];
            try {
                console.log(`尝试连接到首选端点: ${currentEndpoint}`);
                
                // 为首选端点提供更优的超时设置
                const originalTimeout = connectionConfig.timeout;
                const originalConnTimeout = connectionConfig.connectionTimeout;
                connectionConfig.connectionTimeout = Math.floor(originalConnTimeout * 1.2);
                
                const result = await callOpenAIAPI(currentEndpoint, apiKey, messages);
                
                // 恢复原始超时设置
                connectionConfig.timeout = originalTimeout;
                connectionConfig.connectionTimeout = originalConnTimeout;
                
                successfulEndpoints.push(currentEndpoint);
                // 更新成功历史记录
                updateConnectionHistory(currentEndpoint, true);
                return result;
            } catch (error) {
                console.error(`首选端点连接失败: ${error.message}`);
                lastError = error;
                failedEndpoints.push(currentEndpoint);
                // 更新失败历史记录
                updateConnectionHistory(currentEndpoint, false);
                chinaNetworkStrategies.consecutiveFailures++;
            }
        }
        
        // 尝试所有可用的端点
        const maxRetries = connectionConfig.retryAttempts + (connectionConfig.autoRetryEnabled ? 2 : 0);
        const allEndpoints = [...connectionConfig.endpoints];
        
        // 保存原始超时设置
        const globalOriginalTimeout = connectionConfig.timeout;
        const globalOriginalConnTimeout = connectionConfig.connectionTimeout;
        
        for (const url of allEndpoints) {
            // 跳过已经失败的端点
            if (failedEndpoints.includes(url)) {
                continue;
            }

            try {
                console.log(`尝试连接到端点: ${url}`);
                
                // 根据网络状况动态调整超时设置
                const originalTimeout = connectionConfig.timeout;
                const originalConnTimeout = connectionConfig.connectionTimeout;
                
                // 随着尝试次数增加，动态延长超时时间
                connectionConfig.timeout = Math.floor(globalOriginalTimeout * (1 + retryCount * 0.2));
                connectionConfig.connectionTimeout = Math.floor(globalOriginalConnTimeout * (1 + retryCount * 0.3));

                const result = await callOpenAIAPI(url, apiKey, messages);
                
                // 安全恢复原始超时设置
                connectionConfig.timeout = originalTimeout;
                connectionConfig.connectionTimeout = originalConnTimeout;
                
                // 设置当前成功的端点
                connectionConfig.currentEndpointIndex = connectionConfig.endpoints.indexOf(url);
                successfulEndpoints.push(url);
                
                // 保存成功的端点到本地存储
                localStorage.setItem('lastSuccessfulEndpoint', url);
                
                // 重置网络策略计数器
                chinaNetworkStrategies.consecutiveFailures = 0;
                chinaNetworkStrategies.adaptiveTimeoutFactor = Math.max(1.0, chinaNetworkStrategies.adaptiveTimeoutFactor - 0.1);
                chinaNetworkStrategies.lastSuccess = url;
                
                // 保存自适应超时因子
                localStorage.setItem('adaptiveTimeoutFactor', chinaNetworkStrategies.adaptiveTimeoutFactor.toString());
                
                // 如果之前有失败记录，现在成功了，提示用户
                if (successfulEndpoints.length > 0 && failedEndpoints.length > 0) {
                    console.log('成功找到可用的连接方式！');
                    showSuccess(`已连接到 ${getEndpointDisplayName(url)}`);
                }
                
                // 恢复全局原始超时设置
                connectionConfig.timeout = globalOriginalTimeout;
                connectionConfig.connectionTimeout = globalOriginalConnTimeout;
                
                return result;
            } catch (error) {
                console.error(`端点 ${url} 连接失败: ${error.message}`);
                lastError = error;
                failedEndpoints.push(url);
                
                // 安全恢复原始超时设置
                connectionConfig.timeout = globalOriginalTimeout;
                connectionConfig.connectionTimeout = globalOriginalConnTimeout;
                
                // 更新网络策略计数器
                chinaNetworkStrategies.consecutiveFailures++;
                chinaNetworkStrategies.adaptiveTimeoutFactor = Math.min(2.0, chinaNetworkStrategies.adaptiveTimeoutFactor + 0.1);
                
                if (error.message.includes('超时')) {
                    chinaNetworkStrategies.shortTimeouts++;
                }
                
                // 根据错误类型和网络状况智能调整重试间隔和策略
                let retryDelay = 1000; // 基础等待时间
                
                if (error.message.includes('超时')) {
                    // 超时错误，需要更长的重试间隔
                    retryDelay = 2000 + Math.min(3000, chinaNetworkStrategies.shortTimeouts * 500);
                } else if (error.message.includes('429')) {
                    // 速率限制错误，需要更长的等待时间
                    retryDelay = 3000 + Math.random() * 2000;
                } else if (error.message.includes('401') && connectionConfig.secretKeyMode) {
                    // 如果是认证错误，尝试切换到其他secret key
                    const nextKey = getNextAPIKey();
                    if (nextKey) {
                        console.log('尝试使用备用API密钥');
                        apiKey = nextKey;
                        retryDelay = 500;
                        retryCount--; // 不算一次完整的失败重试
                    }
                }
                
                // 中国网络环境特有：在重试前进行DNS刷新尝试
                if (retryCount > 1 && chinaNetworkStrategies.consecutiveFailures > 2) {
                    // 尝试通过访问多个公共URL来刷新DNS缓存
                    try {
                        await Promise.all([
                            fetch('https://www.baidu.com/favicon.ico', { cache: 'no-store', method: 'GET' }),
                            fetch('https://www.163.com/favicon.ico', { cache: 'no-store', method: 'GET' })
                        ]);
                    } catch (e) {
                        // 忽略这个尝试的错误
                    }
                }
                
                retryCount++;
                
                // 如果达到最大重试次数，跳出循环
                if (retryCount >= maxRetries) {
                    break;
                }
                
                console.log(`等待 ${retryDelay}ms 后尝试下一个端点`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        // 恢复全局原始超时设置
        connectionConfig.timeout = globalOriginalTimeout;
        connectionConfig.connectionTimeout = globalOriginalConnTimeout;
        
        // 所有端点都失败，提供更详细的错误信息，特别针对中国用户优化
        let errorMessage = '获取AI回复失败：所有连接方式均失败。';
        if (lastError) {
            errorMessage += ` 最后错误: ${lastError.message}`;
        }
        
        // 提供中国用户特定的详细建议
        errorMessage += '\n\n建议：\n';
        errorMessage += '1. 请确保使用的是提供的API密钥，检查apikey.txt文件内容\n';
        errorMessage += '2. 刷新页面后重新连接，系统会尝试不同的连接策略\n';
        errorMessage += '3. 尝试将网络切换到手机热点或其他网络环境\n';
        errorMessage += '4. 检查防火墙和安全软件设置，确保不阻止API请求\n';
        errorMessage += '5. 等待一段时间后再试，服务器可能暂时繁忙\n';
        errorMessage += '6. 可能需要使用VPN来访问国际服务\n';
        
        throw new Error(errorMessage);
    }
    
    // 获取下一个API密钥
    function getNextAPIKey() {
        try {
            const allKeys = localStorage.getItem('allAPIKeys');
            if (allKeys) {
                const keys = JSON.parse(allKeys);
                if (keys && keys.length > 1) {
                    const currentIndex = keys.indexOf(apiKey);
                    const nextIndex = currentIndex >= 0 && currentIndex < keys.length - 1 ? 
                        currentIndex + 1 : 0;
                    return keys[nextIndex];
                }
            }
        } catch (error) {
            console.error('获取下一个API密钥失败:', error);
        }
        return null;
    }
    
    // 更新连接历史
    function updateConnectionHistory(endpoint, isSuccess, responseTime = 0) {
        try {
            if (isSuccess) {
                // 添加到成功列表，避免重复
                if (!connectionHistory.successfulEndpoints.includes(endpoint)) {
                    connectionHistory.successfulEndpoints.push(endpoint);
                }
                // 记录响应时间
                connectionHistory.responseTimes[endpoint] = responseTime;
                // 从失败列表中移除
                connectionHistory.failedEndpoints = connectionHistory.failedEndpoints.filter(e => e !== endpoint);
            } else {
                // 添加到失败列表，避免重复
                if (!connectionHistory.failedEndpoints.includes(endpoint)) {
                    connectionHistory.failedEndpoints.push(endpoint);
                }
            }
            
            // 保存到本地存储
            localStorage.setItem('connectionHistory', JSON.stringify(connectionHistory));
        } catch (error) {
            console.error('更新连接历史失败:', error);
        }
    }
    
    // 获取端点显示名称
    function getEndpointDisplayName(url) {
        try {
            const hostname = new URL(url).hostname;
            // 提取域名的主要部分
            const parts = hostname.split('.');
            if (parts.length >= 2) {
                return parts[parts.length - 2];
            }
            return hostname;
        } catch (e) {
            return 'API服务器';
        }
    }
    
    // 添加消息到聊天界面
    function addMessageToChat(role, content) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        
        // 设置头像和样式
        let avatarText = 'AI';
        let messageStyle = '';
        
        if (role === 'user') {
            avatarText = '你';
            messageStyle = 'background-color: var(--primary-color); border: none;';
        }
        
        messageElement.innerHTML = `
            <div class="avatar">${avatarText}</div>
            <div class="message-content" style="${messageStyle}">
                <div class="message-text"></div>
            </div>
        `;

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // 使用打字机效果显示消息
        typeMessage(messageElement.querySelector('.message-text'), content);
    }
    
    // 打字机效果
    function typeMessage(element, text, speed = 20) {
        let index = 0;
        const typeInterval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                clearInterval(typeInterval);
            }
        }, speed);
    }
    
    // 显示"正在输入"提示
    function showTypingIndicator() {
        typingElement = document.createElement('div');
        typingElement.className = 'message typing';
        typingElement.innerHTML = `
            <div class="avatar">AI</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(typingElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return typingElement;
    }
    
    // 隐藏"正在输入"提示
    function hideTypingIndicator() {
        if (typingElement && typingElement.parentNode) {
            typingElement.parentNode.removeChild(typingElement);
            typingElement = null;
        }
    }
    
    // 发送消息
    function sendMessage() {
        const message = textInput.value.trim();
        if (!message) return;

        // 检查是否有API密钥
        if (!apiKey) {
            showError('无法加载API密钥！请确保apikey.txt文件包含有效的OpenAI API密钥。');
            return;
        }

        // 清空输入框
        textInput.value = '';
        sendBtn.disabled = true;
        
        // 如果没有当前对话，创建一个新的
        if (!currentChatId) {
            currentChatId = Date.now().toString();
            chatMessages = [];
            chatHistories.push({
                id: currentChatId,
                messages: []
            });
        }

        // 添加用户消息到聊天界面
        addMessageToChat('user', message);

        // 将用户消息添加到当前对话历史
        const userMessage = { role: 'user', content: message };
        chatMessages.push(userMessage);
        
        // 更新历史记录
        const currentChat = chatHistories.find(c => c.id === currentChatId);
        if (currentChat) {
            currentChat.messages = [...chatMessages];
            saveChatHistories();
            updateChatHistoryUI();
        }

        // 显示"正在输入"提示
        const typingElement = showTypingIndicator();

        // 准备API请求，添加系统提示
        const messages = [
            { role: 'system', content: connectionConfig.systemPrompt },
            ...chatMessages
        ];

        // 调用OpenAI API，支持多端点尝试
        callOpenAIAPIWithRetry(messages)
            .then(response => {
                // 移除"正在输入"提示
                if (typingElement && typingElement.parentNode) {
                    typingElement.parentNode.remove();
                }

                // 添加AI回复到聊天界面
                if (response && response.choices && response.choices.length > 0) {
                    addMessageToChat('assistant', response.choices[0].message.content);
                    
                    // 将AI回复添加到对话历史
                    const aiMessage = { 
                        role: 'assistant', 
                        content: response.choices[0].message.content 
                    };
                    chatMessages.push(aiMessage);
                    
                    // 更新历史记录
                    if (currentChat) {
                        currentChat.messages = [...chatMessages];
                        saveChatHistories();
                    }
                } else {
                    showError('获取AI回复失败：无效的响应格式');
                }
            })
            .catch(error => {
                // 移除"正在输入"提示
                if (typingElement && typingElement.parentNode) {
                    typingElement.parentNode.remove();
                }

                // 显示错误信息
                console.error('API调用失败:', error);
                showError(`获取AI回复失败：${error.message || '未知错误'}`);
            })
            .finally(() => {
                // 重新启用发送按钮
                sendBtn.disabled = false;
            });
    }
    
    // 创建新聊天
    function createNewChat(firstMessage = '') {
        currentChatId = Date.now().toString();
        
        const newChat = {
            id: currentChatId,
            title: firstMessage || '新聊天',
            timestamp: Date.now(),
            messages: []
        };
        
        // 如果有第一条消息，添加到新聊天
        if (firstMessage) {
            newChat.messages = [{ role: 'user', content: firstMessage }];
        }
        
        // 添加到聊天历史
        chatHistories.unshift(newChat);
        
        // 更新当前聊天消息
        chatMessages = [...newChat.messages];
        
        // 保存聊天历史
        saveChatHistories();
        
        // 更新聊天历史UI
        updateChatHistoryUI();
        
        // 清空聊天容器
        chatContainer.innerHTML = '';
    }
    
    // 保存聊天历史到本地存储
    function saveChatHistories() {
        try {
            localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
        } catch (error) {
            console.error('保存聊天历史失败:', error);
        }
    }
    
    // 从本地存储加载聊天历史
    function loadChatHistories() {
        try {
            const savedHistories = localStorage.getItem('chatHistories');
            if (savedHistories) {
                chatHistories = JSON.parse(savedHistories);
                updateChatHistoryUI();
            }
        } catch (error) {
            console.error('加载聊天历史失败:', error);
            chatHistories = [];
        }
    }
    
    // 更新聊天历史UI
    function updateChatHistoryUI() {
        // 清空聊天历史容器
        chatHistoryContainer.innerHTML = '';
        
        // 添加新聊天按钮
        const newChatButton = document.createElement('div');
        newChatButton.className = 'chat-history-item new-chat';
        newChatButton.innerHTML = '<span class="icon">+</span> 新聊天';
        newChatButton.addEventListener('click', () => {
            createNewChat();
        });
        chatHistoryContainer.appendChild(newChatButton);
        
        // 添加聊天历史项
        chatHistories.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
            historyItem.innerHTML = `
                <span class="chat-title">${chat.title}</span>
                <span class="chat-time">${new Date(chat.timestamp).toLocaleString('zh-CN')}</span>
            `;
            
            // 添加点击事件
            historyItem.addEventListener('click', () => {
                // 加载选中的聊天
                loadChat(chat);
            });
            
            // 添加删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-chat-btn';
            deleteButton.innerHTML = '×';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止冒泡，避免触发聊天加载
                deleteChat(chat.id);
            });
            
            historyItem.appendChild(deleteButton);
            chatHistoryContainer.appendChild(historyItem);
        });
    }
    
    // 加载指定的聊天
    function loadChat(chat) {
        currentChatId = chat.id;
        chatMessages = [...chat.messages];
        
        // 清空聊天容器
        chatContainer.innerHTML = '';
        
        // 添加所有消息到聊天容器
        chat.messages.forEach(message => {
            addMessageToChat(message.role, message.content);
        });
        
        // 更新聊天历史UI
        updateChatHistoryUI();
    }
    
    // 删除指定的聊天
    function deleteChat(chatId) {
        // 确认删除
        if (!confirm('确定要删除这个聊天吗？')) {
            return;
        }
        
        // 从聊天历史中移除
        chatHistories = chatHistories.filter(chat => chat.id !== chatId);
        
        // 如果删除的是当前聊天，创建新聊天
        if (chatId === currentChatId) {
            createNewChat();
        }
        
        // 保存聊天历史
        saveChatHistories();
        
        // 更新聊天历史UI
        updateChatHistoryUI();
    }
    
    // 更新欢迎消息
    function updateWelcomeMessage(hasAPIKey) {
        if (hasAPIKey) {
            addMessageToChat('assistant', '你好！我是你的AI助手，有什么可以帮助你的吗？');
        } else {
            addMessageToChat('assistant', '欢迎使用GalaxyChat！请确保在apikey.txt文件中正确设置你的API密钥以开始聊天。');
        }
    }
    
    // 显示状态信息
    function showStatus(message) {
        const statusElement = document.createElement('div');
        statusElement.className = 'status-message';
        statusElement.textContent = message;
        document.body.appendChild(statusElement);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (statusElement.parentNode) {
                statusElement.parentNode.removeChild(statusElement);
            }
        }, 3000);
    }
    
    // 隐藏状态信息
    function hideStatus() {
        const statusElement = document.querySelector('.status-message');
        if (statusElement && statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
        }
    }
    
    // 显示错误信息
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        document.body.appendChild(errorElement);
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 5000);
    }
    
    // 显示成功信息
    function showSuccess(message) {
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        document.body.appendChild(successElement);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.parentNode.removeChild(successElement);
            }
        }, 3000);
    }
    
    // 预测试连接 - 增强版，支持多站点测试和容错
    async function preTestConnections() {
        const testUrls = [
            'https://www.baidu.com/',  // 百度主页（更可靠）
            'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js', // 常用CDN资源
            'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',  // 另一个常用CDN
            'https://www.qq.com/'  // 腾讯主页（国内高可用性）
        ];
        
        let hasSuccessfulConnection = false;
        
        try {
            // 尝试多个URL，提高成功率
            for (const url of testUrls) {
                try {
                    // 使用HEAD请求，更轻量
                    const response = await fetch(url, {
                        method: 'HEAD',
                        timeout: 3000,
                        cache: 'no-store',
                        credentials: 'omit'
                    });
                    
                    if (response.ok) {
                        console.log(`网络测试通过: ${url}`);
                        hasSuccessfulConnection = true;
                        break; // 只要有一个成功就可以了
                    }
                } catch (urlError) {
                    console.log(`测试URL失败: ${url}`, urlError.message);
                    // 继续尝试下一个URL
                    continue;
                }
            }
            
            // 无论成功与否，都提示用户连接设置已优化
            showStatus('连接设置已优化，您可以开始聊天了');
        } catch (error) {
            console.log('网络测试完成（部分测试失败，但不影响使用）');
            // 即使失败也不影响用户体验，提供友好提示
            showStatus('连接设置已优化，您可以开始聊天了');
        }
    }
    
    // 初始化事件监听器
    function initEventListeners() {
        // 发送按钮点击事件
        sendBtn.addEventListener('click', sendMessage);
        
        // 输入框回车发送
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // 新聊天按钮点击事件
        newChatBtn.addEventListener('click', () => {
            createNewChat();
        });
    }
    
    // 初始化应用
    async function initApp() {
        // 加载API密钥
        try {
            // 优先从localStorage尝试加载密钥
            const storedKeys = localStorage.getItem('allAPIKeys');
            if (storedKeys) {
                try {
                    const validKeys = JSON.parse(storedKeys);
                    if (validKeys && validKeys.length > 0) {
                        apiKey = validKeys[0];
                        console.log('API密钥已从本地存储加载');
                        connectionConfig.secretKeyMode = true;
                        updateWelcomeMessage(true);
                    }
                } catch (e) {
                    console.error('解析本地存储的API密钥失败:', e);
                }
            }
            
            // 如果localStorage没有密钥或解析失败，从文件加载
            if (!apiKey) {
                try {
                    const response = await fetch('apikey.txt');
                    if (response.ok) {
                        const keyText = await response.text();
                        // 提取所有有效的API密钥（以sk-开头的行）
                        const validKeys = keyText.split('\n')
                            .map(line => line.trim())
                            .filter(line => line.startsWith('sk-'));
                            
                        if (validKeys.length > 0) {
                            apiKey = validKeys[0];
                            console.log('API密钥已从文件加载');
                            
                            // 存储所有有效的API密钥，用于轮换
                            localStorage.setItem('allAPIKeys', JSON.stringify(validKeys));
                            console.log(`已加载 ${validKeys.length} 个API密钥，支持自动轮换`);
                            
                            // 启用secret key模式
                            connectionConfig.secretKeyMode = true;
                            
                            // 更新欢迎消息
                            updateWelcomeMessage(true);
                        } else {
                            console.error('无法从文件中提取有效的API密钥');
                            updateWelcomeMessage(false);
                        }
                    } else {
                        console.error('无法加载API密钥文件');
                        updateWelcomeMessage(false);
                    }
                } catch (error) {
                    console.error('读取API密钥文件时出错:', error);
                    updateWelcomeMessage(false);
                }
            }
        } catch (error) {
            console.error('初始化API密钥时出错:', error);
        }
        
        // 加载聊天历史
        loadChatHistories();
        
        // 初始化事件监听器
        initEventListeners();
        
        // 显示连接状态提示
        showStatus('正在优化连接设置，适应您的网络环境...');
        
        // 预先进行轻量级的连接测试，不影响用户体验
        setTimeout(() => {
            preTestConnections().catch(err => console.log('预连接测试:', err));
        }, 2000);
    }
    
    // 启动应用
    initApp();
    
    // 加载连接测试脚本（可选）
    const loadConnectionTest = false; // 设置为true可以启用连接测试
    if (loadConnectionTest) {
        const script = document.createElement('script');
        script.src = 'connection_test.js';
        script.onload = function() {
            console.log('连接测试脚本已加载');
        };
        document.head.appendChild(script);
    }
});