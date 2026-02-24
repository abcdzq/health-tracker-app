const Auth = {
  HASH_KEY: 'ht_auth_hash',
  SESSION_KEY: 'ht_auth_session',

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

  isUnlocked() {
    return sessionStorage.getItem(this.SESSION_KEY) === 'true';
  },

  async setPassword(password) {
    const hash = await this.hashPassword(password);
    localStorage.setItem(this.HASH_KEY, hash);
    sessionStorage.setItem(this.SESSION_KEY, 'true');
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
    const isSetup = !this.hasPassword();
    const screen = document.getElementById('lockScreen');
    const title = document.getElementById('lockTitle');
    const subtitle = document.getElementById('lockSubtitle');
    const input = document.getElementById('lockPassword');
    const confirmGroup = document.getElementById('lockConfirmGroup');
    const confirmInput = document.getElementById('lockConfirmPassword');
    const submitBtn = document.getElementById('lockSubmit');
    const errorEl = document.getElementById('lockError');

    title.textContent = isSetup ? '設定密碼' : '輸入密碼';
    subtitle.textContent = isSetup ? '首次使用，請設定存取密碼' : '請輸入密碼以解鎖';
    submitBtn.textContent = isSetup ? '確認設定' : '解鎖';
    confirmGroup.style.display = isSetup ? '' : 'none';
    errorEl.textContent = '';
    input.value = '';
    confirmInput.value = '';

    screen.classList.add('visible');
    setTimeout(() => input.focus(), 300);
  },

  hideLockScreen() {
    document.getElementById('lockScreen').classList.remove('visible');
  },

  async handleSubmit() {
    const input = document.getElementById('lockPassword');
    const confirmInput = document.getElementById('lockConfirmPassword');
    const errorEl = document.getElementById('lockError');
    const password = input.value;

    if (!password || password.length < 4) {
      errorEl.textContent = '密碼至少需要 4 個字元';
      input.focus();
      return;
    }

    if (!this.hasPassword()) {
      if (password !== confirmInput.value) {
        errorEl.textContent = '兩次密碼不一致';
        confirmInput.focus();
        return;
      }
      await this.setPassword(password);
      this.hideLockScreen();
      App.init();
    } else {
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
    if (this.isUnlocked()) {
      App.init();
      return;
    }
    this.showLockScreen();
  }
};
