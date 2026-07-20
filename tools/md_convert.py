#!/usr/bin/env python3
# GridMind Python ブリッジ
# ファイル（PDF/docx/pptx/xlsx/html/txt など）を markitdown で Markdown に変換し、
# 標準出力へ書き出す。Node 側から child_process.spawn で呼ばれる。
# エラーは標準エラー出力に出し、非ゼロで終了する（Node 側でハンドリングする）。
import sys

def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: md_convert.py <file>\n")
        sys.exit(2)
    path = sys.argv[1]
    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(path)
        sys.stdout.write(result.text_content or "")
    except Exception as e:  # noqa: BLE001 - ブリッジなので全例外を Node に伝える
        sys.stderr.write(str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
