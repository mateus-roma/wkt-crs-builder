function generateWKT(){

const zone =
document.getElementById("zone").value

const centralMeridian =
zone * 6 - 183

const wkt = `
PROJCS["Custom UTM",
PROJECTION["Transverse_Mercator"],
PARAMETER["central_meridian",${centralMeridian}],
PARAMETER["scale_factor",0.9996],
PARAMETER["false_easting",500000]
]
`

document
.getElementById("wktOutput")
.value = wkt

}