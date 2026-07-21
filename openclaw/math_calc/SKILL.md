---
name: math_calc
version: 1.0.0
description: >
    Safe mathematical expression evaluator. Supports arithmetic, exponents,
    parentheses, trigonometry, logarithms, factorial, conditionals, and constants
    (pi, e). No eval() used — pure parser-based evaluation.
    Triggers: calculate | math | compute | evaluate expression
---

# 数学计算器

安全数学表达式求值工具，基于 expr-eval 解析器实现，支持算术运算、三角函数、对数、阶乘、条件表达式等。

## 运行环境

- **Node.js**: >=18

## 依赖安装

首次使用前需安装依赖：

```bash
cd <skill_path> && npm install
```

## 使用方法

```bash
node <skill_path>/cli.mjs "<expression>" [--precision N]
```

其中 `<skill_path>` 替换为本技能的实际安装路径。

## 参数说明

| 参数 | 必填 | 说明 |
|---|---|---|
| `<expression>` (位置参数) | 是 | 数学表达式 |
| `--precision N` | 否 | 小数精度，默认 10，最大 15 |

## 支持的运算

### 基础运算
- 加减乘除：`+`, `-`, `*`, `/`
- 幂运算：`^` 或 `**`
- 取模：`%`
- 括号：`()`

### 三角函数
- `sin(x)`, `cos(x)`, `tan(x)`
- `asin(x)`, `acos(x)`, `atan(x)`

### 对数函数

> **⚠️ 注意**：`log(x)` 是**自然对数**（底 e），不是常用对数！
> 如需以 10 为底的对数，必须使用 `log10(x)`。

| 函数 | 含义 | 底数 | 示例 |
|------|------|------|------|
| `log(x)` 或 `ln(x)` | 自然对数 | e ≈ 2.718 | `log(e)` = 1 |
| `log10(x)` | 常用对数 | 10 | `log10(1000)` = 3 |
| `log2(x)` | 二进制对数 | 2 | `log2(8)` = 3 |

### 其他函数
- `sqrt(x)`：平方根
- `cbrt(x)`：立方根
- `abs(x)`：绝对值
- `ceil(x)`, `floor(x)`, `round(x)`：取整
- `trunc(x)`：截断小数
- `exp(x)`：e 的 x 次方
- `hypot(x, y)`：平方和开方
- `sign(x)`：符号函数
- `fact(x)` 或 `x!`：阶乘

### 常量
- `pi` 或 `PI`：圆周率 (3.14159...)
- `e` 或 `E`：自然常数 (2.71828...)

### 条件表达式
- `x > y ? x : y`：三元运算符
- 比较：`<`, `>`, `<=`, `>=`, `==`, `!=`
- 逻辑：`and`, `or`, `not`

## 示例

```bash
# 基础运算
node <skill_path>/cli.mjs "2 + 3 * 4"
# 输出: 14

# 三角函数
node <skill_path>/cli.mjs "sin(pi / 2)"
# 输出: 1

# 对数
node <skill_path>/cli.mjs "log10(1000)"
# 输出: 3

# 对数（注意 log 是自然对数）
node <skill_path>/cli.mjs "log(e)"
# 输出: 1
node <skill_path>/cli.mjs "log10(100)"
# 输出: 2

# 阶乘
node <skill_path>/cli.mjs "fact(5)"
# 输出: 120

# 复合表达式
node <skill_path>/cli.mjs "sqrt(3^2 + 4^2)"
# 输出: 5

# 指定精度
node <skill_path>/cli.mjs "pi" --precision 15
# 输出: 3.141592653589793

# 条件表达式
node <skill_path>/cli.mjs "5 > 3 ? 100 : 200"
# 输出: 100
```

## 约束

- 表达式为空或无效时返回错误信息。
- 结果为非有限数（溢出或无效运算）时返回错误。
- 不支持变量赋值或自定义变量（仅支持内置常量 pi、e）。
