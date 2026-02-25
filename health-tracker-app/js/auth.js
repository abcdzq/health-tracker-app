const Auth = {
  HASH_KEY: 'ht_auth_hash',
  SESSION_KEY: 'ht_auth_session',
  SETUP_KEY: 'ht_auth_setup_done',

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_health_tracker_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  hasPassword() {
    return !!localStorage.getItem(this.HASH_KEY);
  },

  hasCompletedSetup() {
    return localStorage.getItem(this.SETUP_KEY) === 'true';
  },

  isUnlocked() {
    if (!this.hasPassword()) return true;
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  async setPassword(password) {
    const hash = await this.hashPassword(password);
    localStorage.setItem(this.HASH_KEY, hash);
    localStorage.setItem(this.SETUP_KEY, 'true');
    sessionStorage.setItem(this.SESSION_KEY, 'true');
  },

  removePassword() {
    localStorage.removeItem(this.HASH_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  skipSetup() {
    localStorage.setItem(this.SETUP_KEY, 'true');
  },

  async verify(password) {
    const hash = await this.hashPassword(password);
    const stored = localStorage.getItem(this.HASH_KEY);
    if (hash === stored) {
      sessionStorage.setItem(this.SESSION_KEY, 'true');
      return true;
    }
    return false;
  },

  lock() {
    if (!this.hasPassword()) {
      App.showToast('尚未設定密碼，無法鎖定');
      return;
    }
    sessionStorage.removeItem(this.SESSION_KEY);
    this.showLockScreen();
  },

  async changePassword(oldPw, newPw) {
    const ok = await this.verify(oldPw);
    if (!ok) return false;
    await this.setPassword(newPw);
    return true;
  },

  showLockScreen() {
    const isFirstTime = !this.hasCompletedSetup();
    const hasPassword = this.hasPassword();
    const screen = document.getElementById('lockScreen');
    const title = document.getElementById('lockTitle');
    const subtitle = document.getElementById('lockSubtitle');
    const input = document.getElementById('lockPassword');
    const confirmGroup = document.getElementById('lockConfirmGroup');
    const confirmInput = document.getElementById('lockConfirmPassword');
    const submitBtn = document.getElementById('lockSubmit');
    const skipBtn = document.getElementById('lockSkip');
    const errorEl = document.getElementById('lockError');

    if (isFirstTime) {
      title.textContent = '歡迎使用健康追蹤';
      subtitle.textContent = '你可以設定密碼保護資料，或直接跳過';
      submitBtn.textContent = '設定密碼';
      confirmGroup.style.display = '';
      skipBtn.style.display = '';
    } else {
      title.textContent = '輸入密碼';
      subtitle.textContent = '請輸入密碼以解鎖';
      submitBtn.textContent = '解鎖';
      confirmGroup.style.display = 'none';
      skipBtn.style.display = 'none';
    }

    errorEl.textContent = '';
    input.value = '';
    confirmInput.value = '';
    screen.classList.add('visible');
    setTimeout(() => input.focus(), 300);
  },

  hideLockScreen() {
    document.getElementById('lockScreen').classList.remove('visible');
  },

  handleSkip() {
    this.skipSetup();
    this.hideLockScreen();
    App.init();
  },

  async handleSubmit() {
    const input = document.getElementById('lockPassword');
    const confirmInput = document.getElementById('lockConfirmPassword');
    const errorEl = document.getElementById('lockError');
    const password = input.value;
    const isFirstTime = !this.hasCompletedSetup();

    if (isFirstTime) {
      if (!password || password.length < 4) {
        errorEl.textContent = '密碼至少需要 4 個字元';
        input.focus();
        return;
      }
      if (password !== confirmInput.value) {
        errorEl.textContent = '兩次密碼不一致';
        confirmInput.focus();
        return;
      }
      await this.setPassword(password);
      this.hideLockScreen();
      App.init();
    } else {
      if (!password) {
        errorEl.textContent = '請輸入密碼';
        input.focus();
        return;
      }
      const ok = await this.verify(password);
      if (ok) {
        this.hideLockScreen();
        App.init();
      } else {
        errorEl.textContent = '密碼錯誤';
        input.value = '';
        input.focus();
      }
    }
  },

  init() {
    if (!this.hasCompletedSetup()) {
      this.showLockScreen();
      return;
    }
    if (this.isUnlocked()) {
      App.init();
      return;
    }
    this.showLockScreen();
  }
};
