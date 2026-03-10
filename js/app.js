let map
let marker

document.addEventListener("DOMContentLoaded", () => {

initMap()

document
.getElementById("searchEPSG")
.addEventListener("click", buscarEPSG)

document
.getElementById("generateCRS")
.addEventListener("click", gerarUTM)

document
.getElementById("copyWKT")
.addEventListener("click", copiarWKT)

})



function initMap(){

map = L.map("map")
.setView([-15,-55],4)

L.tileLayer(
"https://tile.openstreetmap.org/{z}/{x}/{y}.png",
{
maxZoom:19
}
).addTo(map)

map.on("click", onMapClick)

}



function onMapClick(e){

const lat = e.latlng.lat
const lon = e.latlng.lng

const zone = Math.floor((lon + 180) / 6) + 1

const hemisphere = lat >= 0 ? "north" : "south"

document.getElementById("zone").value = zone
document.getElementById("hemisphere").value = hemisphere

if(marker){
map.removeLayer(marker)
}

marker = L.marker([lat,lon]).addTo(map)

gerarUTM()

}



async function buscarEPSG(){

const code =
document.getElementById("epsgCode").value.trim()

if(code === ""){
alert("Digite um código EPSG")
return
}

try{

const response =
await fetch(`https://epsg.io/${code}.wkt`)

if(!response.ok){
throw new Error()
}

const wkt =
await response.text()

document
.getElementById("wktOutput")
.value = wkt

}catch{

alert("EPSG não encontrado")

}

}



function gerarUTM(){

const zone =
Number(document.getElementById("zone").value)

const hemisphere =
document.getElementById("hemisphere").value

const datum =
document.getElementById("datum").value

if(!zone || zone < 1 || zone > 60){

alert("Zona UTM inválida")

return
}

const centralMeridian =
zone * 6 - 183

const falseNorthing =
hemisphere === "south" ? 10000000 : 0

const wkt = `
PROJCS["Custom UTM",
GEOGCS["${datum}"],
PROJECTION["Transverse_Mercator"],
PARAMETER["latitude_of_origin",0],
PARAMETER["central_meridian",${centralMeridian}],
PARAMETER["scale_factor",0.9996],
PARAMETER["false_easting",500000],
PARAMETER["false_northing",${falseNorthing}],
UNIT["Meter",1]]
`

document
.getElementById("wktOutput")
.value = wkt.trim()

}



function copiarWKT(){

const textarea =
document.getElementById("wktOutput")

if(textarea.value.trim() === ""){
alert("Nenhuma WKT para copiar")
return
}

navigator.clipboard.writeText(textarea.value)

alert("WKT copiada")

}