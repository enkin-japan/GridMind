// 料金プランと利用上限の管理。
//
// API キーはサービス側が持つため、費用はそのままこちらの負担になる。
// そこで「月あたりの取り込み回数」と「1ファイルの文字数」の二本立てで上限をかける。
// 回数だけだと巨大なファイルで費用が跳ね上がり、文字数だけだと回数で押し切られるため、
// 両方そろえて初めて費用の上限が読める（例：フリーは 30回 × 2万字 = 月60万字が最悪値）。
const { run, get, all } = require('../models/db');
const ai = require('./ai');

const PLANS = {
  free: {
    key: 'free',
    label: 'フリー',
    monthlyIngests: Number(process.env.PLAN_FREE_INGESTS) || 30,
    maxDocChars: Number(process.env.PLAN_FREE_DOC_CHARS) || 20000,
    price: '無料',
  },
  pro: {
    key: 'pro',
    label: 'プロ',
    monthlyIngests: Number(process.env.PLAN_PRO_INGESTS) || 500,
    maxDocChars: Number(process.env.PLAN_PRO_DOC_CHARS) || 60000,
    price: '有料',
  },
};

function planOf(user) {
  const key = (user && user.plan) || 'free';
  return PLANS[key] || PLANS.free;
}

// 現在の集計期間（JST の年月）。月がかわると自動的に枠が戻る。
function currentPeriod() {
  const jst = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return jst.slice(0, 7); // 'YYYY-MM'
}

function nowJst() {
  const jst = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
  return jst.replace(' ', 'T') + '+09:00';
}

// 今月の使用状況をまとめて返す。
async function usageFor(userId) {
  const period = currentPeriod();
  const row = await get(
    `SELECT COUNT(*) AS ingests,
            COALESCE(SUM(doc_chars), 0)  AS chars,
            COALESCE(SUM(in_tokens), 0)  AS in_tokens,
            COALESCE(SUM(out_tokens), 0) AS out_tokens,
            COALESCE(SUM(cached_in), 0)  AS cached_in,
            COALESCE(SUM(cost_usd), 0)   AS cost_usd
       FROM usage_log
      WHERE user_id = ? AND period = ? AND kind = 'ingest'`,
    [userId, period]
  );
  return {
    period,
    ingests: (row && row.ingests) || 0,
    chars: (row && row.chars) || 0,
    inTokens: (row && row.in_tokens) || 0,
    outTokens: (row && row.out_tokens) || 0,
    cachedIn: (row && row.cached_in) || 0,
    costUsd: (row && row.cost_usd) || 0,
  };
}

// 取り込みを実行してよいか確かめる。
// docChars を渡すと1ファイルの文字数上限も見る（変換後に呼ぶ）。
// 戻り値: { ok: true, plan, usage } / { ok: false, reason, message, plan, usage }
async function check(user, docChars = 0) {
  const plan = planOf(user);
  const usage = await usageFor(user.id);

  if (usage.ingests >= plan.monthlyIngests) {
    return {
      ok: false,
      reason: 'MONTHLY_LIMIT',
      message:
        `今月の取り込み回数の上限（${plan.monthlyIngests}回）に達しました。` +
        `来月になると回数が戻ります。もっと使う場合はプランの変更をご検討ください。`,
      plan,
      usage,
    };
  }

  if (docChars > plan.maxDocChars) {
    return {
      ok: false,
      reason: 'DOC_TOO_LARGE',
      message:
        `このファイルは ${docChars.toLocaleString()} 文字あり、` +
        `${plan.label}プランの上限（1ファイル ${plan.maxDocChars.toLocaleString()} 文字）を超えています。` +
        `ファイルを分けるか、プランの変更をご検討ください。`,
      plan,
      usage,
    };
  }

  return { ok: true, plan, usage };
}

// 実際に使った分を記録する（費用の把握と、上限判定の材料になる）。
async function record(userId, { kind = 'ingest', docChars = 0, usage = {} } = {}) {
  await run(
    `INSERT INTO usage_log (user_id, period, kind, doc_chars, in_tokens, out_tokens, calls, cached_in, cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      currentPeriod(),
      kind,
      docChars,
      usage.input || 0,
      usage.output || 0,
      usage.calls || 0,
      usage.cached || 0,
      ai.costOf(usage),
      nowJst(),
    ]
  );
}

// 管理用：全体の使用量（費用の見積もりに使う）。
async function totals(period = currentPeriod()) {
  return all(
    `SELECT user_id,
            COUNT(*) AS ingests,
            SUM(doc_chars) AS chars,
            SUM(in_tokens) AS in_tokens,
            SUM(out_tokens) AS out_tokens,
            SUM(cost_usd) AS cost_usd
       FROM usage_log
      WHERE period = ?
      GROUP BY user_id
      ORDER BY cost_usd DESC`,
    [period]
  );
}

module.exports = { PLANS, planOf, check, record, usageFor, totals, currentPeriod };
