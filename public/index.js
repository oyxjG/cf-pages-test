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

    // 2. 工具过滤与搜索逻辑 (不依赖外部库)
    const toolSearch = document.getElementById('toolSearch');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const toolCards = document.querySelectorAll('#toolsGrid .link-card');
    const noResults = document.getElementById('noResults');

    if (toolSearch && toolCards.length > 0) {
        let currentFilter = 'all';
        let searchQuery = '';

        const applyFilter = () => {
            let visibleCount = 0;
            toolCards.forEach(card => {
                const category = card.getAttribute('data-category');
                const title = (card.querySelector('strong')?.innerText || '').toLowerCase();
                const desc = (card.querySelector('span')?.innerText || '').toLowerCase();
                
                const matchesFilter = (currentFilter === 'all' || category === currentFilter);
                const matchesSearch = (title.includes(searchQuery) || desc.includes(searchQuery));

                if (matchesFilter && matchesSearch) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            if (noResults) {
                noResults.classList.toggle('visible', visibleCount === 0);
            }
        };

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                applyFilter();
            });
        });

        toolSearch.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFilter();
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

    // 5. 今日待办逻辑 (LocalStorage 存储)
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo');
    const todoList = document.getElementById('todo-list');
    const todoStats = document.getElementById('todo-stats');
    const clearCompletedBtn = document.getElementById('clear-completed');

    if (todoInput && todoList) {
        let todos = JSON.parse(localStorage.getItem('garden-todos') || '[]');

        const saveTodos = () => {
            localStorage.setItem('garden-todos', JSON.stringify(todos));
        };

        const renderTodos = () => {
            todoList.innerHTML = '';
            todos.forEach((todo, index) => {
                const item = document.createElement('div');
                item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                item.innerHTML = `
                    <div class="todo-checkbox" onclick="toggleTodo(${index})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span class="todo-text">${todo.text}</span>
                    <button class="delete-todo" onclick="deleteTodo(${index})" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                todoList.appendChild(item);
            });

            const remaining = todos.filter(t => !t.completed).length;
            todoStats.innerText = `${remaining} 个未完成`;
        };

        window.toggleTodo = (index) => {
            todos[index].completed = !todos[index].completed;
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
                todos.unshift({ text, completed: false });
                todoInput.value = '';
                saveTodos();
                renderTodos();
            }
        };

        addTodoBtn.addEventListener('click', addNewTodo);
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewTodo();
        });

        clearCompletedBtn.addEventListener('click', () => {
            todos = todos.filter(t => !t.completed);
            saveTodos();
            renderTodos();
        });

        renderTodos();
    }

    // 6. 登录状态检测
    const userJson = localStorage.getItem('user');
    const profileIdentity = document.querySelector('.profile-content .identity');
    const avatarEl = document.querySelector('.profile-content .avatar');
    const adminConsoleCard = document.querySelector('a[data-category="admin"]');
    if (adminConsoleCard) adminConsoleCard.style.display = 'none'; // 默认隐藏

    if (userJson && profileIdentity && avatarEl) {
        const user = JSON.parse(userJson);
        
        // 如果是管理员，显示控制台
        if (user.role === 'admin' && adminConsoleCard) {
            adminConsoleCard.style.display = 'block';
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
            localStorage.removeItem('user');
            window.location.reload();
        });
    } else if (profileIdentity) {
        // 未登录状态展示
        profileIdentity.innerHTML += `
            <a href="/login.html" style="color: #818cf8; font-size: 0.8125rem; text-decoration: none; margin-top: 8px; display: block;">👉 点击登录</a>
        `;
    }
});
