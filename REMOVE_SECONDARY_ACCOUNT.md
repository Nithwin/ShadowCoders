# Remove Secondary Account (strategyfoxxr@gmail.com)

## ✅ Step 1: Git Config Updated
Your git config is now set to use your primary account:
- Name: Nithwin
- Email: vmnithwin@gmail.com

## 🔄 Step 2: Rewrite Git History

You need to rewrite the git history to change all commits from `strategyfoxxr@gmail.com` to `vmnithwin@gmail.com`.

### Quick Method (PowerShell):

```powershell
# Run the fix script
.\scripts\fix-git-author.ps1
```

### Manual Method:

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

**This will:**
- Find all commits with `strategyfoxxr@gmail.com`
- Change them to `vmnithwin@gmail.com`
- Update both author and committer information

## 📤 Step 3: Force Push to GitHub

⚠️ **WARNING:** This rewrites remote history. Only do this if:
- You're the only contributor, OR
- You've coordinated with your team

```powershell
git push --force --all
git push --force --tags
```

## 🗑️ Step 4: Remove Collaborator from GitHub

1. Go to: https://github.com/Nithwin/ShadowCoders/settings/access
2. Scroll to **Collaborators** section
3. Find the account with `strategyfoxxr@gmail.com` or associated GitHub username
4. Click **Remove** or **X** button
5. Confirm removal

## ✅ Step 5: Verify

```powershell
# Check all commits now use primary account
git log --all --pretty=format:"%h - %an <%ae>" | Select-Object -Unique

# Should only show: Nithwin <vmnithwin@gmail.com>
```

## 📝 Summary

1. ✅ Git config updated (already done)
2. ⏳ Rewrite history (run script above)
3. ⏳ Force push to GitHub
4. ⏳ Remove collaborator from GitHub web interface
5. ⏳ Verify all commits use primary account

## Need Help?

See `FIX_GIT_ACCOUNT.md` for detailed instructions.

