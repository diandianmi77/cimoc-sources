/** @type {import('./_venera_.js')} */
/**
 * 漫画台 —— 由 Cimoc 源 Manhuatai.java 转换
 * 站点：https://m.manhuatai.com（详情 https://www.manhuatai.com）
 * 图片地址由接口返回的 rule + start_num/end_num 模板拼出来。
 */
class Manhuatai extends ComicSource {
  name = "漫画台"
  key = "manhuatai"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/manhuatai.js"

  get baseUrl() {
    return "https://m.manhuatai.com"
  }

  get webBase() {
    return "https://www.manhuatai.com"
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
    if (url.startsWith("/")) return this.webBase + url
    return this.webBase + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/api/getsortlist/?product_id=2&productname=mht&platformname=wap&orderby=click&search_key=${encodeURIComponent(
        keyword
      )}&page=${page}&size=48`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const list = (json.data && json.data.data) || []
      const comics = list.map(
        (it) =>
          new Comic({
            id: String(it.comic_newid),
            title: it.comic_name,
            cover: `https://image.yqmh.com/mh/${it.comic_id}.jpg-300x400.webp`,
          })
      )
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.webBase}/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("h1#detail-title")
      const coverEl = doc.querySelector("div.detail-cover > img")
      const updateEl = doc.querySelector("span.update")
      const introEl = doc.querySelector("div#js_comciDesc > p.desc-content")

      const chapters = {}
      const list = []
      for (const a of doc.querySelectorAll("ol#j_chapter_list > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 1 ? parts[1] : ""
        if (path) list.push([path, a.attributes["title"] || a.text])
      }
      list.reverse()
      for (const [k, v] of list) chapters[k] = v

      let cover = coverEl ? coverEl.attributes["data-src"] || "" : ""
      if (cover.startsWith("//")) cover = "https:" + cover

      return new ComicDetails({
        title: titleEl ? titleEl.attributes["title"] || titleEl.text : "",
        cover,
        description: introEl ? introEl.text : "",
        updateTime: updateEl ? updateEl.text.slice(0, 10) : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/api/getcomicinfo_body?product_id=2&productname=mht&platformname=wap&comic_newid=${comicId}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      if (json.status !== 0) throw "接口返回异常"
      const chapters = (json.data && json.data.comic_chapter) || []
      const chapter = chapters.find((c) => String(c.chapter_id) === String(epId))
      if (!chapter) throw "未找到该章节"

      const pattern = `http://mhpic.${chapter.chapter_domain}${chapter.rule}-mht.low.webp`
      const images = []
      for (let i = chapter.start_num; i <= chapter.end_num; i++) {
        images.push(pattern.replace("$$", String(i)))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.webBase + "/" } }
    },

    enableTagsTranslate: false,
  }
}
