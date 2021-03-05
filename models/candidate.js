var mongoose = require('mongoose');

var candidateSchema = new mongoose.Schema({
	// _id: mongoose.Schema.Types.ObjectId,
	name: { first: { type: String, required: true }, last: { type: String, required: true } },
	email: String,
	real_password: String,
	password: String,
	// test_id: {type: Number, ref: 'Test'},
	test: [{ question_id: {type: Number, ref: 'Question'}, response: { type: {type: String}, body: {type: String} },feedback:{type:String},submited:{type:Boolean},test_id:{type:Number} }],
	feedback: String,
	condition: { test_start_time: Date, test_end_time: Date },
	isDelete:false,
	testCompleted: { type: Boolean, default: false },
	lastSubmittedTime : {type: Date},
	lastSavedTime : {type: Date}
}, { collection: 'candidate'} );

candidateSchema.virtual('fullName').get(function() {
	return this.name.first + ' ' + this.name.last;
});

mongoose.model('Candidate', candidateSchema);