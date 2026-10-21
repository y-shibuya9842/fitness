const STORAGE_KEYS = {
  records: "mybody_records_v1",
  customExercises: "mybody_custom_exercises_v1",
  thresholds: "mybody_thresholds_v1",
};

const PARTS = [
  ["chest", "胸"], ["back", "背中"], ["shoulders", "肩"], ["arms", "腕"],
  ["abs", "腹筋"], ["glutes", "お尻"], ["thighs", "太もも"], ["calves", "ふくらはぎ"],
];

const DEFAULT_THRESHOLDS = { blue: 10, yellow: 30, red: 60 };
const POINT_DECAY_PER_HOUR = 1;
const { INTENSITIES, calculateEffort, pointsFor, dayNumber } = MyBodyCore;
const LIGHT_EXERCISES = new Set(["incline_push_up", "back_extension", "superman", "side_raise", "front_raise", "rear_raise", "kickback", "crunch", "bicycle_crunch", "hip_lift", "calf_raise"]);
const HARD_EXERCISES = new Set(["decline_push_up", "bench_press", "incline_bench_press", "pull_up", "chin_up", "deadlift", "pike_push_up", "ab_roller", "bulgarian_squat"]);
function defaultIntensity(ex) {
  return ex?.intensity || (LIGHT_EXERCISES.has(ex?.id) ? "light" : HARD_EXERCISES.has(ex?.id) ? "hard" : "moderate");
}
function intensityLabel(value) { return (INTENSITIES[value] || INTENSITIES.moderate).label; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

const DEFAULT_EXERCISES = [
  {id:"push_up",name:"プッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["chest",1],["arms",.5],["shoulders",.25]]},
  {id:"wide_push_up",name:"ワイドプッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["chest",1],["shoulders",.25]]},
  {id:"narrow_push_up",name:"ナロープッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["arms",1],["chest",.5]]},
  {id:"decline_push_up",name:"デクラインプッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["chest",1],["shoulders",.5],["arms",.5]]},
  {id:"incline_push_up",name:"インクラインプッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["chest",1],["arms",.5]]},
  {id:"dumbbell_press",name:"ダンベルプレス",category:"dumbbell",inputType:"reps",muscles:[["chest",1],["arms",.5],["shoulders",.5]]},
  {id:"dumbbell_fly",name:"ダンベルフライ",category:"dumbbell",inputType:"reps",muscles:[["chest",1],["shoulders",.25]]},
  {id:"bench_press",name:"ベンチプレス",category:"barbell",inputType:"reps",muscles:[["chest",1],["arms",.5],["shoulders",.5]]},
  {id:"incline_bench_press",name:"インクラインベンチプレス",category:"barbell",inputType:"reps",muscles:[["chest",1],["shoulders",.5],["arms",.5]]},
  {id:"pull_up",name:"懸垂",category:"bodyweight",inputType:"reps",muscles:[["back",1],["arms",.5]]},
  {id:"chin_up",name:"チンニング",category:"bodyweight",inputType:"reps",muscles:[["back",1],["arms",.5]]},
  {id:"one_arm_row",name:"ワンハンドダンベルロー",category:"dumbbell",inputType:"reps",muscles:[["back",1],["arms",.5]]},
  {id:"bent_over_dumbbell_row",name:"ダンベルベントオーバーロー",category:"dumbbell",inputType:"reps",muscles:[["back",1],["arms",.5]]},
  {id:"back_extension",name:"バックエクステンション",category:"bodyweight",inputType:"reps",muscles:[["back",1],["glutes",.5]]},
  {id:"superman",name:"スーパーマン",category:"bodyweight",inputType:"reps",muscles:[["back",1],["glutes",.5]]},
  {id:"lat_pulldown",name:"ラットプルダウン",category:"machine",inputType:"reps",muscles:[["back",1],["arms",.5]]},
  {id:"seated_row",name:"シーテッドロー",category:"machine",inputType:"reps",muscles:[["back",1],["arms",.5]]},
  {id:"deadlift",name:"デッドリフト",category:"barbell",inputType:"reps",muscles:[["back",1],["glutes",1],["thighs",.5]]},
  {id:"pike_push_up",name:"パイクプッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["shoulders",1],["arms",.5]]},
  {id:"dumbbell_shoulder_press",name:"ダンベルショルダープレス",category:"dumbbell",inputType:"reps",muscles:[["shoulders",1],["arms",.5]]},
  {id:"side_raise",name:"サイドレイズ",category:"dumbbell",inputType:"reps",muscles:[["shoulders",1]]},
  {id:"front_raise",name:"フロントレイズ",category:"dumbbell",inputType:"reps",muscles:[["shoulders",1]]},
  {id:"rear_raise",name:"リアレイズ",category:"dumbbell",inputType:"reps",muscles:[["shoulders",1],["back",.5]]},
  {id:"dumbbell_curl",name:"ダンベルカール",category:"dumbbell",inputType:"reps",muscles:[["arms",1]]},
  {id:"hammer_curl",name:"ハンマーカール",category:"dumbbell",inputType:"reps",muscles:[["arms",1]]},
  {id:"french_press",name:"フレンチプレス",category:"dumbbell",inputType:"reps",muscles:[["arms",1]]},
  {id:"kickback",name:"キックバック",category:"dumbbell",inputType:"reps",muscles:[["arms",1]]},
  {id:"reverse_push_up",name:"リバースプッシュアップ",category:"bodyweight",inputType:"reps",muscles:[["arms",1],["chest",.25]]},
  {id:"triceps_pushdown",name:"トライセプスプッシュダウン",category:"machine",inputType:"reps",muscles:[["arms",1]]},
  {id:"ab_roller",name:"腹筋ローラー",category:"equipment",inputType:"reps",muscles:[["abs",1],["shoulders",.25],["arms",.25]]},
  {id:"crunch",name:"クランチ",category:"bodyweight",inputType:"reps",muscles:[["abs",1]]},
  {id:"sit_up",name:"シットアップ",category:"bodyweight",inputType:"reps",muscles:[["abs",1]]},
  {id:"leg_raise",name:"レッグレイズ",category:"bodyweight",inputType:"reps",muscles:[["abs",1]]},
  {id:"bicycle_crunch",name:"バイシクルクランチ",category:"bodyweight",inputType:"reps",muscles:[["abs",1]]},
  {id:"mountain_climber",name:"マウンテンクライマー",category:"bodyweight",inputType:"reps",muscles:[["abs",1],["shoulders",.25]]},
  {id:"plank",name:"プランク",category:"bodyweight",inputType:"duration",muscles:[["abs",1],["shoulders",.25]]},
  {id:"side_plank",name:"サイドプランク",category:"bodyweight",inputType:"duration",muscles:[["abs",1],["shoulders",.25]]},
  {id:"squat",name:"スクワット",category:"bodyweight",inputType:"reps",muscles:[["thighs",1],["glutes",1]]},
  {id:"wide_squat",name:"ワイドスクワット",category:"bodyweight",inputType:"reps",muscles:[["thighs",1],["glutes",1]]},
  {id:"bulgarian_squat",name:"ブルガリアンスクワット",category:"bodyweight",inputType:"reps",muscles:[["thighs",1],["glutes",1]]},
  {id:"lunge",name:"ランジ",category:"bodyweight",inputType:"reps",muscles:[["thighs",1],["glutes",1]]},
  {id:"reverse_lunge",name:"リバースランジ",category:"bodyweight",inputType:"reps",muscles:[["thighs",1],["glutes",1]]},
  {id:"hip_lift",name:"ヒップリフト",category:"bodyweight",inputType:"reps",muscles:[["glutes",1],["thighs",.5]]},
  {id:"hip_thrust",name:"ヒップスラスト",category:"bodyweight",inputType:"reps",muscles:[["glutes",1],["thighs",.5]]},
  {id:"wall_sit",name:"ウォールシット",category:"bodyweight",inputType:"duration",muscles:[["thighs",1],["glutes",.5]]},
  {id:"calf_raise",name:"カーフレイズ",category:"bodyweight",inputType:"reps",muscles:[["calves",1]]},
  {id:"leg_press",name:"レッグプレス",category:"machine",inputType:"reps",muscles:[["thighs",1],["glutes",.5]]},
  {id:"leg_extension",name:"レッグエクステンション",category:"machine",inputType:"reps",muscles:[["thighs",1]]},
  {id:"leg_curl",name:"レッグカール",category:"machine",inputType:"reps",muscles:[["thighs",1]]},
].map(e => ({...e, muscles:e.muscles.map(([part,weight])=>({part,weight})), isCustom:false}));

let selectedExerciseId = null;
let selectedFilter = "all";
let editingCustomId = null;

let appData = { records: [], exercises: [], thresholds: null };
function getRecords() { return appData.records; }
function getCustomExercises() { return appData.exercises; }
function getThresholds() { return appData.thresholds || DEFAULT_THRESHOLDS; }
function getExercises() { return [...DEFAULT_EXERCISES, ...getCustomExercises()]; }
function findExercise(id) { return getExercises().find(e => e.id === id); }

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0,10);
}
function formatDateJP(dateString) {
  const d = new Date(dateString + "T00:00:00");
  return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(d);
}
function buildPerformedAt(dateString) {
  const now = new Date();
  if (dateString === localDateString(now)) return now.toISOString();
  const d = new Date(dateString + "T12:00:00");
  return d.toISOString();
}
function calcCurrentPoints(now = new Date()) {
  const thresholds = getThresholds();
  const maxPoints = thresholds.red;
  const points = Object.fromEntries(PARTS.map(([k]) => [k, 0]));
  const lastUpdatedAt = Object.fromEntries(PARTS.map(([k]) => [k, null]));

  // 記録時点ごとに「1時間あたり1ptの線形減衰 → 加算 → 赤閾値で上限」の順に計算する。
  // 30分なら0.5pt、90分なら1.5pt減るため、時間に比例してリアルタイムに戻る。
  // 赤を超えるトレーニング量は内部ポイントとして蓄積しない。
  const records = getRecords()
    .map(record => ({...record, performed: new Date(record.performedAt)}))
    .filter(record => !Number.isNaN(record.performed.getTime()) && record.performed <= now)
    .sort((a,b) => a.performed - b.performed);

  for (const record of records) {
    const ex = findExercise(record.exerciseId);
    if (!ex) continue;
    // 旧記録はこれまでの計算を維持するため中度として扱う。
    const base = pointsFor(ex, Number(record.value) || 0, record.intensity || "moderate");

    for (const m of ex.muscles) {
      const last = lastUpdatedAt[m.part];
      if (last) {
        const elapsedHours = Math.max(0, (record.performed - last) / 36e5);
        points[m.part] = Math.max(0, points[m.part] - elapsedHours * POINT_DECAY_PER_HOUR);
      }
      points[m.part] = Math.min(maxPoints, points[m.part] + base * m.weight);
      lastUpdatedAt[m.part] = record.performed;
    }
  }

  for (const [part] of PARTS) {
    const last = lastUpdatedAt[part];
    if (!last) continue;
    const elapsedHours = Math.max(0, (now - last) / 36e5);
    points[part] = Math.max(0, points[part] - elapsedHours * POINT_DECAY_PER_HOUR);
  }

  return points;
}
function hexToRgb(hex) {
  const h = hex.replace("#","");
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function mixColor(a,b,t) {
  const A=hexToRgb(a), B=hexToRgb(b);
  return `rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`;
}
function getBodyPartColor(p, t) {
  const WHITE="#ffffff", BLUE="#2f80ed", YELLOW="#ffd84d", RED="#ef4444";
  if (p <= 0) return WHITE;
  if (p < t.blue) return mixColor(WHITE,BLUE,p/t.blue);
  if (p < t.yellow) return mixColor(BLUE,YELLOW,(p-t.blue)/(t.yellow-t.blue));
  if (p < t.red) return mixColor(YELLOW,RED,(p-t.yellow)/(t.red-t.yellow));
  return RED;
}
function unitText(ex) { return ex.inputType === "duration" ? "秒" : "回"; }
function categoryLabel(c) {
  return {bodyweight:"自重",dumbbell:"ダンベル",equipment:"器具",machine:"マシン",barbell:"バーベル",custom:"ユーザー作成"}[c] || escapeHtml(c);
}
function muscleNames(ex) {
  return ex.muscles.map(m => PARTS.find(p=>p[0]===m.part)?.[1] || escapeHtml(m.part)).join("・");
}

function renderHome() {
  const thresholds = getThresholds();
  const points = calcCurrentPoints();
  document.querySelectorAll(".muscle-part").forEach(el => {
    const color = getBodyPartColor(points[el.dataset.part] || 0, thresholds);
    el.style.fill = color;
  });
}

function renderRecordRows(records, container) {
  if (!records.length) { container.innerHTML = `<div class="empty-state">記録はまだありません</div>`; return; }
  container.innerHTML = records.map(r => {
    const ex = findExercise(r.exerciseId);
    if (!ex) return "";
    return `<div class="record-row">
      <div class="record-main"><strong>${escapeHtml(ex.name)}</strong><span>${muscleNames(ex)} / ${intensityLabel(r.intensity)}</span></div>
      <div class="record-value">${Number(r.value)}${unitText(ex)}</div>
    </div>`;
  }).join("");
}

function renderHistory() {
  const records = [...getRecords()].sort((a,b)=>new Date(b.performedAt)-new Date(a.performedAt));
  const groups = {};
  for (const r of records) (groups[r.date] ||= []).push(r);
  const html = Object.keys(groups).sort().reverse().map(date => `
    <div class="card history-day">
      <div class="history-date">${formatDateJP(date)}</div>
      <div class="record-list">${groups[date].map(r=>{
        const ex=findExercise(r.exerciseId); if(!ex) return "";
        return `<div class="record-row"><div class="record-main"><strong>${escapeHtml(ex.name)}</strong><span>${muscleNames(ex)} / ${intensityLabel(r.intensity)}</span></div><div class="record-value">${Number(r.value)}${unitText(ex)}</div></div>`
      }).join("")}</div>
    </div>`).join("");
  document.getElementById("history-list").innerHTML = html || `<div class="empty-state">履歴はまだありません</div>`;
}

function renderEffort() {
  const effort = calculateEffort(getRecords(), localDateString());
  const yen = value => `¥${value.toLocaleString("ja-JP")}`;
  document.getElementById("effort-total").textContent = yen(effort.total);
  document.getElementById("effort-days").textContent = `トレーニング ${effort.trainingDays}日`;
  document.getElementById("effort-consecutive").textContent = yen(effort.consecutiveCount * 100);
  document.getElementById("effort-consecutive-count").textContent = `${effort.consecutiveCount}回 × 100円`;
  document.getElementById("effort-weekly").textContent = yen(effort.weeklyCount * 100);
  document.getElementById("effort-weekly-count").textContent = `${effort.weeklyCount}回 × 100円`;
  document.getElementById("effort-pace").textContent = `直近7日 ${effort.recentSevenDays}日 / 継続 ${effort.streak}日`;
}

function renderThresholds() {
  const t = getThresholds();
  document.getElementById("threshold-blue").value = t.blue;
  document.getElementById("threshold-yellow").value = t.yellow;
  document.getElementById("threshold-red").value = t.red;
}
function renderExerciseMaster() {
  const q = document.getElementById("settings-exercise-search").value.trim().toLowerCase();
  const items = getExercises().filter(e => e.name.toLowerCase().includes(q));
  document.getElementById("exercise-master-list").innerHTML = items.map(e => `
    <div class="master-item">
      <div><strong>${escapeHtml(e.name)}</strong><small>${categoryLabel(e.category)} / ${e.inputType==="duration"?"時間":"回数"} / ${muscleNames(e)} / 標準 ${intensityLabel(defaultIntensity(e))}</small></div>
      <div class="master-actions">
        ${e.isCustom ? `<button class="link-button" data-edit="${escapeHtml(e.id)}">編集</button><button class="link-button danger" data-delete="${escapeHtml(e.id)}">削除</button>` : ""}
      </div>
    </div>
  `).join("");
}

function openRegister() {
  document.getElementById("record-date").value = localDateString();
  document.getElementById("record-value").value = "";
  document.getElementById("register-message").textContent = "";
  selectedExerciseId = null;
  document.getElementById("selected-exercise-label").textContent = "種目を選択";
  document.getElementById("record-intensity").value = "moderate";
  updateValueField(null);
  document.getElementById("register-backdrop").classList.remove("hidden");
}
function closeRegister() { document.getElementById("register-backdrop").classList.add("hidden"); }
function updateValueField(ex) {
  document.getElementById("value-label").textContent = ex?.inputType === "duration" ? "時間" : "回数";
  document.getElementById("value-unit").textContent = ex?.inputType === "duration" ? "秒" : "回";
}

function renderPartFilter() {
  const chips = [["all","すべて"],...PARTS];
  document.getElementById("part-filter").innerHTML = chips.map(([key,label])=>`<button class="chip ${selectedFilter===key?"active":""}" data-filter="${key}">${label}</button>`).join("");
}
function renderExercisePicker() {
  renderPartFilter();
  const q = document.getElementById("exercise-search").value.trim().toLowerCase();
  let items = getExercises();
  if (selectedFilter !== "all") items = items.filter(e => e.muscles.some(m=>m.part===selectedFilter));
  if (q) items = items.filter(e => e.name.toLowerCase().includes(q));
  document.getElementById("exercise-picker-list").innerHTML = items.map(e=>`
    <div class="picker-item"><button data-pick="${escapeHtml(e.id)}"><strong>${escapeHtml(e.name)}</strong><small>${e.inputType==="duration"?"時間":"回数"} / ${muscleNames(e)} / 標準 ${intensityLabel(defaultIntensity(e))}</small></button></div>
  `).join("") || `<div class="empty-state">該当する種目がありません</div>`;
}

function openExerciseEditor(id=null) {
  editingCustomId = id;
  const ex = id ? getCustomExercises().find(x=>x.id===id) : null;
  document.getElementById("exercise-editor-title").textContent = ex ? "種目を編集" : "種目を追加";
  document.getElementById("custom-name").value = ex?.name || "";
  document.getElementById("custom-input-type").value = ex?.inputType || "reps";
  document.getElementById("custom-intensity").value = defaultIntensity(ex);
  document.getElementById("custom-message").textContent = "";
  document.getElementById("custom-muscles").innerHTML = PARTS.map(([key,label])=>{
    const existing=ex?.muscles.find(m=>m.part===key);
    return `<div class="muscle-config-row">
      <input type="checkbox" data-muscle-check="${key}" ${existing?"checked":""}>
      <span>${label}</span>
      <select data-muscle-weight="${key}">
        ${[1,0.5,0.25].map(w=>`<option value="${w}" ${existing?.weight===w?"selected":""}>${w}</option>`).join("")}
      </select>
    </div>`;
  }).join("");
  document.getElementById("exercise-editor-backdrop").classList.remove("hidden");
}
function closeExerciseEditor(){ document.getElementById("exercise-editor-backdrop").classList.add("hidden"); }

document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b===btn));
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+btn.dataset.target).classList.add("active");
  if(btn.dataset.target==="home") renderHome();
  if(btn.dataset.target==="history") renderHistory();
  if(btn.dataset.target==="effort") renderEffort();
  if(btn.dataset.target==="settings"){ renderThresholds(); renderExerciseMaster(); }
}));

