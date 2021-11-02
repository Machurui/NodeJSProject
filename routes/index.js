const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');
const Game = require('../models/gameSession');
const session = require('express-session');
const methodOverride = require('method-override');
const saltRounds = 10;

// Vérifie si un user est connecté
function verifAuth(req, res, next) {
	const user = req.session?.userId;
	if (!user) {
		next(new Error("Not connected"));
		res.redirect("/");
	}
	next();
};

// Récupère les users
async function getUsers(userID) {
	const users = await User
		.find({ _id: { $ne: userID } });
	return users;
}

// Récupère les parties
async function getGames() {
	const games = await Game
		.find();
	return games;
}

// Choisi un nombre random entre deux int
function between(min, max) {  
	return Math.floor(
	  Math.random() * (max - min + 1) + min
	);
}

// Définir la méthode DELETE
router.use(methodOverride("_method"));

/*
* Route Index
*
*/
router.get('/', function (req, res, next) {
	return res.render('index.ejs', {error:""});
});

/*
* Function register
*
*/
router.post('/', function (req, res, next) {
	let personInfo = req.body;

	// 
	if (!personInfo.email || !personInfo.username || !personInfo.password || !personInfo.passwordConf) {
		res.send();
		return
	} else {
		// SI le password est bien confirmé
		if (personInfo.password == personInfo.passwordConf) {

			User.findOne({ email: personInfo.email }, function (err, data) {
				if (!data) {
					let c;
					User.findOne({}, function (err, data) {

						if (data) {
							c = data.unique_id + 1;
						} else {
							c = 1;
						}
						bcrypt.hash(personInfo.password, saltRounds, function (err, hash) {
							let newPerson = new User({
								email: personInfo.email,
								username: personInfo.username,
								password: hash,
								passwordConf: hash
							});

							newPerson.save(function (err, Person) {
								if (err)
									console.log(err);
								else
									console.log('Success');
							});
						});
					}).sort({ _id: -1 }).limit(1);
					res.render('login.ejs', {error:""});
					return;
				} else {
					res.render('index.ejs', {error:"Erreur"});
					return;
				}
			});
		} else {
			res.render('index.ejs', {error:"Le mot de passe est incorrect"} );
			return
		}
	}
	res.render('login.ejs', {error:""});
});

/*
* Route pour la connexion
*
*/
router.get('/login', function (req, res, next) {
	return res.render('login.ejs', {error:""});
});

/*
* Function login
*
*/
router.post('/login', function (req, res, next) {
	User.findOne({ email: req.body.email }, function (err, data) {
		if (data) {
			bcrypt.compare(req.body.password, data.password, function (err, result) {
				if (result == true) {
					console.log("Done Login", data._id);
					req.session.userId = data._id;
					console.log(req.session.userId);
					res.redirect("/profile");
					return

				} else {
					res.render("login.ejs", {error:"Le mot de passe est incorrect"});
					return;
				}
			});

		} else {
			res.render("login.ejs", {error:"Email est incorrect"});
			return;
		}
	});
});

/*
* Function affichage profil
*
*/
router.get('/profile', verifAuth, async function (req, res, next) {
	let users = await getUsers(req.session.userId);
	let games = await getGames();
	res.render("data.ejs", { users, games, error:"" });
});

/*
* Function déconnexion
*
*/
router.get('/logout', verifAuth, function (req, res, next) {
	console.log("logout")
	if (req.session) {
		// delete session object
		req.session.destroy(function (err) {
			if (err) {
				return next(err);
			} else {
				return res.render("login.ejs", {error:"" });
			}
		});
	}
});

/*
* Route pour mot de passe oublié
*
*/
router.get('/forgetpass', function (req, res, next) {
	res.render("forget.ejs", {error:""});
});

/*
* Function mot de passe oublié
*
*/
router.post('/forgetpass', function (req, res, next) {
	User.findOne({ email: req.body.email }, function (err, data) {
		console.log(data);
		if (!data) {
			res.render("forget.ejs", {error:"Erreur"});
		} else {
			if (req.body.password == req.body.passwordConf) {
				data.password = req.body.password;
				data.passwordConf = req.body.passwordConf;

				data.save(function (err, Person) {
					if (err)
						console.log(err);
					else
						// a faire
						res.render('login.ejs', {error:""});
				});
			} else {
				res.render('forget.ejs', {error:"Le mot de passe ne matche pas"});
				return;
			}
		}
	});

});

/*
* Route pour les parties
*
*/
router.get("/games/:id", verifAuth, async function (req, res) {
	const game = await Game.findOne({ _id: req.params.id });
	res.render("games.ejs", { game: game, userId: req.session.userId, error: "" });
});

/*
* Function création de partie
*
*/
router.post('/games/:id', verifAuth, async function (req, res, next) {

	const owner = await User.findOne({ _id: req.session.userId });

	const enemy = await User.findOne({ _id: req.body.enemyChoice });

	let newGame = new Game({
		nameGame: req.body.nomPartie,
		ownerName: owner.username,
		enemyName: enemy.username,
		state: "en cours",
		ownerID: req.session.userId,
		enemyID: enemy._id,
		ownerJeton: 100,
		enemyJeton: 100,
		ownerMise: 0,
		enemyMise: 0,
		ownerTour: 1,
		enemyTour: 1
	});

	newGame.save(function (err, Person) {
		if (err)
			console.log(err);
		else
			console.log('Success');
		res.redirect("/games/" + newGame._id);
	});
});

