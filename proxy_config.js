// 代理配置管理模块
const proxyConfig = {
    // 默认配置
    defaultConfig: {
        useProxy: false,
        proxyUrl: '',
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant.'
    },

    // 获取当前配置（从localStorage加载）
    getConfig: function() {
        try {
            const savedConfig = localStorage.getItem('proxyConfig');
            if (savedConfig) {
                return { ...this.defaultConfig, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.error('加载代理配置失败:', error);
        }
        return { ...this.defaultConfig };
    },

    // 保存配置到localStorage
    saveConfig: function(config) {
        try {
            localStorage.setItem('proxyConfig', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('保存代理配置失败:', error);
            return false;
        }
    },

    // 重置配置到默认值
    resetConfig: function() {
        try {
            localStorage.removeItem('proxyConfig');
            return true;
        } catch (error) {
            console.error('重置代理配置失败:', error);
            return false;
        }
    },

    // 验证配置是否有效
    validateConfig: function(config) {
        if (!config) return false;
        
        // 验证必填字段
        if (typeof config.useProxy !== 'boolean') return false;
        
        // 如果使用代理，验证代理URL
        if (config.useProxy) {
            if (!config.proxyUrl || typeof config.proxyUrl !== 'string') {
                return false;
            }
            // 简单验证URL格式
            try {
                new URL(config.proxyUrl);
            } catch (error) {
                return false;
            }
        }
        
        // 验证模型参数
        if (typeof config.model !== 'string' || !config.model) return false;
        
        // 验证数字参数
        if (typeof config.maxTokens !== 'number' || config.maxTokens <= 0) return false;
        if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) return false;
        
        // 验证系统提示
        if (typeof config.systemPrompt !== 'string') return false;
        
        return true;
    },

    // 合并配置（用于更新部分配置）
    mergeConfig: function(partialConfig) {
        const currentConfig = this.getConfig();
        const newConfig = { ...currentConfig, ...partialConfig };
        
        if (this.validateConfig(newConfig)) {
            this.saveConfig(newConfig);
            return newConfig;
        }
        return currentConfig;
    }
};

// 提供临时覆盖配置的功能（不保存到localStorage）\let tempConfigOverride = null;

function getCurrentProxyConfig() {
    if (tempConfigOverride) {
        return { ...proxyConfig.getConfig(), ...tempConfigOverride };
    }
    return proxyConfig.getConfig();
}

function setTempConfigOverride(override) {
    tempConfigOverride = override;
}

function clearTempConfigOverride() {
    tempConfigOverride = null;
}

// 适配不同环境的导出方式
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        proxyConfig,
        getCurrentProxyConfig,
        setTempConfigOverride,
        clearTempConfigOverride
    };
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.proxyConfigManager = {
        proxyConfig,
        getCurrentProxyConfig,
        setTempConfigOverride,
        clearTempConfigOverride
    };
}