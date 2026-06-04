#!/bin/bash
# Regenerate all 5 legal DOCX files
set -e
cd "$(dirname "$0")"

echo "Regenerating MAMS legal documents..."
for f in 01_msa.js 02_sow.js 03_nda.js 04_invoice.js 05_dpa.js; do
  echo "  → $f"
  node "$f"
done

echo ""
echo "Done. Generated files:"
ls -la *.docx
echo ""
echo "Copy to ../final-docs/ with:"
echo "  cp *.docx ../final-docs/"
