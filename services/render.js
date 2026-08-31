// Markdown → HTML レンダリング。ノートの詳細画面と、再整理の対照ページで使う。
// 手順：[[リンク]] を解決 → marked で HTML 化 → 軽量サニタイズ。
// 本格的な XSS 対策（DOMPurify 等）は今後の課題として残している。
const { marked } = require('marked');
const links = require('./links');

marked.setOptions({ breaks: true, gfm: true });

// LLM やユーザー入力由来の Markdown を HTML 化するため、危険な要素を最低限落とす。
function sanitize(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

async function renderMarkdown(md = '', userId) {
  const linked = await links.linkify(md, userId);
  return sanitize(marked.parse(linked));
}

module.exports = { renderMarkdown, sanitize };
