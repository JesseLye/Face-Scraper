# Face-Scraper
Google Image scraper built using [Puppeteer](https://www.npmjs.com/package/puppeteer), [node-fetch](https://www.npmjs.com/package/node-fetch), [PIL](https://pypi.org/project/Pillow/) and [face_recognition](https://pypi.org/project/face_recognition/). 

<!-- [START requirements] -->
## Requirements
* Node v7.6.0 or greater
* Python 3.5 or greater
<!-- [END requirements] -->

<!-- [START gettingStarted] -->
## Getting Started
Note: To use Face-Scraper, you must have both npm and pip3 installed. 

Download Face-Scraper from this repository, navigate to the folder's directory via the terminal and run the following commands:

```bash
npm install
pip3 install pillow
pip3 install face_recognition
```

Once all packages have been installed successfully Face-Scraper is ready to be used. 

<!-- [END gettingStarted] -->

<!-- [START usage] -->
## Usage

In terminal, you're able to use Face-Scraper with the following command:
```bash
node index.js <name of person> <number of people permitted within photo>
```

For instance, if you wanted to scrape photographs of Billy Herrington (and only Billy Herrington) you would use this command:
```bash
node index.js "Billy Herrington" 1
```
<!-- [END usage] -->