["open-register","open-register-header"].forEach(id=>document.getElementById(id).addEventListener("click",openRegister));
["close-register","cancel-register"].forEach(id=>document.getElementById(id).addEventListener("click",closeRegister));

document.getElementById("open-exercise-picker").addEventListener("click",()=>{
  selectedFilter="all"; document.getElementById("exercise-search").value=""; renderExercisePicker();
  document.getElementById("picker-backdrop").classList.remove("hidden");
});
document.getElementById("close-picker").addEventListener("click",()=>document.getElementById("picker-backdrop").classList.add("hidden"));
document.getElementById("part-filter").addEventListener("click",e=>{
  const b=e.target.closest("[data-filter]"); if(!b)return; selectedFilter=b.dataset.filter; renderExercisePicker();
});
document.getElementById("exercise-search").addEventListener("input",renderExercisePicker);
document.getElementById("exercise-picker-list").addEventListener("click",e=>{
  const b=e.target.closest("[data-pick]"); if(!b)return;
  selectedExerciseId=b.dataset.pick;
  const ex=findExercise(selectedExerciseId);
  document.getElementById("selected-exercise-label").textContent=ex.name;
  updateValueField(ex);
  document.getElementById("record-intensity").value=defaultIntensity(ex);
  document.getElementById("record-value").value="";
  document.getElementById("picker-backdrop").classList.add("hidden");
});

