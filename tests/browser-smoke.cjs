// Optional browser smoke test: requires Playwright and an installed Chrome.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const name = req.url === '/' ? 'index.html' : req.url.slice(1).split('?')[0];
    const files = ['index.html', 'app.js', 'core.js', 'storage.js', 'styles.css', 'favicon.svg'];
    if (name === 'config.js') { res.setHeader('Content-Type', 'text/javascript'); res.end('window.MYBODY_CONFIG={supabaseUrl:"https://example.test",supabasePublishableKey:"test"};'); return; }
    if (!files.includes(name)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
    res.end(fs.readFileSync(path.join(root, name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel:'chrome', headless:true});
    const context = await browser.newContext({viewport:{width:390,height:844}, timezoneId:'Asia/Tokyo'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const db = {training_records:[], custom_exercises:[], user_settings:[]};
    let session = null, fail = false, signUpOptions = null;
    await page.exposeBinding('mockDb', (_source, op, table, payload) => {
      if (op === 'session') return {data:{session}};
      if (op === 'signin') { session = {user:{id:'user-1', email:'test@example.com'}}; return {data:{user:session.user, session}}; }
      if (op === 'signup') { signUpOptions = payload; return {data:{user:{}, session:null}}; }
      if (op === 'signout') { session = null; return {data:null}; }
      if (fail && op === 'upsert') return {error:{message:'保存テストエラー'}};
      if (op === 'select') return {data: payload.single ? (db[table][0] || null) : db[table].slice(payload.from, payload.to + 1)};
      if (op === 'upsert') {
        const rows = db[table], index = rows.findIndex(row => row.user_id === payload.user_id && (table === 'user_settings' || row.id === payload.id));
        if (index < 0) rows.push(payload); else rows[index] = payload;
        return {data:null};
      }
      if (op === 'rpc') {
        for (const [name, items] of [['training_records',payload.records], ['custom_exercises',payload.exercises]]) {
          for (const item of items) if (!db[name].some(row => row.id === item.id)) db[name].push({user_id:'user-1', id:item.id, data:item});
        }
        if (payload.old_thresholds && !db.user_settings.length) db.user_settings.push({user_id:'user-1', thresholds:payload.old_thresholds});
        return {data:null};
      }
      throw new Error(`Unknown operation ${op}`);
    });
    await page.addInitScript(() => {
      window.supabase = {createClient() {
        return {
          auth:{ getSession:()=>window.mockDb('session'), signInWithPassword:()=>window.mockDb('signin'), signUp:(payload)=>window.mockDb('signup',null,payload), signOut:()=>window.mockDb('signout') },
          from(table) {
            const query = {from:0, to:499, single:false};
            const builder = {
              select:()=>builder, eq:()=>builder, order:()=>builder,
              range:(from,to)=>{query.from=from; query.to=to; return builder;},
              maybeSingle:()=>{query.single=true; return builder;},
              then:(resolve,reject)=>window.mockDb('select',table,query).then(resolve,reject),
              upsert:(payload)=>window.mockDb('upsert',table,payload),
            };
            return builder;
          },
          rpc:(_name,payload)=>window.mockDb('rpc',null,payload),
        };
      }};
    });
    await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({status:200, body:''}));
    await page.clock.install({time:new Date('2026-10-18T03:00:00Z')});
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.locator('#auth-email').fill('test@example.com');
    await page.locator('#auth-password').fill('password');
    await page.locator('#sign-in').click();
    await page.locator('#auth-overlay').waitFor({state:'hidden'});
    await page.locator('#open-register').click();
    await page.locator('#open-exercise-picker').click();
    await page.locator('[data-pick="pull_up"]').click();
    assert.equal(await page.locator('#record-intensity').inputValue(), 'hard');
    await page.locator('#record-value').fill('10');
    fail = true;
    await page.locator('#save-record').click();
    await page.waitForFunction(() => document.querySelector('#register-message').textContent.includes('保存テストエラー'));
    assert.equal(db.training_records.length, 0);
    fail = false;
    await page.locator('#save-record').click();
    await page.locator('#register-backdrop').waitFor({state:'hidden'});
    assert.equal(db.training_records[0].data.intensity, 'hard');
    await page.reload();
    await page.locator('#auth-overlay').waitFor({state:'hidden'});
    await page.locator('[data-target="history"]').click();
    assert.match(await page.locator('#history-list').innerText(), /懸垂/);
    const legacy = Array.from({length:7}, (_, i) => ({id:`old-${i}`,date:`2026-10-${12+i}`,performedAt:`2026-10-${12+i}T03:00:00Z`,exerciseId:'push_up',value:10}));
    await page.evaluate(records => localStorage.setItem('mybody_records_v1',JSON.stringify(records)),legacy);
    await page.locator('[data-target="settings"]').click();
    await page.locator('#import-legacy').click();
    await page.waitForFunction(() => document.querySelector('#account-message').textContent.includes('旧データを移行しました'));
    await page.locator('#import-legacy').click();
    await page.waitForFunction(() => document.querySelector('#account-message').textContent.includes('旧データを移行しました'));
    assert.equal(db.training_records.length, 8);
    await page.locator('[data-target="effort"]').click();
    assert.equal(await page.locator('#effort-total').innerText(), '¥1,100');
    await page.locator('[data-target="settings"]').click();
    await page.locator('#threshold-blue').fill('12');
    await page.locator('#save-thresholds').click();
    await page.waitForFunction(() => document.querySelector('#threshold-message').textContent.includes('保存しました'));
    assert.equal(db.user_settings[0].thresholds.blue, 12);
    await page.locator('#open-exercise-editor').click();
    await page.locator('#custom-name').fill('テスト種目');
    await page.locator('#custom-intensity').selectOption('light');
    await page.locator('[data-muscle-check="chest"]').check();
    await page.locator('#save-custom-exercise').click();
    await page.locator('#exercise-editor-backdrop').waitFor({state:'hidden'});
    assert.equal(db.custom_exercises[0].data.intensity, 'light');
    const customId = db.custom_exercises[0].id;
    await page.locator('#open-register-header').click();
    await page.locator('#open-exercise-picker').click();
    await page.locator(`[data-pick="${customId}"]`).click();
    assert.equal(await page.locator('#record-intensity').inputValue(), 'light');
    await page.locator('#record-value').fill('15');
    await page.locator('#save-record').click();
    await page.locator('#register-backdrop').waitFor({state:'hidden'});
    page.once('dialog', dialog => dialog.accept());
    await page.locator(`[data-delete="${customId}"]`).click();
    assert.equal(db.custom_exercises.length, 1);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-data').click();
    const download = await downloadPromise;
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported.records.length, 9);
    assert.equal(exported.thresholds.blue, 12);
    exported.records.push({...legacy[0], id:'restored-record'});
    await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
    await page.waitForFunction(() => document.querySelector('#account-message').textContent.includes('バックアップからデータを追加しました'));
    assert.equal(db.training_records.length, 10);
    assert.deepEqual(db.user_settings[0].thresholds, {blue:12,yellow:30,red:60});
    await page.locator('#sign-out').click();
    await page.locator('#auth-overlay').waitFor({state:'visible'});
    await page.locator('#auth-email').fill('test@example.com');
    await page.locator('#auth-password').fill('password');
    await page.locator('#sign-up').click();
    await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('確認メールを送信しました'));
    assert.equal(signUpOptions.options.emailRedirectTo, `${url}/`);
    assert.deepEqual(errors, []);
    console.log('Browser smoke test passed: authentication, signup redirect, save and failure, reload, migration, effort, settings, custom exercise, backup and restore.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode=1; });
