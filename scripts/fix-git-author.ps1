# Fix Git Author - PowerShell Script
# Changes strategyfoxxr@gmail.com to vmnithwin@gmail.com

Write-Host "🔧 Fixing Git Author Information" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Update git config
Write-Host "1️⃣  Updating git config..." -ForegroundColor Yellow
git config user.name "Nithwin"
git config user.email "vmnithwin@gmail.com"

Write-Host "✅ Git config updated:" -ForegroundColor Green
Write-Host "   Name: $(git config user.name)"
Write-Host "   Email: $(git config user.email)"
Write-Host ""

# Check if git-filter-repo is available (preferred method)
$hasFilterRepo = git filter-repo --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "2️⃣  Using git-filter-repo (recommended)..." -ForegroundColor Yellow
    Write-Host "   Installing git-filter-repo if needed..." -ForegroundColor Gray
    
    # Rewrite history using git-filter-repo
    git filter-repo --email-callback '
        return email.replace(b"strategyfoxxr@gmail.com", b"vmnithwin@gmail.com")
    ' --name-callback '
        return name.replace(b"strategyfoxxr", b"Nithwin")
    ' --force
    
    Write-Host "✅ Git history rewritten using git-filter-repo!" -ForegroundColor Green
} else {
    Write-Host "2️⃣  Using git filter-branch (fallback)..." -ForegroundColor Yellow
    Write-Host "   Note: This may take a while for large repositories" -ForegroundColor Gray
    Write-Host ""
    
    # Rewrite history using filter-branch
    $env:GIT_AUTHOR_NAME = "Nithwin"
    $env:GIT_AUTHOR_EMAIL = "vmnithwin@gmail.com"
    $env:GIT_COMMITTER_NAME = "Nithwin"
    $env:GIT_COMMITTER_EMAIL = "vmnithwin@gmail.com"
    
    git filter-branch -f --env-filter '
        OLD_EMAIL="strategyfoxxr@gmail.com"
        CORRECT_NAME="Nithwin"
        CORRECT_EMAIL="vmnithwin@gmail.com"
        
        if [ "$GIT_COMMITTER_EMAIL" = "$OLD_EMAIL" ]
        then
            export GIT_COMMITTER_NAME="$CORRECT_NAME"
            export GIT_COMMITTER_EMAIL="$CORRECT_EMAIL"
        fi
        if [ "$GIT_AUTHOR_EMAIL" = "$OLD_EMAIL" ]
        then
            export GIT_AUTHOR_NAME="$CORRECT_NAME"
            export GIT_AUTHOR_EMAIL="$CORRECT_EMAIL"
        fi
    ' --tag-name-filter cat -- --branches --tags
    
    Write-Host "✅ Git history rewritten!" -ForegroundColor Green
}

Write-Host ""
Write-Host "3️⃣  Next steps:" -ForegroundColor Yellow
Write-Host "   - Review changes: git log --all --pretty=format:'%h - %an <%ae> - %s' | Select-String 'vmnithwin'" -ForegroundColor Gray
Write-Host "   - Force push to update remote: git push --force --all" -ForegroundColor Gray
Write-Host "   - Remove collaborator from GitHub (web interface)" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  WARNING: Force push will rewrite remote history!" -ForegroundColor Red
Write-Host "   Make sure you have a backup and coordinate with team members." -ForegroundColor Red
Write-Host ""