document.getElementById("save-record").addEventListener("click",async e=>{
  const btn=e.currentTarget;
  const msg=document.getElementById("register-message"); msg.textContent="";
  const date=document.getElementById("record-date").value;
  const value=Number(document.getElementById("record-value").value);
  const ex=findExercise(selectedExerciseId);
  if(!date){msg.textContent="日付を選択してください。";return;}
  if(!Number.isFinite(dayNumber(date)) || date > localDateString()){msg.textContent="今日以前の日付を選択してください。";return;}
  if(!ex){msg.textContent="種目を選択してください。";return;}
  if(!Number.isInteger(value)||value<1){msg.textContent=`${ex.inputType==="duration"?"時間":"回数"}は1以上の整数で入力してください。`;return;}
  const record={id:crypto.randomUUID?.()||String(Date.now()),date,performedAt:buildPerformedAt(date),exerciseId:ex.id,value,intensity:document.getElementById("record-intensity").value,createdAt:new Date().toISOString()};
  btn.disabled=true;
  try {
    await MyBodyStorage.put("training_records", record);
    appData.records.push(record);
    closeRegister(); renderHome(); renderHistory(); renderEffort();
  } catch(error) { msg.textContent = `保存できませんでした。${error.message || "接続をご確認ください。"}`; }
  finally { btn.disabled=false; }
});

