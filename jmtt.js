/** @type {import('./_venera_.js')} */
/**
 * 禁漫天堂 —— 由 Cimoc 源 JMTT.java 转换
 * 原站：https://18comic1.one/（备用域名见 initUrlFilterList，可自行替换 baseUrl）
 */
class JMTT extends ComicSource {
  name = "禁漫天堂"
  key = "jmtt"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/jmtt.js"

  get baseUrl() {
    return "https://18comic1.one/"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl,
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl.replace(/\/$/, "") + url
    return this.baseUrl + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}search/photos?search_query=${encodeURIComponent(keyword)}&main_tag=0`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll("div#wrapper > div.container > div.row > div > div.row > div")) {
        const a = div.querySelector("div.thumb-overlay > a")
        const span = div.querySelector("span.video-title")
        const img = div.querySelector("div.thumb-overlay > a > img")
        const views = div.querySelector("div.video-views")
        if (!a) continue
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: span ? span.text : "",
            cover: img ? this.abs(img.attributes["data-original"] || img.attributes["src"]) : "",
            description: views ? views.text : "",
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

      const introDivs = doc.querySelectorAll("#intro-block > div")
      const titleEl = doc.querySelector("div.panel-heading > div")
      const coverEl = doc.querySelector("img.lazy_img.img-responsive")
      const authorEl = introDivs[4] ? introDivs[4].querySelector("span") : null
      const statusEl = introDivs[2] ? introDivs[2].querySelector("span") : null
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const coverMeta = doc.querySelectorAll("#album_photo_cover > div")
      let update = ""
      if (coverMeta[1]) {
        const inner = coverMeta[1].querySelectorAll("div")
        if (inner[3]) update = inner[3].attributes["content"] || ""
      }

      const chapters = {}
      const list = []
      const startLink = doc.querySelector(".col.btn.btn-primary.dropdown-toggle.reading")
      if (startLink) list.push([startLink.attributes["href"], startLink.text.trim()])
      for (const a of doc.querySelectorAll("#episode-block > div > div.episode > ul > a")) {
        const li = a.querySelector("li")
        list.push([a.attributes["href"], li ? li.text.trim() : a.text])
      }
      list.reverse()
      for (const [k, v] of list) if (k) chapters[k] = v

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introDivs[0] ? introDivs[0].text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(this.abs(epId), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const reg = epId.split("/")
      const seg = reg.length > 2 ? reg[2] : ""
      const images = []
      for (const img of doc.querySelectorAll("img.lazy_img")) {
        const src = img.attributes["src"] || ""
        const dataSrc = img.attributes["data-original"] || ""
        if (seg && src.includes(seg)) images.push(this.abs(src))
        else if (dataSrc && dataSrc.includes(seg)) images.push(this.abs(dataSrc))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
