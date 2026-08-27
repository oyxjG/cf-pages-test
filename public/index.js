// 个人聚合面板 (Digital Garden & Productivity Hub) 核心交互逻辑
(function () {
    // 1. 全局工具元数据 (供 Launchpad 使用，包含 mobile 手机端友好度标识与精致图标渐变)
    const TOOLS = [
        { id: 'holiday_tool', title: '节假日计算', category: 'daily', icon: '📅', desc: '调休安排与假期规划助手', url: '/tool/holiday_tool.html', tags: ['holiday', 'workday'], gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', mobile: true },
        { id: 'timestamp_tool', title: '时间戳转换', category: 'dev', icon: '🕒', desc: '实时展示与双向格式化', url: '/tool/timestamp_tool.html', tags: ['timestamp', 'time'], gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', mobile: false },
        { id: 'password_gen', title: '高强度密码', category: 'security', icon: '🔐', desc: '自定义规则防破解生成', url: '/tool/password_generator.html', tags: ['password', 'safe'], gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', mobile: true },
        { id: 'qrcode_tool', title: '二维码工具', category: 'daily', icon: '📷', desc: '快速编码生成与拖拽识别', url: '/tool/qrcode_tool.html', tags: ['qrcode', 'scan'], gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', mobile: true },
        { id: 'base64_tool', title: 'Base64处理', category: 'dev', icon: '🔗', desc: '字符串即时编解码转换', url: '/tool/base64_tool.html', tags: ['base64'], gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', mobile: false },
        { id: 'json_tool', title: 'JSON格式化', category: 'dev', icon: '📦', desc: '高亮校验美化与折叠层级', url: '/tool/json_tool.html', tags: ['json', 'format'], gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', mobile: false },
        { id: 'diff_tool', title: 'Diff文本对比', category: 'dev', icon: '📋', desc: '行级/字级差异比对高亮', url: '/tool/diff_tool.html', tags: ['diff', 'compare'], gradient: 'linear-gradient(135deg, #a8b2bd 0%, #576574 100%)', mobile: false },
        { id: 'markdown_tool', title: 'Markdown编辑', category: 'dev', icon: '📝', desc: '实时预览、公式图表与导出', url: '/tool/markdown_tool.html', tags: ['markdown', 'pdf'], gradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)', mobile: false },
        { id: 'regex_tool', title: '正则测试器', category: 'dev', icon: '🔍', desc: '可视化捕获组测试与速查', url: '/tool/regex_tool.html', tags: ['regex', 'zhengze'], gradient: 'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)', mobile: false },
        { id: 'regex_gen', title: '正则生成器', category: 'dev', icon: '🧩', desc: '引导式规则配置快速拼装', url: '/tool/regex_generator_tool.html', tags: ['regex', 'builder'], gradient: 'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)', mobile: false },
        { id: 'lang_detect', title: '智能语种检测', category: 'dev', icon: '🌐', desc: 'AI 算法辨识多国语言/代码', url: '/tool/language_detector.html', tags: ['language', 'detect'], gradient: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)', mobile: true },
        { id: 'color_tool', title: '颜色转换器', category: 'daily', icon: '🎨', desc: 'HEX/RGB多格式互转调色', url: '/tool/color_tool.html', tags: ['color', 'rgb'], gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', mobile: true },
        { id: 'sm2_tool', title: '国密安全解密', category: 'security', icon: '🛡️', desc: '本地高性能SM2秘钥对解析', url: '/tool/sm2_tool.html', tags: ['sm2', 'encrypt'], gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)', mobile: false },
        { id: 'shelf_life', title: '保质期计算', category: 'daily', icon: '⏳', desc: '临期提醒与库存管理助手', url: '/tool/shelf_life_tool.html', tags: ['shelflife', 'date'], gradient: 'linear-gradient(135deg, #e6b980 0%, #eacda3 100%)', mobile: true },
        { id: 'unit_converter', title: '单位换算器', category: 'daily', icon: '📏', desc: '长度、面积、进制、汇率及数据联动换算', url: '/tool/unit_converter.html', tags: ['unit', 'converter'], gradient: 'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)', mobile: true },
        { id: 'opencv_beauty', title: 'OpenCV美颜', category: 'dev', icon: '✨', desc: 'WebAssembly 实时视频滤镜与磨皮', url: '/tool/opencv_beauty.html', tags: ['opencv', 'wasm', 'meiyan'], gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', mobile: false },
        { id: 'image_tool', title: '图片处理工坊', category: 'daily', icon: '🖼️', desc: '本地安全处理，保障隐私安全，支持图片压缩、格式转换与 Base64', url: '/tool/image_tool.html', tags: ['image', 'compress'], gradient: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)', mobile: false }
    ];

    // 2. 状态与用户信息
    let currentUser = null;
    let userToken = localStorage.getItem('token');
    try {
        const stored = localStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {}

    // ==========================================================================
    // 3. 用户 Profile 与状态管理
    // ==========================================================================
    function initProfile() {
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const profileAuthRow = document.getElementById('profileAuthRow');
        const sidebarAdminLink = document.getElementById('sidebarAdminLink');

        if (currentUser && userToken) {
            const initial = (currentUser.nick_name || currentUser.username || 'U').charAt(0).toUpperCase();
            if (userAvatar) userAvatar.textContent = initial;
            if (userName) userName.textContent = currentUser.nick_name || currentUser.username;

            if (profileAuthRow) {
                profileAuthRow.innerHTML = `
                    <span>已登录 (${currentUser.username})</span>
                    <button id="logoutBtn" style="color: #e74c3c; cursor: pointer;">退出</button>
                `;
                document.getElementById('logoutBtn')?.addEventListener('click', () => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                });
            }

            if (currentUser.role === 'admin' && sidebarAdminLink) {
                sidebarAdminLink.style.display = 'flex';
            }
        } else {
            if (profileAuthRow) {
                profileAuthRow.innerHTML = `
                    <a href="/login.html">登录工作台</a>
                    <a href="/register.html">注册通行证</a>
                `;
            }
        }
    }

    // ==========================================================================
    // 4. 实时时钟与时段问候
    // ==========================================================================
    function initClock() {
        const clockDisplay = document.getElementById('main-clock');
        const clockStatus = document.getElementById('clock-status');

        function update() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            if (clockDisplay) clockDisplay.textContent = `${hours}:${minutes}`;

            if (clockStatus) {
                const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                const dayName = days[now.getDay()];
                const solarDateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${dayName}`;

                let dateStr = solarDateStr;
                if (typeof Lunar !== 'undefined') {
                    const lunar = Lunar.fromDate(now);
                    const lunarStr = `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
                    dateStr += ` · ${lunarStr}`;
                }
                clockStatus.textContent = dateStr;
            }
        }

        update();
        setInterval(update, 1000);
    }

    // ==========================================================================
    // 5. 随手速记便签 (Quick Scratchpad / Memo) 与 历史归档库
    // ==========================================================================
    function initQuickMemo() {
        const memoInput = document.getElementById('memoInput');
        const memoCount = document.getElementById('memoCount');
        const memoSyncBadge = document.getElementById('memoSyncBadge');
        const memoCopyBtn = document.getElementById('memoCopyBtn');
        const memoClearBtn = document.getElementById('memoClearBtn');
        const memoSaveBtn = document.getElementById('memoSaveBtn');
        const memoHistoryBtn = document.getElementById('memoHistoryBtn');

        const memoHistoryOverlay = document.getElementById('memoHistoryOverlay');
        const memoHistoryCloseBtn = document.getElementById('memoHistoryCloseBtn');
        const memoHistoryList = document.getElementById('memoHistoryList');
        const memoHistoryCount = document.getElementById('memoHistoryCount');

        if (!memoInput) return;

        // 1. 读取当前草稿
        const savedMemo = localStorage.getItem('quick_memo') || '';
        memoInput.value = savedMemo;
        updateMemoCount();

        let saveTimeout = null;

        function updateMemoCount() {
            if (memoCount) memoCount.textContent = `${memoInput.value.length} 字符`;
        }

        function triggerSave() {
            if (memoSyncBadge) {
                memoSyncBadge.textContent = '保存中...';
                memoSyncBadge.style.color = 'var(--accent)';
            }
            updateMemoCount();

            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                const val = memoInput.value;
                localStorage.setItem('quick_memo', val);

                // 如果用户已登录，同步草稿至 user_preferences
                if (userToken) {
                    try {
                        await fetch('/api/user/preferences', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${userToken}`
                            },
                            body: JSON.stringify({
                                customSettings: { quickMemo: val }
                            })
                        });
                    } catch (e) {}
                }

                if (memoSyncBadge) {
                    memoSyncBadge.textContent = '已保存';
                    memoSyncBadge.style.color = 'var(--teal, #2d786c)';
                }
            }, 400);
        }

        memoInput.addEventListener('input', triggerSave);

        // 2. 复制当前草稿
        memoCopyBtn?.addEventListener('click', () => {
            if (!memoInput.value.trim()) {
                alert('便签内容为空');
                return;
            }
            navigator.clipboard.writeText(memoInput.value).then(() => {
                if (memoSyncBadge) {
                    memoSyncBadge.textContent = '已复制 ✨';
                    setTimeout(() => {
                        memoSyncBadge.textContent = '已保存';
                    }, 1500);
                }
            });
        });

        // 3. 清空当前草稿
        memoClearBtn?.addEventListener('click', () => {
            if (!memoInput.value.trim()) return;
            if (confirm('确定要清空当前草稿吗？（建议先点击 💾 归档保存）')) {
                memoInput.value = '';
                triggerSave();
            }
        });

        // 4. 归档存入历史便签库
        memoSaveBtn?.addEventListener('click', async () => {
            const text = memoInput.value.trim();
            if (!text) {
                alert('请先输入要归档的便签内容');
                return;
            }

            const history = JSON.parse(localStorage.getItem('memo_history') || '[]');
            const newRecord = {
                id: Date.now(),
                content: text,
                createdAt: new Date().toLocaleString()
            };
            history.unshift(newRecord);
            localStorage.setItem('memo_history', JSON.stringify(history));

            // 如果已登录，存入 D1 snippets 表
            if (userToken) {
                try {
                    const firstLine = text.split('\n')[0].slice(0, 30);
                    await fetch('/api/snippets', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        },
                        body: JSON.stringify({
                            title: `便签: ${firstLine}`,
                            content: text,
                            lang: 'plaintext'
                        })
                    });
                } catch (e) {}
            }

            if (memoSyncBadge) {
                memoSyncBadge.textContent = '已归档 📥';
                setTimeout(() => {
                    memoSyncBadge.textContent = '已保存';
                }, 1500);
            }
            alert('已成功归档到历史便签库！可点击 📚 查看全部历史。');
        });

        // 5. 历史便签库弹窗逻辑
        function openHistoryModal() {
            if (!memoHistoryOverlay) return;
            renderHistoryList();
            memoHistoryOverlay.classList.add('open');
        }

        function closeHistoryModal() {
            if (!memoHistoryOverlay) return;
            memoHistoryOverlay.classList.remove('open');
        }

        async function renderHistoryList() {
            if (!memoHistoryList) return;
            memoHistoryList.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--muted); font-size:0.85rem;">加载中...</div>';

            let items = JSON.parse(localStorage.getItem('memo_history') || '[]');

            // 若用户登录，尝试合并云端 snippets
            if (userToken) {
                try {
                    const res = await fetch('/api/snippets', {
                        headers: { 'Authorization': `Bearer ${userToken}` }
                    });
                    const data = await res.json();
                    if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
                        const cloudItems = data.data.map(item => ({
                            id: item.id,
                            content: item.content,
                            createdAt: item.createdAt || new Date().toLocaleString(),
                            isCloud: true
                        }));
                        items = cloudItems;
                    }
                } catch (e) {}
            }

            if (memoHistoryCount) memoHistoryCount.textContent = items.length;

            if (items.length === 0) {
                memoHistoryList.innerHTML = `
                    <div style="text-align:center; padding:2rem 1rem; color:var(--muted); font-size:0.88rem;">
                        暂无历史归档便签 ☕<br>
                        在左侧速记台输入内容后，点击 💾 按钮即可一键归档保存。
                    </div>
                `;
                return;
            }

            memoHistoryList.innerHTML = '';
            items.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'memo-history-item';
                card.innerHTML = `
                    <div class="memo-history-text">${escapeHtml(item.content)}</div>
                    <div class="memo-history-foot">
                        <span>🕒 ${escapeHtml(String(item.createdAt || ''))}</span>
                        <div class="memo-history-actions">
                            <button class="memo-h-btn copy-btn" title="复制全文">📋 复制</button>
                            <button class="memo-h-btn restore-btn" title="填入当前速记台">↩️ 恢复到草稿</button>
                            <button class="memo-h-btn del del-btn" title="删除记录">🗑️ 删除</button>
                        </div>
                    </div>
                `;

                // 复制
                card.querySelector('.copy-btn').addEventListener('click', () => {
                    navigator.clipboard.writeText(item.content).then(() => alert('便签内容已复制 ✨'));
                });

                // 恢复到草稿
                card.querySelector('.restore-btn').addEventListener('click', () => {
                    memoInput.value = item.content;
                    triggerSave();
                    closeHistoryModal();
                    memoInput.focus();
                });

                // 删除
                card.querySelector('.del-btn').addEventListener('click', async () => {
                    if (!confirm('确定要删除这条便签记录吗？')) return;
                    if (item.isCloud && userToken) {
                        try {
                            await fetch(`/api/snippets?id=${item.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${userToken}` }
                            });
                        } catch (e) {}
                    }
                    const localHistory = JSON.parse(localStorage.getItem('memo_history') || '[]');
                    const filtered = localHistory.filter((_, i) => i !== index);
                    localStorage.setItem('memo_history', JSON.stringify(filtered));
                    renderHistoryList();
                });

                memoHistoryList.appendChild(card);
            });
        }

        memoHistoryBtn?.addEventListener('click', openHistoryModal);
        memoHistoryCloseBtn?.addEventListener('click', closeHistoryModal);
        memoHistoryOverlay?.addEventListener('click', (e) => {
            if (e.target === memoHistoryOverlay) closeHistoryModal();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && memoHistoryOverlay?.classList.contains('open')) {
                closeHistoryModal();
            }
        });
    }

    // ==========================================================================
    // 6. 时间脉搏与节假日倒计时 (精准基于 HolidayUtil 法定调休算法)
    // ==========================================================================
    function initTimePulse() {
        const monthElem = document.getElementById('remaining-workdays-month');
        const monthProgress = document.getElementById('month-progress');
        const yearElem = document.getElementById('remaining-workdays-year');
        const yearProgress = document.getElementById('year-progress');
        const holidayElem = document.getElementById('hero-next-holiday');
        const holidayNameElem = document.getElementById('hero-next-holiday-name');
        const holidayProgress = document.getElementById('holiday-progress');

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();

        // 1. 获取本月剩余工作日
        let remainingWorkdaysMonth = 0;
        let totalMonthWorkdays = 0;
        let passedMonthWorkdays = 0;
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            let isWork = false;
            if (typeof HolidayUtil !== 'undefined') {
                const holiday = HolidayUtil.getHoliday(year, month, d);
                if (holiday) {
                    isWork = holiday.isWork();
                } else if (typeof Solar !== 'undefined') {
                    const solar = Solar.fromYmd(year, month, d);
                    const weekDay = solar.getWeek();
                    isWork = (weekDay !== 0 && weekDay !== 6);
                }
            } else {
                const w = new Date(year, month - 1, d).getDay();
                isWork = (w !== 0 && w !== 6);
            }

            if (isWork) {
                totalMonthWorkdays++;
                if (d < day) {
                    passedMonthWorkdays++;
                } else {
                    remainingWorkdaysMonth++;
                }
            }
        }

        if (monthElem) monthElem.textContent = `${remainingWorkdaysMonth} 天`;
        if (monthProgress) {
            const mPct = totalMonthWorkdays > 0 ? Math.round((passedMonthWorkdays / totalMonthWorkdays) * 100) : 0;
            monthProgress.style.width = `${mPct}%`;
        }

        // 2. 获取本年剩余工作日 (考虑法定节假日及调休)
        let remainingWorkdaysYear = remainingWorkdaysMonth;
        let passedYearWorkdays = passedMonthWorkdays;

        // 累加本年前序月份的工作日
        for (let m = 1; m < month; m++) {
            const daysInM = new Date(year, m, 0).getDate();
            for (let d = 1; d <= daysInM; d++) {
                let isWork = false;
                if (typeof HolidayUtil !== 'undefined') {
                    const holiday = HolidayUtil.getHoliday(year, m, d);
                    if (holiday) isWork = holiday.isWork();
                    else if (typeof Solar !== 'undefined') {
                        const weekDay = Solar.fromYmd(year, m, d).getWeek();
                        isWork = (weekDay !== 0 && weekDay !== 6);
                    }
                } else {
                    const w = new Date(year, m - 1, d).getDay();
                    isWork = (w !== 0 && w !== 6);
                }
                if (isWork) passedYearWorkdays++;
            }
        }

        // 累加本年后序月份的工作日
        for (let m = month + 1; m <= 12; m++) {
            const daysInM = new Date(year, m, 0).getDate();
            for (let d = 1; d <= daysInM; d++) {
                let isWork = false;
                if (typeof HolidayUtil !== 'undefined') {
                    const holiday = HolidayUtil.getHoliday(year, m, d);
                    if (holiday) isWork = holiday.isWork();
                    else if (typeof Solar !== 'undefined') {
                        const weekDay = Solar.fromYmd(year, m, d).getWeek();
                        isWork = (weekDay !== 0 && weekDay !== 6);
                    }
                } else {
                    const w = new Date(year, m - 1, d).getDay();
                    isWork = (w !== 0 && w !== 6);
                }
                if (isWork) remainingWorkdaysYear++;
            }
        }

        const totalYearWorkdays = passedYearWorkdays + remainingWorkdaysYear;
        if (yearElem) yearElem.textContent = `${remainingWorkdaysYear} 天`;
        if (yearProgress) {
            const yPct = totalYearWorkdays > 0 ? Math.round((passedYearWorkdays / totalYearWorkdays) * 100) : 0;
            yearProgress.style.width = `${yPct}%`;
        }

        // 3. 距离下一个法定假期精确计算
        if (typeof HolidayUtil !== 'undefined') {
            const holidays = HolidayUtil.getHolidays(year) || [];
            const nextYearHolidays = HolidayUtil.getHolidays(year + 1) || [];
            const allHolidays = [...holidays, ...nextYearHolidays];

            const todayYmd = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const futureHolidays = allHolidays.filter(h => !h.isWork() && h.getTarget() > todayYmd);

            if (futureHolidays.length > 0) {
                const next = futureHolidays[0];
                const targetDate = new Date(next.getTarget() + 'T00:00:00');
                const diffMs = targetDate - now;
                const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

                if (holidayElem) holidayElem.textContent = `${diffDays} 天`;
                if (holidayNameElem) holidayNameElem.textContent = next.getName();
                if (holidayProgress) {
                    holidayProgress.style.width = `${Math.max(5, Math.min(100, Math.round((1 - diffDays / 60) * 100)))}%`;
                }
            }
        }
    }


    // ==========================================================================
    // 7. 每日一言 (Daily Quote)
    // ==========================================================================
    function initDailyQuote() {
        const quoteText = document.getElementById('quote-text');
        const quoteAuthor = document.getElementById('quote-author');
        const refreshBtn = document.getElementById('quote-refresh-btn');
        const copyBtn = document.getElementById('quote-copy-btn');
        const favBtn = document.getElementById('quote-favorite-btn');

        const fallbackQuotes = [
            { text: "博观而约取，厚积而薄发。", from: "苏轼" },
            { text: "Stay hungry, stay foolish.", from: "Steve Jobs" },
            { text: "纸上得来终觉浅，绝知此事要躬行。", from: "陆游" },
            { text: "每一个不曾起舞的日子，都是对生命的辜负。", from: "尼采" },
            { text: "道阻且长，行则将至；行而不辍，未来可期。", from: "荀子" }
        ];

        async function fetchQuote() {
            try {
                const res = await fetch('https://v1.hitokoto.cn/?c=i&c=d&c=k');
                const data = await res.json();
                if (data && data.hitokoto) {
                    quoteText.textContent = data.hitokoto;
                    quoteAuthor.textContent = `—— ${data.from_who || data.from || '佚名'}`;
                    return;
                }
            } catch (e) {}
            
            const random = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            quoteText.textContent = random.text;
            quoteAuthor.textContent = `—— ${random.from}`;
        }

        refreshBtn?.addEventListener('click', fetchQuote);
        copyBtn?.addEventListener('click', () => {
            const content = `${quoteText.textContent} ${quoteAuthor.textContent}`;
            navigator.clipboard.writeText(content).then(() => alert('一言已复制到剪贴板 ✨'));
        });
        favBtn?.addEventListener('click', () => {
            alert('已将当前一言加入收藏 ❤️');
        });

        fetchQuote();
    }

    // ==========================================================================
    // 8. 今日待办 (直接与 D1 云端数据库打通)
    // ==========================================================================
    function initQuickTodos() {
        let todos = JSON.parse(localStorage.getItem('quick_todos') || '[]');
        const todoInput = document.getElementById('todo-input');
        const addTodoBtn = document.getElementById('add-todo');
        const todoList = document.getElementById('todo-list');
        const todoStats = document.getElementById('todo-stats');
        const clearCompletedBtn = document.getElementById('clear-completed');

        async function fetchCloudTodos() {
            if (!userToken) return;
            try {
                const res = await fetch('/api/todos', {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                const data = await res.json();
                if (data.ok && Array.isArray(data.data)) {
                    todos = data.data;
                    localStorage.setItem('quick_todos', JSON.stringify(todos));
                    renderTodos();
                }
            } catch (e) {
                console.error('Failed to fetch cloud todos', e);
            }
        }

        async function syncCloudTodos() {
            localStorage.setItem('quick_todos', JSON.stringify(todos));
            if (!userToken) return;
            try {
                await fetch('/api/todos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({ todos })
                });
            } catch (e) {
                console.error('Failed to sync todos', e);
            }
        }

        function renderTodos() {
            if (!todoList) return;
            todoList.innerHTML = '';

            const uncompleted = todos.filter(t => !t.completed).length;
            if (todoStats) todoStats.textContent = `${uncompleted} 项未完成 / 共 ${todos.length} 项`;

            if (todos.length === 0) {
                todoList.innerHTML = `<div style="text-align:center; padding: 1rem; color: var(--muted); font-size:0.85rem;">暂无待办事项，今日事今日毕 🍵</div>`;
                return;
            }

            todos.forEach((todo, idx) => {
                const item = document.createElement('div');
                item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                item.innerHTML = `
                    <div class="todo-item-left">
                        <input type="checkbox" ${todo.completed ? 'checked' : ''} data-idx="${idx}">
                        <span>${escapeHtml(todo.text)}</span>
                    </div>
                    <button class="todo-del-btn" data-idx="${idx}" title="删除">✕</button>
                `;

                item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                    todos[idx].completed = e.target.checked;
                    syncCloudTodos();
                    renderTodos();
                });

                item.querySelector('.todo-del-btn').addEventListener('click', () => {
                    todos.splice(idx, 1);
                    syncCloudTodos();
                    renderTodos();
                });

                todoList.appendChild(item);
            });
        }

        function addTodo() {
            const text = todoInput.value.trim();
            if (!text) return;
            todos.unshift({ text, completed: false, createdAt: Date.now() });
            todoInput.value = '';
            syncCloudTodos();
            renderTodos();
        }

        addTodoBtn?.addEventListener('click', addTodo);
        todoInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        clearCompletedBtn?.addEventListener('click', () => {
            todos = todos.filter(t => !t.completed);
            syncCloudTodos();
            renderTodos();
        });

        renderTodos();
        fetchCloudTodos();
    }

    // ==========================================================================
    // 9. 日常习惯打卡 (Daily Rituals)
    // ==========================================================================
    function initDailyHabits() {
        const DEFAULT_HABITS = [
            { id: 'water', name: '喝足八杯水 (2000ml)', icon: '💧' },
            { id: 'exercise', name: '运动健身 30 分钟', icon: '🏃' },
            { id: 'reading', name: '深度阅读一章节', icon: '📖' },
            { id: 'early', name: '早起早睡有节律', icon: '🌙' },
            { id: 'focus', name: '心流专注 2 小时', icon: '💻' }
        ];

        const todayKey = new Date().toISOString().slice(0, 10);
        let habitState = JSON.parse(localStorage.getItem('daily_habits') || '{}');
        if (habitState.lastDate !== todayKey) {
            habitState.lastDate = todayKey;
            habitState.todayDone = [];
            if (!habitState.streaks) habitState.streaks = {};
            localStorage.setItem('daily_habits', JSON.stringify(habitState));
        }

        const habitList = document.getElementById('habit-list');
        const habitRate = document.getElementById('habit-rate');
        const habitStreakTip = document.getElementById('habit-streak-tip');

        function renderHabits() {
            if (!habitList) return;
            habitList.innerHTML = '';

            const doneList = habitState.todayDone || [];
            if (habitRate) habitRate.textContent = `${doneList.length}/${DEFAULT_HABITS.length} 完成`;

            let maxStreak = 0;
            DEFAULT_HABITS.forEach(h => {
                const s = habitState.streaks?.[h.id] || 0;
                if (s > maxStreak) maxStreak = s;
            });
            if (habitStreakTip) {
                habitStreakTip.textContent = maxStreak > 0 ? `🔥 连续坚持第 ${maxStreak} 天` : '✨ 点击习惯一键打卡';
            }

            DEFAULT_HABITS.forEach(habit => {
                const isDone = doneList.includes(habit.id);
                const streak = habitState.streaks?.[habit.id] || 0;

                const item = document.createElement('div');
                item.className = `habit-item ${isDone ? 'done' : ''}`;
                item.innerHTML = `
                    <div class="habit-item-info">
                        <span class="habit-icon">${habit.icon}</span>
                        <div>
                            <div class="habit-name">${habit.name}</div>
                            <div class="habit-streak">${streak > 0 ? `已连击 ${streak} 天` : '今日待完成'}</div>
                        </div>
                    </div>
                    <div class="habit-check">${isDone ? '✓' : ''}</div>
                `;

                item.addEventListener('click', () => {
                    if (isDone) {
                        habitState.todayDone = habitState.todayDone.filter(id => id !== habit.id);
                        if (habitState.streaks[habit.id] > 0) habitState.streaks[habit.id]--;
                    } else {
                        habitState.todayDone.push(habit.id);
                        habitState.streaks[habit.id] = (habitState.streaks[habit.id] || 0) + 1;
                    }
                    localStorage.setItem('daily_habits', JSON.stringify(habitState));
                    renderHabits();
                });

                habitList.appendChild(item);
            });
        }

        renderHabits();
    }

    // ==========================================================================
    // 10. 故事花园 (Story Oasis) - 动态数据加载与沉浸式阅读联动
    // ==========================================================================
    const HOME_DEFAULT_STORIES = [
        {
            id: "1699990000001",
            title: "星之继承者：月球背面的五万年沉睡",
            author: "詹姆斯·霍根",
            content: `# 星之继承者：月球背面的五万年沉睡\n\n> 那些遥望星空的人，早已把他们的一部分灵魂留在了群星之中。\n\n### 一、冷寂尘埃中的奇迹\n在月球死寂荒凉的第谷环形山深处，太阳的光芒永远以极其锋利的明暗交界线切割着灰白色的月壤。公元2028年秋，国际联合月球科考队的钻探作业引发了一场微小的月震，在一处古老的玄武岩裂隙之下，深埋的金属反光刺破了数十亿年的沉寂。\n\n科考队员们小心翼翼地清理掉覆盖在表层的月尘，映入眼帘的，竟是一具身着鲜红色宇航服的人类遗骸。\n\n他的面罩早已被岁月的微陨石击穿，面部覆盖着一层薄薄的凝霜，但体态完整。遗骸被命名为“查理”。最令人匪夷所思的不是他的存在，而是碳-14与地质岩层的测定结果：**这名宇航员死于整整五万年以前。**\n\n### 二、超越时间的基因密码\n五万年前，地球上的智人刚刚走出非洲，手里握着的还是粗糙的燧石长矛与兽骨。然而在三十八万公里之外的月球上，一个身穿重型维生宇航服的生命却在这里静静长眠。\n\n人类生物学与基因测序中心对查理残留的骨骼组织展开了夜以继日的精密化验。报告得出的结论震撼了全球：\n- 他的染色体数目为 46 条；\n- 他的血红蛋白、肌红蛋白与器官分子结构，与现代人类的重合度高达 **99.98%**；\n- 他是一个地地道道的人类。\n\n他并非来自某个遥远的外星种族，也并非来自未来的时空穿越者。他那五万年前的心脏，曾跳动在与我们完全相同的人类胸膛中。\n\n### 三、遗落文明的星际信标\n在查理身边散落的金属仪器中，破译专家团队终于解读了一份被石英晶体锁存的微弱脉冲日志。\n\n那是关于一个古老太阳系文明的最后绝唱。五万年前，存在于火星与木星之间的母星遭遇了不可逆转的引力潮汐撕裂。面对席卷整个内太阳系的星际浩劫，最后一支名为“慧神星”的开拓舰队将人类基因火种与文明种子投向了这颗蔚蓝色的第三行星——地球。\n\n而查理，正是最后一位负责在月球轨道引导信标、掩护火种降落的守望者。\n\n### 四、我们所继承的宇宙\n> “当你在夜晚仰望浩瀚星河时，不要感到孤独与渺小。因为你身体里的每一个原子，都曾锻造于超新星的熔炉；而你眼中对未知的渴望，正是五万年前那双凝望地球的眼睛的延续。”\n\n文明不仅是生存的延续，更是对未知永恒的求索。我们并非这片大地的初来者，我们是跨越了五万年风沙与烈火的星之继承者。`,
            status: 1,
            createdAt: 1699990000001
        },
        {
            id: "1699990000002",
            title: "给岁月以文明：时间尽头的守夜人",
            author: "刘慈欣",
            content: `# 给岁月以文明：时间尽头的守夜人\n\n> “给岁月以文明，而不是给文明以岁月。” —— 这不仅是黑暗宇宙的信条，更是生命的最高尊严。\n\n### 一、星舰的最后一程\n“追光者号”星舰在无边无际的深空引力暗流中平稳滑行。距离离开母星系已经过去了三百年，舷窗外除了偶尔掠过的暗弱中子星射电信号，只剩下近乎永恒的漆黑与死寂。\n\n记录官林远坐在观景穹顶之下，手中摩挲着一枚来自母星古老银杏树的树叶标本。标本在树脂层中凝固成金黄色，那是恒星光芒曾经洒满大地的颜色。\n\n在近光速航行带来的相对论时间膨胀效应下，外界宇宙已经飞逝了数千载。对于广袤无垠的宇宙尺度而言，即便是最庞大的恒星也会坍缩为黑洞，最璀璨的星系也会走向热寂。人类这漫长的跋涉与抗争，究竟意义何在？\n\n### 二、记忆琥珀与文明火种\n在飞船的记忆存储核心“沧海”之中，保存着人类有史以来创造的一切：\n- 从肖邦的夜曲到巴赫的赋格；\n- 从《红楼梦》的叹惋到《神曲》的咏叹；\n- 从麦克斯韦方程组的优美对称，到量子纠缠中超越空间的共振。\n\n在漫长到令思维窒息的冷冻休眠与值守轮换中，每一位守夜人都会被问及同一个问题：“如果文明终将归于虚无，我们为什么还要在有限的岁月中苦苦追寻？”\n\n林远在值班日志中写下了这样一段回答：\n> “宇宙是一片冰冷而沉默的沙漠，而文明是在这片沙漠中盛开的花朵。花朵的意义，从来不在于它能否对抗严冬的到来，而在于它在绽放的那一瞬间，证明了这片荒漠曾经存在过生命的温度与色彩。”\n\n### 三、在群星中刻下热爱\n浩瀚的星空不曾许诺任何永恒，但正是因为生命的短暂与脆弱，每一个微小的瞬间才显得无比珍贵。\n\n在有限的生命跨度里，我们去爱，去思考，去感受清晨拂过面颊的风，去追逐落日熔金的晚霞，去用数学和诗歌丈量宇宙的深度。这就是所谓的“给岁月以文明”——用思想、审美、热爱与探索的火种，去点亮本该荒芜空洞的漫长时光。\n\n### 四、微光永不熄灭\n舷窗之外，一颗崭新的年轻恒星正在星云的怀抱中缓缓升起，金色的晨曦穿透了数十万公里的尘埃带，洒在“追光者号”白色的舰桥上。\n\n*哪怕最后只剩下一颗沙粒，它也曾反射过太阳的光辉；哪怕生命只如白驹过隙，我们也曾在这浩瀚苍穹中，留下了属于文明的足迹。*`,
            status: 1,
            createdAt: 1699990000002
        }
    ];

    function getLocalStories() {
        let stories = localStorage.getItem('garden-stories');
        let parsed = null;
        try {
            if (stories) parsed = JSON.parse(stories);
        } catch (e) {}

        // 如果没有缓存或旧缓存属于早期短文本片段，则无缝刷新为全新完整长篇故事
        if (!parsed || !Array.isArray(parsed) || parsed.length === 0 || (parsed[0].content && parsed[0].content.length < 300)) {
            localStorage.setItem('garden-stories', JSON.stringify(HOME_DEFAULT_STORIES));
            return HOME_DEFAULT_STORIES;
        }
        return parsed;
    }

    async function initStoryOasis() {
        const storyBody = document.getElementById('story-body');
        if (!storyBody) return;

        storyBody.innerHTML = '<div style="text-align:center; padding: 1.5rem; color: var(--muted); font-size:0.85rem;">正在探索故事花园... 📖</div>';

        let stories = [];
        let isLocalBackup = false;

        try {
            const res = await fetch('/api/stories');
            if (res.ok) {
                const resData = await res.json();
                if (resData.ok && Array.isArray(resData.data) && resData.data.length > 0) {
                    stories = resData.data;
                } else {
                    throw new Error('云端暂无数据');
                }
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err) {
            isLocalBackup = true;
            const allStories = getLocalStories();
            stories = allStories.filter(s => s.status === 1 || s.status === 'published' || s.status === undefined);
        }

        if (stories.length === 0) {
            storyBody.innerHTML = `
                <div class="story-quote-highlight">
                    “生活不仅是日复一日的日程，更是一座属于你自己的数字花园。每一行代码、每一次阅读、每一个习惯，都在静静生长。”
                </div>
                <p style="font-size: 0.84rem; color: var(--muted);">
                    暂无已发布故事，可前往管理员后台发布新故事。
                </p>
            `;
            return;
        }

        storyBody.innerHTML = '';
        const listContainer = document.createElement('div');
        listContainer.className = 'story-list';

        const sortedStories = stories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const displayedStories = sortedStories.slice(0, 3);

        displayedStories.forEach(story => {
            const item = document.createElement('div');
            item.className = 'story-item';
            item.innerHTML = `
                <div class="story-item-info">
                     <span class="story-item-title">${escapeHtml(story.title)}</span>
                     <span class="story-item-meta">作者: ${escapeHtml(story.author || '管理员')}</span>
                </div>
                <span class="story-item-arrow">→</span>
            `;
            item.addEventListener('click', () => {
                window.open(`/story.html?id=${story.id}${isLocalBackup ? '&local=true' : ''}`, '_blank');
            });
            listContainer.appendChild(item);
        });

        if (sortedStories.length > 3) {
            const moreBtn = document.createElement('a');
            moreBtn.className = 'story-more-btn';
            moreBtn.href = '/story.html';
            moreBtn.target = '_blank';
            moreBtn.innerHTML = `查看全部故事 (${sortedStories.length}) ➔`;
            listContainer.appendChild(moreBtn);
        }

        storyBody.appendChild(listContainer);
    }


    // ==========================================================================
    // 11. Launchpad 全屏毛玻璃启动器 (Ctrl + K)
    // ==========================================================================
    function initLaunchpad() {
        const overlay = document.getElementById('launchpadOverlay');
        const closeBtn = document.getElementById('launchpadCloseBtn');
        const searchInput = document.getElementById('launchpadSearch');
        const grid = document.getElementById('launchpadGrid');
        const filterTabs = document.getElementById('launchpadFilterTabs');
        const triggerBtn = document.getElementById('launchpadTriggerBtn');
        const heroTriggerBtn = document.getElementById('heroLaunchpadBtn');

        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 768;
        let activeFilter = isMobileDevice ? 'mobile' : 'all';

        // 如果是移动设备，默认激活“手机推荐”选项卡
        if (isMobileDevice) {
            document.querySelectorAll('.lp-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === 'mobile');
            });
        }

        function render() {
            if (!grid) return;
            const q = (searchInput?.value || '').trim().toLowerCase();
            let list = TOOLS;

            if (activeFilter === 'mobile') {
                list = list.filter(t => t.mobile);
            } else if (activeFilter !== 'all') {
                list = list.filter(t => t.category === activeFilter);
            }

            if (q) {
                list = list.filter(t => 
                    t.title.toLowerCase().includes(q) || 
                    t.desc.toLowerCase().includes(q) || 
                    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
                );
            }

            grid.innerHTML = '';
            if (list.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: rgba(255,255,255,0.6); font-size: 0.9rem;">
                        没有匹配的工具，请换个关键词搜搜看 🔍
                    </div>
                `;
                return;
            }

            list.forEach(t => {
                const item = document.createElement('a');
                item.className = 'launchpad-app-card';
                item.href = t.url;
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
                item.innerHTML = `
                    <div class="app-icon" style="background: ${t.gradient || 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'};">${t.icon}</div>
                    <strong class="app-title">${t.title}</strong>
                    <span class="app-desc">${t.desc}</span>
                `;
                grid.appendChild(item);
            });
        }

        function open() {
            overlay.classList.add('open');
            setTimeout(() => searchInput?.focus(), 50);
            render();
        }

        function close() {
            overlay.classList.remove('open');
        }

        triggerBtn?.addEventListener('click', open);
        heroTriggerBtn?.addEventListener('click', open);
        closeBtn?.addEventListener('click', close);
        searchInput?.addEventListener('input', render);

        filterTabs?.addEventListener('click', (e) => {
            const btn = e.target.closest('.lp-filter-btn');
            if (!btn) return;
            document.querySelectorAll('.lp-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter || 'all';
            render();
        });

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (overlay.classList.contains('open')) close();
                else open();
            } else if (e.key === 'Escape') {
                close();
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // 初始化驱动
    document.addEventListener('DOMContentLoaded', () => {
        initProfile();
        initClock();
        initQuickMemo();
        initTimePulse();
        initDailyQuote();
        initQuickTodos();
        initDailyHabits();
        initStoryOasis();
        initLaunchpad();
    });
})();
