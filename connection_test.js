// 连接测试脚本 - 用于验证GalaxyChatbot的连接功能
console.log('=== GalaxyChatbot 连接测试 ===');

// 模拟API调用函数
async function simulateAPIConnection() {
    try {
        console.log('1. 检查是否能访问基础网络资源...');
        // 测试基础网络连接
        const baiduResponse = await fetch('https://www.baidu.com/favicon.ico', {
            method: 'GET',
            cache: 'no-store',
            timeout: 5000
        });
        if (baiduResponse.ok) {
            console.log('✅ 基础网络连接正常');
        } else {
            console.warn('⚠️ 基础网络连接可能有限制');
        }
    } catch (error) {
        console.error('❌ 基础网络连接失败:', error.message);
    }

    try {
        console.log('\n2. 尝试访问国内API端点...');
        // 测试国内API端点连接性
        const cnEndpointResponse = await Promise.race([
            fetch('https://api.chatanywhere.com.cn/v1', {
                method: 'HEAD',
                cache: 'no-store',
                timeout: 8000
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 8000))
        ]);
        console.log('✅ 国内API端点可达');
    } catch (error) {
        console.error('❌ 国内API端点访问失败:', error.message);
        console.log('   可能需要添加更多国内端点到配置中');
    }

    try {
        console.log('\n3. 检查localStorage是否可用...');
        // 测试localStorage功能
        const testKey = 'galaxy_test_key';
        localStorage.setItem(testKey, 'test_value');
        const testValue = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        if (testValue === 'test_value') {
            console.log('✅ localStorage功能正常，可用于保存连接历史和API密钥');
        } else {
            console.error('❌ localStorage功能异常');
        }
    } catch (error) {
        console.error('❌ localStorage访问失败:', error.message);
    }

    console.log('\n4. 检查是否存在apikey.txt文件...');
    try {
        const keyResponse = await fetch('apikey.txt', { method: 'HEAD', timeout: 3000 });
        if (keyResponse.ok) {
            console.log('✅ apikey.txt文件存在');
        } else {
            console.error('❌ apikey.txt文件不存在或无法访问');
        }
    } catch (error) {
        console.error('❌ 无法检查apikey.txt文件:', error.message);
    }

    console.log('\n5. 连接优化建议:');
    console.log('   - 确保使用稳定的网络连接');
    console.log('   - 如果有多个API密钥，可以将它们都放在apikey.txt文件中，每行一个');
    console.log('   - 系统会自动记录最佳连接端点并优先使用');
    console.log('   - 国内用户无需VPN即可使用');
    console.log('   - 如遇连接问题，请刷新页面重试');
    console.log('\n=== 测试完成 ===');
}

// 运行测试
if (typeof window !== 'undefined') {
    // 在浏览器环境中运行
    window.addEventListener('load', simulateAPIConnection);
} else {
    // 如果在Node.js环境中运行（虽然不太可能）
    console.log('此脚本设计为在浏览器环境中运行');
}