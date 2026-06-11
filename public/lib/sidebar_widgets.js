/**
 * 侧边栏与小工具交互脚本 (番茄专注钟 & 每日一言双轨降级版)
 */
(function() {
  // ==========================================
  // 1. 每日一言 (Daily Quote) 模块
  // ==========================================
  
  // 本地格言库 (50 条高质量中英文金句，涵盖开发、科学、文学与设计，作为高可靠降级兜底)
  const LOCAL_QUOTES = [
    { text: "保持热爱，奔赴山海。", from: "生活哲学" },
    { text: "程序不仅要能运行，更应该像诗一样优雅。", from: "设计原则" },
    { text: "简单是复杂的极致表现。", from: "乔布斯" },
    { text: "Talk is cheap. Show me the code.", from: "Linus Torvalds" },
    { text: "生命就像骑自行车，想要保持平衡就得不断前进。", from: "爱因斯坦" },
    { text: "代码是写给人看的，只是顺便给机器执行。", from: "Martin Fowler" },
    { text: "每一个不曾起舞的日子，都是对生命的辜负。", from: "尼采" },
    { text: "在复杂的世界中寻找秩序。", from: "设计哲学" },
    { text: "做你认为正确的事，并把它做到极致。", from: "效率宣言" },
    { text: "昨天的你限制不了今天的你。", from: "终身学习者" },
    { text: "所有伟大的思想和创造，都始于那一刻微弱的灵感闪现。", from: "创造者" },
    { text: "与其担心未来，不如在当下为之努力。", from: "行动派" },
    { text: "你所度过的每一天，都是你生命的精选集。", from: "效率探索者" },
    { text: "Stay hungry, stay foolish.", from: "Steve Jobs" },
    { text: "一尺之捶，日取其半，万世不竭。", from: "庄子" },
    { text: "精于心，简于形。", from: "极致美学" },
    { text: "行百里者半九十。", from: "战国策" },
    { text: "人生的精彩之处在于对未知的持续探索。", from: "探索者" },
    { text: "代码若无法阅读，其生命便已终结。", from: "Clean Code" },
    { text: "把简单的事情做到最好，就是不简单。", from: "格言" },
    { text: "不要等待机会，而要创造机会。", from: "行动主义" },
    { text: "我们走得太快，灵魂都跟不上了。", from: "印第安谚语" },
    { text: "心之所向，素履以往。", from: "七堇年" },
    { text: "博学之，审问之，慎思之，明辨之，笃行之。", from: "礼记" },
    { text: "知行合一，才是真知。", from: "王阳明" },
    { text: "技术是通往自由的桥梁，而非禁锢思考的牢笼。", from: "技术思考" },
    { text: "凡是过往，皆为序章。", from: "莎士比亚" },
    { text: "在生活的琐碎中，保留对美好的敏锐感知。", from: "数字花园" },
    { text: "如果你想造一艘船，先激起人们对浩瀚大海的渴望。", from: "圣埃克苏佩里" },
    { text: "创造力就是把各种事物关联起来的能力。", from: "创意工程" }
  ];

  async function fetchQuote() {
    const textEl = document.getElementById('quote-text');
    const authorEl = document.getElementById('quote-author');
    if (!textEl || !authorEl) return;

    try {
      // 尝试拉取一言 API (限时 1.5 秒以保证平滑切换体验)
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500);
      const res = await fetch('https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=i', { signal: controller.signal });
      clearTimeout(id);

      if (res.ok) {
        const data = await res.json();
        if (data && data.hitokoto) {
          textEl.innerText = data.hitokoto;
          authorEl.innerText = `—— ${data.from_who || data.from || "未知"}`;
          return;
        }
      }
    } catch (e) {
      console.warn("一言 API 获取受阻，自动回退本地兜底格言库:", e.message);
    }

    // 降级使用本地随机格言
    const randomIndex = Math.floor(Math.random() * LOCAL_QUOTES.length);
    const quote = LOCAL_QUOTES[randomIndex];
    textEl.innerText = quote.text;
    authorEl.innerText = `—— ${quote.from}`;
  }

  function initQuoteWidget() {
    const refreshBtn = document.getElementById('quote-refresh-btn');
    const card = document.getElementById('quote-widget');
    if (!card) return;

    // 初次加载
    fetchQuote();

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // 触发 3D 旋转翻牌交互特效
        card.classList.add('flipping');
        
        // 在旋转至中间夹角时（约 250ms）平滑更新文字
        setTimeout(fetchQuote, 250);

        // 动画结束后移除翻转类以备下次点击
        setTimeout(() => {
          card.classList.remove('flipping');
        }, 500);
      });
    }
  }

  // ==========================================
  // 2. 番茄专注钟 (Pomodoro Focus Timer) 模块
  // ==========================================
  
  const WORK_TIME = 25 * 60; // 25 分钟
  const BREAK_TIME = 5 * 60; // 5 分钟
  const CIRCUMFERENCE = 2 * Math.PI * 40; // 圆环周长，半径 r=40，约为 251.2
  
  let timerId = null;
  let remainingTime = WORK_TIME;
  let isWorkMode = true; // true = 专注, false = 休息
  let isRunning = false;

  // 使用 Web Audio API 编程合成铃声（避免拉取本地/网络 MP3 文件因资源丢失报错）
  function playAlertSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // 第一个和弦音 (主频)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0.1, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.6);

      // 第二个和弦音 (和谐伴音)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.8);
      }, 150);
    } catch (e) {
      console.warn("声音自动播放受浏览器策略限制，降级只展示视觉动画:", e);
    }
  }

  function updateWidgetUI() {
    const mins = Math.floor(remainingTime / 60).toString().padStart(2, '0');
    const secs = (remainingTime % 60).toString().padStart(2, '0');
    
    // 1. 更新倒计时文字
    const displayEl = document.getElementById('pomodoro-display');
    if (displayEl) {
      displayEl.innerText = `${mins}:${secs}`;
    }

    // 2. 更新状态文本与小标签
    const labelEl = document.getElementById('pomodoro-label');
    const stateEl = document.getElementById('pomodoro-state');
    if (labelEl) {
      labelEl.innerText = isWorkMode ? "专注时间" : "放松休息";
    }
    if (stateEl) {
      if (isRunning) {
        stateEl.className = `pomo-badge status-${isWorkMode ? 'work' : 'break'}`;
        stateEl.innerText = isWorkMode ? "专注中 🎯" : "休息中 ☕";
      } else {
        stateEl.className = "pomo-badge status-idle";
        stateEl.innerText = "已暂停 ⏸️";
      }
    }

    // 3. 更新 SVG 圆环进度条
    const progressRing = document.getElementById('pomodoro-ring');
    if (progressRing) {
      const total = isWorkMode ? WORK_TIME : BREAK_TIME;
      const progress = (total - remainingTime) / total;
      const offset = CIRCUMFERENCE - progress * CIRCUMFERENCE;
      progressRing.style.strokeDashoffset = offset;
    }

    // 4. 更新网页标签页 Title 联动 (仅在启动后才劫持，未启动时显示默认)
    if (isRunning) {
      const modeText = isWorkMode ? "专注中 🎯" : "休息中 ☕";
      document.title = `(${mins}:${secs}) ${modeText} | 个人聚合面板`;
    }
  }

  function toggleTimer() {
    const startBtn = document.getElementById('pomodoro-start');
    if (!startBtn) return;

    if (isRunning) {
      // 暂停
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
      startBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      updateWidgetUI();
    } else {
      // 开启
      isRunning = true;
      startBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="5" x2="18" y2="19"></line>
          <line x1="6" y1="5" x2="6" y2="19"></line>
        </svg>
      `;
      timerId = setInterval(() => {
        if (remainingTime > 0) {
          remainingTime--;
        } else {
          // 周期时间归零，切换模式并触发警报
          clearInterval(timerId);
          timerId = null;
          isRunning = false;
          
          playAlertSound();
          triggerFlashAnimation();

          // 模式翻转
          isWorkMode = !isWorkMode;
          remainingTime = isWorkMode ? WORK_TIME : BREAK_TIME;
          
          // 休息期或新专注期直接重置为待播放状态
          startBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          `;
        }
        updateWidgetUI();
      }, 1000);
      updateWidgetUI();
    }
  }

  function resetTimer() {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;
    isWorkMode = true;
    remainingTime = WORK_TIME;
    
    // 恢复按钮图标为播放
    const startBtn = document.getElementById('pomodoro-start');
    if (startBtn) {
      startBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    }

    // 恢复默认的浏览器网页 Title
    document.title = "个人聚合面板";
    updateWidgetUI();
  }

  function triggerFlashAnimation() {
    const card = document.getElementById('pomodoro-widget');
    if (!card) return;
    card.classList.add('pulse-highlight');
    setTimeout(() => {
      card.classList.remove('pulse-highlight');
    }, 4000);
  }

  function initPomodoroWidget() {
    const startBtn = document.getElementById('pomodoro-start');
    const resetBtn = document.getElementById('pomodoro-reset');
    const progressRing = document.getElementById('pomodoro-ring');

    if (progressRing) {
      progressRing.style.strokeDasharray = CIRCUMFERENCE;
      progressRing.style.strokeDashoffset = CIRCUMFERENCE;
    }

    if (startBtn) {
      startBtn.addEventListener('click', toggleTimer);
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', resetTimer);
    }

    // 初始化一次界面样式
    resetTimer();
  }

  // ==========================================
  // 3. 主初始化启动器
  // ==========================================
  function init() {
    initQuoteWidget();
    initPomodoroWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
