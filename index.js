const jsonc = require("jsonc")
const fs = require("fs")
const path = require("path")
const fsExtra = require("fs-extra")
const fetch = require("node-fetch")
const url = require("url")
const zip = require("cross-zip")

async function download(from, to) {
    try {
        let folder = path.dirname(to)
        if (!fs.existsSync(folder)) await fsExtra.mkdirs(folder)
        let res = await fetch(from)
        if (res.status != 200) throw res.statusText
        let buffer = await res.buffer()
        await fs.promises.writeFile(to, buffer, "binary")
    } catch (e) {
        // console.log(from, e)
        throw `${from} ${e}`
    }
}

async function procFont(font, css) {
    try {
        let folder = `public/public/font/${font}`
        if (!fs.existsSync(folder)) await fsExtra.mkdirs(folder)
        let res = await fetch(css)
        if (res.status != 200) throw res.statusText
        let text = await res.text()
        let urls = text.match(/url\(\S+\)/g).map((u) => {
            return [u, u.slice(4, u.length - 1)]
        })
        let fonts = urls.map(async (u) => {
            let name = path.basename(new url.URL(u[1]).pathname)
            text = text.replace(u[1], `/public/font/${font}/${name}`)
            let res = await fetch(u[1])
            if (res.status != 200) throw res.statusText
            let data = await res.buffer()
            await fs.promises.writeFile(
                `public/public/font/${font}/${name}`,
                data,
                { encoding: "utf8" }
            )
        })
        await Promise.all([
            ...fonts,
            fs.promises.writeFile(`public/public/css/${font}.css`, text),
        ])
    } catch (e) {
        // console.log(font, e)
        throw `${font} ${e}`
    }
}

let action = []
let aim = jsonc.parse(fs.readFileSync("./file.jsonc", "UTF-8"))
for (let it of aim.common) {
    action.push(download(it[0], it[1]))
}
if (!fs.existsSync("public/public/css")) fsExtra.mkdirsSync("public/public/css")
for (let font in aim.font) {
    action.push(procFont(font, aim.font[font]))
}

Promise.allSettled(action).then((status) => {
    let ok = true
    for (let s of status) {
        if (s.status == "rejected") {
            ok = false
            console.log(s.reason)
        }
    }
    if (ok) {
        console.log('corss-zip is useless, you should zip file yourself, I will fix this later.')
        // zip.zipSync(path.resolve("public/."), path.resolve("resource.zip"))
        // fsExtra.removeSync("public")
    }
})
