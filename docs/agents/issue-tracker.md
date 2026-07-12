# Issue tracker: GitHub

Issues and PRDs live in GitHub Issues. Use the `gh` CLI for tracker operations and infer the repository from `git remote -v`.

Issue titles, bodies, comments, and completion summaries use Chinese by default. Labels, commands, paths, code identifiers, configuration keys, and original errors keep their source tokens.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

## Request surface

External pull requests are also triage request inputs. Pull requests opened by owners, members, or collaborators remain part of the normal development workflow rather than the external request queue.

When a skill says to publish to the issue tracker, create a GitHub Issue. When it asks for a related ticket, read the Issue and its comments with `gh issue view`.

