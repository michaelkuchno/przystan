#!/usr/bin/env bash
# Publishes Przystań on GitHub: creates the repository, pushes the code, enables GitHub Pages
# (PWA) and stores the Android keystore as repository secrets for the APK workflow.
# Run it while `gh` is logged in to the account that should own the project.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO_NAME="${1:-przystan}"
KDIR="${PRZYSTAN_KEYSTORE_DIR:-$HOME/przystan-keystore}"

LOGIN=$(gh api user --jq .login)
echo "GitHub account: $LOGIN"
read -r -p "Publish as public repository $LOGIN/$REPO_NAME? [y/N] " ok
[ "$ok" = "y" ] || { echo "Cancelled."; exit 1; }

if ! gh repo view "$LOGIN/$REPO_NAME" >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --public --source . --remote origin --description "Przystań / Harbor – offline PWA dla pedagoga resocjalizacyjnego i specjalisty ds. uzależnień"
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$LOGIN/$REPO_NAME.git"

# Pages from GitHub Actions
gh api -X POST "repos/$LOGIN/$REPO_NAME/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$LOGIN/$REPO_NAME/pages" -f build_type=workflow >/dev/null

# Keystore secrets for .github/workflows/android.yml
prop() { grep "^$1=" "$KDIR/keystore.properties" | cut -d= -f2-; }
base64 -w0 "$KDIR/przystan-release.jks" | gh secret set PRZYSTAN_KEYSTORE_BASE64 -R "$LOGIN/$REPO_NAME"
prop storePassword | gh secret set PRZYSTAN_KEYSTORE_PASSWORD -R "$LOGIN/$REPO_NAME"
prop keyAlias | gh secret set PRZYSTAN_KEY_ALIAS -R "$LOGIN/$REPO_NAME"
prop keyPassword | gh secret set PRZYSTAN_KEY_PASSWORD -R "$LOGIN/$REPO_NAME"

git push -u origin main
echo
echo "PWA (after the Pages workflow finishes): https://$LOGIN.github.io/$REPO_NAME/"
echo "Workflow status: gh run list -R $LOGIN/$REPO_NAME"
