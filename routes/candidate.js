const fs = require('fs');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const saltRounds = 10;
var candidateModel = mongoose.model('Candidate');
var adminModel = mongoose.model('Admin');
var questionModel = mongoose.model('Question');



function setEmailHandler(req, res, next) {
  // Set website email handler
  // Reading google api authentication variables needed to send email
  auth_var = {};
  fs.readFile('routes/googleapi/credentials.json', (err, content) => {
    if (err) {
      console.log('Error loading client secret file:', err);
      return res.sendStatus(500);
    };
    content_JSON = JSON.parse(content);
    auth_var.client_secret = content_JSON.installed.client_secret;
    auth_var.client_id = content_JSON.installed.client_id;

    fs.readFile('routes/googleapi/token.json', (err, token) => {
      if (err) {
        console.log('Error loading token file:', err);
        return res.sendStatus(500);
      };
      token_JSON = JSON.parse(token);
      auth_var.access_token = token_JSON.access_token;
      auth_var.refresh_token = token_JSON.refresh_token;
      auth_var.expiry_date = token_JSON.expiry_date;

      req.auth_var = auth_var;
      next();
    });
  });
}

router.use(function(req, res, next) {
  console.log(req.session)
  if (req.session.candidate === true && req.session.candidateid != undefined) {
    next();
  } else {
  	console.log("Not logged in");
    res.sendStatus(401);	// 401: Unauthorised
  }
});

// Candidate can only use the following routes if they have not yet completed the test
router.use(function(req, res, next) {
  candidateModel.findOne({_id: req.session.candidateid}, 'testCompleted', function(err, status){
  	if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	if (status.testCompleted === false) {
  		console.log("Test not completed");
  		next();
  	} else {
  		// console.log("Test completed");
      // delete req.session.candidate;
      // delete req.session.candidateid;
      // return res.sendStatus(401);	// 401: Unauthorised
      next()
  	}
  })
});

router.use(function(req, res, next) {
  candidateModel.findOne({_id: req.session.candidateid}, 'condition.test_end_time', function(err, status){
  	if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	var current_date = new Date();
  	var test_end_time = new Date(status._doc.condition.test_end_time);
  	if (current_date < test_end_time) {
  		console.log("Request date (" + current_date.toUTCString() + ") less than allocated completion date (" + test_end_time.toUTCString() + ")");
  		next();
  	} else {
  		// console.log("Request date (" + current_date.toUTCString() + ") greater or equal to allocated completion date (" + test_end_time.toUTCString() + ")");
  		// delete req.session.candidate;
      // delete req.session.candidateid;
      // return res.sendStatus(401);	// 401: Unauthorised
      next()
  	}
  })
});

function getCandidateQuestions(req, res, next) {
  // Saving all question ids assigned to candidates in req.question_ids
  questions = [];
  candidateModel.find({_id: req.session.candidateid}, 'test', function(err, result){
    if(err){
      console.log(err);
      return res.sendStatus(500);
    }

    if (result == null) {
      console.log("No questions assigned");
      return res.sendStatus(200);
    }

    var test = result[0].test;
    for (i = 0; i < test.length; i++) {
        questions.push(test[i].question_id);
    }

    req.question_ids = questions;
    next();
  })
}

