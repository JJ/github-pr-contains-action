# Checking PR bodies and diffs for words, and number of files and lines in files changed [![Basic installation and build checks](https://github.com/JJ/github-pr-contains-action/actions/workflows/checkin.yml/badge.svg)](https://github.com/JJ/github-pr-contains-action/actions/workflows/checkin.yml)

Originally based on the [actions TS template](https://github.com/actions/typescript-template), it checks for the presence/absence of a string or group of strings in the body or diff in a PR, as well as certain conditions on the PR: number of files changed, and number of lines changed.

It uses the GitHub API, so you'll need to provide a token. Don't worry, that's built-in.

## Using this action

You would need to put this in a YAML file in the `.github/workflows` directory

```yaml
name: "Check PR content"
on: [pull_request]

jobs:
  check_pr:
    runs-on: ubuntu-latest
    steps:
    - name: Check PR
      uses: JJ/github-pr-contains-action@releases/v10
      with:
        github-token: ${{github.token}}
        bodyDoesNotContain: "Delete|this"
        bodyContains: 'Test'
        diffContains: ';'
        diffDoesNotContain: "TODO|to do"
        filesChanged: 1
        linesChanged: 1
```

The `bodyContains` variable will include the string that we want the body of the PR to include, such as checked items in a checklist; obviously `bodyDoesNotContain` will hold the opposite, what we don't want to see in the PR body. Any of them can have a `|` separated list of words or expressions. The PR will check it contains _any_ of the words in `bodyContains` and _none_ of the words in `bodyDoesnotContain`.

Same patterm for `diff(Contains|DoesNotContain)`. Can be a word or list of words you want in the diff (for instance, you want it to _always_ change code so it contains a statement terminator) or don't want in the diff (for instance, you don't want it to include TODOs because people never ever _do_ them).

> These strings are unwittingly converted into regular expressions, so any regular expression will also work; `[]()+?*` are escaped so that things such as `[.]` work with the literal meaning.

They can be left empty if you don't need that specific check.

An example is used as [.github/workflows/check-PRs-here.yaml](.github/workflows/check-PRs-here.yaml) in this repository as well as [this one, which is the one I use for testing](.github/workflows/pr.yaml).

You might want to qualify possible events that trigger this action, for intance, this way:

```yaml
  pull_request:
    types:
      [opened, edited, assigned, closed, review_requested, ready_for_review]
```

This will skip diff checks every single push, for instance. Please remember that _this action will only work in pull requests_, since it checks the pull request object payload. It will simply skip any check (with a warning) if it is not triggered by a `pull_request` or `pull_request_target` event.

## Caveats

This GitHub action works as is in public repositories. Diff checking will simply be disabled if it detects it is being run in a private repository.

## Contributing to development

Any suggestion, bug report, etc, is appreciated. Please use [issues](https://github.com/JJ/github-pr-contains-action/issues).

## See also

There are several forks of this action, with additional features:

- [PR content checker by @jsoares](https://github.com/jsoares/gh-pr-content-checker/) includes `diffDoesNotContain`
- [Francisco Giordano's `pr-content-checker`](https://github.com/francesco-giordano/gh-pr-content-checker)
- [Pablo Statsig's `pr-content-checker`])(https://github.com/pablo-statsig/gh-pr-content-checker/)

## History

- `v0`: proof of concept, published to marketplace
- `v1`: Adds several more checks
- `v2`: Adds check for strings to avoid and creates issues for errors.
- `v3`: Changes packaging, upgrades modules, deletes unneeded files.
- `v4`: Solves a number of issues.
- `v5`: Will not use `diffContains` if it's an empty string
- `v6`: can use words or regular expressions in `bodyContains`/ `bodyDoesNotContain`
- `v7`: includes more "rexified" characters: `*,?,+`
- `v8`: adds `diffDoesNotContain` and extends regex testing to diff tests.
- `v9`: adds some informative messages, disables API calls for private repositories.
- `v10`: Skips checks if not in a pull request; adds information to prevent this use too.

## License

This is a modification of the original template, and is released under
the MIT license.
