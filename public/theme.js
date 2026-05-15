/**
 * 主题管理脚本 - 负责跨页面的主题初始化与同步
 */
(function() {
    // 1. 立即初始化主题（防止闪烁）
    const applyTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    };
    applyTheme();

    // 2. 监听存储变化（可选：如果用户在主页切换，工具页若开着也会同步）
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            applyTheme();
            // 如果页面上有更新图标的逻辑，可以在这里派发一个自定义事件
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: e.newValue }));
        }
    });

    // 3. 页面加载后的逻辑
    document.addEventListener('DOMContentLoaded', () => {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const sunIcon = themeToggle.querySelector('.sun-icon');
            const moonIcon = themeToggle.querySelector('.moon-icon');

            const updateIcons = (theme) => {
                if (sunIcon && moonIcon) {
                    sunIcon.style.display = theme === 'dark' ? 'none' : 'block';
                    moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
                }
            };

            // 初始化图标
            updateIcons(document.documentElement.getAttribute('data-theme'));

            // 绑定点击事件
            themeToggle.addEventListener('click', () => {
                const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateIcons(newTheme);
            });
            
            // 监听跨页面的主题变化以同步图标
            window.addEventListener('theme-changed', (e) => {
                updateIcons(e.detail);
            });
        }
    });
})();
