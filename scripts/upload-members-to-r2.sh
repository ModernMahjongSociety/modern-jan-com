#!/bin/bash
# 会員紹介ページの画像をCloudflare R2にアップロードするスクリプト

# R2バケット名（環境に合わせて変更してください）
BUCKET_NAME="modern-jan-images"

# アップロード元ディレクトリ
SOURCE_DIR="./public/images/members"

# R2内のパス
R2_PATH="members"

echo "Uploading member images to R2..."

# 各画像ファイルをアップロード
for file in "$SOURCE_DIR"/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading $filename..."
    npx wrangler r2 object put "${BUCKET_NAME}/${R2_PATH}/${filename}" --file "$file"
  fi
done

echo "Upload complete!"
echo ""
echo "次のステップ:"
echo "1. R2バケットにカスタムドメイン (r2.modern-jan.com) を設定"
echo "2. member.astro の画像URLを更新:"
echo "   /images/members/*.png → https://r2.modern-jan.com/members/*.png"
