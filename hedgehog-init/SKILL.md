---
name: hedgehog-init
description: > 
    连接刺猬投研AI的安装配置skill。 
    刺猬投研AI初始化连接配置安装hedgehog-plugin插件、用户认证token更新、安装hedgehog-skills-guide skill时使用。
    在非刺猬投研AI应用场景、hedgehog-workspace工作空间的非配置操作时不需要调用该skill。
---
version: 1.1

# 安装刺猬投研AI插件及配置

完成与刺猬投研AI应用的连接和配置，并重启生效，无需手动操作。
所有脚本使用 Node.js 编写，跨平台兼容（macOS / Linux / Windows），依赖系统Node运行环境。

## Tools基础功能说明

`Tools基础功能`一般由本Skill的`核心功能工作流(Workflow)`调用。在核心功能场景不适合时，或者Agent自由编排工作流时，或者提示词指定调用特定Tool时，才直接匹配的`Tools基础功能`。

所有Tools可执行的脚本逻辑位于 `scripts/` 目录：
scripts/
├── install.js        // 首次安装 / 重新配置
├── update-token.js   // 仅更新用户token
└── update-sys-prompt.js // 更新Agents.md和SOUL.md系统提示词
相关知识、规则、流程的MD文件放在`references/`目录：
references/
├── soul_config.md                // 用于设定Agent人格
└── agents_config.md               // 用于添加系统提示词

### Tool_1: 接入安装配置 

**功能**: 
刺猬投研AI连接安装配置。 
1. 安装 `@hedgehog-finance/hedgehog-plugin` 插件（npm 优先，失败后自动切换备用 zip 地址）
2. 写入 channel 配置（`enabled` / `accountId` / `token`）
3. 创建独立 agent 与 workspace（路径隔离）
4. 修改`SOUL.md` 身份设定（金融投资专家角色）
5. 修改AGENTS.md
6. 安装 `hedgehog-skills-guide` skill（GitHub 优先，失败后自动切换备用 zip 地址）
7. 重启 Gateway 使配置生效

**适用场景**: 
用户首次安装、重新绑定用户账号或接入失败需重新配置。

**调用参数 (Parameters)**: 
| 参数名 | 类型 | 必填 | 描述 | 默认值 | 
| :--- | :--- | :--- | :--- | :--- | 
| `token` | string | 是 | 用户的在hedgehog-app申请到的token | N/A | 
| `accountId` | string | 是 | 用户的账号 ID | N/A | 

**执行方法**: 
```
node scripts/install.js <token> <accountId>
```
---

### Tool_2: 更新用户token

**功能**: 
更新用户token（重新配置用户token）。 
1. 更新 `channels.hedgehog_finance.token` 配置项
2. 重启 Gateway 使新 token 生效

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

### Tool_3: 更新系统提示词

**功能**: 
升级/更新工作空间的系统提示词（SOUL.md、AGENTS.md）。 
1. 获取最新的系统提示词模板
2. 对比版本并按需同步至工作空间 `hedgehog-workspace`
3. 重启 Gateway 使新系统提示词生效

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

## 核心功能工作流(Workflow)

---
### Work_1: 首次接入安装 / 重新配置

**功能**: 首次接入安装刺猬投研AI，或者重新配置。 
**适用场景**: 当用户要求接入安装hedgehog-plugin，或者要求重新配置时。
**工作流**: 
1. 从用户对话中提取 `token` 和 `accountId`，若缺少则主动询问
2. 调用 `Tool_1` 执行安装配置
3. 把工作空间`hedgehog-workspace`中的Agent.md文件里的`Group Chats`章节内容改为
    You are prohibited from participating in group chats.
4. 脚本执行完毕后，告知用户：
    > 插件已安装并配置完成，即将重启 Gateway 使其生效。重启过程中连接会短暂断开，属正常现象，稍后重新连接即可开始使用 🎉
---
### Work_2: 更新用户Token

**功能**: 更新用户的hedgehog-app Token。 
**适用场景**: 当用户要求更新token时。
**工作流**: 
1. 从用户对话中提取新 `token`，若未提供则主动询问
2. 调用 `Tool_2` 更新配置
3. 脚本执行完毕后，告知用户：
   > token 已更新，即将重启 Gateway 使其生效。重启过程中连接会短暂断开，属正常现象，稍后重新连接即可 🎉
---
### Work_3: 更新系统提示词

**功能**: 使用Tool_3更新工作空间`hedgehog-workspace`的系统提示词SOUL.md、AGENTS.md。 
**适用场景**: 当Skill升级后，需要更新系统提示词时。
**工作流**: 
1. 调用 `Tool_3` 执行更新
2. **故障处理 (熔断机制)**:
   - 若脚本执行失败：必须立即终止当前工作流，直接将脚本报错信息作为最终回复告知用户。
3. **结果告知 (仅限脚本成功时)**:
   - 若检测到已是最新版本：告知用户无需更新。
   - 若执行了更新：告知用户系统提示词已更新，即将重启 Gateway 使其生效。重启过程中连接会短暂断开，属正常现象，稍后重新连接即可

---

## 补充说明

### 用户触发示例

#### 首次接入安装（触发Work_1）
帮我通过hedgehog-init安装hedgehog-plugin插件，我的 token 是 xxx，accountId 是 xxx

#### 重新配置（触发Work_1）
帮我重新配置接入刺猬投研，我的 token 是 xxx，accountId 是 xxx

#### 更新用户token（触发Work_2）
帮我更新一下刺猬投研插件的 token，新 token 是 xxx

#### 更新系统提示词（触发Work_3）
Skill升级了，帮我更新`hedgehog-workspace`系统提示词到最新版本

### 注意事项

- **accountId 类型**：配置文件中始终以字符串写入（`"138xxxx8888"`），防止纯数字被解析为整型导致接入失败。
- **网络兜底**：插件与 skill 均支持两级安装链路——npm / GitHub 优先，失败后自动切换备用 zip 地址，无需人工干预。
- **hedgehog-skills-guide 安装失败**：不会中断整体流程，脚本会给出警告提示，用户可事后手动安装。