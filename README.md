# A GitHub action that checks pull requests description and contents [![Basic installation and build checks](https://github.com/JJ/github-pr-contains-action/actions/workflows/install-build-checks.yml/badge.svg)](https://github.com/JJ/github-pr-contains-action/actions/workflows/install-build-checks.yml)

This GitHub action checks for the presence/absence of a string or group of
strings in the body or diff, as well as certain conditions in the PR: number of
files changed, and number of lines changed.

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
      uses: JJ/github-pr-contains-action@releases/v14.1
      with:
        github-token: ${{github.token}}
        bodyDoesNotContain: "Delete|this"
        bodyContains: 'Test'
        diffContains: ';'
        diffDoesNotContain: "TODO|to do"
        filesChanged: 1
        linesChanged: 1
        waivedUsers: "SomeOne|dependabot[bot]"
```

The `bodyContains` variable will include the string that we want the body of the
PR to include, such as checked items in a checklist; obviously
`bodyDoesNotContain` will hold the opposite, what we don't want to see in the PR
body. Any of them can have a `|` separated list of words or expressions. The PR
will check it contains _any_ of the words in `bodyContains` and _none_ of the
words in `bodyDoesNotContain`.

Same pattern for `diff(Contains|DoesNotContain)`. Can be a word or list of words
you want in the diff (for instance, you want it to _always_ change code so it
contains a statement terminator) or don't want in the diff (for instance, you
don't want it to include TODOs because people never ever _do_ them). If you want
to allow check marks, remember to use an expression such as `[x]|[X]`, since both are
admissible as such in a body.

> These strings are unwittingly converted into regular expressions, so any
> regular expression will also work; `[]()+?*` are escaped so that things such
> as `[.]` work with the literal meaning. They can be left empty if you don't
> need that specific check. This also implies that all these regex marks will
> not be used as such, so avoid using things such as `[xX]` to indicate
> alternatives.

Finally, `waivedUsers` is a `|`-separated string of the users that will be
spared from running these checks; if the PR is triggered by one of those users,
it will exit with a warning and with a green status. By default, it has the
value `"dependabot[bot]"`. If you want to edit more and want to keep dependabot
PRs from failing, add it to your list.

An example is used as
[.github/workflows/check-PRs-here.yaml](.github/workflows/check-PRs-here.yaml)
in this repository as well as [this one, which is the one I use for
testing](.github/workflows/pr.yaml).

You might want to qualify possible events that trigger this action, for intance, this way:

```yaml
  pull_request:
    types:
      [opened, edited, assigned, closed, synchronize, review_requested, ready_for_review]
```

This will skip diff checks every single push, for instance. Please remember that
_this action will only work in pull requests_, since it checks the pull request
object payload. It will simply skip any check (with a warning) if it is not
triggered by a `pull_request` or `pull_request_target` event.

For instance, you might want to use a GitHub action such as [this
one](.github/workflows/contributors.yaml) for the `CONTRIBUTORS.md` file:

``` yaml
name: "Check contributors file additions"
on:
  pull_request:
    types: [opened, edited]
    paths:
      - CONTRIBUTORS.md

jobs:
  check_pr:
    name: "Checks contributors"
    runs-on: ubuntu-latest
    steps:
      - name: Check that any new contributor links to their github page
        uses: JJ/github-pr-contains-action@releases/v14.1
        with:
          github-token: ${{github.token}}
          linesChanged: 1
          filesChanged: 1
          diffContains: "github.com/"
          waivedUsers: "dependabot[bot]|CompanyBigWig"
```

It would check that there's only a single file modified (because why would you
need to change another, if all you want is to add your name to the contributors'
file), a single line is changed (because you're only one, right?) and that it
includes a link to your GitHub profile by forcing the diff to contain that
string. It would also allow the company's big wig to add however many they want,
with or without links to their profiles.

### Working with action outputs

This action produces two outputs: `diff`, containing effectively the diff
included in the PR, and `numberOfFiles`, with the list of files that have been
included in the PR. You can use that, for instance, this way:

```yaml
      - name: Info PR
        env:
          NUMBER_OF_FILES : ${{ steps.dev_check_pr.outputs.numberOfFiles }}
        run: |
          echo "::warning::We got files: $NUMBER_OF_FILES"
      - name: Fail if too big
        if: ${{ steps.dev_check_pr.outputs.numberOfFiles > 3 }}
        env:
          NUMBER_OF_FILES : ${{ steps.dev_check_pr.outputs.numberOfFiles }}
        run: |
          echo "::error::Too many files, there are $NUMBER_OF_FILES, should be at most 3"
          exit 1
```

to show the number of files present in the PR, as well as to fail if there are
too many files (to enforce keeping PRs small, for instance).

The `diff` output might contain a huge amount of information, which might make
it a bit hard to deal with via environment variables. Dealing with it otherwise,
via `github-script`, is probably fine.



## Contributing to development

Any suggestion, bug report, etc, is appreciated. Please check out or create an
[issue](https://github.com/JJ/github-pr-contains-action/issues) before
contributing a PR, if possible.

## Developing and testing

GitHub actions are notoriously hard to test in any other way than actually
running them, so this repository is set up for local tests in a `dev` branch;
create that branch and work with it until you're satisfied and merge it to
`main`.

> I write this as much for myself as for any other purpose...

## See also

There are several forks of this action, with additional features:

- [PR content checker by @jsoares](https://github.com/jsoares/gh-pr-content-checker/)
- [Francisco Giordano's `pr-content-checker`](https://github.com/francesco-giordano/gh-pr-content-checker)
- [Pablo Statsig's `pr-content-checker`](https://github.com/pablo-statsig/gh-pr-content-checker/)

## History

> Tags for every release are preceded by `releases/`

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
- `v11`: Adds a configuration variable that skips users, with dependabot skipped by default (or passed through).
- `v12`: Make it compatible with private repos. Upgrade to latest github API.
- `v13`: Fixes the use of `waivedUsers` which didn't actually work.
- `v14`: Eliminates setting of environment variables, documents using action
  output.
- `v14.1`: Refrains from doing diff stuff if no variable related to diff has
  been set

## License

(c) JJ Merelo, 2021-2014. Released under the MIT license. Read
[LICENSE](LICENSE) for more details.