document.getElementById("save-thresholds").addEventListener("click",async e=>{
  const btn=e.currentTarget;
  const blue=Number(document.getElementById("threshold-blue").value);
  const yellow=Number(document.getElementById("threshold-yellow").value);
  const red=Number(document.getElementById("threshold-red").value);
  const msg=document.getElementById("threshold-message");
  if(!(blue>0 && yellow>blue && red>yellow)){ msg.textContent="0 < 青 < 黄 < 赤 になるよう設定してください。"; return; }
  btn.disabled=true;
  try { await MyBodyStorage.saveThresholds({blue,yellow,red}); appData.thresholds={blue,yellow,red}; msg.style.color="#2d8a55"; msg.textContent="保存しました。"; renderHome(); }
  catch(error) { msg.style.color=""; msg.textContent=`保存できませんでした。${error.message || "接続をご確認ください。"}`; }
  finally { btn.disabled=false; }
});

document.getElementById("settings-exercise-search").addEventListener("input",renderExerciseMaster);
document.getElementById("open-exercise-editor").addEventListener("click",()=>openExerciseEditor());
["close-exercise-editor","cancel-exercise-editor"].forEach(id=>document.getElementById(id).addEventListener("click",closeExerciseEditor));

document.getElementById("exercise-master-list").addEventListener("click",async e=>{
  const edit=e.target.closest("[data-edit]"); const del=e.target.closest("[data-delete]");
  if(edit) openExerciseEditor(edit.dataset.edit);
  if(del){
    if(getRecords().some(r=>r.exerciseId===del.dataset.delete)){ alert("この種目は履歴で使用されているため削除できません。履歴を残すため、種目を編集してご利用ください。"); return; }
    if(!confirm("この種目を削除しますか？")) return;
    del.disabled=true;
    try { await MyBodyStorage.remove("custom_exercises", del.dataset.delete); appData.exercises=appData.exercises.filter(x=>x.id!==del.dataset.delete); renderExerciseMaster(); }
    catch(error) { alert(`削除できませんでした。${error.message || "接続をご確認ください。"}`); del.disabled=false; }
  }
});

