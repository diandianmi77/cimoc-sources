/** @type {import('./_venera_.js')} */
/**
 * 2animx —— 由 Cimoc 源 Animx2.java 转换
 * 原站：http://www.2animx.com
 * 图片是懒加载分页：章节页 → ?-p-n，再解析真实图片地址。
 */
class Animx2 extends ComicSource {
  name = "2animx"
  key = "animx2"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/animx2.js"

  get baseUrl() {
    return "http://www.2animx.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Cookie": "isAdult=1",
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search-index?searchType=1&q=${encodeURIComponent(keyword)}&page=1`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("ul.liemh > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        const img = li.querySelector("a > img")
        const tit = li.querySelector("a > div.tit")
        const font = li.querySelector("a > font")
        comics.push(
          new Comic({
            id: this.abs(a.attributes["href"]),
            title: tit ? tit.text : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: font ? font.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(this.abs(id), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.position > strong")
      const coverEl = doc.querySelector("dl.mh-detail > dt > a > img")
      const introEl = doc.querySelector(".mh-introduce")

      const chapters = {}
      for (const li of doc.querySelectorAll("div#oneCon2 > ul > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        let title = a.attributes["title"] || a.text
        const num = title.match(/\d+/)
        if (num) title = num[0]
        const href = a.attributes["href"]
        if (href) chapters[this.abs(href)] = title
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const firstUrl = this.abs(epId)
      const res = await Network.get(firstUrl, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const totalM = res.body.match(/id="total" value="(.*?)"/)
      if (!totalM) throw "未找到分页信息"
      const total = parseInt(totalM[1])

      const images = []
      for (let i = 1; i <= total; i++) {
        const url = `${firstUrl}-p-${i}`
        const r = await Network.get(url, this.headers)
        if (r.status !== 200) continue
        const m = r.body.match(/<\/div><img src="(.*?)" alt=/)
        if (m) images.push(this.abs(m[1]))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": url, "Cookie": "isAdult=1" } }
    },

    enableTagsTranslate: false,
  }
}