/*
* FUNCTION delete une partie
*
*/
router.delete("/games/:id", verifAuth, async function (req, res) {
	// Trouve la partie à supprimer
	const ownerParty = await Game.findOne({ _id: req.params.id });

	// Compare l'ID owner et celui de session
	if (ownerParty.ownerID === req.session.userId) {
		const result = await Game.deleteOne({ _id: req.params.id })
		let users = await getUsers(req.session.userId);
		let games = await getGames();
		res.render("data.ejs", { users, games, error:"Partie Supprimée" });
	} else {
		console.log("Vous n'avez pas les droits sur cette partie.");
		let users = await getUsers(req.session.userId);
		let games = await getGames();
		res.render("data.ejs", { users, games, error:"Vous n'avez pas les droits sur cette partie." });
	}
});

/*
* FUNCTION gère les jetons des parties
*
*/
router.post("/jeton/:id", verifAuth, async function (req, res) {
	const filter = { _id: req.params.id };
	let update;
	let updateJeton;

	const game = await Game.findOne({ _id: req.params.id });

	if (game.ownerID === req.session.userId) {
		// Côté owner
		let soustraction = game.ownerJeton - parseInt(req.body.jeton);

		if (soustraction >= 0) {
			console.log("Nombre de jeton du créateur");
			update = { ownerMise: req.body.jeton, ownerTour: game.ownerTour + 1 };
			res.render("games.ejs", { game: game, userId: req.session.userId, error: "" });
		} else {
			console.log("Le créateur n'a pas assez de jeton");
			res.render("games.ejs", { game: game, userId: req.session.userId, error: "Vous n'avez pas assez de jeton" });
			return;
		}
	} else {
		// Côté ennemi
		let soustraction = game.enemyJeton - req.body.jeton;

		if (soustraction >= 0) {
			console.log("Nombre de jeton de l'adversaire");
			update = { enemyMise: req.body.jeton, enemyTour: game.enemyTour + 1 };
			res.render("games.ejs", { game: game, userId: req.session.userId, error: "" });
		} else {
			console.log("L'adversaire n'a pas assez de jeton");
			res.render("games.ejs", { game: game, userId: req.session.userId, error: "Vous n'avez pas assez de jeton" });
			return;
		}
	}

	// Update la mise en BDD
	let gameSession = await Game.findOneAndUpdate(filter, update);
	
	// Les tours de chaque joueurs sont égaux
	if (game.ownerTour == game.enemyTour) {
		// La mise du créateur est supérieur à celle de l'adversaire SINON l'inverse
		if (game.ownerMise > game.enemyMise) {
			let nombreJeton = game.ownerJeton - game.ownerMise;
			updateJeton = { ownerJeton: nombreJeton };
			let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
		} else {
			let nombreJeton = game.enemyJeton - game.enemyMise;
			updateJeton = { enemyJeton: nombreJeton };
			let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
		}

	} else {
		// Je revérifie la function
		setTimeout(async function () {
			if (game.ownerTour == game.enemyTour) {
				if (game.ownerMise > game.enemyMise) {
					let nombreJeton = game.ownerJeton - game.ownerMise;
					updateJeton = { ownerJeton: nombreJeton };
					let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
				} else {
					let nombreJeton = game.enemyJeton - game.enemyMise;
					updateJeton = { enemyJeton: nombreJeton };
					let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
				}
			} else if (game.ownerTour > game.enemyTour) {
				// RANDOMIZE enemyMise
				let random = between(0,enemyJeton);
				console.log("RANDOMIZE enemyMise: " + random);
				if (game.ownerMise > random) {
					let nombreJeton = game.ownerJeton - game.ownerMise;
					updateJeton = { ownerJeton: nombreJeton, enemyTour: game.enemyTour + 1 };
					let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
				} else {
					let nombreJeton = game.enemyJeton - random;
					updateJeton = { enemyJeton: nombreJeton, enemyTour: game.enemyTour + 1 };
					let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
				}
			} else if (game.ownerTour < game.enemyTour) {
				// RANDOMIZE ownerMise
				let random = between(0,game.ownerJeton);
				console.log("RANDOMIZE ownerMise: " + random);
				if (game.ownerMise > random) {
					let nombreJeton = game.ownerJeton - game.ownerMise;
					updateJeton = { ownerJeton: nombreJeton, ownerTour: game.ownerTour + 1 };
					let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
				} else {
					let nombreJeton = game.enemyJeton - random;
					updateJeton = { enemyJeton: nombreJeton, ownerTour: game.ownerTour + 1 };
					let gameSessionAjout = await Game.findOneAndUpdate(filter, updateJeton);
				}
			}
		}, 5000);

	}
});


module.exports = router;