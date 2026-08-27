CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nick_name TEXT,
  phone TEXT,
  email TEXT,
  is_delete INTEGER DEFAULT 0, -- 0-未删除 1-已删除
  status INTEGER DEFAULT 0,    -- 0-正常 1-停用
  avatar TEXT,
  role TEXT DEFAULT 'user',
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT DEFAULT '管理员',
  content TEXT NOT NULL,
  status INTEGER DEFAULT 1, -- 0-草稿 1-已发布
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  favorites TEXT DEFAULT '[]',     -- JSON array 存储收藏的工具 ID 列表
  recent_tools TEXT DEFAULT '[]',  -- JSON array 存储最近使用的工具 ID
  custom_settings TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  lang TEXT DEFAULT 'plaintext',
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 初始化完整故事种子数据
INSERT OR IGNORE INTO stories (id, title, author, content, status, created_at) VALUES 
('1699990000001', '星之继承者：月球背面的五万年沉睡', '詹姆斯·霍根', '# 星之继承者：月球背面的五万年沉睡\n\n> 那些遥望星空的人，早已把他们的一部分灵魂留在了群星之中。\n\n### 一、冷寂尘埃中的奇迹\n在月球死寂荒凉的第谷环形山深处，太阳的光芒永远以极其锋利的明暗交界线切割着灰白色的月壤。公元2028年秋，国际联合月球科考队的钻探作业引发了一场微小的月震，在一处古老的玄武岩裂隙之下，深埋的金属反光刺破了数十亿年的沉寂。\n\n科考队员们小心翼翼地清理掉覆盖在表层的月尘，映入眼帘的，竟是一具身着鲜红色宇航服的人类遗骸。\n\n他的面罩早已被岁月的微陨石击穿，面部覆盖着一层薄薄的凝霜，但体态完整。遗骸被命名为“查理”。最令人匪夷所思的不是他的存在，而是碳-14与地质岩层的测定结果：**这名宇航员死于整整五万年以前。**\n\n### 二、超越时间的基因密码\n五万年前，地球上的智人刚刚走出非洲，手里握着的还是粗糙的燧石长矛与兽骨。然而在三十八万公里之外的月球上，一个身穿重型维生宇航服的生命却在这里静静长眠。\n\n人类生物学与基因测序中心对查理残留的骨骼组织展开了夜以继日的精密化验。报告得出的结论震撼了全球：\n- 他的染色体数目为 46 条；\n- 他的血红蛋白、肌红蛋白与器官分子结构，与现代人类的重合度高达 **99.98%**；\n- 他是一个地地道道的人类。\n\n他并非来自某个遥远的外星种族，也并非来自未来的时空穿越者。他那五万年前的心脏，曾跳动在与我们完全相同的人类胸膛中。\n\n### 三、遗落文明的星际信标\n在查理身边散落的金属仪器中，破译专家团队终于解读了一份被石英晶体锁存的微弱脉冲日志。\n\n那是关于一个古老太阳系文明的最后绝唱。五万年前，存在于火星与木星之间的母星遭遇了不可逆转的引力潮汐撕裂。面对席卷整个内太阳系的星际浩劫，最后一支名为“慧神星”的开拓舰队将人类基因火种与文明种子投向了这颗蔚蓝色的第三行星——地球。\n\n而查理，正是最后一位负责在月球轨道引导信标、掩护火种降落的守望者。\n\n### 四、我们所继承的宇宙\n> “当你在夜晚仰望浩瀚星河时，不要感到孤独与渺小。因为你身体里的每一个原子，都曾锻造于超新星的熔炉；而你眼中对未知的渴望，正是五万年前那双凝望地球的眼睛的延续。”\n\n文明不仅是生存的延续，更是对未知永恒的求索。我们并非这片大地的初来者，我们是跨越了五万年风沙与烈火的星之继承者。', 1, 1699990000001),
('1699990000002', '给岁月以文明：时间尽头的守夜人', '刘慈欣', '# 给岁月以文明：时间尽头的守夜人\n\n> “给岁月以文明，而不是给文明以岁月。” —— 这不仅是黑暗宇宙的信条，更是生命的最高尊严。\n\n### 一、星舰的最后一程\n“追光者号”星舰在无边无际的深空引力暗流中平稳滑行。距离离开母星系已经过去了三百年，舷窗外除了偶尔掠过的暗弱中子星射电信号，只剩下近乎永恒的漆黑与死寂。\n\n记录官林远坐在观景穹顶之下，手中摩挲着一枚来自母星古老银杏树的树叶标本。标本在树脂层中凝固成金黄色，那是恒星光芒曾经洒满大地的颜色。\n\n在近光速航行带来的相对论时间膨胀效应下，外界宇宙已经飞逝了数千载。对于广袤无垠的宇宙尺度而言，即便是最庞大的恒星也会坍缩为黑洞，最璀璨的星系也会走向热寂。人类这漫长的跋涉与抗争，究竟意义何在？\n\n### 二、记忆琥珀与文明火种\n在飞船的记忆存储核心“沧海”之中，保存着人类有史以来创造的一切：\n- 从肖邦的夜曲到巴赫的赋格；\n- 从《红楼梦》的叹惋到《神曲》的咏叹；\n- 从麦克斯韦方程组的优美对称，到量子纠缠中超越空间的共振。\n\n在漫长到令思维窒息的冷冻休眠与值守轮换中，每一位守夜人都会被问及同一个问题：“如果文明终将归于虚无，我们为什么还要在有限的岁月中苦苦追寻？”\n\n林远在值班日志中写下了这样一段回答：\n> “宇宙是一片冰冷而沉默的沙漠，而文明是在这片沙漠中盛开的花朵。花朵的意义，从来不在于它能否对抗严冬的到来，而在于它在绽放的那一瞬间，证明了这片荒漠曾经存在过生命的温度与色彩。”\n\n### 三、在群星中刻下热爱\n浩瀚的星空不曾许诺任何永恒，但正是因为生命的短暂与脆弱，每一个微小的瞬间才显得无比珍贵。\n\n在有限的生命跨度里，我们去爱，去思考，去感受清晨拂过面颊的风，去追逐落日熔金的晚霞，去用数学和诗歌丈量宇宙的深度。这就是所谓的“给岁月以文明”——用思想、审美、热爱与探索的火种，去点亮本该荒芜空洞的漫长时光。\n\n### 四、微光永不熄灭\n舷窗之外，一颗崭新的年轻恒星正在星云的怀抱中缓缓升起，金色的晨曦穿透了数十万公里的尘埃带，洒在“追光者号”白色的舰桥上。\n\n*哪怕最后只剩下一颗沙粒，它也曾反射过太阳的光辉；哪怕生命只如白驹过隙，我们也曾在这浩瀚苍穹中，留下了属于文明的足迹。*', 1, 1699990000002);



