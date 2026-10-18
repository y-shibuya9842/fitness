const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateEffort, pointsFor, dayNumber } = require('../core.js');

test('月曜から7日間の例は1,100円、同日の複数記録は一日', () => {
  const records = Array.from({length:7}, (_, i) => ({date:`2026-10-${String(12+i).padStart(2,'0')}`}));
  records.push({date:'2026-10-14'});
  assert.deepEqual(calculateEffort(records, '2026-10-18'), { consecutiveCount:6, weeklyCount:5, total:1100, trainingDays:7, streak:7, thisWeekDays:7 });
});

test('週をまたいでも連日は続き、週3日の判定は月曜にリセット', () => {
  const records = ['2026-10-17','2026-10-18','2026-10-19','2026-10-21','2026-10-22'].map(date=>({date}));
  assert.deepEqual(calculateEffort(records, '2026-10-22'), {consecutiveCount:3, weeklyCount:1, total:400, trainingDays:5, streak:2, thisWeekDays:3});
});

test('未来日と不正な日付は集計せず、連続日数は昨日までなら維持', () => {
  const records = ['2026-10-15','2026-10-16','2026-10-18','2026-02-30','bad'].map(date=>({date}));
  assert.deepEqual(calculateEffort(records, '2026-10-17'), {consecutiveCount:1, weeklyCount:0, total:100, trainingDays:2, streak:2, thisWeekDays:2});
  assert.equal(calculateEffort(records, '2026-10-20').streak, 0);
  assert.ok(Number.isNaN(dayNumber('2026-02-30')));
});

test('負荷と時間・部位係数の計算、旧記録は中度', () => {
  const reps = {inputType:'reps'};
  const duration = {inputType:'duration'};
  assert.equal(pointsFor(reps, 20, 'light'), 15);
  assert.equal(pointsFor(reps, 20, 'moderate'), 20);
  assert.equal(pointsFor(reps, 20, 'hard'), 30);
  assert.equal(pointsFor(duration, 60, 'hard') * 0.5, 15);
  assert.equal(pointsFor(reps, 20), 20);
});
