/** @type {import('./_venera_.js')} */
/**
 * 动漫之家 —— 由 Cimoc 源 Dmzj.java 转换
 * 站点：http://m.dmzj1.com   API：http://v3api.dmzj1.com
 * 搜索页返回 `var g_search_data = [...]`，JSON.parse 可直接解码 \uXXXX。
 */
class Dmzj extends ComicSource {
  name = "动漫之家"
  key = "dmzj"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/dmzj.js"

  get baseUrl() {
    return "http://m.dmzj1.com"
  }

  get apiBase() {
    return "http://v3api.dmzj1.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  fmtTime(ts) {
    if (!ts) return ""
    const d = new Date(ts * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `http://s.acg.dmzj1.com/comicsum/search.php?s=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/var g_search_data = (.*?);/)
      if (!m) return { comics: [], maxPage: null }
      const arr = JSON.parse(m[1].replace(/\\\//g, "/"))
      const comics = arr.map((it) => {
        let cover = it.comic_cover || ""
        if (cover.startsWith("//")) cover = "https:" + cover
        return new Comic({
          id: String(it.id),
          title: it.comic_name,
          cover,
          subTitle: it.comic_author || "",
        })
      })
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const cid = `comic_${id}_android`
      const res = await Network.get(`${this.apiBase}/comic/${cid}.json`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const obj = JSON.parse(res.body)

      const authors = (obj.authors || []).map((a) => a.tag_name).join(" ")
      const statusArr = obj.status || []
      const finished = statusArr.length ? statusArr[0].tag_id === 2310 : false

      const chapters = {}
      for (const group of obj.chapters || []) {
        for (const ch of group.data || []) {
          chapters[String(ch.chapter_id)] = ch.chapter_title
        }
      }

      return new ComicDetails({
        title: obj.title || "",
        cover: obj.cover || "",
        description: obj.description || "",
        tags: {
          "作者": authors ? [authors] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: this.fmtTime(obj.last_updatetime),
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.apiBase}/chapter/${comicId}/${epId}.json`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const obj = JSON.parse(res.body)
      return { images: obj.page_url || [] }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
