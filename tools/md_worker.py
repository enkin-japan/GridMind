#!/usr/bin/env python3
# GridMind 常駐変換ワーカー
#
# 従来（md_convert.py）はリクエストごとに Python を起動していたため、
# 毎回 `import markitdown` の冷起動コスト（実測 約0.50秒）を払っていた。
# 変換そのものは 0.25〜0.55秒なので、時間の約6割が無駄になっていた。
#
# このワーカーは起動時に一度だけ markitdown を読みこみ、あとは常駐して
# 標準入力から「1行1リクエスト」の JSON を受け取り、結果を1行の JSON で返す。
# Node 側（services/ingest.js）がこのプロセスを複数本まとめて管理する。
#
# 入力  : {"id": <任意>, "path": "<ファイルパス>"}
# 出力  : {"id": <同じ>, "ok": true,  "text": "<Markdown>"}
#         {"id": <同じ>, "ok": false, "error": "<理由>"}
# 起動時: {"ready": true}  ← 準備完了の合図（id を持たない）
import sys
import json


def main():
    try:
        from markitdown import MarkItDown
        converter = MarkItDown()
    except Exception as e:  # noqa: BLE001 - 起動に失敗したら理由を伝えて終了する
        sys.stderr.write('WORKER_INIT_FAILED: ' + str(e))
        sys.exit(1)

    # 準備完了を Node 側へ知らせる。
    sys.stdout.write(json.dumps({'ready': True}) + '\n')
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:  # noqa: BLE001 - 壊れた行は捨てて次へ
            continue

        rid = req.get('id')
        try:
            result = converter.convert(req['path'])
            out = {'id': rid, 'ok': True, 'text': result.text_content or ''}
        except Exception as e:  # noqa: BLE001 - 1件の失敗でワーカーを落とさない
            out = {'id': rid, 'ok': False, 'error': str(e)[:300]}

        # ensure_ascii=False で日本語をそのまま出す。改行は JSON がエスケープするので
        # 必ず「1レスポンス＝1行」になる。
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()
