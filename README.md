# cimoc-sources → VeneraNext

把 [Cimoc](https://github.com/Haleydu/Cimoc) 的 Java 漫画源翻译成 VeneraNext 可用的 JS 源，并按当前线上站点补写了几个新源。

## 导入

Venera：**漫画源 → 右上角「+」→ 填仓库地址 → 逐个 Add**

```
https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/index.json
```

## 当前可用（已实测搜索→详情→章节图）

| 源 | key | 站点 | 实测 |
|---|---|---|---|
| 腾讯动漫 | `tencent` | ac.qq.com | 搜索 9 / 章 13 / 图 19 |
| 大树漫画 | `dashu` | dashumanhua.com | 搜索 15 / 章 1178 / 图 104 |
| 漫客栈 | `mkzhan` | mkzhan.com | 搜索 10 / 章 138 / 图 11 |

## 你点名的 10 个站

| 站点 | 状态 | 说明 |
|---|---|---|
| 大树漫画 | ✅ 可用 | 新增 `dashu.js`，图片为页面内 `eval(p,a,c,k,e,d)` 打包，源里已内置解包 |
| 漫客栈 | ✅ 可用 | 新增 `mkzhan.js`，图片走 `comic.mkzcdn.com/chapter/content/` 接口 |
| 动漫屋 | ⚠️ 改版 | 站点 2026-09 改版：详情页不再输出章节列表，改由 JS 异步取，旧选择器失效，需重新逆向 |
| 百年漫画 | ⚠️ 空壳 | `bnmanhua.com` 已停；现 `bmanhua.com` 只是导航页，阅读页跳转到漫客栈等原站，自己不出图 |
| 包子漫画G站 | ⚠️ 图片加密 | `baozimh.org` 可访问，搜索/详情/章节走 `v2.apikk.top` 接口，但图片列表由 21KB 混淆脚本解密，暂无法在源内还原 |
| 如漫画 | ⚠️ 图片加密 | `rumanhua2.com`（http）可访问，搜索/详情/章节正常，章节图为页面内自定义 base64+XOR 加密 |
| Vomic | ⚠️ WAF | `vomicmh.com` 详情页可开，但搜索路径被 WAF 拦（HTTP 567），无法完成搜索流程 |
| 酷漫屋 | ❌ 已变质 | `kumanwu.cc` 现在是短视频站（`/video/`，带成人广告），不再是漫画站 |
| 拷贝漫画 | ❌ 网络不通 | 现域名 `www.mangacopy.com` 在本机被重置/超时，需代理才能验证 |
| 有妖气 | ❌ 已停运 | 2022 年底停运，`u17.com` 无响应，作品并入哔哩哔哩漫画 |

其余 45 个 Cimoc 旧源大多建于 2020 年前后，域名失效/停放/空壳，原因见 `unavailable.json`。

## 结构

```
index.json        源清单（Venera 读取入口，只放可用源）
unavailable.json  不可用清单（含原因）
*.js              各源实现
```

`index.json` 每项：`name` / `fileName` / `key` / `version`，可选 `description`。

## 说明

- 三个可用源都在本机用 curl+cheerio 跑通「搜索 → 详情 → 章节图」三步后才放进 `index.json`。
- 失效/待修的源文件仍留在仓库里，方便日后按站重写。
- 所有源都未实现 `favorites`（Cimoc 收藏是本地数据库，没有远端接口）。
