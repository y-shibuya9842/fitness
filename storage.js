(function (root) {
  let client = null;
  let user = null;

  function init() {
    const { supabaseUrl, supabasePublishableKey } = root.MYBODY_CONFIG || {};
    if (!supabaseUrl || !supabasePublishableKey) throw new Error("Supabase の接続設定が必要です。README の初期設定をご確認ください。");
    if (!root.supabase) throw new Error("接続ライブラリを読み込めませんでした。インターネット接続を確認して再読み込みしてください。");
    client = root.supabase.createClient(supabaseUrl, supabasePublishableKey);
  }
  function result(response) {
    if (response.error) throw response.error;
    return response.data;
  }
  async function session() {
    const data = result(await client.auth.getSession());
    user = data.session?.user || null;
    return user;
  }
  async function signIn(email, password) {
    const data = result(await client.auth.signInWithPassword({ email, password }));
    user = data.user;
    return user;
  }
  async function signUp(email, password) {
    const data = result(await client.auth.signUp({ email, password, options: { emailRedirectTo: new URL(".", root.location.href).href } }));
    user = data.session ? data.user : null;
    return user;
  }
  async function signOut() {
    result(await client.auth.signOut());
    user = null;
  }
  async function allRows(table) {
    const rows = [];
    const pageSize = 500;
    for (let from = 0;; from += pageSize) {
      const page = result(await client.from(table).select("data").eq("user_id", user.id).order("id").range(from, from + pageSize - 1));
      rows.push(...page.map(row => row.data));
      if (page.length < pageSize) return rows;
    }
  }
  async function load() {
    const [records, exercises, settingResponse] = await Promise.all([
      allRows("training_records"), allRows("custom_exercises"),
      client.from("user_settings").select("thresholds").eq("user_id", user.id).maybeSingle(),
    ]);
    return { records, exercises, thresholds: result(settingResponse)?.thresholds || null };
  }
  async function put(table, item) {
    result(await client.from(table).upsert({ user_id: user.id, id: item.id, data: item }, { onConflict: "user_id,id" }));
  }
  async function remove(table, id) {
    result(await client.from(table).delete().eq("user_id", user.id).eq("id", id));
  }
  async function saveThresholds(thresholds) {
    result(await client.from("user_settings").upsert({ user_id: user.id, thresholds }, { onConflict: "user_id" }));
  }
  async function importLegacy(records, exercises, thresholds) {
    result(await client.rpc("import_legacy_data", { records, exercises, old_thresholds: thresholds }));
  }
  root.MyBodyStorage = { init, session, signIn, signUp, signOut, load, put, remove, saveThresholds, importLegacy };
})(window);
