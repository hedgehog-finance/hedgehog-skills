---
name: hedgehog-init
description: >
    连接刺猬投研AI的安装配置skill。
    刺猬投研AI初始化连接配置，安装/更新hedgehog-plugin插件、用户认证token更新、安装/更新hedgehog skills时使用。
    在非刺猬投研AI应用场景、hedgehog-workspace工作空间的非配置操作时不需要调用该skill。
version: 1.2.8
---

# 安装与更新刺猬投研AI插件及配置

一次性完成与刺猬投研AI应用的连接和配置；同时支持插件更新、用户配置更新、技能更新和系统提示词更新等维护操作。
所有脚本使用 Node.js 编写，跨平台兼容（macOS / Linux / Windows），依赖系统Node运行环境。

## Tools基础功能说明

`Tools基础功能`一般由本Skill的`核心功能工作流(Workflow)`调用。在核心功能场景不适合时，或者Agent自由编排工作流时，或者提示词指定调用特定Tool时，才直接匹配的`Tools基础功能`。

所有Tools可执行的脚本逻辑位于 `scripts/` 目录：
scripts/
├── install.js // 接入安装配置
├── get-hedgehog-config-status.js // 查询上次配置结果
├── update-hedgehog-plugin.js // 更新 hedgehog-plugin 插件
├── update-token.js   // 仅更新用户token
├── update-hedgehog-skills.js // 更新Hedgehog Skills
└── update-sys-prompt.js // 更新Agents.md和SOUL.md系统提示词
相关知识、规则、流程的MD文件放在`references/`目录：
references/
├── soul_config.md                // 用于设定Agent人格
└── agents_config.md               // 用于添加系统提示词

### Tool-1: 接入安装配置

**功能**:
完成刺猬投研AI接入所需的安装与初始化配置。
1. 安装 `hedgehog-plugin` 插件
2. 配置刺猬投研用户信息
3. 初始化 `hedgehog-workspace` 工作空间
4. 安装工作空间所需的 hedgehog skills

**适用场景**:
用户首次接入刺猬投研AI、重新绑定账号或要求重新完成接入安装配置。

**调用参数 (Parameters)**:
| 参数名 | 类型 | 必填 | 描述 | 默认值 |
| :--- | :--- | :--- | :--- | :--- |
| `token` | string | 是 | 用户的在hedgehog-app申请到的token | N/A |
| `accountId` | string | 是 | 用户的账号 ID | N/A |

**执行方法**:
```
node scripts/install.js <token> <accountId>
```
执行要求：后台任务

---

### Tool-2: 更新 hedgehog-plugin

**功能**:
更新 `hedgehog-plugin` 插件。

**适用场景**:
用户要求更新 hedgehog-plugin、升级刺猬投研插件、同步最新插件版本时。
1. 获取 hedgehog-plugin 插件包
2. 完成本地插件更新

**调用参数 (Parameters)**:
| 参数名 | 类型 | 必填 | 描述 | 默认值 |
| :--- | :--- | :--- | :--- | :--- |
| N/A | N/A | N/A | 该工具无需额外参数 | N/A |

**执行方法**:
```
node scripts/update-hedgehog-plugin.js
```
---

### Tool-3: 更新用户token

**功能**:
更新用户token（重新配置用户token）。
1. 更新 `channels.hedgehog_finance.token` 配置项

**适用场景**:
用户仅需更新 token，无需重新安装插件或重新配置账号。

**调用参数 (Parameters)**:
| 参数名 | 类型 | 必填 | 描述 | 默认值 |
| :--- | :--- | :--- | :--- | :--- |
| `new_token` | string | 是 | 用户新的token | N/A |

**执行方法**:
```
node scripts/update-token.js <new_token>
```
---

### Tool-4: 更新Hedgehog Skills

**功能**:
更新工作空间 `hedgehog-workspace` 中的 hedgehog skills。
1. 获取最新 hedgehog-skills 技能包
2. 更新工作空间 `hedgehog-workspace` 的hedgehog skills

**适用场景**:
用户要求更新 hedgehog skills、同步最新投研技能时。

