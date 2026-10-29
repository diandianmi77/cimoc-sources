/** @type {import('./_venera_.js')} */
/**
 * 57漫画 —— 由 Cimoc 源 MH57.java 转换
 * 原站：http://m.wuqimh.com（图片：http://images.lancaier.com）
 * 章节页有一段 eval 混淆脚本，解出来的对象里 'fs' 是图片路径数组。
 */
class MH57 extends ComicSource {
  name = "57漫画"
  key = "mh57"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/mh57.js"

  get baseUrl() {
    return "http://m.wuqimh.com"
  }

  get imgServer() {
    return "http://images.lancaier.com"
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
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // 执行 eval 混淆脚本，返回其解出的文本
  evalPacked(code) {
    const tries = [
      "return (" + code + ")",
      code + "\n;return typeof result !== 'undefined' ? result : '';",
    ]
    for (const body of tries) {
      try {
        const v = new Function(body)()
        if (v && typeof v === "string") return v
      } catch (e) {
        // 继续尝试
      }
    }
    return ""
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/q_${encodeURIComponent(keyword)}-p-${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("#data_list > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const h3 = a.querySelector("h3")
        const img = a.querySelector("div.thumb > img")
        const dls = li.querySelectorAll("dl")
        comics.push(
          new Comic({
            id: href,
            title: h3 ? h3.text : "",
            cover: img ? this.abs(img.attributes["data-src"] || img.attributes["src"]) : "",
            subTitle: dls[1] ? dls[1].text : "",
            description: dls[4] ? dls[4].text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.main-bar > h1")
      const coverEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > img")
      const dls = doc.querySelectorAll("div.book-detail > div.cont-list > dl")
      const updateEl = dls[7] ? dls[7].querySelector("dd") : null
      const authorEl = dls[3] ? dls[3].querySelector("dd") : null
      const introEl = doc.querySelector("#bookIntro")
      const statusEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > i")
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("#chapterList > ul > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 1 ? parts[1] : ""
        if (path) chapters[path] = a.text
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
      const res = await Network.get(`${this.baseUrl}/${comicId}/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const pm = res.body.match(/eval(.*?)\n/)
      if (!pm) throw "未找到图片数据"
      const result = this.evalPacked(pm[1])
      const fm = result.match(/'fs':\s*(\[.*?\])/)
      if (!fm) throw "图片解析失败"
      const arr = JSON.parse(fm[1].replace(/'/g, '"'))
      return {
        images: arr.map((u) => (String(u).includes("http://") ? u : this.imgServer + u)),
      }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
