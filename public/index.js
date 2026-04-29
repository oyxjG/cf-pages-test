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
            const holiday = HolidayUtil.getHoliday(year, month, day);
            if (holiday) return holiday.isWork();
            const solar = Solar.fromYmd(year, month, day);
            const weekDay = solar.getWeek();
            return weekDay !== 0 && weekDay !== 6;
        };

        // 1. 获取本月剩余工作日 (包含今天)
        let remainingWorkdaysMonth = 0;
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = day; d <= daysInMonth; d++) {
            const solar = Solar.fromYmd(year, month, d);
            const holiday = HolidayUtil.getHoliday(year, month, d);

            let isWork = false;
            if (holiday) {
                if (holiday.isWork()) isWork = true;
            } else {
                const weekDay = solar.getWeek();
                if (weekDay !== 0 && weekDay !== 6) isWork = true;
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
});
