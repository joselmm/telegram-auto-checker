import puppeteer from 'puppeteer';

// Or import puppeteer from 'puppeteer-core';
import express from "express";
import fs, { fsyncSync } from "fs";
import path from "path";
import fetch from "node-fetch";

const app = express()
const port = 3000;
var qrSaved = false;
var logged = false;
var chat_id="#-1002235041204"

// Launch the browser and open a new blank page
const browser = await puppeteer.launch({headless:false, defaultViewport: null,
  args: ['--start-maximized'] });
const defaultBrowserContext = browser.defaultBrowserContext();
const pages = await defaultBrowserContext.pages();
const page1 = pages[0]; // Seleccionar la primera pestaña (la pestaña que se abre al abrir el navegador)

await page1.goto('https://web.telegram.org/a/');

var localStorageFileId = "1hxdL8nBIuMzUU-TvKJBNeIXXb7EZM-fy";
var ftpServerUrl= "https://script.google.com/macros/s/AKfycbz9GV4R7FOQOoTukIl8RDmdqw_sOy00z8H1IJDgA8dCQIMCbxO031VFF4TbwjSqBf0PIg/exec";

var localStorageJSON =await fetch("https://drive.google.com/uc?id="+localStorageFileId)
.then(response => response.text())
.catch(error => {
  console.error('Error:', error)
  return "";
});
if(localStorageJSON!==""){

  var localStorageObject = JSON.parse(localStorageJSON);
  await page1.evaluate((localStorageJSON) => {
    Object.keys(localStorageJSON).forEach(key => {
      window.localStorage.setItem(key, localStorageJSON[key]);
    });
  },localStorageObject);
}
var page = await browser.newPage();
page1.close();
// Navigate the page to a URL.
await page.goto('https://web.telegram.org/a/'+chat_id);


page.on('dialog', async (dialog) => {
    await dialog.accept();
});

// Set screen size.

/* MANEJAR TARJETAS */
manejarTarjetas();
async function manejarTarjetas() {
  /*
  await page.evaluate((chat_id) => {
    Array.from(document.querySelectorAll("a")).find(a=>a.href=chat_id)
    return true
  }, chat_id)
  */
    await page.waitForNavigation('#editable-message-text');
    await page.waitForSelector('#editable-message-text');
    await new Promise(resolve => setTimeout(resolve, 10000));
    page.focus('#editable-message-text');
    await new Promise(resolve => setTimeout(resolve, 5000));
    page.type('#editable-message-text', "mi efrain");
    page.click("#MiddleColumn > div.messages-layout > div.Transition > div > div.middle-column-footer > div.Composer.shown.mounted > button");
}





  // Escuchar eventos de solicitud de HTTP


  // Escuchar eventos de respuesta de HTTP
  page.on('requestfinished', (request) => {
      if(request.url().startsWith('https://web.telegram.org/a/blank') && logged == false) {
          console.log(request.url())
          if(
            localStorageJSON===""
          ){updateQr()}
          
        }
    if(request.url().startsWith('https://web.telegram.org/a/BundleMain.') && request.url().endsWith('.css')){
        console.log(request.url())
        console.log('Sesión iniciada')
        if(localStorageJSON===""){ 
        page.waitForSelector("#LeftColumn-main > div.NewChatButton > button")
        .then(() => {
          page.evaluate(()=>{ 
            return JSON.stringify(window.localStorage);
          })
          .then((localStorageJSON) => {
            /* fs.writeFileSync('localStorage.json', localStorageJSON);
            console.log("localStorage.json was saved") */

            uploadLocalStorageFile(localStorageJSON)
            .then(() =>console.log("localStorage file uploaded"))
            .catch(error => console.log(error))
            
          })
        })
        .catch(error => console.log(error))
      }
      logged = true;
    }
  });



  app.get('/qr', (req, res) => {
    if(logged){
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
    "body": JSON.stringify({"archivo_name":"localStorage.json","file_mime":"application/json","archivo_base64":btoa(localStorageJsonContent), "file_id":localStorageFileId}),
    "method": "POST"
  });  
}