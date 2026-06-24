import { chromium } from '@playwright/test';

const screens = [
  {
    file: 'docs/blog-assets/home-routines.png',
    body: `
      <section>
        <div class="app">FlexRoutine</div>
        <h1>今日も短縮版で大丈夫</h1>
        <p>寝坊しても、予定が崩れても、今日の最低限まで組み直します。</p>
      </section>
      ${card('☀️', '朝の支度', '通常 30分 / 最近平均 未計測', '最低限 12分30秒', true)}
      ${card('🌙', '夜の支度', '通常 20分 / 最近平均 未計測', '最低限 8分', true)}
      ${card('💻', '仕事開始前', '通常 10分 / 最近平均 未計測', '最低限 4分30秒', true)}
      <aside><b>提案</b><strong>実行ログをためる準備ができています</strong><span>タイマーを1回完了すると、スキップや時短の傾向からホームの提案が変わります。</span></aside>
    `,
  },
  {
    file: 'docs/blog-assets/emergency-plan.png',
    body: `
      <section>
        <div class="app danger">短縮版の準備</div>
        <h1>朝の支度</h1>
        <p>今日の持ち時間に合わせて、最低限を守る実行プランを作ります。</p>
      </section>
      <div class="panel"><h2>今日の持ち時間</h2><div class="chips"><em>5分</em><em>10分</em><em class="selected">15分</em><em>20分</em><em>30分</em></div></div>
      <div class="panel"><h2>今日のプラン</h2><div class="grid"><span>通常<b>30分</b></span><span>最低限<b>12分30秒</b></span><span>実行予定<b>15分</b></span><span>短縮<b>15分</b></span></div></div>
      ${row('水を飲む', '通常 1分 → 1分', '実行')}
      ${row('着替え', '通常 5分 → 3分', '短縮')}
      ${row('身だしなみ', '通常 10分 → 5分', '短縮')}
      ${row('軽いストレッチ', '通常 5分', 'スキップ')}
    `,
  },
  {
    file: 'docs/blog-assets/target-too-short.png',
    body: `
      <section>
        <div class="app danger">短縮版の準備</div>
        <h1>朝の支度</h1>
        <p>今日の持ち時間: 5分</p>
      </section>
      <div class="panel"><h2>今日のプラン</h2><div class="grid"><span>通常<b>30分</b></span><span>最低限<b>12分30秒</b></span><span>実行予定<b>12分30秒</b></span><span>短縮<b>17分30秒</b></span></div></div>
      <div class="warning"><b>最低限でも12分30秒必要です</b><span>守る条件を破らず、最低限のプランで始められます。</span></div>
      ${row('洗顔', '通常 3分 → 2分', '短縮')}
      ${row('歯磨き', '通常 3分 → 2分', '短縮')}
      ${row('軽いストレッチ', '通常 5分', 'スキップ')}
      <button>最低限で始める</button>
    `,
  },
  {
    file: 'docs/blog-assets/timer-running.png',
    dark: true,
    body: `
      <div class="timer-top"><b>3 / 6</b><span>短縮版</span></div>
      <main class="timer-main"><h1>着替え</h1><time>2:58</time><p>全体残り 12分</p></main>
      <div class="next"><small>NEXT</small><strong>身だしなみ</strong></div>
      <p class="hint">画面全体をダブルタップで次へ</p>
      <nav><button>一時停止</button><button>+30秒</button><button class="red">スキップ</button></nav>
    `,
  },
];

const browser = await chromium.launch({ headless: true });

for (const screen of screens) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.setContent(html(screen.body, screen.dark));
  await page.screenshot({ path: screen.file, fullPage: true });
  await page.close();
}

await browser.close();
console.log('capture-blog-screenshots ok');

function html(body, dark = false) {
  return `<!doctype html>
  <html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:${dark ? '#111827' : '#f6f7f9'};color:${dark ? '#fff' : '#111827'};padding:20px}
  section,.panel,aside{background:#fff;border-radius:8px;padding:18px;margin-bottom:14px;color:#111827} .app{font-size:14px;font-weight:800;color:#50606f}.danger{color:#dc2626}
  h1{font-size:28px;line-height:1.1;margin:8px 0;font-weight:900} h2{font-size:18px;margin:0 0 12px;font-weight:900} p{font-size:15px;line-height:1.45;color:#52606d;margin:0}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;color:#111827}.card h2{display:flex;gap:10px;align-items:center;margin:0 0 5px}.meta{font-size:13px;color:#52606d}.pill{display:inline-block;background:#f1f5f9;border-radius:8px;padding:6px 8px;margin:12px 6px 0 0;font-size:12px;font-weight:800;color:#334155}
  .actions{display:flex;gap:10px;margin-top:14px}.actions span,button{border:0;border-radius:8px;padding:12px 14px;font-weight:900;background:#111827;color:#fff;flex:1;text-align:center}.actions .red,button.red{background:#dc2626}
  aside{border:1px solid #dbeafe;background:#f8fafc} aside b{display:block;color:#2563eb;font-size:13px} aside strong{display:block;margin:7px 0;font-size:17px} aside span{color:#52606d;font-size:14px;line-height:1.45}
  .chips{display:flex;flex-wrap:wrap;gap:8px}.chips em{font-style:normal;background:#f1f5f9;border-radius:8px;padding:9px 12px;font-weight:800;color:#334155}.chips .selected{background:#111827;color:#fff}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid span{background:#f8fafc;border-radius:8px;padding:12px;color:#64748b;font-size:12px;font-weight:800}.grid b{display:block;color:#111827;font-size:17px;margin-top:4px}
  .row{background:#fff;border-radius:8px;border-top:1px solid #f1f5f9;padding:13px 0;display:flex;justify-content:space-between;gap:10px}.row strong{font-size:15px}.row small{display:block;color:#64748b;margin-top:4px}.badge{align-self:center;border-radius:8px;padding:6px 8px;background:#eef2ff;color:#3730a3;font-weight:900;font-size:12px}.warning{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;margin-bottom:14px;color:#9a3412}.warning b,.warning span{display:block}.warning span{font-size:13px;margin-top:4px}
  .timer-top{display:flex;justify-content:space-between;align-items:center;color:#e5e7eb}.timer-top span{background:#fee2e2;color:#991b1b;border-radius:8px;padding:6px 10px;font-weight:900;font-size:13px}.timer-main{text-align:center;margin:150px 0 80px}.timer-main h1{font-size:38px;color:#fff}.timer-main time{display:block;font-size:78px;font-weight:900}.timer-main p{color:#cbd5e1;font-weight:800}.next{background:#1f2937;border-radius:8px;padding:16px}.next small{display:block;color:#93c5fd;font-weight:900}.next strong{display:block;margin-top:6px;font-size:20px}.hint{text-align:center;color:#cbd5e1;margin:24px 0}nav{display:flex;gap:10px}nav button{background:#fff;color:#111827}
  </style></head><body>${body}</body></html>`;
}

function card(icon, title, meta, minimum, actions) {
  return `<div class="card"><h2><span>${icon}</span>${title}</h2><div class="meta">${meta}</div><span class="pill">${minimum}</span><span class="pill">タスク 7件</span>${actions ? '<div class="actions"><span>スタート</span><span class="red">緊急！時短</span></div>' : ''}</div>`;
}

function row(title, meta, badge) {
  return `<div class="row"><div><strong>${title}</strong><small>${meta}</small></div><span class="badge">${badge}</span></div>`;
}
