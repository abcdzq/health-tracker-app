const Utils = {
  MEAL_TYPES: {
    breakfast: { label: '早餐', icon: '🌅' },
    lunch: { label: '午餐', icon: '☀️' },
    dinner: { label: '晚餐', icon: '🌙' },
    snack: { label: '點心', icon: '🍪' }
  },

  EXERCISE_TYPES: ['跑步', '走路', '重訓', '游泳', '瑜珈', '騎車', '球類', '其他'],

  WEEKDAY_NAMES: ['日', '一', '二', '三', '四', '五', '六'],

  WATER_AMOUNTS: [
    { label: '小杯', ml: 250, icon: '🥛' },
    { label: '中杯', ml: 500, icon: '🥤' },
    { label: '大杯', ml: 750, icon: '🫗' }
  ],

  formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}月${d.getDate()}日（${this.WEEKDAY_NAMES[d.getDay()]}）`;
  },

  formatDateFull(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  getMonthDays(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  },

  getWeekRange(date) {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: this._toDateStr(monday),
      end: this._toDateStr(sunday)
    };
  },

  getMonthRange(date) {
    const d = new Date(date + 'T00:00:00');
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      start: this._toDateStr(first),
      end: this._toDateStr(last)
    };
  },

  _toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
};