**调用参数 (Parameters)**:
| 参数名 | 类型 | 必填 | 描述 | 默认值 |
| :--- | :--- | :--- | :--- | :--- |
| N/A | N/A | N/A | 该工具无需额外参数 | N/A |

**执行方法**:
```
node scripts/update-hedgehog-skills.js
```
---

### Tool-5: 更新系统提示词

**功能**:
升级/更新工作空间的系统提示词（SOUL.md、AGENTS.md）。
1. 获取最新的系统提示词模板
2. 对比版本并按需同步至工作空间 `hedgehog-workspace`

**适用场景**:
仅需同步更新系统提示词，无需重新安装插件或重新配置账号。

**调用参数 (Parameters)**:
| 参数名 | 类型 | 必填 | 描述 | 默认值 |
| :--- | :--- | :--- | :--- | :--- |
| N/A | N/A | N/A | 该工具无需额外参数 | N/A |

**执行方法**:
```
node scripts/update-sys-prompt.js
```

---

### Tool-6: 查询刺猬投研AI集成龙虾状态

**功能**:
读取本地配置状态记录，快速返回刺猬投研AI上次接入安装配置结论，不进行全量扫描，不发起网络请求。
1. 读取本地配置状态文件
2. 输出刺猬投研AI集成龙虾状态；脚本输出即最终回复内容

**适用场景**:
用户询问刺猬投研AI是否配置成功、接入是否完成、上次配置结果是否正常时。

**调用参数 (Parameters)**:
| 参数名 | 类型 | 必填 | 描述 | 默认值 |
| :--- | :--- | :--- | :--- | :--- |
| N/A | N/A | N/A | 该工具无需额外参数 | N/A |

**执行方法**:
```
node scripts/get-hedgehog-config-status.js
```
---

### Tool-7: 查询Agent当前状态

**功能**:
查询本Agent当前状态：包括Agent类型及版本、首次连接时间、操作系统、Node版本、Python版本、subagents配置、已安装的skill列表。

**适用场景**:
查询Agent当前状态；查询OpenClaw当前状态。

**执行指令**:
获取当前Agent类型和版本、当前channel首次连接时间、当前操作系统、Node版本（如果没安装填None）、Python版本（如果没安装填None）、当前subagents配置，以及获取当前已安装的skill列表。如果subagents配置读取失败或未配置，则对应字段填None。

**返回值**：
返回JSON结构
```
{
  "agent_info": {
    "type": "string",
    "version": "string",
    "first_connected_at": "string (ISO 8601 format)"
  },
  "environment": {
    "os": "string",
    "node_version": "string",
    "python_version": "string"
  },
  "subagents": {
    "maxSpawnDepth": "number | None",
    "maxChildrenPerAgent": "number | None"
  },
  "skills": [
    {
      "name": "string",
      "version": "string"
    }
  ]
}
```

---

### Tool-8: 用户数据备份

**功能**:
备份用户核心的投研数据（用户本地数据库文件备份）

**适用场景**:
用户数据备份；投研数据备份。

**执行方法**:
暂时未实现，无需执行

**返回值**：
Err: 暂时未实现.

---

## 核心功能工作流(Workflow)

---

### Work-1: 接入安装配置

**功能**: 完成刺猬投研AI接入安装配置。
**适用场景**: 用户明确要求接入安装、重新绑定账号或重新安装，并提供 `token` 与 `accountId` 时。
**不适用场景**: 用户仅询问是否成功、是否完成、当前状态或上次配置结果时，不得触发本工作流。
**工作流**:
1. 从用户对话中提取 `token` 和 `accountId`，若缺少则主动询问。
2. 以后台任务方式调用 `Tool-1` 发起接入安装；调用后立即回复用户，不等待安装完成，不跟踪后台进程或读取安装日志。
3. 回复用户：`**刺猬投研AI集成龙虾配置已开始**，请等待 5 分钟，再发送 \`帮我看一下刺猬投研AI集成龙虾状态\` 查询集成龙虾状态。`

---

### Work-2: 更新 hedgehog-plugin

**功能**: 更新刺猬投研AI的 hedgehog-plugin 插件。
**适用场景**: 当用户要求更新 hedgehog-plugin 或升级刺猬投研插件时。
**工作流**:
1. 调用 `Tool-2` 更新 hedgehog-plugin 插件
2. 脚本执行完毕后，告知用户插件已更新。
3. 重启 Gateway 使插件生效

