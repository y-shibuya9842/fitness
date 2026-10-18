(function (root) {
  const INTENSITIES = {
    light: { label: "軽度", multiplier: 0.75 },
    moderate: { label: "中度", multiplier: 1 },
    hard: { label: "重度", multiplier: 1.5 },
  };

  // 日付だけを UTC で扱い、夏時間やタイムゾーンによる日数のずれを防ぐ。
  function dayNumber(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return NaN;
    const n = Date.parse(`${date}T00:00:00Z`);
    return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === date ? n / 86400000 : NaN;
  }

  function calculateEffort(records, today) {
    const todayNumber = dayNumber(today);
    const days = [...new Set(records.map(r => dayNumber(r.date)).filter(n => Number.isFinite(n) && n <= todayNumber))].sort((a, b) => a - b);
    let consecutiveCount = 0, weeklyCount = 0, previous = null, week = null, daysInWeek = 0;
    for (const day of days) {
      // 1970-01-01 は木曜日。月曜日を週の始まりにする。
      const monday = day - ((day + 3) % 7 + 7) % 7;
      if (monday !== week) { week = monday; daysInWeek = 0; }
      daysInWeek++;
      if (previous !== null && day === previous + 1) consecutiveCount++;
      if (daysInWeek >= 3) weeklyCount++;
      previous = day;
    }
    let streak = 0;
    if (days.length && days[days.length - 1] >= todayNumber - 1) {
      streak = 1;
      for (let i = days.length - 1; i > 0 && days[i] === days[i - 1] + 1; i--) streak++;
    }
    const thisMonday = todayNumber - ((todayNumber + 3) % 7 + 7) % 7;
    const thisWeekDays = days.filter(day => day >= thisMonday).length;
    return { consecutiveCount, weeklyCount, total: (consecutiveCount + weeklyCount) * 100, trainingDays: days.length, streak, thisWeekDays };
  }

  function pointsFor(exercise, value, intensity = "moderate") {
    const base = exercise.inputType === "duration" ? value / 3 : value;
    return base * (INTENSITIES[intensity]?.multiplier ?? 1);
  }

  const api = { INTENSITIES, dayNumber, calculateEffort, pointsFor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MyBodyCore = api;
})(typeof window !== "undefined" ? window : globalThis);
