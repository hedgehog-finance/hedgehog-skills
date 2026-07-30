# Optional Skills

可选扩展技能，提供海外市场与全球金融数据能力，不包含 A 股数据。共 2 个技能模块。

## 技能列表

| 技能 | 版本 | 说明 |
|------|------|------|
| `hog-finnhub` | 1.0.0 | 通过 Finnhub API 获取全球股票数据（不含 A 股） |
| `hog-openbb` | 1.0.1 | 通过 OpenBB Platform 获取全球金融数据（不含 A 股） |

## 目录结构

每个技能模块的标准结构：

```
<skill-name>/
├── SKILL.md        # 技能定义文件（Agent 指令与工具描述）
├── package.json    # 元数据与依赖声明
├── references/     # （可选）API 端点参考文档
└── scripts/        # （可选）调用脚本
```

## 许可证

[GPL-3.0](../LICENSE)
