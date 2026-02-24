const Utils = {
  MEAL_TYPES: {
    breakfast: { label: '早餐', icon: '🌅' },
    lunch: { label: '午餐', icon: '☀️' },
    dinner: { label: '晚餐', icon: '🌙' },
    snack: { label: '點心', icon: '🍪' }
  },

  EXERCISE_TYPES: ['跑步', '走路', '重訓', '游泳', '瑜珈', '騎車', '球類', '其他'],

  WEEKDAY_NAMES: ['日', '一', '二', '三', '四', '五', '六'],

  formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = this.WEEKDAY_NAMES[d.getDay()];
    return `${month}月${day}日（${weekday}）`;
  },

  formatDateFull(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  getMonthDays(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
};
