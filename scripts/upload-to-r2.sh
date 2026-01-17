#!/bin/bash

# Upload all images from docs/uploads to R2 bucket
# Preserves directory structure

BUCKET_NAME="modern-jan-images"
UPLOADS_DIR="/Users/kenta/repo/modern-jan-hp/docs/uploads"

echo "Starting upload of images to R2 bucket: $BUCKET_NAME"
echo "Source directory: $UPLOADS_DIR"

# Counter for progress tracking
count=0
total=$(find "$UPLOADS_DIR" -type f | wc -l | xargs)

echo "Total files to upload: $total"

# Find all files and upload them
find "$UPLOADS_DIR" -type f | while read -r file; do
  # Get the relative path from uploads directory
  relative_path="${file#$UPLOADS_DIR/}"

  # Upload to R2 with the same path structure
  wrangler r2 object put "$BUCKET_NAME/$relative_path" --file="$file" > /dev/null 2>&1

  count=$((count + 1))

  # Show progress every 50 files
  if [ $((count % 50)) -eq 0 ]; then
    echo "Uploaded $count / $total files..."
  fi
done

echo "✅ Upload complete! Uploaded $total files to R2 bucket: $BUCKET_NAME"