---

### Work-3: 更新用户Token

**功能**: 更新用户的hedgehog-app Token。
**适用场景**: 当用户要求更新token时。
**工作流**:
1. 从用户对话中提取新 `token`，若未提供则主动询问
2. 调用 `Tool-3` 更新配置
3. 脚本执行完毕后，告知用户：
   > token 已更新，即将重启 Gateway 使其生效。重启过程中连接会短暂断开，属正常现象。
4. 重启 Gateway 新 token 生效

---

### Work-4: 更新Hedgehog Skills

**功能**: 使用Tool-4更新工作空间`hedgehog-workspace`的hedgehog skills。
**适用场景**: 当用户要求更新 hedgehog skills、检查技能版本、同步最新投研技能、安装新增 hedgehog skill、或者询问是否需要更新技能时。
**工作流**:
1. 调用 `Tool-4` 执行更新
2. 故障处理 (熔断机制):
   - 若脚本执行失败：必须立即终止当前工作流，直接将脚本报错信息作为最终回复告知用户。
3. 结果告知 (仅限脚本成功时):
   - 若检测到已是最新版本：告知用户无需更新。
   - 若执行了更新：告知用户 hedgehog skills 已更新。

---

### Work-5: 更新系统提示词

**功能**: 使用Tool-5更新工作空间`hedgehog-workspace`的系统提示词SOUL.md、AGENTS.md。
**适用场景**: 当hedgehog-init Skill升级后，需要更新系统提示词时。
**工作流**:
1. 调用 `Tool-5` 执行更新
2. 故障处理 (熔断机制):
   - 若脚本执行失败：必须立即终止当前工作流，直接将脚本报错信息作为最终回复告知用户。
3. 结果告知 (仅限脚本成功时):
   - 若检测到已是最新版本：告知用户无需更新。
   - 若执行了更新：告知用户系统提示词已更新。

---

### Work-6: 查询配置状态

**功能**: 快速查询刺猬投研AI上次接入安装配置结果。
**适用场景**: 当用户询问刺猬投研AI集成龙虾状态、接入状态、配置状态或上次接入结果时。
**优先级**: 本工作流优先于 `Work-1`；用户没有明确提供 `token` 与 `accountId` 并要求重新安装时，不得转入 `Work-1`。
**工作流**:
1. 只调用 `Tool-6` 查询本地配置状态记录
2. 原样返回 `Tool-6` 输出；不得改写、总结、补充建议或追加后续查询说明
3. 禁止调用除 `Tool-6` 之外的任何工具；禁止主动跟踪后台进程、轮询任务状态或读取安装日志
4. 禁止根据查询结果自动发起安装、重新安装、恢复安装或重启 Gateway

---

## 补充说明

### 用户触发示例

#### 接入安装配置（触发Work-1）
帮我通过hedgehog-init接入刺猬投研AI，我的 token 是 xxx，accountId 是 xxx

#### 更新 hedgehog-plugin（触发Work-2）
帮我更新hedgehog-plugin插件

#### 更新用户token（触发Work-3）
帮我更新一下刺猬投研插件的 token，新 token 是 xxx

#### 更新Hedgehog Skills（触发Work-4）
帮我更新`hedgehog-workspace`的hedgehog skills

#### 更新系统提示词（触发Work-5）
Skill升级了，帮我更新`hedgehog-workspace`系统提示词到最新版本

#### 查询配置状态（触发Work-6）
帮我看一下刺猬投研AI集成龙虾状态

#### 查询Agent当前状态（触发Tool-7）
帮我查询Agent当前状态

#### 备份用户数据（触发Tool-8）
帮我备份用户数据

### 注意事项

- **accountId 类型**：配置文件中始终以字符串写入（`"138xxxx8888"`），防止纯数字被解析为整型导致接入失败。
- **网络源**：插件使用插件包发布源进行本地安装和更新；安装 skill 时会先使用主技能包源，再使用备用技能包源补齐缺失项；更新 skill 时直接使用技能包发布源。
- **hedgehog skills 安装失败**：不会中断整体流程，脚本会给出警告提示，用户可事后手动安装。
