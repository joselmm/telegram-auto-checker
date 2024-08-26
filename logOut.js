import fetch from "node-fetch";
var ftpServerUrl= "https://script.google.com/macros/s/AKfycbz9GV4R7FOQOoTukIl8RDmdqw_sOy00z8H1IJDgA8dCQIMCbxO031VFF4TbwjSqBf0PIg/exec";
var localStorageFileId = "1hxdL8nBIuMzUU-TvKJBNeIXXb7EZM-fy";

fetch(ftpServerUrl, {
    "body": JSON.stringify({"archivo_name":"localStorage.json","file_mime":"application/json","archivo_base64":"", "file_id":localStorageFileId}),
    "method": "POST"
})
.then(r=>r.json())
.then(r=>console.log("se cerro sesion ", r))
.catch(err=>console.log(err))