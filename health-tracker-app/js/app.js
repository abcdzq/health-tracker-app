const App = {
  currentPage: 'today',
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedHistoryDate: null,
  editingMealId: null,
  _pendingPhotoData: null,
  statsPeriod: 'week',
  _reminderInterval: null,
  _lastReminderCheck: {},

  init() {
    this.applyDarkMode();
    this.updateHeaderDate();
    this.renderToday();
    this.renderCalendar();
    this.updateRecordCount();
    this.updateSettingsDisplay();
    this.startReminderCheck();
  },

  // ===== Dark Mode =====
  applyDarkMode() {
    const settings = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = settings.darkMode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = settings.darkMode ? '#1E1E1E' : '#4CAF50';
  },

  toggleDarkMode() {
    const settings = Storage.getSettings();
    settings.darkMode = document.getElementById('darkModeToggle').checked;
    Storage.saveSettings(settings);
    this.applyDarkMode();
  },

  // ===== Navigation =====
  switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
    this.currentPage = page;

    if (page === 'today') this.renderToday();
    if (page === 'history') {
      this.renderCalendar();
      document.getElementById('calendarView').style.display = '';
      document.getElementById('dayDetailView').style.display = 'none';
    }
    if (page === 'stats') this.renderStats();
    if (page === 'settings') {
      this.updateRecordCount();
      this.updateSettingsDisplay();
    }
  },

  updateHeaderDate() {
    document.getElementById('headerDate').textContent = Utils.formatDate(Storage.getTodayStr());
  },

  updateSettingsDisplay() {
    const settings = Storage.getSettings();
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = settings.darkMode;

    const wgDesc = document.getElementById('waterGoalDesc');
    if (wgDesc) wgDesc.textContent = settings.waterGoal + ' ml';

    const latest = Storage.getLatestWeight();
    const wDesc = document.getElementById('weightDesc');
    if (wDesc) wDesc.textContent = latest ? `最新：${latest.weight} kg（${Utils.formatDateShort(latest.date)}）` : '點擊記錄今日體重';

    const rDesc = document.getElementById('reminderDesc');
    if (rDesc) rDesc.textContent = settings.reminders.enabled ? '已開啟' : '未開啟';

    const verTitle = document.getElementById('appVersionTitle');
    if (verTitle) verTitle.textContent = '健康追蹤 v' + Version.current;

    this.renderSecurityCard();
  },

  renderSecurityCard() {
    const card = document.getElementById('securityCard');
    if (!card) return;

    const hasPw = Auth.hasPassword();
    if (hasPw) {
      card.innerHTML = `
        <div class="settings-item" onclick="App.openChangePasswordModal()">
          <div class="settings-icon">🔑</div>
          <div class="settings-info">
            <div class="title">修改密碼</div>
            <div class="desc">變更存取密碼</div>
          </div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-item" onclick="Auth.lock()">
          <div class="settings-icon">🔒</div>
          <div class="settings-info">
            <div class="title">立即鎖定</div>
            <div class="desc">鎖定 App，需重新輸入密碼</div>
          </div>
          <span class="settings-arrow">›</span>
        </div>
        <div class="settings-item" onclick="App.confirmRemovePassword()">
          <div class="settings-icon">🔓</div>
          <div class="settings-info">
            <div class="title">關閉密碼保護</div>
            <div class="desc">移除密碼，直接進入 App</div>
          </div>
          <span class="settings-arrow">›</span>
        </div>`;
    } else {
      card.innerHTML = `
        <div class="settings-item" onclick="App.openSetPasswordModal()">
          <div class="settings-icon">🔒</div>
          <div class="settings-info">
            <div class="title">啟用密碼保護</div>
            <div class="desc">目前未設定密碼，點擊設定</div>
          </div>
          <span class="settings-arrow">›</span>
        </div>`;
    }
  },

  // ===== Version History =====
  openVersionHistory() {
    let html = '';
    Version.history.forEach(v => {
      html += `<div style="margin-bottom:20px">`;
      html += `<div style="font-weight:600;font-size:15px;margin-bottom:6px">v${v.version}<span style="font-weight:400;font-size:12px;color:var(--text-secondary);margin-left:8px">${v.date}</span></div>`;
      v.changes.forEach(c => {
        html += `<div style="display:flex;gap:6px;align-items:flex-start;padding:3px 0;font-size:13px">`;
        html += `<span style="flex-shrink:0;color:${Version.getTypeColor(c.type)}">${Version.getTypeLabel(c.type)}</span>`;
        html += `<span>${c.text}</span></div>`;
      });
      html += `</div>`;
    });

    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">版本紀錄</div>
          <div style="max-height:60vh;overflow-y:auto">${html}</div>
          <div class="modal-actions">
            <button class="btn btn-primary" onclick="App.closeModal()">關閉</button>
          </div>
        </div>
      </div>`;
  },

  // ===== Today Page =====
  renderToday() {
    const today = Storage.getTodayStr();
    const record = Storage.getDayRecord(today);
    this.renderWater(record);
    this.renderExercise(record.exercise);
    this.renderMeals(record.meals);
  },

  // ===== Water =====
  renderWater(record) {
    const container = document.getElementById('waterContent');
    const settings = Storage.getSettings();
    const goal = settings.waterGoal;
    const amount = record.water.amount;
    const pct = Math.min(amount / goal, 1);

    const quickBtns = Utils.WATER_AMOUNTS.map(w =>
      `<button class="water-btn" onclick="App.addWater(${w.ml})">${w.icon} +${w.ml}ml</button>`
    ).join('');

    container.innerHTML = `
      <div class="water-card-content">
        <div class="water-ring-wrap">
          <canvas id="waterRingCanvas"></canvas>
        </div>
        <div class="water-info">
          <div class="water-amount">${amount} <span>/ ${goal} ml</span></div>
          <div class="water-goal-text">${pct >= 1 ? '🎉 已達成目標！' : `還需 ${goal - amount} ml`}</div>
          <div class="water-buttons">
            ${quickBtns}
            ${record.water.log.length > 0 ? '<button class="water-undo" onclick="App.undoWater()">↩ 撤銷</button>' : ''}
          </div>
        </div>
      </div>`;

    setTimeout(() => {
      const canvas = document.getElementById('waterRingCanvas');
      if (canvas) {
        Charts.ring(canvas, amount, goal, {
          size: 80,
          lineWidth: 8,
          color: getComputedStyle(document.documentElement).getPropertyValue('--water-color').trim(),
          label: Math.round(pct * 100) + '%',
          fontSize: 16,
          sublabel: '',
        });
      }
    }, 0);
  },

  addWater(ml) {
    const today = Storage.getTodayStr();
    Storage.addWater(today, ml);
    this.renderToday();
    this.showToast(`+${ml}ml 💧`);
  },

  undoWater() {
    const today = Storage.getTodayStr();
    Storage.undoLastWater(today);
    this.renderToday();
    this.showToast('已撤銷上筆飲水');
  },

  // ===== Meals =====
  async renderMeals(meals) {
    const container = document.getElementById('mealsContent');
    if (meals.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🍽️</div>
          <p>今天還沒有記錄<br>點上方「新增飲食」開始記錄吧</p>
        </div>`;
      return;
    }

    const order = ['breakfast', 'lunch', 'dinner', 'snack'];
    const sorted = [...meals].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    const htmlParts = await Promise.all(sorted.map(async meal => {
      const mt = Utils.MEAL_TYPES[meal.type];
      let photoHtml = '';
      if (meal.photoId) {
        const photo = await PhotoDB.get(meal.photoId);
        if (photo) {
          photoHtml = `<div class="meal-photo" onclick="App.viewPhoto('${meal.photoId}')"><img src="${photo.data}"></div>`;
        }
      }
      return `
        <div class="meal-item${photoHtml ? ' has-photo' : ''}">
          <span class="meal-icon">${mt.icon}</span>
          <div class="meal-info">
            <div class="meal-type">${mt.label}</div>
            <div class="meal-food">${this.escapeHtml(meal.food)}</div>
            ${meal.note ? `<div class="meal-note">${this.escapeHtml(meal.note)}</div>` : ''}
            ${photoHtml}
          </div>
          <div class="meal-actions">
            <button class="btn-icon" onclick="App.openMealModal('${meal.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="App.deleteMealConfirm('${meal.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>`;
    }));

    container.innerHTML = htmlParts.join('');
  },

  async viewPhoto(photoId) {
    const photo = await PhotoDB.get(photoId);
    if (!photo) return;
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay photo-viewer" onclick="App.closeModal()">
        <img src="${photo.data}" class="photo-fullview">
      </div>`;
  },

  renderExercise(exercise) {
    const container = document.getElementById('exerciseContent');
    if (!exercise.done) {
      container.innerHTML = `
        <div class="exercise-status">
          <span class="exercise-badge not-done">🚶 尚未運動</span>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div class="exercise-status">
        <span class="exercise-badge done">✅ 已運動</span>
      </div>
      <div class="exercise-detail">
        ${this.escapeHtml(exercise.type)}${exercise.duration ? ` · ${exercise.duration} 分鐘` : ''}
        ${exercise.note ? `<br><span style="color:var(--text-secondary);font-size:12px">${this.escapeHtml(exercise.note)}</span>` : ''}
      </div>`;
  },

  // ===== Meal Modal =====
  async openMealModal(editId) {
    const today = Storage.getTodayStr();
    let meal = { type: 'breakfast', food: '', note: '', photoId: '' };
    let title = '新增飲食記錄';

    if (editId) {
      const record = Storage.getDayRecord(today);
      const found = record.meals.find(m => m.id === editId);
      if (found) { meal = { ...found }; title = '編輯飲食記錄'; }
    }

    this.editingMealId = editId || null;
    this._pendingPhotoData = null;

    let existingPhotoHtml = '';
    if (meal.photoId) {
      const photo = await PhotoDB.get(meal.photoId);
      if (photo) {
        existingPhotoHtml = `<img src="${photo.data}" class="photo-preview-img">
          <button class="photo-remove-btn" onclick="App.removeModalPhoto()">✕</button>`;
        this._pendingPhotoData = photo.data;
      }
    }

    const chips = Object.entries(Utils.MEAL_TYPES).map(([key, val]) =>
      `<button class="chip ${meal.type === key ? 'selected' : ''}" data-type="${key}" onclick="App.selectMealType('${key}')">${val.icon} ${val.label}</button>`
    ).join('');

    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">${title}</div>
          <div class="form-group">
            <label class="form-label">餐別</label>
            <div class="chip-group" id="mealTypeChips">${chips}</div>
          </div>
          <div class="form-group">
            <label class="form-label">食物內容</label>
            <input class="form-input" id="mealFoodInput" type="text" placeholder="例如：雞腿便當、牛奶吐司" value="${this.escapeHtml(meal.food)}" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">備註（選填）</label>
            <input class="form-input" id="mealNoteInput" type="text" placeholder="例如：少飯、外帶" value="${this.escapeHtml(meal.note)}" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">食物照片（選填）</label>
            <div class="photo-upload-area" id="photoArea">
              <div class="photo-preview" id="photoPreview" style="${existingPhotoHtml ? '' : 'display:none'}">
                ${existingPhotoHtml}
              </div>
              <div class="photo-buttons" id="photoButtons" style="${existingPhotoHtml ? 'display:none' : ''}">
                <button class="btn btn-outline btn-sm" onclick="App.triggerPhotoCapture()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  拍照
                </button>
                <button class="btn btn-outline btn-sm" onclick="App.triggerPhotoGallery()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  相簿
                </button>
              </div>
              <input type="file" id="photoCaptureInput" accept="image/*" capture="environment" style="display:none" onchange="App.handlePhotoSelected(event)">
              <input type="file" id="photoGalleryInput" accept="image/*" style="display:none" onchange="App.handlePhotoSelected(event)">
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.saveMeal()">儲存</button>
          </div>
        </div>
      </div>`;

    setTimeout(() => document.getElementById('mealFoodInput')?.focus(), 300);
  },

  selectMealType(type) {
    document.querySelectorAll('#mealTypeChips .chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.type === type);
    });
  },

  triggerPhotoCapture() { document.getElementById('photoCaptureInput').click(); },
  triggerPhotoGallery() { document.getElementById('photoGalleryInput').click(); },

  async handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    const dataUrl = await PhotoDB.compressImage(file);
    this._pendingPhotoData = dataUrl;
    const preview = document.getElementById('photoPreview');
    preview.innerHTML = `<img src="${dataUrl}" class="photo-preview-img">
      <button class="photo-remove-btn" onclick="App.removeModalPhoto()">✕</button>`;
    preview.style.display = '';
    document.getElementById('photoButtons').style.display = 'none';
    event.target.value = '';
  },

  removeModalPhoto() {
    this._pendingPhotoData = null;
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('photoButtons').style.display = '';
  },

  async saveMeal() {
    const today = Storage.getTodayStr();
    const type = document.querySelector('#mealTypeChips .chip.selected')?.dataset.type;
    const food = document.getElementById('mealFoodInput').value.trim();
    const note = document.getElementById('mealNoteInput').value.trim();

    if (!food) {
      document.getElementById('mealFoodInput').style.borderColor = 'var(--danger)';
      document.getElementById('mealFoodInput').focus();
      return;
    }

    let photoId = '';
    if (this._pendingPhotoData) {
      photoId = 'p' + Date.now();
      if (this.editingMealId) {
        const record = Storage.getDayRecord(today);
        const existing = record.meals.find(m => m.id === this.editingMealId);
        if (existing?.photoId) await PhotoDB.delete(existing.photoId);
      }
      await PhotoDB.save(photoId, this._pendingPhotoData);
    } else if (this.editingMealId) {
      const record = Storage.getDayRecord(today);
      const existing = record.meals.find(m => m.id === this.editingMealId);
      if (existing?.photoId) await PhotoDB.delete(existing.photoId);
    }

    if (this.editingMealId) {
      Storage.updateMeal(today, this.editingMealId, { type, food, note, photoId });
      this.showToast('已更新記錄');
    } else {
      Storage.addMeal(today, { type, food, note, photoId });
      this.showToast('已新增記錄');
    }

    this._pendingPhotoData = null;
    this.closeModal();
    this.renderToday();
  },

  deleteMealConfirm(mealId) {
    this.showConfirm('刪除記錄', '確定要刪除這筆飲食記錄嗎？', async () => {
      const today = Storage.getTodayStr();
      const record = Storage.getDayRecord(today);
      const meal = record.meals.find(m => m.id === mealId);
      if (meal?.photoId) await PhotoDB.delete(meal.photoId);
      Storage.deleteMeal(today, mealId);
      this.renderToday();
      this.showToast('已刪除記錄');
    });
  },

  // ===== Exercise Modal =====
  openExerciseModal() {
    const today = Storage.getTodayStr();
    const record = Storage.getDayRecord(today);
    const ex = record.exercise;

    const typeChips = Utils.EXERCISE_TYPES.map(t =>
      `<button class="chip ${ex.type === t ? 'selected' : ''}" onclick="App.selectExerciseType(this)">${t}</button>`
    ).join('');

    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">記錄運動</div>
          <div class="form-group">
            <div class="toggle-row">
              <span>今天有運動嗎？</span>
              <label class="toggle">
                <input type="checkbox" id="exerciseDone" ${ex.done ? 'checked' : ''} onchange="App.toggleExerciseFields()">
                <span class="toggle-track"></span>
                <span class="toggle-thumb"></span>
              </label>
            </div>
          </div>
          <div id="exerciseFields" style="${ex.done ? '' : 'display:none'}">
            <div class="form-group">
              <label class="form-label">運動類型</label>
              <div class="chip-group" id="exerciseTypeChips">${typeChips}</div>
            </div>
            <div class="form-group">
              <label class="form-label">運動時長（分鐘）</label>
              <input class="form-input" id="exerciseDuration" type="number" min="0" placeholder="30" value="${ex.duration || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">備註（選填）</label>
              <input class="form-input" id="exerciseNote" type="text" placeholder="例如：跑了5公里" value="${this.escapeHtml(ex.note || '')}" autocomplete="off">
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-accent" onclick="App.saveExercise()">儲存</button>
          </div>
        </div>
      </div>`;
  },

  toggleExerciseFields() {
    document.getElementById('exerciseFields').style.display =
      document.getElementById('exerciseDone').checked ? '' : 'none';
  },

  selectExerciseType(el) {
    document.querySelectorAll('#exerciseTypeChips .chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  },

  saveExercise() {
    const today = Storage.getTodayStr();
    const done = document.getElementById('exerciseDone').checked;
    let exercise = { done: false, type: '', duration: 0, note: '' };

    if (done) {
      const typeEl = document.querySelector('#exerciseTypeChips .chip.selected');
      exercise = {
        done: true,
        type: typeEl ? typeEl.textContent.trim() : '',
        duration: parseInt(document.getElementById('exerciseDuration').value) || 0,
        note: document.getElementById('exerciseNote').value.trim()
      };
    }

    Storage.setExercise(today, exercise);
    this.closeModal();
    this.renderToday();
    this.showToast('已儲存運動記錄');
  },

  // ===== Calendar / History =====
  renderCalendar() {
    const year = this.calendarYear;
    const month = this.calendarMonth;
    const todayStr = Storage.getTodayStr();
    const datesSet = new Set(Storage.getAllDatesWithRecords());

    document.getElementById('calendarMonth').textContent = `${year}年${month + 1}月`;

    const totalDays = Utils.getMonthDays(year, month);
    const firstDay = Utils.getFirstDayOfMonth(year, month);

    let html = Utils.WEEKDAY_NAMES.map(d => `<div class="calendar-weekday">${d}</div>`).join('');
    for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const classes = ['calendar-day'];
      if (dateStr === todayStr) classes.push('today');
      if (datesSet.has(dateStr)) classes.push('has-record');
      html += `<div class="${classes.join(' ')}" onclick="App.openDayDetail('${dateStr}')">${d}</div>`;
    }

    document.getElementById('calendarGrid').innerHTML = html;
  },

  prevMonth() {
    this.calendarMonth--;
    if (this.calendarMonth < 0) { this.calendarMonth = 11; this.calendarYear--; }
    this.renderCalendar();
  },

  nextMonth() {
    this.calendarMonth++;
    if (this.calendarMonth > 11) { this.calendarMonth = 0; this.calendarYear++; }
    this.renderCalendar();
  },

  async openDayDetail(dateStr) {
    this.selectedHistoryDate = dateStr;
    document.getElementById('calendarView').style.display = 'none';
    document.getElementById('dayDetailView').style.display = '';
    document.getElementById('dayDetailDate').textContent = Utils.formatDate(dateStr);

    const record = Storage.getDayRecord(dateStr);
    const settings = Storage.getSettings();
    let html = '';

    // Water
    html += '<div class="card"><div class="card-title"><span class="icon">💧</span> 飲水</div>';
    if (record.water.amount > 0) {
      html += `<div style="font-size:15px;font-weight:500;color:var(--water-color)">${record.water.amount} / ${settings.waterGoal} ml</div>`;
      if (record.water.log.length) {
        html += '<div class="water-log-list" style="margin-top:8px">';
        record.water.log.forEach(l => {
          html += `<div class="water-log-item"><span>${l.time}</span><span>+${l.amount}ml</span></div>`;
        });
        html += '</div>';
      }
    } else {
      html += '<div class="empty-state" style="padding:16px"><p>這天沒有飲水記錄</p></div>';
    }
    html += '</div>';

    // Exercise
    html += '<div class="card"><div class="card-title"><span class="icon">🏃</span> 運動</div>';
    if (record.exercise.done) {
      html += `<div class="exercise-status"><span class="exercise-badge done">✅ 已運動</span></div>`;
      html += `<div class="exercise-detail">${this.escapeHtml(record.exercise.type)}`;
      if (record.exercise.duration) html += ` · ${record.exercise.duration} 分鐘`;
      if (record.exercise.note) html += `<br><span style="color:var(--text-secondary);font-size:12px">${this.escapeHtml(record.exercise.note)}</span>`;
      html += '</div>';
    } else {
      html += '<div class="exercise-status"><span class="exercise-badge not-done">🚶 未運動</span></div>';
    }
    html += '</div>';

    // Meals
    html += '<div class="card"><div class="card-title"><span class="icon">🍽️</span> 飲食</div>';
    if (record.meals.length === 0) {
      html += '<div class="empty-state" style="padding:16px"><p>這天沒有飲食記錄</p></div>';
    } else {
      const order = ['breakfast', 'lunch', 'dinner', 'snack'];
      const sorted = [...record.meals].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
      for (const meal of sorted) {
        const mt = Utils.MEAL_TYPES[meal.type];
        let photoHtml = '';
        if (meal.photoId) {
          const photo = await PhotoDB.get(meal.photoId);
          if (photo) photoHtml = `<div class="meal-photo" onclick="App.viewPhoto('${meal.photoId}')"><img src="${photo.data}"></div>`;
        }
        html += `
          <div class="meal-item${photoHtml ? ' has-photo' : ''}">
            <span class="meal-icon">${mt.icon}</span>
            <div class="meal-info">
              <div class="meal-type">${mt.label}</div>
              <div class="meal-food">${this.escapeHtml(meal.food)}</div>
              ${meal.note ? `<div class="meal-note">${this.escapeHtml(meal.note)}</div>` : ''}
              ${photoHtml}
            </div>
          </div>`;
      }
    }
    html += '</div>';

    document.getElementById('dayDetailContent').innerHTML = html;
  },

  closeDayDetail() {
    document.getElementById('calendarView').style.display = '';
    document.getElementById('dayDetailView').style.display = 'none';
    this.renderCalendar();
  },

  // ===== Stats Page =====
  setStatsPeriod(period) {
    this.statsPeriod = period;
    document.querySelectorAll('.stats-period .chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.period === period);
    });
    this.renderStats();
  },

  renderStats() {
    const today = Storage.getTodayStr();
    const range = this.statsPeriod === 'week' ? Utils.getWeekRange(today) : Utils.getMonthRange(today);
    const records = Storage.getRecordsInRange(range.start, range.end);
    const settings = Storage.getSettings();
    const weightData = Storage.getWeightData();

    const exerciseDays = records.filter(r => r.exercise.done).length;
    const totalMeals = records.reduce((s, r) => s + r.meals.length, 0);
    const avgWater = records.length ? Math.round(records.reduce((s, r) => s + r.water.amount, 0) / records.length) : 0;

    document.getElementById('statsSummary').innerHTML = `
      <div class="stat-box">
        <div class="value">${exerciseDays}</div>
        <div class="label">運動天數</div>
      </div>
      <div class="stat-box accent">
        <div class="value">${totalMeals}</div>
        <div class="label">飲食記錄</div>
      </div>
      <div class="stat-box water">
        <div class="value">${avgWater}</div>
        <div class="label">平均飲水(ml)</div>
      </div>`;

    let chartsHtml = '';

    // Exercise ring
    chartsHtml += `
      <div class="card">
        <div class="chart-title">🏃 運動達成率</div>
        <div class="ring-chart-row">
          <div class="ring-label">
            <canvas id="exerciseRingChart"></canvas>
            <div class="name">${exerciseDays} / ${records.length} 天</div>
          </div>
        </div>
      </div>`;

    // Meal type bar chart
    const mealCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    records.forEach(r => r.meals.forEach(m => { if (mealCounts[m.type] !== undefined) mealCounts[m.type]++; }));

    chartsHtml += `
      <div class="card">
        <div class="chart-title">🍽️ 餐別分佈</div>
        <div class="chart-wrap"><canvas id="mealBarChart"></canvas></div>
      </div>`;

    // Water bar chart
    chartsHtml += `
      <div class="card">
        <div class="chart-title">💧 每日飲水量</div>
        <div class="chart-wrap"><canvas id="waterBarChart"></canvas></div>
      </div>`;

    // Weight line chart
    chartsHtml += `
      <div class="card">
        <div class="chart-title">⚖️ 體重趨勢</div>
        <div class="chart-wrap"><canvas id="weightLineChart"></canvas></div>
      </div>`;

    document.getElementById('statsCharts').innerHTML = chartsHtml;

    setTimeout(() => {
      // Exercise ring
      const exRing = document.getElementById('exerciseRingChart');
      if (exRing) Charts.ring(exRing, exerciseDays, records.length, { size: 100, lineWidth: 10, sublabel: '達成率' });

      // Meal bar
      const mealBar = document.getElementById('mealBarChart');
      if (mealBar) {
        Charts.bar(mealBar,
          ['早餐', '午餐', '晚餐', '點心'],
          [mealCounts.breakfast, mealCounts.lunch, mealCounts.dinner, mealCounts.snack],
          { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }
        );
      }

      // Water bar
      const waterBar = document.getElementById('waterBarChart');
      if (waterBar) {
        const labels = records.map(r => {
          const d = new Date(r.date + 'T00:00:00');
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        Charts.bar(waterBar, labels, records.map(r => r.water.amount), {
          color: getComputedStyle(document.documentElement).getPropertyValue('--water-color').trim(),
          goalLine: settings.waterGoal
        });
      }

      // Weight line
      const weightLine = document.getElementById('weightLineChart');
      if (weightLine) {
        const d1 = new Date(range.start + 'T00:00:00');
        const d2 = new Date(range.end + 'T00:00:00');
        const rangeWeights = weightData.filter(w => {
          const wd = new Date(w.date + 'T00:00:00');
          return wd >= d1 && wd <= d2;
        });
        if (rangeWeights.length > 0) {
          Charts.line(weightLine,
            rangeWeights.map(w => Utils.formatDateShort(w.date)),
            rangeWeights.map(w => w.weight)
          );
        } else {
          Charts.line(weightLine, [''], [null]);
        }
      }
    }, 50);
  },

  // ===== Weight Modal =====
  openWeightModal() {
    const today = Storage.getTodayStr();
    const existing = Storage.getWeightData().find(w => w.date === today);
    const latest = Storage.getLatestWeight();

    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">記錄體重</div>
          <div class="form-group">
            <label class="form-label">今日體重 (kg)</label>
            <input class="form-input" id="weightInput" type="number" step="0.1" min="20" max="300"
              placeholder="${latest ? latest.weight : '65.0'}"
              value="${existing ? existing.weight : ''}" autocomplete="off">
          </div>
          ${latest ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:-8px;margin-bottom:16px">上次記錄：${latest.weight} kg（${Utils.formatDateShort(latest.date)}）</div>` : ''}
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.saveWeight()">儲存</button>
          </div>
        </div>
      </div>`;

    setTimeout(() => document.getElementById('weightInput')?.focus(), 300);
  },

  saveWeight() {
    const val = parseFloat(document.getElementById('weightInput').value);
    if (!val || val < 20 || val > 300) {
      document.getElementById('weightInput').style.borderColor = 'var(--danger)';
      return;
    }
    Storage.addWeight(Storage.getTodayStr(), val);
    this.closeModal();
    this.updateSettingsDisplay();
    this.showToast('已記錄體重 ' + val + ' kg');
  },

  // ===== Water Goal Modal =====
  openWaterGoalModal() {
    const settings = Storage.getSettings();
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">設定每日飲水目標</div>
          <div class="form-group">
            <label class="form-label">目標量 (ml)</label>
            <input class="form-input" id="waterGoalInput" type="number" step="100" min="500" max="5000" value="${settings.waterGoal}">
          </div>
          <div class="chip-group" style="margin-bottom:16px">
            <button class="chip" onclick="document.getElementById('waterGoalInput').value=1500">1500ml</button>
            <button class="chip" onclick="document.getElementById('waterGoalInput').value=2000">2000ml</button>
            <button class="chip" onclick="document.getElementById('waterGoalInput').value=2500">2500ml</button>
            <button class="chip" onclick="document.getElementById('waterGoalInput').value=3000">3000ml</button>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.saveWaterGoal()">儲存</button>
          </div>
        </div>
      </div>`;
  },

  saveWaterGoal() {
    const val = parseInt(document.getElementById('waterGoalInput').value);
    if (!val || val < 500 || val > 5000) return;
    const settings = Storage.getSettings();
    settings.waterGoal = val;
    Storage.saveSettings(settings);
    this.closeModal();
    this.renderToday();
    this.updateSettingsDisplay();
    this.showToast('飲水目標已更新');
  },

  // ===== Reminder Modal =====
  openReminderModal() {
    const settings = Storage.getSettings();
    const r = settings.reminders;

    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">飲食提醒</div>
          <div class="form-group">
            <div class="toggle-row">
              <span>開啟提醒</span>
              <label class="toggle">
                <input type="checkbox" id="reminderEnabled" ${r.enabled ? 'checked' : ''}>
                <span class="toggle-track"></span>
                <span class="toggle-thumb"></span>
              </label>
            </div>
          </div>
          <div class="reminder-row">
            <span class="reminder-label">🌅 早餐提醒</span>
            <input type="time" class="reminder-time" id="reminderBreakfast" value="${r.breakfast}">
          </div>
          <div class="reminder-row">
            <span class="reminder-label">☀️ 午餐提醒</span>
            <input type="time" class="reminder-time" id="reminderLunch" value="${r.lunch}">
          </div>
          <div class="reminder-row">
            <span class="reminder-label">🌙 晚餐提醒</span>
            <input type="time" class="reminder-time" id="reminderDinner" value="${r.dinner}">
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:12px">
            提醒功能需要瀏覽器通知權限，<br>且僅在 App 開啟時有效。
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.saveReminders()">儲存</button>
          </div>
        </div>
      </div>`;
  },

  async saveReminders() {
    const enabled = document.getElementById('reminderEnabled').checked;

    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        this.showToast('需要允許通知權限才能開啟提醒');
        return;
      }
    }

    const settings = Storage.getSettings();
    settings.reminders = {
      enabled,
      breakfast: document.getElementById('reminderBreakfast').value,
      lunch: document.getElementById('reminderLunch').value,
      dinner: document.getElementById('reminderDinner').value
    };
    Storage.saveSettings(settings);
    this.closeModal();
    this.updateSettingsDisplay();
    this.startReminderCheck();
    this.showToast(enabled ? '提醒已開啟' : '提醒已關閉');
  },

  startReminderCheck() {
    if (this._reminderInterval) clearInterval(this._reminderInterval);
    const settings = Storage.getSettings();
    if (!settings.reminders.enabled) return;

    this._reminderInterval = setInterval(() => this.checkReminders(), 30000);
  },

  checkReminders() {
    const settings = Storage.getSettings();
    if (!settings.reminders.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = Storage.getTodayStr();
    const r = settings.reminders;

    const checks = [
      { time: r.breakfast, label: '早餐', key: 'breakfast' },
      { time: r.lunch, label: '午餐', key: 'lunch' },
      { time: r.dinner, label: '晚餐', key: 'dinner' }
    ];

    checks.forEach(({ time, label, key }) => {
      const checkKey = today + '_' + key;
      if (hhmm === time && !this._lastReminderCheck[checkKey]) {
        this._lastReminderCheck[checkKey] = true;
        new Notification('健康追蹤', {
          body: `該記錄${label}了！別忘了記錄你的飲食 🍽️`,
          icon: 'icons/icon-192.svg',
          tag: 'meal-reminder-' + key
        });
      }
    });
  },

  // ===== Settings =====
  updateRecordCount() {
    const el = document.getElementById('recordCount');
    if (el) el.textContent = Storage.getAllDatesWithRecords().length;
  },

  async exportData() {
    const data = Storage.exportAll();
    const photos = await PhotoDB.getAll();
    const exportObj = { records: data, photos };
    const json = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-tracker-${Storage.getTodayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('資料已匯出（含照片）');
  },

  triggerImport() { document.getElementById('importFile').click(); },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const records = parsed.records || parsed;
        Storage.importAll(records);
        if (parsed.photos && Array.isArray(parsed.photos)) {
          for (const photo of parsed.photos) {
            if (photo.id && photo.data) await PhotoDB.save(photo.id, photo.data);
          }
        }
        this.renderToday();
        this.renderCalendar();
        this.updateRecordCount();
        this.showToast('資料已匯入');
      } catch {
        this.showToast('檔案格式錯誤');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  confirmClearData() {
    this.showConfirm('清除所有資料', '確定要刪除所有記錄嗎？此操作無法復原。', async () => {
      Storage.clearAll();
      await PhotoDB.clearAll();
      this.renderToday();
      this.renderCalendar();
      this.updateRecordCount();
      this.showToast('所有資料已清除');
    });
  },

  // ===== Password Management =====
  openSetPasswordModal() {
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">設定密碼</div>
          <div class="form-group">
            <label class="form-label">新密碼（至少 4 字元）</label>
            <input class="form-input" id="spNewPw" type="password" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">確認密碼</label>
            <input class="form-input" id="spConfirmPw" type="password" autocomplete="off">
          </div>
          <div class="lock-error" id="spError"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.submitSetPassword()">確認設定</button>
          </div>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('spNewPw')?.focus(), 300);
  },

  async submitSetPassword() {
    const newPw = document.getElementById('spNewPw').value;
    const confirmPw = document.getElementById('spConfirmPw').value;
    const errorEl = document.getElementById('spError');

    if (newPw.length < 4) { errorEl.textContent = '密碼至少需要 4 個字元'; return; }
    if (newPw !== confirmPw) { errorEl.textContent = '兩次密碼不一致'; return; }

    await Auth.setPassword(newPw);
    this.closeModal();
    this.updateSettingsDisplay();
    this.showToast('密碼已設定');
  },

  confirmRemovePassword() {
    this.showConfirm('關閉密碼保護', '確定要移除密碼嗎？之後開啟 App 將不需要輸入密碼。', () => {
      Auth.removePassword();
      this.updateSettingsDisplay();
      this.showToast('密碼保護已關閉');
    });
  },

  openChangePasswordModal() {
    document.getElementById('modalContainer').innerHTML = `
      <div class="modal-overlay" onclick="App.closeModalOnOverlay(event)">
        <div class="modal">
          <div class="modal-title">修改密碼</div>
          <div class="form-group">
            <label class="form-label">目前密碼</label>
            <input class="form-input" id="cpOldPw" type="password" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">新密碼（至少 4 字元）</label>
            <input class="form-input" id="cpNewPw" type="password" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">確認新密碼</label>
            <input class="form-input" id="cpConfirmPw" type="password" autocomplete="off">
          </div>
          <div class="lock-error" id="cpError"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="App.submitChangePassword()">確認修改</button>
          </div>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('cpOldPw')?.focus(), 300);
  },

  async submitChangePassword() {
    const oldPw = document.getElementById('cpOldPw').value;
    const newPw = document.getElementById('cpNewPw').value;
    const confirmPw = document.getElementById('cpConfirmPw').value;
    const errorEl = document.getElementById('cpError');

    if (!oldPw) { errorEl.textContent = '請輸入目前密碼'; return; }
    if (newPw.length < 4) { errorEl.textContent = '新密碼至少需要 4 個字元'; return; }
    if (newPw !== confirmPw) { errorEl.textContent = '兩次新密碼不一致'; return; }

    const ok = await Auth.changePassword(oldPw, newPw);
    if (ok) { this.closeModal(); this.showToast('密碼已修改'); }
    else { errorEl.textContent = '目前密碼錯誤'; }
  },

  // ===== UI Helpers =====
  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
    this.editingMealId = null;
  },

  closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) this.closeModal();
  },

  showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  },

  showConfirm(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="title">${title}</div>
        <div class="message">${message}</div>
        <div class="actions">
          <button class="btn btn-outline" id="confirmCancel">取消</button>
          <button class="btn btn-danger" id="confirmOk">確定</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmCancel').onclick = () => overlay.remove();
    overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); onConfirm(); };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
