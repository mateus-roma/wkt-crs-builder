function generateWKT(){

const name = document.getElementById("crsName").value
const datum = document.getElementById("datum").value
const zone = document.getElementById("zone").value
const hemisphere = document.getElementById("hemisphere").value

let centralMeridian = zone * 6 - 183

let falseNorthing = hemisphere === "south" ? 10000000 : 0

let datumWKT = ""

if(datum === "SIRGAS2000"){
datumWKT = `
DATUM["Sistema de Referencia Geocentrico para las Americas 2000",
ELLIPSOID["GRS 1980",6378137,298.257222101]]
`
}

if(datum === "WGS84"){
datumWKT = `
DATUM["World Geodetic System 1984",
ELLIPSOID["WGS 84",6378137,298.257223563]]
`
}

const wkt = `
PROJCS["${name}",
GEOGCS["GCS",
${datumWKT},
PRIMEM["Greenwich",0],
UNIT["Degree",0.0174532925199433]],
PROJECTION["Transverse_Mercator"],
PARAMETER["latitude_of_origin",0],
PARAMETER["central_meridian",${centralMeridian}],
PARAMETER["scale_factor",0.9996],
PARAMETER["false_easting",500000],
PARAMETER["false_northing",${falseNorthing}],
UNIT["Meter",1]]
`

document.getElementById("wktOutput").value = wkt

}