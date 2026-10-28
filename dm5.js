/** @type {import('./_venera_.js')} */
/**
 * 动漫屋 —— 由 Cimoc 源 DM5.java 转换
 * 原站：http://www.dm5.com / http://m.dm5.com
 * 图片列表由页面内 eval 混淆脚本给出，这里用 new Function 在同一作用域取 newImgs。
 */
class DM5 extends ComicSource {
  name = "动漫屋"
  key = "dm5"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/dm5.js"

  get baseUrl() {
    return "https://www.dm5.com"
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

  // 把“今天/昨天/N天前/MM月DD号”统一成 yyyy-MM-dd
  normalizeDate(text) {
    if (!text) return ""
    const now = new Date()
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (text.includes("今天") || text.includes("分钟前")) return fmt(now)
    if (text.includes("昨天")) return fmt(new Date(now.getTime() - 86400000))
    if (text.includes("前天")) return fmt(new Date(now.getTime() - 2 * 86400000))
    const full = text.match(/\d+-\d+-\d+/)
    if (full) return full[0]
    const md = text.match(/(\d+)月(\d+)号/)
    if (md) return `${now.getFullYear()}-${md[1]}-${md[2]}`
    return text
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        "https://m.dm5.com/pagerdata.ashx",
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          "Referer": "https://m.dm5.com",
        },
        `t=7&pageindex=${page}&title=${encodeURIComponent(keyword)}`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const arr = JSON.parse(res.body)
      const comics = []
      for (const it of arr) {
        const authors = it.Author || []
        comics.push(
          new Comic({
            id: (it.Url || "").split("/")[1],
            title: it.Title,
            cover: it.Pic,
            subTitle: authors.join(""),
            description: it.LastPartTime,
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
        name: "题材",
        type: "fixed",
        categories: ["全部", "热血", "恋爱", "校园", "百合", "耽美", "冒险", "后宫", "科幻", "战争", "悬疑", "推理", "搞笑", "奇幻", "魔法", "恐怖", "神鬼", "历史", "同人", "运动", "绅士", "机战"],
        categoryParams: ["", "tag31", "tag26", "tag1", "tag3", "tag27", "tag2", "tag8", "tag25", "tag12", "tag17", "tag33", "tag37", "tag14", "tag15", "tag29", "tag20", "tag4", "tag30", "tag34", "tag36", "tag40"],
        itemType: "category",
      },
    ],
    enableRankingPage: false,
  }

  categoryComics = {
    load: async (category, param, options, page) => {
      const url = param
        ? `${this.baseUrl}/manhua-list-${param}-p${page}`
        : `${this.baseUrl}/manhua-list-p${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const comics = []
      for (const div of doc.querySelectorAll("ul.mh-list > li > div.mh-item")) {
        const a = div.querySelector("div > h2.title > a")
        if (!a) continue
        const styleEl = div.querySelector("p.mh-cover")
        const style = styleEl ? styleEl.attributes["style"] || "" : ""
        const coverM = style.match(/\((.*?)\)/)
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: a.text,
            cover: coverM ? coverM[1] : "",
            subTitle: div.querySelector("p.author") ? div.querySelector("p.author").text.slice(3) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/${id}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.banner_detail_form > div.info > p.title")
      const coverEl = doc.querySelector("div.banner_detail_form > div.cover > img")
      const updateEl = doc.querySelector("#tempc > div.detail-list-title > span.s > span")
      const authorEl = doc.querySelector("div.banner_detail_form > div.info > p.subtitle > a")
      const introEl = doc.querySelector("div.banner_detail_form > div.info > p.content")
      const tipSpans = doc.querySelectorAll("div.banner_detail_form > div.info > p.tip > span")
      const statusText = tipSpans[0] ? tipSpans[0].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      let title = titleEl ? titleEl.text : ""
      if (title) title = title.split(" ")[0]
      let intro = introEl ? introEl.text : ""
      intro = intro.replace("[+展开]", "").replace("[-折叠]", "")

      const chapters = {}
      const list = []
      for (const a of doc.querySelectorAll("#detail-list-select-1 a, .detail-list-select a")) {
        const href = a.attributes["href"] || ""
        list.push([href, (a.text || "").split(" ")[0]])
      }
      list.reverse()
      for (const [k, v] of list) if (k) chapters[k] = v

      return new ComicDetails({
        title,
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: intro,
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: this.normalizeDate(updateEl ? updateEl.text : ""),
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = epId.startsWith("http") ? epId : "https://m.dm5.com/" + epId.replace(/^\/+/, "")
      const res = await Network.get(url, { ...this.headers, "Referer": url })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`

      const m = res.body.match(/eval\([^\n]*\)/)
      if (!m) throw "未找到图片数据"
      let code = m[0]
      // 在同作用域内取 newImgs（与 Cimoc 的 evalDecrypt 等价）
      const getter = new Function(code + "\n;return typeof newImgs === 'undefined' ? '' : newImgs;")
      let str = getter()
      if (!str) {
        str = new Function(code + "\n;return typeof newImgs === 'undefined' ? '' : newImgs;")()
      }
      if (!str) throw "图片解析失败"
      return { images: String(str).split(",").filter(Boolean) }
    },

    onImageLoad: (url) => {
      const m = url.match(/cid=(\d+)/)
      const referer = m ? `http://m.dm5.com/m${m[1]}` : "http://www.dm5.com"
      return { headers: { "Referer": referer } }
    },

    enableTagsTranslate: false,
  }
}
