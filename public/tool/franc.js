/**
 * GravityLingo - 自包含纯前端语言识别引擎
 * 基于 Unicode 字符集分析 + 常用词频/字母频率匹配
 * 零外部依赖，可直接通过 <script> 标签加载
 */
(function (root) {
  'use strict';

  // ========== 1. Unicode 脚本范围 definition ==========
  var SCRIPTS = {
    // 东亚
    Han:        /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g,
    Hiragana:   /[\u3040-\u309F]/g,
    Katakana:   /[\u30A0-\u30FF\u31F0-\u31FF]/g,
    Hangul:     /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g,
    // 南亚 / 东南亚
    Thai:       /[\u0E00-\u0E7F]/g,
    Devanagari: /[\u0900-\u097F]/g,
    Bengali:    /[\u0980-\u09FF]/g,
    Tamil:      /[\u0B80-\u0BFF]/g,
    Telugu:     /[\u0C00-\u0C7F]/g,
    Kannada:    /[\u0C80-\u0CFF]/g,
    Malayalam:  /[\u0D00-\u0D7F]/g,
    Myanmar:    /[\u1000-\u109F]/g,
    Khmer:      /[\u1780-\u17FF]/g,
    Lao:        /[\u0E80-\u0EFF]/g,
    Sinhala:    /[\u0D80-\u0DFF]/g,
    Gujarati:   /[\u0A80-\u0AFF]/g,
    Gurmukhi:   /[\u0A00-\u0A7F]/g,
    // 中东
    Arabic:     /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
    Hebrew:     /[\u0590-\u05FF\uFB1D-\uFB4F]/g,
    // 欧洲
    Cyrillic:   /[\u0400-\u04FF\u0500-\u052F]/g,
    Greek:      /[\u0370-\u03FF\u1F00-\u1FFF]/g,
    Georgian:   /[\u10A0-\u10FF\u2D00-\u2D2F]/g,
    Armenian:   /[\u0530-\u058F]/g,
    // 拉丁（最后匹配，作为 fallback）
    Latin:      /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g,
    // 其他
    Ethiopic:   /[\u1200-\u137F]/g,
    Tibetan:    /[\u0F00-\u0FFF]/g
  };

  // ========== 2. 脚本 → 语言映射（单脚本语言直接确定） ==========
  var SCRIPT_TO_LANG = {
    Hangul:     { code: 'kor', name: '韩语 (Korean)' },
    Thai:       { code: 'tha', name: '泰语 (Thai)' },
    Devanagari: { code: 'hin', name: '印地语 (Hindi)' },
    Bengali:    { code: 'ben', name: '孟加拉语 (Bengali)' },
    Tamil:      { code: 'tam', name: '泰米尔语 (Tamil)' },
    Telugu:     { code: 'tel', name: '泰卢固语 (Telugu)' },
    Kannada:    { code: 'kan', name: '卡纳达语 (Kannada)' },
    Malayalam:  { code: 'mal', name: '马拉雅拉姆语 (Malayalam)' },
    Myanmar:    { code: 'mya', name: '缅甸语 (Myanmar)' },
    Khmer:      { code: 'khm', name: '高棉语 (Khmer)' },
    Lao:        { code: 'lao', name: '老挝语 (Lao)' },
    Sinhala:    { code: 'sin', name: '僧伽罗语 (Sinhala)' },
    Gujarati:   { code: 'guj', name: '古吉拉特语 (Gujarati)' },
    Gurmukhi:   { code: 'pan', name: '旁遮普语 (Punjabi)' },
    Georgian:   { code: 'kat', name: '格鲁吉亚语 (Georgian)' },
    Armenian:   { code: 'hye', name: '亚美尼亚语 (Armenian)' },
    Greek:      { code: 'ell', name: '希腊语 (Greek)' },
    Hebrew:     { code: 'heb', name: '希伯来语 (Hebrew)' },
    Ethiopic:   { code: 'amh', name: '阿姆哈拉语 (Amharic)' },
    Tibetan:    { code: 'bod', name: '藏语 (Tibetan)' }
  };

  // ========== 3. 拉丁文语言的常用词库（用于区分同脚本语言） ==========
  var LATIN_WORD_PROFILES = {
    eng: {
      name: '英语 (English)',
      words: ['the','is','are','was','were','have','has','been','will','would','could','should',
              'not','but','and','with','this','that','from','they','what','which','there','their',
              'about','into','more','other','than','then','also','just','after','before','because',
              'where','when','while','only','very','some','most','each','every','both','such','well',
              'still','between','through','does','doing','during','without','however','another']
    },
    fra: {
      name: '法语 (French)',
      words: ['les','des','est','une','que','dans','qui','par','pour','sur','pas','sont','avec',
              'mais','cette','tout','elle','ont','ses','aux','aussi','comme','nous','vous','leur',
              'plus','fait','ces','peut','même','entre','autre','après','faire','bien','très',
              'encore','deux','où','être','sans','depuis','avant','sous','chez','donc','puis']
    },
    deu: {
      name: '德语 (German)',
      words: ['der','die','und','ist','ein','eine','den','das','von','mit','sich','des','auf',
              'für','nicht','auch','als','dem','aber','aus','noch','nach','bei','kann','nur',
              'über','wie','oder','wenn','zum','zur','hat','sind','wird','war','haben','diese',
              'mehr','werden','wurde','sein','schon','sehr','hier','dann','dort','unter','alle']
    },
    spa: {
      name: '西班牙语 (Spanish)',
      words: ['los','las','del','una','con','por','que','para','más','pero','como','todo',
              'sus','son','está','esta','también','fue','hay','muy','han','sin','sobre',
              'entre','desde','cuando','tiene','donde','ser','puede','hacer','otro','todos',
              'otro','nos','ese','después','estos','ella','cada','había','because','bien','ya']
    },
    por: {
      name: '葡萄牙语 (Portuguese)',
      words: ['que','não','com','uma','para','por','mais','como','dos','das','tem','foi',
              'são','sua','seu','mas','pelo','pela','nos','nas','esta','esse','essa','também',
              'muito','até','bem','pode','quando','onde','ser','ter','sobre','isso','ainda',
              'entre','depois','todos','mesmo','já','havia','cada','aos','fazer','outro','sem']
    },
    ita: {
      name: '意大利语 (Italian)',
      words: ['che','del','della','per','una','con','non','sono','gli','nel','nella','sul',
              'dalla','alle','anche','più','questo','questa','come','suo','sua','loro','tutto',
              'tra','fra','essere','stato','fatto','dopo','molto','ancora','già','così',
              'ogni','quando','dove','quale','tempo','sempre','poi','degli','delle','negli']
    },
    nld: {
      name: '荷兰语 (Dutch)',
      words: ['het','een','van','dat','zijn','wordt','voor','met','niet','aan','ook',
              'maar','werd','door','uit','nog','heeft','bij','wel','naar','dan','wat',
              'over','als','meer','deze','hun','daar','tot','kan','geen','zeer','veel',
              'worden','moet','onder','hier','waar','alleen','tussen','zonder','omcat','goed']
    },
    pol: {
      name: '波兰语 (Polish)',
      words: ['nie','jest','się','na','to','że','jak','ale','czy','tak','już','tym',
              'był','tylko','jego','jej','tego','być','przez','dla','są','ten','co',
              'do','po','ich','od','ze','może','bardzo','było','jeszcze','jednak','mnie',
              'gdzie','między','także','oraz','które','który','wszystkie','których','której']
    },
    tur: {
      name: '土耳其语 (Turkish)',
      words: ['bir','bu','için','ile','olan','gibi','çok','daha','var','kadar','sonra',
              'ama','ancak','hem','bazı','olarak','üzerinde','bunu','ayrıca','büyük',
              'küçük','yeni','eski','iyi','kötü','sadece','şimdi','zaman','nasıl','neden',
              'nerede','çünkü','önce','sonra','herkes','hiçbir','böyle','şöyle','değil']
    },
    vie: {
      name: '越南语 (Vietnamese)',
      words: ['của','là','và','các','trong','được','cho','một','có','này','đã','không',
              'những','với','từ','đến','theo','về','cũng','như','trên','người','tại',
              'nhiều','khi','sau','vào','rất','nhưng','bởi','qua','hoặc','hay','đó',
              'sẽ','lại','để','thì','phải','nên','còn','mình','họ','nào','ấy','bao']
    },
    ind: {
      name: '印尼语 (Indonesian)',
      words: ['yang','dan','ini','itu','dengan','untuk','dari','pada','tidak','ada',
              'akan','juga','atau','oleh','dia','mereka','sudah','bisa','kami','kita',
              'saya','telah','lebih','sebagai','lain','karena','hanya','antara','setelah',
              'masih','sangat','banyak','semua','sedang','bahwa','seperti','harus','baru']
    },
    swe: {
      name: '瑞典语 (Swedish)',
      words: ['och','att','det','som','för','med','den','har','var','inte','till',
              'ett','kan','från','men','alla','denna','hans','hade','bara','efter',
              'utan','vid','där','här','mycket','sina','eller','skulle','mot','han']
    },
    nor: {
      name: '挪威语 (Norwegian)',
      words: ['og','det','som','for','med','den','har','var','ikke','til',
              'kan','fra','men','alle','denne','hans','hadde','bare','etter',
              'uten','ved','der','her','mye','sine','eller','skulle','mot','han']
    },
    dan: {
      name: '丹麦语 (Danish)',
      words: ['og','det','som','for','med','den','har','var','ikke','til',
              'kan','fra','men','alle','denne','hans','havde','bare','efter',
              'uden','ved','der','her','mange','sine','eller','skulle','mod','han']
    },
    fin: {
      name: '芬兰语 (Finnish)',
      words: ['ja','on','ei','se','oli','kun','niin','kuin','myös','mutta',
              'tai','ovat','olla','hänen','tämä','siitä','kanssa','vain','ovat',
              'enemmän','paljon','hyvin','joka','nyt','jotta','koska','vielä','kaikki']
    },
    ron: {
      name: '罗马尼亚语 (Romanian)',
      words: ['și','care','este','din','pentru','lui','mai','sau','prin','fost',
              'sunt','dar','acest','când','doar','după','toate','avea','între',
              'foarte','acesta','poate','unor','aici','acolo','astfel','despre','fără']
    },
    ces: {
      name: '捷克语 (Czech)',
      words: ['je','na','se','że','jsou','byl','ale','jako','také','pro',
              'jeho','její','tento','která','které','který','bylo','být','jak',
              'jen','tak','ani','nebo','než','mezi','pod','nad','bez','velmi']
    },
    hun: {
      name: '匈牙利语 (Hungarian)',
      words: ['hogy','nem','egy','van','meg','azt','már','csak','volt',
              'mint','még','vagy','ami','aki','itt','ott','igen','nagy','kis',
              'jó','sok','minden','között','után','alatt','felett','mellett','szerint']
    }
  };

  // ========== 4. 西里尔文语言词库 ==========
  var CYRILLIC_WORD_PROFILES = {
    rus: {
      name: '俄语 (Russian)',
      words: ['что','это','как','так','нет','все','они','был','для','его','она','мне',
              'при','уже','без','или','когда','также','если','есть','были','очень',
              'после','может','только','между','через','более','будет','этого','этот']
    },
    ukr: {
      name: '乌克兰语 (Ukrainian)',
      words: ['що','це','як','так','ні','всі','вони','був','для','його','вона','мені',
              'при','вже','без','або','коли','також','якщо','є','були','дуже',
              'після','може','тільки','між','через','більш','буде','цього','цей']
    },
    bul: {
      name: '保加利亚语 (Bulgarian)',
      words: ['че','това','как','така','не','всички','те','бил','за','него','тя',
              'при','вече','без','или','когато','също','ако','са','бяха','много',
              'след','може','само','между','през','повече','ще','този']
    },
    srp: {
      name: '塞尔维亚语 (Serbian)',
      words: ['што','ово','како','тако','не','сви','они','био','за','његов','она',
              'при','већ','без','или','када','такође','ако','су','били','веома',
              'после','може','само','између','кроз','више','ће','овај']
    }
  };

  // ========== 5. 阿拉伯文语言词库 ==========
  var ARABIC_WORD_PROFILES = {
    arb: {
      name: '阿拉伯语 (Arabic)',
      words: ['في','من','على','إلى','عن','مع','هذا','هذه','التي','الذي','كان',
              'لقد','بين','حتى','أكثر','بعد','قبل','عند','تلك','ذلك','هناك',
              'كل','بعض','كما','لكن','أو','ثم','إذا','لأن','ليس','يمكن']
    },
    fas: {
      name: '波斯语 (Persian/Farsi)',
      words: ['در','از','به','که','این','با','را','است','برای','آن','یک',
              'هم','تا','بود','شد','می','خود','ها','بر','نیز','اما',
              'یا','اگر','هر','بین','پس','زیرا','همه','چون','نه']
    },
    urd: {
      name: '乌尔都语 (Urdu)',
      words: ['کے','میں','سے','کو','نے','की','ہے','اور','پر','یہ','وہ',
              'ایک','ہیں','ہو','تھا','تھی','بھی','لیے','جو','اس','کا',
              'نہیں','تو','مگر','لیکن','ساتھ','بعد','اگر','ہی','گا']
    }
  };

  // ========== 6. 核心识别函数 ==========

  /**
   * 计算文本中匹配某个正则的字符占比
   */
  function getScriptRatio(text, regex) {
    var matches = text.match(regex);
    return matches ? matches.length / text.length : 0;
  }

  /**
   * 获取文本主要使用的 Unicode 脚本
   */
  function detectScript(text) {
    var bestScript = null;
    var bestRatio = 0;

    for (var name in SCRIPTS) {
      if (SCRIPTS.hasOwnProperty(name)) {
        var ratio = getScriptRatio(text, SCRIPTS[name]);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestScript = name;
        }
      }
    }

    return { script: bestScript, ratio: bestRatio };
  }

  /**
   * 在同脚本语言中通过常用词匹配识别具体语言
   */
  function matchByWords(text, profiles) {
    var words = text.toLowerCase().replace(/[^\p{L}\s]/gu, '').split(/\s+/);
    var scores = [];

    for (var code in profiles) {
      if (profiles.hasOwnProperty(code)) {
        var profile = profiles[code];
        var score = 0;
        var matched = 0;
        for (var i = 0; i < words.length; i++) {
          var idx = profile.words.indexOf(words[i]);
          if (idx !== -1) {
            // 排名靠前的词权重更高
            score += (profile.words.length - idx) / profile.words.length;
            matched++;
          }
        }
        // 匹配率 = 匹配的单词数 / 总单词数
        var matchRatio = words.length > 0 ? matched / words.length : 0;
        scores.push({
          code: code,
          name: profile.name,
          score: score,
          matchRatio: matchRatio,
          confidence: Math.min(matchRatio * 100 * 2, 100) // 归一化为 0-100
        });
      }
    }

    scores.sort(function (a, b) { return b.score - a.score; });
    return scores;
  }

  /**
   * 通过独占字符区分西里尔语系语言（即使只有一个词也能工作）
   * 乌克兰语独有: і ї є ґ
   * 塞尔维亚语独有: ђ ј љ њ ћ џ
   * 保加利亚语特征: 频繁使用 ъ，且不含俄语独占字符 ы э ё
   * 俄语特征: ы э ё
   */
  function detectCyrillicByChars(text) {
    var lower = text.toLowerCase();

    // 乌克兰语独占字符
    if (/[іїєґ]/.test(lower)) {
      return { code: 'ukr', name: '乌克兰语 (Ukrainian)', confidence: 85 };
    }

    // 塞尔维亚语独占字符
    if (/[ђјљњћџ]/.test(lower)) {
      return { code: 'srp', name: '塞尔维亚语 (Serbian)', confidence: 85 };
    }

    // 俄语独占字符
    var hasRussianExclusive = /[ыэё]/.test(lower);

    // 保加利亚语特征：含 ъ 且无俄语独占字符
    var hasBulgarianSign = /ъ/.test(lower);

    if (hasBulgarianSign && !hasRussianExclusive) {
      return { code: 'bul', name: '保加利亚语 (Bulgarian)', confidence: 80 };
    }

    if (hasRussianExclusive) {
      return { code: 'rus', name: '俄语 (Russian)', confidence: 75 };
    }

    // 无法仅通过字符区分，返回 null 交给词频匹配
    return null;
  }

  /**
   * 通过独占字符区分阿拉伯文语系语言
   * 波斯语独有: پ چ ژ گ
   * 乌尔都语独有: ٹ ڈ ڑ ں ے
   */
  function detectArabicByChars(text) {
    // 乌尔都语独占字符
    if (/[ٹڈڑںے]/.test(text)) {
      return { code: 'urd', name: '乌尔都语 (Urdu)', confidence: 85 };
    }

    // 波斯语独占字符
    if (/[پچژگ]/.test(text)) {
      return { code: 'fas', name: '波斯语 (Persian/Farsi)', confidence: 85 };
    }

    return null;
  }

  /**
   * 中日文区分：日文通常混合平假名/片假名，纯汉字更可能是中文
   */
  function distinguishCJK(text) {
    var hanRatio = getScriptRatio(text, SCRIPTS.Han);
    var hiraRatio = getScriptRatio(text, SCRIPTS.Hiragana);
    var kataRatio = getScriptRatio(text, SCRIPTS.Katakana);
    var jpRatio = hiraRatio + kataRatio;

    if (jpRatio > 0.1 || (jpRatio > 0 && hanRatio < 0.5)) {
      return {
        code: 'jpn',
        name: '日语 (Japanese)',
        confidence: Math.min((jpRatio + hanRatio) * 100, 100)
      };
    }

    return {
      code: 'cmn',
      name: '简体中文 (Mandarin)',
      confidence: Math.min(hanRatio * 100 * 1.5, 100)
    };
  }

  // ========== 7. 浏览器语言映射 (BCP 47 → ISO 639-3) ==========
  var BCP47_TO_ISO3 = {
    'zh': 'cmn', 'zh-cn': 'cmn', 'zh-tw': 'cmn', 'zh-hk': 'cmn', 'zh-sg': 'cmn',
    'en': 'eng', 'en-us': 'eng', 'en-gb': 'eng', 'en-au': 'eng',
    'ja': 'jpn', 'ko': 'kor',
    'fr': 'fra', 'fr-fr': 'fra', 'fr-ca': 'fra',
    'de': 'deu', 'de-de': 'deu', 'de-at': 'deu',
    'es': 'spa', 'es-es': 'spa', 'es-mx': 'spa',
    'pt': 'por', 'pt-br': 'por', 'pt-pt': 'por',
    'it': 'ita', 'it-it': 'ita',
    'ru': 'rus', 'uk': 'ukr', 'bg': 'bul', 'sr': 'srp',
    'ar': 'arb', 'fa': 'fas', 'ur': 'urd',
    'th': 'tha', 'vi': 'vie', 'hi': 'hin',
    'nl': 'nld', 'pl': 'pol', 'tr': 'tur',
    'sv': 'swe', 'no': 'nor', 'da': 'dan', 'fi': 'fin',
    'ro': 'ron', 'cs': 'ces', 'hu': 'hun',
    'el': 'ell', 'he': 'heb', 'ka': 'kat', 'hy': 'hye',
    'bn': 'ben', 'ta': 'tam', 'te': 'tel', 'kn': 'kan',
    'ml': 'mal', 'my': 'mya', 'km': 'khm', 'lo': 'lao',
    'si': 'sin', 'gu': 'guj', 'pa': 'pan',
    'am': 'amh', 'bo': 'bod',
    'id': 'ind', 'ms': 'ind'
  };

  /**
   * 获取浏览器系统语言对应的 ISO 639-3 代码
   */
  function getBrowserLang() {
    if (typeof navigator === 'undefined') return 'und';
    var lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    // 精确匹配 → 前缀匹配
    return BCP47_TO_ISO3[lang] || BCP47_TO_ISO3[lang.split('-')[0]] || 'und';
  }

  /**
   * 检测文本是否为混合语言（多脚本共存）
   * 当最高脚本占比 < 70% 且存在第二脚本占比 > 15% 时判定为混合
   */
  function isMixedLanguage(text) {
    var ratios = [];
    for (var name in SCRIPTS) {
      if (SCRIPTS.hasOwnProperty(name)) {
        var ratio = getScriptRatio(text, SCRIPTS[name]);
        if (ratio > 0.05) {
          ratios.push({ script: name, ratio: ratio });
        }
      }
    }
    ratios.sort(function (a, b) { return b.ratio - a.ratio; });
    // 至少两种脚本，且第一名占比 < 70%，第二名占比 > 15%
    return ratios.length >= 2 && ratios[0].ratio < 0.70 && ratios[1].ratio > 0.15;
  }

  // ========== 8. 主 API ==========

  /**
   * franc(text) - 返回最可能的语言代码
   * @param {string} text
   * @returns {string} ISO 639-3 语言代码
   */
  function franc(text) {
    var result = francAll(text);
    return result[0][0];
  }

  /**
   * francAll(text) - 返回所有候选语言及置信度
   * @param {string} text
   * @returns {Array<[string, number]>} [[code, confidence], ...]
   */
    function francAll(text) {
    if (!text || text.trim().length < 1) {
      return [['und', 0]];
    }

    text = text.trim();
    var scriptInfo = detectScript(text);

    // 无法识别脚本
    if (!scriptInfo.script || (text.length > 5 && scriptInfo.ratio < 0.05)) {
      return [['und', 0]];
    }

    // 混合语言检测：多脚本共存时，返回浏览器系统语言
    if (isMixedLanguage(text)) {
      var browserCode = getBrowserLang();
      return [[browserCode, 60]];
    }

    var script = scriptInfo.script;

    // 单脚本语言：直接返回
    if (SCRIPT_TO_LANG[script]) {
      var lang = SCRIPT_TO_LANG[script];
      return [[lang.code, Math.min(scriptInfo.ratio * 150, 100)]];
    }

    // 汉字 / 日文 (CJK区分)
    if (script === 'Han' || script === 'Hiragana' || script === 'Katakana') {
      var cjk = distinguishCJK(text);
      return [[cjk.code, cjk.confidence]];
    }

    // 拉丁文 → 通过常用词匹配
    if (script === 'Latin') {
      var latinScores = matchByWords(text, LATIN_WORD_PROFILES);
      if (latinScores.length > 0 && latinScores[0].score > 0) {
        var results = [];
        for (var i = 0; i < Math.min(latinScores.length, 5); i++) {
          if (latinScores[i].score > 0) {
            results.push([latinScores[i].code, latinScores[i].confidence]);
          }
        }
        if (results.length > 0) return results;
      }
      // 默认英语
      return [['eng', 30]];
    }

    // 西里尔文 → 先按独占字符快速判定，再词频匹配
    if (script === 'Cyrillic') {
      var charResult = detectCyrillicByChars(text);
      if (charResult) return [[charResult.code, charResult.confidence]];

      var cyrScores = matchByWords(text, CYRILLIC_WORD_PROFILES);
      if (cyrScores.length > 0 && cyrScores[0].score > 0) {
        var cyrResults = [];
        for (var j = 0; j < Math.min(cyrScores.length, 4); j++) {
          if (cyrScores[j].score > 0) {
            cyrResults.push([cyrScores[j].code, cyrScores[j].confidence]);
          }
        }
        if (cyrResults.length > 0) return cyrResults;
      }
      return [['rus', 40]];
    }

    // 阿拉伯文 → 先按独占字符快速判定，再词频匹配
    if (script === 'Arabic') {
      var araCharResult = detectArabicByChars(text);
      if (araCharResult) return [[araCharResult.code, araCharResult.confidence]];

      var araScores = matchByWords(text, ARABIC_WORD_PROFILES);
      if (araScores.length > 0 && araScores[0].score > 0) {
        var araResults = [];
        for (var k = 0; k < Math.min(araScores.length, 3); k++) {
          if (araScores[k].score > 0) {
            araResults.push([araScores[k].code, araScores[k].confidence]);
          }
        }
        if (araResults.length > 0) return araResults;
      }
      return [['arb', 40]];
    }

    return [['und', 0]];
  }

  // ========== 9. 语言名称查询 ==========

  /** 所有已知语言名称合集 */
  var ALL_LANG_NAMES = {};

  // 合并所有名称
  (function () {
    var wordSources = [LATIN_WORD_PROFILES, CYRILLIC_WORD_PROFILES, ARABIC_WORD_PROFILES];

    for (var key in SCRIPT_TO_LANG) {
      if (SCRIPT_TO_LANG.hasOwnProperty(key)) {
        ALL_LANG_NAMES[SCRIPT_TO_LANG[key].code] = SCRIPT_TO_LANG[key].name;
      }
    }

    for (var s = 0; s < wordSources.length; s++) {
      var src = wordSources[s];
      for (var code in src) {
        if (src.hasOwnProperty(code)) {
          ALL_LANG_NAMES[code] = src[code].name;
        }
      }
    }

    // CJK
    ALL_LANG_NAMES['cmn'] = '简体中文 (Mandarin)';
    ALL_LANG_NAMES['jpn'] = '日语 (Japanese)';
    ALL_LANG_NAMES['und'] = '无法识别';
    ALL_LANG_NAMES['mix'] = '混合语言';
  })();

  /**
   * 根据代码获取语言名称
   */
  function getLangName(code) {
    return ALL_LANG_NAMES[code] || '其他语种 (' + code + ')';
  }

  // ========== 10. 导出为全局变量 ==========
  root.franc = franc;
  root.francAll = francAll;
  root.getLangName = getLangName;
  root.getBrowserLang = getBrowserLang;

})(typeof window !== 'undefined' ? window : this);
