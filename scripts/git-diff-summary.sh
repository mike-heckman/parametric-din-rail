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

echo "Read ./logs/git-diff.txt and render it using the template in ./docs/templates/git-diff-summary.md"
