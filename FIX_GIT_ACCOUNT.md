# Fix Git Account - Remove Secondary Account

## Problem
- Commits were made with `strategyfoxxr@gmail.com` (secondary account)
- Git config still uses secondary account
- Secondary account is listed as collaborator on GitHub

## Solution

### Step 1: Update Git Configuration

**Local (this repository only):**
```powershell
git config user.name "Nithwin"
git config user.email "vmnithwin@gmail.com"
```

**Global (all repositories):**
```powershell
git config --global user.name "Nithwin"
git config --global user.email "vmnithwin@gmail.com"
```

**Verify:**
```powershell
git config user.name
git config user.email
```

### Step 2: Rewrite Git History

**Option A: Using PowerShell Script (Recommended)**
```powershell
.\scripts\fix-git-author.ps1
```

**Option B: Manual Command**
```powershell
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
```

### Step 3: Verify Changes

Check that all commits now use your primary email:
```powershell
git log --all --pretty=format:"%h - %an <%ae> - %s" | Select-String "vmnithwin"
```

Should show all commits with `vmnithwin@gmail.com`.

### Step 4: Force Push to Remote

⚠️ **WARNING:** This rewrites remote history. Make sure:
- You have a backup
- You coordinate with team members (if any)
- You're the only one working on this repository

```powershell
git push --force --all
git push --force --tags
```

### Step 5: Remove Secondary Account from GitHub Collaborators

1. Go to your repository on GitHub: https://github.com/Nithwin/ShadowCoders
2. Click **Settings** tab
3. Click **Collaborators** in the left sidebar
4. Find the account associated with `strategyfoxxr@gmail.com`
5. Click the **X** or **Remove** button next to that collaborator
6. Confirm the removal

### Step 6: Clean Up Backup References

After verifying everything works:
```powershell
# Remove backup refs created by filter-branch
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Verification Checklist

- [ ] Git config shows primary account
- [ ] All commits show `vmnithwin@gmail.com`
- [ ] No commits show `strategyfoxxr@gmail.com`
- [ ] Force pushed to remote
- [ ] Secondary account removed from GitHub collaborators
- [ ] Future commits use primary account

## Quick Commands Summary

```powershell
# 1. Update config
git config user.name "Nithwin"
git config user.email "vmnithwin@gmail.com"

# 2. Rewrite history (run the script or manual command above)

# 3. Verify
git log --all --pretty=format:"%h - %an <%ae>" | Select-Object -Unique

# 4. Force push
git push --force --all

# 5. Remove collaborator (GitHub web interface)
```

## Notes

- **Force push is required** because we're rewriting history
- **Backup first** - Consider creating a backup branch: `git branch backup-before-rewrite`
- **GitHub collaborators** must be removed manually via web interface
- **Future commits** will automatically use your primary account (from git config)

