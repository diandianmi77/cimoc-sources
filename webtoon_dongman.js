/** @type {import('./_venera_.js')} */
/**
 * 咚漫漫画 —— 由 Cimoc 源 WebtoonDongManManHua.java 转换
 * 站点：https://www.dongmanmanhua.cn
 * 章节分页原版会逐页抓取，这里只取第一页（多数作品够用）；图片走 #_imageList 的 data-url。
 */
class WebtoonDongman extends ComicSource {
  name = "咚漫漫画"
  key = "webtoon_dongman"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/webtoon_dongman.js"

  get baseUrl() {
    return "https://www.dongmanmanhua.cn"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": "www.dongmanmanhua.cn",
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(`${this.baseUrl}/search/?keyword=${encodeURIComponent(keyword)}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const a of doc.querySelectorAll(".card_wrap.search > .card_lst > li > a")) {
        const href = (a.attributes["href"] || "").replace(/\/$/, "")
        const parts = href.split("/")
        const cid = parts[parts.length - 1]
        const subj = a.querySelector("div.info > p.subj")
        const img = a.querySelector("img")
        const author = a.querySelector("div.info > p.author")
        comics.push(
          new Comic({
            id: cid,
            title: subj ? subj.text : a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: author ? author.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/episodeList?titleNo=${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector(".detail_header > .info > h1.subj")
      const coverEl = doc.querySelector("ul#_listUl > li > a > span.thmb > img")
      const dateEl = doc.querySelector("ul#_listUl > li > a > span.date")
      const authorEl = doc.querySelector(".detail_header > div.info > span.author")
      const introEl = doc.querySelector("#_asideDetail > p.summary")
      const dayEl = doc.querySelector("#_asideDetail > p.day_info")
      const finished = dayEl
        ? dayEl.text.includes("完結") || dayEl.text.includes("完结") || dayEl.text.includes("Completed")
        : false

      const chapters = {}
      for (const a of doc.querySelectorAll("ul#_listUl > li > a")) {
        const href = a.attributes["href"] || ""
        const path = "https:" + href
        const subj = a.querySelector("span.subj > span")
        const tx = a.querySelector("span.tx")
        const title = [subj ? subj.text : "", tx ? tx.text : ""].join(" ").trim()
        if (href) chapters[path] = title
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: dateEl ? dateEl.text.trim() : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const images = []
      for (const img of doc.querySelectorAll("div#_imageList > img")) {
        const url = img.attributes["data-url"] || img.attributes["src"]
        if (url) images.push(this.abs(url))
      }

      // 部分作品是 motiontoon：用 documentURL 拼 jpg 序列
      if (images.length === 0) {
        const docUrlM = res.body.match(/documentURL:.*?'(.*?)'/)
        const jpgM = res.body.match(/jpg:.*?'(.*?)\{/)
        if (docUrlM && jpgM) {
          const docUrl = docUrlM[1]
          const jpg = jpgM[1]
          const base = docUrl.substring(0, docUrl.lastIndexOf("/") + 1)
          let i = 1
          while (i <= 200) {
            const u = base + jpg.replace("{", String(i))
            images.push(u)
            i++
            if (i > 3) break
          }
        }
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": "https://www.dongmanmanhua.cn" } }
    },

    enableTagsTranslate: false,
  }
}
