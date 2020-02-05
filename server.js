var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
//var ent = require('ent');
var fs = require('fs-extra');
var bodyParser = require("body-parser");
var os = require('os');
var ifaces = os.networkInterfaces();
var mkdirp = require('mkdirp');
const fileUpload = require('express-fileupload');
var favicon = require('serve-favicon');

app.use(favicon(__dirname + '/ressources/favicon.png'));

app.use(express.static(__dirname + '/'),); //__dir and not _dir
var port = 8000; // you can use any port
server.listen(port);

// Création du fichier de configuration
var fileContent = '{"config":[]}';
var filepath = "data/config.json";

fs.writeFile(filepath, fileContent, (err) => {
    if (err) throw err;
    console.log("Le fichier de configuration a été créé !");
});

// Création d'un fichier de résultat

// The absolute path of the new file with its name
var datetime = new Date();
date = datetime.toISOString().slice(0,16);
var filepath = "data/quiz/resultats/resultats_"+date;

fs.mkdirSync(filepath, { recursive: true })

// mkdirp(filepath, function(err) {
//     // path exists unless there was an error
// });

let emplacement = {
  emplacement: filepath,
};

// On récupère l'ip locale du serveur afin de la stocker dans un fichier json
Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;
  var myip;
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      myip = iface.address;
      console.log("Le serveur est démarré à l'adresse suivante : http://"+iface.address+":"+port);
      console.log("La page de connexion pour les élèves est disponible ici : http://"+iface.address+":"+port+"/dashboard.html");
      let config = {
          local: myip+":"+port,
          emplacement : filepath,
      };
      writeConfig(config);

    } else {
      // this interface has only one ipv4 adress
      myip = iface.address;
      console.log("Le serveur est démarré à l'adresse suivante : http://"+iface.address+":"+port);
      console.log("La page de connexion pour les élèves est disponible ici : http://"+iface.address+":"+port+"/dashboard.html");
      let config = {
          local: myip+":"+port,
          emplacement : filepath,
      };
      writeConfig(config);
    }
    ++alias;
  });
});

function writeConfig(x) {
  var filepath = "data/config.json";

  fs.readFile(filepath, function(err, data) {
    if (err)
        throw err;
    var content = JSON.parse(data);
    content.config.push(x);
    fs.writeFile(filepath, JSON.stringify(content), function(err) {
        if (err)
            throw err;
    });
  });

};

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());


