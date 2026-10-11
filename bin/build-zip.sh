#!/usr/bin/env bash
# Builds build/coquille-revue-<version>.zip from the last commit.
# Files marked export-ignore in .gitattributes are left out.
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(git show HEAD:coquille-revue.php | sed -n 's/^ \* Version:[[:space:]]*//p' | tr -d '\r' | sed 's/[[:space:]]*$//')
if [ -z "$version" ]; then
  echo "Version not found in coquille-revue.php" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Warning: uncommitted changes will not be in the zip." >&2
fi

mkdir -p build
out="build/coquille-revue-${version}.zip"
git archive --format=zip --prefix=coquille-revue/ -o "$out" HEAD
echo "$out"
