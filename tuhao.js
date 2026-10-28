/** @type {import('./_venera_.js')} */
/**
 * 土豪漫画 —— 由 Cimoc 源 TuHao.java 转换
 * 原站：https://tuhao456.com
 */
class TuHao extends ComicSource {
  name = "土豪漫画"
  key = "tuhao"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/tuhao.js"

  get baseUrl() {
    return "https://tuhao456.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": "https://m.tohomh456.com/",
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  parseList(doc) {
    const comics = []
    for (const ul of doc.querySelectorAll("div.cy_list_mh > ul")) {
      const a = ul.querySelector("li.title > a")
      const picA = ul.querySelector("li > a")
      const img = ul.querySelector("a.pic > img")
      const up = ul.querySelector("li.updata > a > span")
      const href = picA ? picA.attributes["href"] || "" : ""
      const parts = href.split("/")
      const cid = parts.length > 1 ? parts[1] : ""
      if (!cid) continue
      comics.push(
        new Comic({
          id: cid,
          title: a ? a.text : "",
          cover: img ? this.abs(img.attributes["src"]) : "",
          subTitle: up ? up.text : "",
        })
      )
    }
    return comics
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/sort/?key=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      return { comics: this.parseList(doc), maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/manhua/${id}/`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const coverEl = doc.querySelector("img.pic")
      const introEl = doc.querySelector("p#comic-description")
      const titleEl = doc.querySelector("div.cy_title > h1")
      const updateEl = doc.querySelector("div.cy_zhangjie_top > p >font")
      const infoSpans = doc.querySelectorAll("div.cy_xinxi > span")
      const authorEl = infoSpans[0]
      const statusEl = infoSpans[1] ? infoSpans[1].querySelector("a") : null
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const li of doc.querySelectorAll("div.cy_plist > ul > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 1 ? parts[1] : ""
        if (path) chapters[path] = li.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/chapter/${epId}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/"page_url":"(.*?)",/)
      if (!m) throw "未找到图片数据"
      return { images: m[1].split("|72cms|").filter(Boolean) }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
