/** @type {import('./_venera_.js')} */
/**
 * 动漫狂 —— 由 Cimoc 源 Cartoonmad.java 转换
 * 原站：https://www.cartoonmad.com
 * 注意：原站搜索用 BIG5 编码，Venera 运行时只有 utf8/gbk，这里按 UTF-8 提交，可能影响中文关键字命中。
 */
class Cartoonmad extends ComicSource {
  name = "动漫狂"
  key = "cartoonmad"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/cartoonmad.js"

  get baseUrl() {
    return "https://www.cartoonmad.com"
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
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        `${this.baseUrl}/search.html`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        `keyword=${encodeURIComponent(keyword)}&searchtype=all`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`

      const comics = []
      const re = /<a href=comic\/(\d+)\.html title="(.*?)"><span class="covers"><\/span><img src="(.*?)"/g
      let m
      while ((m = re.exec(res.body)) !== null) {
        comics.push(
          new Comic({
            id: m[1],
            title: m[2],
            cover: this.baseUrl + m[3],
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/comic/${id}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const titleM = html.match(/<meta name="Keywords" content="(.*?),/)
      const coverM = html.match(/<div class="cover"><\/div><img src="(.*?)"/)
      const introM = html.match(/<META name="description" content="(.*?)">/)

      const chapters = {}
      const re = /<a href=(.*?) target=_blank>(.*?)<\/a>&nbsp;/g
      let m
      const chapterList = []
      while ((m = re.exec(html)) !== null) {
        chapterList.push([m[1], m[2]])
      }
      chapterList.reverse()
      for (const [k, v] of chapterList) chapters[k] = v

      return new ComicDetails({
        title: titleM ? titleM[1] : "",
        cover: coverM ? this.baseUrl + coverM[1] : "",
        description: introM ? introM[1] : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      // epId 是章节相对路径，如 /comic/xxx.html
      const firstUrl = this.abs(epId)
      const res = await Network.get(firstUrl, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const pm = html.match(/<a class=onpage>.*<a class=pages href=(.*)\d{3}\.html>(.*?)<\/a>/)
      if (!pm) throw "未找到分页信息"
      const prefix = pm[1]
      const page = parseInt(pm[2])
      const images = []
      for (let i = 1; i <= page; i++) {
        const url = `${this.baseUrl}/comic/${prefix}${String(i).padStart(3, "0")}.html`
        const r = await Network.get(url, { ...this.headers, "Referer": firstUrl })
        if (r.status !== 200) continue
        const im = r.body.match(/<img src="(.*?)" border="0" oncontextmenu/)
        if (im) images.push(`${this.baseUrl}/comic/${im[1]}`)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