/* GET candidate listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

//修改账户信息
router.post('/updateCandidates', function(req, res, next) {
  console.log(req.body)
  let isDelete=false;
  if(req.body.isDelete){
    isDelete=true
  }
  let hash=bcrypt.hashSync(req.body.password, saltRounds);
	candidateModel.findOneAndUpdate({"_id": req.body.candidate_id}, {$set: {name: req.body.name,email:req.body.email,password:hash,isDelete:isDelete}}, function(err, output) {
		console.log('output:'+output)
		if (err) {
			console.log(err);
			return res.sendStatus(500);
		}
		if (output === null) {
			return res.sendStatus(500);
		} else {
			res.send();
		}
	});
});


// Get admin's own info
router.get('/info.json', function(req, res, next) {
	// Get current personal info (name and email) of admin with id = req.session.adminid
  candidateModel.findOne({_id: req.session.candidateid}, 'name email _id', function(err, admin) {
		if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	if (admin === null) {
  		return res.sendStatus(500);
  	}
		res.send(admin);
  });
});

// Return a list of questions that is assigned to the candidate
router.get('/test.json', getCandidateQuestions, function(req, res, next) {
  // Get test questions of candidate with id of req.session.candidateid
  questionModel.find({"question_id" : {$in: req.question_ids}}, function(err, test) {
  	if (err) {
			console.log(err);
			return res.sendStatus(500);
		}

  	res.send(test);
  })
});


router.get('/responses.json', function(req, res, next) {
  // Check if candidate has completed the test (testCompleted = true).
  // Admin should only be able to view responses for completed tests
  candidateModel.findOne({_id: req.session.candidateid}, 'name test email', function(err,docs){
    if(err){
      console.log(err);
      return res.sendStatus(500);
    }

    // If database does not contain candidate with req.body.candidate_id
    if (docs === null) {
      console.log("empty");
      return res.sendStatus(403);
    }
    
    // var test_end_time = new Date(docs.condition.test_end_time);
    // var current_time = new Date();
    // // If candidate hasn't submitted test within the given time frame yet
    // if ((current_time < test_end_time) && (docs.testCompleted == false)) {
    //  return res.sendStatus(403); //403: Forbidden
    // }

    res.send(docs);
  });
});

function updateTest(req, res, next) {
  /* Input: JSON object "response_arr" which is an array consisting of question ids and
   * JSON objects (type, body), Output: status(200)
   * Create new test JSON object and fill in with request data in format:
   * test: [{question_id, response:{type, body}}, …]
   * Look up test and overwrite it in database
   */
   var arr_length = req.body.response_arr.length;

   var requestTime = new Date();
   req.requestTime = requestTime;
   console.log("requested time" + req.requestTime);

   // checking if input data consists of required fields
   for(var i =0; i < arr_length; i++){
    if (req.body.response_arr[i].question_id == undefined || req.body.response_arr[i].response==undefined){
      return res.sendStatus(500);
    }
    if(req.body.response_arr[i].response.type == undefined || req.body.response_arr[i].response.body == undefined){
      return res.sendStatus(500);
    }
   }

   //push question entries to test array
   var test = [];
   for(var i = 0; i < arr_length; i++){
    // var question = {
    // "question_id" : req.body.response_arr[i].question_id,
    // "response" : {"type" : req.body.response_arr[i].response.type, "body" : req.body.response_arr[i].response.body}
    // }
    let question=req.body.response_arr[i]
    test.push(question);
  }

  candidateModel.findOneAndUpdate({"_id": req.session.candidateid}, {$set: {"test": test, "lastSavedTime": req.requestTime}}, function(err, output) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }

    if (output === null) {
      return res.sendStatus(500);
    } 
    next();
  });
};

router.post('/Test', function(req, res, next) {
  console.log("testing");
  var request = require('request');
  var program = {
      script : "",
      language: "",
      versionIndex: "0",
      clientId: "52947e3baf8a6379f1d9aa92eb3aee62",
      clientSecret:"3c67629b1920f24dda5c94853b583d78e3954a18c5a393ca4d33c01a7d0374fc"
  };
  program.language = req.body.response_arr.response.type;
  program.script = req.body.response_arr.response.body;

  request({
      url: 'https://api.jdoodle.com/v1/execute',
      method: "POST",
      json: program
  },
  function (error, response, body) {
      console.log('error:', error);
      console.log('statusCode:', response && response.statusCode);
      console.log('body:', body);
      var b = body;
      res.send(b);
  });


}
);

// Updates candidate's responses to a test
router.post('/saveTest', updateTest, function(req, res, next) {
	res.send();
}
);




