export function showToast(message: string, tone: 'success' | 'error' | 'info' = 'info') {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = String(message ?? '');
  el.setAttribute('role', 'status');
  el.style.position = 'fixed';
  el.style.right = '16px';
  el.style.bottom = '16px';
  el.style.zIndex = '9999';
  el.style.maxWidth = '360px';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '10px';
  el.style.fontSize = '12px';
  el.style.fontWeight = '600';
  el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';

  const tones = {
    success: {
      border: '1px solid rgba(16, 185, 129, 0.35)',
      background: 'rgba(16, 185, 129, 0.15)',
      color: 'rgba(209, 250, 229, 1)',
    },
    error: {
      border: '1px solid rgba(244, 63, 94, 0.35)',
      background: 'rgba(244, 63, 94, 0.12)',
      color: 'rgba(255, 228, 230, 1)',
    },
    info: {
      border: '1px solid rgba(56, 189, 248, 0.35)',
      background: 'rgba(56, 189, 248, 0.12)',
      color: 'rgba(224, 242, 254, 1)',
    },
  } as const;

  const t = tones[tone] ?? tones.info;
  el.style.border = t.border;
  el.style.background = t.background;
  el.style.color = t.color;

  document.body.appendChild(el);
  window.setTimeout(() => {
    el.style.transition = 'opacity 220ms ease';
    el.style.opacity = '0';
    window.setTimeout(() => el.remove(), 240);
  }, 2600);
}

