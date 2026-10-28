/** @type {import('./_venera_.js')} */
/**
 * 热辣漫画 —— 由 Cimoc 源 HotManga.java 转换
 * API：https://mapi.hotmangasg.com:12001（搜索/章节）、https://mapi.hotmangasd.com:12001（详情/图片）
 * 结构同拷贝漫画，但图片是 JSON 直接下发。
 */
class HotManga extends ComicSource {
  name = "热辣漫画"
  key = "hotmanga"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/hotmanga.js"

  get apiBase() {
    return "https://mapi.hotmangasg.com:12001"
  }

  get apiBaseD() {
    return "https://mapi.hotmangasd.com:12001"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
    }
  }

  search = {
    load: async (keyword, options, page) => {
      const offset = 30 * (page - 1)
      const url = `${this.apiBase}/api/v3/search/comic?platform=1&limit=30&offset=${offset}&q=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const list = (json.results && json.results.list) || []
      const comics = list.map((it) => {
        const authors = it.author || []
        return new Comic({
          id: it.path_word,
          title: it.name,
          cover: it.cover,
          subTitle: authors.length ? authors[0].name.trim() : "",
        })
      })
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.apiBaseD}/api/v3/comic2/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const results = JSON.parse(res.body).results || {}
      const comic = results.comic || {}
      const author = comic.author && comic.author[0] ? comic.author[0].name : ""
      const finished = comic.status ? comic.status.value !== 0 : false

      const chapters = {}
      const chRes = await Network.get(
        `${this.apiBase}/api/v3/comic/${id}/group/default/chapters?limit=500&offset=0`,
        this.headers
      )
      if (chRes.status === 200) {
        const chJson = JSON.parse(chRes.body)
        const list = (chJson.results && chJson.results.list) || []
        for (const ch of list) chapters[ch.uuid] = ch.name
      }

      return new ComicDetails({
        title: comic.name || "",
        cover: comic.cover || "",
        description: comic.brief || "",
        tags: {
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: comic.datetime_updated || "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.apiBaseD}/api/v3/comic/${comicId}/chapter/${epId}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const contents = (json.results && json.results.chapter && json.results.chapter.contents) || []
      return { images: contents.map((it) => String(it.url).replace("m_read", "kb_m_read_large")) }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