// Quand un client se connecte, on le note dans la console
var connect_id = 0;
io.sockets.on('connection', function (socket) {
    //console.log('Un client est connecté !');

    socket.on('register', function(data) {
        nom = data.nom;
        quiz = data.quiz;
        fs.access("data/quiz/"+quiz+".json", fs.F_OK, (err) => {
          if (err) {
            console.error(err)
            console.log("Quiz introuvable !");
            return
          }
          connect_id +=1;
          console.log("Un utilisateur s'est connecté : "+nom+"(id:"+connect_id+")");
          register(connect_id, nom, quiz, function(returnValue) {
          // use the return value here instead of like a regular (non-evented) return value
          });
          var destination = '/question.html';
          socket.emit('redirect', destination);
        });
    });

    socket.on('quiz', function(data) {
      nom = data.nom;
      quiz = data.quiz;
      question = data.question;
      reponse = data.reponse;
      fs.access("data/quiz/"+quiz+".json", fs.F_OK, (err) => {
        if (err) {
          console.error(err)
          console.log("Quiz introuvable !");
          return
        }
        console.log(nom+" a répondu à la question "+question+" et à donné la réponse : "+reponse);

        save(nom,quiz,question,reponse, function(returnValue) {
        // use the return value here instead of like a regular (non-evented) return value
        });
      });
      //var destination = '/quiz.html';
      //socket.emit('redirect', destination);
    });

    socket.on('question', function(data) {
      nom = data.nom;
      question = data.question;
      quiz = data.quiz;
      fs.access("data/quiz/"+quiz+".json", fs.F_OK, (err) => {
        if (err) {
          console.error(err)
          console.log("Quiz introuvable !");
          return
        }
        console.log("La question "+question+" a été demandée par "+nom+".");
        var data = fs.readFileSync("data/quiz/"+quiz+".json");
        var content = JSON.parse(data);

        titre = content.titre;
        question_max = content.questions.length;
        texte = content.questions[question-1].texte;
        temps = content.questions[question-1].temps;
        reponses = [];
        for (i = 0; i < content.questions[question-1].reponses.length; i++){
          let rep_data = {
            id: content.questions[question-1].reponses[i].id,
            texte: content.questions[question-1].reponses[i].texte,
          }
          reponses.push(rep_data);
        };

        socket.emit('question', {titre:titre, question_max: question_max, texte : texte, temps : temps, reponses : JSON.stringify(reponses)});
      });
    });

    socket.on('index', function(data) {
      quiz = data;
      fs.access("data/quiz/"+quiz+".json", fs.F_OK, (err) => {
      if (err) {
        console.error(err)
        console.log("Quiz introuvable !");
        return
      }
      var data = fs.readFileSync("data/quiz/"+quiz+".json");
      var content = JSON.parse(data);

      titre = content.titre;
      question_max = content.questions.length;
      var temps = 0;
      var points = 0;
      // Pour chaque question, on récupère les réponses possibles
      for (i = 0; i < question_max; i++){
        temps+= parseFloat(content.questions[i].temps);
        for (j = 0; j < content.questions[i].reponses.length; j++){
          points += parseFloat(content.questions[i].reponses[j].points);
        };
      };

      socket.emit('index', {titre : titre, question_max : question_max, temps : temps, points : points});

    });
    });

    socket.on('resultats', function(data) {
      nom = data.nom;
      quiz = data.quiz;

      fs.access("data/quiz/"+quiz+".json", fs.F_OK, (err) => {
      if (err) {
        console.error(err)
        console.log("Quiz introuvable !");
        return
      }

        var data = fs.readFileSync("data/quiz/"+quiz+".json");
        fs.access(filepath+"/"+quiz+"_"+nom+".json", fs.F_OK, (err) => {
        if (err) {
          console.error(err)
          console.log("Utilisateur introuvable !");
          return
        }
        var userdata = fs.readFileSync(filepath+"/"+quiz+"_"+nom+".json");
        var content = JSON.parse(data);
        var usercontent = JSON.parse(userdata);

        questions = usercontent.resultats[0].questions;
        reponses = usercontent.resultats[0].reponses;
        var c= 0;
        var titres = [];
        var points_tot = [];
        var reponses_correctes = [];
        var textes_corrects = [];
        var id_questions = [];
        var id_reponses = [];
        var textes_reponses = [];
        var totaux = [];

          for (k=0; k < questions.length; k++){
            c = k+1;

            var total_question = 0;
            var id_reponse = [];
            var reponse_correcte = [];
            var texte_correct = [];
            var texte_reponse = [];
            var id = "";
            var p = 0;
            var total = 0;
            for (i = 0; i < content.questions[k].reponses.length; i++){
              if (content.questions[k].reponses[i].points >= 0) {
                p += content.questions[k].reponses[i].points;
              }
              if (content.questions[k].reponses[i].points > 0){
                reponse_correcte.push(content.questions[k].reponses[i].id);
                texte_correct.push(content.questions[k].reponses[i].texte);
              }
              for (l=0; l < reponses[k].length; l++){
                if (reponses[k][l].toUpperCase() == content.questions[k].reponses[i].id){
                  id_reponse.push(reponses[k][l].toUpperCase());
                  texte_reponse.push(content.questions[k].reponses[i].texte);
                  total += content.questions[k].reponses[i].points;

                }
              }
            }

            titres.push(content.questions[k].texte);
            points_tot.push(p);
            id_reponses.push(id_reponse);
            reponses_correctes.push(reponse_correcte);
            textes_corrects.push(texte_correct);
            id_questions.push(c);
            textes_reponses.push(texte_reponse);
            totaux.push(total);
          }

          for(m=0; m < totaux.length; m++){
            usercontent.resultats[0].points.push(totaux[m]);
          }

          fs.writeFile(filepath+"/"+quiz+"_"+nom+".json", JSON.stringify(usercontent), (err) => {
              if (err) throw err;
              console.log('Points sauvegardées !')
          });

        socket.emit('resultats', {titres : JSON.stringify(titres), points_tot : JSON.stringify(points_tot), reponses_correctes : JSON.stringify(reponses_correctes), textes_corrects : JSON.stringify(textes_corrects), id_questions : JSON.stringify(id_questions), id_reponses : JSON.stringify(id_reponses), textes_reponses : JSON.stringify(textes_reponses), totaux : JSON.stringify(totaux)});
      });
      });

    });

    socket.on('resultat_request', function(data) {

        list = [];
        //passsing directoryPath and callback function
        fs.readdir(filepath, function (err, files) {
            //handling error
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            //listing all files using forEach
            files.forEach(function (file) {
                // Do whatever you want to do with the file
                list.push(file);
            });


            socket.emit('resultat_dashboard',{files : JSON.stringify(list)});
        });


    });

    socket.on('quiz_request', function(data) {

        list = [];
        //passsing directoryPath and callback function
        fs.readdir('data/quiz/', function (err, files) {
            //handling error
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            //listing all files using forEach
            files.forEach(function (file) {
                // Do whatever you want to do with the file
                list.push(file);
            });

            socket.emit('quiz_dashboard',{quiz : JSON.stringify(list)});
        });


    });

});

async function register(id, nom, quiz) {
  var fileContent = '{"resultats":[{"id":'+id+',"nom":"'+nom+'","quiz":"'+quiz+'","questions":[],"reponses":[],"points":[]}]}';
  fs.writeFile(filepath+"/"+quiz+"_"+nom+".json", fileContent, (err) => {
      if (err) throw err;
      console.log("Le fichier de résultats a été créé !");
  });
}


async function save(nom,quiz,question,reponse) {
  //if (err)
  //console.log(err);

  fs.access(filepath+"/"+quiz+"_"+nom+".json", fs.F_OK, (err) => {
  if (err) {
    console.error(err)
    console.log("Utilisateur introuvable !");
    return
  }

  var data = fs.readFileSync(filepath+"/"+quiz+"_"+nom+".json");
  var content = JSON.parse(data);

  content.resultats[0].questions.push(question);
  content.resultats[0].reponses.push(reponse);

  fs.writeFile(filepath+"/"+quiz+"_"+nom+".json", JSON.stringify(content), (err) => {
      if (err) throw err;
      console.log('Données sauvegardées !')
  });
})


};

// Gestion de l'upload de fichier
app.use(fileUpload());
app.post('/upload', function(req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;

  mkdirp('./data/uploads/files_'+date, function(err) {

      // path exists unless there was an error

  });
  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv('./data/uploads/files_'+date+'/'+sampleFile.name, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('Le fichier a bien été envoyé ! <a href="index.html">Revenir à l\'accueil</a>');
  });
});
