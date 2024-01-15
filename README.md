# Checking PR bodies and diffs for words, and number of files and lines in files changed [![Basic installation and build checks](https://github.com/JJ/github-pr-contains-action/actions/workflows/checkin.yml/badge.svg)](https://github.com/JJ/github-pr-contains-action/actions/workflows/checkin.yml)

Originally based on the
[actions TS template](https://github.com/actions/typescript-template), it checks
for the presence/absence of a string or group of strings in the body or diff in
a PR, as well as certain conditions on the PR: number of files changed, and
number of lines changed.

It uses the GitHub API, so you'll need to provide a token. Don't worry, that's
built-in.

## Using this action

You would need to put this in a YAML file in the `.github/workflows` directory

```yaml
name: 'Check PR content'
on: [pull_request]

jobs:
  check_pr:
    runs-on: ubuntu-latest
    steps:
      - name: Check PR
        uses: EugenMayer/github-pr-contains-action@releases/v1
        with:
          github-token: ${{github.token}}
          bodyDoesNotContain: 'Delete|this'
          bodyContains: 'Test'
          diffContains: ';'
          diffDoesNotContain: 'TODO|to do'
          filesChanged: 1
          linesChanged: 1
          waivedUsers: ['dependabot[bot]']
```

The `bodyContains` variable will include the string that we want the body of the
PR to include, such as checked items in a checklist; obviously
`bodyDoesNotContain` will hold the opposite, what we don't want to see in the PR
body. Any of them can have a `|` separated list of words or expressions. The PR
will check it contains _any_ of the words in `bodyContains` and _none_ of the
words in `bodyDoesnotContain`.

Same pattern for `diff(Contains|DoesNotContain)`. Can be a word or list of words
you want in the diff (for instance, you want it to _always_ change code so it
contains a statement terminator) or don't want in the diff (for instance, you
don't want it to include TODOs because people never ever _do_ them).

Finally, `waivedUsers` is a YAML array that contains the users that will be
spared from running these checks; if the PR is triggered by one of those users,
it will exit with a warning and with a green status. By default, it has the
value `["dependabot[bot]"]`. If you want to edit more and want to keep
dependabot PRs from failing, add it to your list.

You might want to qualify possible events that trigger this action, for intance,
this way:

```yaml
  pull_request:
    types:
      [opened, edited, assigned, closed, , synchronize, review_requested, ready_for_review]
```

This will skip diff checks every single push, for instance. Please remember that
_this action will only work in pull requests_, since it checks the pull request
object payload. It will simply skip any check (with a warning) if it is not
triggered by a `pull_request` or `pull_request_target` event.

For instance, you might want to use a GitHub action such as
[this one](.github/workflows/contributors.yaml) for the `CONTRIBUTORS.md` file:

```yaml
name: 'Check contributors file additions'
on:
  pull_request:
    types: [opened, edited]
    paths:
      - CONTRIBUTORS.md

jobs:
  check_pr:
    name: 'Checks contributors'
    runs-on: ubuntu-latest
    steps:
      - name: Check PR
        uses: EugenMayer/github-pr-contains-action@releases/v1
        with:
          github-token: ${{github.token}}
          linesChanged: 1
          filesChanged: 1
          diffContains: github.com/
          waivedUsers: ['dependabot[bot]', 'CompanyBigWig']
```

It would check that there's only a single file modified (because why would you
need to change another, if all you want is to add your name to the contributors'
file), a single line is changed (because you're only one, right?) and that it
includes a link to your GitHub profile by forcing the diff to contain that
string.

## History

- `v1`: Initial fork with full regexp support and project alignment

## Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy (20.x or later should work!). If you are
> using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`nvm`](https://github.com/nvm-sh/nvm), this template has a `.node-version`
> file at the root of the repository that will be used to automatically switch
> to the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node`
> actions.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ npm test

   PASS  ./index.test.js
     ✓ throws invalid number (3ms)
     ✓ wait 500 ms (504ms)
     ✓ test runs (95ms)

   ...
   ```

## See also

There are several forks of this action, with additional features:

- [PR content checker by @jsoares](https://github.com/jsoares/gh-pr-content-checker/)
  includes `diffDoesNotContain`
- [Francisco Giordano's `pr-content-checker`](https://github.com/francesco-giordano/gh-pr-content-checker)
- [Pablo Statsig's `pr-content-checker`](https://github.com/pablo-statsig/gh-pr-content-checker/)

## Credits

This repo has been based on the work of
[ApoorvGuptaAi/github-pr-contains-action](https://github.com/ApoorvGuptaAi/github-pr-contains-action).

## License

This is a modification of the original template, and is released under the MIT
license.
