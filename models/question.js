var mongoose = require('mongoose');

var counterSchema = new mongoose.Schema({
	_id: { "type": String, "required": true },
    seq: { "type": Number, "default": 1 }
}, { collection: 'counter' });

var counter = mongoose.model('counter', counterSchema);

var questionSchema = new mongoose.Schema({
	question_id: { type: Number},
	title: { type: String, required: true },
	body: { type: String, required: true },
	image: String,
}, { collection: 'question' });

// Drop question and counter collection in local mongo first, then unique index will start working
questionSchema.index({question_id: 1}, { unique: true });

questionSchema.pre('save', function (next) {
    if (!this.isNew) {
	    next();
	    return;
	}
    var doc = this;
    counter.findByIdAndUpdate(
        { "_id": "question_id" },
        { "$inc": { "seq": 1 } },
        { upsert: true , new: true }, 
    function(err, counter)   {
        if(err) return next(err);
        doc.question_id = counter.seq;
        next();
    });
});

mongoose.model('Question', questionSchema);