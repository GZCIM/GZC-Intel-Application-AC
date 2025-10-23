#!/bin/bash
# Check if code formatting is complete before commit

echo "🔍 Checking code formatting status..."

# Check if there are any unstaged changes (formatting might still be running)
if [ -n "$(git diff --name-only)" ]; then
    echo "⚠️  WARNING: Unstaged changes detected. Formatting might still be running."
    echo "Files with changes:"
    git diff --name-only
    echo ""
    echo "Please wait for formatting to complete before committing."
    exit 1
fi

# Check if there are any staged changes
if [ -n "$(git diff --cached --name-only)" ]; then
    echo "✅ Staged changes ready for commit:"
    git diff --cached --name-only
    echo ""
    echo "✅ Code formatting appears to be complete. Safe to commit and push."
    exit 0
else
    echo "ℹ️  No staged changes found."
    exit 0
fi
