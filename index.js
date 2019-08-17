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
            }  else {
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

async function loopImages(page, arrPos, imageCounter, fileCounter) {
    var arrLength = await page.$$eval("#search #rg_s div[data-ri]", el => el.length);
    var incrementValue = 10;
    while (arrLength !== imageCounter) {
        // Skips over the related searches box
        var isInfoBox = await page.evaluate((imgCounter) => {
            let getInfoBox = document.querySelector(`div[data-ri='${imgCounter}'] div.vhWGrd`);
            return Promise.resolve(!!getInfoBox);
        }, imageCounter);
        if (!isInfoBox) {
            await page.waitForSelector(`div[data-ri='${imageCounter}']`);
            await page.click(`div[data-ri='${imageCounter}']`);
            if (arrPos > 1) {
                arrPos = 0;
            } else {
                arrPos++;
            }
            await page.waitFor(1000);
            let imageUrl = await page.evaluate((x) => {
                let imageArr = document.querySelectorAll("div.irc_mic img.irc_mi");
                return Promise.resolve(imageArr[x].src);
            }, arrPos);
            var fileName = getFileName(imageUrl);
            if (fileName === "jpg" || fileName === "png") {
                let wasSuccessful = true;
                await downloadImage(imageUrl, `candidate.${fileName}`, () => { wasSuccesful = false });
                // check filesize
                var stats = fs.statSync(`candidate.${fileName}`);
                var fileSizeInBytes = stats["size"];
                if (fileSizeInBytes < 0) {
                    wasSuccessful = false;
                }
                if (wasSuccessful) {
                    var facialRecognition = execSync(`python3 app.py ${fileName} ${args.numFaces}`).toString("utf8");
                    facialRecognition = facialRecognition.substring(0, facialRecognition.length - 1);
                    if (facialRecognition == "true") {
                        // Python converts .png files into jpgs
                        await fs.rename(`candidate.jpg`, `image_${fileCounter}.jpg`, (err) => {
                            if (err) throw err;
                        });
                        fileCounter++;
                    }
                } 
            }
        }
        imageCounter++;
        if (imageCounter > incrementValue) {
            arrLength = await page.$$eval("#search #rg_s div[data-ri]", el => el.length);
            incrementValue = arrLength - 10;
        }
    }
    await page.$("input[data-lt='Loading']")
                .then(async () => {
                    await page.click("input[data-lt='Loading']");
                    await page.waitForSelector(`div[data-ri='${imageCounter}']`);
                    await loopImages(page, arrPos, imageCounter, fileCounter);
                })
                .catch(() => null);
}

(async () => {
    await checkSeedFile();
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    var imageCounter = 0;
    var fileCounter = 1;
    var arrPos = 0;
    await initSetup(page);
    await loopImages(page, arrPos, imageCounter, fileCounter);
    console.log("Scraping complete.");
    await browser.close();
})();