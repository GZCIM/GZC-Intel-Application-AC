# Check if code formatting is complete before commit
# PowerShell version

Write-Host "🔍 Checking code formatting status..." -ForegroundColor Cyan

# Check if there are any unstaged changes (formatting might still be running)
$unstagedChanges = git diff --name-only
if ($unstagedChanges) {
    Write-Host "⚠️  WARNING: Unstaged changes detected. Formatting might still be running." -ForegroundColor Yellow
    Write-Host "Files with changes:" -ForegroundColor Yellow
    $unstagedChanges | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Please wait for formatting to complete before committing." -ForegroundColor Red
    exit 1
}

# Check if there are any staged changes
$stagedChanges = git diff --cached --name-only
if ($stagedChanges) {
    Write-Host "✅ Staged changes ready for commit:" -ForegroundColor Green
    $stagedChanges | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
    Write-Host ""
    Write-Host "✅ Code formatting appears to be complete. Safe to commit and push." -ForegroundColor Green
    exit 0
} else {
    Write-Host "ℹ️  No staged changes found." -ForegroundColor Blue
    exit 0
}
