/**
 * 工具箱全局无缝切换抽屉 (Tool Switcher Drawer)
 * 纯原生 JS 模块，开箱即用，自动挂载
 */
(function () {
    // 严格环境检测：仅在 /tool/ 与 /game/ 子页面生效；首页已拥有原生全屏 Launchpad，坚决不初始化或拦截快捷键
    const currentPath = window.location.pathname.toLowerCase();
    const isToolOrGame = currentPath.includes('/tool/') || currentPath.includes('/game/');
    const isIndex = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html');
    if (!isToolOrGame || isIndex) {
        return;
    }

    // 1. 全量工具与游戏元数据
    const ALL_TOOLS = [
        // 开发者工具
        { id: 'json_tool', title: 'JSON 格式化', category: 'dev', icon: '📦', desc: '高亮校验美化与折叠层级', url: '/tool/json_tool.html', tags: ['json', 'format', 'parse', 'prettify'], gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
        { id: 'diff_tool', title: 'Diff 文本对比', category: 'dev', icon: '📋', desc: '行级/字级差异比对高亮', url: '/tool/diff_tool.html', tags: ['diff', 'compare', 'text'], gradient: 'linear-gradient(135deg, #a8b2bd 0%, #576574 100%)' },
        { id: 'base64_tool', title: 'Base64 互转', category: 'dev', icon: '🔗', desc: '字符串与文件即时编解码', url: '/tool/base64_tool.html', tags: ['base64', 'decode', 'encode'], gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
        { id: 'timestamp_tool', title: '时间戳转换', category: 'dev', icon: '🕒', desc: '实时秒表与双向时区格式化', url: '/tool/timestamp_tool.html', tags: ['timestamp', 'time', 'date', 'shijianchuo'], gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { id: 'markdown_tool', title: 'Markdown 编辑器', category: 'dev', icon: '📝', desc: '实时预览、公式图表与导出', url: '/tool/markdown_tool.html', tags: ['markdown', 'md', 'preview', 'katex'], gradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)' },
        { id: 'regex_tool', title: '正则测试器', category: 'dev', icon: '🔍', desc: '可视化捕获组测试与速查', url: '/tool/regex_tool.html', tags: ['regex', 'regexp', 'zhengze'], gradient: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)' },
        { id: 'regex_gen', title: '正则生成器', category: 'dev', icon: '🧩', desc: '引导式规则配置快速拼装', url: '/tool/regex_generator_tool.html', tags: ['regex', 'builder', 'generator'], gradient: 'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)' },
        { id: 'lang_detect', title: '智能语种检测', category: 'dev', icon: '🌐', desc: 'AI 算法辨识多国语言/代码', url: '/tool/language_detector.html', tags: ['language', 'detect', 'yuyan'], gradient: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)' },
        { id: 'opencv_beauty', title: 'OpenCV 美颜实验', category: 'dev', icon: '✨', desc: 'WebAssembly 实时磨皮与滤镜', url: '/tool/opencv_beauty.html', tags: ['opencv', 'wasm', 'filter', 'meiyan'], gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },

        // 安全与加密
        { id: 'password_gen', title: '密码与凭据工坊', category: 'security', icon: '🔐', desc: '密码/UUID/NanoID/Hex/APIKey 多模态批量生成与安全熵', url: '/tool/password_generator.html', tags: ['password', 'safe', 'mima', 'uuid', 'nanoid', 'apikey', 'hex'], gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
        { id: 'sm2_tool', title: '国密安全解密', category: 'security', icon: '🛡️', desc: '本地高性能 SM2 秘钥对解析', url: '/tool/sm2_tool.html', tags: ['sm2', 'encrypt', 'guomi', 'crypto'], gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },

        // 生活效率与图形
        { id: 'image_tool', title: '图片处理工坊', category: 'daily', icon: '🖼️', desc: '本地压缩、格式转换与 Base64', url: '/tool/image_tool.html', tags: ['image', 'compress', 'tupian', 'png', 'jpg'], gradient: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)' },
        { id: 'qrcode_tool', title: '二维码工具', category: 'daily', icon: '📷', desc: '快速生成与拖拽识别二维码', url: '/tool/qrcode_tool.html', tags: ['qrcode', 'scan', 'erweima'], gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
        { id: 'color_tool', title: '颜色转换器', category: 'daily', icon: '🎨', desc: 'HEX/RGB/HSL 多格式互转调色', url: '/tool/color_tool.html', tags: ['color', 'rgb', 'hex', 'yanse'], gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { id: 'unit_converter', title: '单位换算器', category: 'daily', icon: '📏', desc: '长度/进制/汇率/数据联动换算', url: '/tool/unit_converter.html', tags: ['unit', 'converter', 'danwei', 'huansuan'], gradient: 'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)' },
        { id: 'holiday_tool', title: '节假日计算', category: 'daily', icon: '📅', desc: '调休安排与法定节假日规划', url: '/tool/holiday_tool.html', tags: ['holiday', 'workday', 'jiejiari'], gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
        { id: 'shelf_life', title: '保质期计算', category: 'daily', icon: '⏳', desc: '临期提醒与物资周期管理', url: '/tool/shelf_life_tool.html', tags: ['shelflife', 'date', 'baozhiqi'], gradient: 'linear-gradient(135deg, #e6b980 0%, #eacda3 100%)' },

        // 休闲小游戏
        { id: 'minesweeper', title: '经典扫雷', category: 'game', icon: '💣', desc: '重温经典逻辑排雷博弈', url: '/game/minesweeper/index.html', tags: ['game', 'minesweeper', 'saolei'], gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
        { id: 'flappy_bird', title: '像素飞鸟', category: 'game', icon: '🐦', desc: '经典单机极速跳跃挑战', url: '/game/flappy_bird/index.html', tags: ['game', 'flappy', 'bird'], gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
        { id: 'running_rabbit', title: '灵动萌兔', category: 'game', icon: '🐰', desc: '快节奏跑酷与障碍躲避', url: '/game/running_rabbit/index.html', tags: ['game', 'rabbit', 'run'], gradient: 'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)' },
        { id: '3d_racing', title: '漫步公路', category: 'game', icon: '🚗', desc: '沉浸式 3D 休闲驾驶体验', url: '/game/3d_racing/index.html', tags: ['game', 'car', 'racing', '3d'], gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' }
    ];

    // 判断操作系统快捷键文案 (Mac: ⌘K, Win/Linux: Ctrl+K)
    const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
    const modKeyText = isMac ? '⌘K' : 'Ctrl+K';

    // 状态
    let isOpen = false;
    let activeCategory = 'all';
    let searchKeyword = '';
    let selectedIndex = -1;
    let filteredTools = [];

    // DOM 引用
    let maskEl = null;
    let panelEl = null;
    let searchInputEl = null;
    let clearBtnEl = null;
    let listContainerEl = null;
    let countBadgeEl = null;
    let filterTabsEl = null;

    // 2. 初始化抽屉 DOM 结构
    function initDrawerDOM() {
        if (document.getElementById('tsDrawerMask')) return;

        // 遮罩
        maskEl = document.createElement('div');
        maskEl.id = 'tsDrawerMask';
        maskEl.className = 'ts-drawer-mask';

        // 抽屉面板
        panelEl = document.createElement('div');
        panelEl.id = 'tsDrawerPanel';
        panelEl.className = 'ts-drawer-panel';

        panelEl.innerHTML = `
            <div class="ts-header">
                <div class="ts-title-group">
                    <span class="ts-title-icon">🧰</span>
                    <span class="ts-title-text">效率工具箱</span>
                    <span class="ts-count-badge" id="tsCountBadge">${ALL_TOOLS.length}</span>
                </div>
                <div class="ts-header-actions">
                    <span class="ts-shortcut-hint">${modKeyText} 唤起</span>
                    <button class="ts-close-btn" id="tsCloseBtn" title="关闭 (Esc)">✕</button>
                </div>
            </div>

            <div class="ts-search-wrapper">
                <div class="ts-search-bar">
                    <span class="ts-search-icon">🔍</span>
                    <input type="text" class="ts-search-input" id="tsSearchInput" placeholder="输入工具名、关键词、拼音检索..." autocomplete="off" />
                    <button class="ts-search-clear" id="tsSearchClear" title="清空">✕</button>
                </div>

                <div class="ts-filter-tabs" id="tsFilterTabs">
                    <button class="ts-tab-btn ts-active" data-cat="all">全部 (${ALL_TOOLS.length})</button>
                    <button class="ts-tab-btn" data-cat="dev">💻 开发者</button>
                    <button class="ts-tab-btn" data-cat="daily">🏡 生活效率</button>
                    <button class="ts-tab-btn" data-cat="security">🔐 安全加密</button>
                    <button class="ts-tab-btn" data-cat="game">🎮 休闲游戏</button>
                </div>
            </div>

            <div class="ts-list-container" id="tsListContainer"></div>

            <div class="ts-footer">
                <span>按 <kbd>↑</kbd> <kbd>↓</kbd> 切换，<kbd>Enter</kbd> 直达</span>
                <span>按 <kbd>Esc</kbd> 退出</span>
            </div>
        `;

        document.body.appendChild(maskEl);
        document.body.appendChild(panelEl);

        // 绑定元素引用
        searchInputEl = panelEl.querySelector('#tsSearchInput');
        clearBtnEl = panelEl.querySelector('#tsSearchClear');
        listContainerEl = panelEl.querySelector('#tsListContainer');
        countBadgeEl = panelEl.querySelector('#tsCountBadge');
        filterTabsEl = panelEl.querySelector('#tsFilterTabs');

        // 事件监听
        maskEl.addEventListener('click', closeDrawer);
        panelEl.querySelector('#tsCloseBtn').addEventListener('click', closeDrawer);

        // 搜索输入
        searchInputEl.addEventListener('input', (e) => {
            searchKeyword = e.target.value.trim().toLowerCase();
            clearBtnEl.classList.toggle('ts-visible', Boolean(searchKeyword));
            selectedIndex = -1;
            renderToolList();
        });

        clearBtnEl.addEventListener('click', () => {
            searchInputEl.value = '';
            searchKeyword = '';
            clearBtnEl.classList.remove('ts-visible');
            selectedIndex = -1;
            renderToolList();
            searchInputEl.focus();
        });

        // 分类切换
        filterTabsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.ts-tab-btn');
            if (!btn) return;
            filterTabsEl.querySelectorAll('.ts-tab-btn').forEach(b => b.classList.remove('ts-active'));
            btn.classList.add('ts-active');
            activeCategory = btn.dataset.cat;
            selectedIndex = -1;
            renderToolList();
        });

        // 键盘导航
        document.addEventListener('keydown', handleGlobalKeydown);
    }

    // 3. 过滤并渲染工具列表
    function renderToolList() {
        filteredTools = ALL_TOOLS.filter(tool => {
            // 分类匹配
            if (activeCategory !== 'all' && tool.category !== activeCategory) {
                return false;
            }
            // 关键词匹配 (搜索标题、描述、标签、URL)
            if (searchKeyword) {
                const titleMatch = tool.title.toLowerCase().includes(searchKeyword);
                const descMatch = tool.desc.toLowerCase().includes(searchKeyword);
                const tagsMatch = tool.tags.some(t => t.toLowerCase().includes(searchKeyword));
                return titleMatch || descMatch || tagsMatch;
            }
            return true;
        });

        // 更新计数
        if (countBadgeEl) {
            countBadgeEl.textContent = filteredTools.length;
        }

        if (filteredTools.length === 0) {
            listContainerEl.innerHTML = `
                <div class="ts-empty-state">
                    <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
                    <div>未找到匹配的工具</div>
                    <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">尝试更换关键词或切换分类</div>
                </div>
            `;
            return;
        }

        // 拼接 HTML
        let html = '';
        filteredTools.forEach((tool, index) => {
            const isCurrent = currentPath.endsWith(tool.url.toLowerCase());
            const isSelected = index === selectedIndex;
            const itemClasses = [
                'ts-tool-item',
                isCurrent ? 'ts-current' : '',
                isSelected ? 'ts-keyboard-active' : ''
            ].filter(Boolean).join(' ');

            html += `
                <div class="${itemClasses}" data-index="${index}" data-url="${tool.url}">
                    <div class="ts-icon-box" style="background: ${tool.gradient};">
                        <span>${tool.icon}</span>
                    </div>
                    <div class="ts-tool-info">
                        <div class="ts-tool-row-top">
                            <span class="ts-tool-name">${tool.title}</span>
                            ${isCurrent ? '<span class="ts-badge-current">当前工具</span>' : ''}
                        </div>
                        <div class="ts-tool-desc">${tool.desc}</div>
                    </div>
                    <div class="ts-arrow-icon">${isCurrent ? '●' : '➔'}</div>
                </div>
            `;
        });

        listContainerEl.innerHTML = html;

        // 绑定点击跳转
        listContainerEl.querySelectorAll('.ts-tool-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const url = item.dataset.url;
                if (!url) return;
                const isCurrent = currentPath.endsWith(url.toLowerCase());
                if (isCurrent) {
                    closeDrawer();
                    return;
                }
                // 支持按住 Ctrl/Cmd 在新标签页打开
                if (e.ctrlKey || e.metaKey) {
                    window.open(url, '_blank');
                } else {
                    window.location.href = url;
                }
            });
        });
    }

    // 4. 打开 / 关闭逻辑
    function openDrawer() {
        if (isOpen) return;
        initDrawerDOM();
        isOpen = true;
        maskEl.classList.add('ts-open');
        panelEl.classList.add('ts-open');
        document.body.style.overflow = 'hidden';

        selectedIndex = -1;
        renderToolList();

        // 聚焦输入框
        setTimeout(() => {
            if (searchInputEl) {
                searchInputEl.focus();
                searchInputEl.select();
            }
        }, 150);
    }

    function closeDrawer() {
        if (!isOpen) return;
        isOpen = false;
        if (maskEl) maskEl.classList.remove('ts-open');
        if (panelEl) panelEl.classList.remove('ts-open');
        document.body.style.overflow = '';
    }

    function toggleDrawer() {
        if (isOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    // 5. 键盘事件监听
    function handleGlobalKeydown(e) {
        // 全局快捷键 Ctrl+K / Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            e.stopPropagation();
            toggleDrawer();
            return;
        }

        // 抽屉打开时的键盘逻辑
        if (!isOpen) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeDrawer();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredTools.length > 0) {
                selectedIndex = (selectedIndex + 1) % filteredTools.length;
                updateKeyboardActive();
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredTools.length > 0) {
                selectedIndex = (selectedIndex - 1 + filteredTools.length) % filteredTools.length;
                updateKeyboardActive();
            }
            return;
        }

        if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < filteredTools.length) {
                e.preventDefault();
                const targetTool = filteredTools[selectedIndex];
                if (targetTool) {
                    if (currentPath.endsWith(targetTool.url.toLowerCase())) {
                        closeDrawer();
                    } else {
                        window.location.href = targetTool.url;
                    }
                }
            }
        }
    }

    // 更新键盘选中的视觉焦点与滚动位置
    function updateKeyboardActive() {
        const items = listContainerEl.querySelectorAll('.ts-tool-item');
        items.forEach((el, idx) => {
            if (idx === selectedIndex) {
                el.classList.add('ts-keyboard-active');
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                el.classList.remove('ts-keyboard-active');
            }
        });
    }

    // 6. 智能挂载切换按钮到当前页面与新手引导气泡
    function mountTriggerButton() {
        // 如果当前是首页 (/)，首页自身已经有全屏 Launchpad，仅挂载全局快捷键
        if (currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('cf-page-test/')) {
            return;
        }

        const hasSeenHint = localStorage.getItem('ts_switcher_hint_seen') === 'true';

        // 检查页面是否有顶部导航栏 (兼容 .top-navbar, .navbar, .workbench-header)
        const navbar = document.querySelector('.top-navbar') || document.querySelector('.navbar') || document.querySelector('.workbench-header');
        if (navbar) {
            // 优先挂载在 .nav-right 或 .header-right 或 .header-actions，其次在 navbar 末尾
            const targetContainer = navbar.querySelector('.nav-right') || navbar.querySelector('.header-right') || navbar.querySelector('.header-actions') || navbar;
            
            // 避免重复添加
            if (!document.getElementById('tsNavTriggerWrapper')) {
                const wrapper = document.createElement('div');
                wrapper.id = 'tsNavTriggerWrapper';
                wrapper.className = 'ts-nav-trigger-wrapper';

                const triggerBtn = document.createElement('button');
                triggerBtn.id = 'tsNavTrigger';
                triggerBtn.className = 'ts-nav-trigger-btn';
                triggerBtn.type = 'button';
                triggerBtn.innerHTML = `
                    <span>🧰</span>
                    <span>工具箱</span>
                    <kbd>${modKeyText}</kbd>
                    ${!hasSeenHint ? '<span class="ts-pulse-dot" id="tsPulseDot"></span>' : ''}
                `;
                triggerBtn.title = `打开工具箱快捷切换抽屉 (${modKeyText})`;
                triggerBtn.addEventListener('click', () => {
                    dismissHint();
                    openDrawer();
                });

                wrapper.appendChild(triggerBtn);

                // 首次进入轻量气泡引导
                if (!hasSeenHint) {
                    setTimeout(() => {
                        showOnboardingBubble(wrapper);
                    }, 500);
                }

                // 挂载到右侧最左边或指定位置
                if (targetContainer.firstChild) {
                    targetContainer.insertBefore(wrapper, targetContainer.firstChild);
                } else {
                    targetContainer.appendChild(wrapper);
                }
            }
        } else {
            // 无顶部导航栏的传统页面，挂载右下角胶囊悬浮按钮
            if (!document.getElementById('tsFloatTrigger')) {
                const floatBtn = document.createElement('div');
                floatBtn.id = 'tsFloatTrigger';
                floatBtn.className = 'ts-floating-trigger';
                floatBtn.innerHTML = `
                    <span>🧰 工具箱</span>
                    <kbd>${modKeyText}</kbd>
                    ${!hasSeenHint ? '<span class="ts-pulse-dot" id="tsPulseDot"></span>' : ''}
                `;
                floatBtn.title = `打开效率工具箱 (${modKeyText})`;
                floatBtn.addEventListener('click', () => {
                    dismissHint();
                    openDrawer();
                });
                document.body.appendChild(floatBtn);

                if (!hasSeenHint) {
                    setTimeout(() => {
                        showOnboardingBubble(floatBtn, true);
                    }, 500);
                }
            }
        }
    }

    // 弹出新功能指引气泡
    function showOnboardingBubble(parentEl, isFloating = false) {
        if (document.getElementById('tsTipBubble')) return;
        if (localStorage.getItem('ts_switcher_hint_seen') === 'true') return;

        const bubble = document.createElement('div');
        bubble.id = 'tsTipBubble';
        bubble.className = 'ts-tip-bubble';
        if (isFloating) {
            bubble.style.top = 'auto';
            bubble.style.bottom = 'calc(100% + 12px)';
        }

        bubble.innerHTML = `
            <div class="ts-tip-bubble-header">
                <span>💡 快捷切换已就绪</span>
            </div>
            <div class="ts-tip-bubble-body">
                无需返回主页，按 <kbd>${modKeyText}</kbd> 或点击按钮，即可在 21 款工具与游戏中自由秒切！
            </div>
            <div class="ts-tip-bubble-actions">
                <button class="ts-tip-btn-dismiss" id="tsBubbleDismiss">知道了</button>
                <button class="ts-tip-btn-action" id="tsBubbleTry">立即体验</button>
            </div>
        `;

        parentEl.appendChild(bubble);

        bubble.querySelector('#tsBubbleDismiss').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissHint();
        });

        bubble.querySelector('#tsBubbleTry').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissHint();
            openDrawer();
        });

        // 8 秒无操作自动优雅淡出
        setTimeout(() => {
            dismissHint();
        }, 8000);
    }

    // 移除引导气泡与呼吸红点
    function dismissHint() {
        localStorage.setItem('ts_switcher_hint_seen', 'true');
        const bubble = document.getElementById('tsTipBubble');
        if (bubble) {
            bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(-6px)';
            setTimeout(() => bubble.remove(), 300);
        }
        const dot = document.getElementById('tsPulseDot');
        if (dot) dot.remove();
    }

    // 7. 页面启动与自动挂载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initDrawerDOM();
            mountTriggerButton();
        });
    } else {
        initDrawerDOM();
        mountTriggerButton();
    }

    // 8. 暴露全局 API
    window.ToolSwitcher = {
        open: openDrawer,
        close: closeDrawer,
        toggle: toggleDrawer,
        getTools: () => [...ALL_TOOLS]
    };
})();
