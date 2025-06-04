#!/bin/bash
set -e
echo "Pushing tokenlist.json to gh-pages branch..."
git config user.name "circleci"
git config user.email "ci@yourorg.com"
git checkout --orphan gh-pages
git rm -rf .
cp dist/tokenlist.json .
git add tokenlist.json
git commit -m "Deploy tokenlist.json [ci skip]"
git push -f origin gh-pages 