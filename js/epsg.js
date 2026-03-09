async function buscarEPSG(){

const code =
document.getElementById("epsgCode").value

const response =
await fetch(`https://epsg.io/${code}.wkt`)

const wkt =
await response.text()

document
.getElementById("wktOutput")
.value = wkt

}