/** @type {import('./_venera_.js')} */
/**
 * 动漫之家 v2Fix —— 由 Cimoc 源 DmzjFix.java 转换
 * 搜索：m.dmzj.com  |  详情：api.dmzj.com  |  图片：m.dmzj.com/chapinfo
 */
class DmzjFix extends ComicSource {
  name = "动漫之家v2Fix"
  key = "dmzj_fix"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/dmzj_fix.js"

  get baseUrl() {
    return "https://m.dmzj.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": "http://images.dmzj.com/",
    }
  }

  fmtTime(ts) {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(`${this.baseUrl}/search/${encodeURIComponent(keyword)}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/var serchArry=(\[\{.*?\}\])/)
      if (!m) return { comics: [], maxPage: null }
      const arr = JSON.parse(m[1].replace(/\\\//g, "/"))
      const comics = arr.map((it) => {
        let cover = it.cover || ""
        if (!/^https?:\/\//.test(cover)) cover = "https://images.dmzj.com/" + cover
        return new Comic({
          id: it.comic_py,
          title: it.name,
          cover,
          subTitle: it.authors || "",
          description: this.fmtTime(parseInt(it.last_updatetime || "0") * 1000),
        })
      })
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`http://api.dmzj.com/dynamic/comicinfo/${id}.json`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const data = JSON.parse(res.body).data || {}
      const info = data.info || {}
      const list = data.list || []

      const chapters = {}
      for (const ch of list) {
        chapters[`${ch.comic_id}/${ch.id}`] = ch.chapter_name
      }

      const finished = !(info.status || "").includes("连载")
      return new ComicDetails({
        title: info.title || "",
        cover: info.cover || "",
        description: info.description || "",
        tags: {
          "作者": info.authors ? [info.authors] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: this.fmtTime(parseInt(info.last_updatetime || "0") * 1000),
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      // epId 形如 comicId/chapterId；备用线路带 x 后缀
      const path = epId.replace(/x$/, "")
      const res = await Network.get(`${this.baseUrl}/chapinfo/${path}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const arr = JSON.parse(res.body).page_url || []
      const backup = epId.endsWith("x")
      return {
        images: arr.map((u) => (backup ? u.replace("dmzj", "dmzj1") : u)),
      }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": "http://images.dmzj.com/" } }
    },

    enableTagsTranslate: false,
  }
}
