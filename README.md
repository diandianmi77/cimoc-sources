# cimoc-sources → VeneraNext

把 [Cimoc](https://github.com/Haleydu/Cimoc)（release-tci 分支）的 **47 个 Java 漫画源**逐行翻译成 VeneraNext 可用的 JS 源。

## 导入

Venera：**漫画源 → 右上角「+」→ 填下面的仓库地址 → 进入列表后逐个点 Add**

```
https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/index.json
```

或直接用 raw 地址：

```
https://raw.githubusercontent.com/diandianmi77/cimoc-sources/main/index.json
```

单个源也可以走「Use a config file」直接选本仓库里的 `<key>.js`。

## 结构

```
index.json     源清单（Venera 读取入口）
*.js           47 个源，与 index 中 fileName 一一对应
```

`index.json` 每项：`name` / `fileName` / `key` / `version`，可选 `description`。

## 源清单

| 源 | key | 备注 |
|---|---|---|
| 2animx | `animx2` | 懒加载分页逐页取图 |
| 百年漫画 | `bai_nian` | 表单 POST 搜索 |
| 布卡漫画 | `buka` | JSON 搜索接口 |
| 动漫狂 | `cartoonmad` | 原站 BIG5 搜索改为 UTF-8 |
| CC漫画 | `ccmh` | 按 `?p=n` 逐页取图 |
| CC图库 | `cctuku` | 仅保留主题分类 |
| 吹雪漫画 | `chuixue` | GB2312 搜索编码 |
| 吹妖漫画 | `chuiyao` | 仅保留题材分类 |
| 拷贝漫画 | `copymh` | 章节图 AES-CBC 解密 |
| 动漫屋 | `dm5` | eval 混淆取 newImgs |
| 动漫之家 | `dmzj` | v3api |
| 动漫之家v2Fix | `dmzj_fix` | api.dmzj.com + chapinfo |
| 动漫之家v2 | `dmzj_v2` | 页面内嵌 JSON |
| EHentai | `ehentai` | 40 张一页，图片页二次请求 |
| ExHentai | `exhentai` | 原实现被注释，按 EHentai 还原 + Cookie 设置 |
| 古风漫画 | `gufeng` | — |
| 汗汗酷漫 | `hhaazz` | 复刻 unsuan 解码 |
| 汗汗漫画 | `hhssee` | 原实现被注释，已还原 |
| 997700 | `hhxxee` | 16 台图片分服 |
| 热辣漫画 | `hotmanga` | JSON API |
| 漫画柜 | `ikanman` | packer + LZ64 解压 |
| 禁漫天堂 | `jmtt` | 多备用域名 |
| 漫画DB | `manhuadb` | base64 图片清单 |
| MangaBZ | `mangabz` | 逐页 chapterimage.ashx |
| MangaNel | `manganel` | 章节 id 为完整 URL |
| Mangakakalot | `mangakakalot` | 兼容 manganelo 选择器 |
| 漫画台 | `manhuatai` | rule + 序号模板拼图 |
| 漫画160 | `mh160` | base64 + 分服前缀 |
| 漫画堆 | `mh50` | AES-CBC + 多 CDN |
| 我要去漫画 | `mh517` | base64 代理地址 |
| 57漫画 | `mh57` | eval + `fs` 数组 |
| 漫画Love | `mhlove` | base64 + `$qingtiandy$` |
| 咪咕漫画 | `migu` | UTF-8→%XX→Base64 关键字 |
| NHentai | `nhentai` | 原实现被注释，已还原 |
| oh漫画 | `ohmanhua` | AES-ECB 多密钥试解 |
| Pic177 | `pic177` | 原实现被注释，已还原 |
| 扑飞漫画 | `pufei` | GB2312 + base64 JS 求值 |
| 奇漫屋 | `qimanwu` | 静态+动态章节 |
| 奇妙漫画 | `qimiaomh` | AjaxLoadImgUrl |
| 6漫画 | `sixmh` | eval 取 newImgs |
| 腾讯动漫 | `tencent` | nonce 位点剪除还原 |
| 土豪漫画 | `tuhao` | `|72cms|` 切分 |
| 有妖气 | `u17` | get_chapter_v5 接口 |
| Webtoon | `webtoon` | imageList JSON |
| 咚漫漫画 | `webtoon_dongman` | 含 motiontoon 兜底 |
| 优酷漫画 | `ykmh` | chapterImages JSON |
| YYLS | `yyls` | 按「共 N 頁」拼序号 |

## 说明

- 只做了语法与结构校验（`class extends ComicSource`、`name/key/version` 一致、`search.load` / `comic.loadInfo` / `comic.loadEp` 齐全），**未在真机逐站实测**；站点改版后按报错微调选择器即可。
- 所有源的 `favorites` 未实现——Cimoc 的收藏是本地数据库，没有远端接口。
- `Locality`（本地）、`Null`（占位）、`Wnacg`（实现整段注释）三个源未转换。
