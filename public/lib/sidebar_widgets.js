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

  const QUOTE_STATE_KEY = 'daily_quote_state_v1';

  let quoteState = {
    source: 'api', // api, local, favorite, custom
    categories: ['a', 'b', 'c', 'd', 'i'],
    favorites: [],
    customs: [],
    history: [],
    historyIndex: -1
  };

  let currentShownQuote = { text: '', from: '' };

  // Toast 弹出提醒
  function showToast(message, icon = '✨') {
    const container = document.getElementById('quote-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'quote-toast';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2200);
  }

  // 加载本地持久化配置
  function loadConfigs() {
    const saved = localStorage.getItem(QUOTE_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.source) quoteState.source = parsed.source;
        if (parsed.categories) quoteState.categories = parsed.categories;
        
        // 强制数组类型校验，防止旧有或外置的单对象形式产生崩坏
        if (parsed.favorites && Array.isArray(parsed.favorites)) {
          quoteState.favorites = parsed.favorites;
        } else {
          quoteState.favorites = [];
        }
        if (parsed.customs && Array.isArray(parsed.customs)) {
          quoteState.customs = parsed.customs;
        } else {
          quoteState.customs = [];
        }
      } catch (e) {
        console.warn("读取一言配置数据损坏，自动重置默认值:", e);
      }
    }

    // 联动表单 UI 状态
    const sourceSelect = document.getElementById('quote-source-select');
    if (sourceSelect) sourceSelect.value = quoteState.source;

    const checkboxes = document.querySelectorAll('input[name="quote-cat"]');
    checkboxes.forEach(cb => {
      cb.checked = quoteState.categories.includes(cb.value);
    });

    updateSettingRowVisibility(quoteState.source);
  }

  // 保存本地持久化配置
  function saveConfigs() {
    const toSave = {
      source: quoteState.source,
      categories: quoteState.categories,
      favorites: quoteState.favorites,
      customs: quoteState.customs
    };
    localStorage.setItem(QUOTE_STATE_KEY, JSON.stringify(toSave));
  }

  // 控制表单字段显隐
  function updateSettingRowVisibility(source) {
    const catRow = document.getElementById('quote-categories-row');
    const customRow = document.getElementById('quote-custom-row');
    if (catRow) catRow.style.display = (source === 'api') ? 'flex' : 'none';
    if (customRow) customRow.style.display = (source === 'custom') ? 'flex' : 'none';
  }

  // 渲染已收藏名言列表并绑定列表内直接取消收藏交互
  function renderFavList() {
    const favListEl = document.getElementById('quote-fav-list');
    if (!favListEl) return;

    favListEl.innerHTML = '';

    if (quoteState.favorites.length === 0) {
      favListEl.innerHTML = `<div class="quote-fav-empty">暂无收藏的灵感。<br>在正面点击 ❤️ 按钮，收藏你喜欢的金句吧 ✨</div>`;
      return;
    }

    quoteState.favorites.forEach((fav, index) => {
      const item = document.createElement('div');
      item.className = 'quote-fav-item';
      item.innerHTML = `
        <div class="quote-fav-item-content">
          <span class="quote-fav-item-text">“${fav.text}”</span>
          <span class="quote-fav-item-author">—— ${fav.from}</span>
        </div>
        <button class="quote-fav-item-delete" title="取消收藏">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;

      // 绑定单行删除事件 (含渐隐收缩过渡动画)
      const deleteBtn = item.querySelector('.quote-fav-item-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          item.classList.add('removing');
          setTimeout(() => {
            quoteState.favorites.splice(index, 1);
            saveConfigs();
            renderFavList();
            updateQuoteWidgetUI();
            showToast("已取消收藏", "💔");
          }, 300);
        });
      }

      favListEl.appendChild(item);
    });
  }

  // 更新正面图标的激活状态
  function updateQuoteWidgetUI() {
    const favBtn = document.getElementById('quote-favorite-btn');
    const prevBtn = document.getElementById('quote-history-btn');
    if (!favBtn || !prevBtn) return;

    // 清洗字符（去除首尾空格以及全部换行符），防止 API 返回隐式空格字符集导致比对断裂
    const cleanCurrent = (currentShownQuote.text || "").trim().replace(/\s+/g, '');
    const isFav = quoteState.favorites.some(q => (q.text || "").trim().replace(/\s+/g, '') === cleanCurrent);

    if (isFav) {
      favBtn.classList.add('active-fav');
      favBtn.title = "取消收藏";
      favBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="heart-icon">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
    } else {
      favBtn.classList.remove('active-fav');
      favBtn.title = "收藏一言";
      favBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="heart-icon">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
    }

    // 历史回溯按钮是否可用
    prevBtn.disabled = (quoteState.historyIndex <= 0);
  }

  // 核心加载格言函数
  async function fetchQuote(isBackwards = false) {
    const textEl = document.getElementById('quote-text');
    const authorEl = document.getElementById('quote-author');
    if (!textEl || !authorEl) return;

    let nextQuote = null;

    if (isBackwards) {
      // 历史回退
      if (quoteState.historyIndex > 0) {
        quoteState.historyIndex--;
        nextQuote = quoteState.history[quoteState.historyIndex];
      }
    } else {
      // 获取新句子
      if (quoteState.source === 'api') {
        try {
          // 限制 1.5s 超时
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 1500);
          
          const catQuery = quoteState.categories.map(c => `c=${c}`).join('&');
          const res = await fetch(`https://v1.hitokoto.cn/?${catQuery || 'c=a'}`, { signal: controller.signal });
          clearTimeout(id);

          if (res.ok) {
            const data = await res.json();
            if (data && data.hitokoto) {
              nextQuote = {
                text: data.hitokoto,
                from: data.from_who || data.from || "未知"
              };
            }
          }
        } catch (e) {
          console.warn("网络 API 异常，自动兜底本地名言库:", e.message);
        }

        if (!nextQuote) {
          const randomIndex = Math.floor(Math.random() * LOCAL_QUOTES.length);
          const q = LOCAL_QUOTES[randomIndex];
          nextQuote = { text: q.text, from: q.from };
        }
      } else if (quoteState.source === 'local') {
        const randomIndex = Math.floor(Math.random() * LOCAL_QUOTES.length);
        const q = LOCAL_QUOTES[randomIndex];
        nextQuote = { text: q.text, from: q.from };
      } else if (quoteState.source === 'favorite') {
        if (quoteState.favorites.length > 0) {
          const randomIndex = Math.floor(Math.random() * quoteState.favorites.length);
          nextQuote = quoteState.favorites[randomIndex];
        } else {
          nextQuote = { text: "暂无收藏的灵感。点击 ❤️ 按钮收藏正面金句吧！", from: "温馨提示" };
        }
      } else if (quoteState.source === 'custom') {
        if (quoteState.customs.length > 0) {
          const randomIndex = Math.floor(Math.random() * quoteState.customs.length);
          nextQuote = quoteState.customs[randomIndex];
        } else {
          nextQuote = { text: "暂无自定义录入。请在设置背面输入并添加哦！", from: "温馨提示" };
        }
      }

      if (nextQuote) {
        // 如果是从中途历史点开始刷新，切断之后的历史链条
        if (quoteState.historyIndex < quoteState.history.length - 1) {
          quoteState.history = quoteState.history.slice(0, quoteState.historyIndex + 1);
        }
        quoteState.history.push(nextQuote);
        if (quoteState.history.length > 10) {
          quoteState.history.shift();
        }
        quoteState.historyIndex = quoteState.history.length - 1;
      }
    }

    if (nextQuote) {
      currentShownQuote = nextQuote;
      textEl.innerText = nextQuote.text;
      authorEl.innerText = `—— ${nextQuote.from}`;
      updateQuoteWidgetUI();
    }
  }

  function initQuoteWidget() {
    const card = document.getElementById('quote-widget');
    const refreshBtn = document.getElementById('quote-refresh-btn');
    const prevBtn = document.getElementById('quote-history-btn');
    const favBtn = document.getElementById('quote-favorite-btn');
    const copyBtn = document.getElementById('quote-copy-btn');
    
    const settingsBtn = document.getElementById('quote-settings-btn');
    const settingsCloseBtn = document.getElementById('quote-settings-close');
    const sourceSelect = document.getElementById('quote-source-select');
    const categoryCheckboxes = document.querySelectorAll('input[name="quote-cat"]');
    
    const customAddBtn = document.getElementById('quote-custom-add-btn');
    const customTextIn = document.getElementById('quote-custom-text');
    const customAuthorIn = document.getElementById('quote-custom-author');

    if (!card) return;

    // 1. 初始化读取配置
    loadConfigs();

    // 2. 首次拉取
    fetchQuote();

    // 3. 事件绑定
    // A. 刷新名言 (带翻牌动画)
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const frontEl = card.querySelector('.quote-front');
        if (frontEl) {
          frontEl.classList.add('flipping');
          setTimeout(() => { fetchQuote(false); }, 250);
          setTimeout(() => { frontEl.classList.remove('flipping'); }, 500);
        } else {
          fetchQuote(false);
        }
      });
    }

    // B. 历史上一句
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        fetchQuote(true);
      });
    }

    // C. 复制一言
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!currentShownQuote.text) return;
        const textToCopy = `“${currentShownQuote.text}” —— ${currentShownQuote.from}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast("已复制灵感到剪贴板 ✨", "📋");
        }).catch(err => {
          console.error("复制失败:", err);
          showToast("复制失败，请手动选择复制", "❌");
        });
      });
    }

    // D. 收藏控制
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        if (currentShownQuote.from === "温馨提示") {
          showToast("此提示信息无需收藏哦", "💡");
          return;
        }

        const cleanCurrent = (currentShownQuote.text || "").trim().replace(/\s+/g, '');
        const favIndex = quoteState.favorites.findIndex(q => (q.text || "").trim().replace(/\s+/g, '') === cleanCurrent);
        
        if (favIndex > -1) {
          // 取消收藏
          quoteState.favorites.splice(favIndex, 1);
          saveConfigs();
          updateQuoteWidgetUI();
          showToast("已取消收藏", "💔");
        } else {
          // 收藏
          quoteState.favorites.push({
            text: currentShownQuote.text,
            from: currentShownQuote.from
          });
          saveConfigs();
          updateQuoteWidgetUI();
          showToast("灵感已收录至收藏夹！", "❤️");
        }
      });
    }

    // E. 翻面交互
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        card.classList.add('is-flipped');
      });
    }

    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', () => {
        card.classList.remove('is-flipped');
        // 返回正面时根据选定的配置自动刷新一发
        fetchQuote(false);
      });
    }

    // F. 设置表单响应
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        quoteState.source = e.target.value;
        updateSettingRowVisibility(quoteState.source);
        saveConfigs();
      });
    }

    categoryCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        quoteState.categories = Array.from(categoryCheckboxes)
          .filter(c => c.checked)
          .map(c => c.value);
        saveConfigs();
      });
    });

    // G. 自定义添加
    if (customAddBtn && customTextIn && customAuthorIn) {
      customAddBtn.addEventListener('click', () => {
        const textVal = customTextIn.value.trim();
        const authorVal = customAuthorIn.value.trim() || "个人原创";

        if (!textVal) {
          showToast("录入格言不能为空哦", "⚠️");
          return;
        }

        quoteState.customs.push({
          text: textVal,
          from: authorVal
        });
        saveConfigs();

        customTextIn.value = '';
        customAuthorIn.value = '';
        showToast("成功添加自定义名言 ✨", "✍️");
      });
    }

    // H. 收藏夹 Modal 弹窗控制
    const libraryBtn = document.getElementById('quote-library-btn');
    const libraryModal = document.getElementById('quote-library-modal');
    const libraryCloseBtn = document.getElementById('quote-library-close');

    if (libraryBtn && libraryModal) {
      libraryBtn.addEventListener('click', () => {
        renderFavList();
        libraryModal.style.display = 'flex';
        libraryModal.offsetHeight; // 触发重绘以执行 CSS 过渡
        libraryModal.classList.add('active');
      });
    }

    const closeLibraryModal = () => {
      if (libraryModal && libraryModal.classList.contains('active')) {
        libraryModal.classList.remove('active');
        setTimeout(() => {
          libraryModal.style.display = 'none';
        }, 350);
      }
    };

    if (libraryCloseBtn) {
      libraryCloseBtn.addEventListener('click', closeLibraryModal);
    }

    if (libraryModal) {
      libraryModal.addEventListener('click', (e) => {
        if (e.target === libraryModal) {
          closeLibraryModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLibraryModal();
      }
    });

    window.addEventListener('quote-configs-updated', () => {
      loadConfigs();
      updateQuoteWidgetUI();
    });
  }

  // ==========================================
  // 2. 番茄专注钟 (Pomodoro Focus Timer) 模块
  // ==========================================
  
  const CIRCUMFERENCE = 2 * Math.PI * 40; // 圆环周长，半径 r=40，约为 251.2
  const STATE_KEY = 'pomo_state_v2';
  
  // 配置与运行状态变量
  let workDuration = 25 * 60;
  let shortBreakDuration = 5 * 60;
  let longBreakDuration = 15 * 60;
  let selectedSound = 'chord';
  let isNotifyEnabled = false;

  let timerId = null;
  let remainingTime = workDuration;
  let isWorkMode = true; // true = 专注, false = 休息
  let isLongBreak = false; // 是否是长休
  let isRunning = false;
  let sessionCount = 0; // 当前大周期内完成的专注次数 (0-4)

  // 1. 使用 Web Audio API 编程合成三种丰富提示音效，防止拉取外置 mp3 因资源缺失报错
  function playAlertSound(soundType) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (soundType === 'chime') {
        // 禅意铜钟：低频正弦基音辅以高频谐泛音，模拟古老铜钟的悠长余音
        const playTone = (freq, vol, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(vol, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duration);
        };
        playTone(180, 0.15, 2.5);
        playTone(360, 0.08, 2.0);
        playTone(540, 0.04, 1.5);
        playTone(720, 0.02, 1.0);
      } else if (soundType === 'beep') {
        // 科技嘀嘀：连续三声短促、清脆的高频科技提示音
        const playBeep = (delay, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + delay + duration - 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        playBeep(0, 0.12);
        playBeep(0.18, 0.12);
        playBeep(0.36, 0.12);
      } else {
        // 清脆和弦：E5 + A5 的快乐二重和弦
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain1.gain.setValueAtTime(0.1, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.6);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880, ctx.currentTime);
          gain2.gain.setValueAtTime(0.12, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.8);
        }, 150);
      }
    } catch (e) {
      console.warn("音频播放受限制或环境出错，仅执行视觉通知:", e);
    }
  }

  // 2. 发送系统桌面通知 (Notification API)
  function sendSystemNotification(title, body) {
    if (isNotifyEnabled && window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23bf5b32"><circle cx="12" cy="12" r="10"/></svg>'
        });
      } catch (e) {
        console.warn("系统通知弹出失败:", e);
      }
    }
  }

  // 3. 本地存储配置读取与写入
  function loadConfigs() {
    const savedWork = localStorage.getItem('pomo_config_work');
    const savedBreak = localStorage.getItem('pomo_config_short');
    const savedLong = localStorage.getItem('pomo_config_long');
    const savedSound = localStorage.getItem('pomo_config_sound');
    const savedNotify = localStorage.getItem('pomo_config_notify');

    if (savedWork) workDuration = parseInt(savedWork) * 60;
    if (savedBreak) shortBreakDuration = parseInt(savedBreak) * 60;
    if (savedLong) longBreakDuration = parseInt(savedLong) * 60;
    if (savedSound) selectedSound = savedSound;
    if (savedNotify) isNotifyEnabled = (savedNotify === 'true');

    // 同步到设置面板 UI 控件
    const workSelect = document.getElementById('pomo-work-duration');
    const breakSelect = document.getElementById('pomo-break-duration');
    const longSelect = document.getElementById('pomo-long-break-duration');
    const soundSelect = document.getElementById('pomo-sound-select');
    const notifyCheckbox = document.getElementById('pomo-notify-toggle');

    if (workSelect) workSelect.value = savedWork || '25';
    if (breakSelect) breakSelect.value = savedBreak || '5';
    if (longSelect) longSelect.value = savedLong || '15';
    if (soundSelect) soundSelect.value = selectedSound;
    if (notifyCheckbox) notifyCheckbox.checked = isNotifyEnabled;
  }

  function saveConfigs() {
    const workSelect = document.getElementById('pomo-work-duration');
    const breakSelect = document.getElementById('pomo-break-duration');
    const longSelect = document.getElementById('pomo-long-break-duration');
    const soundSelect = document.getElementById('pomo-sound-select');
    const notifyCheckbox = document.getElementById('pomo-notify-toggle');

    if (workSelect) {
      workDuration = parseInt(workSelect.value) * 60;
      localStorage.setItem('pomo_config_work', workSelect.value);
    }
    if (breakSelect) {
      shortBreakDuration = parseInt(breakSelect.value) * 60;
      localStorage.setItem('pomo_config_short', breakSelect.value);
    }
    if (longSelect) {
      longBreakDuration = parseInt(longSelect.value) * 60;
      localStorage.setItem('pomo_config_long', longSelect.value);
    }
    if (soundSelect) {
      selectedSound = soundSelect.value;
      localStorage.setItem('pomo_config_sound', selectedSound);
    }
    if (notifyCheckbox) {
      isNotifyEnabled = notifyCheckbox.checked;
      localStorage.setItem('pomo_config_notify', isNotifyEnabled ? 'true' : 'false');
    }
  }

  // 4. 运行状态保存与无缝时间差恢复
  function saveCurrentState() {
    const state = {
      isWorkMode,
      isLongBreak,
      sessionCount,
      remainingTime,
      isRunning,
      lastActiveTime: Date.now()
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function restoreState() {
    loadConfigs(); // 先确保最新配置被加载进来

    const savedStateStr = localStorage.getItem(STATE_KEY);
    if (!savedStateStr) {
      // 无存档状态，使用当前配置初始化
      remainingTime = workDuration;
      isWorkMode = true;
      isLongBreak = false;
      isRunning = false;
      sessionCount = 0;
      return;
    }

    try {
      const state = JSON.parse(savedStateStr);
      isWorkMode = state.isWorkMode;
      isLongBreak = state.isLongBreak;
      sessionCount = state.sessionCount || 0;
      remainingTime = state.remainingTime;
      isRunning = state.isRunning;

      const elapsed = Math.floor((Date.now() - state.lastActiveTime) / 1000);

      if (isRunning && elapsed > 0) {
        if (elapsed >= remainingTime) {
          // 离线时间足够跑完当前倒计时
          isRunning = false;
          // 状态进行翻转
          if (isWorkMode) {
            sessionCount++;
            if (sessionCount >= 4) {
              isWorkMode = false;
              isLongBreak = true;
              remainingTime = longBreakDuration;
            } else {
              isWorkMode = false;
              isLongBreak = false;
              remainingTime = shortBreakDuration;
            }
            sendSystemNotification("专注完成！", `您已成功完成专注，现在开始休息吧。`);
          } else {
            if (isLongBreak) sessionCount = 0;
            isWorkMode = true;
            isLongBreak = false;
            remainingTime = workDuration;
            sendSystemNotification("休息结束！", `休息已结束，是时候开始新一轮的高效专注了。`);
          }
          saveCurrentState();
        } else {
          // 没走完，扣除流逝秒数，继续定时器运行
          remainingTime -= elapsed;
          startTickTimer();
        }
      }
    } catch (e) {
      console.warn("状态存档损坏，恢复为默认设置:", e);
      remainingTime = workDuration;
      isWorkMode = true;
      isLongBreak = false;
      isRunning = false;
      sessionCount = 0;
    }
  }

  // 5. 循环进度小圆点 (Session Dots) 渲染
  function updateSessionDots() {
    const dots = document.querySelectorAll('#pomodoro-sessions .pomo-dot');
    dots.forEach((dot, index) => {
      // index 是 0, 1, 2, 3，代表第 1, 2, 3, 4 个圆点
      dot.className = 'pomo-dot'; // 清空

      if (index < sessionCount) {
        // 完成的
        dot.classList.add('completed');
      } else if (index === sessionCount) {
        // 当前专注进行中
        if (isWorkMode && isRunning) {
          dot.classList.add('active');
        }
      }
    });
  }

  // 6. UI 页面数据更新
  function updateWidgetUI() {
    const mins = Math.floor(remainingTime / 60).toString().padStart(2, '0');
    const secs = (remainingTime % 60).toString().padStart(2, '0');

    // 1. 更新倒计时文字
    const displayEl = document.getElementById('pomodoro-display');
    if (displayEl) {
      displayEl.innerText = `${mins}:${secs}`;
    }

    // 2. 更新状态文本与徽标
    const labelEl = document.getElementById('pomodoro-label');
    const stateEl = document.getElementById('pomodoro-state');
    const card = document.getElementById('pomodoro-widget');

    if (labelEl) {
      if (isWorkMode) {
        labelEl.innerText = "专注时间";
      } else if (isLongBreak) {
        labelEl.innerText = "放松长休";
      } else {
        labelEl.innerText = "短时休息";
      }
    }

    // 更新外层容器卡片的状态类，利于 CSS 主题控制
    if (card) {
      card.classList.remove('mode-work', 'mode-break', 'mode-longbreak');
      if (isWorkMode) {
        card.classList.add('mode-work');
      } else if (isLongBreak) {
        card.classList.add('mode-longbreak');
      } else {
        card.classList.add('mode-break');
      }
    }

    if (stateEl) {
      stateEl.className = "pomo-badge"; // 清空类名重新设置
      if (isRunning) {
        if (isWorkMode) {
          stateEl.classList.add('status-work');
          stateEl.innerText = "专注中 🎯";
        } else if (isLongBreak) {
          stateEl.classList.add('status-longbreak');
          stateEl.innerText = "长休中 🌊";
        } else {
          stateEl.classList.add('status-break');
          stateEl.innerText = "休息中 ☕";
        }
      } else {
        stateEl.classList.add('status-idle');
        if (remainingTime === (isWorkMode ? workDuration : (isLongBreak ? longBreakDuration : shortBreakDuration))) {
          stateEl.innerText = isWorkMode ? "准备专注 🎯" : (isLongBreak ? "准备长休 🌊" : "准备休息 ☕");
        } else {
          stateEl.innerText = "已暂停 ⏸️";
        }
      }
    }

    // 3. 更新 SVG 圆环进度条
    const progressRing = document.getElementById('pomodoro-ring');
    if (progressRing) {
      const total = isWorkMode ? workDuration : (isLongBreak ? longBreakDuration : shortBreakDuration);
      const progress = (total - remainingTime) / total;
      const offset = CIRCUMFERENCE - progress * CIRCUMFERENCE;
      progressRing.style.strokeDashoffset = offset;
    }

    // 4. 更新网页标签页 Title 联动 (仅在启动后才劫持)
    if (isRunning) {
      const modeText = isWorkMode ? "专注中 🎯" : (isLongBreak ? "长休中 🌊" : "休息中 ☕");
      document.title = `(${mins}:${secs}) ${modeText} | 个人聚合面板`;
    }

    // 5. 更新循环圆点
    updateSessionDots();
  }

  // 7. 定时器走字处理
  function startTickTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime--;
        saveCurrentState();
        updateWidgetUI();
      } else {
        // 时间到，处理转换
        clearInterval(timerId);
        timerId = null;
        isRunning = false;

        playAlertSound(selectedSound);
        triggerFlashAnimation();

        // 改变图标为播放
        const startBtn = document.getElementById('pomodoro-start');
        if (startBtn) {
          startBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          `;
        }

        // 状态交替
        if (isWorkMode) {
          sessionCount++;
          if (sessionCount >= 4) {
            isWorkMode = false;
            isLongBreak = true;
            remainingTime = longBreakDuration;
            sendSystemNotification("专注完成！", "您已累计完成4轮专注，享受一次深度的长休假期吧！");
          } else {
            isWorkMode = false;
            isLongBreak = false;
            remainingTime = shortBreakDuration;
            sendSystemNotification("专注完成！", "今日任务正顺利推进，开始进行短时放松休息吧。");
          }
        } else {
          if (isLongBreak) sessionCount = 0; // 长休完成，重置大循环
          isWorkMode = true;
          isLongBreak = false;
          remainingTime = workDuration;
          sendSystemNotification("休息结束！", "身心能量已充满，开始新一轮的高效专注！");
        }

        // 默认恢复暂停的 Title
        document.title = "个人聚合面板";
        saveCurrentState();
        updateWidgetUI();
      }
    }, 1000);
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
      // 恢复 Title 为聚合面板
      document.title = "个人聚合面板";
      saveCurrentState();
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
      startTickTimer();
      saveCurrentState();
      updateWidgetUI();
    }
  }

  function resetTimer() {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;

    // 根据当前的模式，恢复为该模式的时长，但保留当前的 session 计数
    if (isWorkMode) {
      remainingTime = workDuration;
    } else if (isLongBreak) {
      remainingTime = longBreakDuration;
    } else {
      remainingTime = shortBreakDuration;
    }

    const startBtn = document.getElementById('pomodoro-start');
    if (startBtn) {
      startBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    }

    document.title = "个人聚合面板";
    saveCurrentState();
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

  // 8. 主绑定与入口
  function initPomodoroWidget() {
    const startBtn = document.getElementById('pomodoro-start');
    const resetBtn = document.getElementById('pomodoro-reset');
    const progressRing = document.getElementById('pomodoro-ring');

    // 翻转按钮绑定
    const settingsBtn = document.getElementById('pomodoro-settings-btn');
    const settingsCloseBtn = document.getElementById('pomodoro-settings-close');
    const saveSettingsBtn = document.getElementById('pomodoro-save-settings');
    const card = document.getElementById('pomodoro-widget');
    const testSoundBtn = document.getElementById('pomo-sound-test');
    const notifyToggle = document.getElementById('pomo-notify-toggle');

    if (progressRing) {
      progressRing.style.strokeDasharray = CIRCUMFERENCE;
      progressRing.style.strokeDashoffset = CIRCUMFERENCE;
    }

    if (startBtn) startBtn.addEventListener('click', toggleTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    // 开启设置背面翻转
    if (settingsBtn && card) {
      settingsBtn.addEventListener('click', () => {
        card.classList.add('is-flipped');
      });
    }

    // 关闭设置背面翻转
    if (settingsCloseBtn && card) {
      settingsCloseBtn.addEventListener('click', () => {
        card.classList.remove('is-flipped');
      });
    }

    // 保存设置
    if (saveSettingsBtn && card) {
      saveSettingsBtn.addEventListener('click', () => {
        saveConfigs();
        // 动态应用时长：如果当前处于非运行状态，保存设置时直接将当前模式时长应用
        if (!isRunning) {
          if (isWorkMode) {
            remainingTime = workDuration;
          } else if (isLongBreak) {
            remainingTime = longBreakDuration;
          } else {
            remainingTime = shortBreakDuration;
          }
        }
        saveCurrentState();
        updateWidgetUI();
        card.classList.remove('is-flipped');
      });
    }

    // 试听声音
    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        const soundSelect = document.getElementById('pomo-sound-select');
        if (soundSelect) {
          playAlertSound(soundSelect.value);
        }
      });
    }

    // 通知权限申请监听
    if (notifyToggle) {
      notifyToggle.addEventListener('change', () => {
        if (notifyToggle.checked) {
          if (window.Notification) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().then(permission => {
                if (permission !== 'granted') {
                  notifyToggle.checked = false;
                  alert("系统通知权限已被拒绝，请在浏览器设置中启用。");
                }
              });
            } else if (Notification.permission === 'denied') {
              notifyToggle.checked = false;
              alert("系统通知权限已被拒绝，请在浏览器设置中启用。");
            }
          } else {
            notifyToggle.checked = false;
            alert("您的浏览器不支持系统桌面通知。");
          }
        }
      });
    }

    // 恢复先前状态或默认状态
    restoreState();
    updateWidgetUI();
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
