# AI Resume Optimizer

**求人票に合わせて職務経歴書を AI で自動最適化するツール**

Google Gemini API を活用し、求人票と職務経歴書を分析して ATS（採用管理システム）を通過しやすい職務経歴書へと自動最適化します。日本語の転職市場に特化した設計です。

---

## 機能

| 機能 | 説明 |
|------|------|
| **ATS キーワード抽出** | 求人票からスキル・経験・資格などの重要キーワードを自動抽出 |
| **マッチングスコア算出** | 現在の職務経歴書と求人票の一致度を 0〜100 でスコアリング |
| **職務経歴書の最適化** | キーワードを自然に盛り込み、成果を定量的にアピールする形に再構成 |
| **プロからのフィードバック** | 最適化の根拠・改善点をマークダウン形式で詳細に解説 |
| **ファイルアップロード対応** | PDF・テキスト（.txt）・Markdown（.md）ファイルから直接テキストを読み込み |

---

## 技術スタック

- **フレームワーク**: [Next.js 15](https://nextjs.org/) (App Router)
- **言語**: TypeScript
- **AI**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
- **スタイリング**: Tailwind CSS v4
- **アニメーション**: Motion (Framer Motion)
- **PDF 解析**: pdf.js (`pdfjs-dist`)
- **Markdown レンダリング**: react-markdown

---

## ローカルでの起動方法

### 前提条件

- Node.js 20 以上

### セットアップ

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数の設定
cp .env.example .env.local
```

`.env.local` を開き、Gemini API キーを設定してください。

```env
NEXT_PUBLIC_GEMINI_API_KEY="your_gemini_api_key_here"
```

> **API キーの取得方法**: [Google AI Studio](https://ai.google.dev/aistudio) にアクセスして API キーを発行してください。

```bash
# 3. 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000` を開くと使用できます。

---

## 使い方

1. **求人票を入力** — 応募したい求人のテキストを貼り付けるか、PDF / テキストファイルを読み込む
2. **職務経歴書を入力** — 現在の職務経歴書を貼り付けるか、PDF / テキストファイルを読み込む
3. **「ATS最適化を実行する」をクリック** — Gemini が分析・最適化を実行
4. **結果を確認** — マッチングスコア・キーワード・フィードバック・最適化済み職務経歴書を確認
5. **コピーして活用** — 最適化された職務経歴書をクリップボードにコピー

---

## ディレクトリ構成

```
ai-resume-optimizer/
├── app/
│   ├── page.tsx        # メインUI・ロジック（分析・最適化処理）
│   ├── layout.tsx      # ルートレイアウト
│   └── globals.css     # グローバルスタイル
├── hooks/
│   └── use-mobile.ts   # モバイル判定カスタムフック
├── lib/
│   └── utils.ts        # ユーティリティ関数
├── .env.example        # 環境変数テンプレート
└── package.json
```

---

## スクリプト

```bash
npm run dev    # 開発サーバー起動
npm run build  # 本番ビルド
npm run start  # 本番サーバー起動
npm run lint   # ESLint 実行
```

---

## 注意事項

- API キー（`.env.local`）は **絶対に Git にコミットしない**でください（`.gitignore` で除外済み）
- 職務経歴書に含まれる個人情報の取り扱いにご注意ください
- Gemini API の利用には Google AI Studio アカウントが必要です
