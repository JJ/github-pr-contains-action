# Checking PR bodies and diffs for words, and number of files and lines in files changed.

Based on the [actions TS template](https://github.com/actions/typescript-template), we'll try to create a new action. This new action will check for the presence of a word in the body or diff in a PR. It uses the GitHub API, so you'll need to provide a token. Don't worry, that's built-in.

# Using this action

You would need to put this in a file in the `.github/workflows` directory

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
        bodyDoesNotContain: "Delete|this"
        bodyContains: 'Test'
        diffContains: 'Test'
        filesChanged: 1
        linesChanged: 1
```

The `bodyContains` variable will include the string that we want the body of the PR to include, such as checked items in a checklist; obviously `bodyDoesNotContain` will hold the opposite, what we don't want to see in the PR body. Any of them can have a `|` separated list of words or expressions. The PR will check it contains _any_ of the words in `bodyContains` and _none_ of the words in `bodyDoesnotContain`.

> These strings are unwittingly converted into regular expressions, so any regular expression will also work; `[]()+?*` are escaped so that things such as `[.]` work with the literal meaning.

They can be left empty if no check wants to be done.

An example is used as [.github/workflows/check-PRs-here.yaml](.github/workflows/check-PRs-here.yaml) in this repository.

## Contributing to development

Any suggestion, bug report, etc, is appreciated. Please use [issues](https://github.com/JJ/github-pr-contains-action/issues) for doing that.

## See also

There are several forks of this action, with additional features:

- [PR content checker by @jsoares](https://github.com/jsoares/gh-pr-content-checker/) includes `diffDoesNotContain`
- [Francisco Giordano's `pr-content-checker`](https://github.com/francesco-giordano/gh-pr-content-checker)

## History

- `v0`: proof of concept, published to marketplace
- `v1`: Adds several more checks
- `v2`: Adds check for strings to avoid and creates issues for errors.
- `v3`: Changes packaging, upgrades modules, deletes unneeded files.
- `v4`: Solves a number of issues.
- `v5`: Will not use `diffContains` if it's an empty string
- 'v6`: can use words or regular expressions in `bodyContains`/ `bodyDoesNotContain`

## License

This is a modification of the original template, and is released under
the MIT license.
