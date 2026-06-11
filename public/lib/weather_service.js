/**
 * 实时天气挂件服务 (防挂死极速响应版)
 * 负责定位获取、天气抓取、天气描述解析及动态 SVG 气象图标渲染
 */
(function() {
  const DEFAULT_LAT = 39.9042; // 默认北京纬度
  const DEFAULT_LNG = 116.4074; // 默认北京经度
  const DEFAULT_CITY = "北京市";

  // WMO 天气代码到中文及图标映射
  const WEATHER_MAP = {
    0: { text: "晴朗", class: "sunny", icon: getSunnyIcon },
    1: { text: "晴间多云", class: "cloudy", icon: getPartlyCloudyIcon },
    2: { text: "多云", class: "cloudy", icon: getPartlyCloudyIcon },
    3: { text: "阴天", class: "overcast", icon: getCloudyIcon },
    45: { text: "雾", class: "foggy", icon: getFoggyIcon },
    48: { text: "霾", class: "foggy", icon: getFoggyIcon },
    51: { text: "轻毛毛雨", class: "rainy", icon: getRainyIcon },
    53: { text: "毛毛雨", class: "rainy", icon: getRainyIcon },
    55: { text: "重毛毛雨", class: "rainy", icon: getRainyIcon },
    61: { text: "小雨", class: "rainy", icon: getRainyIcon },
    63: { text: "中雨", class: "rainy", icon: getRainyIcon },
    65: { text: "大雨", class: "rainy", icon: getHeavyRainyIcon },
    71: { text: "小雪", class: "snowy", icon: getSnowyIcon },
    73: { text: "中雪", class: "snowy", icon: getSnowyIcon },
    75: { text: "大雪", class: "snowy", icon: getSnowyIcon },
    80: { text: "小阵雨", class: "rainy", icon: getRainyIcon },
    81: { text: "阵雨", class: "rainy", icon: getHeavyRainyIcon },
    82: { text: "大阵雨", class: "rainy", icon: getHeavyRainyIcon },
    95: { text: "雷阵雨", class: "stormy", icon: getStormIcon }
  };

  // ==========================================
  // SVG 图标生成器（带微动效）
  // ==========================================
  function getSunnyIcon() {
    return `
      <svg class="weather-svg svg-sunny" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5" fill="var(--mustard)" stroke="var(--mustard)" class="sun-body"></circle>
        <g stroke="var(--mustard)" class="sun-rays">
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </g>
      </svg>
    `;
  }

  function getPartlyCloudyIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="15" cy="9" r="3" fill="var(--mustard)" stroke="var(--mustard)"></circle>
        <path d="M18 18.5a4 4 0 0 0-7.93-1.1A3.5 3.5 0 1 0 7.5 22h10.5a3 3 0 0 0 0-6z" fill="var(--paper-strong)" stroke="var(--muted)" stroke-linejoin="round" class="cloud-body"></path>
      </svg>
    `;
  }

  function getCloudyIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 15.5A3.5 3.5 0 0 0 15.5 12h-.07A4.5 4.5 0 0 0 6 14.5a3.5 3.5 0 1 0 .5 7H19a3.5 3.5 0 0 0 0-7z" fill="var(--paper-strong)" stroke="var(--muted)" stroke-linejoin="round" class="cloud-drift"></path>
      </svg>
    `;
  }

  function getFoggyIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="4" y1="8" x2="20" y2="8" stroke="var(--muted)"></line>
        <line x1="6" y1="12" x2="18" y2="12" stroke="var(--muted)"></line>
        <line x1="3" y1="16" x2="21" y2="16" stroke="var(--muted)"></line>
        <line x1="7" y1="20" x2="17" y2="20" stroke="var(--muted)"></line>
      </svg>
    `;
  }

  function getRainyIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 13.5a3.5 3.5 0 0 0-3.5-3.5h-.07A4.5 4.5 0 0 0 6 12.5a3.5 3.5 0 1 0 .5 7H19a3.5 3.5 0 0 0 0-7z" fill="var(--paper-strong)" stroke="var(--muted)" stroke-linejoin="round"></path>
        <g stroke="var(--teal)" stroke-linecap="round" class="rain-drops">
          <line x1="9" y1="19" x2="7" y2="22"></line>
          <line x1="13" y1="19" x2="11" y2="22"></line>
          <line x1="17" y1="19" x2="15" y2="22"></line>
        </g>
      </svg>
    `;
  }

  function getHeavyRainyIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 13.5a3.5 3.5 0 0 0-3.5-3.5h-.07A4.5 4.5 0 0 0 6 12.5a3.5 3.5 0 1 0 .5 7H19a3.5 3.5 0 0 0 0-7z" fill="var(--muted)" stroke="var(--muted)" stroke-linejoin="round"></path>
        <g stroke="var(--teal)" stroke-linecap="round" stroke-width="2.5" class="rain-drops-heavy">
          <line x1="8" y1="19" x2="6" y2="23"></line>
          <line x1="12" y1="19" x2="10" y2="23"></line>
          <line x1="16" y1="19" x2="14" y2="23"></line>
        </g>
      </svg>
    `;
  }

  function getSnowyIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 13.5a3.5 3.5 0 0 0-3.5-3.5h-.07A4.5 4.5 0 0 0 6 12.5a3.5 3.5 0 1 0 .5 7H19a3.5 3.5 0 0 0 0-7z" fill="var(--paper-strong)" stroke="var(--muted)" stroke-linejoin="round"></path>
        <g stroke="var(--teal)" stroke-linecap="round" class="snow-flakes">
          <circle cx="9" cy="19" r="1" fill="currentColor"></circle>
          <circle cx="13" cy="21" r="1.2" fill="currentColor"></circle>
          <circle cx="17" cy="19" r="1" fill="currentColor"></circle>
        </g>
      </svg>
    `;
  }

  function getStormIcon() {
    return `
      <svg class="weather-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 13.5a3.5 3.5 0 0 0-3.5-3.5h-.07A4.5 4.5 0 0 0 6 12.5a3.5 3.5 0 1 0 .5 7H19a3.5 3.5 0 0 0 0-7z" fill="var(--paper-strong)" stroke="var(--muted)" stroke-linejoin="round"></path>
        <path d="M13 17l-3 3h3l-1 3 4-4h-3z" fill="var(--accent)" stroke="var(--accent)" stroke-linejoin="round" class="lightning-bolt"></path>
      </svg>
    `;
  }

  // ==========================================
  // 超时 Fetch 辅助函数
  // ==========================================
  async function fetchWithTimeout(url, options = {}, timeout = 2000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  // ==========================================
  // 核心定位服务（三轨降级 + 后端代理获取）
  // ==========================================
  
  // 浏览器 GPS 定位 (限时 1.8秒，防挂死)
  async function getGPSLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      const timeoutId = setTimeout(() => {
        console.warn("GPS 定位强制超时");
        resolve(null);
      }, 1800);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            city: "本地位置"
          });
        },
        (err) => {
          clearTimeout(timeoutId);
          console.warn("GPS 定位失败或被拒:", err);
          resolve(null);
        },
        { timeout: 1500 }
      );
    });
  }

  // 第三方 IP 定位接口 (限时 1.5秒)
  async function getIPLocation() {
    try {
      const res = await fetchWithTimeout("https://ipapi.co/json/", {}, 1500);
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const cityEn = data.city || "";
          console.log("IP定位成功 (ipapi.co):", cityEn);
          return {
            lat: data.latitude,
            lng: data.longitude,
            city: cityEn || "本地网络"
          };
        }
      }
    } catch (e) {
      console.warn("ipapi.co IP 定位不可用:", e);
    }
    return null;
  }

  function getMockWeatherData() {
    const now = new Date();
    const dates = [];
    for (let i = 0; i <= 3; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }
    return {
      current_weather: {
        temperature: 24.5,
        weathercode: 1, // 晴间多云
        windspeed: 8.5,
        time: now.toISOString()
      },
      daily: {
        time: dates,
        weathercode: [1, 3, 61, 95], // 晴间多云, 阴天, 小雨, 雷阵雨
        temperature_2m_max: [27, 25, 23, 28],
        temperature_2m_min: [18, 17, 16, 19]
      }
    };
  }

  function updateWeatherUI(city, data, isMock = false) {
    const current = data.current_weather;
    const code = current.weathercode;
    const temp = Math.round(current.temperature);
    const weather = WEATHER_MAP[code] || { text: "未知天气", class: "cloudy", icon: getCloudyIcon };

    const widget = document.getElementById('weather-widget');
    if (!widget) return;

    // 附上当前天气状态样式类
    widget.className = `panel weather-card weather-${weather.class}`;

    // 获取未来三天的数据
    const daily = data.daily;
    let forecastHTML = '';
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    for (let i = 1; i <= 3; i++) {
      const dateStr = daily.time[i];
      const d = new Date(dateStr + 'T00:00:00');
      const wDay = weekdays[d.getDay()];
      const dayCode = daily.weathercode[i];
      const dayWeather = WEATHER_MAP[dayCode] || { text: "未知", icon: getCloudyIcon };
      const maxT = Math.round(daily.temperature_2m_max[i]);
      const minT = Math.round(daily.temperature_2m_min[i]);

      forecastHTML += `
        <div class="forecast-item">
          <span class="forecast-day">${wDay}</span>
          <span class="forecast-icon-sm">${dayWeather.icon()}</span>
          <span class="forecast-temp">${minT}° / ${maxT}°</span>
        </div>
      `;
    }

    const cityLabel = isMock ? `${city} (模拟)` : city;

    widget.innerHTML = `
      <div class="weather-main">
        <div class="weather-info-left">
          <div class="weather-city-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${cityLabel}</span>
          </div>
          <div class="weather-temp-row">
            <strong class="weather-temp">${temp}</strong>
            <span class="weather-unit">°C</span>
          </div>
          <span class="weather-status">${weather.text}</span>
        </div>
        <div class="weather-icon-right">
          ${weather.icon()}
        </div>
      </div>
      
      <!-- 未来三日趋势 (Hover时平滑展现) -->
      <div class="weather-forecast" id="weather-forecast">
        <div class="forecast-title">未来 3 日天气预报</div>
        <div class="forecast-list">
          ${forecastHTML}
        </div>
      </div>
    `;
  }

  // ==========================================
  // 初始化自启动 (全同源代理链路)
  // ==========================================
  async function init() {
    let loc = null;

    try {
      // 1. 尝试直接向同源后端发起默认天气定位代理请求
      console.log("首轨定位与天气代理获取中...");
      const res = await fetchWithTimeout("/api/weather_loc", {}, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          if (data.isLiveWeather && data.weatherData) {
            console.log("首轨代理天气获取成功:", data.city);
            updateWeatherUI(data.city, data.weatherData, false);
            return; // 成功并退出
          }
          // 如果后端仅定位到了经纬度但拉取气象失败了，记录定位数据以便后面重新代理
          loc = { lat: data.latitude, lng: data.longitude, city: data.city || DEFAULT_CITY };
        }
      }
    } catch (e) {
      console.warn("首轨代理请求失败:", e);
    }

    // 2. 如果首轨由于网络受阻或处于本地环境没有得到实时天气数据
    // 我们在客户端发起定位，并让服务器代理重新抓取
    if (!loc) {
      console.log("首轨无数据，尝试二轨：GPS定位");
      loc = await getGPSLocation();
    }

    if (!loc) {
      console.log("二轨GPS无数据，尝试三轨：IP定位");
      loc = await getIPLocation();
    }

    if (!loc) {
      console.log("定位轨道均不可用，启用北京兜底");
      loc = { lat: DEFAULT_LAT, lng: DEFAULT_LNG, city: DEFAULT_CITY };
    }

    // 3. 将新定位（或兜底北京）发给 Worker 进行代理抓取
    try {
      console.log(`正在请求后端代理抓取目标天气: ${loc.city} (${loc.lat}, ${loc.lng})`);
      const proxyUrl = `/api/weather_loc?latitude=${loc.lat}&longitude=${loc.lng}&city=${encodeURIComponent(loc.city)}`;
      const res = await fetchWithTimeout(proxyUrl, {}, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.isLiveWeather && data.weatherData) {
          console.log("天气代理请求成功:", data.city);
          updateWeatherUI(data.city, data.weatherData, false);
          return; // 成功并退出
        }
      }
    } catch (e) {
      console.warn("后端天气抓取代理均失效，启用高拟真本地模拟展示:", e);
    }

    // 4. 最终降级：展示模拟数据（在断网/网络受限环境下确保视觉完美呈现）
    const mockData = getMockWeatherData();
    updateWeatherUI(loc.city || "北京市", mockData, true);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