document.getElementById("save-custom-exercise").addEventListener("click",async e=>{
  const btn=e.currentTarget;
  const name=document.getElementById("custom-name").value.trim();
  const inputType=document.getElementById("custom-input-type").value;
  const intensity=document.getElementById("custom-intensity").value;
  const msg=document.getElementById("custom-message"); msg.textContent="";
  const muscles=[];
  document.querySelectorAll("[data-muscle-check]").forEach(ch=>{
    if(ch.checked){
      const key=ch.dataset.muscleCheck;
      const weight=Number(document.querySelector(`[data-muscle-weight="${key}"]`).value);
      muscles.push({part:key,weight});
    }
  });
  if(!name){msg.textContent="種目名を入力してください。";return;}
  if(!muscles.length){msg.textContent="対象部位を1つ以上選択してください。";return;}
  const customs=[...getCustomExercises()];
  let exercise;
  if(editingCustomId){
    const i=customs.findIndex(x=>x.id===editingCustomId);
    if(i<0){msg.textContent="種目が見つかりません。再読み込みしてください。";return;}
    exercise={...customs[i],name,inputType,intensity,muscles}; customs[i]=exercise;
  } else {
    exercise={id:"custom_"+(crypto.randomUUID?.()||Date.now()),name,category:"custom",inputType,intensity,isCustom:true,muscles}; customs.push(exercise);
  }
  btn.disabled=true;
  try { await MyBodyStorage.put("custom_exercises",exercise); appData.exercises=customs; closeExerciseEditor(); renderExerciseMaster(); renderExercisePicker(); renderHome(); renderHistory(); }
  catch(error) { msg.textContent=`保存できませんでした。${error.message || "接続をご確認ください。"}`; }
  finally { btn.disabled=false; }
});

