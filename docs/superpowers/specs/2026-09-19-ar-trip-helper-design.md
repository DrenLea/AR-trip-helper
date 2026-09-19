# AR Trip Helper：开发设计文档

日期：2026-09-19  
状态：已确认，待实现计划  
目标平台：Android 优先的 PWA（Chrome）

## 1. 项目摘要

AR Trip Helper 是一个以“体力与时间双预算”为核心的自由行辅助工具。它把地图、公共交通、POI、餐饮/景点评价、开放文化遗产与用户约束统一成可解释的日程规划，并在到达 POI 后提供语音/文字解说和可复用的在线 3D/AR 资源。

本次黑客松使用两个城市能力包验证底层能力：

- 罗马：文化时间层、历史解说、在线 3D/AR 资产、公交串联。
- 贵阳：步数/坡度/休息/用餐约束、无障碍风险、公交可达性。

城市不是业务逻辑分支。新增城市只需增加数据适配器、城市规则和内容资产索引。

## 2. 目标与非目标

### 目标

1. 用户输入日期、起止位置、兴趣、步数上限、休息间隔、用餐时间、行动/无障碍偏好。
2. 系统输出一日行程：POI 顺序、到离时间、步行距离、公交线路/换乘、休息与用餐节点、约束解释。
3. 用户可查看“为什么推荐/为什么排除”，并手动锁定、替换或缩短某个节点。
4. 抵达 POI 后可播放短解说，并尝试加载带许可证元数据的在线 glTF/GLB 或 WebXR 内容。
5. Android Chrome 无 WebXR 时降级为相机叠加、3D 预览或普通地图，不阻断行程。
6. 数据源不可用、闭馆、交通数据过期时有明确降级和更新时间提示。

### 非目标（24 小时内不做）

- 原生 Android App、后台持续定位、社交分享、支付/订票。
- 自建 3D 模型、AI 生成历史复原、全量爬取点评网站。
- 对所有城市做实时、全量、商业级无障碍保证。
- 直接复制无明确再分发许可的图片、模型、点评文本。

## 3. 差异化叙事

产品不是“输入偏好后生成一段旅行文案”，而是一个可验证的约束规划器：

`路线价值 = 兴趣匹配 + 文化价值 + 口碑可信度 + 公交便利度 - 步行负担 - 坡度/无障碍风险 - 换乘成本 - 回头路 - 闭馆/拥挤风险`

核心展示指标：预计步数、连续步行最长段、休息间隔、公交换乘次数、回头路比例、数据新鲜度、每个排除项的原因。

与圆周旅记、TripIt 或普通地图的区别：路线不是内容列表，而是由体力预算、时间窗和交通可达性共同约束的可解释计划；AR 只是计划执行层，不是孤立的视觉特效。

## 4. 用户流程

1. 选择城市能力包（首批：Rome、Guiyang）。
2. 设置日期、起点/终点、兴趣权重和身体约束：日步数、单段最长步行、休息间隔、用餐时段、坡度/台阶容忍度、轮椅/助行器需求。
3. 规划器先筛选开放时间与硬约束，再用公交与步行网络生成候选路线。
4. 结果页以“时间轴 + 地图 + 体力仪表盘”呈现；每段显示步行、公交、换乘和风险标签。
5. 用户锁定或替换节点，系统局部重算，不重新生成整条行程。
6. 到达节点后打开“解说/AR”：文本、语音、图片或远程 3D 资产按许可证与设备能力降级。
7. 用户可反馈“实际更累/入口关闭/无障碍不准确”，写入本地事件日志，供后续校准。

## 5. 系统架构

```text
PWA UI (Android Chrome)
  ├─ 行程时间轴 / 地图 / 体力仪表盘 / 解说与 AR 面板
  └─ 本地缓存、离线最近一次行程、设备能力检测
        │ REST/JSON
Planner API
  ├─ City Pack Registry
  ├─ Source Adapters（地图、GTFS、POI、评价、无障碍、文化资产）
  ├─ Constraint Planner（过滤、候选、排序、局部重算）
  ├─ Explanation Engine（评分与排除原因）
  └─ Content/AR Resolver（许可、资产格式、降级）
        │
Cache/Index（GeoJSON、GTFS、POI、内容清单）
```

