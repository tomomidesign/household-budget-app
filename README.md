# 家計簿レシート管理アプリ

スマホでレシートを撮影し、OCR結果を確認・修正して家計簿へ登録するMVPです。

## ローカル起動

```powershell
npm install
npm run dev
```

起動後、ブラウザで `http://localhost:3000` を開きます。

## MVPで確認する流れ

1. `登録` タブを開く
2. `レシートを撮影` から画像を選ぶ
3. OCR後、日付・店舗名・金額がフォームに入ることを確認する
4. 必要なら修正して `登録する` を押す
5. `一覧` タブで登録内容が表示されることを確認する
6. ホームに戻り、今月の支出と最近登録した5件に反映されることを確認する

## 外部連携

Google Drive保存とSupabaseバックアップは、MVP確認では無効です。

有効化する場合は `.env.local` を作成し、以下を設定します。

```env
NEXT_PUBLIC_ENABLE_SUPABASE_BACKUP=true
NEXT_PUBLIC_ENABLE_DRIVE_UPLOAD=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_DRIVE_CLIENT_EMAIL=
GOOGLE_DRIVE_PRIVATE_KEY=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

Supabaseを使う場合は `supabase.schema.sql` を実行してください。
