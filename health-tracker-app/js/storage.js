const Storage = {
  KEY_PREFIX: 'health_',
  SETTINGS_KEY: 'health_settings',
  WEIGHT_KEY: 'health_weight',

  _getKey(dateStr) {
    return this.KEY_PREFIX + dateStr;
  },

  getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },

  getDayRecord(dateStr) {
    const raw = localStorage.getItem(this._getKey(dateStr));
    if (raw) {
      const record = JSON.parse(raw);
      if (!record.water) record.water = { amount: 0, log: [] };
      return record;
    }
    return {
      date: dateStr,
      meals: [],
      exercise: { done: false, type: '', duration: 0, note: '' },
      water: { amount: 0, log: [] }
    };
  },

  saveDayRecord(record) {
    localStorage.setItem(this._getKey(record.date), JSON.stringify(record));
  },

  // ===== Meals =====
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

  // ===== Exercise =====
  setExercise(dateStr, exercise) {
    const record = this.getDayRecord(dateStr);
    record.exercise = exercise;
    this.saveDayRecord(record);
    return record;
  },

  // ===== Water =====
  addWater(dateStr, amount) {
    const record = this.getDayRecord(dateStr);
    const now = new Date();
    record.water.log.push({
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      amount
    });
    record.water.amount = record.water.log.reduce((s, l) => s + l.amount, 0);
    this.saveDayRecord(record);
    return record;
  },

  undoLastWater(dateStr) {
    const record = this.getDayRecord(dateStr);
    if (record.water.log.length > 0) {
      record.water.log.pop();
      record.water.amount = record.water.log.reduce((s, l) => s + l.amount, 0);
      this.saveDayRecord(record);
    }
    return record;
  },

  // ===== Weight =====
  getWeightData() {
    const raw = localStorage.getItem(this.WEIGHT_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  addWeight(dateStr, weight) {
    const data = this.getWeightData();
    const idx = data.findIndex(e => e.date === dateStr);
    if (idx >= 0) data[idx].weight = weight;
    else data.push({ date: dateStr, weight });
    data.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(this.WEIGHT_KEY, JSON.stringify(data));
  },

  deleteWeight(dateStr) {
    const data = this.getWeightData().filter(e => e.date !== dateStr);
    localStorage.setItem(this.WEIGHT_KEY, JSON.stringify(data));
  },

  getLatestWeight() {
    const data = this.getWeightData();
    return data.length ? data[data.length - 1] : null;
  },

  // ===== Settings =====
  getSettings() {
    const raw = localStorage.getItem(this.SETTINGS_KEY);
    const defaults = {
      darkMode: false,
      waterGoal: 2000,
      reminders: { enabled: false, breakfast: '08:00', lunch: '12:00', dinner: '18:00' }
    };
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  },

  saveSettings(settings) {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  },

  // ===== Data helpers =====
  getAllDatesWithRecords() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.KEY_PREFIX) && key !== this.SETTINGS_KEY && key !== this.WEIGHT_KEY) {
        dates.push(key.replace(this.KEY_PREFIX, ''));
      }
    }
    return dates.sort();
  },

  getRecordsInRange(startDate, endDate) {
    const records = [];
    const d = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (d <= end) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      records.push(this.getDayRecord(ds));
      d.setDate(d.getDate() + 1);
    }
    return records;
  },

  exportAll() {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.KEY_PREFIX) || key === this.WEIGHT_KEY || key === this.SETTINGS_KEY) {
        all[key] = JSON.parse(localStorage.getItem(key));
      }
    }
    return all;
  },

  importAll(data) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(this.KEY_PREFIX) || key === this.WEIGHT_KEY || key === this.SETTINGS_KEY) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  },

  clearAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.KEY_PREFIX) || key === this.WEIGHT_KEY) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
};
