import express from "express";
import dotenv from "dotenv";
dotenv.config();

import os from "node:os"
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { generateCardFromString } from "./GenCard.js";
import cors from "cors";
import { resolve } from 'node:path';
import notifyFoundLiveCard from "./notifyFoundLiveCard.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const app = express()
const port = process.env.PORT || 3000;
var checking = false;

app.get('/stop-checking', (req, res) => {
    debugger
    checking = false;
    res.json({ noError: true, message: "Se puso false a checking" })
})

app.use(cors())
app.use(express.json());


app.post("/start-checking", (req, res) => {
    var { bin, gate, group_chat_id, person_chat_id, bot_token, num_to_find, to_wait_card_send, wait_to_begin, max_atemps_per_bin } = req.body;
    startChecking({ binsString: bin, gate, group_id:group_chat_id, person_chat_id, bot_token, num_to_find, to_wait_card_send, wait_to_begin, max_atemps_per_bin });

    console.log(bin);
    console.log("Se comenzo a checkear");
    res.json({ noError: true, message: "se comenzo con " + bin });
})



app.listen(port, async () => {
    console.log(`Checker escuchando en el puerto ${port}`)


    if (!existsSync("./localStorage.json")) {
        var localStorageRes = await fetch(process.env.localStorage);
        var lsContent = await localStorageRes.text();
        writeFileSync("./localStorage.json", lsContent);
        console.log("Se escribio el localStorage.json")

    }
})

var browserRef = null;


