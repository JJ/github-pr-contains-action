# WAT

Check your PR to either

- contain (or not) a string in the PR diff using a regular expression
- contain (or not) a string in the PR body using a regular expression
- to not change more than X files
- to not change more than X lines
- exclude files from being checked by the diff-rules
- exclude users being allowed to break any rules

This action is designed to _only_ run on PRs.

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
          # PR body (description) needs to include Test
          bodyContains: '.*Test.*'
          # PR body (description) is not allowed to include FIXME
          bodyDoesNotContain: '.*FIXME.*'
          # PR needs to include LICENSE
          diffContains: '.*LICENSE.*'
          # PR diff is not allowed to include TODO:
          diffDoesNotContain: '.*TODO:.*'
          # Files to exclude from being checked. Use a multiline string,
          # each line should be one filepath relative to the repository root
          diffFilesToExclude: |
            .github/workflows/check.yml
            README.md
          # PR is not allowed change more than 5 files
          filesChanged: 5
          # PR is not allowed to change more than 20 lines
          linesChanged: 20
          # allowed to break all rules
          waivedUsers: ['dependabot[bot]']
```

You might want to qualify possible events that trigger this action, for intance, this way:

```yaml
  pull_request:
    types:
      [opened, edited, assigned, closed, synchronize, review_requested, ready_for_review]
```

This will skip diff checks every single push, for instance. Please remember that _this action will only work in pull
requests_, since it checks the pull request object payload. It will simply skip any check (with a warning) if it is not
triggered by a `pull_request` or `pull_request_target` event.


## Changelog

- `v1`: Initial fork with full regular expression support and project alignment
- `v2`: Rewrite entirely for maintainability and readability. Add tests. Add ability to exclude files

## Development

### Initial Setup

After you've cloned the repository to your local machine or codespace, you'll need to perform some initial setup steps
before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of [Node.js](https://nodejs.org) handy (20.x or later should work!).
> If you are using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`nvm`](https://github.com/nvm-sh/nvm), this template has a `.node-version` file at the root of the repository that
> will be used to automatically switch to the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node` actions.

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

- [PR content checker by @jsoares](https://github.com/jsoares/gh-pr-content-checker/) includes `diffDoesNotContain`
- [Francisco Giordano's `pr-content-checker`](https://github.com/francesco-giordano/gh-pr-content-checker)
- [Pablo Statsig's `pr-content-checker`](https://github.com/pablo-statsig/gh-pr-content-checker/)

## Credits

This repository has been based on the work of
[ApoorvGuptaAi/github-pr-contains-action](https://github.com/ApoorvGuptaAi/github-pr-contains-action).

## License

This is a modification of the original template, and is released under the MIT license.
