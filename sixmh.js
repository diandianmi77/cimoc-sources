/** @type {import('./_venera_.js')} */
/**
 * 6漫画 —— 由 Cimoc 源 SixMH.java 转换
 * 原站：http://www.sixmh6.com（探测 404，域名可能已更换）
 * 章节列表除静态列表外，原版还会 POST /bookchapter/ 拿动态章节；这里保留静态列表。
 * 图片列表由页面内 eval 混淆脚本给出，用 new Function 取 newImgs。
 */
class SixMH extends ComicSource {
  name = "6漫画"
  key = "sixmh"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/sixmh.js"

  get baseUrl() {
    return "http://www.sixmh6.com"
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
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search.php?keyword=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const ul of doc.querySelectorAll("div.cy_list_mh > ul")) {
        const a = ul.querySelector("li.title > a")
        const pic = ul.querySelector("li > a.pic")
        const img = ul.querySelector("a.pic > img")
        const up = ul.querySelector("li.updata > a > span")
        if (!a || !pic) continue
        comics.push(
          new Comic({
            id: pic.attributes["href"],
            title: a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            description: up ? up.text : "",
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
      const url = `${this.baseUrl}${comicId}${epId}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/eval\([\s\S]*\)/)
      if (!m) throw "未找到图片数据"
      const str = new Function(m[0] + "\n;return typeof newImgs === 'undefined' ? '' : newImgs;")()
      if (!str) throw "图片解析失败"
      return { images: String(str).split(",").filter(Boolean) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
