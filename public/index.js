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

        // 1. 获取本月剩余工作日
        let remainingWorkdaysMonth = 0;
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = day + 1; d <= daysInMonth; d++) {
            const solar = Solar.fromYmd(year, month, d);
            const holiday = HolidayUtil.getHoliday(year, month, d);

            if (holiday) {
                if (holiday.isWork()) remainingWorkdaysMonth++;
            } else {
                const weekDay = solar.getWeek();
                if (weekDay !== 0 && weekDay !== 6) remainingWorkdaysMonth++;
            }
        }
        const monthEl = document.getElementById('remaining-workdays-month');
        if (monthEl) monthEl.innerText = remainingWorkdaysMonth;

        // 2. 获取本年剩余工作日
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
        if (yearEl) yearEl.innerText = remainingWorkdaysYear;

        // 3. 距离下一个法定假期
        const holidays = HolidayUtil.getHolidays(year);
        const nextYearHolidays = HolidayUtil.getHolidays(year + 1);
        const allHolidays = [...holidays, ...nextYearHolidays];

        const todayYmd = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const futureHolidays = allHolidays.filter(h => !h.isWork() && h.getTarget() > todayYmd);

        if (futureHolidays.length > 0) {
            const next = futureHolidays[0];
            const targetDate = new Date(next.getTarget());
            const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

            const nextNameEl = document.getElementById('next-holiday-name');
            const nextDaysEl = document.getElementById('next-holiday-days');
            const heroNextEl = document.getElementById('hero-next-holiday');
            const toolStatusEl = document.getElementById('tool-holiday-status');

            if (nextNameEl) nextNameEl.innerText = next.getName();
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
