import express from "express";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
import { readFile, writeFile } from 'node:fs/promises';
import path from "path";
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { generateCardFromString } from "./GenCard.js";
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import notifyFoundLiveCard from "./notifyFoundLiveCard.js";
import { contacts } from "./contactsToAdd16nov2025.js";

(async function () {
   // var contacts = JSON.parse(fs.readFileSync("./no-agregados-PPL.json").toString())
    // Or import puppeteer from 'puppeteer-core';  




    // Launch the browser and open a new blank page
    const browser = await chromium.launch({
        args: ["--start-maximized"],

        /* executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : "", */
        channel: "chrome",
        headless: false,


    });

    const context = await browser.newContext({
        viewport: null, // 📱 Tamaño típico de móvil (como iPhone X)

    });



    /* const defaultBrowserContext = browser.defaultBrowserContext(); */
    /*   const pages = await browser.pages(); */
    let page = await context.newPage(); // Seleccionar la primera pestaña (la pestaña que se abre al abrir el navegador)

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

    await page.waitForTimeout(2000)

    await page.reload();

    await page.waitForTimeout(7000)


    await page.locator("#LeftMainHeader > div.DropdownMenu.main-menu > button", { timeout: 30000 }).click();
    await page.waitForTimeout(2000)


    await page.locator("#LeftMainHeader > div.DropdownMenu.main-menu > div > div.bubble.menu-container.custom-scroll.with-footer.opacity-transition.fast.left.top.shown.open > div:nth-child(7)", { timeout: 30000 }).click();
    await page.waitForTimeout(2000)

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    for (let i = 0; i < contacts.length; i++) {

        let added = false;
        await page.waitForTimeout(randomBetween(2700,3700))
        if (!added) await page.locator('[aria-label="Create New Contact"]').click();
        while (!added) {

            // Abrir formulario

            // Llenar campos
            await page.locator('[aria-label="Phone Number"]').fill(contacts[i]);
            await page.locator('[aria-label="First name (required)"]').fill("PPL " + (Math.floor(10000 + Math.random() * 90000)));

            // Click en Save
            await page.waitForTimeout(randomBetween(500,799));
            await page.locator('button.Button.confirm-dialog-button.default.primary.text', { hasText: "Done" }).click();


            try {
                // Espera la notificación de éxito
                await page.waitForSelector('#portals > div.Notification-container > div', {
                    timeout: 1500
                });

                // Si llega aquí → se agregó correctamente
                console.log("❌ No existe" + contacts[i]);
                console.log("Intentanto con siguiente " + contacts[i + 1]);
                await page.getByRole("button", { name: "Cancel" }).click();

                break;

            } catch (err) {
                added = true;
                console.log("✔ Se agregó: " + contacts[i]);
                // NO se agregó → repetir esta iteración

                // Cerrar el formulario o retroceder si sigue abierto
                await page.waitForTimeout(300);
            }
        }

        // Log final por contacto
        console.log(`Contacto ${contacts[i]} → OK`);
    }




    // Navigate the page to a URL.
    /* await page.goto('https://web.telegram.org/a/' + group_id); */
    /* page.evaluate(() => window.location.reload()); */



})()


