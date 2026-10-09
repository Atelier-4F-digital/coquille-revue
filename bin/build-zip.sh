#!/usr/bin/env bash
# Construit build/coquille-revue-<version>.zip à partir du dernier commit.
# Les fichiers marqués export-ignore dans .gitattributes sont exclus.
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(sed -n 's/^ \* Version:[[:space:]]*//p' coquille-revue.php | tr -d '\r')
if [ -z "$version" ]; then
  echo "Version introuvable dans coquille-revue.php" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Attention : des modifications ne sont pas commitées, elles ne seront pas dans le zip." >&2
fi

mkdir -p build
out="build/coquille-revue-${version}.zip"
git archive --format=zip --prefix=coquille-revue/ -o "$out" HEAD
echo "$out"
