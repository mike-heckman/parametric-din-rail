#!/bin/bash
# Manage all the steps for running git-diff-summary we can automate

ORIGIN_BRANCH="${1:-main}"
GIT_BRANCH=$(git branch --show-current)

if [ ! -d logs ]; then
    mkdir -p logs
fi
if [ -f logs/git-diff.txt ]; then
    rm -f logs/git-diff.txt
fi

DIFF=$(git diff "${ORIGIN_BRANCH}" 2>/dev/null)

if [ "${DIFF}" == "" ]; then
    echo "No changes found."
    exit 1
fi

echo "Git Branch: ${GIT_BRANCH}" > logs/git-diff.txt
echo "Date: $(date -Idate)" >> logs/git-diff.txt

echo -e "\n\nGit Diff:\n${DIFF}" >> logs/git-diff.txt 

if [ -f coverage.md ]; then
    echo -e "\n\nCoverage:\n$(tail -n 1 coverage.md)" >> logs/git-diff.txt
fi

cat <<'EOM'
1. Read ./logs/git-diff.txt.
2. Process the output to create a human-readable version of the changes using the template included below. 
3. Output this summary to the project root as ./git-diff-summary.md

**git-diff-summary template:**
---
# Gemini Summary

*Git Branch*: {from ./logs/git-diff.txt}
*Date*: {from ./logs/git-diff.txt}

## Overview

After reading ./logs/git-diff.txt, Provide an executive summary of changes made in the "Git Diff" section

## Key Changes

### Heading 1

Summarize the first key change

### Heading 2

Summarize the second key change

### Heading N

Continue summarizing each key change

## Impact
- **Title** Provide a list of items that show the impact of the modifications made. Include relevant items from: Performance, Maintainability, Robustness, Scalability, Code Quality, etc.

## Verification
- **Automated**: {Number} unit tests passing (`uv run pytest`).
- **Lints**: All checks passed via project checklist script, including formatting and import cleanups.
- **Coverage**: Provide a summary from the "Coverage" section of ./logs/git-diff.txt

EOM
