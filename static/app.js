(() => {
  const RATIO_DIMS = {
    '1:1': [14, 14],
    '4:3': [16, 12],
    '3:4': [12, 16],
    '16:9': [18, 10],
    '9:16': [10, 18],
    '3:2': [16, 11],
    '2:3': [11, 16],
    '21:9': [20, 9],
  };

  const MODE_META = {
    'text-to-image': {
      btn: '开始生成',
      promptLabel: '画面描述（Prompt）',
      placeholder: '描述你想生成的画面细节、主体、光线、构图或需要出现的文字（支持中英文）...',
      presets: [
        { label: '电影感人像', text: '35mm film portrait of a young woman standing by a rain-streaked Tokyo cafe window at dusk, warm amber interior glow, natural skin texture, shallow depth of field' },
        { label: '透明底产品', text: 'Glossy ceramic teal mug with a minimalist white fox emblem, three-quarter studio angle, soft diffused studio lighting, isolated product cutout' },
        { label: '中文排版海报', text: 'Editorial design poster on textured warm paper. Large serif title "AUTUMN", clean Chinese subtitle "秋夜特辑", small footer "Issue 05 · Tokyo". No other words anywhere.' },
      ],
    },
    'edit': {
      btn: '开始编辑',
      promptLabel: '编辑指令（可用 Image 1, Image 2, Image 3 指代参考图）',
      placeholder: '例如：将 Image 1 中的人物换穿红色丝绸长裙，放在雨夜的东京街头，保持脸部五官不变。',
      presets: [
        {
          label: '图2换脸+发型（模仿图1表情）',
          templateId: 'seedream-edit-facehair-expr1',
          text: 'Edit Image 1 using Image 2 as the strict identity and hair reference. Replace the face, head structure, all five facial features (eyes, eyebrows, nose, lips, jawline, ears), hairline, and the complete hairstyle (hair length, parting, bangs, texture, and color) of the person in Image 1 with the exact facial identity and full hairstyle from Image 2. Adapt Image 2\'s facial muscles, eye gaze direction, eyebrow tilt, and mouth shape to accurately mimic the exact facial expression shown in Image 1 while keeping Image 2\'s facial bone structure and likeness intact. Keep everything else from Image 1 strictly unchanged: exact framing, composition, camera angle, body pose, body proportions, neck and shoulders, clothing, accessories, background, shadows, and ambient lighting. Do not retain Image 1\'s original face or hair. Blend neck skin tone and lighting highlights seamlessly.',
        },
        {
          label: '图2换脸+发型（不模仿图1表情）',
          templateId: 'seedream-edit-facehair-keep2',
          text: 'Edit Image 1 using Image 2 as the strict identity, hair, and expression reference. Replace the face, head, all five facial features (eyes, eyebrows, nose, lips, jawline, ears), hairline, and the complete hairstyle (hair length, parting, bangs, texture, and color) of the person in Image 1 with the person from Image 2. Strictly preserve Image 2\'s own natural facial expression, eye gaze direction, eyebrow posture, and mouth expression completely unchanged; do NOT mimic or copy the expression from Image 1, only tilt the head slightly if needed to fit Image 1\'s neck angle naturally. Keep everything else from Image 1 strictly unchanged: exact framing, composition, camera angle, body pose, body proportions, clothing, accessories, background, shadows, and ambient lighting. Do not retain Image 1\'s original face, hair, or expression. Match skin tone transition at the neck and scene lighting seamlessly.',
        },
        {
          label: '图1构图+图2脸不变+图3身材',
          templateId: 'seedream-edit-3img-face-body',
          text: 'Multi-image character edit combining Image 1, Image 2, and Image 3 with strict role separation: Use Image 1 for the scene, composition, camera framing, pose, outfit, background, and lighting. Replace the person\'s head, face, five facial features, and hairstyle in Image 1 with the exact facial identity and hairstyle from Image 2, keeping Image 2\'s facial features completely unchanged and seamlessly matched to Image 1\'s lighting. Reshape the person\'s body build and physique proportions inside Image 1\'s pose and outfit to match the exact body shape of the person in Image 3 (matching Image 3\'s shoulder width, chest/bust volume, waist-to-hip curve, torso build, and limb proportions), letting Image 1\'s clothing fit and drape naturally over Image 3\'s body silhouette. Strictly keep Image 1\'s background, framing, pose, clothing design, and lighting unchanged. Do NOT transfer any face, hairstyle, clothing, or background from Image 3, and do NOT keep Image 1\'s original face.',
        },
        {
          label: '动漫转真人（自然摄影）',
          templateId: 'seedream-edit-anime-to-real',
          text: 'A candid real-world live-action photograph naturally translating the anime character and entire scene from Image 1 into real life. Convert Image 1 into an authentic living human with realistic human skeletal and facial proportions (natural human eye size, realistic nose bridge, natural jawline, subtle facial asymmetry), real skin micro-pores, gentle subsurface scattering, intricate realistic irises, and individual natural hair strands replacing flat cel-shaded hair clumps and synthetic shine. Translate Image 1\'s exact pose, expression, outfit design, hairstyle silhouette, framing, background, and lighting into tangible real-world photography with real fabric weave, creases, and natural shadows. Avoid any anime lines, cel shading, 3D CGI render look, doll-like symmetry, plastic airbrushed skin, or artificial cosplay wig appearance.',
        },
        {
          label: '图1动漫转真人+换脸图2',
          templateId: 'seedream-edit-anime-to-real-face2',
          text: 'A candid real-world live-action photograph translating the entire anime scene, character pose, outfit, framing, background, and lighting from Image 1 into real life, while replacing the character\'s face with the exact real human face and identity from Image 2. Keep Image 2\'s facial bone structure, all five facial features (eyes, eyebrows, nose, lips, jawline), authentic skin texture, micro-pores, and natural human facial proportions strictly unchanged, blending them seamlessly into Image 1\'s head orientation and ambient lighting. Convert Image 1\'s anime hairstyle, hair color, clothing, and environment into real individual hair strands, authentic fabric weave, physical shadows, and real-world photography depth. Do NOT retain anime eyes, cel-shaded facial geometry, 2D outlines, 3D CGI plastic skin, or artificial cosplay wig textures.',
        },
        { label: '换装换场景', templateId: 'seedream-edit', text: 'Dress the person from Image 1 in a tailored charcoal wool coat on an autumn street at sunset, warm rim lighting. Keep their face unchanged.' },
        { label: '双图人物融合', templateId: 'seedream-edit', text: 'The person from Image 1 and the person from Image 2 standing together on a candlelit rooftop at night, looking toward each other. Keep both faces unchanged.' },
        { label: '主体+商品合成', templateId: 'seedream-edit', text: 'The person from Image 1 holding the product from Image 2 in soft natural daylight, keeping the logo and product details unchanged.' },
      ],
    },
    'layer-decomposition': {
      btn: '拆解图层',
      promptLabel: '拆解说明（可选，留空由模型自动识别）',
      placeholder: '可选：Decompose this image into layers. Write every layer name in English.',
      presets: [
        { label: '英文命名图层', text: 'Decompose this image into layers. Write every layer name and description in English.' },
        { label: '中文命名图层', text: '将这张图片拆分为背景与主体前景图层，用中文标注每个图层名称。' },
      ],
    },
  };

  const CUSTOM_TPL_STORAGE_KEY = 'seedream_custom_templates_v1';

  function readCustomTemplates() {
    try {
      const raw = localStorage.getItem(CUSTOM_TPL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeCustomTemplates(map) {
    try {
      localStorage.setItem(CUSTOM_TPL_STORAGE_KEY, JSON.stringify(map || {}));
    } catch {
      // ignore storage quota errors
    }
  }

  function isVideoJob(job) {
    if (!job) return false;
    if (job.media_type === 'video') return true;
    const m = String(job.model || '');
    if (m.includes('seedance') || m.includes('/wan-')) return true;
    return ['text-to-video', 'image-to-video', 'reference-to-video'].includes(job.mode);
  }

  const VIDEO_MODE_META = {
    'text-to-video': {
      btn: '开始生成视频',
      promptLabel: '视频分镜 / 动作描述（Prompt）',
      placeholder: '输入画面与运镜想法（如：大雨中的东京夜景街头，跟拍主角走过霓虹招牌...），或用下方「按模板 AI 扩写」先生成专业分镜脚本...',
      presets: [
        { label: 'Seedance 电影运镜', text: 'Slow dolly-in tracking shot along a misty midnight cobblestone street, crimson lanterns reflecting on wet stone, a woman in a dark wool trench coat turns her head toward camera as wind lifts loose strands of hair, soft rainfall and distant muffled footsteps.' },
        { label: 'Seedance 15s 分镜', text: '[0-5s] Wide establishing static tripod shot of an obsidian library hall illuminated by warm candle sconces, dust motes drifting in golden shafts of light. [5-10s] Smooth orbital tracking shot moving around the reading table as velvet curtains sway and pages turn by themselves. [10-15s] Rack focus into an intimate close-up of inked parchment and sealing wax, subtle crackle of hearth fire.' },
        { label: '万象3.0 导演两镜', text: 'Shot 1 [0-5s]: Medium tracking shot following a lone motorcyclist leaning through foggy mountain hairpins at dawn. Cold steel guardrails blur past. Engine roar echoes across pines. Shot 2 [5-10s]: Hard cut to low-angle static shot as bike sprays morning mist past camera and disappears into golden horizon.' },
      ],
    },
    'image-to-video': {
      btn: '开始图生视频',
      promptLabel: '帧间动态变化与运镜指令（Prompt）',
      placeholder: '重点描述「从静态画面开始如何动起来」（人物呼吸、抬头/转眸、风吹发丝/衣料、镜头缓慢推进与音效）...',
      presets: [
        { label: '细腻人物微动+推镜', text: 'Slow steady dolly-in toward close-up. The subject takes a slow breath, blinks naturally, shifts gaze toward lens with a subtle half-smile while gentle breeze lifts hair strands and fabric creases. Ambient soft room tone.' },
        { label: '氛围感风动环绕', text: 'Smooth 45-degree orbital camera move around the subject. Soft golden sunlight flickers across cheekbones and dust motes drift through air as coat hem ripples gently. Distant wind chime and footsteps.' },
      ],
    },
    'reference-to-video': {
      btn: '开始参考生视频',
      promptLabel: '多图参考脚本（Seedance 可用 @Image 1 / @Image 2 绑定角色与场景）',
      placeholder: '例如：@Image 1 的人物穿黑风衣穿过 @Image 2 的雨夜老街，镜头平行跟拍并逐步拉近...',
      presets: [
        { label: '@Image 1 + @Image 2 融合', text: 'Horizontal tracking shot moving smoothly alongside the character from @Image 1 walking briskly through the atmospheric setting of @Image 2, dramatic rim lighting reflecting off damp pavement, natural stride and coat sway, rain hiss and echoing footsteps.' },
      ],
    },
  };

  const state = {
    mode: 'text-to-image',
    aspectRatio: '1:1',
    resolution: '2k',
    layerResolution: 'auto',
    outputFormat: 'png',
    background: 'auto',
    numOutputs: 10,
    sizeLockMode: 'auto', // 'auto' | 'ref:1'..'ref:10' | 'manual'
    exactPixelMatch: false,
    refs: [], // { kind: 'upload'|'local', file?, filename?, previewUrl, width?, height? }
    jobs: [],
    activeJobId: null,
    activeVideoJobId: null,
    pollTimer: null,
    pollStartedAt: {},
    config: null,
    isSubmitting: false,
    isEnhancing: false,
    previousPrompt: null,
    customTemplates: readCustomTemplates(),
    // Video Studio state
    videoMode: 'text-to-video',
    videoFamily: 'seedance-2.5-flash',
    videoDuration: 5,
    videoDurationAuto: false,
    videoResolution: '720p',
    videoAspectRatio: '16:9',
    videoOutputFormat: 'mp4',
    videoShotType: 'single',
    videoAudio: true,
    videoWatermark: false,
    videoThinking: false,
    videoExpansion: false,
    videoRefs: [],
    isVideoSubmitting: false,
    isVideoEnhancing: false,
    previousVideoPrompt: null,
    // LLM & Writing state
    llmProvider: 'venice',
    workspace: 'studio',
    writingSessions: [],
    activeWritingId: null,
    writingAttachments: [],
    isWritingSending: false,
    // Personal Asset Library state
    libraryAssets: [],
    libraryFilter: 'all',
    librarySearch: '',
    isLibraryUploading: false,
    pickerTarget: 'studio',
    pickerFilter: 'all',
    pickerSearch: '',
    pickerSelectedIds: [],
    toastTimer: null,
    cloudMode: false,
  };

  const LIB_CATEGORY_LABELS = {
    character: '人物 / 角色',
    scene: '场景 / 背景',
    style: '风格 / 道具',
    other: '其他素材',
  };

  const $ = (id) => document.getElementById(id);

  function showToast(msg, durationMs = 2200) {
    const el = $('studioToast');
    if (!el || !msg) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      el.classList.add('hidden');
      state.toastTimer = null;
    }, durationMs);
  }

  function isImageFile(file) {
    return Boolean(file && (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic)$/i.test(file.name || '')));
  }

  function appendRefsToFormData(fd, refs) {
    const order = [];
    let uploadIdx = 0;
    refs.forEach((ref) => {
      if (ref.kind === 'local') {
        order.push(`local:${ref.filename}`);
      } else if (ref.kind === 'library') {
        order.push(`library:${ref.filename}`);
      } else {
        fd.append('images', ref.file);
        order.push(`upload:${uploadIdx}`);
        uploadIdx += 1;
      }
    });
    fd.append('reference_order', JSON.stringify(order));
  }

  function formatVeniceUsd(bal) {
    const usd = bal?.balances?.usd;
    const diem = bal?.balances?.diem;
    if (usd !== undefined && usd !== null) return `$${Number(usd).toFixed(2)}`;
    if (diem !== undefined && diem !== null) return `${Number(diem).toFixed(2)} DIEM`;
    return null;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCost(val) {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (Number.isNaN(num)) return `$${val}`;
    return `$${num.toFixed(num < 0.01 ? 4 : 3).replace(/0+$/, '').replace(/\.$/, '')}`;
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function activeResolution() {
    return state.mode === 'layer-decomposition' ? state.layerResolution : state.resolution;
  }

  async function apiJson(url, options = {}) {
    if (state.cloudMode && window.DirectApi) {
      return window.DirectApi.request(url, options);
    }
    let res;
    try {
      res = await fetch(url, options);
    } catch (networkErr) {
      const err = new Error('无法连接本地服务（请确认服务已启动）');
      err.isOffline = true;
      throw err;
    }
    const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }
    return data;
  }

  function stripBoldMarkers(str) {
    return String(str ?? '').replace(/\*\*/g, '').replace(/__/g, '');
  }

  async function consumeSse(url, options, { onEvent }) {
    if (state.cloudMode && window.DirectApi) {
      return window.DirectApi.stream(url, options, onEvent);
    }
    let res;
    try {
      res = await fetch(url, options);
    } catch {
      const err = new Error('无法连接本地服务（请确认服务已启动或刷新重连）');
      err.isOffline = true;
      throw err;
    }
    const ctype = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || ctype.includes('application/json')) {
      const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      if (data.reply !== undefined || data.prompt !== undefined) {
        onEvent({ type: 'done', ...data });
      }
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('当前浏览器不支持流式读取响应');
    }
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const processFrame = (frame) => {
      for (const rawLine of frame.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const payloadStr = line.slice(5).trim();
        if (!payloadStr || payloadStr === '[DONE]') continue;
        let evt;
        try {
          evt = JSON.parse(payloadStr);
        } catch {
          continue;
        }
        if (evt.type === 'error') {
          throw new Error(evt.error || '生成中断');
        }
        onEvent(evt);
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      frames.forEach(processFrame);
    }
    if (buffer.trim()) {
      processFrame(buffer);
    }
  }

  function showFormError(msg) {
    const el = $('formError');
    if (!msg) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function getPromptTemplates() {
    return state.config?.schema?.prompt_templates || [];
  }

  function resolveEffectiveTemplateId(scope, explicitId) {
    if (explicitId) return explicitId;
    if (scope === 'studio') {
      return state.mode === 'edit' ? 'seedream-edit' : 'seedream-t2i';
    }
    const spec = (state.config?.schema?.video_models || []).find((m) => m.id === state.videoFamily);
    if (state.videoFamily.startsWith('seedance') && !state.videoDurationAuto && state.videoDuration >= 10 && state.videoMode === 'text-to-video') {
      return 'seedance-timeline';
    }
    if (spec?.default_template) return spec.default_template;
    return state.videoMode === 'text-to-video' ? 'seedance-cinematic' : 'seedance-i2v-ref';
  }

  function populateTemplateSelect(selectEl, mediaFilter, emptyLabel) {
    if (!selectEl) return;
    const prev = selectEl.value;
    selectEl.innerHTML = '';
    const autoOpt = document.createElement('option');
    autoOpt.value = '';
    autoOpt.textContent = emptyLabel;
    selectEl.appendChild(autoOpt);
    getPromptTemplates()
      .filter((t) => mediaFilter === 'all' || t.media === 'all' || t.media === mediaFilter)
      .forEach((tpl) => {
        const opt = document.createElement('option');
        opt.value = tpl.id;
        opt.textContent = `模板：${tpl.label}`;
        selectEl.appendChild(opt);
      });
    if (prev && Array.from(selectEl.options).some((o) => o.value === prev)) {
      selectEl.value = prev;
    }
  }

  function syncTemplateDrawer(scope) {
    const sel = $(scope === 'studio' ? 'studioTemplateSelect' : 'videoTemplateSelect');
    const sumEl = $(scope === 'studio' ? 'studioTemplateSummary' : 'videoTemplateSummary');
    const edEl = $(scope === 'studio' ? 'studioTemplateEditor' : 'videoTemplateEditor');
    if (!sel || !sumEl || !edEl) return;
    const tplId = resolveEffectiveTemplateId(scope, sel.value);
    const tpl = getPromptTemplates().find((t) => t.id === tplId);
    sumEl.textContent = tpl
      ? `${tpl.summary}${state.customTemplates[tplId] ? '（当前已使用你的自定义修改）' : ''}`
      : '使用自动匹配策略';
    edEl.dataset.tplId = tplId;
    edEl.value = state.customTemplates[tplId] ?? tpl?.instructions ?? '';
  }

  function renderModeUI() {
    document.querySelectorAll('.segmented-control[aria-label="生成模式"] .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });

    const meta = MODE_META[state.mode];
    $('promptLabel').textContent = meta.promptLabel;
    $('promptInput').placeholder = meta.placeholder;
    $('generateBtnLabel').textContent = meta.btn;

    const isRefMode = state.mode === 'edit' || state.mode === 'layer-decomposition';
    $('t2iLibraryShortcut')?.classList.toggle('hidden', isRefMode);
    $('refSection').classList.toggle('hidden', !isRefMode);
    $('ratioGroup').classList.toggle('hidden', state.mode === 'layer-decomposition');
    $('backgroundGroup').classList.toggle('hidden', state.mode === 'layer-decomposition');
    $('layerCountGroup').classList.toggle('hidden', state.mode !== 'layer-decomposition');

    if (state.mode === 'layer-decomposition') {
      $('refLabel').textContent = '待拆解图片（1 张，PNG 或 JPEG）';
      $('refHint').textContent = '建议分辨率 >= 512x512';
      $('fileInput').removeAttribute('multiple');
      if (state.refs.length > 1) {
        state.refs.slice(1).forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
        state.refs = state.refs.slice(0, 1);
      }
    } else {
      $('refLabel').textContent = '参考图片（最多 10 张）';
      $('refHint').textContent = '按顺序编号为 Image 1, Image 2...';
      $('fileInput').setAttribute('multiple', 'multiple');
    }

    syncTemplateDrawer('studio');
    renderPresets();
    renderRefs();
    renderOptions();
    syncEditSizeLock();
    updateQuotePreview();
  }

  function measureRefDimensions(ref) {
    if (!ref || !ref.previewUrl) return;
    if (ref.width > 0 && ref.height > 0) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w > 0 && h > 0) {
        ref.width = w;
        ref.height = h;
        syncEditSizeLock();
      }
    };
    img.src = ref.previewUrl;
  }

  function getEditSizeLockInfo() {
    if (state.mode !== 'edit') {
      return { active: false, mode: state.sizeLockMode, baseIndex: null, ref: null, matchedRatio: null, ratioDiffPct: 0, reason: '' };
    }
    if (state.sizeLockMode.startsWith('ref:')) {
      const idx = Number(state.sizeLockMode.slice(4));
      if (!Number.isInteger(idx) || idx < 1 || idx > state.refs.length) {
        state.sizeLockMode = 'auto';
      }
    }
    if (!state.refs.length) {
      return {
        active: false,
        mode: state.sizeLockMode,
        baseIndex: null,
        ref: null,
        matchedRatio: null,
        ratioDiffPct: 0,
        reason: '上传参考图后会自动分析提示词并锁定底图原尺寸，防止编辑变形',
      };
    }
    if (state.sizeLockMode === 'manual') {
      return {
        active: false,
        mode: 'manual',
        baseIndex: null,
        ref: null,
        matchedRatio: null,
        ratioDiffPct: 0,
        reason: `当前为自由比例模式（手动输出 ${state.aspectRatio}），点上方「✨ 自动识别底图」可恢复按底图固定尺寸`,
      };
    }

    let baseIndex = 1;
    let reason = '';
    if (state.sizeLockMode === 'auto') {
      const prompt = $('promptInput')?.value || '';
      const det = window.DirectApi?.detectEditBaseImage
        ? window.DirectApi.detectEditBaseImage(prompt, state.refs.length)
        : { index: 1, reason: '默认参考 Image 1 原尺寸' };
      baseIndex = det?.index || 1;
      reason = det?.reason || `默认以 Image ${baseIndex} 为底图`;
    } else if (state.sizeLockMode.startsWith('ref:')) {
      baseIndex = Number(state.sizeLockMode.slice(4)) || 1;
      reason = `已手动锁定 Image ${baseIndex} 作为底图尺寸源`;
    }

    const baseRef = state.refs[baseIndex - 1] || null;
    const w = baseRef?.width || null;
    const h = baseRef?.height || null;
    let matchedRatio = null;
    let ratioDiffPct = 0;
    if (w && h && window.DirectApi?.matchClosestAspectRatio) {
      matchedRatio = window.DirectApi.matchClosestAspectRatio(w, h);
      const [rw, rh] = matchedRatio.split(':').map(Number);
      if (rw && rh) {
        ratioDiffPct = Math.abs(Math.log((w / h) / (rw / rh))) * 100;
      }
    }
    return {
      active: true,
      mode: state.sizeLockMode,
      baseIndex,
      ref: baseRef,
      width: w,
      height: h,
      matchedRatio,
      ratioDiffPct,
      reason,
    };
  }

  function updateRefCardBaseIndicators(activeBaseIndex) {
    const cards = document.querySelectorAll('#refGrid .ref-card');
    cards.forEach((card, idx) => {
      const ref = state.refs[idx];
      const isBase = state.mode === 'edit' && activeBaseIndex === idx + 1;
      card.classList.toggle('is-base-canvas', isBase);
      const dimBtn = card.querySelector('.ref-dim-btn');
      if (dimBtn && ref) {
        const dimLabel = ref.width && ref.height ? `${ref.width}×${ref.height}` : '读取尺寸...';
        const ratioTag =
          ref.width && ref.height && window.DirectApi?.matchClosestAspectRatio
            ? window.DirectApi.matchClosestAspectRatio(ref.width, ref.height)
            : '';
        dimBtn.classList.toggle('active', isBase);
        dimBtn.textContent = isBase
          ? `📐 底图 ${dimLabel}`
          : ratioTag
            ? `${dimLabel} · 设为底图`
            : '设为底图';
        dimBtn.title = isBase
          ? `当前已锁定 Image ${idx + 1}（${dimLabel}${ratioTag ? ` / ${ratioTag}` : ''}）为底图`
          : `点击手动锁定 Image ${idx + 1}（${dimLabel}${ratioTag ? ` / ${ratioTag}` : ''}）为底图尺寸`;
      }
    });
  }

  function renderEditSizeLockUI(info) {
    const panel = $('editSizeLockPanel');
    if (!panel) return;
    const isEdit = state.mode === 'edit';
    panel.classList.toggle('hidden', !isEdit);
    if (!isEdit) {
      if ($('ratioNote')) $('ratioNote').textContent = '支持 8 种标准画幅比例';
      return;
    }

    const exactCheck = $('exactPixelMatchCheck');
    if (exactCheck) {
      exactCheck.checked = Boolean(state.exactPixelMatch);
      exactCheck.disabled = !info.active;
    }

    const row = $('sizeLockRow');
    if (row) {
      row.innerHTML = '';
      const autoBtn = document.createElement('button');
      autoBtn.type = 'button';
      autoBtn.className = `chip-btn${state.sizeLockMode === 'auto' ? ' active' : ''}`;
      autoBtn.textContent = '✨ 自动识别底图';
      autoBtn.addEventListener('click', () => {
        state.sizeLockMode = 'auto';
        syncEditSizeLock();
      });
      row.appendChild(autoBtn);

      state.refs.forEach((ref, idx) => {
        const n = idx + 1;
        const rTag =
          ref.width && ref.height && window.DirectApi?.matchClosestAspectRatio
            ? ` (${window.DirectApi.matchClosestAspectRatio(ref.width, ref.height)})`
            : '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chip-btn${state.sizeLockMode === `ref:${n}` ? ' active' : ''}`;
        btn.textContent = `锁定图${n}${rTag}`;
        btn.addEventListener('click', () => {
          state.sizeLockMode = `ref:${n}`;
          syncEditSizeLock();
        });
        row.appendChild(btn);
      });

      const manualBtn = document.createElement('button');
      manualBtn.type = 'button';
      manualBtn.className = `chip-btn${state.sizeLockMode === 'manual' ? ' active' : ''}`;
      manualBtn.textContent = '手动自由比例';
      manualBtn.addEventListener('click', () => {
        state.sizeLockMode = 'manual';
        syncEditSizeLock();
      });
      row.appendChild(manualBtn);
    }

    const statusEl = $('sizeLockStatus');
    if (statusEl) {
      if (!info.active) {
        statusEl.textContent = info.reason;
      } else if (info.width && info.height && info.matchedRatio) {
        const exactNote = state.exactPixelMatch
          ? ` · 出图后自动等比还原为精确 ${info.width}×${info.height} 像素`
          : info.ratioDiffPct > 2
            ? ' · 原图非标准比例，勾选右上角「精确还原原像素」可严格还原像素尺寸'
            : '';
        statusEl.innerHTML =
          `${escapeHtml(info.reason)} · <strong>Image ${info.baseIndex} (${info.width}×${info.height}) → 已锁定 ${escapeHtml(info.matchedRatio)}</strong>${escapeHtml(exactNote)}`;
      } else {
        statusEl.innerHTML = `${escapeHtml(info.reason)} · <strong>正在读取 Image ${info.baseIndex} 尺寸...</strong>`;
      }
    }

    if ($('ratioNote')) {
      $('ratioNote').textContent = info.active && info.matchedRatio
        ? `已按 Image ${info.baseIndex} 自动锁定 ${info.matchedRatio}（点下方比例可切手动）`
        : '手动选择输出画幅比例';
    }
  }

  function syncEditSizeLock() {
    const info = getEditSizeLockInfo();
    if (info.active && info.matchedRatio && state.aspectRatio !== info.matchedRatio) {
      state.aspectRatio = info.matchedRatio;
    }
    renderEditSizeLockUI(info);
    // Sync active highlight in ratio grid in-place without flashing other chips
    document.querySelectorAll('#ratioGrid .ratio-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.ratio === state.aspectRatio);
    });
    updateRefCardBaseIndicators(info.active ? info.baseIndex : null);
    return info;
  }

  function renderPresets() {
    const container = $('presetRow');
    const presets = MODE_META[state.mode].presets;
    container.innerHTML = '';
    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip';
      btn.textContent = `+ ${p.label}`;
      btn.addEventListener('click', () => {
        $('promptInput').value = p.text;
        if (p.templateId && $('studioTemplateSelect')) {
          $('studioTemplateSelect').value = p.templateId;
          syncTemplateDrawer('studio');
        }
        updateCharCount();
        syncEditSizeLock();
        updateQuotePreview();
      });
      container.appendChild(btn);
    });
  }

  function renderOptions() {
    // Aspect ratios
    const ratios = state.config?.schema?.aspect_ratios || Object.keys(RATIO_DIMS);
    const ratioGrid = $('ratioGrid');
    ratioGrid.innerHTML = '';
    ratios.forEach((r) => {
      const [w, h] = RATIO_DIMS[r] || [14, 14];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.ratio = r;
      btn.className = `ratio-btn${state.aspectRatio === r ? ' active' : ''}`;
      btn.innerHTML = `<span class="ratio-box" style="width:${w}px;height:${h}px"></span><span>${escapeHtml(r)}</span>`;
      btn.addEventListener('click', () => {
        state.aspectRatio = r;
        if (state.mode === 'edit' && state.sizeLockMode !== 'manual') {
          state.sizeLockMode = 'manual';
        }
        renderOptions();
        syncEditSizeLock();
      });
      ratioGrid.appendChild(btn);
    });

    // Resolutions
    const resList =
      state.mode === 'layer-decomposition'
        ? state.config?.schema?.layer_resolutions || ['auto', '1k', '1.5k', '2k']
        : state.config?.schema?.resolutions || ['1k', '1.5k', '2k'];
    const currentRes = activeResolution();
    const resRow = $('resolutionRow');
    resRow.innerHTML = '';
    resList.forEach((res) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${currentRes === res ? ' active' : ''}`;
      const priceHint = res === '2k' ? ' $0.035' : res === 'auto' ? ' 自动' : ' $0.02';
      btn.textContent = `${res.toUpperCase()}${state.mode === 'layer-decomposition' ? '' : priceHint}`;
      btn.addEventListener('click', () => {
        if (state.mode === 'layer-decomposition') {
          state.layerResolution = res;
        } else {
          state.resolution = res;
        }
        renderOptions();
        updateQuotePreview();
      });
      resRow.appendChild(btn);
    });

    // Output formats
    const fmtRow = $('formatRow');
    fmtRow.innerHTML = '';
    ['png', 'jpeg'].forEach((fmt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${state.outputFormat === fmt ? ' active' : ''}`;
      btn.textContent = fmt.toUpperCase();
      btn.addEventListener('click', () => {
        state.outputFormat = fmt;
        if (fmt === 'jpeg' && state.background === 'transparent') {
          state.background = 'auto';
        }
        renderOptions();
      });
      fmtRow.appendChild(btn);
    });

    // Background
    const bgRow = $('bgRow');
    bgRow.innerHTML = '';
    const bgLabels = { auto: '自动', transparent: '透明底 (RGBA)', opaque: '纯不透明' };
    ['auto', 'transparent', 'opaque'].forEach((bg) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${state.background === bg ? ' active' : ''}`;
      btn.textContent = bgLabels[bg];
      btn.addEventListener('click', () => {
        state.background = bg;
        if (bg === 'transparent') {
          state.outputFormat = 'png';
        }
        renderOptions();
      });
      bgRow.appendChild(btn);
    });
  }

  function renderRefs() {
    const grid = $('refGrid');
    grid.innerHTML = '';
    state.refs.forEach((ref, idx) => {
      const card = document.createElement('div');
      card.className = 'ref-card';

      const img = document.createElement('img');
      img.src = ref.previewUrl;
      img.alt = `Image ${idx + 1}`;

      const badge = document.createElement('span');
      badge.className = 'ref-badge';
      badge.textContent = `Image ${idx + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'ref-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = '移除此图';
      removeBtn.addEventListener('click', () => {
        if (ref.kind === 'upload') URL.revokeObjectURL(ref.previewUrl);
        state.refs.splice(idx, 1);
        renderRefs();
        syncEditSizeLock();
        updateQuotePreview();
      });

      card.append(img, badge, removeBtn);

      if (state.mode === 'edit') {
        const dimBtn = document.createElement('button');
        dimBtn.type = 'button';
        dimBtn.className = 'ref-dim-btn';
        dimBtn.textContent = ref.width && ref.height ? `${ref.width}×${ref.height} · 设为底图` : '读取尺寸...';
        dimBtn.addEventListener('click', () => {
          state.sizeLockMode = `ref:${idx + 1}`;
          syncEditSizeLock();
        });
        card.appendChild(dimBtn);

        const insertBtn = document.createElement('button');
        insertBtn.type = 'button';
        insertBtn.className = 'ref-insert';
        insertBtn.textContent = `+ 插入 Image ${idx + 1}`;
        insertBtn.addEventListener('click', () => insertTextAtCursor(`Image ${idx + 1}`));
        card.appendChild(insertBtn);
      }

      grid.appendChild(card);
    });
    const info = getEditSizeLockInfo();
    updateRefCardBaseIndicators(info.active ? info.baseIndex : null);
    renderQuickLibraryStrip();
  }

  function insertTextAtCursor(token) {
    const ta = $('promptInput');
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    const padLeft = before && !before.endsWith(' ') ? ' ' : '';
    const padRight = after && !after.startsWith(' ') ? ' ' : '';
    ta.value = `${before}${padLeft}${token}${padRight}${after}`;
    const cursor = (before + padLeft + token + padRight).length;
    ta.focus();
    ta.setSelectionRange(cursor, cursor);
    updateCharCount();
    syncEditSizeLock();
  }

  function addUploadFiles(fileList) {
    const limit = state.mode === 'layer-decomposition' ? 1 : 10;
    const files = Array.from(fileList || []).filter(isImageFile);
    if (!files.length) return;

    if (limit === 1) {
      state.refs.forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
      state.refs = [];
    }

    for (const file of files) {
      if (state.refs.length >= limit) break;
      const item = {
        kind: 'upload',
        file,
        previewUrl: URL.createObjectURL(file),
        width: null,
        height: null,
      };
      state.refs.push(item);
      measureRefDimensions(item);
    }
    renderRefs();
    syncEditSizeLock();
    updateQuotePreview();
  }

  function addLocalAssetRef(filename, targetMode, assetMeta = null) {
    state.mode = targetMode;
    const item = {
      kind: 'local',
      filename,
      previewUrl: assetMeta?.url || `/outputs/${encodeURIComponent(filename)}`,
      width: Number(assetMeta?.width) || null,
      height: Number(assetMeta?.height) || null,
    };
    if (targetMode === 'layer-decomposition') {
      state.refs.forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
      state.refs = [item];
    } else {
      if (state.refs.length >= 10) state.refs.shift();
      state.refs.push(item);
    }
    measureRefDimensions(item);
    renderModeUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateCharCount() {
    $('charCount').textContent = `${$('promptInput').value.length} / 5000`;
  }

  function updateQuotePreview(liveQuote = null) {
    const el = $('quoteText');
    if (liveQuote && liveQuote.estimatedCost) {
      const note = liveQuote.note ? ` · ${liveQuote.note}` : '（已向平台询价）';
      el.textContent = `预估费用：$${liveQuote.estimatedCost} USD${note}`;
      return;
    }

    const res = activeResolution();
    const base = res === '2k' || res === 'auto' ? '0.035' : '0.02';
    if (state.mode === 'edit') {
      const cnt = Math.max(1, state.refs.length);
      el.textContent = `参考费用：${res.toUpperCase()} 基础 $${base} + ${cnt} 张参考图少量附加费`;
    } else if (state.mode === 'layer-decomposition') {
      el.textContent = `按实际返回层数计费（上限 ${state.numOutputs} 张，单张约 $${base}）`;
    } else {
      el.textContent = `预估费用：$${base} USD（${res.toUpperCase()}）`;
    }
  }

  async function requestLiveQuote() {
    try {
      const data = await apiJson('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: state.mode,
          prompt: $('promptInput').value,
          aspect_ratio: state.aspectRatio,
          resolution: activeResolution(),
          output_format: state.outputFormat,
          background: state.background,
          image_count: Math.max(1, state.refs.length),
          num_outputs: state.numOutputs,
        }),
      });
      updateQuotePreview(data.quote);
    } catch (err) {
      showFormError(err.message);
    }
  }

  async function refreshBalance() {
    const pill = $('balancePill');
    const dot = $('balanceDot');
    const txt = $('balanceText');
    if (!state.config?.settings?.has_api_key) {
      dot.className = 'dot warn';
      txt.textContent = '未配置 Key';
      return;
    }
    try {
      const data = await apiJson('/api/balance');
      const bal = data.balance || {};
      const available = bal.available ?? bal.funding?.prepaidAvailableUsd ?? '--';
      const numVal = Number(available);
      const shortAvail = Number.isFinite(numVal) ? numVal.toFixed(2) : available;
      dot.className = 'dot ok';
      txt.textContent = `$${shortAvail} 可用`;
      pill.title = `可用 $${available} | 冻结中 $${bal.held ?? '0'}`;
    } catch (err) {
      dot.className = 'dot warn';
      txt.textContent = err.isOffline ? '本地服务已停止' : 'Key 连接异常';
      pill.title = err.message;
    }
  }

  function renderStage() {
    const imageJobs = state.jobs.filter((j) => !isVideoJob(j));
    const job = imageJobs.find((j) => j.id === state.activeJobId) || imageJobs[0] || null;
    const body = $('stageBody');
    const actions = $('stageActions');
    const badge = $('stageStatusBadge');
    const subtitle = $('stageSubtitle');

    if (!job) {
      body.className = 'stage-body empty';
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">✦</div>
          <p>在左侧输入画面描述，点击「开始生成」</p>
          <span>生成完成后会自动保存在本机 <code>data/outputs/</code> 目录</span>
        </div>`;
      actions.classList.add('hidden');
      badge.classList.add('hidden');
      subtitle.textContent = '生成的图片会自动保存到本地，不会过期丢失';
      return;
    }

    state.activeJobId = job.id;
    badge.classList.remove('hidden');

    if (job.state === 'queued' || job.state === 'running') {
      badge.className = 'status-pill running';
      badge.textContent = job.state === 'queued' ? '排队中' : '生成中';
      subtitle.textContent = `任务 ${job.task_id} · 预估冻结 ${formatCost(job.estimated_cost || '0.02')}`;
      body.className = 'stage-body';
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">⏳</div>
          <p>${job.state === 'queued' ? '已提交到 Seedream 5.5 队列...' : '正在渲染高分辨率画面...'}</p>
          <span>通常需要 15–38 秒；即使切换或刷新页面也会在后台自动保存结果</span>
        </div>`;
      actions.classList.add('hidden');
      return;
    }

    if (job.state !== 'succeeded') {
      badge.className = 'status-pill failed';
      badge.textContent = job.state === 'expired' ? '已超时' : '生成失败';
      subtitle.textContent = `任务 ${job.task_id || job.id} · ${formatTime(job.created_at)}`;
      body.className = 'stage-body';
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">!</div>
          <p>${escapeHtml(job.error_message || '任务未成功完成')}</p>
          <span>若因网络等待超时，可尝试刷新任务状态；未成功扣费会自动退回余额</span>
        </div>`;
      actions.classList.remove('hidden');
      $('stageSaveBtn').classList.add('hidden');
      $('stageShareBtn').classList.add('hidden');
      $('stageAddLibraryBtn')?.classList.add('hidden');
      $('stageEditBtn').classList.add('hidden');
      $('stageVideoBtn').classList.add('hidden');
      $('stageLayerBtn').classList.add('hidden');
      $('stageWriteBtn').classList.add('hidden');
      return;
    }

    badge.className = 'status-pill succeeded';
    const costLabel = job.cost ? `实付 ${formatCost(job.cost)}` : '已完成';
    badge.textContent = costLabel;
    const p = job.params || {};
    const firstAsset = (job.assets || [])[0];
    const dimTag = firstAsset?.width && firstAsset?.height ? ` · ${firstAsset.width}×${firstAsset.height}` : '';
    const lockTag = p.size_lock?.base_index ? ` · 锁定图${p.size_lock.base_index}` : '';
    subtitle.textContent = `${job.mode} · ${p.resolution || ''} ${p.aspect_ratio || ''}${dimTag}${lockTag} · ${formatTime(job.completed_at || job.created_at)}`;

    const assets = job.assets || [];
    const useChecker = p.background === 'transparent' || job.mode === 'layer-decomposition';
    body.className = `stage-body${useChecker ? ' checkerboard' : ''}`;

    if (assets.length <= 1) {
      const first = assets[0];
      body.innerHTML = '';
      if (first) {
        const img = document.createElement('img');
        img.className = 'hero-img';
        img.src = first.url;
        img.alt = job.prompt || 'Generated image';
        img.addEventListener('click', () => openLightbox(first.url));
        body.appendChild(img);
      }
    } else {
      body.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'layers-grid';
      assets.forEach((asset, idx) => {
        const card = document.createElement('div');
        card.className = 'layer-card';
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.layer?.name || `Layer ${idx}`;
        img.addEventListener('click', () => openLightbox(asset.url));

        const meta = document.createElement('div');
        meta.className = 'layer-meta';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = asset.layer?.name || (idx === 0 ? 'Base 底图' : `Layer ${idx}`);
        const metaActions = document.createElement('span');
        metaActions.style.display = 'inline-flex';
        metaActions.style.gap = '6px';
        metaActions.style.alignItems = 'center';

        const favLayerBtn = document.createElement('button');
        favLayerBtn.type = 'button';
        const layerSaved = isOutputInLibrary(asset.filename);
        favLayerBtn.textContent = layerSaved ? '★ 已存' : '☆ 存素材';
        favLayerBtn.style.color = layerSaved ? '#86efac' : 'var(--text-muted)';
        favLayerBtn.style.fontSize = '0.74rem';
        favLayerBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          saveOutputToLibrary(asset.filename, job.id, asset.layer?.name || job.prompt || `Layer ${idx}`);
        });

        const dl = document.createElement('a');
        dl.href = asset.url;
        dl.download = asset.filename;
        dl.textContent = '下载';
        dl.style.color = 'var(--accent-bright)';
        metaActions.append(favLayerBtn, dl);
        meta.append(nameSpan, metaActions);

        card.append(img, meta);
        grid.appendChild(card);
      });
      body.appendChild(grid);
    }

    actions.classList.remove('hidden');
    $('stageSaveBtn').classList.remove('hidden');
    const addLibBtn = $('stageAddLibraryBtn');
    if (addLibBtn) {
      addLibBtn.classList.remove('hidden');
      const saved = Boolean(firstAsset?.filename && isOutputInLibrary(firstAsset.filename));
      addLibBtn.textContent = saved ? '✓ 已在素材库' : '⭐ 加入素材库';
      addLibBtn.classList.toggle('saved-lib', saved);
    }
    $('stageEditBtn').classList.remove('hidden');
    $('stageVideoBtn').classList.remove('hidden');
    $('stageLayerBtn').classList.remove('hidden');
    $('stageWriteBtn').classList.remove('hidden');

    const supportsFileShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
    $('stageShareBtn').classList.toggle('hidden', !supportsFileShare);
  }

  function renderHistory() {
    const grid = $('historyGrid');
    const imageJobs = state.jobs.filter((j) => !isVideoJob(j));
    $('historyCount').textContent = String(imageJobs.length);
    grid.innerHTML = '';

    if (!imageJobs.length) {
      grid.innerHTML = '<p class="field-hint" style="grid-column:1/-1;text-align:center;padding:24px 0;">暂无生成记录</p>';
      return;
    }

    imageJobs.forEach((job) => {
      const card = document.createElement('div');
      card.className = `history-card${job.id === state.activeJobId ? ' active' : ''}`;
      card.addEventListener('click', () => {
        state.activeJobId = job.id;
        renderStage();
        renderHistory();
      });

      const thumb = document.createElement('div');
      thumb.className = 'history-thumb';
      if (job.assets?.length) {
        const img = document.createElement('img');
        img.src = job.assets[0].url;
        img.loading = 'lazy';
        img.alt = job.prompt || 'Result';
        thumb.appendChild(img);
      } else {
        const st = document.createElement('span');
        st.className = 'field-hint';
        st.textContent = job.state === 'queued' || job.state === 'running' ? '⏳ 生成中' : '⚠️ 未出图';
        thumb.appendChild(st);
      }

      const info = document.createElement('div');
      info.className = 'history-info';
      const promptEl = document.createElement('div');
      promptEl.className = 'history-prompt';
      promptEl.textContent = job.prompt || `(${job.mode})`;

      const metaEl = document.createElement('div');
      metaEl.className = 'history-meta';
      const left = document.createElement('span');
      left.textContent = `${job.params?.resolution || ''} ${job.cost ? formatCost(job.cost) : ''}`.trim();
      const right = document.createElement('span');
      right.textContent = formatTime(job.created_at);
      metaEl.append(left, right);

      info.append(promptEl, metaEl);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'history-del';
      delBtn.textContent = '✕';
      delBtn.title = '删除记录与本地图片';
      delBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await apiJson(`/api/tasks/${encodeURIComponent(job.id)}`, { method: 'DELETE' });
        state.jobs = state.jobs.filter((j) => j.id !== job.id);
        if (state.activeJobId === job.id) {
          state.activeJobId = state.jobs.find((j) => !isVideoJob(j))?.id || null;
        }
        renderStage();
        renderHistory();
      });

      if (job.assets?.length && job.assets[0]?.filename) {
        const asset0 = job.assets[0];
        const saved = isOutputInLibrary(asset0.filename);
        const favBtn = document.createElement('button');
        favBtn.type = 'button';
        favBtn.className = `history-fav${saved ? ' saved' : ''}`;
        favBtn.textContent = saved ? '★' : '☆';
        favBtn.title = saved ? '已在素材库中' : '加入素材库';
        favBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          await saveOutputToLibrary(asset0.filename, job.id, job.prompt || '生成作品');
        });
        card.append(thumb, info, favBtn, delBtn);
      } else {
        card.append(thumb, info, delBtn);
      }
      grid.appendChild(card);
    });
  }

  function ensurePolling() {
    if (state.pollTimer) return;
    const hasPending = state.jobs.some((j) => j.state === 'queued' || j.state === 'running');
    if (!hasPending) return;

    state.pollTimer = window.setInterval(async () => {
      const pending = state.jobs.filter((j) => j.state === 'queued' || j.state === 'running');
      if (!pending.length) {
        window.clearInterval(state.pollTimer);
        state.pollTimer = null;
        return;
      }

      let finishedAny = false;
      for (const item of pending) {
        try {
          const data = await apiJson(`/api/tasks/${encodeURIComponent(item.id)}`);
          const updated = data.job;
          const idx = state.jobs.findIndex((j) => j.id === updated.id);
          if (idx !== -1) state.jobs[idx] = updated;
          if (updated.state !== 'queued' && updated.state !== 'running') {
            finishedAny = true;
          }
        } catch {
          // keep polling
        }
      }

      renderStage();
      renderHistory();
      renderVideoStage();
      renderVideoHistory();
      if (finishedAny) {
        refreshBalance();
      }
    }, 2000);
  }

  async function submitGeneration() {
    showFormError('');
    if (state.isSubmitting) return;

    if (!state.config?.settings?.has_api_key) {
      openModal('settingsModal');
      showFormError('请先填写你的 SpicyAPI Key。');
      return;
    }

    const prompt = $('promptInput').value.trim();
    if (state.mode !== 'layer-decomposition' && !prompt) {
      showFormError('请先输入画面描述（Prompt）。');
      return;
    }
    if ((state.mode === 'edit' || state.mode === 'layer-decomposition') && !state.refs.length) {
      showFormError('请先选择或上传至少 1 张参考图片。');
      return;
    }

    state.isSubmitting = true;
    $('generateBtn').disabled = true;
    $('generateSpinner').classList.remove('hidden');
    $('generateBtnLabel').textContent = state.refs.length ? '上传参考图并提交...' : '提交任务中...';

    try {
      const lockInfo = state.mode === 'edit' ? syncEditSizeLock() : null;
      const fd = new FormData();
      fd.append('mode', state.mode);
      fd.append('prompt', prompt);
      fd.append('aspect_ratio', state.aspectRatio);
      fd.append('resolution', activeResolution());
      fd.append('output_format', state.outputFormat);
      fd.append('background', state.background);
      fd.append('num_outputs', String(state.numOutputs));
      if (state.mode === 'edit') {
        fd.append('size_lock_mode', state.sizeLockMode);
        fd.append('exact_pixel_match', String(Boolean(state.exactPixelMatch && lockInfo?.active)));
      }
      appendRefsToFormData(fd, state.refs);

      const data = await apiJson('/api/generate', {
        method: 'POST',
        body: fd,
      });

      const job = data.job;
      state.jobs = [job, ...state.jobs.filter((j) => j.id !== job.id)];
      state.activeJobId = job.id;
      renderStage();
      renderHistory();
      ensurePolling();
      refreshBalance();
    } catch (err) {
      showFormError(err.message);
    } finally {
      state.isSubmitting = false;
      $('generateBtn').disabled = false;
      $('generateSpinner').classList.add('hidden');
      $('generateBtnLabel').textContent = MODE_META[state.mode].btn;
    }
  }

  function openModal(id) {
    $(id).classList.remove('hidden');
  }

  function closeModal(id) {
    $(id).classList.add('hidden');
  }

  function openLightbox(url) {
    $('lightboxImg').src = url;
    openModal('lightboxModal');
  }

  async function renderQrForUrl(url, targetBoxId = 'qrBox', labelElId = 'lanUrlText') {
    $(labelElId).textContent = url;
    const qrBox = $(targetBoxId);
    if (state.cloudMode) {
      qrBox.innerHTML = '<div class="qr-placeholder" style="padding:14px;text-align:center;">已部署为独立云端网址<br/>直接在 Safari 打开并「添加到主屏幕」即可</div>';
      return;
    }
    qrBox.innerHTML = '<div class="qr-placeholder">生成二维码中...</div>';
    try {
      const resp = await fetch(`/api/qr?text=${encodeURIComponent(url)}`);
      if (!resp.ok) throw new Error('QR error');
      qrBox.innerHTML = await resp.text();
    } catch {
      qrBox.innerHTML = '<div class="qr-placeholder">请手动复制右侧链接到 Safari 打开</div>';
    }
  }

  async function openPhoneModal() {
    openModal('phoneModal');
    const net = state.config?.network || {};
    const urls = net.lan_urls || [];
    const primaryUrl = net.primary_lan_url || window.location.origin;
    const cloudUrl = window.DirectApi?.CLOUD_URL || 'https://hsijocey.github.io/seedream-studio/';

    $('cloudSyncBar').classList.toggle('hidden', state.cloudMode);
    document.querySelector('[data-phone-tab="pwa"]').classList.toggle('hidden', state.cloudMode);

    const extraContainer = $('extraLanUrls');
    extraContainer.innerHTML = '';
    if (!state.cloudMode && urls.length > 1) {
      const hint = document.createElement('span');
      hint.textContent = '切换地址：';
      extraContainer.appendChild(hint);
      urls.forEach((u) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-chip';
        const isTailscale = /^https?:\/\/100\./.test(u);
        btn.textContent = isTailscale ? `${u} (Tailscale)` : u;
        btn.addEventListener('click', () => renderQrForUrl(u, 'qrBox', 'lanUrlText'));
        extraContainer.appendChild(btn);
      });
    }

    await renderQrForUrl(cloudUrl, 'cloudQrBox', 'cloudUrlText');
    if (!state.cloudMode) {
      await renderQrForUrl(primaryUrl, 'qrBox', 'lanUrlText');
    }
  }

  function populateSelectOptions(selectEl, items, formatLabel) {
    selectEl.innerHTML = '';
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = formatLabel(item);
      selectEl.appendChild(opt);
    });
  }

  function renderLlmSettingsOptions() {
    const presets = state.config?.schema?.llm_presets || {};
    populateSelectOptions($('llmVeniceModelSelect'), presets.venice || [], (item) => `${item.label} (${item.price_hint})`);
    populateSelectOptions($('llmSpicyModelSelect'), presets.spicyapi || [], (item) => `${item.label} (${item.price_hint})`);

    const customWrap = $('llmCustomPresets');
    customWrap.innerHTML = '';
    (presets.custom || []).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        $('llmBaseUrlInput').value = item.base_url;
        $('llmModelInput').value = item.model;
      });
      customWrap.appendChild(btn);
    });
  }

  function renderWritingControls() {
    const presets = state.config?.schema?.llm_presets || {};
    const settings = state.config?.settings || {};
    const modelSel = $('writingModelSelect');
    const veniceModels = (presets.venice || []).map((m) => ({
      id: m.id,
      text: `${m.label} · ${m.price_hint}`,
    }));
    const currentModel = settings.llm_model;
    if (settings.llm_provider === 'spicyapi') {
      (presets.spicyapi || []).forEach((m) => veniceModels.push({ id: m.id, text: `[Spicy] ${m.label}` }));
    } else if (currentModel && !veniceModels.some((m) => m.id === currentModel)) {
      veniceModels.unshift({ id: currentModel, text: `当前自定义：${currentModel}` });
    }
    populateSelectOptions(modelSel, veniceModels, (m) => m.text);
    if (currentModel && veniceModels.some((m) => m.id === currentModel)) {
      modelSel.value = currentModel;
    }

    const personas = state.config?.schema?.writing_personas || [
      { id: 'unrestricted', label: '无限制自由创作（默认）' },
    ];
    populateSelectOptions($('writingPersonaSelect'), personas, (p) => p.label);

    populateTemplateSelect($('writingTemplateSelect'), 'all', '— 选择并载入内置工程模板 —');

    const quickPrompts = [
      {
        label: '🎭 深度起名+人设',
        text: '请按“反烂大街命名+完整人设工程”给我设计5个角色/作品名字（附音律、字义、时代感解析），锁定最具张力的一个展开性格缺陷、外貌服饰细节与背景设定，并在最后给一段可直接粘贴生图/生视频的提示词。我的初始想法：',
      },
      {
        label: '🌐 实时新闻创作',
        text: '请结合你刚联网搜索到的最新真实新闻事件或前沿动态，先列出3条关键事实与时间点，再据此改写一段戏剧张力十足的故事大纲或分镜画面：',
        enableSearch: 'on',
      },
      {
        label: '🎬 Seedance分镜',
        text: '请把下面这个灵感改写成符合 Seedance 2.5 规范的 15 秒电影级分镜提示词（按 [0-5s] [5-10s] [10-15s] 划分，写明物理运镜如 dolly-in / orbital tracking shot 与末尾音效，纯文本输出不要 ** 加粗）：',
      },
      {
        label: '🎞️ 万象3.0多镜头',
        text: '请按阿里万象 Wan 3.0 导演脚本规范，用 Shot 1 / Shot 2 多镜头硬切和句号分隔时序动作的格式，写出可直接生视频的高精度提示词（含光影、材质与具体声源，纯文本输出）：',
      },
      { label: '🖼️ 写生图提示词', text: '把我们刚才定稿的这一幕画面，提炼成一段可直接给 Seedream 5.5 使用的英文高精度生图提示词（只输出提示词文本）。' },
      { label: '看图写场景', text: '请仔细观察我发送的参考图中的人物动作、神态、光线和服装细节，据此写一段极具画面感的场景描写：' },
    ];
    const quickRow = $('writingQuickRow');
    quickRow.innerHTML = '';
    quickPrompts.forEach((qp) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip';
      btn.textContent = qp.label;
      btn.addEventListener('click', () => {
        if (qp.enableSearch && $('writingWebSearchSelect')) {
          $('writingWebSearchSelect').value = qp.enableSearch;
        }
        const input = $('writingInput');
        input.value = input.value.trim() ? `${input.value.trim()}\n${qp.text}` : qp.text;
        input.focus();
      });
      quickRow.appendChild(btn);
    });
  }

  function setLlmProviderTab(provider) {
    state.llmProvider = ['venice', 'spicyapi', 'custom'].includes(provider) ? provider : 'venice';
    document.querySelectorAll('[data-llm-provider]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.llmProvider === state.llmProvider);
    });
    $('llmVenicePane').classList.toggle('hidden', state.llmProvider !== 'venice');
    $('llmSpicyPane').classList.toggle('hidden', state.llmProvider !== 'spicyapi');
    $('llmCustomPane').classList.toggle('hidden', state.llmProvider !== 'custom');
  }

  function setWorkspace(ws) {
    state.workspace = ['studio', 'library', 'video', 'writing'].includes(ws) ? ws : 'studio';
    document.querySelectorAll('[data-workspace]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.workspace === state.workspace);
    });
    $('studioView').classList.toggle('hidden', state.workspace !== 'studio');
    $('libraryView')?.classList.toggle('hidden', state.workspace !== 'library');
    $('videoView').classList.toggle('hidden', state.workspace !== 'video');
    $('writingView').classList.toggle('hidden', state.workspace !== 'writing');
    updateWritingWarnBadge();
    if (state.workspace === 'library') {
      renderLibraryWorkspace();
    }
    if (state.workspace === 'writing') {
      const msgBox = $('writingMessages');
      msgBox.scrollTop = msgBox.scrollHeight;
    }
  }

  function updateWritingWarnBadge() {
    const settings = state.config?.settings || {};
    const needsVeniceKey = settings.llm_provider === 'venice' && !settings.has_llm_api_key;
    $('writingConfigWarn').classList.toggle('hidden', !needsVeniceKey);
  }

  async function refreshVeniceBalance() {
    const settings = state.config?.settings || {};
    const pill = $('veniceBalancePill');
    const dot = $('veniceDot');
    const txt = $('veniceBalanceText');
    if (settings.llm_provider !== 'venice') {
      pill.classList.add('hidden');
      return;
    }
    pill.classList.remove('hidden');
    if (!settings.has_llm_api_key) {
      dot.className = 'dot warn';
      txt.textContent = 'Venice 未填 Key';
      pill.title = '点击填写 Venice API Key';
      return;
    }
    try {
      const data = await apiJson('/api/llm-balance');
      const label = formatVeniceUsd(data.balance);
      dot.className = 'dot ok';
      txt.textContent = label ? `Venice ${label}` : 'Venice 已连接';
      pill.title = `Venice 写作/识图余额 ${label || ''}（点击刷新）`;
    } catch (err) {
      dot.className = 'dot warn';
      txt.textContent = err.isOffline ? 'Venice 离线' : 'Venice 连接异常';
      pill.title = err.message;
    }
  }

  async function enhancePrompt() {
    showFormError('');
    if (state.isEnhancing) return;
    const tplId = resolveEffectiveTemplateId('studio', $('studioTemplateSelect').value);
    let raw = $('promptInput').value.trim();
    if (!raw) {
      const matchedPreset = (MODE_META.edit?.presets || []).find((p) => p.templateId === tplId);
      if (matchedPreset && state.refs.length > 0) {
        raw = matchedPreset.text;
        $('promptInput').value = raw;
        updateCharCount();
      } else {
        showFormError('请先输入几句简单画面描述，再点击 AI 扩写。');
        return;
      }
    }

    state.isEnhancing = true;
    $('enhancePromptBtn').disabled = true;
    $('enhanceSpinner').classList.remove('hidden');
    $('enhanceBtnLabel').textContent = state.refs.length ? '看图扩写中...' : '扩写中...';
    $('promptLoadingText').textContent = state.refs.length ? 'AI 正在识图缓冲扩写...' : 'AI 正在缓冲扩写...';
    $('promptLoadingMask').classList.remove('hidden');
    const hintEl = $('enhanceHint');
    hintEl.classList.add('hidden');

    const prevDraft = $('promptInput').value;
    const customTpl = $('studioTemplateEditor')?.value?.trim() || '';
    let streamedText = '';
    let gotFirstDelta = false;
    let finalModel = '';
    let usedVision = false;

    try {
      const lockInfo = state.mode === 'edit' ? getEditSizeLockInfo() : null;
      const fetchOpts = { method: 'POST' };
      if (state.refs.length > 0) {
        const fd = new FormData();
        fd.append('prompt', raw);
        fd.append('mode', state.mode);
        fd.append('style', $('enhanceStyleSelect').value);
        fd.append('lang', $('enhanceLangSelect').value);
        fd.append('media_type', 'image');
        fd.append('target_model', 'seedream-5.5');
        fd.append('template_id', tplId);
        if (customTpl) fd.append('custom_template', customTpl);
        fd.append('ref_count', String(state.refs.length));
        if (lockInfo?.active && lockInfo.baseIndex) {
          fd.append('base_image_index', String(lockInfo.baseIndex));
          if (lockInfo.width && lockInfo.height) {
            fd.append('base_image_width', String(lockInfo.width));
            fd.append('base_image_height', String(lockInfo.height));
          }
        }
        appendRefsToFormData(fd, state.refs);
        fetchOpts.body = fd;
      } else {
        fetchOpts.headers = { 'Content-Type': 'application/json' };
        fetchOpts.body = JSON.stringify({
          prompt: raw,
          mode: state.mode,
          style: $('enhanceStyleSelect').value,
          lang: $('enhanceLangSelect').value,
          media_type: 'image',
          target_model: 'seedream-5.5',
          template_id: tplId,
          custom_template: customTpl,
          ref_count: 0,
        });
      }

      await consumeSse('/api/enhance-prompt/stream', fetchOpts, {
        onEvent(evt) {
          if (evt.type === 'delta') {
            if (!gotFirstDelta) {
              gotFirstDelta = true;
              state.previousPrompt = prevDraft;
              $('promptInput').value = '';
              $('promptLoadingText').textContent = 'AI 正在实时输出提示词...';
            }
            streamedText = stripBoldMarkers(streamedText + evt.delta);
            $('promptInput').value = streamedText;
            updateCharCount();
          } else if (evt.type === 'done') {
            state.previousPrompt = prevDraft;
            $('promptInput').value = stripBoldMarkers(evt.prompt || streamedText);
            updateCharCount();
            syncEditSizeLock();
            finalModel = evt.model || '';
            usedVision = Boolean(evt.used_vision);
          }
        },
      });

      $('undoEnhanceBtn').classList.remove('hidden');
      const visionNote = usedVision ? '识图+' : '';
      hintEl.textContent = `已通过 ${finalModel || 'AI'} ${visionNote}扩写完成（可点「撤销」恢复原文，或直接微调后生成）`;
      hintEl.classList.remove('hidden');
      if (state.config?.settings?.llm_provider === 'venice') {
        refreshVeniceBalance();
      }
    } catch (err) {
      if (gotFirstDelta) {
        $('promptInput').value = prevDraft;
        state.previousPrompt = null;
        updateCharCount();
      }
      showFormError(err.message);
    } finally {
      state.isEnhancing = false;
      $('enhancePromptBtn').disabled = false;
      $('enhanceSpinner').classList.add('hidden');
      $('promptLoadingMask').classList.add('hidden');
      $('enhanceBtnLabel').textContent = '✨ AI 扩写提示词';
    }
  }

  function undoEnhance() {
    if (state.previousPrompt === null) return;
    $('promptInput').value = state.previousPrompt;
    state.previousPrompt = null;
    $('undoEnhanceBtn').classList.add('hidden');
    $('enhanceHint').classList.add('hidden');
    updateCharCount();
    syncEditSizeLock();
  }

  /* ==================== Video Studio (Seedance 2.5/2.0 & Wan 3.0/2.7/2.6) ==================== */

  function getActiveVideoSpec() {
    const models = state.config?.schema?.video_models || [];
    return models.find((m) => m.id === state.videoFamily) || models[0] || null;
  }

  function showVideoFormError(msg) {
    const el = $('videoFormError');
    if (!msg) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function renderVideoModelSelect() {
    const sel = $('videoModelSelect');
    const models = state.config?.schema?.video_models || [];
    if (!sel || !models.length) return;
    const prev = state.videoFamily;
    sel.innerHTML = '';
    const groups = new Map();
    models.forEach((m) => {
      if (!groups.has(m.series)) groups.set(m.series, []);
      groups.get(m.series).push(m);
    });
    groups.forEach((list, series) => {
      const grp = document.createElement('optgroup');
      grp.label = series;
      list.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.label}${m.price_hint ? ` · ${m.price_hint}` : ''}`;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });
    if (models.some((m) => m.id === prev)) {
      sel.value = prev;
    } else {
      state.videoFamily = models[0].id;
      sel.value = state.videoFamily;
    }
  }

  function renderVideoModeUI() {
    const spec = getActiveVideoSpec();
    if (!spec) return;

    const supportedModes = Object.keys(spec.tasks || {});
    if (!supportedModes.includes(state.videoMode)) {
      state.videoMode = supportedModes[0] || 'image-to-video';
    }

    document.querySelectorAll('[data-video-mode]').forEach((btn) => {
      const m = btn.dataset.videoMode;
      const supported = supportedModes.includes(m);
      btn.disabled = !supported;
      btn.classList.toggle('active', m === state.videoMode);
      btn.title = supported ? '' : `${spec.label} 暂不支持该模式`;
    });

    $('videoModelPriceHint').textContent = spec.price_hint || '';
    const meta = VIDEO_MODE_META[state.videoMode] || VIDEO_MODE_META['text-to-video'];
    $('videoPromptLabel').textContent = meta.promptLabel;
    $('videoPromptInput').placeholder = meta.placeholder;
    $('videoGenerateBtnLabel').textContent = meta.btn;

    // Reference images section
    const isRef = state.videoMode !== 'text-to-video';
    $('videoRefSection').classList.toggle('hidden', !isRef);
    if (state.videoMode === 'image-to-video') {
      const maxF = spec.supports_last_frame ? 2 : 1;
      $('videoRefLabel').textContent = spec.supports_last_frame ? '首帧图 / 尾帧图（最多 2 张）' : '首帧参考图（仅 1 张）';
      $('videoRefHint').textContent = spec.supports_last_frame ? '第 1 张作起始首帧 · 可选第 2 张作闭合尾帧' : '当前模型仅支持单张首帧（不支持尾帧）';
      if (maxF === 1) $('videoFileInput').removeAttribute('multiple');
      else $('videoFileInput').setAttribute('multiple', 'multiple');
      if (state.videoRefs.length > maxF) {
        state.videoRefs.slice(maxF).forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
        state.videoRefs = state.videoRefs.slice(0, maxF);
      }
    } else if (state.videoMode === 'reference-to-video') {
      $('videoRefLabel').textContent = '主体 / 场景参考图（1–10 张）';
      $('videoRefHint').textContent = '可点击卡片底部按钮插入 @Image 1 / @Image 2';
      $('videoFileInput').setAttribute('multiple', 'multiple');
    }

    // Duration controls
    let dMin = Number(spec.min_duration || 4);
    let dMax = Number(spec.max_duration || 15);
    if (state.videoMode === 'reference-to-video' && spec.ref_min_duration !== undefined) {
      dMin = Number(spec.ref_min_duration);
      dMax = Number(spec.ref_max_duration);
    }
    const range = $('videoDurationRange');
    range.min = String(dMin);
    range.max = String(dMax);

    if (!spec.supports_auto_duration) {
      state.videoDurationAuto = false;
    }
    $('videoDurationAutoWrap').classList.toggle('hidden', !spec.supports_auto_duration);
    $('videoDurationAutoCheck').checked = state.videoDurationAuto;

    let presets = Array.isArray(spec.duration_choices) && spec.duration_choices.length && state.videoMode !== 'reference-to-video'
      ? [...spec.duration_choices]
      : [2, 4, 5, 8, 10, 15, 20, 30].filter((d) => d >= dMin && d <= dMax);
    if (!presets.length) presets = [dMin, dMax];

    if (!state.videoDurationAuto) {
      if (Array.isArray(spec.duration_choices) && spec.duration_choices.length && state.videoMode !== 'reference-to-video') {
        state.videoDuration = presets.reduce((best, c) =>
          Math.abs(c - state.videoDuration) < Math.abs(best - state.videoDuration) ? c : best
        );
      } else {
        state.videoDuration = Math.max(dMin, Math.min(dMax, Number(state.videoDuration) || spec.default_duration));
      }
    }
    range.value = String(state.videoDuration);
    range.disabled = state.videoDurationAuto;
    $('videoDurationVal').textContent = state.videoDurationAuto ? '自动 (-1)' : `${state.videoDuration} 秒`;
    $('videoDurationRangeHint').textContent = `当前模型可选范围：${dMin}–${dMax} 秒${spec.supports_auto_duration ? '（或勾选自动匹配 -1）' : ''}`;

    const durRow = $('videoDurationPresets');
    durRow.innerHTML = '';
    presets.forEach((sec) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${!state.videoDurationAuto && state.videoDuration === sec ? ' active' : ''}`;
      btn.textContent = `${sec}秒`;
      btn.addEventListener('click', () => {
        state.videoDurationAuto = false;
        state.videoDuration = sec;
        renderVideoModeUI();
      });
      durRow.appendChild(btn);
    });

    // Resolution chips
    let resList = [...(spec.resolutions || ['720p'])];
    if (state.videoMode === 'reference-to-video' && spec.ref_max_resolution === '1080p') {
      resList = resList.filter((r) => r !== '4k');
    }
    if (!resList.includes(state.videoResolution)) {
      state.videoResolution = resList.includes(spec.default_resolution) ? spec.default_resolution : resList[0];
    }
    const resRow = $('videoResolutionRow');
    resRow.innerHTML = '';
    resList.forEach((r) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${state.videoResolution === r ? ' active' : ''}`;
      btn.textContent = r.toUpperCase();
      btn.addEventListener('click', () => {
        state.videoResolution = r;
        renderVideoModeUI();
      });
      resRow.appendChild(btn);
    });

    // Output format chips
    $('videoFormatGroup').classList.toggle('hidden', !spec.supports_output_format);
    const fmtRow = $('videoFormatRow');
    fmtRow.innerHTML = '';
    ['mp4', 'mov'].forEach((fmt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${state.videoOutputFormat === fmt ? ' active' : ''}`;
      btn.textContent = fmt.toUpperCase();
      btn.addEventListener('click', () => {
        state.videoOutputFormat = fmt;
        renderVideoModeUI();
      });
      fmtRow.appendChild(btn);
    });

    // Aspect ratio chips
    let ratios = [...(spec.aspect_ratios || [])];
    let ratioNote = '';
    let showRatio = ratios.length > 0;
    if (state.videoMode === 'image-to-video') {
      if (spec.i2v_aspect_ratio === 'adaptive_only') {
        ratios = ['adaptive'];
        ratioNote = '图生视频默认跟随首帧比例 (adaptive)';
      } else if (!spec.i2v_aspect_ratio) {
        showRatio = false;
      }
    }
    $('videoRatioGroup').classList.toggle('hidden', !showRatio);
    $('videoRatioNote').textContent = ratioNote;
    if (showRatio && !ratios.includes(state.videoAspectRatio)) {
      state.videoAspectRatio = ratios.includes(spec.default_aspect_ratio) ? spec.default_aspect_ratio : ratios[0];
    }
    const ratioGrid = $('videoRatioGrid');
    ratioGrid.innerHTML = '';
    ratios.forEach((r) => {
      const [w, h] = RATIO_DIMS[r] || [15, 11];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ratio-btn${state.videoAspectRatio === r ? ' active' : ''}`;
      btn.innerHTML = `<span class="ratio-box" style="width:${w}px;height:${h}px"></span><span>${escapeHtml(r === 'adaptive' ? '自适应' : r)}</span>`;
      btn.addEventListener('click', () => {
        state.videoAspectRatio = r;
        renderVideoModeUI();
      });
      ratioGrid.appendChild(btn);
    });

    // Shot type (Wan 2.6)
    $('videoShotTypeGroup').classList.toggle('hidden', !spec.supports_shot_type);
    const shotRow = $('videoShotTypeRow');
    shotRow.innerHTML = '';
    [
      { id: 'single', label: '单镜头连续 (single)' },
      { id: 'multi', label: '多镜头切换 (multi)' },
    ].forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chip-btn${state.videoShotType === opt.id ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        state.videoShotType = opt.id;
        renderVideoModeUI();
      });
      shotRow.appendChild(btn);
    });

    // Feature checkboxes & negative prompt
    $('videoAudioGroup').classList.toggle('hidden', !spec.supports_audio);
    $('videoWatermarkGroup').classList.toggle('hidden', !spec.supports_watermark);
    $('videoThinkingGroup').classList.toggle('hidden', !spec.supports_thinking);
    $('videoExpansionGroup').classList.toggle('hidden', !spec.supports_prompt_expansion);
    $('videoNegPromptGroup').classList.toggle('hidden', !spec.supports_negative_prompt);

    // Quick video presets
    const presetRow = $('videoPresetRow');
    presetRow.innerHTML = '';
    (meta.presets || []).forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip';
      btn.textContent = `+ ${p.label}`;
      btn.addEventListener('click', () => {
        $('videoPromptInput').value = p.text;
        $('videoCharCount').textContent = `${p.text.length} / 5000`;
        updateVideoQuotePreview();
      });
      presetRow.appendChild(btn);
    });

    syncTemplateDrawer('video');
    renderVideoRefs();
    updateVideoQuotePreview();
  }

  function insertVideoTextAtCursor(token) {
    const ta = $('videoPromptInput');
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    const padLeft = before && !before.endsWith(' ') ? ' ' : '';
    const padRight = after && !after.startsWith(' ') ? ' ' : '';
    ta.value = `${before}${padLeft}${token}${padRight}${after}`;
    const cursor = (before + padLeft + token + padRight).length;
    ta.focus();
    ta.setSelectionRange(cursor, cursor);
    $('videoCharCount').textContent = `${ta.value.length} / 5000`;
  }

  function renderVideoRefs() {
    const grid = $('videoRefGrid');
    grid.innerHTML = '';
    state.videoRefs.forEach((ref, idx) => {
      const card = document.createElement('div');
      card.className = 'ref-card';

      const img = document.createElement('img');
      img.src = ref.previewUrl;
      img.alt = `Video Ref ${idx + 1}`;

      const badge = document.createElement('span');
      badge.className = 'ref-badge';
      if (state.videoMode === 'image-to-video') {
        badge.textContent = idx === 0 ? '首帧 Frame 1' : '尾帧 Frame 2';
      } else {
        badge.textContent = `@Image ${idx + 1}`;
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'ref-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = '移除';
      removeBtn.addEventListener('click', () => {
        if (ref.kind === 'upload') URL.revokeObjectURL(ref.previewUrl);
        state.videoRefs.splice(idx, 1);
        renderVideoRefs();
        updateVideoQuotePreview();
      });

      card.append(img, badge, removeBtn);
      if (state.videoMode === 'reference-to-video') {
        const insertBtn = document.createElement('button');
        insertBtn.type = 'button';
        insertBtn.className = 'ref-insert';
        insertBtn.textContent = `+ 插入 @Image ${idx + 1}`;
        insertBtn.addEventListener('click', () => insertVideoTextAtCursor(`@Image ${idx + 1}`));
        card.appendChild(insertBtn);
      }
      grid.appendChild(card);
    });
  }

  function addVideoUploadFiles(fileList) {
    const spec = getActiveVideoSpec();
    const limit = state.videoMode === 'image-to-video' ? (spec?.supports_last_frame ? 2 : 1) : 10;
    const files = Array.from(fileList || []).filter(isImageFile);
    if (!files.length) return;
    if (limit === 1) {
      state.videoRefs.forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
      state.videoRefs = [];
    }
    for (const file of files) {
      if (state.videoRefs.length >= limit) break;
      state.videoRefs.push({
        kind: 'upload',
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    renderVideoRefs();
    updateVideoQuotePreview();
  }

  function addVideoLocalAssetRef(filename, targetMode = 'image-to-video') {
    state.videoMode = targetMode;
    const previewUrl =
      state.cloudMode
        ? state.jobs.flatMap((j) => j.assets || []).find((a) => a.filename === filename)?.url || `/outputs/${encodeURIComponent(filename)}`
        : `/outputs/${encodeURIComponent(filename)}`;
    const item = { kind: 'local', filename, previewUrl };
    if (targetMode === 'image-to-video') {
      const spec = getActiveVideoSpec();
      const limit = spec?.supports_last_frame ? 2 : 1;
      if (state.videoRefs.length >= limit) {
        const dropped = state.videoRefs.shift();
        if (dropped?.kind === 'upload') URL.revokeObjectURL(dropped.previewUrl);
      }
      state.videoRefs.unshift(item);
    } else {
      if (state.videoRefs.length >= 10) state.videoRefs.shift();
      state.videoRefs.push(item);
    }
    renderVideoModeUI();
    setWorkspace('video');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateVideoQuotePreview(liveQuote = null) {
    const el = $('videoQuoteText');
    const spec = getActiveVideoSpec();
    if (!el || !spec) return;
    if (liveQuote && liveQuote.estimatedCost !== undefined) {
      const note = liveQuote.note ? ` · ${liveQuote.note}` : '（SpicyAPI 实时锁价报价）';
      const costStr = String(liveQuote.estimatedCost).startsWith('$')
        ? liveQuote.estimatedCost
        : `$${liveQuote.estimatedCost}`;
      el.textContent = `预估费用：${costStr} USD${note}`;
      return;
    }
    const durLabel = state.videoDurationAuto ? '自动时长' : `${state.videoDuration}秒`;
    el.textContent = `${spec.label.split(' · ')[0]} · ${state.videoResolution.toUpperCase()} · ${durLabel}${spec.price_hint ? `（参考 ${spec.price_hint}）` : ''}`;
  }

  async function requestVideoQuote() {
    showVideoFormError('');
    try {
      const data = await apiJson('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'video',
          video_family: state.videoFamily,
          mode: state.videoMode,
          prompt: $('videoPromptInput').value,
          duration_seconds: state.videoDurationAuto ? -1 : state.videoDuration,
          resolution: state.videoResolution,
          aspect_ratio: state.videoAspectRatio,
          output_format: state.videoOutputFormat,
          shot_type: state.videoShotType,
          generate_audio: state.videoAudio,
          watermark: state.videoWatermark,
          enable_thinking: state.videoThinking,
          enable_prompt_expansion: state.videoExpansion,
          negative_prompt: $('videoNegPromptInput').value,
        }),
      });
      updateVideoQuotePreview(data.quote);
    } catch (err) {
      showVideoFormError(err.message);
    }
  }

  async function enhanceVideoPrompt() {
    showVideoFormError('');
    if (state.isVideoEnhancing) return;
    const raw = $('videoPromptInput').value.trim();
    if (!raw) {
      showVideoFormError('请先写几句简单动作或想法，再点击「按模板 AI 扩写」。');
      return;
    }

    state.isVideoEnhancing = true;
    $('videoEnhancePromptBtn').disabled = true;
    $('videoEnhanceSpinner').classList.remove('hidden');
    $('videoEnhanceBtnLabel').textContent = state.videoRefs.length ? '看图编排分镜...' : '模板扩写中...';
    $('videoPromptLoadingText').textContent = 'DeepSeek 正在按模板精修视频脚本...';
    $('videoPromptLoadingMask').classList.remove('hidden');
    const hintEl = $('videoEnhanceHint');
    hintEl.classList.add('hidden');

    const prevDraft = $('videoPromptInput').value;
    const tplId = resolveEffectiveTemplateId('video', $('videoTemplateSelect').value);
    const customTpl = $('videoTemplateEditor')?.value?.trim() || '';
    const durSecs = state.videoDurationAuto ? 0 : state.videoDuration;
    let streamedText = '';
    let gotFirstDelta = false;
    let finalModel = '';

    try {
      const fetchOpts = { method: 'POST' };
      if (state.videoRefs.length > 0) {
        const fd = new FormData();
        fd.append('prompt', raw);
        fd.append('mode', state.videoMode);
        fd.append('lang', $('videoEnhanceLangSelect').value);
        fd.append('media_type', 'video');
        fd.append('target_model', state.videoFamily);
        fd.append('duration_seconds', String(durSecs));
        fd.append('template_id', tplId);
        if (customTpl) fd.append('custom_template', customTpl);
        fd.append('ref_count', String(state.videoRefs.length));
        appendRefsToFormData(fd, state.videoRefs);
        fetchOpts.body = fd;
      } else {
        fetchOpts.headers = { 'Content-Type': 'application/json' };
        fetchOpts.body = JSON.stringify({
          prompt: raw,
          mode: state.videoMode,
          lang: $('videoEnhanceLangSelect').value,
          media_type: 'video',
          target_model: state.videoFamily,
          duration_seconds: durSecs,
          template_id: tplId,
          custom_template: customTpl,
          ref_count: 0,
        });
      }

      await consumeSse('/api/enhance-prompt/stream', fetchOpts, {
        onEvent(evt) {
          if (evt.type === 'delta') {
            if (!gotFirstDelta) {
              gotFirstDelta = true;
              state.previousVideoPrompt = prevDraft;
              $('videoPromptInput').value = '';
              $('videoPromptLoadingText').textContent = '正在实时输出视频分镜提示词...';
            }
            streamedText = stripBoldMarkers(streamedText + evt.delta);
            $('videoPromptInput').value = streamedText;
            $('videoCharCount').textContent = `${streamedText.length} / 5000`;
          } else if (evt.type === 'done') {
            state.previousVideoPrompt = prevDraft;
            const cleanOut = stripBoldMarkers(evt.prompt || streamedText);
            $('videoPromptInput').value = cleanOut;
            $('videoCharCount').textContent = `${cleanOut.length} / 5000`;
            finalModel = evt.model || '';
          }
        },
      });

      $('videoUndoEnhanceBtn').classList.remove('hidden');
      hintEl.textContent = `已由 ${finalModel || 'DeepSeek'} 按模板扩写完成（可点「撤销」恢复原文）`;
      hintEl.classList.remove('hidden');
      if (state.config?.settings?.llm_provider === 'venice') {
        refreshVeniceBalance();
      }
    } catch (err) {
      if (gotFirstDelta) {
        $('videoPromptInput').value = prevDraft;
        state.previousVideoPrompt = null;
        $('videoCharCount').textContent = `${prevDraft.length} / 5000`;
      }
      showVideoFormError(err.message);
    } finally {
      state.isVideoEnhancing = false;
      $('videoEnhancePromptBtn').disabled = false;
      $('videoEnhanceSpinner').classList.add('hidden');
      $('videoPromptLoadingMask').classList.add('hidden');
      $('videoEnhanceBtnLabel').textContent = '✨ 按模板 AI 扩写';
    }
  }

  function undoVideoEnhance() {
    if (state.previousVideoPrompt === null) return;
    $('videoPromptInput').value = state.previousVideoPrompt;
    state.previousVideoPrompt = null;
    $('videoUndoEnhanceBtn').classList.add('hidden');
    $('videoEnhanceHint').classList.add('hidden');
    $('videoCharCount').textContent = `${$('videoPromptInput').value.length} / 5000`;
  }

  async function submitVideoGeneration() {
    showVideoFormError('');
    if (state.isVideoSubmitting) return;
    if (!state.config?.settings?.has_api_key) {
      openModal('settingsModal');
      showVideoFormError('请先填写你的 SpicyAPI Key。');
      return;
    }

    const prompt = $('videoPromptInput').value.trim();
    if (
      (state.videoMode === 'text-to-video' ||
        state.videoMode === 'reference-to-video' ||
        state.videoFamily === 'seedance-2.5-flash' ||
        state.videoFamily === 'wan-2.7-spicy') &&
      !prompt
    ) {
      showVideoFormError('当前所选模型/模式需要填写视频动作描述（Prompt）。');
      return;
    }
    if (state.videoMode !== 'text-to-video' && !state.videoRefs.length) {
      showVideoFormError('请至少上传或选择 1 张首帧/参考图片。');
      return;
    }

    state.isVideoSubmitting = true;
    $('videoGenerateBtn').disabled = true;
    $('videoGenerateSpinner').classList.remove('hidden');
    $('videoGenerateBtnLabel').textContent = state.videoRefs.length ? '上传参考图并提交视频任务...' : '提交视频任务中...';

    try {
      const fd = new FormData();
      fd.append('media_type', 'video');
      fd.append('video_family', state.videoFamily);
      fd.append('mode', state.videoMode);
      fd.append('prompt', prompt);
      fd.append('duration_seconds', String(state.videoDurationAuto ? -1 : state.videoDuration));
      fd.append('resolution', state.videoResolution);
      fd.append('aspect_ratio', state.videoAspectRatio);
      fd.append('output_format', state.videoOutputFormat);
      fd.append('shot_type', state.videoShotType);
      fd.append('generate_audio', String(state.videoAudio));
      fd.append('watermark', String(state.videoWatermark));
      fd.append('enable_thinking', String(state.videoThinking));
      fd.append('enable_prompt_expansion', String(state.videoExpansion));
      fd.append('negative_prompt', $('videoNegPromptInput').value.trim());
      appendRefsToFormData(fd, state.videoRefs);

      const data = await apiJson('/api/generate', {
        method: 'POST',
        body: fd,
      });

      const job = data.job;
      state.jobs = [job, ...state.jobs.filter((j) => j.id !== job.id)];
      state.activeVideoJobId = job.id;
      renderVideoStage();
      renderVideoHistory();
      ensurePolling();
      refreshBalance();
    } catch (err) {
      showVideoFormError(err.message);
    } finally {
      state.isVideoSubmitting = false;
      $('videoGenerateBtn').disabled = false;
      $('videoGenerateSpinner').classList.add('hidden');
      $('videoGenerateBtnLabel').textContent = VIDEO_MODE_META[state.videoMode]?.btn || '开始生成视频';
    }
  }

  function renderVideoStage() {
    const videoJobs = state.jobs.filter(isVideoJob);
    const job = videoJobs.find((j) => j.id === state.activeVideoJobId) || videoJobs[0] || null;
    const body = $('videoStageBody');
    const actions = $('videoStageActions');
    const badge = $('videoStageStatusBadge');
    const subtitle = $('videoStageSubtitle');
    if (!body) return;

    if (!job) {
      body.className = 'stage-body empty';
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">🎬</div>
          <p>选择 Seedance 或万象模型，输入动作脚本点击「开始生成视频」</p>
          <span>可用「✨ 按模板 AI 扩写」先由无审查 DeepSeek 生成电影分镜与时间轴脚本</span>
        </div>`;
      actions.classList.add('hidden');
      badge.classList.add('hidden');
      subtitle.textContent = '支持 Seedance 2.5 / 2.0 与万象 Wan 3.0 / 2.7，完成后自动保存 MP4';
      return;
    }

    state.activeVideoJobId = job.id;
    badge.classList.remove('hidden');

    if (job.state === 'queued' || job.state === 'running') {
      badge.className = 'status-pill running';
      badge.textContent = job.state === 'queued' ? '排队中' : '渲染视频中';
      const durInfo = job.params?.duration_seconds === -1 ? '自动时长' : `${job.params?.duration_seconds || ''}s`;
      subtitle.textContent = `${job.model} · ${durInfo} · 预估冻结 ${formatCost(job.estimated_cost || '0.5')}`;
      body.className = 'stage-body';
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">🎞️</div>
          <p>${job.state === 'queued' ? '视频任务已进入云端渲染队列...' : '正在逐帧合成高清视频与音频...'}</p>
          <span>视频通常需要 45 秒 – 4 分钟；即使关闭或刷新页面，后台轮询仍会自动拉取并保存</span>
        </div>`;
      actions.classList.add('hidden');
      return;
    }

    if (job.state !== 'succeeded') {
      badge.className = 'status-pill failed';
      badge.textContent = job.state === 'expired' ? '已超时' : '生成失败';
      subtitle.textContent = `${job.model || 'video'} · ${formatTime(job.created_at)}`;
      body.className = 'stage-body';
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">!</div>
          <p>${escapeHtml(job.error_message || '视频任务未成功完成')}</p>
          <span>失败或超时未成交的任务不会扣费，余额会自动退回</span>
        </div>`;
      actions.classList.remove('hidden');
      $('videoStageSaveBtn').classList.add('hidden');
      $('videoStageWriteBtn').classList.add('hidden');
      return;
    }

    badge.className = 'status-pill succeeded';
    badge.textContent = job.cost ? `实付 ${formatCost(job.cost)}` : '已完成';
    const p = job.params || {};
    const durTag = p.duration_seconds === -1 ? '自动时长' : (p.duration_seconds ? `${p.duration_seconds}s` : '');
    subtitle.textContent = `${job.model} · ${p.resolution || ''} ${durTag} · ${formatTime(job.completed_at || job.created_at)}`;

    const first = (job.assets || [])[0];
    body.className = 'stage-body';
    body.innerHTML = '';
    if (first?.url) {
      const video = document.createElement('video');
      video.className = 'hero-video';
      video.src = first.url;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      body.appendChild(video);
    }

    actions.classList.remove('hidden');
    $('videoStageSaveBtn').classList.remove('hidden');
    $('videoStageWriteBtn').classList.remove('hidden');
  }

  function renderVideoHistory() {
    const grid = $('videoHistoryGrid');
    const videoJobs = state.jobs.filter(isVideoJob);
    $('videoHistoryCount').textContent = String(videoJobs.length);
    if (!grid) return;
    grid.innerHTML = '';

    if (!videoJobs.length) {
      grid.innerHTML = '<p class="field-hint" style="grid-column:1/-1;text-align:center;padding:24px 0;">暂无视频生成记录</p>';
      return;
    }

    videoJobs.forEach((job) => {
      const card = document.createElement('div');
      card.className = `history-card${job.id === state.activeVideoJobId ? ' active' : ''}`;
      card.addEventListener('click', () => {
        state.activeVideoJobId = job.id;
        renderVideoStage();
        renderVideoHistory();
      });

      const thumb = document.createElement('div');
      thumb.className = 'history-thumb';
      thumb.style.position = 'relative';
      if (job.assets?.length && job.assets[0].url) {
        const vid = document.createElement('video');
        vid.src = job.assets[0].url;
        vid.muted = true;
        vid.preload = 'metadata';
        vid.style.width = '100%';
        vid.style.height = '100%';
        vid.style.objectFit = 'cover';
        const pill = document.createElement('span');
        pill.className = 'video-thumb-badge';
        const d = job.params?.duration_seconds;
        pill.textContent = d && d > 0 ? `🎬 ${d}s` : '🎬 VIDEO';
        thumb.append(vid, pill);
      } else {
        const st = document.createElement('span');
        st.className = 'field-hint';
        st.textContent = job.state === 'queued' || job.state === 'running' ? '⏳ 渲染中' : '⚠️ 未出片';
        thumb.appendChild(st);
      }

      const info = document.createElement('div');
      info.className = 'history-info';
      const promptEl = document.createElement('div');
      promptEl.className = 'history-prompt';
      promptEl.textContent = job.prompt || job.model || '(video)';

      const metaEl = document.createElement('div');
      metaEl.className = 'history-meta';
      const left = document.createElement('span');
      const shortModel = (job.params?.video_family || job.model || '').replace(/^(bytedance|alibaba)\//, '');
      left.textContent = `${shortModel} ${job.cost ? formatCost(job.cost) : ''}`.trim();
      const right = document.createElement('span');
      right.textContent = formatTime(job.created_at);
      metaEl.append(left, right);
      info.append(promptEl, metaEl);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'history-del';
      delBtn.textContent = '✕';
      delBtn.title = '删除记录与本地视频';
      delBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await apiJson(`/api/tasks/${encodeURIComponent(job.id)}`, { method: 'DELETE' });
        state.jobs = state.jobs.filter((j) => j.id !== job.id);
        if (state.activeVideoJobId === job.id) {
          state.activeVideoJobId = state.jobs.find(isVideoJob)?.id || null;
        }
        renderVideoStage();
        renderVideoHistory();
      });

      card.append(thumb, info, delBtn);
      grid.appendChild(card);
    });
  }

  /* ==================== API Console Overview Modal ==================== */

  async function loadApiConsoleOverview() {
    const body = $('apiConsoleContent');
    if (!body) return;
    body.innerHTML = '<p class="field-hint">正在从 SpicyAPI 与 Venice 获取实时用量与账单...</p>';
    try {
      const data = await apiJson('/api/console-overview');
      const sp = data.spicy || {};
      const bal = sp.balance || {};
      const funding = bal.funding || {};
      const usage = sp.usage || {};
      const totals = usage.totals || {};
      const remoteJobs = sp.jobs?.items || [];
      const models = sp.models || {};
      const cats = models.categories || {};
      const vn = data.venice || {};
      const vnUsd = formatVeniceUsd(vn.balance);

      const catSummary = Object.entries(cats)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ') || '--';

      const jobsRowsHtml = remoteJobs.length
        ? remoteJobs
            .slice(0, 15)
            .map(
              (j) => `
              <tr>
                <td><code>${escapeHtml(j.model || '--')}</code></td>
                <td>${escapeHtml(j.state || '--')}</td>
                <td>${escapeHtml(j.cost !== null && j.cost !== undefined ? `$${j.cost}` : (j.estimatedCost ? `~$${j.estimatedCost}` : '--'))}</td>
                <td>${escapeHtml(formatTime(j.createdAt || j.created_at))}</td>
              </tr>`
            )
            .join('')
        : '<tr><td colspan="4" style="color:var(--text-faint);">暂无近期云端任务记录</td></tr>';

      body.innerHTML = `
        <div class="console-grid">
          <div class="console-card">
            <div class="console-card-label">SpicyAPI 可用余额</div>
            <div class="console-card-val">${sp.configured ? `$${escapeHtml(bal.available ?? '--')}` : '未配置 Key'}</div>
            <div class="console-card-sub">
              充值可用：$${escapeHtml(funding.prepaidAvailableUsd ?? '--')} · 赠金：$${escapeHtml(funding.promoAvailableUsd ?? '--')}<br/>
              任务冻结中：$${escapeHtml(bal.held ?? '0')}
            </div>
          </div>
          <div class="console-card">
            <div class="console-card-label">SpicyAPI 累计消费与调用（/usage）</div>
            <div class="console-card-val">${totals.spend !== undefined ? `$${Number(totals.spend).toFixed(4)}` : '--'}</div>
            <div class="console-card-sub">
              总调用次数：${escapeHtml(totals.calls ?? '--')} · 模型数：${escapeHtml(models.total ?? '--')}<br/>
              分类：${escapeHtml(catSummary)}
            </div>
          </div>
          <div class="console-card">
            <div class="console-card-label">Venice 无审查写作/联网识图余额</div>
            <div class="console-card-val">${vn.configured ? escapeHtml(vnUsd || '已连接') : '未配置'}</div>
            <div class="console-card-sub">
              当前提供商：${escapeHtml(vn.provider || '--')}<br/>
              默认模型：<code>${escapeHtml(vn.model || '--')}</code>
            </div>
          </div>
        </div>
        ${sp.error || vn.error ? `<p class="error-banner">${escapeHtml([sp.error, vn.error].filter(Boolean).join(' | '))}</p>` : ''}
        <div class="field-header" style="margin-top:8px;">
          <label>SpicyAPI 云端最近任务流水（/jobs，展示前 15 条）</label>
        </div>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead>
              <tr><th>模型 Model</th><th>状态</th><th>实付 / 预估 (USD)</th><th>时间</th></tr>
            </thead>
            <tbody>${jobsRowsHtml}</tbody>
          </table>
        </div>`;
    } catch (err) {
      body.innerHTML = `<p class="error-banner">${escapeHtml(err.message)}</p>`;
    }
  }

  function openApiConsoleModal() {
    openModal('apiConsoleModal');
    loadApiConsoleOverview();
  }

  function showWritingError(msg) {
    const el = $('writingError');
    if (!msg) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function renderWritingAttachPreview() {
    const wrap = $('writingAttachPreview');
    wrap.innerHTML = '';
    if (!state.writingAttachments.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    state.writingAttachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'writing-attach-chip';
      const img = document.createElement('img');
      img.src = att.previewUrl;
      img.alt = `参考图 ${idx + 1}`;
      img.addEventListener('click', () => openLightbox(att.previewUrl));

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '✕';
      rm.title = '移除配图';
      rm.addEventListener('click', () => {
        if (att.kind === 'upload') URL.revokeObjectURL(att.previewUrl);
        state.writingAttachments.splice(idx, 1);
        renderWritingAttachPreview();
      });
      chip.append(img, rm);
      wrap.appendChild(chip);
    });
  }

  function addWritingFiles(fileList) {
    const files = Array.from(fileList || []).filter(isImageFile);
    if (!files.length) return;
    for (const file of files) {
      if (state.writingAttachments.length >= 4) break;
      state.writingAttachments.push({
        kind: 'upload',
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    renderWritingAttachPreview();
  }

  function addWritingLocalAsset(filename) {
    if (!filename) return;
    if (state.writingAttachments.length >= 4) state.writingAttachments.shift();
    state.writingAttachments.push({
      kind: 'local',
      filename,
      previewUrl: `/outputs/${encodeURIComponent(filename)}`,
    });
    renderWritingAttachPreview();
    setWorkspace('writing');
    $('writingInput').focus();
  }

  function renderWritingSessions() {
    const list = $('writingSessionList');
    $('writingSessionCount').textContent = String(state.writingSessions.length);
    list.innerHTML = '';
    if (!state.writingSessions.length) {
      list.innerHTML = '<p class="field-hint" style="margin:6px 0;">暂无写作历史</p>';
      return;
    }

    state.writingSessions.forEach((sess) => {
      const row = document.createElement('div');
      row.className = `writing-session-item${sess.id === state.activeWritingId ? ' active' : ''}`;
      row.addEventListener('click', () => selectWritingSession(sess.id));

      const info = document.createElement('div');
      info.style.minWidth = '0';
      info.style.flex = '1';
      const title = document.createElement('div');
      title.className = 'writing-session-title';
      title.textContent = sess.title || '新写作对话';
      const meta = document.createElement('div');
      meta.className = 'writing-session-meta';
      meta.textContent = `${(sess.messages || []).length} 条消息 · ${formatTime(sess.updated_at)}`;
      info.append(title, meta);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'writing-session-del';
      delBtn.textContent = '✕';
      delBtn.title = '删除写作对话';
      delBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await apiJson(`/api/writing/sessions/${encodeURIComponent(sess.id)}`, { method: 'DELETE' });
        state.writingSessions = state.writingSessions.filter((s) => s.id !== sess.id);
        if (state.activeWritingId === sess.id) {
          state.activeWritingId = state.writingSessions[0]?.id || null;
        }
        renderWritingSessions();
        renderWritingMessages();
      });

      row.append(info, delBtn);
      list.appendChild(row);
    });
  }

  function selectWritingSession(sessionId) {
    state.activeWritingId = sessionId;
    const sess = state.writingSessions.find((s) => s.id === sessionId);
    if (sess) {
      if (sess.persona) $('writingPersonaSelect').value = sess.persona;
      if (sess.custom_system !== undefined) $('writingCustomSystem').value = sess.custom_system || '';
      if (sess.model && Array.from($('writingModelSelect').options).some((o) => o.value === sess.model)) {
        $('writingModelSelect').value = sess.model;
      }
    }
    renderWritingSessions();
    renderWritingMessages();
  }

  function startNewWritingSession() {
    state.activeWritingId = null;
    $('writingTitle').textContent = '新写作对话（支持看图创作）';
    showWritingError('');
    renderWritingSessions();
    renderWritingMessages();
    $('writingInput').focus();
  }

  function createWritingTurnElement(turn) {
    const wrap = document.createElement('div');
    wrap.className = `writing-turn ${turn.role === 'assistant' ? 'assistant' : 'user'}`;

    const atts = turn.attachments || [];
    if (atts.length) {
      const attRow = document.createElement('div');
      attRow.className = 'writing-turn-atts';
      atts.forEach((att) => {
        const img = document.createElement('img');
        img.src = att.url;
        img.alt = att.filename || '参考图';
        img.loading = 'lazy';
        img.addEventListener('click', () => openLightbox(att.url));
        attRow.appendChild(img);
      });
      wrap.appendChild(attRow);
    }

    const bubble = document.createElement('div');
    bubble.className = 'writing-bubble';
    bubble.textContent = stripBoldMarkers(turn.content || '');
    wrap.appendChild(bubble);

    const citations = turn.citations || [];
    if (citations.length) {
      const citeRow = document.createElement('div');
      citeRow.className = 'writing-citations';
      citations.slice(0, 6).forEach((c) => {
        if (!c?.url) return;
        const a = document.createElement('a');
        a.className = 'citation-chip';
        a.href = c.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `🔗 ${c.title || c.url}`;
        a.title = c.url;
        citeRow.appendChild(a);
      });
      if (citeRow.children.length) wrap.appendChild(citeRow);
    }

    const foot = document.createElement('div');
    foot.className = 'writing-turn-foot';
    if (turn.role === 'assistant') {
      const modelTag = document.createElement('span');
      modelTag.textContent = `${turn.model || 'Venice'} · ${formatTime(turn.created_at)}`;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'link-btn';
      copyBtn.textContent = '📋 复制';
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard?.writeText(stripBoldMarkers(turn.content || '')).catch(() => {});
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => (copyBtn.textContent = '📋 复制'), 1400);
      });

      const drawBtn = document.createElement('button');
      drawBtn.type = 'button';
      drawBtn.className = 'link-btn';
      drawBtn.textContent = '🎨 去画图';
      drawBtn.addEventListener('click', () => {
        state.mode = 'text-to-image';
        $('promptInput').value = stripBoldMarkers(turn.content || '').slice(0, 4800);
        renderModeUI();
        updateCharCount();
        setWorkspace('studio');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      const videoBtn = document.createElement('button');
      videoBtn.type = 'button';
      videoBtn.className = 'link-btn';
      videoBtn.textContent = '🎬 去生视频';
      videoBtn.addEventListener('click', () => {
        $('videoPromptInput').value = stripBoldMarkers(turn.content || '').slice(0, 4800);
        $('videoCharCount').textContent = `${$('videoPromptInput').value.length} / 5000`;
        renderVideoModeUI();
        setWorkspace('video');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      foot.append(modelTag, copyBtn, drawBtn, videoBtn);
    } else {
      foot.textContent = formatTime(turn.created_at);
    }
    wrap.appendChild(foot);
    return wrap;
  }

  function renderWritingMessages() {
    const box = $('writingMessages');
    const sess = state.writingSessions.find((s) => s.id === state.activeWritingId) || null;
    $('writingTitle').textContent = sess ? sess.title || '自由写作对话' : '自由写作（支持看图创作）';

    box.innerHTML = '';
    const msgs = sess?.messages || [];
    if (!msgs.length) {
      box.innerHTML = `
        <div class="empty-state">
          <div class="empty-orb">✍️</div>
          <p>发送剧情、人物设定、历史题材，或点「🖼️ 配图」发参考图让 AI 看着写</p>
          <span>写完后可点回复下方的「🎨 去画图」或「🎬 去生视频」一键联动生成</span>
        </div>`;
      return;
    }

    msgs.forEach((turn) => box.appendChild(createWritingTurnElement(turn)));
    box.scrollTop = box.scrollHeight;
  }

  async function sendWritingChat() {
    showWritingError('');
    if (state.isWritingSending) return;

    const text = $('writingInput').value.trim();
    if (!text && !state.writingAttachments.length) {
      showWritingError('请输入写作要求，或先点击「🖼️ 配图」附带参考图。');
      return;
    }

    state.isWritingSending = true;
    $('writingSendBtn').disabled = true;
    $('writingSpinner').classList.remove('hidden');
    $('writingSendLabel').textContent = '缓冲中...';

    const fd = new FormData();
    if (state.activeWritingId) fd.append('session_id', state.activeWritingId);
    fd.append('message', text);
    fd.append('model', $('writingModelSelect').value);
    fd.append('persona', $('writingPersonaSelect').value);
    fd.append('custom_system', $('writingCustomSystem').value.trim());
    if ($('writingWebSearchSelect')) {
      fd.append('web_search', $('writingWebSearchSelect').value);
    }
    appendRefsToFormData(fd, state.writingAttachments);

    // Clear composer immediately and show optimistic user turn + spinning loading buffer
    const pendingPreviewAtts = state.writingAttachments.map((a) => ({
      url: a.previewUrl,
      filename: a.filename || '参考图',
      revokeOnFinish: a.kind === 'upload',
    }));
    const hadImages = pendingPreviewAtts.length > 0;
    state.writingAttachments = [];
    $('writingInput').value = '';
    renderWritingAttachPreview();

    const msgBox = $('writingMessages');
    const emptyEl = msgBox.querySelector('.empty-state');
    if (emptyEl) msgBox.innerHTML = '';

    const optimisticUserEl = createWritingTurnElement({
      role: 'user',
      content: text || '请结合参考图细节进行创作。',
      attachments: pendingPreviewAtts,
      created_at: new Date().toISOString(),
    });
    msgBox.appendChild(optimisticUserEl);

    const pendingWrap = document.createElement('div');
    pendingWrap.className = 'writing-turn assistant pending';
    const pendingBubble = document.createElement('div');
    pendingBubble.className = 'writing-bubble';

    const loadingRow = document.createElement('div');
    loadingRow.className = 'writing-loading-row';
    const ring = document.createElement('span');
    ring.className = 'writing-ring-spinner';
    const loadingText = document.createElement('span');
    loadingText.textContent = hadImages ? '正在看图构思中...' : '正在缓冲构思中...';
    const elapsedEl = document.createElement('span');
    elapsedEl.className = 'writing-elapsed';
    elapsedEl.textContent = '0s';
    loadingRow.append(ring, loadingText, elapsedEl);

    const streamTextEl = document.createElement('div');
    streamTextEl.className = 'hidden';

    const streamFooter = document.createElement('div');
    streamFooter.className = 'writing-stream-footer hidden';
    streamFooter.innerHTML = '<span class="writing-ring-spinner small"></span><span>正在流式输出...</span>';

    pendingBubble.append(loadingRow, streamTextEl, streamFooter);
    pendingWrap.appendChild(pendingBubble);
    msgBox.appendChild(pendingWrap);
    msgBox.scrollTop = msgBox.scrollHeight;

    const startTs = Date.now();
    const tickTimer = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startTs) / 1000);
      elapsedEl.textContent = `${secs}s`;
    }, 500);

    let accText = '';
    let finishedSession = null;

    try {
      await consumeSse('/api/writing/chat/stream', { method: 'POST', body: fd }, {
        onEvent(evt) {
          if (evt.type === 'delta') {
            if (!accText) {
              loadingRow.classList.add('hidden');
              streamTextEl.classList.remove('hidden');
              streamFooter.classList.remove('hidden');
              $('writingSendLabel').textContent = '输出中...';
            }
            accText = stripBoldMarkers(accText + evt.delta);
            streamTextEl.textContent = accText;
            msgBox.scrollTop = msgBox.scrollHeight;
          } else if (evt.type === 'done') {
            finishedSession = evt.session;
          }
        },
      });

      if (finishedSession) {
        state.writingSessions = [
          finishedSession,
          ...state.writingSessions.filter((s) => s.id !== finishedSession.id),
        ];
        state.activeWritingId = finishedSession.id;
        renderWritingSessions();
        renderWritingMessages();
      }
      if (state.config?.settings?.llm_provider === 'venice') {
        refreshVeniceBalance();
      }
    } catch (err) {
      optimisticUserEl.remove();
      pendingWrap.remove();
      if (!msgBox.children.length) {
        renderWritingMessages();
      }
      if (!$('writingInput').value && text) {
        $('writingInput').value = text;
      }
      showWritingError(err.message);
    } finally {
      window.clearInterval(tickTimer);
      pendingPreviewAtts.forEach((a) => {
        if (a.revokeOnFinish) URL.revokeObjectURL(a.url);
      });
      state.isWritingSending = false;
      $('writingSendBtn').disabled = false;
      $('writingSpinner').classList.add('hidden');
      $('writingSendLabel').textContent = '发送';
    }
  }

  async function saveSettings(clearKey = false) {
    const fb = $('settingsFeedback');
    fb.className = 'feedback-msg hidden';

    let selectedModel = '';
    const payload = {
      base_url: $('baseUrlInput').value.trim(),
      clear_key: clearKey,
      llm_provider: state.llmProvider,
    };

    if (state.llmProvider === 'venice') {
      selectedModel = $('llmVeniceModelSelect').value;
      payload.llm_base_url = 'https://api.venice.ai/api/v1';
      payload.llm_api_key = $('llmVeniceKeyInput').value.trim();
    } else if (state.llmProvider === 'spicyapi') {
      selectedModel = $('llmSpicyModelSelect').value;
    } else {
      selectedModel = $('llmModelInput').value.trim();
      payload.llm_base_url = $('llmBaseUrlInput').value.trim();
      payload.llm_api_key = $('llmApiKeyInput').value.trim();
    }
    payload.llm_model = selectedModel;

    if (!clearKey) {
      payload.api_key = $('apiKeyInput').value.trim();
    }

    try {
      const data = await apiJson('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      state.config.settings = data.settings;
      $('apiKeyInput').value = '';
      $('llmVeniceKeyInput').value = '';
      $('llmApiKeyInput').value = '';
      updateSettingsDisplay();
      renderWritingControls();
      updateWritingWarnBadge();

      if (clearKey) {
        fb.textContent = '已清除本地保存的 SpicyAPI Key。';
        fb.className = 'feedback-msg ok';
      } else {
        const msgs = [];
        let hasErr = false;
        if (data.connection_ok) {
          msgs.push(`SpicyAPI 已连接（$${data.balance?.available ?? '--'} 可用）`);
        } else if (data.settings.has_api_key) {
          hasErr = true;
          msgs.push(`SpicyAPI 连接失败：${data.connection_error || '请检查 Key'}`);
        }
        if (data.settings.llm_provider === 'venice') {
          if (data.llm_connection_ok) {
            const vUsd = formatVeniceUsd(data.llm_balance) || '已连接';
            msgs.push(`Venice 已连接（${vUsd} · ${data.settings.llm_model}）`);
          } else if (data.settings.has_llm_api_key) {
            hasErr = true;
            msgs.push(`Venice 连接失败：${data.llm_connection_error || '请检查 Key'}`);
          } else {
            msgs.push('Venice 模型已选中，填入 Venice Key 并保存后即可看图写作');
          }
        } else {
          msgs.push(`文字模型已保存：${data.settings.llm_model}`);
        }
        fb.textContent = msgs.join('；');
        fb.className = `feedback-msg ${hasErr ? 'err' : 'ok'}`;
      }
      refreshBalance();
      refreshVeniceBalance();
    } catch (err) {
      fb.textContent = err.message;
      fb.className = 'feedback-msg err';
    }
  }

  function updateSettingsDisplay() {
    const settings = state.config?.settings || {};
    $('setupBanner').classList.toggle('hidden', Boolean(settings.has_api_key));
    $('currentKeyMask').textContent = settings.has_api_key
      ? `当前已保存密钥：${settings.masked_api_key}（留空保存可保持不变）`
      : '当前状态：未配置';
    if (settings.base_url) {
      $('baseUrlInput').value = settings.base_url;
    }

    const provider = settings.llm_provider || 'venice';
    setLlmProviderTab(provider);
    if (settings.llm_model) {
      if (provider === 'venice') {
        $('llmVeniceModelSelect').value = settings.llm_model;
      } else if (provider === 'spicyapi') {
        $('llmSpicyModelSelect').value = settings.llm_model;
      } else {
        $('llmModelInput').value = settings.llm_model;
      }
    }
    if (settings.llm_base_url && provider === 'custom') {
      $('llmBaseUrlInput').value = settings.llm_base_url;
    }

    const keyMaskText = settings.has_llm_api_key
      ? `当前已保存文字 Key：${settings.masked_llm_api_key}（留空保存可保持不变）`
      : '当前文字 Key：未配置';
    $('currentVeniceKeyMask').textContent =
      provider === 'venice' && settings.has_llm_api_key
        ? `当前已保存 Venice Key：${settings.masked_llm_api_key}（留空保存可保持不变）`
        : '当前 Venice Key：未配置';
    $('currentLlmKeyMask').textContent = `${keyMaskText}（本地 Ollama 可留空）`;
    updateWritingWarnBadge();
  }

  // =========================================================
  // Personal Asset Library (素材库)
  // =========================================================
  function showLibraryError(msg) {
    const el = $('libraryError');
    if (!el) return;
    if (!msg) {
      el.classList.add('hidden');
      el.textContent = '';
    } else {
      el.textContent = msg;
      el.classList.remove('hidden');
    }
  }

  function isOutputInLibrary(filename) {
    if (!filename) return false;
    return state.libraryAssets.some((a) => a.source_filename === filename);
  }

  function updateLibraryCountBadges() {
    const total = state.libraryAssets.length;
    const navBadge = $('navLibraryCount');
    if (navBadge) {
      navBadge.textContent = String(total);
      navBadge.classList.toggle('hidden', total === 0);
    }
    const studioBtnCount = $('studioLibBtnCount');
    if (studioBtnCount) studioBtnCount.textContent = String(total);
    const totalBadge = $('libraryTotalCount');
    if (totalBadge) totalBadge.textContent = String(total);
  }

  function filterLibraryItems(filter, searchQuery) {
    const q = String(searchQuery || '').trim().toLowerCase();
    return state.libraryAssets.filter((item) => {
      if (filter === 'generated' && item.source !== 'generated') return false;
      if (filter === 'upload' && item.source !== 'upload') return false;
      if (['character', 'scene', 'style', 'other'].includes(filter) && item.category !== filter) return false;
      if (q) {
        const hay = `${item.name || ''} ${LIB_CATEGORY_LABELS[item.category] || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function getLibraryAssetUrl(asset) {
    return asset?.url || (asset?.filename ? `/library/${encodeURIComponent(asset.filename)}` : '');
  }

  function addLibraryAssetsToStudio(assets, { targetMode = null, switchWorkspace = false } = {}) {
    const list = (Array.isArray(assets) ? assets : [assets]).filter(Boolean);
    if (!list.length) return;
    if (targetMode) {
      state.mode = targetMode;
    } else if (state.mode === 'text-to-image') {
      state.mode = 'edit';
    }
    const limit = state.mode === 'layer-decomposition' ? 1 : 10;
    if (limit === 1) {
      state.refs.forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
      state.refs = [];
    }
    let added = 0;
    for (const asset of list) {
      if (state.refs.length >= limit) {
        if (limit === 1) break;
        const dropped = state.refs.shift();
        if (dropped?.kind === 'upload') URL.revokeObjectURL(dropped.previewUrl);
      }
      const item = {
        kind: 'library',
        libraryId: asset.id,
        filename: asset.filename,
        previewUrl: getLibraryAssetUrl(asset),
        width: Number(asset.width) || null,
        height: Number(asset.height) || null,
      };
      state.refs.push(item);
      measureRefDimensions(item);
      added += 1;
    }
    renderModeUI();
    if (switchWorkspace) {
      setWorkspace('studio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (added === 1) {
      showToast(`已将「${list[0].name || '素材'}」加入 Image ${state.refs.length}`);
    } else if (added > 1) {
      showToast(`已按顺序加入 ${added} 张素材到参考图`);
    }
  }

  function addLibraryAssetsToVideo(assets, { switchWorkspace = false } = {}) {
    const list = (Array.isArray(assets) ? assets : [assets]).filter(Boolean);
    if (!list.length) return;
    const spec = getActiveVideoSpec();
    if (state.videoMode === 'text-to-video') {
      if (list.length > 2 && spec?.modes?.includes('reference-to-video')) {
        state.videoMode = 'reference-to-video';
      } else {
        state.videoMode = 'image-to-video';
      }
    }
    const limit = state.videoMode === 'image-to-video' ? (spec?.supports_last_frame ? 2 : 1) : 10;
    if (limit === 1) {
      state.videoRefs.forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
      state.videoRefs = [];
    }
    let added = 0;
    for (const asset of list) {
      if (state.videoRefs.length >= limit) {
        if (limit === 1) break;
        const dropped = state.videoRefs.shift();
        if (dropped?.kind === 'upload') URL.revokeObjectURL(dropped.previewUrl);
      }
      state.videoRefs.push({
        kind: 'library',
        libraryId: asset.id,
        filename: asset.filename,
        previewUrl: getLibraryAssetUrl(asset),
      });
      added += 1;
    }
    renderVideoModeUI();
    if (switchWorkspace) {
      setWorkspace('video');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    showToast(`已加入 ${added} 张素材到视频参考图`);
  }

  function addLibraryAssetsToWriting(assets, { switchWorkspace = false } = {}) {
    const list = (Array.isArray(assets) ? assets : [assets]).filter(Boolean);
    if (!list.length) return;
    let added = 0;
    for (const asset of list) {
      if (state.writingAttachments.length >= 4) {
        const dropped = state.writingAttachments.shift();
        if (dropped?.kind === 'upload') URL.revokeObjectURL(dropped.previewUrl);
      }
      state.writingAttachments.push({
        kind: 'library',
        libraryId: asset.id,
        filename: asset.filename,
        previewUrl: getLibraryAssetUrl(asset),
      });
      added += 1;
    }
    renderWritingAttachPreview();
    if (switchWorkspace) {
      setWorkspace('writing');
      $('writingInput')?.focus();
    }
    showToast(`已加入 ${added} 张素材到写作配图`);
  }

  function renderQuickLibraryStrip() {
    const strip = $('studioQuickLibraryStrip');
    if (!strip) return;
    updateLibraryCountBadges();
    const items = state.libraryAssets.slice(0, 12);
    if (!items.length) {
      strip.innerHTML = '';
      strip.classList.add('hidden');
      return;
    }
    strip.classList.remove('hidden');
    strip.innerHTML = '';
    const activeFiles = new Set(state.refs.filter((r) => r.kind === 'library').map((r) => r.filename));
    items.forEach((asset) => {
      const inUse = activeFiles.has(asset.filename);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `quick-lib-thumb${inUse ? ' in-use' : ''}`;
      btn.title = `点击加入参考图：${asset.name || '素材'}${asset.width && asset.height ? ` (${asset.width}×${asset.height})` : ''}`;

      const img = document.createElement('img');
      img.src = getLibraryAssetUrl(asset);
      img.alt = asset.name || '素材';
      img.loading = 'lazy';

      const plus = document.createElement('span');
      plus.className = 'quick-lib-plus';
      plus.textContent = inUse ? '✓' : '+';

      btn.append(img, plus);
      btn.addEventListener('click', () => {
        addLibraryAssetsToStudio([asset]);
      });
      strip.appendChild(btn);
    });
  }

  async function uploadFilesToLibrary(fileList, categoryOverride = null) {
    const files = Array.from(fileList || []).filter(isImageFile);
    if (!files.length) return [];
    if (state.isLibraryUploading) return [];

    showLibraryError('');
    state.isLibraryUploading = true;
    const uploadBtn = $('libraryUploadBtn');
    const prevLabel = uploadBtn ? uploadBtn.textContent : '';
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = '上传中...';
    }

    try {
      const fd = new FormData();
      const cat = categoryOverride || $('libraryUploadCategory')?.value || 'character';
      fd.append('category', cat);
      files.slice(0, 30).forEach((f) => fd.append('images', f));

      const data = await apiJson('/api/library/upload', {
        method: 'POST',
        body: fd,
      });
      const created = data.items || [];
      if (created.length) {
        const createdIds = new Set(created.map((x) => x.id));
        state.libraryAssets = [...created, ...state.libraryAssets.filter((x) => !createdIds.has(x.id))];
        renderLibraryWorkspace();
        renderQuickLibraryStrip();
        renderStage();
        renderHistory();
        showToast(`✓ 已上传 ${created.length} 张素材到素材库`);
      }
      return created;
    } catch (err) {
      showLibraryError(err.message);
      showToast(`上传失败：${err.message}`, 3200);
      return [];
    } finally {
      state.isLibraryUploading = false;
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = prevLabel || '＋ 上传素材图片';
      }
    }
  }

  async function saveOutputToLibrary(filename, jobId = null, defaultName = '') {
    if (!filename) return null;
    try {
      const data = await apiJson('/api/library/from-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          job_id: jobId,
          name: String(defaultName || '').trim().slice(0, 36),
          category: 'character',
        }),
      });
      const item = data.item;
      if (item) {
        state.libraryAssets = [item, ...state.libraryAssets.filter((x) => x.id !== item.id)];
        renderLibraryWorkspace();
        renderQuickLibraryStrip();
        renderStage();
        renderHistory();
      }
      showToast(data.already_exists ? '✓ 该图已在素材库中' : '⭐ 已加入素材库，可随时生图调用');
      return item;
    } catch (err) {
      showToast(`加入素材库失败：${err.message}`, 3200);
      return null;
    }
  }

  async function updateLibraryAssetMeta(assetId, patch) {
    try {
      const data = await apiJson(`/api/library/${encodeURIComponent(assetId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (data.item) {
        const idx = state.libraryAssets.findIndex((x) => x.id === assetId);
        if (idx !== -1) state.libraryAssets[idx] = data.item;
        renderLibraryWorkspace();
        renderQuickLibraryStrip();
        if (!$('libraryPickerModal')?.classList.contains('hidden')) {
          renderLibraryPicker();
        }
      }
    } catch (err) {
      showLibraryError(err.message);
    }
  }

  async function deleteLibraryAsset(assetId) {
    try {
      await apiJson(`/api/library/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
      state.libraryAssets = state.libraryAssets.filter((x) => x.id !== assetId);
      state.pickerSelectedIds = state.pickerSelectedIds.filter((id) => id !== assetId);
      renderLibraryWorkspace();
      renderQuickLibraryStrip();
      renderStage();
      renderHistory();
      if (!$('libraryPickerModal')?.classList.contains('hidden')) {
        renderLibraryPicker();
      }
      showToast('已从素材库移除');
    } catch (err) {
      showLibraryError(err.message);
    }
  }

  function renderLibraryWorkspace() {
    updateLibraryCountBadges();
    const grid = $('libraryGrid');
    if (!grid) return;

    document.querySelectorAll('#libraryFilterBar [data-lib-filter]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.libFilter === state.libraryFilter);
    });

    const items = filterLibraryItems(state.libraryFilter, state.librarySearch);
    grid.innerHTML = '';
    if (!items.length) {
      const emptyMsg = state.libraryAssets.length
        ? '当前筛选条件下没有匹配的素材'
        : '素材库还是空的：拖入图片上传，或在生图画布点击「⭐ 加入素材库」收藏作品';
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:34px 12px;"><div class="empty-orb">🗂️</div><p>${escapeHtml(emptyMsg)}</p></div>`;
      return;
    }

    items.forEach((asset) => {
      const card = document.createElement('div');
      card.className = 'library-card';

      const thumb = document.createElement('div');
      thumb.className = 'library-thumb';
      const img = document.createElement('img');
      const assetUrl = getLibraryAssetUrl(asset);
      img.src = assetUrl;
      img.alt = asset.name || '素材';
      img.loading = 'lazy';
      thumb.addEventListener('click', () => openLightbox(assetUrl));

      const srcBadge = document.createElement('span');
      srcBadge.className = `library-source-badge${asset.source === 'generated' ? ' generated' : ''}`;
      srcBadge.textContent = asset.source === 'generated' ? '⭐ 生成' : '📤 上传';

      thumb.append(img, srcBadge);
      if (asset.width && asset.height) {
        const dimBadge = document.createElement('span');
        dimBadge.className = 'library-dim-badge';
        dimBadge.textContent = `${asset.width}×${asset.height}`;
        thumb.appendChild(dimBadge);
      }

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'history-del';
      delBtn.textContent = '✕';
      delBtn.title = '从素材库删除';
      delBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        deleteLibraryAsset(asset.id);
      });

      const body = document.createElement('div');
      body.className = 'library-card-body';

      const nameRow = document.createElement('div');
      nameRow.className = 'library-name-row';
      const nameEl = document.createElement('span');
      nameEl.className = 'library-name';
      nameEl.textContent = asset.name || '未命名素材';
      nameEl.title = asset.name || '未命名素材';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'library-edit-btn';
      editBtn.textContent = '✎';
      editBtn.title = '重命名素材';
      editBtn.addEventListener('click', () => {
        const nextName = window.prompt('输入新的素材名称：', asset.name || '');
        if (nextName !== null && nextName.trim() && nextName.trim() !== asset.name) {
          updateLibraryAssetMeta(asset.id, { name: nextName.trim() });
        }
      });
      nameRow.append(nameEl, editBtn);

      const metaRow = document.createElement('div');
      metaRow.className = 'library-meta-row';
      const catSel = document.createElement('select');
      catSel.className = 'library-cat-select';
      catSel.title = '切换分类';
      Object.entries(LIB_CATEGORY_LABELS).forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if ((asset.category || 'other') === val) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.addEventListener('change', () => {
        updateLibraryAssetMeta(asset.id, { category: catSel.value });
      });

      const timeSpan = document.createElement('span');
      timeSpan.textContent = formatTime(asset.created_at);
      metaRow.append(catSel, timeSpan);

      const actions = document.createElement('div');
      actions.className = 'library-card-actions';

      const useImgBtn = document.createElement('button');
      useImgBtn.type = 'button';
      useImgBtn.className = 'library-use-btn';
      useImgBtn.textContent = '🎨 用来生图';
      useImgBtn.title = '加入生图参考图并切到多图编辑';
      useImgBtn.addEventListener('click', () => {
        addLibraryAssetsToStudio([asset], { targetMode: 'edit', switchWorkspace: true });
      });

      const useVidBtn = document.createElement('button');
      useVidBtn.type = 'button';
      useVidBtn.className = 'library-mini-action';
      useVidBtn.textContent = '🎬';
      useVidBtn.title = '送去视频生成作为首帧/参考图';
      useVidBtn.addEventListener('click', () => {
        addLibraryAssetsToVideo([asset], { switchWorkspace: true });
      });

      const useWrtBtn = document.createElement('button');
      useWrtBtn.type = 'button';
      useWrtBtn.className = 'library-mini-action';
      useWrtBtn.textContent = '✍️';
      useWrtBtn.title = '作为配图发去自由写作';
      useWrtBtn.addEventListener('click', () => {
        addLibraryAssetsToWriting([asset], { switchWorkspace: true });
      });

      actions.append(useImgBtn, useVidBtn, useWrtBtn);
      body.append(nameRow, metaRow, actions);
      card.append(thumb, delBtn, body);
      grid.appendChild(card);
    });
  }

  function getPickerMaxCount() {
    if (state.pickerTarget === 'studio') {
      return state.mode === 'layer-decomposition' ? 1 : 10;
    }
    if (state.pickerTarget === 'studio-t2i') return 10;
    if (state.pickerTarget === 'video') {
      const spec = getActiveVideoSpec();
      return state.videoMode === 'image-to-video' ? (spec?.supports_last_frame ? 2 : 1) : 10;
    }
    if (state.pickerTarget === 'writing') return 4;
    return 10;
  }

  function openLibraryPicker(target = 'studio') {
    state.pickerTarget = target;
    state.pickerFilter = 'all';
    state.pickerSearch = '';
    state.pickerSelectedIds = [];
    if ($('libraryPickerSearch')) $('libraryPickerSearch').value = '';

    const titleMap = {
      studio: state.mode === 'layer-decomposition' ? '🗂️ 从素材库选取 1 张待拆解图片' : '🗂️ 从素材库选取生图参考图',
      'studio-t2i': '🗂️ 从素材库选图开始多图编辑',
      video: '🗂️ 从素材库选取视频首帧 / 参考图',
      writing: '🗂️ 从素材库选取写作配图（最多 4 张）',
    };
    const hintMap = {
      studio:
        state.mode === 'layer-decomposition'
          ? '图层拆解模式：点击选取 1 张图片'
          : '按点击顺序自动编号为 Image 1, Image 2...（支持多选，最多 10 张）',
      'studio-t2i': '选中后自动切到「多图编辑」模式，按点击顺序编号为 Image 1, Image 2...',
      video: '按点击顺序加入视频参考图（图生视频第 1 张为首帧，第 2 张为尾帧）',
      writing: '选择 1–4 张图片附带给无审查识图模型一起创作',
    };
    if ($('libraryPickerTitle')) $('libraryPickerTitle').textContent = titleMap[target] || '🗂️ 从素材库选取参考图';
    if ($('libraryPickerHint')) $('libraryPickerHint').textContent = hintMap[target] || '';

    renderLibraryPicker();
    openModal('libraryPickerModal');
  }

  function renderLibraryPicker() {
    const grid = $('libraryPickerGrid');
    if (!grid) return;

    document.querySelectorAll('#libraryPickerFilterBar [data-picker-filter]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.pickerFilter === state.pickerFilter);
    });

    const maxCount = getPickerMaxCount();
    const items = filterLibraryItems(state.pickerFilter, state.pickerSearch);
    grid.innerHTML = '';

    if (!items.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:24px 10px;">
          <div class="empty-orb">🗂️</div>
          <p>${state.libraryAssets.length ? '没有匹配的素材' : '素材库暂无图片，点击右上角「＋ 上传新图」马上添加'}</p>
        </div>`;
    } else {
      const existingOffset = state.pickerTarget === 'studio' && state.mode === 'edit' ? state.refs.length : 0;
      items.forEach((asset) => {
        const selIdx = state.pickerSelectedIds.indexOf(asset.id);
        const card = document.createElement('div');
        card.className = `picker-item${selIdx !== -1 ? ' selected' : ''}`;

        const thumb = document.createElement('div');
        thumb.className = 'picker-item-thumb';
        const img = document.createElement('img');
        img.src = getLibraryAssetUrl(asset);
        img.alt = asset.name || '素材';
        img.loading = 'lazy';
        thumb.appendChild(img);

        if (selIdx !== -1) {
          const badge = document.createElement('span');
          badge.className = 'picker-order-badge';
          if (state.pickerTarget === 'studio' || state.pickerTarget === 'studio-t2i') {
            badge.textContent = maxCount === 1 ? '已选' : `Image ${existingOffset + selIdx + 1}`;
          } else {
            badge.textContent = `#${selIdx + 1}`;
          }
          thumb.appendChild(badge);
        }

        const meta = document.createElement('div');
        meta.className = 'picker-item-meta';
        const nameEl = document.createElement('div');
        nameEl.className = 'picker-item-name';
        nameEl.textContent = asset.name || '未命名素材';
        const subEl = document.createElement('div');
        subEl.className = 'picker-item-sub';
        subEl.textContent = asset.width && asset.height ? `${asset.width}×${asset.height}` : LIB_CATEGORY_LABELS[asset.category] || '素材';
        meta.append(nameEl, subEl);

        card.append(thumb, meta);
        card.addEventListener('click', () => {
          const curIdx = state.pickerSelectedIds.indexOf(asset.id);
          if (curIdx !== -1) {
            state.pickerSelectedIds.splice(curIdx, 1);
          } else if (maxCount === 1) {
            state.pickerSelectedIds = [asset.id];
          } else if (state.pickerSelectedIds.length >= maxCount) {
            showToast(`最多只能同时选 ${maxCount} 张`);
            return;
          } else {
            state.pickerSelectedIds.push(asset.id);
          }
          renderLibraryPicker();
        });
        grid.appendChild(card);
      });
    }

    const cnt = state.pickerSelectedIds.length;
    const summaryEl = $('libraryPickerSummary');
    if (summaryEl) {
      summaryEl.textContent = cnt ? `已选择 ${cnt} 张素材` : '点击图片选择（支持多选）';
    }
    const clearBtn = $('libraryPickerClearBtn');
    if (clearBtn) clearBtn.classList.toggle('hidden', cnt === 0);
    const confirmBtn = $('libraryPickerConfirmBtn');
    if (confirmBtn) {
      confirmBtn.disabled = cnt === 0;
      confirmBtn.textContent = cnt ? `确认调用 (${cnt})` : '确认调用';
    }
  }

  function confirmLibraryPicker() {
    const assetMap = new Map(state.libraryAssets.map((a) => [a.id, a]));
    const selected = state.pickerSelectedIds.map((id) => assetMap.get(id)).filter(Boolean);
    if (!selected.length) return;
    closeModal('libraryPickerModal');
    if (state.pickerTarget === 'studio') {
      addLibraryAssetsToStudio(selected);
    } else if (state.pickerTarget === 'studio-t2i') {
      addLibraryAssetsToStudio(selected, { targetMode: 'edit', switchWorkspace: true });
    } else if (state.pickerTarget === 'video') {
      addLibraryAssetsToVideo(selected);
    } else if (state.pickerTarget === 'writing') {
      addLibraryAssetsToWriting(selected);
    }
    state.pickerSelectedIds = [];
  }

  async function boot() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    }

    // Bind mode tabs
    document.querySelectorAll('.segmented-control[aria-label="生成模式"] .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        renderModeUI();
      });
    });

    // Bind dropzone & file input
    const dropZone = $('dropZone');
    const fileInput = $('fileInput');
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      addUploadFiles(e.target.files);
      fileInput.value = '';
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      addUploadFiles(e.dataTransfer?.files);
    });

    $('promptInput').addEventListener('input', () => {
      updateCharCount();
      syncEditSizeLock();
    });
    $('exactPixelMatchCheck')?.addEventListener('change', (e) => {
      state.exactPixelMatch = e.target.checked;
      syncEditSizeLock();
    });
    $('numOutputsRange').addEventListener('input', (e) => {
      state.numOutputs = Number(e.target.value);
      $('numOutputsVal').textContent = String(state.numOutputs);
      updateQuotePreview();
    });

    $('refreshQuoteBtn').addEventListener('click', requestLiveQuote);
    $('enhancePromptBtn').addEventListener('click', enhancePrompt);
    $('undoEnhanceBtn').addEventListener('click', undoEnhance);
    $('generateBtn').addEventListener('click', submitGeneration);

    // Studio template drawer bindings
    $('studioTemplateSelect')?.addEventListener('change', (e) => {
      syncTemplateDrawer('studio');
      const selectedTplId = e.target.value;
      const editPresets = MODE_META.edit?.presets || [];
      const matched = editPresets.find((p) => p.templateId === selectedTplId && selectedTplId !== 'seedream-edit');
      if (matched) {
        if (state.mode !== 'edit') {
          state.mode = 'edit';
          renderModeUI();
          if ($('studioTemplateSelect')) {
            $('studioTemplateSelect').value = selectedTplId;
            syncTemplateDrawer('studio');
          }
        }
        const curText = $('promptInput').value.trim();
        const isKnownPreset = !curText || Object.values(MODE_META).some((m) => (m.presets || []).some((p) => p.text === curText));
        if (isKnownPreset) {
          $('promptInput').value = matched.text;
          updateCharCount();
          syncEditSizeLock();
          updateQuotePreview();
        }
      }
    });
    $('studioTemplateEditor')?.addEventListener('input', (e) => {
      const tplId = e.target.dataset.tplId;
      if (!tplId) return;
      state.customTemplates[tplId] = e.target.value;
      writeCustomTemplates(state.customTemplates);
    });
    $('studioTemplateResetBtn')?.addEventListener('click', () => {
      const tplId = $('studioTemplateEditor')?.dataset?.tplId;
      if (tplId) {
        delete state.customTemplates[tplId];
        writeCustomTemplates(state.customTemplates);
        syncTemplateDrawer('studio');
      }
    });

    // Video Studio bindings
    document.querySelectorAll('[data-video-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.videoMode = btn.dataset.videoMode;
        renderVideoModeUI();
      });
    });
    $('videoModelSelect')?.addEventListener('change', (e) => {
      state.videoFamily = e.target.value;
      const spec = getActiveVideoSpec();
      if (spec) state.videoDuration = Number(spec.default_duration || 5);
      state.videoDurationAuto = false;
      renderVideoModeUI();
    });
    const vDrop = $('videoDropZone');
    const vFile = $('videoFileInput');
    vDrop?.addEventListener('click', () => vFile?.click());
    vFile?.addEventListener('change', (e) => {
      addVideoUploadFiles(e.target.files);
      vFile.value = '';
    });
    vDrop?.addEventListener('dragover', (e) => {
      e.preventDefault();
      vDrop.classList.add('dragover');
    });
    vDrop?.addEventListener('dragleave', () => vDrop.classList.remove('dragover'));
    vDrop?.addEventListener('drop', (e) => {
      e.preventDefault();
      vDrop.classList.remove('dragover');
      addVideoUploadFiles(e.dataTransfer?.files);
    });
    $('videoPromptInput')?.addEventListener('input', () => {
      $('videoCharCount').textContent = `${$('videoPromptInput').value.length} / 5000`;
    });
    $('videoTemplateSelect')?.addEventListener('change', () => syncTemplateDrawer('video'));
    $('videoTemplateEditor')?.addEventListener('input', (e) => {
      const tplId = e.target.dataset.tplId;
      if (!tplId) return;
      state.customTemplates[tplId] = e.target.value;
      writeCustomTemplates(state.customTemplates);
    });
    $('videoTemplateResetBtn')?.addEventListener('click', () => {
      const tplId = $('videoTemplateEditor')?.dataset?.tplId;
      if (tplId) {
        delete state.customTemplates[tplId];
        writeCustomTemplates(state.customTemplates);
        syncTemplateDrawer('video');
      }
    });
    $('videoEnhancePromptBtn')?.addEventListener('click', enhanceVideoPrompt);
    $('videoUndoEnhanceBtn')?.addEventListener('click', undoVideoEnhance);
    $('videoDurationRange')?.addEventListener('input', (e) => {
      state.videoDurationAuto = false;
      state.videoDuration = Number(e.target.value);
      renderVideoModeUI();
    });
    $('videoDurationAutoCheck')?.addEventListener('change', (e) => {
      state.videoDurationAuto = e.target.checked;
      renderVideoModeUI();
    });
    $('videoAudioCheck')?.addEventListener('change', (e) => { state.videoAudio = e.target.checked; });
    $('videoWatermarkCheck')?.addEventListener('change', (e) => { state.videoWatermark = e.target.checked; });
    $('videoThinkingCheck')?.addEventListener('change', (e) => { state.videoThinking = e.target.checked; });
    $('videoExpansionCheck')?.addEventListener('change', (e) => { state.videoExpansion = e.target.checked; });
    $('videoRefreshQuoteBtn')?.addEventListener('click', requestVideoQuote);
    $('videoGenerateBtn')?.addEventListener('click', submitVideoGeneration);

    $('videoStageSaveBtn')?.addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeVideoJobId);
      const asset = job?.assets?.[0];
      if (!asset?.url) return;
      const a = document.createElement('a');
      a.href = asset.url;
      a.download = asset.filename || 'video.mp4';
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    $('videoStageWriteBtn')?.addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeVideoJobId);
      if (!job) return;
      $('writingInput').value = `基于我刚才的视频提示词继续拓展剧情或下一镜分镜：\n${job.prompt || ''}`;
      setWorkspace('writing');
      $('writingInput').focus();
    });
    $('videoStageReuseBtn')?.addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeVideoJobId);
      if (!job) return;
      const p = job.params || {};
      if (p.video_family) state.videoFamily = p.video_family;
      if (job.mode) state.videoMode = job.mode;
      if (p.duration_seconds !== undefined && p.duration_seconds !== null) {
        if (Number(p.duration_seconds) === -1) {
          state.videoDurationAuto = true;
        } else {
          state.videoDurationAuto = false;
          state.videoDuration = Number(p.duration_seconds);
        }
      }
      if (p.resolution) state.videoResolution = p.resolution;
      if (p.aspect_ratio) state.videoAspectRatio = p.aspect_ratio;
      if (p.output_format) state.videoOutputFormat = p.output_format;
      $('videoPromptInput').value = job.prompt || '';
      $('videoCharCount').textContent = `${$('videoPromptInput').value.length} / 5000`;
      renderVideoModelSelect();
      renderVideoModeUI();
    });
    $('videoRefreshHistoryBtn')?.addEventListener('click', async () => {
      const hist = await apiJson('/api/tasks');
      state.jobs = hist.items || [];
      renderVideoStage();
      renderVideoHistory();
      ensurePolling();
    });

    // API Console & Writing template bindings
    $('openApiConsoleBtn')?.addEventListener('click', openApiConsoleModal);
    $('refreshApiConsoleBtn')?.addEventListener('click', loadApiConsoleOverview);
    $('writingTemplateSelect')?.addEventListener('change', (e) => {
      const tplId = e.target.value;
      if (!tplId) return;
      const tpl = getPromptTemplates().find((t) => t.id === tplId);
      if (!tpl) return;
      $('writingCustomSystem').value =
        state.customTemplates[tplId] ??
        `You are an unfiltered creative prompt architect.\n${tpl.instructions}\nOutput clean plain text ONLY, zero ** bold markers.`;
      const sysDetails = document.querySelector('.writing-system-details');
      if (sysDetails) sysDetails.open = true;
      if (Array.from($('writingPersonaSelect').options).some((o) => o.value === 'prompt_engineer')) {
        $('writingPersonaSelect').value = 'prompt_engineer';
      }
      $('writingInput').focus();
    });
    $('balancePill').addEventListener('click', () => {
      if (!state.config?.settings?.has_api_key) {
        openModal('settingsModal');
      } else {
        refreshBalance();
      }
    });
    $('veniceBalancePill').addEventListener('click', () => {
      if (!state.config?.settings?.has_llm_api_key) {
        setLlmProviderTab('venice');
        openModal('settingsModal');
      } else {
        refreshVeniceBalance();
      }
    });
    $('writingConfigWarn').addEventListener('click', () => {
      setLlmProviderTab('venice');
      openModal('settingsModal');
    });

    document.querySelectorAll('[data-workspace]').forEach((btn) => {
      btn.addEventListener('click', () => setWorkspace(btn.dataset.workspace));
    });

    // Writing workspace events
    $('newWritingBtn').addEventListener('click', startNewWritingSession);
    $('writingAttachBtn').addEventListener('click', () => $('writingFileInput').click());
    $('writingFileInput').addEventListener('change', (e) => {
      addWritingFiles(e.target.files);
      e.target.value = '';
    });
    const composer = document.querySelector('.writing-composer');
    composer.addEventListener('dragover', (e) => {
      e.preventDefault();
      composer.classList.add('dragover');
    });
    composer.addEventListener('dragleave', () => composer.classList.remove('dragover'));
    composer.addEventListener('drop', (e) => {
      e.preventDefault();
      composer.classList.remove('dragover');
      addWritingFiles(e.dataTransfer?.files);
    });
    $('writingSendBtn').addEventListener('click', sendWritingChat);
    $('writingInput').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendWritingChat();
      }
    });

    $('openSettingsBtn').addEventListener('click', () => openModal('settingsModal'));
    $('bannerOpenSettingsBtn').addEventListener('click', () => openModal('settingsModal'));
    $('openPhoneBtn').addEventListener('click', openPhoneModal);
    $('saveSettingsBtn').addEventListener('click', () => saveSettings(false));
    $('clearKeyBtn').addEventListener('click', () => saveSettings(true));

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    // Phone modal subtabs
    document.querySelectorAll('[data-phone-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.phoneTab;
        document.querySelectorAll('[data-phone-tab]').forEach((b) =>
          b.classList.toggle('active', b.dataset.phoneTab === target)
        );
        $('phoneTabCloud').classList.toggle('hidden', target !== 'cloud');
        $('phoneTabPwa').classList.toggle('hidden', target !== 'pwa');
        $('phoneTabShortcut').classList.toggle('hidden', target !== 'shortcut');
      });
    });

    $('copyCloudUrlBtn').addEventListener('click', async () => {
      const txt = $('cloudUrlText').textContent;
      await navigator.clipboard?.writeText(txt).catch(() => {});
      $('copyCloudUrlBtn').textContent = '已复制';
      setTimeout(() => ($('copyCloudUrlBtn').textContent = '复制'), 1500);
    });

    $('genCloudSyncQrBtn').addEventListener('click', async () => {
      const btn = $('genCloudSyncQrBtn');
      const base = window.DirectApi?.CLOUD_URL || 'https://hsijocey.github.io/seedream-studio/';
      btn.disabled = true;
      btn.textContent = '生成同步二维码中...';
      try {
        const res = await apiJson(`/api/cloud-sync-url?base=${encodeURIComponent(base)}`);
        await renderQrForUrl(res.url, 'cloudQrBox', 'cloudUrlText');
        btn.textContent = '✓ 已生成含密钥同步二维码（扫码即用）';
      } catch (err) {
        btn.textContent = `生成失败：${err.message}`;
      } finally {
        btn.disabled = false;
      }
    });

    // Settings modal LLM provider tabs
    document.querySelectorAll('[data-llm-provider]').forEach((btn) => {
      btn.addEventListener('click', () => setLlmProviderTab(btn.dataset.llmProvider));
    });

    $('copyLanUrlBtn').addEventListener('click', async () => {
      const txt = $('lanUrlText').textContent;
      await navigator.clipboard?.writeText(txt).catch(() => {});
      $('copyLanUrlBtn').textContent = '已复制';
      setTimeout(() => ($('copyLanUrlBtn').textContent = '复制'), 1500);
    });

    $('copyShortcutJsonBtn').addEventListener('click', async () => {
      const txt = $('shortcutJsonPre').textContent;
      await navigator.clipboard?.writeText(txt).catch(() => {});
      $('copyShortcutJsonBtn').textContent = '已复制';
      setTimeout(() => ($('copyShortcutJsonBtn').textContent = '复制 JSON'), 1500);
    });

    // Stage actions
    $('stageSaveBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (!asset) return;
      const a = document.createElement('a');
      a.href = asset.url;
      a.download = asset.filename || 'seedream.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    $('stageShareBtn').addEventListener('click', async () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (!asset) return;
      try {
        const resp = await fetch(asset.url);
        const blob = await resp.blob();
        const file = new File([blob], asset.filename || 'seedream.png', { type: blob.type || 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Seedream 5.5 生成图片' });
        } else {
          openLightbox(asset.url);
        }
      } catch {
        openLightbox(asset.url);
      }
    });

    $('stageAddLibraryBtn')?.addEventListener('click', async () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (!asset?.filename) return;
      await saveOutputToLibrary(asset.filename, job.id, job.prompt || '生成作品');
    });

    $('stageEditBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (asset?.filename) addLocalAssetRef(asset.filename, 'edit', asset);
    });

    // Asset Library workspace & picker bindings
    $('t2iOpenLibraryPickerBtn')?.addEventListener('click', () => openLibraryPicker('studio-t2i'));
    $('openLibraryPickerBtn')?.addEventListener('click', () => openLibraryPicker('studio'));
    $('openVideoLibraryPickerBtn')?.addEventListener('click', () => openLibraryPicker('video'));
    $('openWritingLibraryPickerBtn')?.addEventListener('click', () => openLibraryPicker('writing'));

    const libDropZone = $('libraryDropZone');
    const libFileInput = $('libraryFileInput');
    $('libraryUploadBtn')?.addEventListener('click', () => libFileInput?.click());
    libDropZone?.addEventListener('click', () => libFileInput?.click());
    libFileInput?.addEventListener('change', (e) => {
      uploadFilesToLibrary(e.target.files);
      libFileInput.value = '';
    });
    libDropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      libDropZone.classList.add('dragover');
    });
    libDropZone?.addEventListener('dragleave', () => libDropZone.classList.remove('dragover'));
    libDropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      libDropZone.classList.remove('dragover');
      uploadFilesToLibrary(e.dataTransfer?.files);
    });

    document.querySelectorAll('#libraryFilterBar [data-lib-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.libraryFilter = btn.dataset.libFilter || 'all';
        renderLibraryWorkspace();
      });
    });
    $('librarySearchInput')?.addEventListener('input', (e) => {
      state.librarySearch = e.target.value || '';
      renderLibraryWorkspace();
    });

    document.querySelectorAll('#libraryPickerFilterBar [data-picker-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.pickerFilter = btn.dataset.pickerFilter || 'all';
        renderLibraryPicker();
      });
    });
    $('libraryPickerSearch')?.addEventListener('input', (e) => {
      state.pickerSearch = e.target.value || '';
      renderLibraryPicker();
    });
    $('libraryPickerUploadBtn')?.addEventListener('click', () => $('libraryPickerFileInput')?.click());
    $('libraryPickerFileInput')?.addEventListener('change', async (e) => {
      const created = await uploadFilesToLibrary(e.target.files);
      e.target.value = '';
      if (created.length) {
        const maxCount = getPickerMaxCount();
        for (const item of created) {
          if (maxCount === 1) {
            state.pickerSelectedIds = [item.id];
            break;
          }
          if (state.pickerSelectedIds.length < maxCount && !state.pickerSelectedIds.includes(item.id)) {
            state.pickerSelectedIds.push(item.id);
          }
        }
        renderLibraryPicker();
      }
    });
    $('libraryPickerClearBtn')?.addEventListener('click', () => {
      state.pickerSelectedIds = [];
      renderLibraryPicker();
    });
    $('libraryPickerConfirmBtn')?.addEventListener('click', confirmLibraryPicker);

    $('stageVideoBtn')?.addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (asset?.filename) addVideoLocalAssetRef(asset.filename, 'image-to-video');
    });

    $('stageLayerBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (asset?.filename) addLocalAssetRef(asset.filename, 'layer-decomposition', asset);
    });

    $('stageWriteBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (asset?.filename) addWritingLocalAsset(asset.filename);
    });

    $('stageReuseBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      if (!job) return;
      $('promptInput').value = job.prompt || '';
      const p = job.params || {};
      if (p.aspect_ratio) state.aspectRatio = p.aspect_ratio;
      if (p.size_lock?.mode) state.sizeLockMode = p.size_lock.mode;
      if (p.size_lock?.exact_pixel_match !== undefined) {
        state.exactPixelMatch = Boolean(p.size_lock.exact_pixel_match);
      }
      if (p.resolution) {
        if (job.mode === 'layer-decomposition') state.layerResolution = p.resolution;
        else state.resolution = p.resolution;
      }
      if (p.output_format) state.outputFormat = p.output_format;
      if (p.background) state.background = p.background;
      updateCharCount();
      renderOptions();
      syncEditSizeLock();
    });

    $('refreshHistoryBtn').addEventListener('click', async () => {
      const hist = await apiJson('/api/tasks');
      state.jobs = hist.items || [];
      renderStage();
      renderHistory();
      ensurePolling();
    });

    // Detect whether running against local Python server or pure-browser Cloud Direct mode
    if (window.DirectApi?.isKnownStaticHost()) {
      state.cloudMode = true;
    } else {
      const isLocalhost = ['127.0.0.1', 'localhost', '::1'].includes(window.location.hostname);
      try {
        const probe = await fetch('./api/config');
        const ctype = (probe.headers.get('content-type') || '').toLowerCase();
        if (!probe.ok || !ctype.includes('application/json')) {
          if (!isLocalhost && window.DirectApi) state.cloudMode = true;
        }
      } catch {
        if (!isLocalhost && window.DirectApi) state.cloudMode = true;
      }
    }

    // Load initial config, generation history, writing sessions, and asset library
    try {
      const [cfgRes, histRes, writeRes, libRes] = await Promise.all([
        apiJson('/api/config'),
        apiJson('/api/tasks'),
        apiJson('/api/writing/sessions').catch(() => ({ items: [] })),
        apiJson('/api/library').catch(() => ({ items: [] })),
      ]);
      state.config = cfgRes;
      state.jobs = histRes.items || [];
      state.activeJobId = state.jobs.find((j) => !isVideoJob(j))?.id || null;
      state.activeVideoJobId = state.jobs.find(isVideoJob)?.id || null;
      state.writingSessions = writeRes.items || [];
      state.activeWritingId = state.writingSessions[0]?.id || null;
      state.libraryAssets = libRes.items || [];

      populateTemplateSelect($('studioTemplateSelect'), 'image', '模板：自动匹配');
      populateTemplateSelect($('videoTemplateSelect'), 'video', '模板：自动匹配');
      renderLlmSettingsOptions();
      renderWritingControls();
      renderVideoModelSelect();
      updateSettingsDisplay();
      renderModeUI();
      renderVideoModeUI();
      renderStage();
      renderHistory();
      renderVideoStage();
      renderVideoHistory();
      renderWritingSessions();
      renderWritingMessages();
      renderLibraryWorkspace();
      renderQuickLibraryStrip();
      ensurePolling();
      refreshBalance();
      refreshVeniceBalance();
    } catch (err) {
      $('balanceDot').className = 'dot warn';
      $('balanceText').textContent = '本地服务未运行';
      showFormError('未检测到本地后台服务，请双击目录中的 start_win.bat 启动后刷新本页。');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
