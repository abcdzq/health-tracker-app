const Storage = {
  KEY_PREFIX: 'health_',

  _getKey(dateStr) {
    return this.KEY_PREFIX + dateStr;
  },

  getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getDayRecord(dateStr) {
    const raw = localStorage.getItem(this._getKey(dateStr));
    if (raw) return JSON.parse(raw);
    return { date: dateStr, meals: [], exercise: { done: false, type: '', duration: 0, note: '' } };
  },

  saveDayRecord(record) {
    localStorage.setItem(this._getKey(record.date), JSON.stringify(record));
  },

  addMeal(dateStr, meal) {
    const record = this.getDayRecord(dateStr);
    meal.id = 'm' + Date.now();
    record.meals.push(meal);
    this.saveDayRecord(record);
    return record;
  },

  updateMeal(dateStr, mealId, updated) {
    const record = this.getDayRecord(dateStr);
    const idx = record.meals.findIndex(m => m.id === mealId);
    if (idx !== -1) {
      record.meals[idx] = { ...record.meals[idx], ...updated };
      this.saveDayRecord(record);
    }
    return record;
  },

  deleteMeal(dateStr, mealId) {
    const record = this.getDayRecord(dateStr);
    record.meals = record.meals.filter(m => m.id !== mealId);
    this.saveDayRecord(record);
    return record;
  },

  setExercise(dateStr, exercise) {
    const record = this.getDayRecord(dateStr);
    record.exercise = exercise;
    this.saveDayRecord(record);
    return record;
  },

  getAllDatesWithRecords() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.KEY_PREFIX)) {
        dates.push(key.replace(this.KEY_PREFIX, ''));
      }
    }
    return dates.sort();
  },

  exportAll() {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.KEY_PREFIX)) {
        all[key] = JSON.parse(localStorage.getItem(key));
      }
    }
    return all;
  },

  importAll(data) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(this.KEY_PREFIX)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  },

  clearAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
};
