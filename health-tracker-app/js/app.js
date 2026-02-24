const App = {
  currentPage: 'today',
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedHistoryDate: null,
  editingMealId: null,
  _pendingPhotoData: null,

  init() {
    this.updateHeaderDate();
    this.renderToday();
    this.renderCalendar();
    this.updateRecordCount();
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
    if (page === 'settings') this.updateRecordCount();
  },

  updateHeaderDate() {
    const today = Storage.getTodayStr();
    document.getElementById('headerDate').textContent = Utils.formatDate(today);
  },

  // ===== Today Page =====
  renderToday() {
    const today = Storage.getTodayStr();
    const record = Storage.getDayRecord(today);
    this.renderExercise(record.exercise);
    this.renderMeals(record.meals);
  },

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
      if (found) {
        meal = { ...found };
        title = '編輯飲食記錄';
      }
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

    setTimeout(() => document.getElementById('mealFoodInput').focus(), 300);
  },

  selectMealType(type) {
    document.querySelectorAll('#mealTypeChips .chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.type === type);
    });
  },

  triggerPhotoCapture() {
    document.getElementById('photoCaptureInput').click();
  },

  triggerPhotoGallery() {
    document.getElementById('photoGalleryInput').click();
  },

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
        if (existing?.photoId && existing.photoId !== photoId) {
          await PhotoDB.delete(existing.photoId);
        }
        photoId = existing?.photoId && this._pendingPhotoData ? 'p' + Date.now() : (existing?.photoId || photoId);
      }
      await PhotoDB.save(photoId, this._pendingPhotoData);
    } else if (this.editingMealId) {
      const record = Storage.getDayRecord(today);
      const existing = record.meals.find(m => m.id === this.editingMealId);
      if (existing?.photoId) {
        await PhotoDB.delete(existing.photoId);
      }
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
    const checked = document.getElementById('exerciseDone').checked;
    document.getElementById('exerciseFields').style.display = checked ? '' : 'none';
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
    const dates = Storage.getAllDatesWithRecords();
    const datesSet = new Set(dates);

    document.getElementById('calendarMonth').textContent = `${year}年${month + 1}月`;

    const totalDays = Utils.getMonthDays(year, month);
    const firstDay = Utils.getFirstDayOfMonth(year, month);

    let html = Utils.WEEKDAY_NAMES.map(d => `<div class="calendar-weekday">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const hasRecord = datesSet.has(dateStr);
      const classes = ['calendar-day'];
      if (isToday) classes.push('today');
      if (hasRecord) classes.push('has-record');

      html += `<div class="${classes.join(' ')}" onclick="App.openDayDetail('${dateStr}')">${d}</div>`;
    }

    document.getElementById('calendarGrid').innerHTML = html;
  },

  prevMonth() {
    this.calendarMonth--;
    if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    }
    this.renderCalendar();
  },

  nextMonth() {
    this.calendarMonth++;
    if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    }
    this.renderCalendar();
  },

  async openDayDetail(dateStr) {
    this.selectedHistoryDate = dateStr;
    document.getElementById('calendarView').style.display = 'none';
    document.getElementById('dayDetailView').style.display = '';
    document.getElementById('dayDetailDate').textContent = Utils.formatDate(dateStr);

    const record = Storage.getDayRecord(dateStr);
    const container = document.getElementById('dayDetailContent');

    let html = '';

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

    html += '<div class="card"><div class="card-title"><span class="icon">🍽️</span> 飲食</div>';
    if (record.meals.length === 0) {
      html += '<div class="empty-state"><p>這天沒有飲食記錄</p></div>';
    } else {
      const order = ['breakfast', 'lunch', 'dinner', 'snack'];
      const sorted = [...record.meals].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
      for (const meal of sorted) {
        const mt = Utils.MEAL_TYPES[meal.type];
        let photoHtml = '';
        if (meal.photoId) {
          const photo = await PhotoDB.get(meal.photoId);
          if (photo) {
            photoHtml = `<div class="meal-photo" onclick="App.viewPhoto('${meal.photoId}')"><img src="${photo.data}"></div>`;
          }
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

    container.innerHTML = html;
  },

  closeDayDetail() {
    document.getElementById('calendarView').style.display = '';
    document.getElementById('dayDetailView').style.display = 'none';
    this.renderCalendar();
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

  triggerImport() {
    document.getElementById('importFile').click();
  },

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

  // ===== Change Password =====
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
    setTimeout(() => document.getElementById('cpOldPw').focus(), 300);
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
    if (ok) {
      this.closeModal();
      this.showToast('密碼已修改');
    } else {
      errorEl.textContent = '目前密碼錯誤';
    }
  },

  // ===== UI Helpers =====
  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
    this.editingMealId = null;
  },

  closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
      this.closeModal();
    }
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
    overlay.querySelector('#confirmOk').onclick = () => {
      overlay.remove();
      onConfirm();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
