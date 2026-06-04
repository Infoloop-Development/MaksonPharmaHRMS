#!/usr/bin/env bash
# Package the MAMS handoff into a clean ZIP for delivery to the engineering team.
# Excludes: node_modules, dist, .env files, build artifacts, OS junk.
#
# Usage: bash scripts/package-handoff.sh [output-zip-path]
# Default output: ../mams-handoff-YYYY-MM-DD.zip

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE=$(date +%Y-%m-%d)
OUT="${1:-${REPO_ROOT}/../mams-handoff-${DATE}.zip}"

cd "${REPO_ROOT}"

echo "Packaging from: ${REPO_ROOT}"
echo "Output zip:     ${OUT}"
echo ""

# Use zip with -x to exclude unwanted paths.
# We zip the parent folder to preserve the mams-handoff/ root in the archive.
PARENT="$(dirname "${REPO_ROOT}")"
FOLDER="$(basename "${REPO_ROOT}")"

cd "${PARENT}"

zip -r "${OUT}" "${FOLDER}" \
  -x "${FOLDER}/.git/*" \
     "${FOLDER}/*/node_modules/*" \
     "${FOLDER}/*/*/node_modules/*" \
     "${FOLDER}/*/*/*/node_modules/*" \
     "${FOLDER}/node_modules/*" \
     "${FOLDER}/*/dist/*" \
     "${FOLDER}/*/*/dist/*" \
     "${FOLDER}/dist/*" \
     "${FOLDER}/*/.vite/*" \
     "${FOLDER}/*/build/*" \
     "${FOLDER}/.DS_Store" \
     "${FOLDER}/*/.DS_Store" \
     "${FOLDER}/*/*/.DS_Store" \
     "${FOLDER}/*/.env" \
     "${FOLDER}/*/*/.env" \
     "${FOLDER}/*.log" \
     "${FOLDER}/*/coverage/*" \
     "${FOLDER}/_unpacked/*" \
  > /dev/null

SIZE=$(du -h "${OUT}" | cut -f1)
COUNT=$(unzip -l "${OUT}" | tail -1 | awk '{print $2}')

echo "Done."
echo "  File: ${OUT}"
echo "  Size: ${SIZE}"
echo "  Files: ${COUNT}"
echo ""
echo "Excluded: node_modules, dist, .env, .git, .DS_Store, *.log, coverage, build."
echo ""
echo "Hand this ZIP to the engineering team. Their first action:"
echo "  unzip mams-handoff-${DATE}.zip"
echo "  cd mams-handoff/mams"
echo "  npm install && npm run seed && npm run dev:server (and dev:web in another terminal)"
