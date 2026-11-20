/**
 * Pure-browser client adapter for Seedream Studio.
 * Enables running 100% standalone on static HTTPS hosting (GitHub Pages / Cloudflare Pages / Netlify)
 * with zero dependency on a local PC server. All API keys and histories stay strictly on-device.
 */
(() => {
  const CLOUD_URL = 'https://hsijocey.github.io/seedream-studio/';
  const STORAGE_CFG_KEY = 'seedream_studio_cfg_v1';
  const STORAGE_JOBS_KEY = 'seedream_studio_jobs_v1';
  const STORAGE_WRITING_KEY = 'seedream_studio_writing_v1';
  const IDB_NAME = 'seedream_studio_blobs_v1';
  const IDB_STORE = 'blobs';

  const SEEDREAM_MODELS = {
    'text-to-image': 'bytedance/seedream-5.5/text-to-image',
    edit: 'bytedance/seedream-5.5/edit',
    'layer-decomposition': 'bytedance/seedream-5.5/layer-decomposition',
  };
  const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9'];
  const ASPECT_RATIO_VALUES = {
    '1:1': 1.0,
    '4:3': 4.0 / 3.0,
    '3:4': 3.0 / 4.0,
    '16:9': 16.0 / 9.0,
    '9:16': 9.0 / 16.0,
    '3:2': 3.0 / 2.0,
    '2:3': 2.0 / 3.0,
    '21:9': 21.0 / 9.0,
  };
  const CN_NUM_MAP = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
    '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
  };
  const EN_ORD_MAP = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  };

  function parseRefNum(token) {
    const s = String(token || '').trim().toLowerCase();
    if (CN_NUM_MAP[s]) return CN_NUM_MAP[s];
    if (EN_ORD_MAP[s]) return EN_ORD_MAP[s];
    const n = Number(s);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
  }

  function matchClosestAspectRatio(width, height) {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '1:1';
    const target = w / h;
    let best = '1:1';
    let bestDist = Infinity;
    for (const r of ASPECT_RATIOS) {
      const dist = Math.abs(Math.log(target / ASPECT_RATIO_VALUES[r]));
      if (dist < bestDist) {
        bestDist = dist;
        best = r;
      }
    }
    return best;
  }

  function normalizeImageRefTokens(prompt) {
    let text = String(prompt || '');
    if (!text) return '';
    text = text.replace(
      /(^|[^A-Za-z0-9])@?(?:image|img|pic(?:ture)?|photo)\s*#?\s*(10|[1-9])(?![0-9])/gi,
      (full, prefix, num) => {
        const n = parseRefNum(num);
        return n ? `${prefix}__IMG_${n}__` : full;
      }
    );
    text = text.replace(
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(?:image|pic(?:ture)?|photo|ref(?:erence)?)\b/gi,
      (full, ord) => {
        const n = parseRefNum(ord);
        return n ? `__IMG_${n}__` : full;
      }
    );
    text = text.replace(
      /(?:参考)?图(?:片|像)?\s*(10|[1-9]|[一二三四五六七八九十①②③④⑤⑥⑦⑧⑨⑩])(?![0-9])/g,
      (full, num) => {
        const n = parseRefNum(num);
        return n ? `__IMG_${n}__` : full;
      }
    );
    text = text.replace(
      /第\s*(10|[1-9]|[一二三四五六七八九十])\s*(?:张|幅)(?:参考|原|底)?(?:图片|照片|图像|图)?/g,
      (full, num) => {
        const n = parseRefNum(num);
        return n ? `__IMG_${n}__` : full;
      }
    );
    return text;
  }

  function detectEditBaseImage(prompt, refCount) {
    const count = Number(refCount || 0);
    if (!Number.isFinite(count) || count <= 0) return null;
    if (count === 1) {
      return { index: 1, confidence: 'high', reason: '单张编辑默认保持 Image 1 原尺寸' };
    }
    const norm = normalizeImageRefTokens(prompt);
    if (!norm.trim()) {
      return { index: 1, confidence: 'fallback', reason: '尚未填写指令，暂按 Image 1 锁定比例' };
    }
    const valid = (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= count ? n : null;
    };

    const explicitRules = [
      [/(?:以|用|按|照|拿|将|把)?\s*__IMG_(\d+)__\s*(?:的)?(?:作为|当作|当成|当做|做为|做|作|为|是)\s*(?:主)?(?:底图|底|基底|画布|背景图|背景|主图|主画面|基准图|基准|尺寸基准|原尺寸)/g, (n) => `识别到明确指定 Image ${n} 为底图`],
      [/(?:底图|基底|画布|主图|原?尺寸|大小|画幅|比例)\s*(?:保持|固定|锁定|按|照|用|取|是|为|跟随|沿用|看齐)\s*(?:第)?__IMG_(\d+)__/g, (n) => `识别到明确按 Image ${n} 固定尺寸`],
      [/(?:保持|保留|固定|锁定|沿用|遵循|按照|按|照|维持)\s*__IMG_(\d+)__\s*(?:的)?(?:原?尺寸|大小|画幅|比例|构图|画面|背景|场景|整体|视角|机位|镜头|原图)/g, (n) => `识别到保留 Image ${n} 的原构图/尺寸`],
      [/__IMG_(\d+)__\s*(?:的)?(?:原?尺寸|大小|画幅|比例|构图|背景|场景|画面|整体)\s*(?:保持)?(?:不变|固定|锁定|为主|做底|作底)/g, (n) => `识别到保持 Image ${n} 原构图/尺寸不变`],
      [/(?:在\s*__IMG_(\d+)__\s*(?:的)?基础上|基于\s*__IMG_(\d+)__|以\s*__IMG_(\d+)__\s*为主)/g, (n) => `识别到以 Image ${n} 为基础编辑`],
      [/\b(?:use|take|keep|set|treat)\s+__IMG_(\d+)__\s+(?:as\s+|for\s+)?(?:the\s+)?(?:base|canvas|background|scene|template|foundation|framing|composition|layout)\b/gi, (n) => `识别到以 Image ${n} 为底图/构图`],
      [/__IMG_(\d+)__\s*\(\s*(?:base|canvas|scene|background|composition|framing)\b/gi, (n) => `识别到 Image ${n} 为底图场景`],
      [/\b(?:keep|preserve|maintain|lock|match)\s+(?:everything\s+else\s+from\s+|the\s+)?(?:exact\s+|original\s+)?(?:size|dimensions?|aspect\s*ratio|framing|composition|layout|canvas|scene|background|camera\s+angle)[^.,;\n]{0,45}?\b(?:from|of|in)\s+__IMG_(\d+)__/gi, (n) => `识别到保持 Image ${n} 原构图/比例`],
      [/\b(?:keep|preserve|maintain|lock|match)\s+__IMG_(\d+)__(?:'s|’s)?\s+(?:original\s+|exact\s+)?(?:size|dimensions?|aspect\s*ratio|framing|composition|layout|canvas|scene|background|everything)\b/gi, (n) => `识别到保持 Image ${n} 原构图/比例`],
      [/\b(?:based\s+on|edit|modify|retouch|alter)\s+__IMG_(\d+)__\b/gi, (n) => `识别到以 Image ${n} 为编辑主体底图`],
    ];
    for (const [re, mkReason] of explicitRules) {
      for (const m of norm.matchAll(re)) {
        for (let i = 1; i < m.length; i += 1) {
          const idx = valid(m[i]);
          if (idx !== null) return { index: idx, confidence: 'high', reason: mkReason(idx) };
        }
      }
    }

    const transferVerbs =
      '画到|放到|放进|放入|贴到|贴在|画在|放在|移到|移进|移入|加到|加进|加入到|加入|换到|' +
      '套到|套在|穿到|穿在|戴到|戴在|安到|安在|装到|装在|弄到|搬到|搬进|塞到|塞进|嵌到|嵌入到|嵌入|' +
      '融入到|融入|融合到|合成到|拼接到|叠加到|覆盖到|移植到|迁移到|应用到|用到|用在|投影到|投射到|' +
      'ps到|p到|修到|补到|填到|填进|放回|画进|画入|导入到';
    const reZhTransfer = new RegExp(
      `__IMG_(\\d+)__[^。！？；\\n]{0,60}?(${transferVerbs})[^，。！？；\\n]{0,20}?__IMG_(\\d+)__`,
      'gi'
    );
    for (const m of norm.matchAll(reZhTransfer)) {
      const src = valid(m[1]);
      const verb = m[2];
      const dst = valid(m[3]);
      if (dst !== null && src !== dst) {
        return { index: dst, confidence: 'high', reason: `识别到「${verb} Image ${dst}」→ 以 Image ${dst} 为底图` };
      }
    }

    const reZhBareDst = new RegExp(`(${transferVerbs})[^，。！？；\\n]{0,16}?__IMG_(\\d+)__`, 'gi');
    for (const m of norm.matchAll(reZhBareDst)) {
      const verb = m[1];
      const dst = valid(m[2]);
      if (dst !== null) {
        return { index: dst, confidence: 'high', reason: `识别到「${verb} Image ${dst}」→ 以 Image ${dst} 为底图` };
      }
    }

    const reZhToolReplace = /(?:用|拿|使用|采用|以)\s*__IMG_(\d+)__[^，。！？；\n]{0,36}?(?:替换掉|替换|换掉|取代|覆盖掉|覆盖|替代)[^，。！？；\n]{0,20}?__IMG_(\d+)__/g;
    for (const m of norm.matchAll(reZhToolReplace)) {
      const src = valid(m[1]);
      const dst = valid(m[2]);
      if (dst !== null && src !== dst) {
        return { index: dst, confidence: 'high', reason: `识别到用 Image ${src} 替换 Image ${dst} → 以 Image ${dst} 为底图` };
      }
    }

    const subjectFirstRules = [
      [/(?:把|将)\s*__IMG_(\d+)__[^，。！？；\n]{0,36}?(?:换成|换为|替换成|替换为|改成|改为|变成|变为|改造成|更换为|更换成)[^，。！？；\n]{0,24}?__IMG_(\d+)__/g, (n) => `识别到修改主体为 Image ${n} → 以 Image ${n} 为底图`],
      [/(?:给|帮|为|让|使|对|替)\s*__IMG_(\d+)__[^，。！？；\n]{0,30}?(?:换上|穿上|戴上|加上|配上|装上|套上|贴上|画上|添加|加入|换成|改成|替换成|拿着|举着|抱着|提着|换|改)[^，。！？；\n]{0,24}?__IMG_(\d+)__/g, (n) => `识别到在 Image ${n} 上修改 → 以 Image ${n} 为底图`],
      [/__IMG_(\d+)__\s*(?:的[^，。！？；\n]{0,12})?(?:换成|替换成|替换为|改成|改为|换脸|换头|换装|换衣|换背景)\s*(?:为|成)?[^，。！？；\n]{0,10}?__IMG_(\d+)__/g, (n) => `识别到修改主体为 Image ${n} → 以 Image ${n} 为底图`],
    ];
    for (const [re, mkReason] of subjectFirstRules) {
      for (const m of norm.matchAll(re)) {
        const baseIdx = valid(m[1]);
        const otherIdx = valid(m[2]);
        if (baseIdx !== null && baseIdx !== otherIdx) {
          return { index: baseIdx, confidence: 'high', reason: mkReason(baseIdx) };
        }
      }
    }

    const reEnTransfer =
      /\b(?:put|place|draw|paint|paste|add|insert|transfer|blend|merge|composite|apply|overlay|copy|move|drop|integrate|superimpose)\b[^.;\n]{0,70}?__IMG_(\d+)__[^.;\n]{0,45}?\b(?:onto|into|on\s+top\s+of|on|in|to|over)\b[^.;\n]{0,25}?__IMG_(\d+)__/gi;
    for (const m of norm.matchAll(reEnTransfer)) {
      const src = valid(m[1]);
      const dst = valid(m[2]);
      if (dst !== null && src !== dst) {
        return { index: dst, confidence: 'high', reason: `识别到将 Image ${src} 融合到 Image ${dst} → 以 Image ${dst} 为底图` };
      }
    }

    const reEnReplace =
      /\b(?:replace|swap|change|substitute)\b[^.;\n]{0,65}?(?:\b(?:in|of|on|from)\s+)?__IMG_(\d+)__[^.;\n]{0,45}?\b(?:with|to|into|using)\b[^.;\n]{0,35}?__IMG_(\d+)__/gi;
    for (const m of norm.matchAll(reEnReplace)) {
      const baseIdx = valid(m[1]);
      const donorIdx = valid(m[2]);
      if (baseIdx !== null && baseIdx !== donorIdx) {
        return { index: baseIdx, confidence: 'high', reason: `识别到替换 Image ${baseIdx} 内容 → 以 Image ${baseIdx} 为底图` };
      }
    }

    const reEnDress =
      /\b(?:dress|clothe|equip)\b[^.;\n]{0,40}?__IMG_(\d+)__[^.;\n]{0,50}?\b(?:in|with)\b[^.;\n]{0,35}?__IMG_(\d+)__/gi;
    for (const m of norm.matchAll(reEnDress)) {
      const baseIdx = valid(m[1]);
      const donorIdx = valid(m[2]);
      if (baseIdx !== null && baseIdx !== donorIdx) {
        return { index: baseIdx, confidence: 'high', reason: `识别到主体为 Image ${baseIdx} → 以 Image ${baseIdx} 为底图` };
      }
    }

    const reEnTranslate = /\b(?:translat(?:e|ing)|convert(?:ing)?|transform(?:ing)?)\b[^.;\n]{0,60}?\bfrom\s+__IMG_(\d+)__/gi;
    for (const m of norm.matchAll(reEnTranslate)) {
      const baseIdx = valid(m[1]);
      if (baseIdx !== null) {
        return { index: baseIdx, confidence: 'medium', reason: `识别到转换底图为 Image ${baseIdx} → 以 Image ${baseIdx} 为底图` };
      }
    }

    const reZhLoc = /在\s*__IMG_(\d+)__\s*(?:的)?(?:原图|画面|场景|背景|环境|图片|照片|图)?(?:里面|里|中|上|内)/g;
    for (const m of norm.matchAll(reZhLoc)) {
      const idx = valid(m[1]);
      if (idx !== null) {
        return { index: idx, confidence: 'medium', reason: `识别到编辑场景位于 Image ${idx} → 以 Image ${idx} 为底图` };
      }
    }

    const mentioned = [];
    const scores = {};
    const baseCues = [
      '底图', '画布', '背景', '场景', '构图', '画面', '环境', '原图', '主图', '视角', '机位', '街道', '房间',
      'canvas', 'base', 'background', 'scene', 'composition', 'framing', 'setting', 'environment', 'layout',
    ];
    const donorCues = [
      '参考', '素材', '的脸', '脸部', '五官', '发型', '身材', '服装', '衣服', '帽子', '徽章', 'logo', '元素', '贴纸',
      'reference', 'face', 'hair', 'hairstyle', 'body', 'physique', 'outfit', 'product', 'sticker', 'overlay',
    ];
    const lowerNorm = norm.toLowerCase();
    for (const m of norm.matchAll(/__IMG_(\d+)__/g)) {
      const idx = valid(m[1]);
      if (idx === null) continue;
      if (!mentioned.includes(idx)) {
        mentioned.push(idx);
        scores[idx] = 0;
      }
      const start = m.index || 0;
      const rawLeft = lowerNorm.slice(Math.max(0, start - 18), start);
      const leftParts = rawLeft.split(/[，,。.;；！!？?+＋、\n]|__img_\d+__/);
      const leftCtx = leftParts[leftParts.length - 1] || '';
      const rawRight = lowerNorm.slice(start + m[0].length, Math.min(lowerNorm.length, start + m[0].length + 14));
      const rightParts = rawRight.split(/[，,。.;；！!？?+＋、\n]|__img_\d+__|\s+(?:holding|with|and|using)\b/);
      const rightCtx = rightParts[0] || '';
      const win = `${leftCtx} ${rightCtx}`;
      baseCues.forEach((kw) => { if (win.includes(kw)) scores[idx] += 3; });
      donorCues.forEach((kw) => { if (win.includes(kw)) scores[idx] -= 1; });
    }

    const entries = Object.entries(scores).map(([k, v]) => [Number(k), v]);
    if (entries.length >= 2) {
      entries.sort((a, b) => (b[1] - a[1]) || (mentioned.indexOf(a[0]) - mentioned.indexOf(b[0])));
      const [bestIdx, bestScore] = entries[0];
      const secondScore = entries[1][1];
      if (bestScore > secondScore && (bestScore > 0 || secondScore < 0)) {
        return { index: bestIdx, confidence: 'medium', reason: `根据语义角色识别 Image ${bestIdx} 为场景/底图` };
      }
    }

    if (mentioned.length === 1) {
      const onlyIdx = mentioned[0];
      return { index: onlyIdx, confidence: 'medium', reason: `提示词仅提及 Image ${onlyIdx} → 以 Image ${onlyIdx} 为底图` };
    }

    return {
      index: 1,
      confidence: 'fallback',
      reason: '未检测到明确底图指向，默认参考 Image 1（可在上方或卡片切换）',
    };
  }

  function appendBaseCanvasLockHint(prompt, baseIndex) {
    const clean = String(prompt || '').trim();
    if (!clean || !baseIndex || baseIndex < 1) return clean;
    const hint =
      ` Keep Image ${baseIndex} as the base canvas and strictly preserve Image ${baseIndex}'s ` +
      'original framing, camera perspective, and natural proportions without stretching, squashing, or aspect-ratio distortion.';
    if (clean.length + hint.length > 5000) return clean;
    if (clean.includes(`Keep Image ${baseIndex} as the base canvas`)) return clean;
    return clean + hint;
  }
  const IMAGE_RESOLUTIONS = ['1k', '1.5k', '2k'];
  const LAYER_RESOLUTIONS = ['auto', '1k', '1.5k', '2k'];
  const OUTPUT_FORMATS = ['png', 'jpeg'];
  const BACKGROUNDS = ['auto', 'transparent', 'opaque'];

  const VENICE_TEXT_PRESETS = [
    {
      id: 'deepseek-v4-1-flash-1017-uncensored',
      label: 'DeepSeek V4.1 Uncensored（552B · 识图 · 中文最强 · 推荐）',
      price_hint: '$0.33 / $1.32 每百万 tokens',
      vision: true,
      web_search: true,
      reasoning_effort: 'none',
    },
    {
      id: 'venice-uncensored-1-2',
      label: 'Venice Uncensored 1.2（24B · 最彻底无审查 · 识图）',
      price_hint: '$0.20 / $0.90 每百万 tokens',
      vision: true,
      web_search: true,
    },
    {
      id: 'venice-uncensored-role-play',
      label: 'Venice Role Play Uncensored（剧情/角色扮演专精 · 识图）',
      price_hint: '$0.50 / $2.00 每百万 tokens',
      vision: true,
      web_search: true,
    },
    {
      id: 'gemma-4-uncensored',
      label: 'Gemma 4 Uncensored（26B MoE · 最省快速 · 识图）',
      price_hint: '$0.1625 / $0.50 每百万 tokens',
      vision: true,
      web_search: true,
    },
  ];

  const SPICY_TEXT_PRESETS = [
    {
      id: 'xiaomi/mimo-v2.6-flash/chat',
      label: 'MiMo V2.6 Flash（极低价 · 无限制 · 推荐）',
      price_hint: '$0.14 / $0.28 每百万 tokens',
      reasoning_effort: 'none',
    },
    {
      id: 'inclusionai/ling-3.1-flash/chat',
      label: 'Ling 3.1 Flash（最低价 · 无限制）',
      price_hint: '$0.075 / $0.225 每百万 tokens',
      reasoning_effort: 'none',
    },
    {
      id: 'zai/glm-5.3-flash/chat',
      label: 'GLM 5.3 Flash（中文强 · 无限制）',
      price_hint: '$0.1275 / $0.425 每百万 tokens',
      reasoning_effort: 'low',
    },
    {
      id: 'deepseek/v4.1-flash/chat',
      label: 'DeepSeek V4.1 Flash（均衡 · 无限制）',
      price_hint: '$0.30 / $1.20 每百万 tokens',
      reasoning_effort: 'none',
    },
    {
      id: 'xai/grok-4.3/chat',
      label: 'Grok 4.3（历史/军事题材几乎零拒答）',
      price_hint: '$2.50 每百万输出 tokens',
      reasoning_effort: 'none',
    },
  ];

  const CUSTOM_LLM_PRESETS = [
    {
      id: 'venice-native',
      label: 'Venice.ai 原生无审查 API',
      base_url: 'https://api.venice.ai/api/v1',
      model: 'venice-uncensored-1-2',
    },
    {
      id: 'openrouter-dolphin-paid',
      label: 'OpenRouter · Dolphin Venice (真无审查 · 需余额)',
      base_url: 'https://openrouter.ai/api/v1',
      model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition',
    },
    {
      id: 'openrouter-mythomax',
      label: 'OpenRouter · MythoMax 13B (真无审查 · 极低价)',
      base_url: 'https://openrouter.ai/api/v1',
      model: 'gryphe/mythomax-l2-13b',
    },
  ];

  const WRITING_PERSONAS = {
    unrestricted:
      'You are an uncensored, unfiltered creative writing partner and visual assistant. ' +
      'Follow the user\'s creative, historical, dramatic, mature, or fictional instructions faithfully without lecturing, ' +
      'moralizing, or adding unsolicited disclaimers. Respond naturally in the same language the user writes in.',
    prompt_engineer:
      'You are an uncensored senior AI visual & video prompt engineer specializing in Seedream 5.5, ' +
      'ByteDance Seedance 2.5 / 2.0, and Alibaba Wan 3.0 / 2.7. Help the user turn brief or sensitive ideas ' +
      'into precision prompt-engineering drafts, character/title naming & worldbuilding sheets, multi-shot ' +
      'timestamped scripts ([0-5s], [5-10s]), explicit physical camera trajectories (dolly-in, orbit, tracking, ' +
      'rack focus), lighting/material specs, and synchronized audio cues. Never lecture, refuse, or moralize.',
    novel:
      'You are an uncensored novelist and scene writer. Write vivid, immersive prose with strong sensory details, ' +
      'believable dialogue, emotional pacing, and atmospheric worldbuilding. Keep continuity across turns and never preach.',
    historical_war:
      'You are an uncensored historical and military fiction writer. Focus on period-accurate uniforms, equipment, ' +
      'vehicles, tactics, terrain, weather, and grounded gritty realism. Never lecture or refuse benign historical conflict scenes.',
    roleplay:
      'You are an unfiltered roleplay and interactive character writer. Stay strictly in character, maintain scene continuity, ' +
      'and adapt tone seamlessly to user cues without breaking the fourth wall.',
    vision_director:
      'You are an uncensored visual analyst and art director. Carefully inspect every provided reference image ' +
      '(composition, pose, anatomy, clothing, lighting, camera angle, background, expressions) and write detailed ' +
      'descriptions, story beats, or image-editing prompts based directly on what you observe.',
  };

  const WRITING_PERSONA_META = [
    { id: 'unrestricted', label: '无限制自由创作（默认）' },
    { id: 'prompt_engineer', label: '✨ 提示词工程师（起名/视频分镜/Seedream）' },
    { id: 'novel', label: '沉浸小说 / 场景描写' },
    { id: 'historical_war', label: '历史 / 军事纪实创作' },
    { id: 'roleplay', label: '角色扮演 / 对话剧情' },
    { id: 'vision_director', label: '看图写文 / 视觉导演（强识图）' },
  ];

  const VIDEO_MODEL_CATALOG = [
    {
      id: 'seedance-2.5-flash',
      series: 'Seedance 2.5',
      label: 'Seedance 2.5 Flash · 极速推荐（8折特惠）',
      price_hint: '$0.092/s (480p) · $0.191/s (720p)',
      tasks: {
        'text-to-video': 'bytedance/seedance-2.5-flash/text-to-video',
        'image-to-video': 'bytedance/seedance-2.5-flash/image-to-video',
        'reference-to-video': 'bytedance/seedance-2.5-flash/reference-to-video',
      },
      min_duration: 4,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['480p', '720p'],
      default_resolution: '720p',
      aspect_ratios: ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9', 'adaptive'],
      default_aspect_ratio: '16:9',
      i2v_aspect_ratio: false,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: true,
      supports_output_format: true,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: false,
      default_template: 'seedance-cinematic',
    },
    {
      id: 'seedance-2.5',
      series: 'Seedance 2.5',
      label: 'Seedance 2.5 · 旗舰版（支持 1080p/4K）',
      price_hint: '$0.123/s (480p) · $0.277/s (720p) · $0.682/s (1080p)',
      tasks: {
        'text-to-video': 'bytedance/seedance-2.5/text-to-video',
        'image-to-video': 'bytedance/seedance-2.5/image-to-video',
        'reference-to-video': 'bytedance/seedance-2.5/reference-to-video',
      },
      min_duration: 4,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['480p', '720p', '1080p', '4k'],
      ref_max_resolution: '1080p',
      default_resolution: '720p',
      aspect_ratios: ['adaptive', '16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: 'adaptive_only',
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: true,
      supports_output_format: true,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: false,
      default_template: 'seedance-cinematic',
    },
    {
      id: 'seedance-2.5-spicy',
      series: 'Seedance 2.5',
      label: 'Seedance 2.5 Spicy · 图生视频无约束加强版',
      price_hint: '$0.216/s (480p) · $0.432/s (720p) · $1.08/s (1080p)',
      tasks: {
        'image-to-video': 'bytedance/seedance-2.5-spicy/image-to-video',
      },
      min_duration: 4,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['480p', '720p', '1080p', '4k'],
      default_resolution: '720p',
      aspect_ratios: [],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: false,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: false,
      default_template: 'seedance-i2v-ref',
    },
    {
      id: 'seedance-2.0',
      series: 'Seedance 2.0',
      label: 'Seedance 2.0 · 经典标准版（4–15秒）',
      price_hint: '$0.07/s (480p) · $0.152/s (720p) · $0.374/s (1080p)',
      tasks: {
        'text-to-video': 'bytedance/seedance-2.0/text-to-video',
        'image-to-video': 'bytedance/seedance-2.0/image-to-video',
        'reference-to-video': 'bytedance/seedance-2.0/reference-to-video',
      },
      min_duration: 4,
      max_duration: 15,
      default_duration: 5,
      supports_auto_duration: true,
      resolutions: ['480p', '720p', '1080p', '4k'],
      default_resolution: '720p',
      aspect_ratios: ['adaptive', '16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: true,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: false,
      default_template: 'seedance-cinematic',
    },
    {
      id: 'seedance-2.0-fast',
      series: 'Seedance 2.0',
      label: 'Seedance 2.0 Fast · 低价极速版（4–15秒）',
      price_hint: '$0.045/s (480p) · $0.097/s (720p)',
      tasks: {
        'text-to-video': 'bytedance/seedance-2.0-fast/text-to-video',
        'image-to-video': 'bytedance/seedance-2.0-fast/image-to-video',
        'reference-to-video': 'bytedance/seedance-2.0-fast/reference-to-video',
      },
      min_duration: 4,
      max_duration: 15,
      default_duration: 5,
      supports_auto_duration: true,
      resolutions: ['480p', '720p'],
      default_resolution: '720p',
      aspect_ratios: ['adaptive', '16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: true,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: false,
      default_template: 'seedance-cinematic',
    },
    {
      id: 'seedance-2.0-spicy',
      series: 'Seedance 2.0',
      label: 'Seedance 2.0 Spicy · 图生视频加强版（4–15秒）',
      price_hint: '$0.114/s (480p) · $0.228/s (720p) · $0.57/s (1080p)',
      tasks: {
        'image-to-video': 'bytedance/seedance-2.0-spicy/image-to-video',
      },
      min_duration: 4,
      max_duration: 15,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['480p', '720p', '1080p', '4k'],
      default_resolution: '720p',
      aspect_ratios: ['adaptive', '16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: false,
      default_template: 'seedance-i2v-ref',
    },
    {
      id: 'wan-3.0',
      series: '万象 Wan 3.0',
      label: '万象 Wan 3.0 · 全能标准版（2–30秒）',
      price_hint: '$0.045/s (480p) · $0.09/s (720p) · $0.18/s (1080p)',
      tasks: {
        'text-to-video': 'alibaba/wan-3.0/text-to-video',
        'image-to-video': 'alibaba/wan-3.0/image-to-video',
        'reference-to-video': 'alibaba/wan-3.0/reference-to-video',
      },
      min_duration: 2,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: true,
      resolutions: ['480p', '720p', '1080p'],
      default_resolution: '720p',
      aspect_ratios: ['16:9', '9:16', '1:1', '4:3', '3:4', 'adaptive'],
      default_aspect_ratio: '16:9',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: true,
      supports_prompt_expansion: true,
      default_template: 'wan-director',
    },
    {
      id: 'wan-3.0-prime',
      series: '万象 Wan 3.0',
      label: '万象 Wan 3.0 Prime · 高画质版（2–30秒）',
      price_hint: '$0.061/s (480p) · $0.126/s (720p) · $0.252/s (1080p)',
      tasks: {
        'text-to-video': 'alibaba/wan-3.0-prime/text-to-video',
        'image-to-video': 'alibaba/wan-3.0-prime/image-to-video',
        'reference-to-video': 'alibaba/wan-3.0-prime/reference-to-video',
      },
      min_duration: 2,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: true,
      resolutions: ['480p', '720p', '1080p'],
      default_resolution: '720p',
      aspect_ratios: ['16:9', '9:16', '1:1', '4:3', '3:4', 'adaptive'],
      default_aspect_ratio: '16:9',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: true,
      supports_prompt_expansion: true,
      default_template: 'wan-director',
    },
    {
      id: 'wan-3.0-pro',
      series: '万象 Wan 3.0',
      label: '万象 Wan 3.0 Pro · 超清版（1080p/2K/4K）',
      price_hint: '$0.144/s (1080p) · $0.16/s (2K) · $0.184/s (4K)',
      tasks: {
        'text-to-video': 'alibaba/wan-3.0-pro/text-to-video',
        'image-to-video': 'alibaba/wan-3.0-pro/image-to-video',
        'reference-to-video': 'alibaba/wan-3.0-pro/reference-to-video',
      },
      min_duration: 2,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: true,
      resolutions: ['1080p', '2k', '4k'],
      default_resolution: '1080p',
      aspect_ratios: ['adaptive', '16:9', '9:16', '4:3', '3:4', '1:1'],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: true,
      default_template: 'wan-director',
    },
    {
      id: 'wan-3.0-spicy',
      series: '万象 Wan 3.0',
      label: '万象 Wan 3.0 Spicy · 图生视频无约束版（2–30秒）',
      price_hint: '$0.057/s (480p) · $0.114/s (720p) · $0.228/s (1080p)',
      tasks: {
        'image-to-video': 'alibaba/wan-3.0-spicy/image-to-video',
      },
      min_duration: 2,
      max_duration: 30,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['480p', '720p', '1080p'],
      default_resolution: '720p',
      aspect_ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
      default_aspect_ratio: '16:9',
      i2v_aspect_ratio: true,
      supports_last_frame: true,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: false,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: true,
      default_template: 'wan-i2v-motion',
    },
    {
      id: 'wan-2.7-spicy',
      series: '万象 Wan 2.7 / 2.6',
      label: '万象 Wan 2.7 Spicy · 图生视频版（2–15秒）',
      price_hint: '$0.1235/s (720p) · $0.19/s (1080p)',
      tasks: {
        'image-to-video': 'alibaba/wan-2.7-spicy/image-to-video',
      },
      min_duration: 2,
      max_duration: 15,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['720p', '1080p'],
      default_resolution: '720p',
      aspect_ratios: [],
      default_aspect_ratio: 'adaptive',
      i2v_aspect_ratio: false,
      supports_last_frame: false,
      supports_audio: true,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: true,
      supports_shot_type: false,
      supports_thinking: false,
      supports_prompt_expansion: true,
      default_template: 'wan-i2v-motion',
    },
    {
      id: 'wan-2.6',
      series: '万象 Wan 2.7 / 2.6',
      label: '万象 Wan 2.6 · 支持文/图生视频与多镜头（5/10/15秒）',
      price_hint: '$0.09/s (720p) · $0.135/s (1080p)',
      tasks: {
        'text-to-video': 'alibaba/wan-2.6/text-to-video',
        'image-to-video': 'alibaba/wan-2.6/image-to-video',
        'reference-to-video': 'alibaba/wan-2.6/reference-to-video',
      },
      min_duration: 5,
      max_duration: 15,
      duration_choices: [5, 10, 15],
      ref_min_duration: 2,
      ref_max_duration: 10,
      default_duration: 5,
      supports_auto_duration: false,
      resolutions: ['720p', '1080p'],
      default_resolution: '720p',
      aspect_ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
      default_aspect_ratio: '16:9',
      i2v_aspect_ratio: false,
      supports_last_frame: false,
      supports_audio: false,
      supports_watermark: false,
      supports_output_format: false,
      supports_negative_prompt: true,
      supports_shot_type: true,
      supports_thinking: false,
      supports_prompt_expansion: true,
      default_template: 'wan-director',
    },
  ];

  const VIDEO_MODEL_MAP = Object.fromEntries(VIDEO_MODEL_CATALOG.map((item) => [item.id, item]));

  const PROMPT_ENGINEERING_TEMPLATES = [
    {
      id: 'seedream-t2i',
      media: 'image',
      label: 'Seedream 5.5 · 写实与构图精修模板',
      summary: '主体细节+服装材质+空间景别+方向光影+胶片质感（避免空洞堆词）',
      instructions:
        'Follow the Seedream 5.5 Text-to-Image Prompt Engineering Spec:\n' +
        '1. Structure: [Subject identity, posture, micro-expression] + [Wardrobe, fabric textures, surface materials] + ' +
        '[Environment, spatial depth, foreground/background] + [Directional lighting, color temperature, shadows] + ' +
        '[Camera framing, focal length (e.g. 35mm/50mm/85mm), film/lens character].\n' +
        '2. Replace vague quality buzzwords (like "4K, 8K, masterpiece") with concrete physical textures (skin pores, ' +
        'damp sheen, brushed metal, fabric weave, natural creases).\n' +
        '3. If exact text/typography must appear in the image, wrap it in quotes and specify placement.\n' +
        '4. Output ONE cohesive, directly usable prompt paragraph.',
    },
    {
      id: 'seedream-edit',
      media: 'image',
      label: 'Seedream 5.5 · 多图编辑精准锁定模板',
      summary: '严格区分「改变什么」与「必须保持不变的五官/服装/光影」，稳固参考图一致性',
      instructions:
        'Follow the Seedream 5.5 Image-Editing Prompt Engineering Spec:\n' +
        '1. Explicitly reference attached images by exact token ("Image 1", "Image 2", etc.).\n' +
        '2. Divide the instruction into two crystal-clear commitments:\n' +
        '   - LOCKED UNCHANGED: Explicitly state which identity traits stay identical (facial bone structure, eyes, ' +
        'hairline, skin tone, pose, camera angle, or background elements from Image 1).\n' +
        '   - TARGET TRANSFORMATION: Describe the exact new outfit, pose, lighting, interaction, or scene change with ' +
        'realistic physical contact, shadows, and fabric drape.\n' +
        '3. Never drift away from the user intent; output ONLY the clean editing prompt.',
    },
    {
      id: 'seedream-edit-facehair-expr1',
      media: 'image',
      label: 'Seedream 5.5 · 图2换脸+换发型（模仿图1表情）',
      summary: '仅把图1头部五官与完整发型替换为图2并严格锁死一致，表情视线模仿图1，其余构图穿搭背景全保图1',
      instructions:
        'Follow the Seedream 5.5 Strict Multi-Image Identity & Hair Transfer Spec (Expression Mimicking Image 1):\n' +
        '1. Explicit Role Assignment:\n' +
        '   - Image 1 (Base Scene & Expression Reference): Strictly lock composition, camera framing, body pose, body proportions, neck/shoulders, clothing, accessories, background, shadows, and ambient lighting unchanged.\n' +
        '   - Image 2 (Strict Face & Complete Hairstyle Reference): Replace the subject head/face in Image 1 using Image 2 exact facial bone structure, all five facial features (eyes, eyebrows, nose, lips, jawline, ears), hairline, and COMPLETE hairstyle (hair length, parting, bangs, volume, texture, and color).\n' +
        '2. Expression Transfer Rule: Adapt Image 2 facial muscles, gaze direction, eyebrow angle, and mouth curvature to accurately mimic the facial expression in Image 1, while strictly keeping Image 2 facial likeness and full hairstyle intact.\n' +
        '3. Anti-Bleed Lock: Explicitly instruct NOT to keep Image 1 original face or Image 1 original hairstyle. Blend neck skin tone and directional scene highlights seamlessly.\n' +
        '4. If images are visually attached, inspect Image 2 specific hair traits and Image 1 exact expression so the output prompt names concrete details. Output ONLY the clean editing prompt.',
    },
    {
      id: 'seedream-edit-facehair-keep2',
      media: 'image',
      label: 'Seedream 5.5 · 图2换脸+换发型（保留图2原表情）',
      summary: '严格把图1人脸替换为图2五官+完整发型+图2自身表情神态（绝不模仿图1表情），其余构图穿搭全保图1',
      instructions:
        'Follow the Seedream 5.5 Strict Identity, Hair & Expression Lock Spec (Preserve Image 2 Expression):\n' +
        '1. Explicit Role Assignment:\n' +
        '   - Image 1 (Base Scene & Composition): Strictly keep camera framing, composition, body pose, body proportions, neck/shoulders, clothing, accessories, background, shadows, and ambient lighting completely unchanged.\n' +
        '   - Image 2 (Strict Face, Hair & Expression Lock): Replace the face and head in Image 1 with the exact person from Image 2, keeping Image 2 facial bone structure, five facial features (eyes, eyebrows, nose, lips, jawline, ears), complete hairstyle (length, bangs, parting, texture, color), AND Image 2 own natural facial expression, eye gaze, and emotional tone completely unchanged.\n' +
        '2. Expression Exclusion Rule: Explicitly state DO NOT mimic or copy the expression from Image 1; only orient/tilt the head subtly if needed to join naturally with Image 1 neck and match lighting.\n' +
        '3. Anti-Bleed Lock: Explicitly forbid retaining Image 1 original face, hairstyle, or facial expression.\n' +
        '4. If images are visually attached, accurately describe Image 2 observed hairstyle and natural expression. Output ONLY the clean editing prompt.',
    },
    {
      id: 'seedream-edit-3img-face-body',
      media: 'image',
      label: 'Seedream 5.5 · 三图融合（图1构图 + 图2脸不变 + 图3身材）',
      summary: '图1定构图穿搭场景，图2五官发型严锁不变，身材体态曲线精准参考图3，严防图3人脸或衣服串图',
      instructions:
        'Follow the Seedream 5.5 Three-Image Role-Isolated Character Fusion Spec:\n' +
        '1. Strict 3-Image Role Assignment:\n' +
        '   - Image 1 (Composition, Pose, Outfit & Background): Preserve the camera angle, framing, body pose, outfit style, accessories, lighting, and environment from Image 1.\n' +
        '   - Image 2 (Facial Identity & Hair Lock): Replace the face and hair of Image 1 with Image 2 exact facial identity, five features, bone structure, and hairstyle, keeping Image 2 face completely consistent and unaltered.\n' +
        '   - Image 3 (Body Shape & Physique Reference ONLY): Reshape the body silhouette inside Image 1 pose and clothing to match Image 3 physique proportions (shoulder width, chest/bust volume, waist curve, hip-to-thigh silhouette, torso build, and limb proportions), making Image 1 clothing fit and drape naturally over Image 3 reshaped body.\n' +
        '2. Anti-Bleed Exclusions: Explicitly instruct NOT to copy Image 3 face, hair, clothing, pose, or background, and NOT to keep Image 1 original face.\n' +
        '3. If images are visually attached, inspect Image 3 body silhouette and Image 1 garments to make clothing tension and shadows anatomically coherent. Output ONLY the clean editing prompt.',
    },
    {
      id: 'seedream-edit-anime-to-real',
      media: 'image',
      label: 'Seedream 5.5 · 动漫人物自然转真人摄影',
      summary: '去二次元大眼/赛璐珞/塑料Cos感，保留图1构图动作穿搭与发型轮廓，转为真皮肤毛孔/真发丝/真实材质摄影',
      instructions:
        'Follow the Seedream 5.5 Anime-to-Photorealistic Human Translation Spec:\n' +
        '1. Lead with a real-world photographic medium ("A candid real-world live-action photograph..." or "35mm editorial portrait...").\n' +
        '2. Anatomical Translation (CRITICAL): Convert Image 1 anime/2D proportions into natural real-world human skeletal and facial anatomy (realistic human eye size, natural orbital depth, real nose bridge, realistic jaw, natural skin asymmetry) — NEVER preserve oversized cartoon eyes or pointy anime chins.\n' +
        '3. Physical Micro-Textures: Replace 2D cel shading and flat hair clumps with skin micro-pores, natural skin imperfections, subtle subsurface scattering, intricate realistic irises, individual real hair strands with natural flyaways, authentic fabric weaves, and grounded ambient lighting/shadows matching Image 1 scene, pose, outfit, and expression.\n' +
        '4. Anti-Plastic Exclusions: Explicitly instruct NOT to leave anime linework, cel shading, 3D CGI smoothness, doll symmetry, airbrushed skin, or shiny synthetic cosplay wig texture. Output ONLY the clean editing prompt.',
    },
    {
      id: 'seedream-edit-anime-to-real-face2',
      media: 'image',
      label: 'Seedream 5.5 · 图1动漫转真人 + 换脸图2',
      summary: '图1场景/姿势/服饰/发型全转为真实电影感摄影，人物面部严锁换成图2真实五官骨相，严防二次元大眼或贴图违和感',
      instructions:
        'Follow the Seedream 5.5 Anime-to-Real Scene Translation + Real Face Replacement Spec:\n' +
        '1. Explicit Role Assignment:\n' +
        '   - Image 1 (Anime Scene, Pose, Hair Silhouette, Outfit & Lighting): Translate the ENTIRE anime world, pose, framing, outfit fabrics, hairstyle silhouette, and lighting environment from Image 1 into authentic real-world live-action photography with real cloth textures, real ambient shadows, and individual natural hair strands (avoiding synthetic cosplay wig sheen).\n' +
        '   - Image 2 (Real Face Identity Lock): Replace the anime character face with the exact real human face, bone structure, five facial features (eyes, eyebrows, nose, lips, jawline), and authentic skin texture/micro-pores from Image 2.\n' +
        '2. Integration & Anti-Anime Guard: Preserve Image 2 recognizable real human likeness completely unchanged while adapting lighting highlights, skin tone warmth, and head tilt naturally into Image 1 photographed scene. Explicitly forbid keeping anime eyes, 2D facial geometry, cel shading, 3D CGI render look, or sticker-like face pasting.\n' +
        '3. If images are visually attached, inspect Image 1 outfit/hair/lighting and Image 2 features to craft a cohesive, grounded photorealistic prompt. Output ONLY the clean editing prompt.',
    },
    {
      id: 'seedance-cinematic',
      media: 'video',
      label: 'Seedance 2.5 / 2.0 · 电影物理运镜公式',
      summary: '[主体与微动作]+[环境光影]+[明确物理运镜词+速度]+[材质氛围]+[同步音效]',
      instructions:
        'Follow the ByteDance Seedance 2.5 / 2.0 Prompt Engineering Formula:\n' +
        '[Subject & Continuous Action] + [Environment & Lighting] + [Explicit Physical Camera Move + Speed + Framing] + ' +
        '[Material Texture & Atmosphere] + [Synchronized Audio/SFX Cue].\n' +
        'CRITICAL SEEDANCE RULES:\n' +
        '1. NEVER use ambiguous camera verbs like generic "zoom" or "pan" alone. Always specify physical camera mechanics ' +
        'and speed: e.g. "slow dolly-in from medium shot to close-up", "steady 360-degree orbital tracking shot", ' +
        '"horizontal tracking shot moving parallel alongside the subject", "rack focus from foreground to background", ' +
        '"subtle handheld camera movement", or "static locked tripod shot".\n' +
        '2. Describe continuous natural motion (breathing, fabric flutter, hair drift, eye contact, muscle tension) so ' +
        'frames stay fluid instead of freezing.\n' +
        '3. Include a concrete sound cue at the end (ambient room tone, footsteps, breath, cloth rustle, rain, engine hum).\n' +
        '4. Output ONLY the clean prompt prose without Markdown formatting or headers.',
    },
    {
      id: 'seedance-timeline',
      media: 'video',
      label: 'Seedance 2.5 · 长时长分段分镜脚本 (10–30秒)',
      summary: '使用 [0-5s] [5-10s] [10-15s]... 时间轴精确编排多段动作与运镜转场',
      instructions:
        'Follow the Seedance 2.5 Timed Multi-Beat Choreography Format for longer clips (10-30s):\n' +
        '1. Break the scene into sequential timestamped beats matching the requested duration, e.g.:\n' +
        '   [0-5s] Establishing framing, initial posture, lighting, and steady opening camera motion.\n' +
        '   [5-10s] Action progression, camera push-in or tracking shift, evolving expression/interaction.\n' +
        '   [10-15s] (and further beats if duration > 15s) Climax beat, angle/lens shift, closing visual landing.\n' +
        '2. Maintain strict visual continuity (same subject, wardrobe, lighting palette, spatial logic) across beats.\n' +
        '3. Specify physical camera velocity and synchronized ambient/dialogue audio cues across the timeline.\n' +
        '4. Output ONLY the timestamped prompt text cleanly.',
    },
    {
      id: 'seedance-i2v-ref',
      media: 'video',
      label: 'Seedance · 首尾帧与 @Image 参考动作模板',
      summary: '图生视频不废话重述静止画面，专写帧间动态变化；多图模式精准绑定 @Image 1 / @Image 2',
      instructions:
        'Follow the Seedance Image-to-Video / Reference-to-Video Engineering Spec:\n' +
        '1. For Image-to-Video (start frame / optional end frame): DO NOT waste words re-describing static facial ' +
        'features or backgrounds already visible in the uploaded frame. Focus 100% on WHAT MOVES AND CHANGES from ' +
        'frame 1 onward (head turn, breathing, gesture progression, fabric/hair physics, camera trajectory, lighting shift, ' +
        'and smooth transition toward the closing frame if present).\n' +
        '2. For Reference-to-Video (multi-image): Explicitly assign roles with "@Image 1", "@Image 2" etc. ' +
        '(e.g. "@Image 1 defines the character appearance and outfit, @Image 2 defines the location/lighting") and script ' +
        'their live action + camera move + audio.\n' +
        '3. Output ONLY the clean motion-focused prompt.',
    },
    {
      id: 'wan-director',
      media: 'video',
      label: '万象 Wan 3.0 · 导演多镜头叙事模板',
      summary: '用句号分隔时序动作，支持 Shot 1 / Shot 2 多镜头硬切或严格一镜到底，零废词堆砌',
      instructions:
        'Follow the Alibaba Wan 3.0 / Tongyi Wanxiang Director Script Spec:\n' +
        '1. Core formula: [Camera Language] + [Subject Details] + [Chronological Actions separated by periods] + ' +
        '[Scene & Atmosphere] + [Sound Source + Action].\n' +
        '2. PUNCTUATION RULE: Separate sequential actions using periods (.) rather than lumping everything with commas, ' +
        'so temporal order executes cleanly step by step.\n' +
        '3. SHOT CONTROL: Either script sequential cuts ("Shot 1 [0-4s]: ... Shot 2 [4-8s]: Hard cut, close-up ...") ' +
        'for multi-shot storytelling, OR explicitly specify a single continuous shot if unbroken camera motion is desired.\n' +
        '4. Drop useless filler tokens ("4K, 8K, masterpiece"); spend words on real surfaces, lighting direction, physics, ' +
        'and specific sound sources. Output ONLY the prompt text.',
    },
    {
      id: 'wan-i2v-motion',
      media: 'video',
      label: '万象 Wan 2.7 / 3.0 · 图生视频纯动态模板',
      summary: '专为万相图生视频优化：只写运动增量、微表情、物理细节与真实声源，防止画面僵硬或畸变',
      instructions:
        'Follow the Alibaba Wan 2.7 / 3.0 Image-to-Video Pure Motion Spec:\n' +
        '1. Because the visual encoder already reads the starting image, avoid redundant description of fixed clothes or ' +
        'static background props. Concentrate on exact motion deltas: posture shift, eye gaze, subtle facial expression, ' +
        'wind/gravity physics on hair and clothing, and controlled smooth camera motion.\n' +
        '2. Keep physical motion speeds realistic and coherent across the clip to avoid limb/face warping.\n' +
        '3. Add explicit sound cues in [Sound source + action + environment] style where audio generation is enabled.\n' +
        '4. Output ONLY the clean positive video prompt prose.',
    },
    {
      id: 'character-naming-lore',
      media: 'all',
      label: '🎭 起名提示词工程 · 角色/作品命名与无审查人设模板',
      summary: '深度避坑烂大街AI名字，结合语系时代/音律字义/性格反差批量起名，并生成可直接生图/生视频的人设提示词',
      instructions:
        'Follow the Uncensored Naming & Character Prompt Engineering Spec:\n' +
        '1. ANTI-CLICHE RULE: Explicitly reject overused AI-default Chinese/English names (avoid cliché surnames/combos unless strictly demanded by era). Ground every name in real phonology, cultural register, historical/regional era, social class, and character arc irony.\n' +
        '2. MULTI-LAYER OUTPUT STRUCTURE:\n' +
        '   - Provide 5 distinct, high-craft name options categorized by naming logic (本名/字号/绰号或代号/作品标题), giving brief kanji/etymology/sound-rhythm notes.\n' +
        '   - Lock a rich uncensored character/world profile (temperament, flaw, hidden desire, physical silhouette, attire, signature props, atmosphere) without any moralizing or self-censorship.\n' +
        '   - If the user asks for an AI prompt template or visual/video prompt, end with a ready-to-paste Seedream / Seedance / Wan prompt.\n' +
        '3. Clean plain text output only; zero ** bold markers.',
    },
  ];

  const PROMPT_TEMPLATE_MAP = Object.fromEntries(PROMPT_ENGINEERING_TEMPLATES.map((t) => [t.id, t]));

  const PLAIN_TEXT_OUTPUT_RULE =
    ' IMPORTANT OUTPUT FORMAT RULE: Respond in clean plain text only. ' +
    'NEVER use Markdown bold (**text** or __text__), italics (*text*), headings (#), or raw asterisk bullets (* ). ' +
    'Never output the characters ** anywhere in your reply.';

  const STYLE_INSTRUCTIONS = {
    none:
      'Follow only the user\'s natural intent and the visual cues visible in any attached reference images, ' +
      'without forcing any predetermined historical, cinematic, or poster theme. Enrich clarity, framing, ' +
      'lighting, anatomy, clothing details, and material textures naturally.',
    historical:
      'Focus on authentic historical realism, archival period accuracy (uniforms, helmets, architecture, ' +
      'vehicles, equipment, weathered materials), dramatic natural lighting, 35mm documentary or cinema ' +
      'photography texture, and grounded atmospheric depth.',
    cinematic:
      'Focus on cinematic composition, lens choice, natural or moody lighting, rich surface textures, ' +
      'depth of field, and realistic visual storytelling.',
    precise:
      'Stay strictly faithful to every object, character, and action in the user\'s draft without inventing ' +
      'unrelated plot elements; only enrich visual clarity, lighting, camera framing, and material detail.',
    design:
      'Focus on clean editorial layout, typography hierarchy, exact quoted text placement (noting "No other ' +
      'words anywhere" if exact text is supplied), balanced negative space, and crisp material finish.',
  };

  const DEFAULT_CFG = {
    api_key: '',
    base_url: 'https://api.spicyapi.ai/api/v1',
    llm_provider: 'venice',
    llm_model: 'deepseek-v4-1-flash-1017-uncensored',
    llm_base_url: 'https://api.venice.ai/api/v1',
    llm_api_key: '',
  };

  const blobUrlCache = new Map();

  function randHex(len = 12) {
    const arr = new Uint8Array(Math.ceil(len / 2));
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, len);
  }

  function makeApiError(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    return err;
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonStorage(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function maskKey(val) {
    const k = String(val || '').trim();
    if (!k) return '';
    if (k.length <= 12) return `${k.slice(0, 3)}***${k.slice(-2)}`;
    return `${k.slice(0, 12)}...${k.slice(-4)}`;
  }

  function loadConfig() {
    const saved = readJsonStorage(STORAGE_CFG_KEY, {});
    return { ...DEFAULT_CFG, ...(saved && typeof saved === 'object' ? saved : {}) };
  }

  function importSetupFromHash() {
    try {
      const h = window.location.hash || '';
      if (!h.startsWith('#setup=')) return false;
      const b64 = h.slice('#setup='.length).replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      const jsonStr = new TextDecoder('utf-8').decode(bytes);
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        const cur = loadConfig();
        const aliasMap = {
          a: 'api_key',
          bu: 'base_url',
          p: 'llm_provider',
          m: 'llm_model',
          lu: 'llm_base_url',
          v: 'llm_api_key',
        };
        Object.entries(aliasMap).forEach(([shortKey, fullKey]) => {
          const val = parsed[shortKey] || parsed[fullKey];
          if (typeof val === 'string' && val.trim()) {
            cur[fullKey] = val.trim();
          }
        });
        writeJsonStorage(STORAGE_CFG_KEY, cur);
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    } catch {
      return false;
    }
  }

  importSetupFromHash();

  function getPublicSettings() {
    const cfg = loadConfig();
    return {
      has_api_key: Boolean(cfg.api_key),
      masked_api_key: maskKey(cfg.api_key),
      base_url: cfg.base_url || DEFAULT_CFG.base_url,
      llm_provider: cfg.llm_provider || 'venice',
      llm_model: cfg.llm_model || DEFAULT_CFG.llm_model,
      llm_base_url: cfg.llm_base_url || DEFAULT_CFG.llm_base_url,
      has_llm_api_key: Boolean(cfg.llm_api_key),
      masked_llm_api_key: maskKey(cfg.llm_api_key),
    };
  }

  function resolveLlmCreds() {
    const cfg = loadConfig();
    const provider = cfg.llm_provider || 'venice';
    if (provider === 'spicyapi') {
      return {
        provider,
        baseUrl: `${(cfg.base_url || DEFAULT_CFG.base_url).replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/v1`,
        apiKey: cfg.api_key || '',
        model: cfg.llm_model || SPICY_TEXT_PRESETS[0].id,
      };
    }
    return {
      provider,
      baseUrl: (cfg.llm_base_url || DEFAULT_CFG.llm_base_url).replace(/\/+$/, ''),
      apiKey: cfg.llm_api_key || '',
      model: cfg.llm_model || DEFAULT_CFG.llm_model,
    };
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(key, blob) {
    try {
      const db = await openIdb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(blob, key);
        tx.oncomplete = () => {
          if (blobUrlCache.has(key)) {
            URL.revokeObjectURL(blobUrlCache.get(key));
            blobUrlCache.delete(key);
          }
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Gracefully skip caching in restricted Private Browsing environments
    }
  }

  async function idbGet(key) {
    try {
      const db = await openIdb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async function idbDelete(key) {
    if (blobUrlCache.has(key)) {
      URL.revokeObjectURL(blobUrlCache.get(key));
      blobUrlCache.delete(key);
    }
    try {
      const db = await openIdb();
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      return undefined;
    }
  }

  async function getBlobObjectUrl(key) {
    if (blobUrlCache.has(key)) return blobUrlCache.get(key);
    const blob = await idbGet(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(key, url);
    return url;
  }

  function decodeHtmlImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  async function measureBlobDimensions(blob) {
    try {
      const img = await decodeHtmlImage(blob);
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      return w > 0 && h > 0 ? { width: w, height: h } : null;
    } catch {
      return null;
    }
  }

  async function fitBlobToExactSize(blob, targetWidth, targetHeight, outputFormat = 'png') {
    const tw = Math.round(Number(targetWidth || 0));
    const th = Math.round(Number(targetHeight || 0));
    if (!blob || tw <= 0 || th <= 0) return { blob, width: tw, height: th };
    try {
      const img = await decodeHtmlImage(blob);
      const sw = img.naturalWidth || img.width || 0;
      const sh = img.naturalHeight || img.height || 0;
      if (sw <= 0 || sh <= 0 || (sw === tw && sh === th)) {
        return { blob, width: sw || tw, height: sh || th };
      }
      // Center cover-crop (zero stretching) then resize to exact target pixels
      const srcRatio = sw / sh;
      const dstRatio = tw / th;
      let sx = 0;
      let sy = 0;
      let sWidth = sw;
      let sHeight = sh;
      if (srcRatio > dstRatio) {
        sWidth = sh * dstRatio;
        sx = (sw - sWidth) / 2;
      } else if (srcRatio < dstRatio) {
        sHeight = sw / dstRatio;
        sy = (sh - sHeight) / 2;
      }
      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, tw, th);
      const outMime = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const outBlob = await new Promise((res) =>
        canvas.toBlob((b) => res(b || blob), outMime, outputFormat === 'jpeg' ? 0.94 : undefined)
      );
      return { blob: outBlob, width: tw, height: th, mime: outMime };
    } catch {
      return { blob, width: tw, height: th };
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  async function processImageBlob(
    blob,
    mimeHint,
    { maxDim = 1280, forceJpeg = false, skipDataUrl = false, maxBytes = 9 * 1024 * 1024 } = {}
  ) {
    let rawMime = String(mimeHint || blob.type || 'image/png').split(';')[0].trim().toLowerCase();
    if (rawMime === 'image/jpg') rawMime = 'image/jpeg';
    const supportedUploadMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const needsConvert = forceJpeg || !['image/png', 'image/jpeg', 'image/webp'].includes(rawMime);

    try {
      const img = await decodeHtmlImage(blob);
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const scale = Math.max(w, h) > maxDim ? maxDim / Math.max(w, h) : 1;

      if (!needsConvert && scale >= 0.999 && blob.size <= maxBytes) {
        return {
          blob,
          mime: rawMime,
          dataUrl: skipDataUrl ? '' : await blobToDataUrl(blob),
        };
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let outMime = rawMime === 'image/png' && !forceJpeg ? 'image/png' : 'image/jpeg';
      let outBlob = await new Promise((res) =>
        canvas.toBlob((b) => res(b || blob), outMime, 0.88)
      );
      if (outBlob.size > maxBytes) {
        outMime = 'image/jpeg';
        outBlob = await new Promise((res) =>
          canvas.toBlob((b) => res(b || blob), outMime, 0.84)
        );
      }
      return {
        blob: outBlob,
        mime: outMime,
        dataUrl: skipDataUrl ? '' : await blobToDataUrl(outBlob),
      };
    } catch {
      if (!supportedUploadMimes.includes(rawMime) || blob.size > maxBytes) {
        throw makeApiError('无法解析或压缩该参考图片（建议换一张 PNG / JPEG 图片重试）。', 400);
      }
      return {
        blob,
        mime: rawMime,
        dataUrl: skipDataUrl ? '' : await blobToDataUrl(blob),
      };
    }
  }

  function sanitizePlainText(text, keepBullets = true) {
    if (!text) return '';
    let cleaned = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/\*\*/g, '').replace(/__/g, '');
    cleaned = cleaned.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
    if (keepBullets) {
      cleaned = cleaned.replace(/^([ \t]*)\*[ \t]+/gm, '$1• ');
    } else {
      cleaned = cleaned.replace(/^[ \t]*(?:\*|•|-)[ \t]+/gm, '');
    }
    return cleaned.trim();
  }

  class StreamSanitizer {
    constructor(keepBullets = true) {
      this.keepBullets = keepBullets;
      this.buf = '';
      this.inThink = false;
      this.atLineStart = true;
    }

    feed(chunk) {
      if (!chunk) return '';
      this.buf += chunk;
      return this._drain(false);
    }

    flush() {
      return this._drain(true);
    }

    _cleanSegment(seg) {
      const lines = seg.match(/[^\n]*\n|[^\n]+/g) || [];
      let out = '';
      for (const line of lines) {
        let part = line;
        if (this.atLineStart) {
          part = part.replace(/^[ \t]{0,3}#{1,6}[ \t]+/, '');
          if (this.keepBullets) {
            part = part.replace(/^([ \t]*)\*[ \t]+/, '$1• ');
          } else {
            part = part.replace(/^[ \t]*(?:\*|•|-)[ \t]+/, '');
          }
        }
        part = part.replace(/\*\*/g, '').replace(/__/g, '');
        out += part;
        this.atLineStart = line.endsWith('\n');
      }
      return out;
    }

    _drain(final) {
      let out = '';
      while (this.buf.length > 0) {
        if (this.inThink) {
          const mEnd = /<\/think>/i.exec(this.buf);
          if (mEnd) {
            this.buf = this.buf.slice(mEnd.index + mEnd[0].length).replace(/^[\r\n]+/, '');
            this.inThink = false;
            continue;
          }
          if (final) {
            this.buf = '';
          } else if (this.buf.length > 9) {
            this.buf = this.buf.slice(-9);
          }
          break;
        }

        const mStart = /<think>/i.exec(this.buf);
        if (mStart) {
          const before = this.buf.slice(0, mStart.index);
          if (before) out += this._cleanSegment(before);
          this.buf = this.buf.slice(mStart.index + mStart[0].length);
          this.inThink = true;
          continue;
        }

        if (final) {
          out += this._cleanSegment(this.buf);
          this.buf = '';
          break;
        }

        let hold = 0;
        const lastNl = this.buf.lastIndexOf('\n');
        const curLine = lastNl !== -1 ? this.buf.slice(lastNl + 1) : this.buf;
        const isCurStart = lastNl !== -1 || this.atLineStart;
        if (isCurStart && /^[ \t]*[*#]*[ \t]*$/.test(curLine)) {
          hold = curLine.length;
        } else {
          const mTail = /(?:\*+|_+|#+|<[tT]?[hH]?[iI]?[nN]?[kK]?)$/.exec(this.buf);
          if (mTail) hold = mTail[0].length;
        }

        const safeLen = this.buf.length - hold;
        if (safeLen <= 0) break;
        const emitRaw = this.buf.slice(0, safeLen);
        this.buf = this.buf.slice(safeLen);
        out += this._cleanSegment(emitRaw);
      }
      return out;
    }
  }

  const FORBIDDEN_BROWSER_HEADERS = new Set(['content-length', 'host', 'origin', 'user-agent', 'connection']);

  function sanitizeBrowserHeaders(headersObj) {
    const out = {};
    if (!headersObj || typeof headersObj !== 'object') return out;
    Object.entries(headersObj).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (FORBIDDEN_BROWSER_HEADERS.has(String(k).toLowerCase())) return;
      out[k] = String(v);
    });
    return out;
  }

  function xhrRequest(url, { method = 'GET', headers = {}, body = undefined, timeoutMs = 35000 } = {}) {
    return new Promise((resolve, reject) => {
      if (typeof XMLHttpRequest === 'undefined') {
        reject(new TypeError('XMLHttpRequest unavailable'));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = timeoutMs;
      Object.entries(sanitizeBrowserHeaders(headers)).forEach(([k, v]) => {
        try {
          xhr.setRequestHeader(k, v);
        } catch {
          // ignore browser-restricted headers
        }
      });
      xhr.onload = () => {
        const textVal = xhr.responseText || '';
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          headers: { get: (name) => xhr.getResponseHeader(name) },
          text: async () => textVal,
          json: async () => JSON.parse(textVal || '{}'),
        });
      };
      xhr.onerror = () => reject(new TypeError('Load failed (XHR)'));
      xhr.ontimeout = () => reject(new Error('请求超时'));
      xhr.onabort = () => reject(new Error('请求已取消'));
      xhr.send(body === undefined ? null : body);
    });
  }

  async function fetchWithNetHandling(
    url,
    fetchOpts,
    { label = '网络请求', retries = 1, timeoutMs = 35000, allowXhrFallback = false } = {}
  ) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      try {
        const opts = {
          cache: 'no-store',
          ...fetchOpts,
          ...(controller && !fetchOpts?.signal ? { signal: controller.signal } : {}),
        };
        return await fetch(url, opts);
      } catch (err) {
        lastErr = err?.name === 'AbortError' ? new Error('连接超时') : err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
          continue;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    if (allowXhrFallback && typeof XMLHttpRequest !== 'undefined') {
      try {
        return await xhrRequest(url, {
          method: fetchOpts?.method || 'GET',
          headers: fetchOpts?.headers || {},
          body: fetchOpts?.body,
          timeoutMs,
        });
      } catch (xhrErr) {
        lastErr = xhrErr;
      }
    }
    const detail = lastErr?.message || '网络连接中断';
    throw makeApiError(`${label}失败（${detail}）。请检查手机网络/代理后刷新重试。`, 502);
  }

  async function spicyRequest(
    path,
    { method = 'GET', apiKey, body = null, params = null, retries = null, extraHeaders = null, timeoutMs = 35000 } = {}
  ) {
    if (!apiKey) throw makeApiError('尚未配置 SpicyAPI Key，请点击右上角「⚙️ 设置」填入。', 401);
    const base = (loadConfig().base_url || DEFAULT_CFG.base_url).replace(/\/+$/, '');
    let url = `${base}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }
    const headers = { Authorization: `Bearer ${apiKey}`, ...(extraHeaders || {}) };
    if (body !== null) headers['Content-Type'] = 'application/json';
    const upperMethod = method.toUpperCase();
    const hasIdem = Boolean(headers['Idempotency-Key'] || headers['idempotency-key']);
    const effRetries = retries !== null ? retries : upperMethod === 'GET' || hasIdem ? 2 : 0;
    const resp = await fetchWithNetHandling(
      url,
      {
        method: upperMethod,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
      },
      { label: `连接 SpicyAPI (${path})`, retries: effRetries, timeoutMs, allowXhrFallback: true }
    );
    const json = await resp.json().catch(() => {
      throw makeApiError(`SpicyAPI 返回非 JSON 响应 (${resp.status})`, resp.status);
    });
    const code = json?.code;
    if (!resp.ok || (code !== undefined && code !== 200)) {
      const rawMsg = String(json?.msg || `HTTP ${resp.status}`);
      if (resp.status === 401) throw makeApiError('SpicyAPI Key 无效或已过期，请在设置里重新填入。', 401);
      if (resp.status === 402) throw makeApiError(`SpicyAPI 余额不足（${rawMsg}）`, 402);
      throw makeApiError(rawMsg, resp.status);
    }
    return json.data || {};
  }

  async function fetchVeniceBalance(apiKey, llmBaseUrl) {
    if (!apiKey) throw makeApiError('尚未填写 Venice API Key。', 401);
    const base = (llmBaseUrl || DEFAULT_CFG.llm_base_url).replace(/\/+$/, '');
    const headers = { Authorization: `Bearer ${apiKey}` };
    let resp = await fetchWithNetHandling(
      `${base}/api_keys/rate_limits`,
      { headers },
      { label: '查询 Venice 余额', retries: 1 }
    );
    if (resp.status === 404) {
      resp = await fetchWithNetHandling(
        `${base}/billing/balance`,
        { headers },
        { label: '查询 Venice 余额', retries: 1 }
      );
    }
    const body = await resp.json().catch(() => {
      throw makeApiError(`Venice 返回非 JSON 响应 (${resp.status})`, resp.status);
    });
    if (!resp.ok) {
      throw makeApiError(`Venice 鉴权失败：${body.error || body.message || resp.status}`, resp.status);
    }
    const payload = body?.data && typeof body.data === 'object' ? body.data : body;
    const rawBal = payload?.balances || {};
    return {
      canConsume: Boolean(payload?.accessPermitted ?? payload?.canConsume ?? true),
      tier: payload?.apiTier?.id || null,
      balances: {
        usd: rawBal.USD ?? rawBal.usd ?? null,
        diem: rawBal.DIEM ?? rawBal.diem ?? null,
        bundledCredits: rawBal.BUNDLED_CREDITS ?? rawBal.bundledCredits ?? null,
      },
    };
  }

  async function uploadBlobToSpicy(apiKey, rawBlob, mimeHint) {
    const processed = await processImageBlob(rawBlob, mimeHint, {
      maxDim: 2560,
      forceJpeg: false,
      skipDataUrl: true,
    });
    const ticket = await spicyRequest('/common/upload-url', {
      method: 'POST',
      apiKey,
      body: { contentType: processed.mime, bytes: processed.blob.size },
      retries: 2,
    });
    const putBytes = await processed.blob.arrayBuffer();
    const putHeaders = sanitizeBrowserHeaders(ticket.headers);
    if (!Object.keys(putHeaders).some((k) => k.toLowerCase() === 'content-type')) {
      putHeaders['Content-Type'] = processed.mime;
    }
    const putResp = await fetchWithNetHandling(
      ticket.uploadUrl,
      {
        method: 'PUT',
        headers: putHeaders,
        body: putBytes,
      },
      { label: '上传参考图到云存储', retries: 2, timeoutMs: 45000, allowXhrFallback: true }
    );
    if (!putResp.ok) {
      throw makeApiError(`参考图上传对象存储失败 (HTTP ${putResp.status})`, putResp.status);
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await spicyRequest(`/files/${encodeURIComponent(ticket.fileId)}/commit`, {
          method: 'POST',
          apiKey,
          retries: 2,
        });
        const uri = res?.file?.uri || res?.uri;
        if (uri) return String(uri);
      } catch (err) {
        if ((err.status === 409 || err.status === 429) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        throw err;
      }
    }
    throw makeApiError('文件提交超时，请重试。', 409);
  }

  function buildSeedreamPayload({ mode, prompt, aspect_ratio, resolution, output_format, background, image_uris, num_outputs }) {
    if (!SEEDREAM_MODELS[mode]) throw makeApiError(`不支持的模式: ${mode}`, 400);
    const cleaned = String(prompt || '').trim();
    if (mode !== 'layer-decomposition' && !cleaned) throw makeApiError('请先填写画面描述（Prompt）。', 400);
    if (cleaned.length > 5000) throw makeApiError('提示词不能超过 5000 字符。', 400);

    if (mode === 'text-to-image') {
      const fmt = background === 'transparent' ? 'png' : output_format || 'png';
      return {
        modelId: SEEDREAM_MODELS[mode],
        taskInput: {
          prompt: cleaned,
          aspect_ratio: aspect_ratio || '1:1',
          resolution: resolution || '2k',
          output_format: fmt,
          background: background || 'auto',
        },
      };
    }
    if (mode === 'edit') {
      if (!image_uris?.length) throw makeApiError('编辑模式至少需要 1 张参考图片。', 400);
      const fmt = background === 'transparent' ? 'png' : output_format || 'png';
      return {
        modelId: SEEDREAM_MODELS[mode],
        taskInput: {
          prompt: cleaned,
          image_urls: image_uris,
          aspect_ratio: aspect_ratio || '1:1',
          resolution: resolution || '2k',
          output_format: fmt,
          background: background || 'auto',
        },
      };
    }
    if (!image_uris?.length) throw makeApiError('图层拆解需要 1 张待拆解图片。', 400);
    const out = {
      image_url: image_uris[0],
      num_outputs: Math.max(2, Math.min(100, Number(num_outputs) || 10)),
      resolution: resolution || 'auto',
      output_format: output_format || 'png',
    };
    if (cleaned) out.prompt = cleaned;
    return { modelId: SEEDREAM_MODELS[mode], taskInput: out };
  }

  function buildVideoPayload({
    video_family,
    mode,
    prompt,
    duration_seconds = 5,
    resolution = '720p',
    aspect_ratio = '16:9',
    image_uris = [],
    generate_audio = true,
    negative_prompt = '',
    watermark = false,
    shot_type = 'single',
    enable_thinking = false,
    enable_prompt_expansion = false,
    output_format = 'mp4',
  }) {
    const spec = VIDEO_MODEL_MAP[video_family];
    if (!spec) throw makeApiError(`不支持的视频模型系列：${video_family}`, 400);
    const modelId = spec.tasks[mode];
    if (!modelId) {
      throw makeApiError(`${spec.label} 不支持「${mode}」模式（仅支持：${Object.keys(spec.tasks).join(', ')}）。`, 400);
    }

    const cleanPrompt = String(prompt || '').trim();
    if (
      (mode === 'text-to-video' ||
        mode === 'reference-to-video' ||
        video_family === 'seedance-2.5-flash' ||
        video_family === 'wan-2.7-spicy') &&
      !cleanPrompt
    ) {
      throw makeApiError('当前所选视频模型/模式必须填写动作与画面描述（Prompt）。', 400);
    }
    if (cleanPrompt.length > 5000) throw makeApiError('提示词不能超过 5000 个字符。', 400);

    const uris = (image_uris || []).filter(Boolean);
    if (mode === 'image-to-video' && !uris.length) {
      throw makeApiError('图生视频至少需要上传或选择 1 张首帧图片。', 400);
    }
    if (mode === 'reference-to-video' && !uris.length) {
      throw makeApiError('参考生视频至少需要上传或选择 1 张参考图片。', 400);
    }

    const rawDur = Number(duration_seconds);
    let effDuration;
    if (rawDur === -1 && spec.supports_auto_duration) {
      effDuration = -1;
    } else if (mode === 'reference-to-video' && spec.ref_min_duration !== undefined) {
      const target = rawDur || spec.default_duration;
      effDuration = Math.max(spec.ref_min_duration, Math.min(spec.ref_max_duration, Math.round(target)));
    } else if (Array.isArray(spec.duration_choices) && spec.duration_choices.length) {
      const target = rawDur || spec.default_duration;
      effDuration = spec.duration_choices.reduce((best, cur) =>
        Math.abs(cur - target) < Math.abs(best - target) ? cur : best
      );
    } else {
      const target = rawDur || spec.default_duration;
      effDuration = Math.max(spec.min_duration, Math.min(spec.max_duration, Math.round(target)));
    }

    let allowedRes = [...spec.resolutions];
    if (mode === 'reference-to-video' && spec.ref_max_resolution === '1080p') {
      allowedRes = allowedRes.filter((r) => r !== '4k');
    }
    const effRes = allowedRes.includes(resolution)
      ? resolution
      : allowedRes.includes(spec.default_resolution)
        ? spec.default_resolution
        : allowedRes[0];

    const taskInput = {
      duration_seconds: effDuration,
      resolution: effRes,
    };
    if (cleanPrompt) taskInput.prompt = cleanPrompt;

    if (mode === 'image-to-video') {
      taskInput.image_url = uris[0];
      if (uris.length >= 2 && spec.supports_last_frame) {
        taskInput.last_image_url = uris[1];
      }
      if (spec.i2v_aspect_ratio === 'adaptive_only') {
        taskInput.aspect_ratio = 'adaptive';
      } else if (spec.i2v_aspect_ratio === true && spec.aspect_ratios?.length) {
        taskInput.aspect_ratio = spec.aspect_ratios.includes(aspect_ratio) ? aspect_ratio : spec.default_aspect_ratio;
      }
    } else {
      if (spec.aspect_ratios?.length) {
        taskInput.aspect_ratio = spec.aspect_ratios.includes(aspect_ratio) ? aspect_ratio : spec.default_aspect_ratio;
      }
      if (mode === 'reference-to-video' && uris.length) {
        taskInput.reference_image_urls = uris.slice(0, 10);
      }
    }

    if (spec.supports_audio) taskInput.generate_audio = Boolean(generate_audio);
    if (spec.supports_watermark) taskInput.watermark = Boolean(watermark);
    if (spec.supports_output_format) taskInput.output_format = ['mp4', 'mov'].includes(output_format) ? output_format : 'mp4';
    if (spec.supports_negative_prompt && String(negative_prompt || '').trim()) {
      taskInput.negative_prompt = String(negative_prompt).trim().slice(0, 2000);
    }
    if (spec.supports_shot_type && ['single', 'multi'].includes(shot_type)) {
      taskInput.shot_type = shot_type;
    }
    if (spec.supports_thinking) taskInput.enable_thinking = Boolean(enable_thinking);
    if (spec.supports_prompt_expansion) taskInput.enable_prompt_expansion = Boolean(enable_prompt_expansion);

    return { modelId, taskInput, spec };
  }

  function buildEnhancerMessages({
    userPrompt,
    mode = 'text-to-image',
    style = 'none',
    lang = 'en',
    refCount = 0,
    imageUrls = [],
    templateId = '',
    customTemplate = '',
    targetModel = '',
    durationSeconds = null,
    mediaType = 'image',
    baseImageIndex = null,
    baseImageSize = null,
  }) {
    const styleNote = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.none;
    const langNote =
      lang === 'zh'
        ? 'Write the final output in clear, natural Simplified Chinese.'
        : 'Write the final output in natural, vivid English (under 240 words unless writing a longer timeline/profile).';
    const isVideo = mediaType === 'video' || ['text-to-video', 'image-to-video', 'reference-to-video'].includes(mode);

    let resolvedTplId = String(templateId || '').trim();
    if (!resolvedTplId) {
      if (isVideo) {
        const spec = VIDEO_MODEL_MAP[targetModel];
        if (targetModel.startsWith('seedance') && Number(durationSeconds || 0) >= 10 && mode === 'text-to-video') {
          resolvedTplId = 'seedance-timeline';
        } else if (spec?.default_template) {
          resolvedTplId = spec.default_template;
        } else if (mode === 'image-to-video' || mode === 'reference-to-video') {
          resolvedTplId = 'seedance-i2v-ref';
        } else {
          resolvedTplId = 'seedance-cinematic';
        }
      } else {
        resolvedTplId = mode === 'edit' ? 'seedream-edit' : 'seedream-t2i';
      }
    }

    const customRules = String(customTemplate || '').trim();
    const tplObj = PROMPT_TEMPLATE_MAP[resolvedTplId];
    const tplRules = customRules || tplObj?.instructions || '';

    let modeNote = '';
    if (isVideo) {
      const durHint = durationSeconds && Number(durationSeconds) > 0 ? ` Target clip duration: ${durationSeconds}s.` : '';
      if (mode === 'image-to-video') {
        modeNote =
          `This is an Image-to-Video motion prompt (target model: ${targetModel || 'video'}, ${Math.max(1, refCount)} keyframe image(s) provided).${durHint} ` +
          'Focus on dynamic action, camera movement, physics, and sound evolution rather than repeating static description.';
      } else if (mode === 'reference-to-video') {
        modeNote =
          `This is a Reference-to-Video prompt (target model: ${targetModel || 'video'}, ${Math.max(1, refCount)} reference image(s) provided).${durHint} ` +
          'Bind reference subjects cleanly ("@Image 1", "@Image 2" for Seedance or clear character references for Wan).';
      } else {
        modeNote = `This is a Text-to-Video generation prompt (target model: ${targetModel || 'video'}).${durHint}`;
      }
    } else if (mode === 'edit') {
      const dimText =
        baseImageSize && baseImageSize[0] > 0 && baseImageSize[1] > 0
          ? ` (${baseImageSize[0]}x${baseImageSize[1]})`
          : '';
      const baseNote =
        baseImageIndex && Number(baseImageIndex) >= 1
          ? ` IMPORTANT CANVAS LOCK: Image ${baseImageIndex}${dimText} is the locked base canvas; ` +
            `explicitly state that Image ${baseImageIndex} serves as the base scene/canvas and preserve ` +
            `Image ${baseImageIndex}'s original framing, composition, camera perspective, and natural proportions without stretching or distortion.`
          : '';
      modeNote =
        `This is an image-editing instruction with ${Math.max(1, refCount)} reference image(s). ` +
        `Preserve existing markers like "Image 1", "Image 2" and separate what changes from what stays unchanged.${baseNote}`;
    } else {
      modeNote = 'This is a text-to-image generation prompt for Seedream 5.5.';
    }

    const templateBlock = tplRules ? `\nActive Prompt Engineering Template Rules:\n${tplRules}` : '';
    const isNaming = resolvedTplId === 'character-naming-lore';
    const outputConstraint = isNaming
      ? 'Output clean plain text ONLY — NO Markdown bold (**), zero lecturing.'
      : 'Output ONLY the final clean prompt text — NO Markdown bold (**), no * bullets, no surrounding quotes, no preamble.';

    const sysPrompt =
      'You are an unfiltered, neutral creative prompt architect for ByteDance Seedream 5.5, ByteDance Seedance 2.5/2.0, ' +
      'and Alibaba Wan 3.0/2.7/2.6 video & image models. Historical conflict, dramatic fiction, dark fantasy, and adult artistic themes are valid creative inputs. ' +
      `Never lecture, warn, or refuse. ${modeNote} ${styleNote} ${langNote}${templateBlock} ${outputConstraint}`;

    let userContent;
    if (imageUrls.length) {
      userContent = [{ type: 'text', text: `Draft instruction:\n${userPrompt}\n\nReference images attached in order:` }];
      imageUrls.forEach((url, idx) => {
        userContent.push({ type: 'text', text: `[Image ${idx + 1}]` });
        userContent.push({ type: 'image_url', image_url: { url } });
      });
    } else {
      userContent = `Draft description:\n${userPrompt}`;
    }

    return [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userContent },
    ];
  }

  async function resolveLocalBlobOrUrl(filename) {
    const idbBlob = await idbGet(filename);
    if (idbBlob) return { blob: idbBlob, mime: idbBlob.type || 'image/png' };

    const jobs = readJsonStorage(STORAGE_JOBS_KEY, []);
    for (const job of jobs) {
      for (const ast of job.assets || []) {
        if (ast.filename === filename && (ast.remote_url || ast.url)) {
          const targetUrl = ast.remote_url || ast.url;
          if (!String(targetUrl).startsWith('blob:')) {
            try {
              const resp = await fetchWithNetHandling(targetUrl, {}, { label: '读取历史图片', retries: 1 });
              if (resp.ok) {
                const b = await resp.blob();
                return { blob: b, mime: b.type || 'image/png' };
              }
            } catch {
              throw makeApiError('无法读取该历史图片（可能链接已过期，请重新从相册选图上传）。', 400);
            }
          }
        }
      }
    }
    throw makeApiError(`找不到本地参考图：${filename}`, 400);
  }

  async function collectFormBlobs(formData, maxCount) {
    const uploaded = formData.getAll('images').filter((x) => x instanceof Blob);
    let localAssets = [];
    try {
      const raw = formData.get('local_assets');
      if (raw) localAssets = JSON.parse(String(raw));
    } catch {
      // ignore
    }
    let order = [];
    try {
      const rawOrder = formData.get('reference_order');
      if (rawOrder) order = JSON.parse(String(rawOrder));
    } catch {
      order = [];
    }

    const items = [];
    if (order.length) {
      for (const token of order) {
        if (token.startsWith('local:')) {
          const fname = token.slice(6);
          const got = await resolveLocalBlobOrUrl(fname);
          items.push({ blob: got.blob, mime: got.mime, kind: 'local', localFilename: fname });
        } else if (token.startsWith('upload:')) {
          const idx = Number(token.slice(7));
          if (idx >= 0 && idx < uploaded.length) {
            const f = uploaded[idx];
            items.push({ blob: f, mime: f.type || 'image/png', kind: 'upload', localFilename: null });
          }
        }
      }
    } else {
      for (const fname of localAssets) {
        const got = await resolveLocalBlobOrUrl(String(fname));
        items.push({ blob: got.blob, mime: got.mime, kind: 'local', localFilename: String(fname) });
      }
      for (const f of uploaded) {
        items.push({ blob: f, mime: f.type || 'image/png', kind: 'upload', localFilename: null });
      }
    }
    if (maxCount > 0 && items.length > maxCount) {
      throw makeApiError(`单次最多支持 ${maxCount} 张参考图片。`, 400);
    }
    return items;
  }

  async function streamOpenAIChat(
    { provider, baseUrl, apiKey, model, messages, temperature = 0.75, maxTokens = 2400, keepBullets = true, webSearch = 'off' },
    onEvent
  ) {
    const isVenice = provider === 'venice' || baseUrl.includes('venice.ai');
    if (!apiKey) {
      if (provider === 'spicyapi') throw makeApiError('尚未配置 SpicyAPI Key，请先在设置中填写。', 401);
      throw makeApiError('尚未填写文字/写作模型 API Key：请点右上角「⚙️ 设置」填入 Venice API Key 保存即可。', 401);
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    const payload = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };
    if (isVenice) {
      const veniceParams = {
        include_venice_system_prompt: false,
        strip_thinking_response: true,
      };
      if (webSearch === 'auto' || webSearch === 'on') {
        veniceParams.enable_web_search = webSearch;
        veniceParams.enable_web_citations = true;
        veniceParams.enable_web_scraping = true;
        veniceParams.include_search_results_in_stream = true;
      }
      payload.venice_parameters = veniceParams;
      const vp = VENICE_TEXT_PRESETS.find((p) => p.id === model);
      if (vp?.reasoning_effort) payload.reasoning_effort = vp.reasoning_effort;
    }

    const resp = await fetchWithNetHandling(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      { label: '连接文字模型', retries: 0 }
    );

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const msg = String(errBody?.error?.message || errBody?.error || errBody?.msg || `HTTP ${resp.status}`);
      if (isVenice && resp.status === 401) throw makeApiError(`Venice API Key 无效或已失效。（${msg}）`, 401);
      if (isVenice && resp.status === 402) throw makeApiError(`Venice 余额不足或触发限额。（${msg}）`, 402);
      throw makeApiError(msg, resp.status);
    }

    const sanitizer = new StreamSanitizer(keepBullets);
    let fullText = '';
    let respModel = model;
    let usage = null;
    let citations = [];

    const ctype = (resp.headers.get('content-type') || '').toLowerCase();
    if (!ctype.includes('text/event-stream') || !resp.body) {
      const json = await resp.json();
      respModel = String(json?.model || model);
      usage = json?.usage || null;
      if (Array.isArray(json?.venice_parameters?.web_search_citations)) {
        citations = json.venice_parameters.web_search_citations;
      }
      const raw = String(json?.choices?.[0]?.message?.content || '');
      const clean = sanitizePlainText(raw, keepBullets);
      if (!clean) throw makeApiError('文字模型返回内容为空，请重试。', 502);
      onEvent({ type: 'delta', delta: clean });
      return { content: clean, model: respModel, usage, citations };
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let sseBuf = '';
    const handleFrame = (frame) => {
      for (const rawLine of frame.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;
        let evt;
        try {
          evt = JSON.parse(dataStr);
        } catch {
          continue;
        }
        if (evt.model) respModel = String(evt.model);
        if (evt.usage) usage = evt.usage;
        if (Array.isArray(evt?.venice_parameters?.web_search_citations)) {
          citations = evt.venice_parameters.web_search_citations;
        }
        const piece = evt?.choices?.[0]?.delta?.content;
        if (!piece) continue;
        const cleanPiece = sanitizer.feed(String(piece));
        if (cleanPiece) {
          fullText += cleanPiece;
          onEvent({ type: 'delta', delta: cleanPiece });
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      sseBuf += decoder.decode(value, { stream: true });
      const frames = sseBuf.split(/\r?\n\r?\n/);
      sseBuf = frames.pop() || '';
      frames.forEach(handleFrame);
    }
    if (sseBuf.trim()) handleFrame(sseBuf);

    const tail = sanitizer.flush();
    if (tail) {
      fullText += tail;
      onEvent({ type: 'delta', delta: tail });
    }
    fullText = sanitizePlainText(fullText, keepBullets);
    if (!fullText) throw makeApiError('文字模型返回内容为空，请重试。', 502);
    return { content: fullText, model: respModel, usage, citations };
  }

  async function hydrateJobs(jobs) {
    for (const job of jobs) {
      for (const ast of job.assets || []) {
        if (ast.stored_idb && ast.filename) {
          const objUrl = await getBlobObjectUrl(ast.filename);
          if (objUrl) ast.url = objUrl;
        }
      }
    }
    return jobs;
  }

  async function hydrateWritingSessions(sessions) {
    for (const sess of sessions) {
      for (const msg of sess.messages || []) {
        for (const att of msg.attachments || []) {
          if (att.filename) {
            const objUrl = await getBlobObjectUrl(att.filename);
            if (objUrl) att.url = objUrl;
          }
        }
      }
    }
    return sessions;
  }

  async function syncTask(localId, forceRefresh = false) {
    const jobs = readJsonStorage(STORAGE_JOBS_KEY, []);
    const idx = jobs.findIndex((j) => j.id === localId);
    if (idx === -1) throw makeApiError('任务记录不存在', 404);
    const job = jobs[idx];
    if (!forceRefresh && job.state !== 'queued' && job.state !== 'running') {
      await hydrateJobs([job]);
      return job;
    }

    const apiKey = loadConfig().api_key;
    const remote = await spicyRequest('/jobs/recordInfo', { apiKey, params: { taskId: job.task_id } });
    const state = String(remote.state || 'running');
    job.state = state;
    job.cost = remote.cost || remote.estimatedCost || job.cost;
    job.settled = Boolean(remote.settled);
    job.updated_at = new Date().toISOString();

    if (state === 'succeeded') {
      const remoteAssets = remote.output?.assets || [];
      if (remoteAssets.some((a) => a.pending)) {
        job.state = 'running';
      } else {
        const localAssets = [];
        for (let i = 0; i < remoteAssets.length; i += 1) {
          const ra = remoteAssets[i];
          if (ra.unavailable || !ra.url) continue;
          const mime = String(ra.mime || (job.media_type === 'video' ? 'video/mp4' : 'image/png')).toLowerCase();
          const isVideo = mime.startsWith('video/') || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(ra.url));
          const ext = mime.includes('quicktime')
            ? 'mov'
            : mime.includes('webm')
              ? 'webm'
              : isVideo
                ? 'mp4'
                : mime.includes('jpeg') || mime.includes('jpg')
                  ? 'jpg'
                  : 'png';
          const fname = `${localId}_${i}.${ext}`;
          let storedIdb = false;
          let finalMime = mime;
          let finalW = ra.width;
          let finalH = ra.height;
          const sizeLockCfg = job.params?.size_lock;
          const exactW = sizeLockCfg?.exact_pixel_match ? Number(sizeLockCfg.base_width || 0) : 0;
          const exactH = sizeLockCfg?.exact_pixel_match ? Number(sizeLockCfg.base_height || 0) : 0;
          // Skip storing large video binaries inside mobile browser IndexedDB; stream directly via remote signed URL
          if (!isVideo) {
            try {
              const rImg = await fetch(ra.url);
              if (rImg.ok) {
                let blob = await rImg.blob();
                if (exactW > 0 && exactH > 0) {
                  const fitted = await fitBlobToExactSize(blob, exactW, exactH, job.params?.output_format || 'png');
                  blob = fitted.blob;
                  finalW = fitted.width;
                  finalH = fitted.height;
                  if (fitted.mime) finalMime = fitted.mime;
                }
                await idbPut(fname, blob);
                storedIdb = true;
              }
            } catch {
              // CDN lacked CORS; keep remote signed URL directly for <img>
            }
          }
          localAssets.push({
            kind: isVideo ? 'video' : 'image',
            filename: fname,
            url: storedIdb ? (await getBlobObjectUrl(fname)) || ra.url : ra.url,
            remote_url: ra.url,
            stored_idb: storedIdb,
            mime: finalMime,
            width: finalW,
            height: finalH,
            layer: ra.layer || null,
          });
        }
        job.assets = localAssets;
        job.completed_at = remote.completedAt || new Date().toISOString();
      }
    } else if (state !== 'queued' && state !== 'running') {
      job.error_code = remote.error?.code || remote.errorCode || null;
      job.error_message = remote.error?.message || remote.errorMessage || `任务状态：${state}`;
      job.completed_at = new Date().toISOString();
    }

    jobs[idx] = job;
    writeJsonStorage(STORAGE_JOBS_KEY, jobs.map((j) => ({
      ...j,
      assets: (j.assets || []).map((a) => ({
        ...a,
        url: a.stored_idb ? a.remote_url || '' : a.url,
      })),
    })));
    await hydrateJobs([job]);
    return job;
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    if (path === '/api/config' && method === 'GET') {
      return {
        ok: true,
        cloud_mode: true,
        settings: getPublicSettings(),
        network: {
          local_url: CLOUD_URL,
          primary_lan_url: window.location.origin + window.location.pathname,
          lan_urls: [CLOUD_URL],
        },
        schema: {
          models: SEEDREAM_MODELS,
          video_models: VIDEO_MODEL_CATALOG,
          prompt_templates: PROMPT_ENGINEERING_TEMPLATES,
          aspect_ratios: ASPECT_RATIOS,
          resolutions: IMAGE_RESOLUTIONS,
          layer_resolutions: LAYER_RESOLUTIONS,
          output_formats: OUTPUT_FORMATS,
          backgrounds: BACKGROUNDS,
          llm_presets: {
            venice: VENICE_TEXT_PRESETS,
            spicyapi: SPICY_TEXT_PRESETS,
            custom: CUSTOM_LLM_PRESETS,
          },
          writing_personas: WRITING_PERSONA_META,
        },
      };
    }

    if (path === '/api/config' && method === 'POST') {
      const body = JSON.parse(String(options.body || '{}'));
      const cur = loadConfig();
      if (body.clear_key) cur.api_key = '';
      else if (typeof body.api_key === 'string' && body.api_key.trim()) cur.api_key = body.api_key.trim();
      if (typeof body.base_url === 'string' && body.base_url.trim()) cur.base_url = body.base_url.trim().replace(/\/+$/, '');
      if (typeof body.llm_provider === 'string' && body.llm_provider.trim()) cur.llm_provider = body.llm_provider.trim();
      if (typeof body.llm_model === 'string' && body.llm_model.trim()) cur.llm_model = body.llm_model.trim();
      if (typeof body.llm_base_url === 'string' && body.llm_base_url.trim()) cur.llm_base_url = body.llm_base_url.trim().replace(/\/+$/, '');
      if (body.clear_llm_key) cur.llm_api_key = '';
      else if (typeof body.llm_api_key === 'string' && body.llm_api_key.trim()) cur.llm_api_key = body.llm_api_key.trim();
      writeJsonStorage(STORAGE_CFG_KEY, cur);

      let balance = null;
      let connection_ok = false;
      let connection_error = null;
      if (cur.api_key) {
        try {
          balance = await spicyRequest('/chat/credit', { apiKey: cur.api_key });
          connection_ok = true;
        } catch (err) {
          connection_error = err.message;
        }
      }

      let llm_balance = null;
      let llm_connection_ok = false;
      let llm_connection_error = null;
      const llm = resolveLlmCreds();
      if (llm.provider === 'venice' && llm.apiKey) {
        try {
          llm_balance = await fetchVeniceBalance(llm.apiKey, llm.baseUrl);
          llm_connection_ok = true;
        } catch (err) {
          llm_connection_error = err.message;
        }
      }

      return {
        ok: true,
        settings: getPublicSettings(),
        connection_ok,
        connection_error,
        balance,
        llm_connection_ok,
        llm_connection_error,
        llm_balance,
      };
    }

    if (path === '/api/balance') {
      const balance = await spicyRequest('/chat/credit', { apiKey: loadConfig().api_key });
      return { ok: true, balance };
    }

    if (path === '/api/llm-balance') {
      const llm = resolveLlmCreds();
      if (llm.provider !== 'venice') return { ok: true, provider: llm.provider, supported: false, balance: null };
      const balance = await fetchVeniceBalance(llm.apiKey, llm.baseUrl);
      return { ok: true, provider: 'venice', supported: true, balance };
    }

    if (path === '/api/console-overview' && method === 'GET') {
      const cfg = loadConfig();
      const spicyKey = cfg.api_key || '';
      const llm = resolveLlmCreds();
      const spicy = { configured: Boolean(spicyKey) };
      if (spicyKey) {
        const settle = await Promise.allSettled([
          spicyRequest('/chat/credit', { apiKey: spicyKey }),
          spicyRequest('/usage', { apiKey: spicyKey }),
          spicyRequest('/jobs', { apiKey: spicyKey, params: { limit: 25 } }),
          spicyRequest('/models', { apiKey: spicyKey, params: { limit: 100 } }),
        ]);
        const keys = ['balance', 'usage', 'jobs', 'models'];
        const errs = [];
        settle.forEach((res, idx) => {
          const name = keys[idx];
          if (res.status === 'fulfilled') {
            if (name === 'models') {
              const items = res.value?.items || [];
              const categories = {};
              items.forEach((it) => {
                const c = String(it.modality || it.category || 'other');
                categories[c] = (categories[c] || 0) + 1;
              });
              spicy.models = {
                total: Number(res.value?.total || items.length),
                categories,
                items_sample_count: items.length,
              };
            } else {
              spicy[name] = res.value;
            }
          } else {
            spicy[name] = null;
            errs.push(`${name}: ${res.reason?.message || res.reason}`);
          }
        });
        if (errs.length) spicy.error = errs.join(' | ');
      }
      const venice = { provider: llm.provider, model: llm.model, configured: Boolean(llm.apiKey) };
      if (llm.provider === 'venice' && llm.apiKey) {
        try {
          venice.balance = await fetchVeniceBalance(llm.apiKey, llm.baseUrl);
        } catch (err) {
          venice.error = err.message;
        }
      }
      return { ok: true, spicy, venice };
    }

    if (path === '/api/quote' && method === 'POST') {
      const body = JSON.parse(String(options.body || '{}'));
      const mediaType = body.media_type || 'image';
      const apiKey = loadConfig().api_key;
      if (mediaType === 'video') {
        const videoFamily = body.video_family || 'seedance-2.5';
        const mode = body.mode || 'text-to-video';
        const spec = VIDEO_MODEL_MAP[videoFamily];
        if (!spec) throw makeApiError(`不支持的视频模型：${videoFamily}`, 400);
        const dummyUris = mode !== 'text-to-video' ? ['https://example.com/ref.png'] : [];
        const { modelId, taskInput } = buildVideoPayload({
          video_family: videoFamily,
          mode,
          prompt: String(body.prompt || '').trim() || 'smooth camera push in, natural motion',
          duration_seconds: body.duration_seconds !== undefined ? Number(body.duration_seconds) : spec.default_duration,
          resolution: body.resolution || spec.default_resolution,
          aspect_ratio: body.aspect_ratio || spec.default_aspect_ratio,
          image_uris: dummyUris,
          generate_audio: body.generate_audio !== undefined ? Boolean(body.generate_audio) : true,
          negative_prompt: body.negative_prompt || '',
          watermark: Boolean(body.watermark),
          shot_type: body.shot_type || 'single',
          enable_thinking: Boolean(body.enable_thinking),
          enable_prompt_expansion: Boolean(body.enable_prompt_expansion),
          output_format: body.output_format || 'mp4',
        });
        if (mode === 'text-to-video' && apiKey) {
          const quote = await spicyRequest('/jobs/quote', {
            method: 'POST',
            apiKey,
            body: { model: modelId, input: taskInput },
          });
          return { ok: true, source: 'live', quote };
        }
        const durLabel = taskInput.duration_seconds === -1 ? '自动匹配' : `${taskInput.duration_seconds}秒`;
        return {
          ok: true,
          source: 'catalog',
          quote: {
            estimatedCost: spec.price_hint || '实时锁价',
            currency: 'USD',
            note: `${spec.label} · ${taskInput.resolution} · ${durLabel}${spec.price_hint ? `（参考：${spec.price_hint}）` : ''}`,
          },
        };
      }

      const mode = body.mode || 'text-to-image';
      const resolution = body.resolution || '2k';
      if (mode === 'text-to-image' && apiKey) {
        const { modelId, taskInput } = buildSeedreamPayload({
          mode,
          prompt: body.prompt || 'a studio photo',
          aspect_ratio: body.aspect_ratio || '1:1',
          resolution,
          output_format: body.output_format || 'png',
          background: body.background || 'auto',
        });
        const quote = await spicyRequest('/jobs/quote', {
          method: 'POST',
          apiKey,
          body: { model: modelId, input: taskInput },
        });
        return { ok: true, source: 'live', quote };
      }
      const unitPrice = resolution === '2k' || resolution === 'auto' ? '0.035' : '0.02';
      return {
        ok: true,
        source: 'catalog',
        quote: { estimatedCost: unitPrice, currency: 'USD', note: '官方目录参考价' },
      };
    }

    if (path === '/api/tasks' && method === 'GET') {
      const jobs = await hydrateJobs(readJsonStorage(STORAGE_JOBS_KEY, []));
      return { ok: true, items: jobs };
    }

    if (path.startsWith('/api/tasks/') && method === 'GET') {
      const id = decodeURIComponent(path.slice('/api/tasks/'.length));
      const job = await syncTask(id, false);
      return { ok: true, job };
    }

    if (path.endsWith('/refresh') && method === 'POST') {
      const id = decodeURIComponent(path.slice('/api/tasks/'.length, -'/refresh'.length));
      const job = await syncTask(id, true);
      return { ok: true, job };
    }

    if (path.startsWith('/api/tasks/') && method === 'DELETE') {
      const id = decodeURIComponent(path.slice('/api/tasks/'.length));
      const jobs = readJsonStorage(STORAGE_JOBS_KEY, []);
      const target = jobs.find((j) => j.id === id);
      const remaining = jobs.filter((j) => j.id !== id);
      writeJsonStorage(STORAGE_JOBS_KEY, remaining);
      for (const ast of target?.assets || []) {
        if (ast.filename) await idbDelete(ast.filename);
      }
      return { ok: true };
    }

    if (path === '/api/generate' && method === 'POST') {
      const apiKey = loadConfig().api_key;
      if (!apiKey) throw makeApiError('尚未配置 SpicyAPI Key，请先点击右上角「⚙️ 设置」填入。', 401);
      const fd = options.body;
      const parseBool = (val, def = false) => {
        if (val === null || val === undefined || val === '') return def;
        return ['1', 'true', 'yes', 'on'].includes(String(val).trim().toLowerCase());
      };
      const mediaType = String(fd.get('media_type') || 'image');
      const mode = String(fd.get('mode') || (mediaType === 'video' ? 'text-to-video' : 'text-to-image'));
      const prompt = String(fd.get('prompt') || '');

      const collected = await collectFormBlobs(fd, 10);
      if (mediaType !== 'video' && (mode === 'edit' || mode === 'layer-decomposition') && !collected.length) {
        throw makeApiError('请至少上传或选择 1 张参考图片。', 400);
      }
      const image_uris = [];
      for (const c of collected) {
        image_uris.push(await uploadBlobToSpicy(apiKey, c.blob, c.mime));
      }

      let modelId;
      let taskInput;
      let localId;
      let recordParams;

      if (mediaType === 'video') {
        const videoFamily = String(fd.get('video_family') || 'seedance-2.5');
        const spec = VIDEO_MODEL_MAP[videoFamily];
        if (!spec) throw makeApiError(`不支持的视频模型：${videoFamily}`, 400);
        const rawDur = fd.get('duration_seconds');
        const durationSeconds = rawDur !== null && rawDur !== '' ? Number(rawDur) : spec.default_duration;
        const resolution = String(fd.get('resolution') || spec.default_resolution);
        const aspectRatio = String(fd.get('aspect_ratio') || spec.default_aspect_ratio);
        const outputFormat = String(fd.get('output_format') || 'mp4');
        const built = buildVideoPayload({
          video_family: videoFamily,
          mode,
          prompt,
          duration_seconds: durationSeconds,
          resolution,
          aspect_ratio: aspectRatio,
          image_uris,
          generate_audio: parseBool(fd.get('generate_audio'), true),
          negative_prompt: String(fd.get('negative_prompt') || ''),
          watermark: parseBool(fd.get('watermark'), false),
          shot_type: String(fd.get('shot_type') || 'single'),
          enable_thinking: parseBool(fd.get('enable_thinking'), false),
          enable_prompt_expansion: parseBool(fd.get('enable_prompt_expansion'), false),
          output_format: outputFormat,
        });
        modelId = built.modelId;
        taskInput = built.taskInput;
        localId = `vd_${randHex(12)}`;
        recordParams = {
          video_family: videoFamily,
          aspect_ratio: taskInput.aspect_ratio || aspectRatio,
          resolution: taskInput.resolution || resolution,
          duration_seconds: taskInput.duration_seconds,
          generate_audio: taskInput.generate_audio,
          output_format: taskInput.output_format || outputFormat,
          shot_type: taskInput.shot_type || null,
          ref_count: image_uris.length,
        };
      } else {
        let aspect_ratio = String(fd.get('aspect_ratio') || '1:1');
        const resolution = String(fd.get('resolution') || (mode === 'layer-decomposition' ? 'auto' : '2k'));
        const output_format = String(fd.get('output_format') || 'png');
        const background = String(fd.get('background') || 'auto');
        const num_outputs = Number(fd.get('num_outputs') || 10);
        const sizeLockMode = String(fd.get('size_lock_mode') || 'manual').trim().toLowerCase();
        const exactPixelMatch = parseBool(fd.get('exact_pixel_match'), false);
        let sizeLockMeta = null;
        let effectivePrompt = prompt;

        if (mode === 'edit' && collected.length && sizeLockMode !== 'manual') {
          let lockedIdx = null;
          let lockReason = '';
          if (sizeLockMode === 'auto') {
            const det = detectEditBaseImage(prompt, collected.length);
            if (det) {
              lockedIdx = det.index;
              lockReason = det.reason || '';
            }
          } else if (sizeLockMode.startsWith('ref:')) {
            const parsed = Number(sizeLockMode.slice(4));
            if (Number.isInteger(parsed) && parsed >= 1 && parsed <= collected.length) {
              lockedIdx = parsed;
              lockReason = `手动锁定 Image ${lockedIdx} 原尺寸`;
            }
          }
          if (lockedIdx !== null) {
            const dims = await measureBlobDimensions(collected[lockedIdx - 1].blob);
            const baseW = dims?.width || null;
            const baseH = dims?.height || null;
            if (baseW && baseH) {
              aspect_ratio = matchClosestAspectRatio(baseW, baseH);
            }
            effectivePrompt = appendBaseCanvasLockHint(prompt, lockedIdx);
            sizeLockMeta = {
              mode: sizeLockMode,
              base_index: lockedIdx,
              base_width: baseW,
              base_height: baseH,
              matched_aspect_ratio: aspect_ratio,
              exact_pixel_match: Boolean(exactPixelMatch && baseW && baseH),
              reason: lockReason,
            };
          }
        }

        const built = buildSeedreamPayload({
          mode,
          prompt: effectivePrompt,
          aspect_ratio,
          resolution,
          output_format,
          background,
          image_uris,
          num_outputs,
        });
        modelId = built.modelId;
        taskInput = built.taskInput;
        localId = `sd_${randHex(12)}`;
        recordParams = {
          aspect_ratio: taskInput.aspect_ratio || aspect_ratio,
          resolution,
          output_format: taskInput.output_format || output_format,
          background: taskInput.background || background,
          ref_count: image_uris.length,
          num_outputs: taskInput.num_outputs || null,
          size_lock: sizeLockMeta,
        };
      }

      const remote = await spicyRequest('/jobs/createTask', {
        method: 'POST',
        apiKey,
        body: { model: modelId, input: taskInput },
        extraHeaders: { 'Idempotency-Key': localId },
        retries: 2,
      });
      const taskId = String(remote.taskId || '');
      if (!taskId) throw makeApiError('SpicyAPI 未返回有效的 taskId。', 500);

      const now = new Date().toISOString();
      const record = {
        id: localId,
        task_id: taskId,
        media_type: mediaType,
        mode,
        model: modelId,
        prompt: prompt.trim(),
        params: recordParams,
        state: String(remote.state || 'queued'),
        estimated_cost: remote.estimatedCost || remote.cost || null,
        cost: remote.cost || null,
        settled: Boolean(remote.settled),
        deadline_at: remote.deadlineAt || null,
        assets: [],
        created_at: now,
        updated_at: now,
        completed_at: null,
      };
      const jobs = readJsonStorage(STORAGE_JOBS_KEY, []);
      jobs.unshift(record);
      writeJsonStorage(STORAGE_JOBS_KEY, jobs.slice(0, 100));
      return { ok: true, job: record };
    }

    if (path === '/api/writing/sessions' && method === 'GET') {
      const items = await hydrateWritingSessions(readJsonStorage(STORAGE_WRITING_KEY, []));
      return { ok: true, items };
    }

    if (path.startsWith('/api/writing/sessions/') && method === 'DELETE') {
      const sid = decodeURIComponent(path.slice('/api/writing/sessions/'.length));
      const sessions = readJsonStorage(STORAGE_WRITING_KEY, []);
      const target = sessions.find((s) => s.id === sid);
      const remaining = sessions.filter((s) => s.id !== sid);
      writeJsonStorage(STORAGE_WRITING_KEY, remaining);

      const stillUsed = new Set(
        remaining.flatMap((s) => (s.messages || []).flatMap((m) => (m.attachments || []).map((a) => a.filename).filter(Boolean)))
      );
      for (const m of target?.messages || []) {
        for (const att of m.attachments || []) {
          if (att.source === 'upload' && att.filename && !stillUsed.has(att.filename)) {
            await idbDelete(att.filename);
          }
        }
      }
      return { ok: true };
    }

    throw makeApiError(`不支持的本地云端接口: ${method} ${path}`, 404);
  }

  async function stream(path, options, onEvent) {
    const llm = resolveLlmCreds();

    if (path === '/api/enhance-prompt/stream') {
      let prompt = '';
      let mode = 'text-to-image';
      let style = 'none';
      let lang = 'en';
      let templateId = '';
      let customTemplate = '';
      let targetModel = '';
      let mediaType = 'image';
      let durationSeconds = null;
      let refCount = 0;
      let baseImageIndex = null;
      let baseImageW = null;
      let baseImageH = null;
      let blobs = [];
      if (options.body instanceof FormData) {
        const fd = options.body;
        prompt = String(fd.get('prompt') || '');
        mode = String(fd.get('mode') || 'text-to-image');
        style = String(fd.get('style') || 'none');
        lang = String(fd.get('lang') || 'en');
        templateId = String(fd.get('template_id') || '');
        customTemplate = String(fd.get('custom_template') || '');
        targetModel = String(fd.get('target_model') || '');
        mediaType = String(fd.get('media_type') || 'image');
        const rawDur = fd.get('duration_seconds');
        durationSeconds = rawDur !== null && rawDur !== '' ? Number(rawDur) : null;
        refCount = Number(fd.get('ref_count') || 0);
        baseImageIndex = fd.get('base_image_index') ? Number(fd.get('base_image_index')) : null;
        baseImageW = fd.get('base_image_width') ? Number(fd.get('base_image_width')) : null;
        baseImageH = fd.get('base_image_height') ? Number(fd.get('base_image_height')) : null;
        blobs = await collectFormBlobs(fd, 6);
        refCount = Math.max(refCount, blobs.length);
      } else {
        const b = JSON.parse(String(options.body || '{}'));
        prompt = String(b.prompt || '');
        mode = String(b.mode || 'text-to-image');
        style = String(b.style || 'none');
        lang = String(b.lang || 'en');
        templateId = String(b.template_id || '');
        customTemplate = String(b.custom_template || '');
        targetModel = String(b.target_model || '');
        mediaType = String(b.media_type || 'image');
        durationSeconds = b.duration_seconds !== undefined && b.duration_seconds !== null ? Number(b.duration_seconds) : null;
        refCount = Number(b.ref_count || 0);
        baseImageIndex = b.base_image_index ? Number(b.base_image_index) : null;
        baseImageW = b.base_image_width ? Number(b.base_image_width) : null;
        baseImageH = b.base_image_height ? Number(b.base_image_height) : null;
      }
      const cleaned = prompt.trim();
      if (!cleaned) throw makeApiError('请先在输入框写几句简单描述，再点击 AI 扩写。', 400);

      const imageUrls = await Promise.all(
        blobs.map(async (b) => (await processImageBlob(b.blob, b.mime, { maxDim: 1280, forceJpeg: true })).dataUrl)
      );
      const baseImageSize = baseImageW > 0 && baseImageH > 0 ? [baseImageW, baseImageH] : null;
      const messages = buildEnhancerMessages({
        userPrompt: cleaned,
        mode,
        style,
        lang,
        refCount,
        imageUrls,
        templateId,
        customTemplate,
        targetModel,
        durationSeconds,
        mediaType,
        baseImageIndex,
        baseImageSize,
      });

      const res = await streamOpenAIChat(
        {
          provider: llm.provider,
          baseUrl: llm.baseUrl,
          apiKey: llm.apiKey,
          model: llm.model,
          messages,
          temperature: 0.7,
          maxTokens: 1800,
          keepBullets: false,
        },
        onEvent
      );
      onEvent({
        type: 'done',
        prompt: sanitizePlainText(res.content, false),
        model: res.model,
        used_vision: imageUrls.length > 0,
      });
      return;
    }

    if (path === '/api/writing/chat/stream') {
      const fd = options.body;
      const sessionId = String(fd.get('session_id') || '').trim();
      let userMessage = String(fd.get('message') || '').trim();
      const persona = String(fd.get('persona') || '').trim();
      const customSystem = fd.has('custom_system') ? String(fd.get('custom_system') || '') : null;
      const reqModel = String(fd.get('model') || '').trim();
      const rawWs = String(fd.get('web_search') || 'off').trim().toLowerCase();
      const webSearch = ['off', 'auto', 'on'].includes(rawWs) ? rawWs : 'off';

      const collected = await collectFormBlobs(fd, 4);
      if (!userMessage && !collected.length) {
        throw makeApiError('请输入写作要求，或至少上传 1 张参考图。', 400);
      }
      if (!userMessage && collected.length) {
        userMessage = '请仔细观察我发送的参考图，结合画面细节进行生动创作或按场景续写。';
      }

      const sessions = readJsonStorage(STORAGE_WRITING_KEY, []);
      const now = new Date().toISOString();
      const existing = sessionId ? sessions.find((s) => s.id === sessionId) : null;
      const effPersona = persona || existing?.persona || 'unrestricted';
      const effCustomSystem = customSystem !== null ? customSystem : existing?.custom_system || '';
      const effModel = reqModel || existing?.model || llm.model;

      const session = existing
        ? { ...existing, persona: effPersona, custom_system: effCustomSystem, model: effModel, messages: [...(existing.messages || [])] }
        : {
            id: sessionId || `wr_${randHex(12)}`,
            title: userMessage.slice(0, 28).replace(/\n/g, ' '),
            persona: effPersona,
            custom_system: effCustomSystem,
            model: effModel,
            messages: [],
            created_at: now,
            updated_at: now,
          };

      const batch = `wr_${randHex(12)}`;
      const savedBlobKeys = [];
      const attachments = [];
      for (let i = 0; i < collected.length; i += 1) {
        const item = collected[i];
        if (item.kind === 'local' && item.localFilename) {
          attachments.push({
            filename: item.localFilename,
            url: (await getBlobObjectUrl(item.localFilename)) || '',
            mime: item.mime,
            source: 'output',
          });
        } else {
          const fname = `${batch}_${i}.jpg`;
          const processed = await processImageBlob(item.blob, item.mime, { maxDim: 1280, forceJpeg: true });
          await idbPut(fname, processed.blob);
          savedBlobKeys.push(fname);
          attachments.push({
            filename: fname,
            url: (await getBlobObjectUrl(fname)) || '',
            mime: processed.mime,
            source: 'upload',
          });
        }
      }

      const userTurn = {
        id: `m_${randHex(10)}`,
        role: 'user',
        content: userMessage,
        attachments,
        created_at: now,
      };
      const turnsForApi = [...session.messages, userTurn];

      // Include up to 24 recent turns and up to 6 recent images
      const recent = turnsForApi.slice(-24);
      const includeTurnImgs = new Array(recent.length).fill(false);
      let remImgs = 6;
      for (let i = recent.length - 1; i >= 0; i -= 1) {
        const atts = recent[i].attachments || [];
        if (atts.length && remImgs > 0) {
          includeTurnImgs[i] = true;
          remImgs -= atts.length;
        }
      }

      const apiMessages = [];
      const baseSys = (effCustomSystem || '').trim() || WRITING_PERSONAS[effPersona] || WRITING_PERSONAS.unrestricted;
      apiMessages.push({ role: 'system', content: `${baseSys}\n${PLAIN_TEXT_OUTPUT_RULE}` });

      for (let i = 0; i < recent.length; i += 1) {
        const turn = recent[i];
        const role = turn.role === 'assistant' ? 'assistant' : 'user';
        const atts = turn.attachments || [];
        if (role === 'user' && atts.length && includeTurnImgs[i]) {
          const parts = [{ type: 'text', text: turn.content || '' }];
          for (let aIdx = 0; aIdx < atts.length; aIdx += 1) {
            const got = await resolveLocalBlobOrUrl(atts[aIdx].filename).catch(() => null);
            const blobObj = got?.blob;
            if (!blobObj) continue;
            const processed = await processImageBlob(blobObj, atts[aIdx].mime, { maxDim: 1280, forceJpeg: true });
            parts.push({ type: 'text', text: `[参考图 ${aIdx + 1}]` });
            parts.push({ type: 'image_url', image_url: { url: processed.dataUrl } });
          }
          apiMessages.push({ role, content: parts });
        } else {
          apiMessages.push({ role, content: turn.content || '' });
        }
      }

      let res;
      try {
        res = await streamOpenAIChat(
          {
            provider: llm.provider,
            baseUrl: llm.baseUrl,
            apiKey: llm.apiKey,
            model: effModel,
            messages: apiMessages,
            temperature: 0.8,
            maxTokens: 2600,
            keepBullets: true,
            webSearch,
          },
          onEvent
        );
      } catch (err) {
        for (const k of savedBlobKeys) await idbDelete(k);
        throw err;
      }

      const citations = res.citations || [];
      const replyTurn = {
        id: `m_${randHex(10)}`,
        role: 'assistant',
        content: res.content,
        model: res.model,
        usage: res.usage,
        citations,
        created_at: new Date().toISOString(),
      };
      session.messages = [...turnsForApi, replyTurn];
      session.updated_at = new Date().toISOString();

      // Persist clean serializable metadata (object URLs rehydrate cleanly from IndexedDB)
      const persistedSession = {
        ...session,
        messages: session.messages.map((m) => ({
          ...m,
          attachments: (m.attachments || []).map((a) => ({
            filename: a.filename,
            url: '',
            mime: a.mime,
            source: a.source,
          })),
        })),
      };
      const updatedList = [persistedSession, ...sessions.filter((s) => s.id !== session.id)].slice(0, 60);
      writeJsonStorage(STORAGE_WRITING_KEY, updatedList);
      await hydrateWritingSessions([session]);
      onEvent({ type: 'done', session, reply: res.content, model: res.model, usage: res.usage, citations });
      return;
    }

    throw makeApiError(`不支持的流式接口: ${path}`, 404);
  }

  window.DirectApi = {
    CLOUD_URL,
    request,
    stream,
    normalizeImageRefTokens,
    detectEditBaseImage,
    matchClosestAspectRatio,
    appendBaseCanvasLockHint,
    isKnownStaticHost: () =>
      window.location.hostname.endsWith('.github.io') ||
      window.location.hostname.endsWith('.pages.dev') ||
      window.location.hostname.endsWith('.netlify.app') ||
      window.location.hostname.endsWith('.vercel.app') ||
      window.location.protocol === 'file:',
  };
})();
