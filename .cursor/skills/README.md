# Project Skills

Cursor Agent Skills for vibe coding [andraewilliams.com](https://andraewilliams.com).

Skills live here so anyone working in this repo gets the same project context, design rules, and workflows.

## Included skills

| Skill | When it applies |
|-------|-----------------|
| [vibe-coding](vibe-coding/SKILL.md) | Default workflow for any change in this repo |
| [site-design](site-design/SKILL.md) | Styling, layout, animations, cyberpunk aesthetic |
| [add-site-tool](add-site-tool/SKILL.md) | Adding a new tool, mini-app, or playground page |

## How to use

**Automatic:** Cursor loads skills from `.cursor/skills/` when they match your request. Just describe what you want — e.g. "add a color picker tool" or "make the sidebar glow more."

**Explicit:** Name a skill in chat if you want that workflow specifically:

```
Use the add-site-tool skill to scaffold a new canvas drawing tool.
```

## Add a new skill

1. Copy `_template/` to a new folder: `.cursor/skills/your-skill-name/`
2. Edit `SKILL.md` frontmatter (`name`, `description`)
3. Keep the body under ~500 lines; link to `docs/` for long reference material
4. Commit the folder — project skills are shared via git

## Skill authoring tips

- **Description** is how Cursor decides when to load the skill. Include trigger words (stack, page names, tasks).
- **Concise beats comprehensive** — the agent already knows web dev; add only project-specific rules.
- **Point to docs** instead of duplicating them: `docs/project_brief.md`, `docs/decisions.md`, `docs/plans/`.
