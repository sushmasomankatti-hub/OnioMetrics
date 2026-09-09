@echo off
title OnioMetrics — GitHub & Netlify Deploy Setup
cd /d "%~dp0"

echo ===================================================
echo   OnioMetrics - Git Repository Setup ^& GitHub Push
echo ===================================================
echo.

:: 1. Check Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found in your system PATH.
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

:: 2. Initialize Git repo if not already done
if not exist ".git" (
    echo [*] Initializing local Git repository...
    git init -b main
) else (
    echo [*] Git repository already initialized.
)

:: 3. Stage and commit files
echo [*] Staging all files...
git add .
git commit -m "Initial commit: OnioMetrics platform with defect-driven rejection and edge AI"

echo.
echo ===================================================
echo   Choose GitHub Upload Method:
echo ===================================================
echo [1] Use GitHub CLI (gh) - Automated creation ^& push
echo [2] Push to an existing GitHub repository URL
echo ===================================================
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    where gh >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] GitHub CLI (gh) is not installed.
        echo Please choose option 2 or install gh from https://cli.github.com/
        pause
        exit /b 1
    )
    echo [*] Creating GitHub repository 'OnioMetrics' and pushing...
    gh repo create OnioMetrics --public --source=. --remote=origin --push
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] Repository created and pushed to GitHub!
    ) else (
        echo.
        echo [!] Failed with gh CLI. Please verify your login with 'gh auth login' or use option 2.
    )
) else (
    set /p repourl="Paste your GitHub repository URL (e.g., https://github.com/username/OnioMetrics.git): "
    git remote remove origin 2>nul
    git remote add origin %repourl%
    git branch -M main
    echo [*] Pushing to GitHub...
    git push -u origin main
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] Files successfully pushed to GitHub!
    )
)

echo.
echo ===================================================
echo   Next Steps for Netlify Deployment:
echo ===================================================
echo 1. Go to https://app.netlify.com/
echo 2. Click "Add new site" -> "Import an existing project"
echo 3. Select GitHub and pick the "OnioMetrics" repository
echo 4. Leave build command blank (publish directory is '.')
echo 5. Click "Deploy site" - Your platform will be live!
echo ===================================================
echo.
pause
