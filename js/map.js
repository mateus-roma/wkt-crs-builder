const map =
L.map("map")
.setView([-15,-55],4)

L.tileLayer(
"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
).addTo(map)