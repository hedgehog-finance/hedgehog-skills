# Optional Skills

Optional extension skills providing overseas market and global financial data capabilities. Does not include China A-share data. Contains 2 skill modules.

## Skill List

| Skill | Version | Description |
|------|------|------|
| `hog-finnhub` | 1.0.0 | Global stock data via Finnhub API (excludes China A-shares) |
| `hog-openbb` | 1.0.1 | Global financial data via OpenBB Platform (excludes China A-shares) |

## Directory Structure

Standard structure for each skill module:

```
<skill-name>/
├── SKILL.md        # Skill definition file (Agent instructions & tool descriptions)
├── package.json    # Metadata & dependency declarations
├── references/     # (Optional) API endpoint reference docs
└── scripts/        # (Optional) Invocation scripts
```

## License

[GPL-3.0](../LICENSE)