// Gets all the admins as email recipients
function getAllAdminRecipients(req, res, next) {
  adminModel.find({}, '_id', function(err, admins) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }

    var admin_ids = [];
    for (var i = 0; i < admins.length; i++) {
      admin_ids.push(admins[i]._id);
    }
    req.admin_ids = admin_ids;
    next();
  });
}

// Set the email main text body to send to admin as a reminder of the end of a test
function setCandidateCompleteTestEmail(req, res, next) {
  candidateModel.findOne({_id: {$in: req.session.candidateid}}, 'name email', function(err, candidate) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }

    if (candidate === null) {
      return res.sendStatus(500);
    }

    var textBody = "This is to notify you that " + candidate.name.first + " " + candidate.name.last
      + " <" + candidate.email + "> has finished Test <test name>.\n\n" 
      + "Their responses can be viewed at the link http://localhost:3000/admin.html"
    req.emailMainText = textBody;
    next();
  });
}


// Send a notification email to admins that candidate has completed test
function sendCompletionNotificationEmail(req, res, next) {
  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      type: 'oauth2',
      user: 'randomoraqs@gmail.com',
      clientId: req.auth_var.client_id,
      clientSecret: req.auth_var.client_secret,
      accessToken: req.auth_var.access_token,
      refreshToken: req.auth_var.refresh_token,
      expires: req.auth_var.expiry_date
    },
    debug: true // include SMTP traffic in the logs
  }, {
    // Sender info - using gmail oauth, must be from a valid gmail account
    from: 'Maptek no-reply <randomoraqs@gmail.com>'
  });

  for (var i = 0; i < req.admin_ids.length; i++) {
    adminModel.find({"_id": req.admin_ids[i]}, '_id name email', function(err, admin){
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }
      if (admin === null) {
        return res.sendStatus(500);
      }
      else {
        // todo: update with test name after implementing test in db
        let message = {
          // Recipients is a string of email encaupsulated by '<>' and comma seperated.
          // E.g. <candidateone@email.com>, <a1667807@student.adelaide.edu.au>
          to: admin[0].name.first + " " + admin[0].name.last + " <" + admin[0].email + ">",
          subject: "Reminder: Maptek HireMeCoder Test <test name> completed",
          text:
            "Hi " + admin[0].name.first + " " + admin[0].name.last + ", \n\n"
            + req.emailMainText + "\n\nKind regards,\n" + "Maptek Hiring Team",
        }

        console.log('Sending Mail');
        transporter.sendMail(message, (err, info) => {
          if (err) {
            console.log('Error occured');
            console.log(err.message);
            return;
          }

          console.log('Message sent successfully!');
          console.log('Server responded with "%s"', info.response);
        });
      }
    });
  }
  transporter.close();
  next();
}



// Ends candidate session. This is called when candidate chooses to complete their session.
router.post('/submitTest', updateTest, function(req,res, next) {	
  console.log("Submitting test");
	candidateModel.findOneAndUpdate({"_id": req.session.candidateid}, {$set: {"lastSubmittedTime": req.requestTime, "testCompleted": false}}, function(err, output) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }

    if (output === null) {
      return res.sendStatus(500);
    }
    next();
  });
}, getAllAdminRecipients, setCandidateCompleteTestEmail, setEmailHandler,
sendCompletionNotificationEmail, function(req, res, next) {
  // Log candidates out 
  // delete req.session.candidate;
  // delete req.session.candidateid; 
  res.send().redirect('/index.html');
});




// View response of a given candidate id
router.get('/responses.json', getCandidateQuestions, function(req, res, next) {
	candidateModel.findOne({_id: req.session.candidateid}, 'test', function(err, docs){
		if(err){
			console.log(err);
			return res.sendStatus(500);
		}

		// If database does not contain candidate with req.body.candidate_id
		if (docs === null) {
			return res.sendStatus(500);
		}
    res.send(docs);
	});
});

module.exports = router;
