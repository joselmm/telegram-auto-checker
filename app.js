import express from "express";
import { readFile, writeFile } from 'node:fs/promises';
import path from "path";
import fetch from "node-fetch";
import { generateCardFromString } from "./GenCard.js";
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';

(async function(){

// Or import puppeteer from 'puppeteer-core';  
var binFileBuffer = await readFile(resolve("./env.txt"));
var binFileContent = binFileBuffer.toString();;

//return console.log(JSON.stringify(binFileContent))
var [bin, gate, chat_id] = binFileContent.split("\r\n").map(e => e.split("=")[1])
/* 
const bin = "43561902140xxxxx|03|2029|rnd";
var gate = ".ap"; */


const app = express()
const port = 3000;
var qrSaved = false;
var logged = false;
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

page1.goto('https://web.telegram.org/a/',{timeout:60_000});
await page1.waitForSelector("#root");

var localStorageBuffer = await readFile(resolve("./localStorage.json"))
var localStorageJSON = localStorageBuffer.toString();
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
await page.goto('https://web.telegram.org/a/' + chat_id,{timeout:60_000});


await new Promise(r => {
  setTimeout(() => r(true), 5_000);
})
await page.click("body")

await new Promise(r => {
  setTimeout(() => r(true), 1_560);
})
await page.click("body")

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
      var page1 = await browser.newPage();
      await page.close();
      page = page1;
      await page.goto('https://web.telegram.org/a/' + chat_id);
    }


    resolve(classForAntibotButton);

  })
}

/* MANEJAR TARJETAS */

/*
await page.evaluate((chat_id) => {
  Array.from(document.querySelectorAll("a")).find(a=>a.href=chat_id)
  return true
}, chat_id)
*/
var queue = [];
var ejecucion = 1;
var yaCargo = false;
async function interval() {

  /* if (!yaCargo) {
    page.waitForSelector('#editable-message-text', { timeout: 60_000 })
    yaCargo=true;
  } */
  console.log(ejecucion++);
  const startTime = Date.now();
  const maxTime = 1000; // límite inferior para el tiempo transcurrido

  await antibot();
  /*     var checkingCards=await getCheckingCards();
      console.log("checking cards: ",checkingCards) */
  /* if (yaCargo) { */
    var cardsStatuses = await getCardsStatuses();

    console.log(cardsStatuses.map(e => e.card));
    console.log(queue)
    /* for (let i = 0; i < cardsStatuses.length; i++) {
      const cardObject = cardsStatuses[i];
      if(queue.includes(cardObject.card)) queue.splice(i, 1)
      if(cardObject.live){

        var fileContent = await fs.readFile("./lives.json")
        var liveCards = JSON.parse(fileContent);
        liveCards.push(cardObject);
        await fs.writeFile("./lives.json", JSON.stringify(liveCards))
      }
    } */

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
        console.log("se encontro y se borrará :", cardsStatuses[i].card, " con index " + queue.indexOf(cardsStatuses[i].card))
        //console.log(cardsStatuses[i])
        queue.splice(queue.indexOf(cardsStatuses[i].card), 1)
      }
    }

    console.log(queue)
    var cupos = maxCurrent - queue.length;

    while (cupos > 0) {
      console.log("cupos: ", cupos)
      var cardString = generateCardFromString(bin);
      //console.log(cardString)
      var cmmd = `${gate} ${cardString}`;
      if (cardString) {await sendCardToCheck(cmmd)} else {throw new Error("comando invalido mmmmmmm")};
      var msgsWithCmmds = await getMessageWithCardCommands();
      console.log(msgsWithCmmds)
      if (!queue.includes(cardString)) queue.push(cardString);
      cupos--;
    }
 /*  } */
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



setTimeout(interval, 30_000);

/* 
async function getCardsStatuses() {
  return page.evaluate((regexCard)=>{
    return Array.from(document.querySelectorAll(".text-content.clearfix.with-meta")).filter(e=>regexCard.test(e.innerText) && e.innerText.includes("Status ➜")).map(e=>{
      return{
          live: e.innerText.includes("Declined!") ?false:true,
          card: e.innerText.match(regexCard)[0]
      }
    })
  }, regexCard)
} */

/* async function getMessageWithCardCommands() {
  var matches = await page.$$eval('div.text-content.clearfix.with-meta', (messages, gate) => {
    var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;
    return messages.filter(e => regexCard.test(e.innerText) && e.innerText.includes(gate+" ")).map(ele => ele.innerText);
  }, gate);

  return matches
} */

  async function getMessageWithCardCommands() {
    var matches = await page.$$eval('div.text-content.clearfix.with-meta', (messages, gate) => {
      var regexCard = /\d{16,}|(\d{1}|\d{2})|(\d{2}|\d{4})|(\d{3,4})/g;
      return messages.filter(e => regexCard.test(e.innerText) && e.innerText.includes(gate+" ")).map(ele => {
        var match = ele.innerText.match(new RegExp(gate + " (\\d{16,}|(\\d{1}|\\d{2})|(\\d{2}|\\d{4})|(\\d{3,4}))"));
        return match && match[0].trim();
      });
    }, gate);
    return matches
  }
async function getCardsStatuses() {
  return page.evaluate(() => {
    var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;
    return Array.from(document.querySelector(".messages-container").querySelectorAll("div.text-content.clearfix.with-meta")).filter(e => regexCard.test(e.innerText) && e.innerText.includes("Status ➜")).map(ele => {
      return {
        live: ele.innerText.includes("Declined!") ? false : true,
        card: ele.innerText.match(regexCard)[0]
      }
    })
  })
 
 /*  var matches = await page.$$eval('div.text-content.clearfix.with-meta', (messages) => {
    var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;
    return messages.filter(e => regexCard.test(e.innerText) && e.innerText.includes("Status ➜")).map(ele => {
      return {
        live: ele.innerText.includes("Declined!") ? false : true,
        card: ele.innerText.match(regexCard)[0]
      }
    })
  }); */
  console.log(matches)
  /* return matches.filter(e => regexCard.test(e.innerText) && e.innerText.includes("Status ➜")).map(ele => {
    return {
      live: ele.innerText.includes("Declined!") ? false : true,
      card: ele.innerText.match(regexCard)[0]
    }
  }) */
  return matches
}
async function sendCardToCheck(cmmd) {
 // await page.focus('#editable-message-text');
  

  /* console.log(JSON.stringify(cmmd));
  return "r"; */
  await page.type('#editable-message-text',cmmd ,{delay:3})

    await new Promise(r => {setTimeout(() => {
      r(true)
    }, generateRandomNumber(456,1000))})
    await page.click("#MiddleColumn > div.messages-layout > div.Transition > div > div.middle-column-footer > div.Composer.shown.mounted > button");
    await new Promise(r => {setTimeout(() => {
      r(true)
    }, generateRandomNumber(456,1000))})
    return "ok";
  
 
}



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



async function updateQr() {
  var qrSelector = await page.waitForSelector(".qr-container");
  qrSelector.screenshot().then(buffer => {
    fs.writeFileSync('qr.png', buffer);
    console.log("QR code screenshot saved to qr.png");
    qrSaved = true;
  })
    .catch(error => console.log(error))
}




})()

function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}