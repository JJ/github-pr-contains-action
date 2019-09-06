# Checking PRs for words, inspired by JavaScript Action Template

Based on the template, we'll try to create a new action. This new action will check for the presence of a word in the body or diff in a PR. It uses the GitHub API, so you'll need to provide a token. Don't worry, that's built-in.

You will generally use this through a YAML file in the `.github/workflow` directory.
