document.addEventListener('DOMContentLoaded', async () => {
    const historyContainer = document.getElementById('task-history');
    const totalEl = document.getElementById('total-tasks');
    const completedEl = document.getElementById('completed-tasks');
    const avgTimeEl = document.getElementById('avg-time');
    const rateValueEl = document.getElementById('rate-value');
    const chartBar = document.getElementById('completion-chart');
    const localNotice = document.getElementById('local-mode-notice');

    let allTodos = [];
    let filterStatus = 'all'; 
    let filterTime = 'all'; 

    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;

    if (!isLoggedIn) {
        localNotice.style.display = 'flex';
    }

    async function loadData() {
        // 先尝试从本地读取作为初始值
        allTodos = JSON.parse(localStorage.getItem('garden-todos') || '[]');

        if (isLoggedIn) {
            try {
                const res = await fetch('/api/todos', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (result.ok && Array.isArray(result.data)) {
                    // 只有当云端确实有数据时才覆盖本地，否则维持本地现状
                    if (result.data.length > 0) {
                        allTodos = result.data;
                        localStorage.setItem('garden-todos', JSON.stringify(allTodos));
                    }
                }
            } catch (err) {
                console.error('Fetch error:', err);
                // 发生错误时维持本地数据不变
            }
        } else {
            // 本地模式：执行 7 天过滤
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            allTodos = allTodos.filter(t => !t.createdAt || t.createdAt > sevenDaysAgo);
        }

        applyFilters();
    }

    const syncTodos = async () => {
        if (!isLoggedIn) return;
        try {
            await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ todos: allTodos })
            });
        } catch (err) {
            console.error('Sync error:', err);
        }
    };

    const saveTodos = () => {
        localStorage.setItem('garden-todos', JSON.stringify(allTodos));
        syncTodos();
    };

    function applyFilters() {
        let filtered = [...allTodos];

        if (filterStatus === 'pending') {
            filtered = filtered.filter(t => !t.completed);
        } else if (filterStatus === 'completed') {
            filtered = filtered.filter(t => t.completed);
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (filterTime === 'today') {
            filtered = filtered.filter(t => t.createdAt >= startOfToday);
        } else if (filterTime === 'week') {
            const day = now.getDay() || 7;
            const startOfWeek = startOfToday - (day - 1) * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(t => t.createdAt >= startOfWeek);
        } else if (filterTime === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            filtered = filtered.filter(t => t.createdAt >= startOfMonth);
        }

        renderHistory(filtered);
        renderStats(allTodos);
    }

    function renderStats(todos) {
        const total = todos.length;
        const completedTasks = todos.filter(t => t.completed);
        const completedCount = completedTasks.length;
        const rate = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        let totalTime = 0;
        let timedCount = 0;
        completedTasks.forEach(t => {
            if (t.createdAt && t.completedAt) {
                totalTime += (t.completedAt - t.createdAt);
                timedCount++;
            }
        });
        const avgMinutes = timedCount === 0 ? 0 : Math.round(totalTime / (1000 * 60));
        let avgStr = avgMinutes < 60 ? `${avgMinutes}分` : `${Math.round(avgMinutes/60)}时`;
        if (avgMinutes === 0 && timedCount > 0) avgStr = "<1分";

        totalEl.innerText = total;
        completedEl.innerText = completedCount;
        avgTimeEl.innerText = timedCount > 0 ? avgStr : '--';
        rateValueEl.innerText = `${rate}%`;

        const angle = (rate / 100) * 360;
        chartBar.style.transform = `rotate(45deg)`;
        if (rate > 50) {
            chartBar.style.borderBottomColor = 'var(--accent)';
            chartBar.style.borderLeftColor = 'var(--accent)';
        }
    }

    function renderHistory(todos) {
        historyContainer.innerHTML = '';
        
        // 1. 标题
        const header = document.createElement('div');
        header.className = 'task-group';
        header.innerHTML = `<div class="group-title">任务列表 (${todos.length})</div>`;
        historyContainer.appendChild(header);

        // 2. 筛选栏 (移到此处)
        const filterBar = document.createElement('div');
        filterBar.className = 'filter-bar';
        filterBar.innerHTML = `
            <div class="filter-group">
                <span class="filter-label">状态</span>
                <div class="filter-options" id="status-filters">
                    <button class="filter-chip ${filterStatus === 'all' ? 'active' : ''}" data-status="all">全部</button>
                    <button class="filter-chip ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending">未完成</button>
                    <button class="filter-chip ${filterStatus === 'completed' ? 'active' : ''}" data-status="completed">已完成</button>
                </div>
            </div>
            <div class="filter-group">
                <span class="filter-label">时间</span>
                <div class="filter-options" id="time-filters">
                    <button class="filter-chip ${filterTime === 'all' ? 'active' : ''}" data-time="all">不限</button>
                    <button class="filter-chip ${filterTime === 'today' ? 'active' : ''}" data-time="today">今天</button>
                    <button class="filter-chip ${filterTime === 'week' ? 'active' : ''}" data-time="week">本周</button>
                    <button class="filter-chip ${filterTime === 'month' ? 'active' : ''}" data-time="month">本月</button>
                </div>
            </div>
        `;
        historyContainer.appendChild(filterBar);

        // 绑定筛选事件 (因为是动态生成的，需要重新绑定或使用代理)
        filterBar.querySelector('#status-filters').onclick = (e) => {
            if (e.target.dataset.status) {
                filterStatus = e.target.dataset.status;
                applyFilters();
            }
        };
        filterBar.querySelector('#time-filters').onclick = (e) => {
            if (e.target.dataset.time) {
                filterTime = e.target.dataset.time;
                applyFilters();
            }
        };

        // 3. 实际列表
        if (todos.length === 0) {
            const empty = document.createElement('div');
            empty.style = 'text-align: center; padding: 60px; color: var(--muted);';
            empty.innerText = '没有符合条件的记录';
            historyContainer.appendChild(empty);
            return;
        }

        const listContent = document.createElement('div');
        listContent.className = 'history-list';
        historyContainer.appendChild(listContent);
        
        todos.forEach(todo => {
            // 在 allTodos 中找到该原始对象的索引，以便修改
            const originalIndex = allTodos.findIndex(t => t.text === todo.text && t.createdAt === todo.createdAt);
            
            const item = document.createElement('div');
            item.className = `history-item ${todo.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="task-status" onclick="window.toggleTask(${originalIndex})">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                    <span class="task-text">${todo.text}</span>
                    <span class="task-time" style="opacity: 0.5; font-size: 11px;">
                        创建: ${new Date(todo.createdAt).toLocaleString()} 
                        ${todo.completedAt ? ` | 完成: ${new Date(todo.completedAt).toLocaleString()}` : ''}
                    </span>
                </div>
            `;
            listContent.appendChild(item);
        });
    }

    window.toggleTask = (index) => {
        if (index === -1) return;
        const isNowCompleted = !allTodos[index].completed;
        allTodos[index].completed = isNowCompleted;
        allTodos[index].completedAt = isNowCompleted ? Date.now() : null;
        
        saveTodos();
        applyFilters();
    };

    loadData();
});
