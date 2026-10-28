/** @type {import('./_venera_.js')} */
/**
 * 古风漫画 —— 由 Cimoc 源 GuFeng.java 转换
 * 原站：https://m.gufengmh8.com（探测已无 DNS，源保留待站点恢复）
 */
class GuFeng extends ComicSource {
  name = "古风漫画"
  key = "gufeng"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/gufeng.js"

  get baseUrl() {
    return "https://m.gufengmh8.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
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

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(
        `${this.baseUrl}/search/?keywords=${encodeURIComponent(keyword)}`,
        this.headers
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll("div.UpdateList > div.itemBox")) {
        const a = div.querySelector("div.itemTxt > a")
        const img = div.querySelector("div.itemImg > a > mip-img")
        if (!a) continue
        const href = a.attributes["href"] || ""
        let cid = href.replace(`${this.baseUrl}/manhua/`, "")
        cid = cid.replace(/\/$/, "")
        const ps = div.querySelectorAll("div.itemTxt > p")
        comics.push(
          new Comic({
            id: cid,
            title: a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: ps[1] ? ps[1].text : "",
            description: ps[3] ? ps[3].querySelector("span.date")?.text || "" : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const coverEl = doc.querySelector("#Cover > mip-img")
      const introEl = doc.querySelector("div.comic-view.clearfix > p")
      const titleEl = doc.querySelector("h1.title")
      const dls = doc.querySelectorAll("div.pic > dl")
      const updateEl = dls[4] ? dls[4].querySelector("dd") : null
      const authorEl = dls[2] ? dls[2].querySelector("dd") : null

      const chapters = {}
      const list = []
      for (const a of doc.querySelectorAll("ul[id^=chapter-list] > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : ""
        if (path) list.push([path, a.text])
      }
      list.reverse()
      for (const [k, v] of list) chapters[k] = v

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "作者": authorEl ? [authorEl.text] : [] },
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${comicId}/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/chapterImages = \[(.*?)\]/)
      const pm = res.body.match(/chapterPath = "(.*?)"/)
      if (!m || !pm) throw "未找到图片数据"
      const images = m[1]
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean)
        .map((s) => `https://res.xiaoqinre.com/${pm[1]}${s}`)
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/", "User-Agent": this.headers["User-Agent"] } }
    },

    enableTagsTranslate: false,
  }
}
