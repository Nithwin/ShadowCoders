#!/bin/bash
# Fix Git Author - Change strategyfoxxr@gmail.com to vmnithwin@gmail.com

echo "🔧 Fixing Git Author Information"
echo "================================"
echo ""

# Update git config
echo "1️⃣  Updating git config..."
git config user.name "Nithwin"
git config user.email "vmnithwin@gmail.com"

echo "✅ Git config updated:"
echo "   Name: $(git config user.name)"
echo "   Email: $(git config user.email)"
echo ""

# Rewrite git history
echo "2️⃣  Rewriting git history..."
echo "   This will change all commits from strategyfoxxr@gmail.com to vmnithwin@gmail.com"
echo ""

git filter-branch --env-filter '
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

echo ""
echo "✅ Git history rewritten!"
echo ""
echo "3️⃣  Next steps:"
echo "   - Review the changes: git log"
echo "   - Force push to update remote: git push --force --all"
echo "   - Remove collaborator from GitHub (web interface)"
echo ""

