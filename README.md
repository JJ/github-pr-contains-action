# Checking PRs for words, inspired by JavaScript Action Template

Based on the template, we'll try to create a new action. This new action will check for the presence of a word in the body or diff in a PR. It uses the GitHub API, so you'll need to provide a token. Don't worry, that's built-in.

# Using this action

You would need to add this in a file in `.github/workflows`

```
name: "Check PR for word"
on: [pull_request]

jobs:
  check_pr:
    runs-on: ubuntu-latest
    steps:
    - name: Check PR
      uses: JJ/github-pr-contains-action@releases/v0
      with:
        github-token: ${{github.token}}
        bodyContains: 'Test'
        diffContains: 'Test'
```

The `bodyContain` variable will include the string that we want the body of the PR to include, such as checked items in a checklist.
