var data,layout; // variables globales
var xA,YB;
var Eclairement = 0; // valeur de l'éclairement reçu
var temps;
var tempsDepart = 0;
var depart = true;//pour trouver le premier point du tracé
var LignePoints = true; // pour changer le type de tracé
var donnees;// les données reçues 
var AffichePoints = false; // affiche les points sur la courbe
var status = "A"; // status led A Eteinte B Allumée

$(document).ready(function() {// attend que la page soit chargée avant de lancer le script javascript
                //$(function() { // autre écriture de la ligne précédente

					// Ouverture d'un socket avec le serveur
					//var socket = io.connect('http://192.168.1.19:80');
	                //var socket = io.connect('http://192.168.1.65:80');
					var socket = io.connect('http://134.59.81.46:80'); // tapez ici l'adresse de votre site node
	                
					// En cas de réception d'un message du serveur écoute les messages envoyés par node.
	                socket.on('message', function(message) {
					//sélection du message
						//console.log("message : ",message);
						donnees = message.split(",");// données dans un tableau le séparateur est la virgule
						//console.log(donnees[0]);
						switch(donnees[0]) { // si le 1er élement vaut .... alors ...
							case "Led1"://vérification que c'est bien la chaine qui contient les infos sur la led1
								status = donnees[1];
								//console.log("status reçu: "+status);
								if(status == "B") {
									$("#btn").removeClass("btn_red");
									$("#btn").addClass("btn_green");
								}
								else {
									$("#btn").removeClass("btn_green");
									$("#btn").addClass("btn_red");
								}	
							break;
							case "Ecl1": //info provenant de la ldr sur A0 de l'arduino 
								Eclairement = donnees[1];
								//console.log("Eclairement : "+Eclairement);
								$('#ECL1').html(Eclairement);// rajoute la valeur de l'éclairment dans l'élément HTML d' ID ECL1 
								gauge1.value = Eclairement;// mets à jour la jauge éclairement
								//gauge1.update();
								
								if (AffichePoints) {
									if (depart){tempsDepart = donnees[2];depart=false};
									temps = donnees[2]-tempsDepart;
									affichePoint();// affiche le point dans la courbe plotly.js
								}
							break;
							default:
								//si pas de cas précédent
							break;
						}
						
	                });
	    			//socket.emit('message', "B\n");//allume la lampe 
					
					// Sur click
	                $('#btn').click(function () {
						if(status == "B") {// si la led est allumée je l'éteins
							status = "A";
						}
						else {// si non je l'allume
							status = "B";
						}
	     				EnvoiCmd(status); // envoi le message vers node pour allumer ou éteindre la led
	                }); 

	                var EnvoiCmd = function(status) { // fonction permettant d'envoyer un message vers node et donc vers arduino
	                	
						var chaine = "\n"+status+"\n";
						console.log("Status emis : "+chaine);
	                    socket.emit('message', chaine); //envoi message avec valeur du status de la led
	                }

	                // Initialisation
					// au départ pour connaitre l'état de la led1 envoie un message (lettre E definie dans le programme arduino)pour savoir si la lampe est allumée ou non
					//socket.emit('message', 'E\n');
					EnvoiCmd("E");
					
					
			// cadran pour afficher l'éclairement : bibliothèque et documentation disponibles sur le site https://canvas-gauges.com/ 
					var gauge1 = new RadialGauge({
						renderTo: 'LUXMETRE',
						width: 550, //dimensions ajustées dans le css (fichier style1.css)
						height: 550,
						units: "lx (lux)",
						title: "Eclairement",
						minValue: 0,
						maxValue: 1000,
						majorTicks: [
							0,
							100,
							200,
							300,
							400,
							500,
							600,
							700,
							800,
							900,
							1000
						],
						minorTicks: 2,
						strokeTicks: true,
						highlights: [
							{
								"from": 0,
								"to": 200,
								"color": "rgba(0,95, 123, 1)"
							},
							{
								"from": 200,
								"to": 600,
								"color": "rgba(0,194, 255, .94)"
							},
							{
								"from": 600,
								"to": 1000,
								"color": "rgba(255, 0, 0, 1)"
							}
						],
						ticksAngle: 225,
						startAngle: 67.5,
						colorMajorTicks: "#fff",
						colorMinorTicks: "#fff",
						colorTitle: "#fff",
						colorUnits: "#fff",
						colorNumbers: "#fff",
						colorPlate: "#908686",
						borderShadowWidth: 0,
						borders: true,
						needleType: "arrow",
						needleWidth: 4,
						needleCircleSize: 7,
						needleCircleOuter: true,
						needleCircleInner: true,
						animationDuration: 1500,
						animationRule: "linear",
						colorBorderOuter: "#333",
						colorBorderOuterEnd: "#111",
						colorBorderMiddle: "#222",
						colorBorderMiddleEnd: "#111",
						colorBorderInner: "#111",
						colorBorderInnerEnd: "#333",
						colorNeedleShadowDown: "#333",
						colorNeedleCircleOuter: "#F00",
						colorNeedleCircleOuterEnd: "#F00",
						colorNeedleCircleInner: "#F00",
						colorNeedleCircleInnerEnd: "#F00",
						colorNeedle: "rgba(255, 0, 0, 1)",
						colorNeedleEnd: "rgba(255, 50, 50, .75)",
						valueBox: true,
						valueBoxBorderRadius: 4,
						colorValueBoxRect: "#fff",
						colorValueBoxRectEnd: "#eee",
						valueDec: 0,// nombre de décimales
						animatedValue: true // animation des valeurs dasn la boite
					}).draw();
					
					
// tracé du graphe

xA = [temps];
yB = [Eclairement];
data = [{
  x: [], 
  y: [],
  mode: 'lines+markers',
  marker: {
    color: 'red',
    size: 6,
    //line: {
    //  color: 'rgb(231, 99, 250)',
    //  width: 2
    //},
  },
  line: {color: '#80CAF6'}

}] 

layout = {
	title: 'Acquisition éclairement',
  xaxis: {
	title: 't (s)',
    autorange: true
  }, 
  yaxis: {
    //type: 'log',
	title: 'E (lux)',
    autorange: true
  }
};
// trace le graphe
Plotly.newPlot('graph', data, layout,{responsive: true,displaylogo: false});

// fonction qui ajoute un point sur le graphe plotly
function affichePoint() {
	var update = {
	x:  [[temps]],
	y: [[Eclairement]]
	}
  
	Plotly.extendTraces('graph', update, [0])
}

// quand le menu 1 est affiché on dessine la courbe 
$('#monTab li:eq(1) a').on('shown.bs.tab', function(){ // quand le menu 1 est affiché on dessine la courbe 
			Plotly.newPlot('graph', data, layout,{responsive: true,displaylogo: false});
			console.log("OK menu 1");
});
					
AffichePoints = true;				
});// fin doc ready	


