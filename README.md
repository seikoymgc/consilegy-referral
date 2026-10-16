# consilegy-referral

Consilegy 紹介パートナープラットフォーム（構築中）。

Consilegyの製品を紹介すると報酬を受け取れる仕組みと、紹介パートナー向けのマイページを提供します。

## 方針

- 製品（Revenue CRMなど）のデータとは分けて管理する
- 画面とAPIは1つのNext.jsアプリにまとめ、Vercelに置く予定
- データは独立したSupabaseプロジェクトに置く予定（作成先・費用は未確定）
- 公開URLは referral.consilegy.com を予定（DNS設定は未完了）

## 現在の状態

- 骨組みのみ。DBへの接続はまだしていない
- 画面はダミーデータで作る方針
