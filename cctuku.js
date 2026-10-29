/** @type {import('./_venera_.js')} */
/**
 * CC图库 —— 由 Cimoc 源 CCTuku.java 转换
 * 原站：http://m.tuku.cc（探测已无 DNS，源保留待站点恢复）
 */
class CCTuku extends ComicSource {
  name = "CC图库"
  key = "cctuku"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/cctuku.js"

  get baseUrl() {
    return "http://m.tuku.cc"
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 7.0;) Chrome/58.0.3029.110 Mobile",
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

  parseList(doc) {
    const comics = []
    for (const div of doc.querySelectorAll("div.main-list > div > div > div")) {
      const a = div.querySelector("a")
      if (!a) continue
      const href = a.attributes["href"] || ""
      const parts = href.split("/")
      const cid = parts.length > 1 ? parts[1] : ""
      const img = div.querySelector("a > img")
      comics.push(
        new Comic({
          id: cid,
          title: a.text,
          cover: img ? this.abs(img.attributes["src"]) : "",
        })
      )
    }
    return comics
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search-${encodeURIComponent(keyword)}/?language=1`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("ul.searchResultList > li")) {
        const a = li.querySelector("a")
        const p = li.querySelector("p.title")
        const img = li.querySelector("a > img")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: p ? p.text : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  category = {
    title: this.name,
    parts: [
      {
        name: "主题",
        type: "fixed",
        categories: ["全部", "魔幻", "动作", "热血", "爱情", "武侠", "搞笑", "校园", "竞技", "科幻", "悬疑", "恐怖", "励志", "历史", "百合", "短篇", "美食", "四格", "同人", "青年", "游戏", "萌系", "机战", "后宫", "耽美", "其它"].concat([]),
        categoryParams: ["", "1", "2", "5", "4", "15", "7", "20", "3", "11", "10", "9", "8", "22", "35", "34", "31", "30", "18", "17", "14", "6", "43", "40", "16", "33"],
        itemType: "category",
      },
    ],
    enableRankingPage: false,
  }

  categoryComics = {
    load: async (category, param, options, page) => {
      const url = param
        ? `${this.baseUrl}/list/list_${param}_${page}.htm`
        : `${this.baseUrl}/newest/${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      return { comics: this.parseList(doc), maxPage: null }
    },
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/comic/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.detailTop > div.content > div.info > p.title")
      const coverEl = doc.querySelector("div.detailTop > div.content > img")
      const infoPs = doc.querySelectorAll("div.detailTop > div.content > div.info > p")
      const authorEl = infoPs[1] ? infoPs[1].querySelector("a") : null
      const introPs = doc.querySelectorAll("div.detailContent > p")
      const introEl = introPs[1] || null
      const updateEl = doc.querySelector("#chapter > div > div > div.top > span")

      const chapters = {}
      for (const a of doc.querySelectorAll("#chapter > div > div > ul > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : ""
        if (path) chapters[path] = a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "作者": authorEl ? [authorEl.text] : [] },
        updateTime: updateEl ? updateEl.text.slice(0, 10) : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      // 原站拿不到总页数，Cimoc 固定抓 10 页；这里逐页抓到空为止（上限 20）
      const images = []
      for (let i = 1; i <= 20; i++) {
        const url = `${this.baseUrl}/comic/${comicId}/${epId}/p${i}/`
        const res = await Network.get(url, { ...this.headers, "Referer": `${this.baseUrl}/comic/${comicId}/` })
        if (res.status !== 200) break
        const doc = new HtmlDocument(res.body)
        const a = doc.querySelector("div.readForm > a")
        if (!a) break
        const src = a.attributes["href"]
        if (!src) break
        images.push(this.abs(src))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