### 模块边界

- `city-pack`：城市标识、语言、数据源、步行/坡度系数、交通规则、精选 POI 与 AR 资产清单。
- `source-adapters`：把外部数据映射为内部 `Place`、`TransitFeed`、`AccessFeature`、`HeritageAsset`。
- `planner`：只依赖内部模型和用户约束，不读取具体供应商字段。
- `explanations`：输出评分分解、硬约束命中、降级原因；禁止在 UI 中重新计算。
- `content-ar`：校验许可证、来源、版本、设备能力，返回 `webxr | camera-overlay | model-viewer | link-only`。
- `telemetry`：只记录匿名规划耗时、数据源状态、用户显式反馈；默认不上传精确位置。

## 6. 统一数据模型（MVP）

```ts
type Place = {
  id: string; cityId: string; name: string; category: 'food'|'sight'|'museum'|'rest';
  lat: number; lon: number; openingHours?: OpeningHours[];
  interestTags: string[]; rating?: { value: number; count?: number; source: string };
  access?: { stepFree?: 'yes'|'no'|'unknown'; toilet?: 'yes'|'no'|'unknown';
    slopeRisk?: 'low'|'medium'|'high' };
  sourceRefs: SourceRef[]; explanationHints?: string[];
};

type Leg = { mode: 'walk'|'transit'|'rest'|'meal'; from: string; to: string;
  durationMin: number; distanceM?: number; steps?: number; transfers?: number;
  routeRef?: string; riskFlags: string[]; dataFreshAt?: string };

type Itinerary = { cityId: string; date: string; stops: Stop[]; legs: Leg[];
  totals: { steps: number; walkM: number; transitMin: number; transfers: number; backtrackM: number };
  explanations: Explanation[]; freshness: FreshnessReport };
```

## 7. 规划算法与约束优先级

### 硬约束

- POI 在用户到达时间必须开放，或明确标记“待确认”。
- 总步数不超过上限；单段步行不超过上限。
- 用餐窗口、固定预约和起止时间不可冲突。
- 轮椅模式排除已知台阶/不可达入口；未知数据不得标记为无障碍，只显示“未验证”。

### 软约束与排序

1. 兴趣匹配与文化主题连贯性。
2. 公共交通覆盖和换乘惩罚。
3. 步行距离、坡度、连续行走时间。
4. 少走回头路（对路线总长度与重复边加惩罚）。
5. 评分可信度、数据新鲜度和拥挤/闭馆风险。

24 小时 MVP 使用“候选 POI 截断 + 时间窗过滤 + 加权贪心/局部交换”而非复杂全局求解器。接口保留 `PlannerStrategy`，后续可替换 OR-Tools 或图搜索实现。每次局部重算只影响锁定点之间的窗口，降低延迟和 Token/计算成本。

## 8. 数据策略与罗马首发数据集

### 优先级

1. 官方开放数据/API。
2. OpenStreetMap/Wikidata 等开放许可数据。
3. 获授权第三方 API（只缓存许可允许的字段）。
4. 预置精选样例或外链；禁止无授权抓取。

### 罗马数据源候选

- Roma Capitale 开放数据目录：城市 POI、行政和专题数据。
- Roma Servizi per la Mobilità / data.europa.eu：ATAC 等公共交通 GTFS，优先静态时刻表，实时数据作为可选层。
- OpenStreetMap：道路、步行网络、坡度/台阶/无障碍标签（未知即未知）。
- SITAR：罗马考古信息与空间/年代语义，适合历史时间层索引。
- Open Heritage 3D、Google Arts & Culture Open Heritage：检索可复用或可外链的遗产模型；逐资产保存许可证、署名、来源 URL 和更新时间。
- Wikidata/Wikimedia Commons：多语言名称、历史摘要和图片；每条内容保存来源与许可证。
- Google Places/Tripadvisor/Yelp 等：只在拥有合法 API 凭据时接入；Demo 可用小型本地快照并显著标注“示例数据/更新时间”。

