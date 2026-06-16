document.addEventListener('DOMContentLoaded', () => {
    // 1. 节假日统计逻辑 (依赖外部库)
    if (typeof HolidayUtil !== 'undefined') {
        updateHolidayStats();
    } else {
        console.warn('HolidayUtil not loaded, skipping holiday stats update.');
    }

    function updateHolidayStats() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        // 统一计算基准：如果今天还没结束，且法理上是工作日，则包含今天
        const isTodayWorkday = () => {
            if (typeof HolidayUtil === 'undefined') return true;
            const holiday = HolidayUtil.getHoliday(year, month, day);
            if (holiday) return holiday.isWork();
            if (typeof Solar === 'undefined') return true;
            const solar = Solar.fromYmd(year, month, day);
            const weekDay = solar.getWeek();
            return weekDay !== 0 && weekDay !== 6;
        };

        // 1. 获取本月剩余工作日 (包含今天)
        let remainingWorkdaysMonth = 0;
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = day; d <= daysInMonth; d++) {
            let isWork = false;
            if (typeof HolidayUtil !== 'undefined') {
                const holiday = HolidayUtil.getHoliday(year, month, d);
                if (holiday) {
                    if (holiday.isWork()) isWork = true;
                } else if (typeof Solar !== 'undefined') {
                    const solar = Solar.fromYmd(year, month, d);
                    const weekDay = solar.getWeek();
                    if (weekDay !== 0 && weekDay !== 6) isWork = true;
                }
            }
            if (isWork) remainingWorkdaysMonth++;
        }
        const monthEl = document.getElementById('remaining-workdays-month');
        if (monthEl) monthEl.innerText = `${remainingWorkdaysMonth} 天`;

        // 2. 获取本年剩余工作日 (已包含本月剩余，逻辑已统一)
        let remainingWorkdaysYear = remainingWorkdaysMonth;
        for (let m = month + 1; m <= 12; m++) {
            const daysInM = new Date(year, m, 0).getDate();
            for (let d = 1; d <= daysInM; d++) {
                const solar = Solar.fromYmd(year, m, d);
                const holiday = HolidayUtil.getHoliday(year, m, d);
                if (holiday) {
                    if (holiday.isWork()) remainingWorkdaysYear++;
                } else {
                    const weekDay = solar.getWeek();
                    if (weekDay !== 0 && weekDay !== 6) remainingWorkdaysYear++;
                }
            }
        }
        const yearEl = document.getElementById('remaining-workdays-year');
        if (yearEl) yearEl.innerText = `${remainingWorkdaysYear} 天`;

        // 3. 距离下一个法定假期
        const holidays = HolidayUtil.getHolidays(year);
        const nextYearHolidays = HolidayUtil.getHolidays(year + 1);
        const allHolidays = [...holidays, ...nextYearHolidays];

        const todayYmd = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        // 过滤出未来的假期（不包含调休工作日）
        const futureHolidays = allHolidays.filter(h => !h.isWork() && h.getTarget() > todayYmd);

        if (futureHolidays.length > 0) {
            const next = futureHolidays[0];
            const targetDate = new Date(next.getTarget() + 'T00:00:00'); // 确保从假期当天的 0 点开始算

            // 计算时间差：由于假期通常从 0 点开始，这里向上取整可以得到包含“今天剩余部分”的天数
            // 例如：如果是 29 号下午，目标是 5 月 1 号 0 点，差值是 1.25 天左右，ceil 之后是 2 天（即：还有今天剩余+明天一整天）
            const diffMs = targetDate - now;
            const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            const nextNameEl = document.getElementById('next-holiday-name');
            const heroNextNameEl = document.getElementById('hero-next-holiday-name');
            const nextDaysEl = document.getElementById('next-holiday-days');
            const heroNextEl = document.getElementById('hero-next-holiday');
            const toolStatusEl = document.getElementById('tool-holiday-status');

            if (nextNameEl) nextNameEl.innerText = next.getName();
            if (heroNextNameEl) heroNextNameEl.innerText = next.getName();
            if (nextDaysEl) nextDaysEl.innerText = `${diffDays} 天`;
            if (heroNextEl) heroNextEl.innerText = `${diffDays} 天`;
            if (toolStatusEl) toolStatusEl.innerText = `下个假期：${next.getName()} (还剩 ${diffDays} 天)`;
        }
    }

    // 2. Launchpad 全屏启动器逻辑
    const launchpadOverlay = document.getElementById('launchpadOverlay');
    const launchpadTriggerBtn = document.getElementById('launchpadTriggerBtn');
    const launchpadCloseBtn = document.getElementById('launchpadCloseBtn');
    const launchpadSearch = document.getElementById('launchpadSearch');
    const lpFilterBtns = document.querySelectorAll('.lp-filter-btn');
    const lpAppCards = document.querySelectorAll('#launchpadGrid .launchpad-app-card');
    const lpNoResults = document.getElementById('lpNoResults');

    // 打开 Launchpad
    function openLaunchpad() {
        if (!launchpadOverlay) return;
        launchpadOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // 禁用主页面滚动
        setTimeout(() => {
            if (launchpadSearch) launchpadSearch.focus();
        }, 100);
    }

    // 关闭 Launchpad
    function closeLaunchpad() {
        if (!launchpadOverlay) return;
        launchpadOverlay.classList.remove('active');
        document.body.style.overflow = ''; // 恢复主页面滚动
        if (launchpadSearch) {
            launchpadSearch.value = '';
            // 清理搜索状态，显示所有卡片
            applyLpFilter();
        }
    }

    if (launchpadTriggerBtn) {
        launchpadTriggerBtn.addEventListener('click', openLaunchpad);
    }
    if (launchpadCloseBtn) {
        launchpadCloseBtn.addEventListener('click', closeLaunchpad);
    }

    // 点击空白背板处关闭 Launchpad
    if (launchpadOverlay) {
        launchpadOverlay.addEventListener('click', (e) => {
            if (e.target === launchpadOverlay || e.target.classList.contains('launchpad-content')) {
                closeLaunchpad();
            }
        });
    }

    // 全局快捷键监听 (Ctrl+K 打开，Esc 关闭)
    window.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (launchpadOverlay.classList.contains('active')) {
                closeLaunchpad();
            } else {
                openLaunchpad();
            }
        }

        if (e.key === 'Escape' && launchpadOverlay.classList.contains('active')) {
            closeLaunchpad();
        }
    });

    // 搜索与分类联动逻辑
    const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 768;
    let currentLpFilter = isMobileDevice ? 'mobile' : 'all';
    let lpSearchQuery = '';

    // 初始化过滤器激活状态样式
    if (isMobileDevice) {
        lpFilterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === 'mobile') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    const applyLpFilter = () => {
        let visibleCount = 0;
        lpAppCards.forEach(card => {
            const category = card.getAttribute('data-category');
            const title = (card.querySelector('.app-title')?.innerText || '').toLowerCase();
            const desc = (card.querySelector('.app-desc')?.innerText || '').toLowerCase();

            // 如果是管理员入口，且用户不是 admin，保持隐藏
            const isUserAdmin = user && user.role === 'admin';
            if (category === 'admin' && !isUserAdmin) {
                card.classList.add('lp-hidden');
                return;
            }

            const isMobileFriendly = card.getAttribute('data-mobile-friendly') === 'true';
            const matchesFilter = (currentLpFilter === 'all') || 
                                  (currentLpFilter === 'mobile' && isMobileFriendly) ||
                                  (category === currentLpFilter);
            const matchesSearch = (title.includes(lpSearchQuery) || desc.includes(lpSearchQuery));

            if (matchesFilter && matchesSearch) {
                card.classList.remove('lp-hidden');
                visibleCount++;
            } else {
                card.classList.add('lp-hidden');
            }
        });

        if (lpNoResults) {
            lpNoResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    };

    lpFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            lpFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLpFilter = btn.getAttribute('data-filter');
            applyLpFilter();
        });
    });

    if (launchpadSearch) {
        launchpadSearch.addEventListener('input', (e) => {
            lpSearchQuery = e.target.value.toLowerCase();
            applyLpFilter();
        });
    }
    // 3. 实时时钟逻辑
    function updateClock() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        const clockEl = document.getElementById('main-clock');
        const statusEl = document.getElementById('clock-status');

        if (clockEl) {
            clockEl.innerText = `${hours}:${minutes}`;
        }

        if (statusEl) {
            const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const dayName = days[now.getDay()];
            const solarDateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${dayName}`;

            let dateStr = solarDateStr;
            if (typeof Lunar !== 'undefined') {
                const lunar = Lunar.fromDate(now);
                const lunarStr = `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
                dateStr += ` · ${lunarStr}`;
            }
            statusEl.innerText = dateStr;
        }
    }

    updateClock();
    setInterval(updateClock, 1000);

    // 4. 进度条更新逻辑
    function updateProgressBars() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();

        // 1. 本月进度
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthPercent = Math.min(100, (day / daysInMonth) * 100);
        const monthBar = document.getElementById('month-progress');
        if (monthBar) monthBar.style.width = `${monthPercent}%`;

        // 2. 本年进度
        const startOfYear = new Date(year, 0, 1);
        const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
        const diffDays = Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24));
        const yearPercent = Math.min(100, (diffDays / daysInYear) * 100);
        const yearBar = document.getElementById('year-progress');
        if (yearBar) yearBar.style.width = `${yearPercent}%`;

        // 3. 假期进度 (以30天为一个周期进行模拟展示)
        const holidayBar = document.getElementById('holiday-progress');
        if (holidayBar) {
            const nextDaysEl = document.getElementById('hero-next-holiday');
            if (nextDaysEl) {
                const daysRemaining = parseInt(nextDaysEl.innerText) || 0;
                const holidayPercent = Math.max(5, Math.min(100, 100 - (daysRemaining / 30) * 100));
                holidayBar.style.width = `${holidayPercent}%`;
            }
        }
    }

    // 延迟一会执行，确保数据已填入
    setTimeout(updateProgressBars, 500);

    // 5. 今日待办逻辑 (LocalStorage + Cloud Sync)
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo');
    const todoList = document.getElementById('todo-list');
    const todoStats = document.getElementById('todo-stats');
    const clearCompletedBtn = document.getElementById('clear-completed');

    if (todoInput && todoList) {
        const token = localStorage.getItem('token');
        const isLoggedIn = !!token;

        // 解析用户 ID 以实现存储隔离
        let userId = null;
        if (isLoggedIn) {
            const payload = parseJwt(token);
            userId = payload?.userId;
        }

        const storageKey = userId ? `garden-todos-${userId}` : 'garden-todos';
        let todos = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // 迁移逻辑：如果刚登录且个人空间为空，尝试从公共空间迁移数据
        if (isLoggedIn && userId && todos.length === 0) {
            const publicTodos = JSON.parse(localStorage.getItem('garden-todos') || '[]');
            if (publicTodos.length > 0) {
                console.log('Migrating public todos to user account...');
                todos = publicTodos;
                localStorage.setItem(storageKey, JSON.stringify(todos));
                localStorage.removeItem('garden-todos'); // 迁移后清理公共空间
            }
        }

        const syncTodos = async () => {
            if (!isLoggedIn) return;
            try {
                const res = await fetch('/api/todos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ todos })
                });
                const data = await res.json();
                if (!data.ok) console.error('Sync failed:', data.msg);
            } catch (err) {
                console.error('Sync error:', err);
            }
        };

        const fetchTodos = async () => {
            if (!isLoggedIn) return;
            try {
                const res = await fetch('/api/todos', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (result.ok && Array.isArray(result.data)) {
                    if (result.data.length > 0) {
                        // 云端有数据，以云端为准
                        todos = result.data;
                        saveTodos(false);
                        renderTodos();
                    } else if (todos.length > 0) {
                        // 云端没数据但本地有，说明是初次登录，自动推送到云端
                        console.log('Detected local todos, performing initial sync...');
                        syncTodos();
                    }
                }
            } catch (err) {
                console.error('Fetch todos error:', err);
            }
        };

        const saveTodos = (shouldSync = true) => {
            localStorage.setItem(storageKey, JSON.stringify(todos));
            if (shouldSync) syncTodos();
        };

        let hideCompletedInView = false;

        const renderTodos = () => {
            todoList.innerHTML = '';

            const now = new Date();
            // 以凌晨 6 点作为“新一天”的分界线（解决熬夜任务归属，以及过滤之前时区 Bug 导致偏移到凌晨 5 点的任务）
            let startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0).getTime();
            if (now.getHours() < 6) {
                // 如果当前时间还没到早上 6 点，则“今天”的起点算作昨天的早上 6 点
                startOfToday -= 24 * 60 * 60 * 1000;
            }

            // 数据清洗：确保所有任务的时间戳都是数字格式
            todos.forEach(t => {
                if (typeof t.createdAt === 'string') {
                    // 如果是 ISO 字符串或其它格式，尝试转为毫秒数
                    const parsed = new Date(t.createdAt).getTime();
                    if (!isNaN(parsed)) t.createdAt = parsed;
                }

                // --- 自动修复之前的时区 Bug 导致的时间偏移 (+8小时) ---
                // 如果发现时间戳落在了 Bug 产生的错误时间段（比如 2026-05-17 凌晨 4点~8点）
                // 且实际上是昨晚 8点~12点 创建的，我们可以平滑修复它。
                // 这里的 1778961600000 对应 2026-05-17 04:00，1778976000000 对应 08:00
                const EIGHT_HOURS = 8 * 60 * 60 * 1000;
                if (t.createdAt >= 1778961600000 && t.createdAt <= 1778976000000) {
                    t.createdAt -= EIGHT_HOURS;
                    if (t.completedAt) t.completedAt -= EIGHT_HOURS;
                }
            });

            // 核心逻辑：显示（今天创建的任务）+（以前未完成的任务）
            const relevantTodos = todos.filter(t => {
                const createdAtNum = Number(t.createdAt) || 0;
                const isCreatedToday = createdAtNum >= startOfToday;
                const isPending = !t.completed;
                return isCreatedToday || isPending;
            });

            // 过滤掉已标记为“隐藏”的已完成任务（仅限当前点击隐藏后的效果）
            const visibleTodos = hideCompletedInView
                ? relevantTodos.filter(t => !t.completed)
                : relevantTodos;

            visibleTodos.forEach((todo) => {
                const originalIndex = todos.indexOf(todo);
                const createdAtNum = Number(todo.createdAt) || 0;
                const isHistory = createdAtNum < startOfToday;
                const item = document.createElement('div');
                item.className = `todo-item ${todo.completed ? 'completed' : ''} ${isHistory ? 'history-task' : ''}`;
                item.innerHTML = `
                    <div class="todo-checkbox" onclick="toggleTodo(${originalIndex})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div class="todo-content-wrapper" style="flex: 1; display: flex; align-items: center; gap: 8px;">
                        <span class="todo-text">${todo.text}</span>
                        ${isHistory ? '<span class="todo-tag">历史积压</span>' : ''}
                    </div>
                    <button class="delete-todo" onclick="deleteTodo(${originalIndex})" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                todoList.appendChild(item);
            });

            const remaining = todos.filter(t => !t.completed).length;
            const historyPending = relevantTodos.filter(t => {
                const createdAtNum = Number(t.createdAt) || 0;
                return createdAtNum < startOfToday && !t.completed;
            }).length;

            let statsText = `${remaining} 个未完成`;
            if (historyPending > 0) {
                statsText += ` (含 ${historyPending} 个积压)`;
            }
            todoStats.innerText = `${statsText} ${isLoggedIn ? '☁️' : '📍'}`;

            // 如果所有已完成都被隐藏了，且没有未完成的，可以给个提示或者保持原样
            // 这里维持原样即可，用户可以在任务中心看到全部

            // 更新按钮文字
            clearCompletedBtn.innerText = hideCompletedInView ? '显示已完成' : '隐藏已完成';
        };

        window.toggleTodo = (index) => {
            const isNowCompleted = !todos[index].completed;
            todos[index].completed = isNowCompleted;
            // 记录完成时间：如果切换为完成则打戳，否则清空
            todos[index].completedAt = isNowCompleted ? Date.now() : null;

            saveTodos();
            renderTodos();
        };

        window.deleteTodo = (index) => {
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
        };

        const addNewTodo = () => {
            const text = todoInput.value.trim();
            if (text) {
                todos.unshift({
                    text,
                    completed: false,
                    createdAt: Date.now() // 增加时间戳
                });
                todoInput.value = '';
                // 新增任务时，如果是处于隐藏已完成状态，可能需要重新考虑是否恢复显示
                // 这里选择维持现状，新任务会显示在顶部
                saveTodos();
                renderTodos();
            }
        };

        addTodoBtn.addEventListener('click', addNewTodo);
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewTodo();
        });

        clearCompletedBtn.addEventListener('click', () => {
            hideCompletedInView = !hideCompletedInView;
            renderTodos();
        });

        // 初始化
        renderTodos();
        if (isLoggedIn) fetchTodos();
    }

    // 6. 登录状态检测与用户信息解析
    const token = localStorage.getItem('token');
    const profileIdentity = document.querySelector('.profile-content .identity');
    const avatarEl = document.querySelector('.profile-content .avatar');
    const adminConsoleCard = document.querySelector('a[data-category="admin"]');
    const adminFilterBtn = document.getElementById('lp-admin-filter-btn');

    // 解析 JWT Payload 的工具函数
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // 默认隐藏所有管理相关入口
    if (adminConsoleCard) adminConsoleCard.style.display = 'none';
    if (adminFilterBtn) adminFilterBtn.style.display = 'none';

    const user = token ? parseJwt(token) : null;

    if (user && profileIdentity && avatarEl) {
        // 如果是管理员，显示管理相关入口
        if (user.role === 'admin') {
            if (adminConsoleCard) adminConsoleCard.style.display = 'flex';
            if (adminFilterBtn) adminFilterBtn.style.display = 'inline-block';
        }

        // 更新昵称和角色
        profileIdentity.innerHTML = `
            <strong>${user.nick_name || user.username}</strong>
            <span>${user.role === 'admin' ? '管理员' : '普通用户'} / 已登录</span>
            <button id="logout-btn" style="background: none; border: none; color: #f472b6; font-size: 0.75rem; cursor: pointer; padding: 0; margin-top: 4px; text-decoration: underline;">退出登录</button>
        `;

        // 如果有首字母，更新头像文本
        if (user.nick_name || user.username) {
            avatarEl.innerText = (user.nick_name || user.username).substring(0, 2).toUpperCase();
        }

        // 绑定退出登录
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            // 为了兼容旧版本，顺便清理一下 user
            localStorage.removeItem('user');
            window.location.reload();
        });
    } else if (profileIdentity) {
        // 未登录状态展示
        profileIdentity.innerHTML += `
            <a href="/login.html" style="color: #818cf8; font-size: 0.8125rem; text-decoration: none; margin-top: 8px; display: block;">👉 点击登录</a>
        `;
    }

    // 初始化时触发一次应用过滤逻辑，确保移动端等初始筛选生效
    applyLpFilter();

    // ==========================================
    // ==========================================
    // 7. 故事花园 (Story Oasis) 首页逻辑
    // ==========================================
    const storyBody = document.getElementById('story-body');

    const HOME_DEFAULT_STORIES = [
        {
            id: "1699990000001",
            title: "星之继承者",
            author: "詹姆斯·霍根",
            content: "# 星之继承者\n\n> 那些遥望星空的人，早已把他们的一部分灵魂留在了群星之中。\n\n在月球的寒冷尘埃中，探索队发现了一具红色的宇航服，里面包裹着一具距今已有五万年的古老尸体。人类的科学界陷入了前所未有的震动。他并非来自未来，也并非天外来客，他那五万年前的心脏，曾跳动在与我们完全一致的人类胸膛中。\n\n**这一发现证明了，在人类文明之前，月球就曾是智慧生命的舞台。** 那么，我们究竟继承了什么？是跨越群星的血脉，还是对未知永恒的求索？",
            status: 1,
            createdAt: 1699990000001
        },
        {
            id: "1699990000002",
            title: "给岁月以文明",
            author: "刘慈欣",
            content: "# 给岁月以文明\n\n> “给岁月以文明，而不是给文明以岁月。” —— 这不仅是黑暗战役的信条，也是生命的最高尊严。\n\n在浩瀚的宇宙尺度中，个体的生命显得微不足道。三体舰队正在以光速十分之一的速度逼近地球，人类社会被巨大的绝望 and 虚无感所笼罩。然而，真正的文明不应当只是苟延残喘的年岁，而应当在这有限年岁中，绽放出思想、艺术与热爱的光芒。*哪怕最后只剩下一颗沙粒，它也曾反射过太阳的光辉。*",
            status: 1,
            createdAt: 1699990000002
        }
    ];

    function getHomeStories() {
        let stories = localStorage.getItem('garden-stories');
        if (!stories) {
            stories = JSON.stringify(HOME_DEFAULT_STORIES);
            localStorage.setItem('garden-stories', stories);
        }
        return JSON.parse(stories);
    }

    // 渲染故事列表
    async function renderHomeStories() {
        if (!storyBody) return;
        storyBody.innerHTML = '<div class="story-loading" style="text-align: center; opacity: 0.6; padding: 20px;">正在探索故事花园...</div>';

        let stories = [];
        let isLocalBackup = false;

        try {
            const res = await fetch('/api/stories');
            if (res.ok) {
                const resData = await res.json();
                if (resData.ok && Array.isArray(resData.data)) {
                    stories = resData.data;
                } else {
                    throw new Error(resData.msg || '获取数据失败');
                }
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err) {
            console.warn('云端故事加载失败，降级使用 LocalStorage:', err);
            isLocalBackup = true;
            const allStories = getHomeStories();
            stories = allStories.filter(s => s.status === 1 || s.status === 'published');
        }

        if (stories.length === 0) {
            storyBody.innerHTML = `<div class="story-empty-tips">故事花园暂时空无一物 ☕<br>请登录超管账号前往后台管理发布新故事。</div>`;
            return;
        }

        storyBody.innerHTML = '';
        const listContainer = document.createElement('div');
        listContainer.className = 'story-list';

        stories.sort((a, b) => b.createdAt - a.createdAt).forEach(story => {
            const item = document.createElement('div');
            item.className = 'story-item';
            item.innerHTML = `
                <div class="story-item-info">
                     <span class="story-item-title">${story.title}${isLocalBackup ? ' <span style="font-size:0.7rem;opacity:0.6;font-weight:normal;">(本地缓存)</span>' : ''}</span>
                     <span class="story-item-meta">作者: ${story.author}</span>
                </div>
                <span class="story-item-arrow">→</span>
            `;
            item.addEventListener('click', () => {
                window.open(`/story.html?id=${story.id}${isLocalBackup ? '&local=true' : ''}`, '_blank');
            });
            listContainer.appendChild(item);
        });

        storyBody.appendChild(listContainer);
    }

    // 初始渲染故事
    renderHomeStories();
});