// autres fonctions

function departstop() {
	if (AffichePoints){
		AffichePoints = false;
		
	}else {
		//effaceGraphe();
		AffichePoints = true;
		//depart=true;// pour effectuer remise à zéro du temps
	}
}// fin depart-stop

function effaceGraphe(){
	data = [{
	x: [], 
	y: [],
	mode: 'lines+markers',
	marker: {
    color: 'red',
    size: 6,
    //line: {
    //  color: 'rgb(231, 99, 250)',
    //  width: 2
    //},
	},
	line: {shape: 'spline', color: '#80CAF6'}

	}]
	depart=true;// pour effectuer remise à zéro du temps
	AffichePoints = false;// arrêt du tracé
	Plotly.newPlot('graph', data, layout,{responsive: true,displaylogo: false});
};// fin effacegraphe

function lignepoints(){
	if (LignePoints) {
		//update the layout and all the traces
		var layout_update = {
		title: 'Acquisition (tracé ligne lissée spline)', // updates the title
		};
		var data_update = {
		'marker.color': 'red',
		mode :'lines',
		line: {shape: 'spline', color: '#80CAF6'}
		};
		LignePoints = false;
	}else {
		var layout_update = {
		title: 'Acquisition (tracé avec points et lignes )', // updates the title
		};
		var data_update = {
		'marker.color': 'red',
		mode :'lines+markers',
		line: {shape: 'line', color: '#80CAF6'}
		};
		LignePoints =true;
		
	}

	Plotly.update('graph', data_update, layout_update);
}// fin lignepoints