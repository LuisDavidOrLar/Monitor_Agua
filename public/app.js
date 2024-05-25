const firebaseConfig = {
  apiKey: "AIzaSyB7_hUcpz18__hPLK64qSvd3KFGIvYcFV8",
  authDomain: "monitor-de-calidad-de-agua.firebaseapp.com",
  projectId: "monitor-de-calidad-de-agua",
  storageBucket: "monitor-de-calidad-de-agua.appspot.com",
  messagingSenderId: "989467231088",
  appId: "1:989467231088:web:0437fd2ac1a91bfba305b5",
  measurementId: "G-LB5Z3F7G28"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function generarDatosSimulados() {
  const oxigenoDisuelto = (Math.random() * 10).toFixed(2);
  const ph = (Math.random() * 2 + 6).toFixed(2);
  const dbo = (Math.random() * 10).toFixed(2);
  const nitratos = (Math.random() * 10).toFixed(2);
  const fosfatos = (Math.random() * 10).toFixed(2);
  const turbidez = (Math.random() * 100).toFixed(2);
  const temperatura = (Math.random() * 30).toFixed(2);
  const timestamp = new Date().toISOString();
  
  return {
    oxigenoDisuelto: parseFloat(oxigenoDisuelto),
    ph: parseFloat(ph),
    dbo: parseFloat(dbo),
    nitratos: parseFloat(nitratos),
    fosfatos: parseFloat(fosfatos),
    turbidez: parseFloat(turbidez),
    temperatura: parseFloat(temperatura),
    timestamp: timestamp
  };
}

function normalizarDatos(datos) {
  return datos.map(d => ({
    oxigenoDisuelto: (d.oxigenoDisuelto / 10) * 100, // Escalar de 0 a 100
    ph: ((d.ph - 6) / 2) * 100, // Escalar de 6 a 8 a 0 a 100
    dbo: (d.dbo / 10) * 100, // Escalar de 0 a 100
    nitratos: (d.nitratos / 10) * 100, // Escalar de 0 a 100
    fosfatos: (d.fosfatos / 10) * 100, // Escalar de 0 a 100
    turbidez: d.turbidez, // Ya está en un rango de 0 a 100
    temperatura: (d.temperatura / 30) * 100, // Escalar de 0 a 100
    timestamp: d.timestamp
  }));
}

function calcularICA(datos) {
  const od = datos.oxigenoDisuelto;
  const ph = datos.ph;
  const dbo = 100 - datos.dbo;
  const nitratos = 100 - datos.nitratos;
  const fosfatos = 100 - datos.fosfatos;
  const turbidez = 100 - datos.turbidez;
  const temperatura = (30 - datos.temperatura) * 3.33;

  return (od + ph + dbo + nitratos + fosfatos + turbidez + temperatura) / 7;
}

let intervaloSimulacion;

function enviarDatosAFirebase() {
  const datos = generarDatosSimulados();
  db.collection("datosCalidadAgua").add(datos)
    .then(() => {
      console.log("Datos enviados:", datos);
    })
    .catch((error) => {
      console.error("Error al agregar documento:", error);
    });
}

document.getElementById('iniciar-simulacion').addEventListener('click', () => {
  if (!intervaloSimulacion) {
    intervaloSimulacion = setInterval(enviarDatosAFirebase, 5000);
    console.log("Simulación iniciada.");
  }
});

db.collection("datosCalidadAgua").orderBy("timestamp", "desc").limit(50).onSnapshot((snapshot) => {
  let datos = [];
  snapshot.forEach((doc) => {
    datos.push(doc.data());
  });
  actualizarGrafico(normalizarDatos(datos));
  mostrarValores(datos);
  actualizarICA(datos);
});

function actualizarGrafico(datos) {
  datos.forEach(d => d.timestamp = new Date(d.timestamp));

  const svg = d3.select("#grafico");
  svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar

  const margin = {top: 20, right: 30, bottom: 30, left: 50},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
      .domain(d3.extent(datos, d => d.timestamp))
      .range([0, width]);

  const y = d3.scaleLinear()
      .domain([0, 100]) // Ajustado a 100 para permitir escala común
      .range([height, 0]);

  const line = (param) => d3.line()
      .x(d => x(d.timestamp))
      .y(d => y(d[param]));

  const parametros = ['oxigenoDisuelto', 'ph', 'dbo', 'nitratos', 'fosfatos', 'turbidez', 'temperatura'];
  const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2'];

  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

  g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y))
    .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Valor");

  parametros.forEach((param, i) => {
    g.append("path")
      .datum(datos)
      .attr("class", `line ${param}`)
      .attr("d", line(param))
      .attr("stroke", colores[i]);
  });
}

function mostrarValores(datos) {
  const datosRecientes = datos[datos.length - 1];
  const calidadAgua = calcularICA(datosRecientes);
  const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2'];

  document.getElementById('valores-actuales').innerHTML = `
    <p style="color: ${colores[0]}">Oxígeno Disuelto: ${datosRecientes.oxigenoDisuelto} mg/L</p>
    <p style="color: ${colores[1]}">pH: ${datosRecientes.ph}</p>
    <p style="color: ${colores[2]}">DBO: ${datosRecientes.dbo} mg/L</p>
    <p style="color: ${colores[3]}">Nitratos: ${datosRecientes.nitratos} mg/L</p>
    <p style="color: ${colores[4]}">Fosfatos: ${datosRecientes.fosfatos} mg/L</p>
    <p style="color: ${colores[5]}">Turbidez: ${datosRecientes.turbidez} NTU</p>
    <p style="color: ${colores[6]}">Temperatura: ${datosRecientes.temperatura} °C</p>
    <p>ICA: ${calidadAgua.toFixed(2)}%</p>
  `;
}

function actualizarICA(datos) {
  const datosRecientes = datos[datos.length - 1];
  const calidadAgua = calcularICA(datosRecientes);

  const svg = d3.select("#grafico-ica");
  svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2;
  const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

  const color = d3.scaleOrdinal(["#87CEEB", "#d3d3d3"]);

  const pie = d3.pie().sort(null).value(d => d.value);
  const path = d3.arc().outerRadius(radius - 10).innerRadius(radius - 70);

  const data = [
    {name: "ICA", value: calidadAgua},
    {name: "Restante", value: 100 - calidadAgua}
  ];

  const arc = g.selectAll(".arc")
    .data(pie(data))
    .enter().append("g")
    .attr("class", "arc");

  arc.append("path")
    .attr("d", path)
    .attr("fill", d => color(d.data.name));

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .attr("font-size", "24px")
    .text(`${calidadAgua.toFixed(2)}%`);
}