### 资产许可规则

`assetPolicy = { license, attribution, sourceUrl, redistributable, expiresAt? }`。`redistributable=false` 时只允许跳转或远程嵌入；许可证缺失时不进生产索引。

## 9. 解说与 AR 设计

- 解说卡片字段：标题、30–60 秒中文/英文文本、来源、时代、可信度、音频 URL（如有）、许可证。
- Token 节省：优先读取预编写短文本；大模型只在用户主动追问时生成，并限制上下文为当前 POI 与 3 条来源摘要。
- 罗马 Demo 的最小闭环：一个路线、3 个历史节点、1 个在线 GLB/3D 资产、1 个时间滑杆（现状/古代）、1 个语音播放按钮。
- AR 适配顺序：WebXR hit-test/地理锚点 → 相机叠加 + 方位校准 → `<model-viewer>` 3D 预览 → 外部资产链接。
- 不自行生成 3D 模型，不复制来源站点未授权媒体。

## 10. Android PWA 技术约束

- HTTPS、Service Worker、Web App Manifest、响应式布局、大字号模式。
- Android Chrome 优先；检测 WebXR、陀螺仪、定位授权和网络状态。
- 首屏只加载当前城市包、当前路线和必要地图瓦片；AR 资产按需加载并限制大小。
- 离线缓存最近一次行程、城市基础 POI 和解说摘要；不缓存敏感精确轨迹。
- 需要定位/相机/传感器权限时在用户点击对应功能后再请求，并提供拒绝后的地图降级。

## 11. 24 小时开发切片

### 0–2 小时：骨架

初始化 PWA、数据模型、城市包注册、静态 Demo 数据与部署流水线。

### 2–6 小时：规划内核

完成步数/时间窗/休息/用餐/公交换乘约束、可解释评分和一条罗马样例路线。

### 6–10 小时：地图与交通

接入 OSM/地图渲染、GTFS 静态数据解析；显示步行段、公交段、换乘和数据时间。

### 10–14 小时：解说与 AR

实现 POI 解说卡片、语音播放、在线 3D 资产解析、WebXR/3D/链接降级。

### 14–18 小时：贵阳城市包

接入体力、坡度、无障碍字段与精选路线，复用同一规划接口。

### 18–21 小时：Android QA

测试权限拒绝、断网、过期 GTFS、超步数、闭馆、无 AR 能力等场景。

### 21–24 小时：演示与文档

准备 3 分钟演示脚本、架构图、数据许可清单、已知限制和下一步路线图。

## 12. 验收标准

- 新增城市只修改城市包/适配器，不修改规划器核心逻辑。
- 罗马路线满足用户设定的步数、时间窗、休息和用餐约束；每个推荐/排除项有解释。
- 至少展示一次公共交通换乘，并显示线路来源和更新时间。
- AR 资产有来源和许可证字段；WebXR 不可用时能完成降级。
- 贵阳模式能显示无障碍“已验证/未知/有风险”，不能把未知宣称为无障碍。
- 断网或单一数据源失败时，用户仍能查看最近一次行程或预置样例。
- Android Chrome 首屏可操作，字号和触控目标适合银发用户。

## 13. 风险与后续

- 地图/点评 API 配额和许可：用适配器、缓存与本地精选快照隔离风险。
- 无障碍数据不完整：分级标记“已验证/未知/有风险”，引导用户反馈。
- AR 地理锚定漂移：提供手动校准和普通地图兜底。
- 历史内容准确性：每条解说保留来源、编辑者和置信度，不让模型杜撰。
- 实时交通波动：首发以静态 GTFS 为基线，实时信息仅改变提示，不破坏已确认行程。

后续扩展顺序：更多罗马遗产资产 → 贵阳真实无障碍数据 → 上海/京都城市包 → 预约/票务 → 用户共享与个性化模型。
