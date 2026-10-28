/** @type {import('./_venera_.js')} */
/**
 * 优酷漫画 —— 由 Cimoc 源 YKMH.java 转换
 * 原站：https://m.ykmh.com（图片：https://pic.w1fl.com）
 */
class YKMH extends ComicSource {
  name = "优酷漫画"
  key = "ykmh"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/ykmh.js"

  get baseUrl() {
    return "https://m.ykmh.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
      "Referer": "https://m.ykmh.com/search/",
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/?keywords=${encodeURIComponent(keyword)}&page=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll("#update_list > div.UpdateList > div")) {
        const a = div.querySelector("div.itemTxt > a")
        if (!a) continue
        const href = (a.attributes["href"] || "").replace(/\/$/, "")
        const parts = href.split("/")
        const cid = parts[parts.length - 1]
        const img = div.querySelector("div.itemImg > a > img")
        const date = div.querySelector("p.txtItme > span.date")
        const author = div.querySelector("p > a")
        comics.push(
          new Comic({
            id: cid,
            title: a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: author ? author.text : "",
            description: date ? date.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/manhua/${id}/`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div#comicName")
      const coverEl = doc.querySelector("div#Cover > *")
      const dateEl = doc.querySelector("p.txtItme > span.date")
      const iconEl = doc.querySelector("p.txtItme > span.icon01")
      const introEl = doc.querySelector("p#full-des #showmore-des")
      const finished = iconEl ? iconEl.text.includes("完结") : false

      const chapters = {}
      for (const a of doc.querySelectorAll("div.chapter-warp ul.Drama > li > a")) {
        const href = a.attributes["href"] || ""
        const path = href.substring(1)
        if (path) chapters[path] = a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": iconEl ? [iconEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: dateEl ? dateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/${epId}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/var chapterImages\s*=\s*\[(.+?)]/)
      if (!m) throw "未找到图片数据"
      const arr = JSON.parse(`[${m[1]}]`)
      return { images: arr.map((p) => `https://pic.w1fl.com${p}`) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
