const CACHE_NAME = 'seedream-studio-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') {
    return;
  }
  const isLocal =
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname === 'localhost';
  const hint = isLocal
    ? '请双击项目目录中的 <code>start_win.bat</code> 启动后刷新页面。'
    : '当前设备似乎暂时无网络，请检查网络后点击下方按钮重新加载。';
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seedream Studio 离线提示</title></head><body style="background:#0b0b0e;color:#f3f4f6;font-family:sans-serif;padding:40px 20px;text-align:center;"><h2>无法加载 Seedream Studio</h2><p style="color:#9ca3af;">${hint}</p><button onclick="location.reload()" style="margin-top:12px;padding:10px 20px;border-radius:8px;border:none;background:#f59e0b;color:#111;font-weight:700;cursor:pointer;">重新连接</button></body></html>`,
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    )
  );
});
