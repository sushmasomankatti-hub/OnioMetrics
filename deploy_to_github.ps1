# OnioMetrics — GitHub & Netlify Deployment Script
Set-Location -Path $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  OnioMetrics - Git Repository Setup & GitHub Push" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git is not installed or not in PATH. Please install Git from https://git-scm.com/" -ForegroundColor Red
    pause
    exit
}

# 2. Initialize repo
if (-not (Test-Path ".git")) {
    Write-Host "[*] Initializing local Git repository..." -ForegroundColor Yellow
    git init -b main
} else {
    Write-Host "[*] Git repository already exists." -ForegroundColor Yellow
}

# 3. Add and commit files
Write-Host "[*] Staging files..." -ForegroundColor Yellow
git add .
git commit -m "Initial commit: OnioMetrics platform with defect-driven rejection and edge AI"

# 4. Check GitHub CLI (gh)
$hasGh = Get-Command gh -ErrorAction SilentlyContinue
if ($hasGh) {
    Write-Host "[*] Found GitHub CLI (gh). Attempting automated repository creation..." -ForegroundColor Green
    gh repo create OnioMetrics --public --source=. --remote=origin --push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] Repository 'OnioMetrics' created and pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "`n[!] 'gh repo create' failed or requires login. Run 'gh auth login' or enter URL manually." -ForegroundColor Yellow
        $repoUrl = Read-Host "Enter your GitHub repo URL (e.g. https://github.com/<user>/OnioMetrics.git)"
        if ($repoUrl) {
            git remote remove origin 2>$null
            git remote add origin $repoUrl
            git push -u origin main
        }
    }
} else {
    $repoUrl = Read-Host "GitHub CLI not found. Enter your GitHub repo URL (e.g. https://github.com/<user>/OnioMetrics.git)"
    if ($repoUrl) {
        git remote remove origin 2>$null
        git remote add origin $repoUrl
        git push -u origin main
    }
}

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  Next Steps for Netlify Deployment:" -ForegroundColor White
Write-Host "1. Go to https://app.netlify.com/" -ForegroundColor White
Write-Host "2. Click 'Add new site' -> 'Import an existing project'" -ForegroundColor White
Write-Host "3. Authorize GitHub and select 'OnioMetrics'" -ForegroundColor White
Write-Host "4. Publish directory is '.' (automatically detected via netlify.toml)" -ForegroundColor White
Write-Host "5. Click 'Deploy OnioMetrics' — Site goes live instantly!" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan
