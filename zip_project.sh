#!/bin/bash

# Target zip file name
ZIP_NAME="ScamShield.zip"

echo "============================================="
echo "   ScamShield Cambodia Project Packager"
echo "============================================="
echo "Creating zip archive: $ZIP_NAME..."
echo "Ignoring node_modules, build directories, logs, environment configurations, and other build artifacts..."

# Remove existing zip if it exists to avoid adding to it
if [ -f "$ZIP_NAME" ]; then
  echo "Removing old $ZIP_NAME..."
  rm "$ZIP_NAME"
fi

# Run zip command with standard exclusions
zip -r "$ZIP_NAME" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x ".next/*" \
  -x "*/.next/*" \
  -x "dist/*" \
  -x "*/dist/*" \
  -x "build/*" \
  -x "*/build/*" \
  -x "out/*" \
  -x "*/out/*" \
  -x ".git/*" \
  -x "*/.git/*" \
  -x "*.zip" \
  -x "*/.env" \
  -x ".env" \
  -x "*/.env.*" \
  -x ".env.*" \
  -x "*.tsbuildinfo" \
  -x "*/tsconfig.tsbuildinfo" \
  -x "*.log" \
  -x "logs/*" \
  -x "*/logs/*" \
  -x ".DS_Store" \
  -x "*/.DS_Store" \
  -x "zip_project.sh"

if [ $? -eq 0 ]; then
  echo "============================================="
  echo "   SUCCESS! Created $ZIP_NAME"
  echo "   Size: $(du -sh "$ZIP_NAME" | cut -f1)"
  echo "============================================="
else
  echo "Error: Failed to create zip file."
fi
