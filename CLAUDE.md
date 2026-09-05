# Project conventions

- Avoid bare literals (magic numbers/strings) in code and tests. Assign them to a named `const` first, then reference the const. This makes intent explicit and keeps values easy to change in one place.
- Never create git commits in this repo. The user always writes commits themselves.
- Stick to the specific issue and files you're asked to work on. Don't expand a fix into other files (e.g. the action's source) just because you notice a related underlying bug there — flag it and leave it for a separate issue unless explicitly asked to fix it too.
- Before "fixing" a step that reads another step's output, check whether the producing step actually sets that output for the inputs it's given (e.g. via action.yml's documented outputs vs. the source's actual conditional logic) rather than assuming it's a workflow-only bug or reaching for a redundant re-fetch (like a duplicate API call) to work around it.