async function startChecking({ binsString, gate, group_id, person_chat_id, bot_token, num_to_find, to_wait_card_send, wait_to_begin, max_atemps_per_bin }) {
    debugger
    try {
        checking = true;


        // Or import puppeteer from 'puppeteer-core';  
        /* var binFileBuffer = await readFile(resolve("./env.txt"));
        var binFileContent = binFileBuffer.toString();; */
        var countedLive = 0;
        //return console.log(JSON.stringify(binFileContent))
        //var [binsString, gate, group_id, person_chat_id, bot_token, num_to_find, to_wait_card_send, wait_to_begin, max_atemps_per_bin] = binFileContent.split("\r\n").map(e => e.split("=")[1])

        //console.log(bin)

        /*  if (process.argv[2]) {
 
             var splitter = process.argv[2].match(/ +/g)[0];
             [gate, binsString] = process.argv[2].split(splitter);
         } */

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


        var qrSaved = false;
        var logged = false;
        var regexCard = /\d{16,}\|(\d{1}|\d{2})\|(\d{2}|\d{4})\|(\d{3,4})/g;

        var maxCurrent = 2;



        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch({
            /*  args: [
               
               "--disable-setuid-sandbox",
               "--no-sandbox",
               
               "--no-zygote",
         
             ], */
            executablePath: os.platform() === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "/usr/bin/google-chrome-stable",
            headless: !(os.platform() === "win32"),


        });

        browserRef = browser;


        /*  const context = await browser.newContext({
             viewport: { width: 929, height: 667 }, // 📱 Tamaño típico de móvil (como iPhone X)
 
         }); */



        /* const defaultBrowserContext = browser.defaultBrowserContext(); */
        /*   const pages = await browser.pages(); */
        let pages = await browser.pages(); // Seleccionar la primera pestaña (la pestaña que se abre al abrir el navegador)
        let page = pages[0];
        await page.goto('https://web.telegram.org/a/', { timeout: 180_000 });
        await page.waitForSelector("#root", { timeout: 180_000 });

        var localStorageBuffer = readFileSync(resolve("./localStorage.json"))
        var localStorageJSON = localStorageBuffer.toString();
        if (localStorageJSON !== "") {


            var localStorageObject = JSON.parse(localStorageJSON);

            await page.evaluate((localStorageJSON) => {
                Object.keys(localStorageJSON).forEach(key => {
                    window.localStorage.setItem(key, localStorageJSON[key]);
                });
            }, localStorageObject);
        }

        //await page.evaluate(() => window.stop());

        var page2 = await browser.newPage();
        await page.close();
        page = page2;

        await page.setViewport({
            width: 929,
            height: 667,
            deviceScaleFactor: 1,
        });

        /*  await page.waitForTimeout(2000)
 
    
         await page.reload(); */
        /*  await page.waitForSelector("#LeftColumn-main > div.Transition > div > div > div > div > div > div", { timeout: 180_000 })
 
         await page.waitForTimeout(13_000)
         await page.evaluate(() => {
             Array.from(document.querySelectorAll("#LeftColumn-main > div.Transition > div > div > div > div > div > div")).find(e => e.innerText.includes("𝙇𝙞𝙤𝙣𝙨 𝘾𝙝𝙚𝙘𝙠𝙚𝙧")).id = "este-es-el-checker"
             return true
         }) */



        /*  await page.locator("#este-es-el-checker").click(); */


        /*  await new Promise(r => {
            setTimeout(() => r(true), 5_000);
            })
            await page.click("body")
            
            await new Promise(r => {
                setTimeout(() => r(true), 1_560);
                })
                await page.click("body") */


        await page.goto('https://web.telegram.org/a/' + group_id, { timeout: 180_000 });

        var ultimaVezEnviadaUnaTarjeta = null;
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

                await new Promise((r) => { setTimeout(() => r("ok"), 10_000) });
                if (antibotBtnArrayLength) {
                    for (let i = 0; i < antibotBtnArrayLength; i++) {
                        await page.click("." + classForAntibotButton + "-" + i);
                        //console.log("se dio click a: " + i);
                        await new Promise(r => { setTimeout(() => { r(true) }, generateRandomNumber(1000, 3000)) })

                    }
                    var page1 = await browser.newPage();
                    await page.close();
                    page = page1;
                    await new Promise(r => { setTimeout(() => { r(true) }, generateRandomNumber(5000, 10000)) })
                    await page.goto('https://web.telegram.org/a/' + group_id);
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

            if (!checking) {
                await browser.close();
                throw new Error("Deteniendo..................................")
            }
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
            const startTime = Date.now();
            const maxTime = 1000; // límite inferior para el tiempo transcurrido

            await antibot();


            /*     var checkingCards=await getCheckingCards();
                //console.log("checking cards: ",checkingCards) */
            /* if (yaCargo) { */
            var cardsStatuses = await getCardsStatuses();
            // console.log(cardsStatuses)

            //console.log(cardsStatuses.map(e => e.card));
            //console.log(queue)
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

                if (cardsStatuses[i].live && queue.includes(cardsStatuses[i].card)) {


                    console.log("se encontro live: ", JSON.stringify(cardsStatuses[i]))
                    /* var fileContent = await readFile(resolve("./lives.json"))
                    var liveCards = JSON.parse(fileContent);
                    if (!liveCards.find(e => e.card === cardsStatuses[i].card)) {
                      liveCards.push(cardsStatuses[i]);
                      await writeFile(resolve("./lives.json"), JSON.stringify(liveCards))
                    } */
                    await notificartelegramTarjetaLive(cardsStatuses[i])

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
                if (queue.includes(cardsStatuses[i].card)) {
                    numOfAttempts = numOfAttempts + 1;
                    console.log("Intento: " + numOfAttempts + ", Borrando:", cardsStatuses[i].card, ",index " + queue.indexOf(cardsStatuses[i].card))
                    queue.splice(queue.indexOf(cardsStatuses[i].card), 1)
                    if (numOfAttempts === max_atemps_per_bin) {
                        newBin = true;
                    }
                    //console.log(cardsStatuses[i])
                }
            }

            //console.log(queue)
            var cupos = maxCurrent - queue.length;

            while (cupos > 0) {
                //console.log("cupos: ", cupos)
                var cardString = generateCardFromString(binList[temporalBinIndex]);
                //console.log(cardString)
                var cmmd = `${gate} ${cardString}`;
                if (cardString) {
                    //await sendCardToCheck(cmmd)

                    var tiempoDesdeUltimaTarjetaEnviada = Date.now() - ultimaVezEnviadaUnaTarjeta;
                    if (ultimaVezEnviadaUnaTarjeta === null) {
                        /* var toWaitBeforeSendingCard = await checkIfAntispamTimer();
                        if(toWaitBeforeSendingCard>0){
                          console.log("Timer antispam detectado, esperando "+toWaitBeforeSendingCard+" s")
                          await new Promise((resolve) => setTimeout(()=>resolve(),toWaitBeforeSendingCard))
                        } */

                        await sendCardToCheck(cmmd)
                        ultimaVezEnviadaUnaTarjeta = Date.now();

                    } else if (tiempoDesdeUltimaTarjetaEnviada >= to_wait_card_send) {


                        await sendCardToCheck(cmmd)
                        ultimaVezEnviadaUnaTarjeta = Date.now();

                        /* await new Promise((resolve) => setTimeout(()=>resolve(),4000))
              
                        var toWaitBeforeSendingCard = await checkIfAntispamTimer();
                        if(toWaitBeforeSendingCard>0){
                          console.log("Timer antispam detectado, esperando "+toWaitBeforeSendingCard+" s")
                          await new Promise((resolve) => setTimeout(()=>resolve(),toWaitBeforeSendingCard))
                          await sendCardToCheck(cmmd)
                          ultimaVezEnviadaUnaTarjeta = Date.now();
              
                        } */


                    } else if (tiempoDesdeUltimaTarjetaEnviada < to_wait_card_send) {
                        await new Promise((resolve) => setTimeout(resolve, (to_wait_card_send - tiempoDesdeUltimaTarjetaEnviada)));
                        await sendCardToCheck(cmmd)
                        ultimaVezEnviadaUnaTarjeta = Date.now();
                        /* await new Promise((resolve) => setTimeout(()=>resolve(),2000))
              
                        var toWaitBeforeSendingCard = await checkIfAntispamTimer();
                        if(toWaitBeforeSendingCard>0){
                          console.log("Timer antispam detectado, esperando "+toWaitBeforeSendingCard+" s")
                          await new Promise((resolve) => setTimeout(()=>resolve(),toWaitBeforeSendingCard))
                          await sendCardToCheck(cmmd)
                          ultimaVezEnviadaUnaTarjeta = Date.now();
              
                        } */
                    }

                } else { throw new Error("comando invalido mmmmmmm") };
                /* var msgsWithCmmds = await getMessageWithCardCommands();
                //console.log(msgsWithCmmds) */
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
                    return dateOb.toLocaleString("en-CO", { timeZone: "America/Bogota" })
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
                        country: ele.innerText.includes("\[𒈒\] 𝑪𝒐𝒖𝒏𝒕𝒓𝒚 ➵ ") ? ele.innerText.match(/\[𒈒\] 𝑪𝒐𝒖𝒏𝒕𝒓𝒚 ➵ [^\n]*/)[0].split("[𒈒] 𝑪𝒐𝒖𝒏𝒕𝒓𝒚 ➵ ")[1] : "No Info",
                        card: ele.innerText.match(regexCard)[0],
                        date: generateDate()
                    }
                    // console.log(s)
                    return cardState;


                })
                return matches

            })
            // console.log(cardsStatuses)
            return cardsStatuses


        }
        async function sendCardToCheck(cmmd) {
            // await page.focus('#editable-message-text');


            /* console.log(JSON.stringify(cmmd));
            return "r"; */
            await page.type('#editable-message-text', cmmd, { delay: 3 })

            await new Promise(r => { setTimeout(() => { r(true) }, generateRandomNumber(456, 1000)) })
            await page.click("#MiddleColumn > div.messages-layout > div.Transition > div > div.middle-column-footer > div.Composer.shown.mounted > button");
            await new Promise(r => { setTimeout(() => { r(true) }, generateRandomNumber(456, 1000)) })
            return "ok";


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
            message += "*Country:* `" + liveCardObj.country + "`\n";
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
    } catch (error) {
        checking = false;
        await browserRef.close()
        console.error(error.message)
    }
}

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


