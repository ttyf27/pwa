// sync.js — GitHub Contents API sync for PWA localStorage
// Drop-in module: window.GitHubSync(config)
(function(global) {
'use strict';

const PAT_KEY = '__github_pat';

class GitHubSync {
  constructor(config) {
    this.appName = config.appName;
    this.repoOwner = config.repoOwner;
    this.repoName = config.repoName;
    this.filePath = config.filePath;
    this.branch = config.branch || 'claude/garmin-data-analysis-V2xrD';
    this.getData = config.getData;
    this.statusEl = null;

    this.metaKey = '__sync_meta_' + this.appName;
    this._pushing = false;
    this._retryTimer = null;
    this._debounceTimer = null;

    window.addEventListener('online', () => {
      const m = this.getMeta();
      if (m.dirty) this.push();
    });
  }

  attachStatusElement(el) {
    this.statusEl = el;
    el.addEventListener('click', () => this.openSettings());
    el.style.cursor = 'pointer';
    this.updateStatus();
  }

  getPat() { return localStorage.getItem(PAT_KEY) || ''; }
  setPat(v) {
    if (v) localStorage.setItem(PAT_KEY, v);
    else localStorage.removeItem(PAT_KEY);
    this.updateStatus();
  }

  getMeta() {
    try { return JSON.parse(localStorage.getItem(this.metaKey)) || {}; }
    catch (e) { return {}; }
  }
  setMeta(m) { localStorage.setItem(this.metaKey, JSON.stringify(m)); }

  // Call after any data change. Debounces and triggers push.
  markDirtyAndPush() {
    const m = this.getMeta();
    m.dirty = true;
    m.lastChange = Date.now();
    this.setMeta(m);
    this.updateStatus();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this.push();
    }, 1500);
  }

  async push(retryCount = 0) {
    if (this._pushing && retryCount === 0) {
      const m = this.getMeta();
      m.dirty = true;
      this.setMeta(m);
      return;
    }
    const pat = this.getPat();
    if (!pat) {
      const m = this.getMeta();
      m.lastError = 'PAT未設定';
      this.setMeta(m);
      this.updateStatus();
      return;
    }
    this._pushing = true;
    this.updateStatus();

    try {
      const data = this.getData() || {};
      const dataStr = JSON.stringify(data, null, 2);
      const dataB64 = this._utf8ToBase64(dataStr);

      // Fetch current sha (HTTPキャッシュバイパスで常に最新を取得)
      let currentSha = null;
      const getRes = await fetch(
        `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}?ref=${encodeURIComponent(this.branch)}&t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${pat}`, 'Accept': 'application/vnd.github+json' }
        }
      );
      if (getRes.ok) {
        const j = await getRes.json();
        currentSha = j.sha;
      } else if (getRes.status === 404) {
        currentSha = null;
      } else {
        const errBody = await getRes.text();
        throw new Error(`GET ${getRes.status}: ${errBody.slice(0, 200)}`);
      }

      const body = {
        message: `${this.appName}: sync ${new Date().toISOString()}`,
        content: dataB64,
        branch: this.branch,
      };
      if (currentSha) body.sha = currentSha;

      const putRes = await fetch(
        `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`,
        {
          method: 'PUT',
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      // 409 sha conflict: sha再取得して1回リトライ
      if (putRes.status === 409 && retryCount < 2) {
        this._pushing = false;
        await new Promise(r => setTimeout(r, 800 * (retryCount + 1)));
        return this.push(retryCount + 1);
      }
      if (!putRes.ok) {
        const errBody = await putRes.text();
        throw new Error(`PUT ${putRes.status}: ${errBody.slice(0, 200)}`);
      }
      const putJson = await putRes.json();
      const newSha = putJson.content && putJson.content.sha;

      const m = this.getMeta();
      m.sha = newSha;
      m.dirty = false;
      m.lastSync = Date.now();
      m.lastError = null;
      this.setMeta(m);
      this._pushing = false;
      this.updateStatus();

      // If new changes arrived during push, push again
      const m2 = this.getMeta();
      if (m2.dirty) setTimeout(() => this.push(), 500);
    } catch (e) {
      this._pushing = false;
      const m = this.getMeta();
      m.lastError = String(e.message || e);
      m.dirty = true;
      this.setMeta(m);
      this.updateStatus();
      this._scheduleRetry();
    }
  }

  _scheduleRetry() {
    if (this._retryTimer) return;
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      const m = this.getMeta();
      if (m.dirty && navigator.onLine) this.push();
    }, 30000);
  }

  updateStatus() {
    if (!this.statusEl) return;
    const m = this.getMeta();
    const pat = this.getPat();
    let text = '', color = '#999';
    if (!pat) {
      text = '⚙️ 未設定';
      color = '#999';
    } else if (this._pushing) {
      text = '⏳ 同期中';
      color = '#FF9800';
    } else if (m.lastError && m.dirty) {
      text = '⚠️ 失敗';
      color = '#FF6B6B';
    } else if (m.dirty) {
      text = '⏳ 未同期';
      color = '#FF9800';
    } else if (m.lastSync) {
      const ago = Math.floor((Date.now() - m.lastSync) / 60000);
      text = ago < 1 ? '☁️ 同期済' : `☁️ ${ago}分前`;
      color = '#4DABF7';
    } else {
      text = '☁️ 未同期';
      color = '#999';
    }
    this.statusEl.textContent = text;
    this.statusEl.style.color = color;
  }

  _utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  openSettings() {
    let overlay = document.getElementById('__sync_settings_overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__sync_settings_overlay';
      overlay.innerHTML = `
        <style>
        #__sync_settings_overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; }
        #__sync_settings_overlay .__sync_modal { background: #fff; border-radius: 14px; padding: 20px; width: 100%; max-width: 380px; max-height: 90vh; overflow-y: auto; color: #1d1d1f; }
        #__sync_settings_overlay h3 { font-size: 17px; font-weight: 700; margin-bottom: 14px; text-align: center; }
        #__sync_settings_overlay .__sync_field { margin-bottom: 12px; }
        #__sync_settings_overlay label { display: block; font-size: 12px; color: #6e6e73; margin-bottom: 4px; font-weight: normal; }
        #__sync_settings_overlay input { width: 100%; padding: 10px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 13px; font-family: monospace; box-sizing: border-box; -webkit-appearance: none; }
        #__sync_settings_overlay input:disabled { background: #f5f5f7; color: #6e6e73; }
        #__sync_settings_overlay .__sync_hint { font-size: 11px; color: #6e6e73; margin-top: 4px; line-height: 1.4; }
        #__sync_settings_overlay .__sync_status { padding: 10px; background: #f5f5f7; border-radius: 8px; font-size: 12px; margin-bottom: 12px; line-height: 1.6; }
        #__sync_settings_overlay .__sync_actions { display: flex; gap: 8px; margin-top: 14px; }
        #__sync_settings_overlay .__sync_actions button { flex: 1; padding: 12px; border-radius: 10px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; min-height: 44px; font-family: inherit; }
        #__sync_settings_overlay .__sync_btn_primary { background: #4DABF7; color: #fff; }
        #__sync_settings_overlay .__sync_btn_secondary { background: #f0f0f0; color: #1d1d1f; }
        #__sync_settings_overlay .__sync_btn_danger { background: #FF6B6B; color: #fff; }
        #__sync_settings_overlay .__sync_now { width: 100%; padding: 10px; border-radius: 8px; border: none; font-size: 13px; cursor: pointer; background: #f0f0f0; margin-top: 10px; font-family: inherit; }
        </style>
        <div class="__sync_modal">
          <h3>GitHub 同期設定</h3>
          <div class="__sync_status" id="__sync_status_text"></div>
          <div class="__sync_field">
            <label>Personal Access Token (PAT)</label>
            <input type="password" id="__sync_pat_input" placeholder="ghp_xxx..." autocomplete="off">
            <div class="__sync_hint">GitHub Settings → Developer settings → Personal access tokens で発行。Fine-grained で cc_garmin リポジトリの Contents read/write 権限を付与。</div>
          </div>
          <div class="__sync_field">
            <label>リポジトリ</label>
            <input type="text" id="__sync_repo_input" disabled>
          </div>
          <div class="__sync_field">
            <label>書き込み先</label>
            <input type="text" id="__sync_path_input" disabled>
          </div>
          <div class="__sync_actions">
            <button class="__sync_btn_danger" id="__sync_clear_btn">PAT削除</button>
            <button class="__sync_btn_secondary" id="__sync_cancel_btn">閉じる</button>
            <button class="__sync_btn_primary" id="__sync_save_btn">保存</button>
          </div>
          <button class="__sync_now" id="__sync_now_btn">今すぐ同期</button>
          <div style="margin-top:14px; padding-top:12px; border-top:1px solid #f0f0f0;">
            <div style="font-size:12px; color:#6e6e73; margin-bottom:8px; font-weight:600;">💾 ローカルバックアップ</div>
            <div style="display:flex; gap:6px;">
              <button class="__sync_now" id="__sync_export_btn" style="flex:1; margin:0;">📤 エクスポート</button>
              <button class="__sync_now" id="__sync_import_btn" style="flex:1; margin:0;">📥 インポート</button>
            </div>
            <input type="file" id="__sync_import_file" accept="application/json" style="display:none;">
            <div style="font-size:10px; color:#999; margin-top:6px; line-height:1.4;">localStorage 全データを JSON 出力/復元 (PATも含む)</div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const self = this;
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
      overlay.querySelector('#__sync_save_btn').addEventListener('click', () => {
        const v = overlay.querySelector('#__sync_pat_input').value.trim();
        if (v) self.setPat(v);
        overlay.style.display = 'none';
        const m = self.getMeta();
        if (m.dirty || !m.lastSync) self.push();
      });
      overlay.querySelector('#__sync_cancel_btn').addEventListener('click', () => {
        overlay.style.display = 'none';
      });
      overlay.querySelector('#__sync_clear_btn').addEventListener('click', () => {
        if (confirm('PATを削除しますか?')) {
          self.setPat('');
          overlay.querySelector('#__sync_pat_input').value = '';
          self._refreshSettingsStatus();
        }
      });
      overlay.querySelector('#__sync_now_btn').addEventListener('click', () => {
        const m = self.getMeta();
        m.dirty = true;
        self.setMeta(m);
        self.push().then(() => self._refreshSettingsStatus());
        self._refreshSettingsStatus();
      });
      // エクスポート
      overlay.querySelector('#__sync_export_btn').addEventListener('click', () => {
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          dump[key] = localStorage.getItem(key);
        }
        const payload = {
          app: self.appName,
          exported_at: new Date().toISOString(),
          localStorage: dump,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ymd = new Date().toISOString().slice(0,10).replace(/-/g,'');
        a.href = url;
        a.download = `${self.appName}_backup_${ymd}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      // インポート
      const fileInput = overlay.querySelector('#__sync_import_file');
      overlay.querySelector('#__sync_import_btn').addEventListener('click', () => {
        fileInput.click();
      });
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const j = JSON.parse(ev.target.result);
            if (!j.localStorage) throw new Error('localStorage キーがありません');
            const keys = Object.keys(j.localStorage);
            if (!confirm(`${keys.length}キーを localStorage に復元します (既存データは上書き)。続行しますか?`)) return;
            for (const k of keys) {
              localStorage.setItem(k, j.localStorage[k]);
            }
            alert('復元完了。ページを再読み込みします。');
            location.reload();
          } catch (err) {
            alert('インポート失敗: ' + err.message);
          }
        };
        reader.readAsText(file);
        fileInput.value = '';
      });
    }
    overlay.style.display = 'flex';
    overlay.querySelector('#__sync_pat_input').value = this.getPat();
    overlay.querySelector('#__sync_repo_input').value = `${this.repoOwner}/${this.repoName}`;
    overlay.querySelector('#__sync_path_input').value = `${this.filePath} @ ${this.branch}`;
    this._refreshSettingsStatus();
  }

  _refreshSettingsStatus() {
    const el = document.getElementById('__sync_status_text');
    if (!el) return;
    const m = this.getMeta();
    const pat = this.getPat();
    let html = '<div><strong>状態:</strong> ';
    if (!pat) html += '<span style="color:#999;">PAT未設定</span>';
    else if (this._pushing) html += '<span style="color:#FF9800;">同期中...</span>';
    else if (m.dirty) html += '<span style="color:#FF6B6B;">未同期 (変更あり)</span>';
    else if (m.lastSync) html += '<span style="color:#4DABF7;">同期済</span>';
    else html += '<span style="color:#999;">未同期 (初回)</span>';
    html += '</div>';
    if (m.lastSync) {
      const d = new Date(m.lastSync);
      const f = n => String(n).padStart(2, '0');
      html += `<div><strong>最終同期:</strong> ${d.getFullYear()}-${f(d.getMonth()+1)}-${f(d.getDate())} ${f(d.getHours())}:${f(d.getMinutes())}</div>`;
    }
    if (m.lastError) {
      html += `<div style="color:#FF6B6B; margin-top:4px;"><strong>エラー:</strong> ${m.lastError.slice(0, 150).replace(/</g, '&lt;')}</div>`;
    }
    el.innerHTML = html;
  }
}

global.GitHubSync = GitHubSync;
})(window);
