# CRS Studio Web

CRS Studio Web é uma aplicação web para **exploração, criação e edição de Sistemas de Referência de Coordenadas (CRS)** e geração de representações **WKT (Well-Known Text)**.

O objetivo do projeto é oferecer uma ferramenta web simples e aberta para trabalhar com sistemas de referência utilizados em **Geoprocessamento**, permitindo gerar CRS personalizados, consultar códigos EPSG e visualizar projeções.

---

# Funcionalidades

## Busca por EPSG

Permite buscar um sistema de referência pelo código EPSG e obter automaticamente sua representação em WKT.

Exemplos:

EPSG:4326
EPSG:4674
EPSG:31983
EPSG:3857

Os dados são consultados a partir do
EPSG Geodetic Parameter Dataset.

---

## CRS Builder

Permite gerar CRS personalizados diretamente pela interface.

Parâmetros disponíveis atualmente:

* Datum
* Zona UTM
* Hemisfério
* Parâmetros da projeção

A aplicação gera automaticamente a string **WKT correspondente**.

---

## Editor de WKT

A interface permite visualizar e editar manualmente a representação WKT de um CRS.

Isso facilita:

* ajustar parâmetros de projeção
* adaptar sistemas de referência
* testar variações de CRS

---

## Visualização em mapa

O projeto inclui uma visualização cartográfica básica usando:

* Leaflet
* Proj4js

O objetivo é permitir futuramente:

* visualizar projeções
* comparar CRS
* analisar distorções

---

# Estrutura do projeto

```text
crs-studio
│
├── index.html
│
├── css
│   └── style.css
│
├── js
│   ├── app.js
│   ├── epsg.js
│   ├── map.js
│   ├── utils.js
│   └── wktGenerator.js
│
├── data
│   ├── ellipsoids.json
│   └── projections.json
│
└── README.md
```

Descrição dos principais componentes:

**index.html**
Interface principal da aplicação.

**css/style.css**
Estilos da aplicação.

**js/app.js**
Arquivo principal de inicialização.

**js/epsg.js**
Consulta CRS a partir do código EPSG.

**js/wktGenerator.js**
Geração de WKT a partir dos parâmetros informados.

**js/map.js**
Inicialização do mapa interativo.

**js/utils.js**
Funções auxiliares.

---

# Como executar o projeto

Não é necessário backend.

Basta abrir o arquivo:

index.html

em um navegador moderno.

---

# Publicação

O projeto pode ser publicado gratuitamente usando:

GitHub Pages

Após habilitar o GitHub Pages no repositório, a aplicação ficará disponível em:

https://mateus-roma.github.io/wkt-crs-builder

---

# Roadmap

Funcionalidades planejadas para as próximas versões:

* Autocomplete de CRS a partir da base EPSG
* Biblioteca de elipsoides
* Biblioteca de projeções cartográficas
* Conversão entre WKT, PROJ4 e EPSG
* Editor visual da estrutura WKT
* Exportação de arquivos `.prj`
* Detecção automática de zona UTM a partir do mapa
* Visualização de distorções cartográficas

---

# Tecnologias utilizadas

* HTML
* CSS
* JavaScript
* Leaflet
* Proj4js

---

# Licença

Este projeto é distribuído sob licença MIT.

---

# Contribuições

Contribuições são bem-vindas.

Sugestões de melhorias incluem:

* novos tipos de projeção
* melhorias na interface
* ferramentas de validação de CRS
* suporte a novos formatos

---

# Objetivo do projeto

O CRS Studio Web pretende evoluir para uma ferramenta aberta de manipulação de sistemas de referência voltada à comunidade de **Geoprocessamento**, permitindo explorar e entender sistemas de coordenadas de forma simples e visual.
