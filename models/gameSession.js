const mongoose = require('mongoose');
const Schema = mongoose.Schema;

gameSessionSchema = new Schema( {
	nameGame: String,
	ownerName: String,
	enemyName: String,
	state: String,
	ownerID: String,
	enemyID: String, 
	ownerJeton: Number,
	enemyJeton: Number,
	ownerMise: Number,
	enemyMise: Number,
	ownerTour : Number,
	enemyTour: Number
}),
Game = mongoose.model('Game', gameSessionSchema);

module.exports = Game;