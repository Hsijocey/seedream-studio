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
      promptLabel: '编辑指令（可用 Image 1, Image 2 指代参考图）',
      placeholder: '例如：将 Image 1 中的人物换穿红色丝绸长裙，放在雨夜的东京街头，保持脸部五官不变。',
      presets: [
        { label: '换装换场景', text: 'Dress the person from Image 1 in a tailored charcoal wool coat on an autumn street at sunset, warm rim lighting. Keep their face unchanged.' },
        { label: '双图人物融合', text: 'The person from Image 1 and the person from Image 2 standing together on a candlelit rooftop at night, looking toward each other. Keep both faces unchanged.' },
        { label: '主体+商品合成', text: 'The person from Image 1 holding the product from Image 2 in soft natural daylight, keeping the logo and product details unchanged.' },
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

  const state = {
    mode: 'text-to-image',
    aspectRatio: '1:1',
    resolution: '2k',
    layerResolution: 'auto',
    outputFormat: 'png',
    background: 'auto',
    numOutputs: 10,
    refs: [], // { kind: 'upload'|'local', file?, filename?, previewUrl }
    jobs: [],
    activeJobId: null,
    pollTimer: null,
    pollStartedAt: {},
    config: null,
    isSubmitting: false,
    isEnhancing: false,
    previousPrompt: null,
    llmProvider: 'venice',
    workspace: 'studio',
    writingSessions: [],
    activeWritingId: null,
    writingAttachments: [],
    isWritingSending: false,
    cloudMode: false,
  };

  const $ = (id) => document.getElementById(id);

  function isImageFile(file) {
    return Boolean(file && (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic)$/i.test(file.name || '')));
  }

  function appendRefsToFormData(fd, refs) {
    const order = [];
    let uploadIdx = 0;
    refs.forEach((ref) => {
      if (ref.kind === 'local') {
        order.push(`local:${ref.filename}`);
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

  function renderModeUI() {
    document.querySelectorAll('.segmented-control[aria-label="生成模式"] .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });

    const meta = MODE_META[state.mode];
    $('promptLabel').textContent = meta.promptLabel;
    $('promptInput').placeholder = meta.placeholder;
    $('generateBtnLabel').textContent = meta.btn;

    const isRefMode = state.mode === 'edit' || state.mode === 'layer-decomposition';
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

    renderPresets();
    renderRefs();
    renderOptions();
    updateQuotePreview();
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
        updateCharCount();
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
      btn.className = `ratio-btn${state.aspectRatio === r ? ' active' : ''}`;
      btn.innerHTML = `<span class="ratio-box" style="width:${w}px;height:${h}px"></span><span>${escapeHtml(r)}</span>`;
      btn.addEventListener('click', () => {
        state.aspectRatio = r;
        renderOptions();
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
        updateQuotePreview();
      });

      card.append(img, badge, removeBtn);

      if (state.mode === 'edit') {
        const insertBtn = document.createElement('button');
        insertBtn.type = 'button';
        insertBtn.className = 'ref-insert';
        insertBtn.textContent = `+ 插入 Image ${idx + 1}`;
        insertBtn.addEventListener('click', () => insertTextAtCursor(`Image ${idx + 1}`));
        card.appendChild(insertBtn);
      }

      grid.appendChild(card);
    });
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
      state.refs.push({
        kind: 'upload',
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    renderRefs();
    updateQuotePreview();
  }

  function addLocalAssetRef(filename, targetMode) {
    state.mode = targetMode;
    const item = {
      kind: 'local',
      filename,
      previewUrl: `/outputs/${encodeURIComponent(filename)}`,
    };
    if (targetMode === 'layer-decomposition') {
      state.refs.forEach((r) => r.kind === 'upload' && URL.revokeObjectURL(r.previewUrl));
      state.refs = [item];
    } else {
      if (state.refs.length >= 10) state.refs.shift();
      state.refs.push(item);
    }
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
    const job = state.jobs.find((j) => j.id === state.activeJobId) || state.jobs[0] || null;
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
      $('stageEditBtn').classList.add('hidden');
      $('stageLayerBtn').classList.add('hidden');
      $('stageWriteBtn').classList.add('hidden');
      return;
    }

    badge.className = 'status-pill succeeded';
    const costLabel = job.cost ? `实付 ${formatCost(job.cost)}` : '已完成';
    badge.textContent = costLabel;
    const p = job.params || {};
    subtitle.textContent = `${job.mode} · ${p.resolution || ''} ${p.aspect_ratio || ''} · ${formatTime(job.completed_at || job.created_at)}`;

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
        const dl = document.createElement('a');
        dl.href = asset.url;
        dl.download = asset.filename;
        dl.textContent = '下载';
        dl.style.color = 'var(--accent-bright)';
        meta.append(nameSpan, dl);

        card.append(img, meta);
        grid.appendChild(card);
      });
      body.appendChild(grid);
    }

    actions.classList.remove('hidden');
    $('stageSaveBtn').classList.remove('hidden');
    $('stageEditBtn').classList.remove('hidden');
    $('stageLayerBtn').classList.remove('hidden');
    $('stageWriteBtn').classList.remove('hidden');

    const supportsFileShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
    $('stageShareBtn').classList.toggle('hidden', !supportsFileShare);
  }

  function renderHistory() {
    const grid = $('historyGrid');
    $('historyCount').textContent = String(state.jobs.length);
    grid.innerHTML = '';

    if (!state.jobs.length) {
      grid.innerHTML = '<p class="field-hint" style="grid-column:1/-1;text-align:center;padding:24px 0;">暂无生成记录</p>';
      return;
    }

    state.jobs.forEach((job) => {
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
          state.activeJobId = state.jobs[0]?.id || null;
        }
        renderStage();
        renderHistory();
      });

      card.append(thumb, info, delBtn);
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
      const fd = new FormData();
      fd.append('mode', state.mode);
      fd.append('prompt', prompt);
      fd.append('aspect_ratio', state.aspectRatio);
      fd.append('resolution', activeResolution());
      fd.append('output_format', state.outputFormat);
      fd.append('background', state.background);
      fd.append('num_outputs', String(state.numOutputs));
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

    const quickPrompts = [
      { label: '看图写场景', text: '请仔细观察我发送的参考图中的人物动作、神态、光线和服装细节，据此写一段极具画面感的场景描写：' },
      { label: '续写下一段', text: '请保持上文的人物性格、语气和细节连贯，继续往下写下一幕剧情：' },
      { label: '历史纪实风', text: '请用冷静写实的纪实文学笔法，补全装备、时代环境和心理活动：' },
      { label: '转成生图提示词', text: '把我们刚才定稿的这一幕画面，提炼成一段可直接给 Seedream 5.5 使用的英文高精度生图提示词（只输出提示词文本）。' },
    ];
    const quickRow = $('writingQuickRow');
    quickRow.innerHTML = '';
    quickPrompts.forEach((qp) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-chip';
      btn.textContent = qp.label;
      btn.addEventListener('click', () => {
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
    state.workspace = ws === 'writing' ? 'writing' : 'studio';
    document.querySelectorAll('[data-workspace]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.workspace === state.workspace);
    });
    $('studioView').classList.toggle('hidden', state.workspace !== 'studio');
    $('writingView').classList.toggle('hidden', state.workspace !== 'writing');
    updateWritingWarnBadge();
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
    const raw = $('promptInput').value.trim();
    if (!raw) {
      showFormError('请先输入几句简单画面描述，再点击 AI 扩写。');
      return;
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
    let streamedText = '';
    let gotFirstDelta = false;
    let finalModel = '';
    let usedVision = false;

    try {
      const fetchOpts = { method: 'POST' };
      if (state.refs.length > 0) {
        const fd = new FormData();
        fd.append('prompt', raw);
        fd.append('mode', state.mode);
        fd.append('style', $('enhanceStyleSelect').value);
        fd.append('lang', $('enhanceLangSelect').value);
        fd.append('ref_count', String(state.refs.length));
        appendRefsToFormData(fd, state.refs);
        fetchOpts.body = fd;
      } else {
        fetchOpts.headers = { 'Content-Type': 'application/json' };
        fetchOpts.body = JSON.stringify({
          prompt: raw,
          mode: state.mode,
          style: $('enhanceStyleSelect').value,
          lang: $('enhanceLangSelect').value,
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

      foot.append(modelTag, copyBtn, drawBtn);
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
          <span>写完后可点回复下方的「🎨 去画图」直接送到 Seedream 5.5 出图</span>
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

    $('promptInput').addEventListener('input', updateCharCount);
    $('numOutputsRange').addEventListener('input', (e) => {
      state.numOutputs = Number(e.target.value);
      $('numOutputsVal').textContent = String(state.numOutputs);
      updateQuotePreview();
    });

    $('refreshQuoteBtn').addEventListener('click', requestLiveQuote);
    $('enhancePromptBtn').addEventListener('click', enhancePrompt);
    $('undoEnhanceBtn').addEventListener('click', undoEnhance);
    $('generateBtn').addEventListener('click', submitGeneration);
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

    $('stageEditBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (asset?.filename) addLocalAssetRef(asset.filename, 'edit');
    });

    $('stageLayerBtn').addEventListener('click', () => {
      const job = state.jobs.find((j) => j.id === state.activeJobId);
      const asset = job?.assets?.[0];
      if (asset?.filename) addLocalAssetRef(asset.filename, 'layer-decomposition');
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
      if (p.resolution) {
        if (job.mode === 'layer-decomposition') state.layerResolution = p.resolution;
        else state.resolution = p.resolution;
      }
      if (p.output_format) state.outputFormat = p.output_format;
      if (p.background) state.background = p.background;
      updateCharCount();
      renderOptions();
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

    // Load initial config, generation history, and writing sessions
    try {
      const [cfgRes, histRes, writeRes] = await Promise.all([
        apiJson('/api/config'),
        apiJson('/api/tasks'),
        apiJson('/api/writing/sessions').catch(() => ({ items: [] })),
      ]);
      state.config = cfgRes;
      state.jobs = histRes.items || [];
      state.activeJobId = state.jobs[0]?.id || null;
      state.writingSessions = writeRes.items || [];
      state.activeWritingId = state.writingSessions[0]?.id || null;

      renderLlmSettingsOptions();
      renderWritingControls();
      updateSettingsDisplay();
      renderModeUI();
      renderStage();
      renderHistory();
      renderWritingSessions();
      renderWritingMessages();
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
