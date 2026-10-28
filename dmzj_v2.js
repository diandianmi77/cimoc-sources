/** @type {import('./_venera_.js')} */
/**
 * 动漫之家 v2 —— 由 Cimoc 源 Dmzjv2.java 转换
 * 站点：https://m.dmzj.com
 * 详情/章节/图片都从 HTML 内嵌 JSON 里取（serchArry / initIntroData / page_url）。
 */
class Dmzjv2 extends ComicSource {
  name = "动漫之家v2"
  key = "dmzj_v2"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/dmzj_v2.js"

  get baseUrl() {
    return "https://m.dmzj.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  fmtTime(ts) {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(`${this.baseUrl}/search/${encodeURIComponent(keyword)}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/var serchArry=(\[\{.*?\}\])/)
      if (!m) return { comics: [], maxPage: null }
      const arr = JSON.parse(m[1].replace(/\\\//g, "/"))
      const comics = arr.map((it) => {
        let cover = it.cover || ""
        if (!/^https?:\/\//.test(cover)) cover = "https://images.dmzj.com/" + cover
        return new Comic({
          id: it.comic_py,
          title: it.name,
          cover,
          subTitle: it.authors || "",
          description: this.fmtTime(parseInt(it.last_updatetime) * 1000),
        })
      })
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/info/${id}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const introEl = doc.querySelector("p.txtDesc")
      const titleEl = doc.querySelector("#comicName")
      const coverEl = doc.querySelector("#Cover > img")
      const authorEl = doc.querySelector("a.pd.introName")
      const subPs = doc.querySelectorAll("div.sub_r > p")
      const updateEl = doc.querySelector("div.Introduct_Sub > div.sub_r > p > span.date")
      const statusText = subPs[2] ? subPs[2].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      const cm = res.body.match(/initIntroData\((.*)\);/)
      if (cm) {
        const groups = JSON.parse(cm[1])
        for (const group of groups) {
          const tag = group.title || ""
          for (const ch of group.data || []) {
            const path = `${ch.comic_id}/${ch.id}`
            chapters[path] = `${tag} ${ch.chapter_name}`.trim()
          }
        }
      }

      let intro = introEl ? introEl.text : ""
      intro = intro.replace(/^简介[:：]?/, "")

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: intro,
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text.slice(0, 10) : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/view/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/"page_url":(\[.*?\]),/)
      if (!m) throw "未找到图片数据"
      return { images: JSON.parse(m[1]) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
