/** @type {import('./_venera_.js')} */
/**
 * 有妖气 —— 由 Cimoc 源 U17.java 转换
 * 站点：http://www.u17.com（搜索 http://so.u17.com）
 * 图片走 comic/ajax.php 的 get_chapter_v5 接口。
 */
class U17 extends ComicSource {
  name = "有妖气"
  key = "u17"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/u17.js"

  get baseUrl() {
    return "http://www.u17.com"
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

  search = {
    load: async (keyword, options, page) => {
      const url = `http://so.u17.com/all/${encodeURIComponent(keyword)}/m0_p${page}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll(
        "#comiclist > div.search_list > div.comiclist > ul > li > div"
      )) {
        const a = li.querySelector("div:nth-child(2) > h3 > strong > a")
        const img = li.querySelector("div:nth-child(1) > a > img")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const up = li.querySelector("div:nth-child(2) > h3 > span.fr")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: a.attributes["title"] || a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            description: up ? up.text.slice(7) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/comic/${id}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.comic_info > div.left > h1.fl")
      const coverEl = doc.querySelector(
        "div.comic_info > div.left > div.coverBox > div.cover > a > img"
      )
      const authorEl = doc.querySelector(
        "div.comic_info > div.right > div.author_info > div.info > a.name"
      )
      const introEl = doc.querySelector("#words")
      const statusEl = doc.querySelector(
        "div.comic_info > div.left > div.info > div.top > div.line1 > span:nth-child(3)"
      )
      const updateEl = doc.querySelector(
        "div.main > div.chapterlist > div.chapterlist_box > div.bot > div.fl > span"
      )
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("#chapter > li > a")) {
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
        updateTime: updateEl ? updateEl.text.slice(7) : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/comic/ajax.php?mod=chapter&act=get_chapter_v5&chapter_id=${epId}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      return { images: (json.image_list || []).map((it) => it.src) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