function renderAll() { renderHome(); renderHistory(); renderEffort(); renderThresholds(); renderExerciseMaster(); }
function validateImport(records, exercises, thresholds) {
  const validRecords=Array.isArray(records) && records.every(r=>r && typeof r.id==="string" && r.id && Number.isFinite(dayNumber(r.date)) && typeof r.exerciseId==="string" && r.exerciseId && Number.isFinite(new Date(r.performedAt).getTime()) && Number.isInteger(r.value) && r.value>0);
  const validExercises=Array.isArray(exercises) && exercises.every(x=>x && typeof x.id==="string" && x.id && typeof x.name==="string" && x.name.trim() && ["reps","duration"].includes(x.inputType) && Array.isArray(x.muscles) && x.muscles.length && x.muscles.every(m=>m && PARTS.some(([part])=>part===m.part) && [1,.5,.25].includes(m.weight)));
  const validThresholds=thresholds===null || (thresholds && Number.isFinite(thresholds.blue) && thresholds.blue>0 && thresholds.yellow>thresholds.blue && Number.isFinite(thresholds.yellow) && thresholds.red>thresholds.yellow && Number.isFinite(thresholds.red));
  if(!validRecords || !validExercises || !validThresholds) throw new Error("データの形式が正しくありません。元のデータは変更していません。");
}
async function enterApp(user) {
  appData = await MyBodyStorage.load();
  document.getElementById("account-email").textContent = user.email || "";
  document.getElementById("account-message").textContent = "";
  renderAll();
  document.getElementById("auth-overlay").classList.add("hidden");
}
function authError(error) { document.getElementById("auth-message").textContent = `接続できませんでした。${error.message || "設定をご確認ください。"}`; }
document.getElementById("auth-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=document.getElementById("sign-in"); btn.disabled=true;
  try { await enterApp(await MyBodyStorage.signIn(document.getElementById("auth-email").value.trim(),document.getElementById("auth-password").value)); }
  catch(error) { authError(error); }
  finally { btn.disabled=false; }
});
document.getElementById("sign-up").addEventListener("click",async e=>{
  const btn=e.currentTarget;
  const form=document.getElementById("auth-form"); if(!form.reportValidity()) return;
  btn.disabled=true;
  try {
    const user=await MyBodyStorage.signUp(document.getElementById("auth-email").value.trim(),document.getElementById("auth-password").value);
    if(user) await enterApp(user);
    else document.getElementById("auth-message").textContent="確認メールを送信しました。メール内のリンクで認証してからログインしてください。";
  } catch(error) { authError(error); }
  finally { btn.disabled=false; }
});
document.getElementById("sign-out").addEventListener("click",async e=>{
  const btn=e.currentTarget; btn.disabled=true;
  try { await MyBodyStorage.signOut(); appData={records:[],exercises:[],thresholds:null}; document.getElementById("auth-password").value=""; document.getElementById("auth-overlay").classList.remove("hidden"); }
  catch(error) { document.getElementById("account-message").textContent=`ログアウトできませんでした。${error.message || ""}`; }
  finally { btn.disabled=false; }
});
document.getElementById("import-legacy").addEventListener("click",async e=>{
  const msg=document.getElementById("account-message");
  msg.textContent="";
  const btn=e.currentTarget; btn.disabled=true;
  try {
    const read = key => { const raw=localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); };
    const records=read(STORAGE_KEYS.records) || [];
    const exercises=read(STORAGE_KEYS.customExercises) || [];
    const thresholds=read(STORAGE_KEYS.thresholds);
    validateImport(records,exercises,thresholds);
    if(!records.length && !exercises.length && !thresholds) { msg.textContent="このブラウザに移行対象の旧データはありません。"; return; }
    await MyBodyStorage.importLegacy(records,exercises,thresholds);
    appData=await MyBodyStorage.load(); renderAll();
    msg.textContent="旧データを移行しました。同じ記録の重複は追加されません。";
  } catch(error) { msg.textContent=`移行できませんでした。${error.message || "接続をご確認ください。"}`; }
  finally { btn.disabled=false; }
});
document.getElementById("export-data").addEventListener("click",async e=>{
  const btn=e.currentTarget; btn.disabled=true;
  try {
    appData=await MyBodyStorage.load(); renderAll();
    const file=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),...appData},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(file); const a=document.createElement("a"); a.href=url; a.download=`mybody-${localDateString()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(error) { document.getElementById("account-message").textContent=`バックアップできませんでした。${error.message || "接続をご確認ください。"}`; }
  finally { btn.disabled=false; }
});
document.getElementById("restore-data").addEventListener("click",()=>document.getElementById("backup-file").click());
document.getElementById("backup-file").addEventListener("change",async e=>{
  const input=e.currentTarget; const file=input.files[0]; if(!file) return;
  const msg=document.getElementById("account-message");
  msg.textContent="";
  const btn=document.getElementById("restore-data"); btn.disabled=true;
  try {
    const data=JSON.parse(await file.text());
    validateImport(data.records,data.exercises,data.thresholds ?? null);
    await MyBodyStorage.importLegacy(data.records,data.exercises,data.thresholds || null);
    appData=await MyBodyStorage.load(); renderAll(); msg.textContent="バックアップからデータを追加しました。";
  } catch(error) { msg.textContent=`追加できませんでした。${error.message || "接続をご確認ください。"}`; }
  finally { input.value=""; btn.disabled=false; }
});
document.addEventListener("DOMContentLoaded",async ()=>{
  try { MyBodyStorage.init(); const user=await MyBodyStorage.session(); if(user) await enterApp(user); }
  catch(error) { authError(error); }
  setInterval(renderHome, 1000);
});

document.addEventListener("visibilitychange",()=>{
  if (!document.hidden) renderHome();
});
