const { execSync } = require("child_process");
const fs = require("fs");
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const args = {
    searchFor: process.argv[2] || "Billy Herrington",
    numFaces: process.argv[3] || "9999",
}

async function initSetup(page) {
    await page.goto("https://google.com.au");
    await page.waitForSelector("a[data-pid='2']");
    await page.click("a[data-pid='2']");
    await page.waitForSelector("input[title='Search']");
    await page.click("input[title='Search']");
    await page.type("input[title='Search']", args.searchFor);
    await page.click("button[type='submit']");
    await page.waitForSelector("div[data-ri='0']");
}

async function downloadImage(url, path, callback = () => null) {
    let proceed = true;
    const res = await fetch(url)
        .catch(() => { callback(); proceed = false; return null; });
    if (proceed) {
        const fileStream = fs.createWriteStream(path);
        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on("error", (err) => {
                reject(err);
            });
            fileStream.on("finish", function () {
                resolve();
            });
        });
    }
}

async function checkSeedFile() {
    fs.access("seed.jpg", fs.constants.F_OK, (err) => {
        if (err) {
            if (process.argv[2]) {
                throw "seed.jpg is missing";
            } else {
                downloadImage("https://i.imgur.com/t7qjNfg.jpg", "seed.jpg", () => { console.log("Failed to Download Default Seed Image") });
            }
        }
    });
}

function getFileName(str) {
    var newStr = "";
    for (let i = str.length - 3; i < str.length; i++) {
        newStr += str[i];
    }
    return newStr;
}

function executeScript(fileName, recurse = true) {
    try {
        var facialRecognition = execSync(`python3 app.py ${fileName} ${args.numFaces}`, {
            timeout: 15000,
        });
        facialRecognition = facialRecognition.toString("utf8").substring(0, facialRecognition.length - 1);
        if (facialRecognition == "true") {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        if (recurse) {
            // possible timeout error, run the script one more time
            return executeScript(fileName, false);
        } else {
            console.log(err);
            return false;
        }
    }
}

async function loopImages(page, fileCounter, startingPosition = 0, newMetaData = false) {
    const metaData = !newMetaData ? await page.evaluate(() => [...document.querySelectorAll('div.rg_meta')].map(e => JSON.parse(e.innerText))) : newMetaData;
    for (let i = startingPosition; i < metaData.length; i++) {
        console.log(`Checking Image: ${i}`);
        var fileName = getFileName(metaData[i].ou);
        if (fileName === "jpg" || fileName === "png") {
            let wasSuccessful = true;
            await downloadImage(metaData[i].ou, `candidate.${fileName}`, () => { wasSuccesful = false });
            // check filesize
            let hasFile = fs.existsSync(`candidate.${fileName}`);
            if (hasFile) {
                var stats = fs.statSync(`candidate.${fileName}`);
                var fileSizeInBytes = stats["size"];
                if (fileSizeInBytes < 0) wasSuccessful = false;
            } else {
                wasSuccssful = false;
            }
            if (wasSuccessful) {
                var ranSuccessfully = executeScript(fileName);
                if (ranSuccessfully) {
                    // Python converts .png files into jpgs
                    await fs.rename(`candidate.jpg`, `image_${fileCounter}.jpg`, (err) => {
                        if (err) throw err;
                    });
                    fileCounter++;
                    console.log(`image_${fileCounter}.jpg saved`);
                }
            }
        }
    }
    await page.evaluate('window.scrollTo(0,document.body.scrollHeight)');
    const checkMetaData = await page.evaluate(
        () => [...document.querySelectorAll('div.rg_meta')].map(e => JSON.parse(e.innerText))
    );
    if (metaData.length !== checkMetaData.length) {
        console.log("Another round of images loaded");
        await loopImages(page, fileCounter, metaData.length, checkMetaData);
    } else {
        await page.$("input[data-lt='Loading']")
            .then(async () => {
                await page.click("input[data-lt='Loading']");
                await page.waitForSelector(`div[data-ri='${checkMetaData.length + 2}']`);
                await loopImages(page, fileCounter, metaData.length, checkMetaData);
            })
            .catch(() => null);
    }
}

(async () => {
    await checkSeedFile();
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    var fileCounter = 1;
    await initSetup(page);
    console.log("Running scraper");
    await loopImages(page, fileCounter);
    console.log("Scraping complete");
    await browser.close();
})();