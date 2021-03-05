const fs = require('fs');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
var multer = require("multer");
var path = require('path');
var schedule = require('node-schedule');
const bcrypt = require('bcrypt');
const saltRounds = 10;

var adminModel = mongoose.model('Admin');
var questionModel = mongoose.model('Question');
var candidateModel = mongoose.model('Candidate');
var counterModel = mongoose.model('counter');
var allocationModel = mongoose.model('Allocation');

/* todo: uncomment this after log in admin for route is working
 * This is commented for now to test for admin request routes while the log in system is still
 * being implemented.
 */
router.use(function(req, res, next) {
  if (req.session.admin === true) {
    next();
  } else {
  	console.log("Error: not authorised to view admin page");
    res.sendStatus(401);	// 401: Unauthorized
  }
});

// Set email handler function
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

/* GET admin listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Get admin's own info
router.get('/info.json', function(req, res, next) {
	// Get current personal info (name and email) of admin with id = req.session.adminid
  adminModel.findOne({_id: req.session.adminid}, 'name email', function(err, admin) {
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

// Get admin's own password
router.get('/password.json', function(req, res, next) {
	// Note: currently the password stored in database isn't hashed
  adminModel.findOne({_id: req.session.adminid}, 'password', function(err, password) {
		if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	if (password === null) {
  		return res.sendStatus(500);
  	}
		console.log(password);
		res.send(password);
  })
});

// Update admin's own password
router.post('/updatePassword', function(req, res, next) {
  adminModel.findOne({"_id": req.session.adminid}, "_id email name password", function(err, output) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }

    if (output === null) {
      console.log("Error: Can't find admin in database");
      return res.sendStatus(500);
    }

    // Check if old password matches with what is in database
    var match = bcrypt.compareSync(req.body.oldPassword, output.password);
    if (match === false) {
    	console.log("Error: Password doesn't match");
      return res.sendStatus(403); // 403: Forbidden
    }

    var hash = bcrypt.hashSync(req.body.newPassword, saltRounds);

    req.body.updateAdminID = output._id;
    req.body.updateAdminEmail = output.email;
    req.body.updateAdminName = output.name;
    req.body.updateAdminPwd = req.body.newPassword;

    adminModel.findOneAndUpdate({"_id": req.session.adminid}, {$set: {"password": hash}}, function (err, result) {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }
      if (result === null) {
        return res.sendStatus(500);
      }

      // Everything is all good, send status 200
      res.send();
    });
  });
});


router.post('/updateCandidates', function(req, res, next) {
	console.log(req.body)
	let isDelete=false;
	if(req.body.isDelete){
	  isDelete=true
	}
	// let hash=bcrypt.hashSync(req.body.password, saltRounds);
	  candidateModel.remove({"_id": req.body.candidate_id}, function(err, output) {
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
// todo: extra, milestone 3
// Update admin's own info
router.post('/info', function(req, res, next) {
	// Update current personal (name, email) info of admin with id = req.session.adminid
  res.send();
});

// Delete current admin
router.post('/deleteAccount', function(req, res, next) {
	// Delete current admin from collection of id = req.session.adminid
	// Do not delete if there is only one admin left in database
	adminModel.find({}, function(err, accounts) {
		if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}

  	// Check if there is only one admin left
  	if (accounts.length == 1) {
  		console.log("Cannot delete the only admin left");
  		return res.sendStatus(403);
  	}
  	// If not the last admin, the account can be deleted
  	else {
  		adminModel.findOneAndDelete({_id: req.session.adminid}, function(err, output) {
		  	if (err) {
		  		console.log(err);
		  		return res.sendStatus(500);
		  	}
		  	if (output === null) {
		  		return res.sendStatus(500);
		  	}
		  	delete req.session.admin;
				delete req.session.adminid;
				res.sendStatus(200);
		  });
  	}
	});
});

// Get list of all admins (not returning password information)
router.get('/admins.json', function(req, res, next) {
	// Get list of all admins (name and email)
  adminModel.find({}, 'name email', function(err, admins) {
  	if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	console.log(admins);
  	res.send(admins);
  });
});

function sendEmailToNewAdmin(req, res, next) {
	console.log("send ")
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

  let message = {
    to: req.body.newAdminName.first + " " + req.body.newAdminName.last 
    + " <" + req.body.newAdminEmail + ">",
    subject: "Hi New Admin",
    text:
      "Hi " + req.body.newAdminName.first + " " + req.body.newAdminName.last + ", \n\n"
      + "Here's the new password for you to log in to your account: " + req.body.newAdminPwd
      + "\n\nYou can change your password after you log in with this password."
      + "\n\nKind regards,\n" + "Maptek Hiring Team",
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
  transporter.close();
  next();
}

// Add a new admin
router.post('/admin', function(req, res, next) {
	// Check if current email already exist
	adminModel.find({email: req.body.email}, function(err, result) {
		if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	if (result.length > 0) {
  		console.log("Email address is already taken. Choose another one.")
  	  return res.sendStatus(406);	// Not acceptable
  	}

  	// Create new random password
		var randomPwd = Math.random().toString(36).slice(-8);
	  var hash = bcrypt.hashSync(randomPwd, saltRounds);

		// Add a new admin in database (include info on first name, last name, email, and password)
		var newAdmin = {
			name: {
				first: req.body.firstname,
				last: req.body.lastname
			},
			email: req.body.email,
			password: hash
		};

		adminModel.create(newAdmin, function(err, output) {
	  	if (err) {
	  		console.log(err);
	  		return res.sendStatus(500);
	  	}
	  	console.log(output);
	  	req.body.newAdminID = output._doc._id;
		  req.body.newAdminEmail = output._doc.email;
		  req.body.newAdminName = output._doc.name;
		  req.body.newAdminPwd = randomPwd;
		  console.log(req.body);
		  next();
	  });
	});
}, setEmailHandler, sendEmailToNewAdmin, function(req, res, next) {
	// Send status 200
	res.send();
});

// Get a list of all candidates
router.get('/candidates.json', function(req, res, next) {
	// Get list of all candidates (all info)
	candidateModel.find({}, '_id name email testCompleted feedback condition.test_end_time isDelete', function(err,candidatesInfo){
		if(err){
			return res.sendStatus(500);
		}
		else {
			res.send(candidatesInfo);
		}
	});
});

// Add a new candidates, recieving a list of candidates
router.post('/newCandidates', function(req, res, next) {
	var newCandidates = [];
	for (var i = 0; i < req.body.candidates.length; i++) {
		var randomPwd = Math.random().toString(36).slice(-8);
		var hash = bcrypt.hashSync(randomPwd, saltRounds);
		var newCandidate = {
			name: {
				first: req.body.candidates[i].firstname,
				last: req.body.candidates[i].lastname
			},
			condition:req.body.candidates[i].condition,
			email: req.body.candidates[i].email,
			real_password: randomPwd,
			password: hash,
			testCompleted: false
		};
		newCandidates.push(newCandidate);
	}

	req.body.newCandidates = newCandidates;
	next();
}, function(req, res, next) {
	candidateModel.insertMany(req.body.newCandidates, function(err, result) {
		if (err) {
			console.log(err.message);
			return res.sendStatus(500);
		}
		// Return back the created candidates
		res.json(result);
	});
});


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
function setReminderEndOfTestEmailMainBody(req, res, next) {
	candidateModel.find({_id: {$in: req.body.candidate_ids}}, 'name email', function(err, candidate) {
		if (err) {
			console.log(err);
			return res.sendStatus(500);
		}

		if (candidate === null) {
			return res.sendStatus(500);
		}

		var candidateList = "";
		for (var i = 0; i < candidate.length; i++) {
			candidateList += "- " + candidate[i].name.first + " " + candidate[i].name.last + " <"
				+ candidate[i].email + ">\n";
		}

		var textBody = "This is just a reminder that the test assigned to the following " 
			+ "canidates have just finished: \n"
			+ candidateList + "\n"
			+ "Their responses can be viewed at the link http://localhost:3000/admin.html"
		req.emailMainText = textBody;
		next();
	});
}

// Set job to send reminder email to admins that a test has finished
function setCronJobReminderEndOfTest(req, res, next) {
	var request_date = new Date(req.input_date)
	schedule.scheduleJob(request_date, function(){
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
			// Default message fields
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
						let message = {
							// Recipients is a string of email encaupsulated by '<>' and comma seperated.
							// E.g. <candidateone@email.com>, <a1667807@student.adelaide.edu.au>
							to: admin[0].name.first + " " + admin[0].name.last + " <" + admin[0].email + ">",
							subject: "Reminder: Maptek HireMeCoder test completed",
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
	});
	next();
}

// Set job to deleted allocated test when it has finish
function setCronJobDeleteAllocationEndOfTest(req, res, next) {
	var request_date = new Date(req.input_date)
	schedule.scheduleJob(request_date, function(){
	  allocationModel.deleteMany({allocated_completion_time: request_date}, function(err, res){
	  	if (err) {
	  		console.log(err);
	  		return res.sendStatus(500);
	  	}

	  })
	});
	next();
}

// Set job to deleted allocated test when it has finish
function deleteCadidateRealPassword(req, res, next) {
	for (var i = 0; i < req.body.candidate_ids.length; i++) {
		candidateModel.findOneAndUpdate({_id: req.body.candidate_ids[i]}, {$unset: {real_password: 1}}, function(err, res) {
			if (err) {
				console.log(err);
				return res.sendStatus(500);
			}
		});
	}
	next();
}


// Send email introduction to candidates assigned for test
function sendIntroEmailToCandidates(req, res, next) {
	// Have to use forEach to be able to access each elemen in candidates_passwords due to async
	req.body.candidates_passwords.forEach(function(candidate_pwd) {
		candidateModel.find({"_id": candidate_pwd.candidate_id}, '_id name email password condition',
		function(err, candidate){
			if(err){
				console.log(err);
				return res.sendStatus(500);
			}

			if (candidate === null) {
				return res.sendStatus(500);
			}

			var transporter = nodemailer.createTransport({
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

			let message = {
				// Recipients is a string of email encaupsulated by '<>' and comma seperated.
				// E.g. <candidateone@email.com>, <a1667807@student.adelaide.edu.au>
				to: candidate[0].name.first + " " + candidate[0].name.last + " <" + candidate[0].email + ">",
				subject: "Maptek HireMeCoder Test",
				text:
					"Hi " + candidate[0].name.first + " " + candidate[0].name.last + ", \n\n" +
					"Your test is now open. Please log in with the following details at the link http://localhost:3000:\n\n" +
					"username: " + candidate[0].email + ",\n"+
					"password: " + candidate_pwd.real_password + "\n\n"+
					"You have till " + req.input_date.toUTCString() + " to complete the test.\n\n" +
					"Kind regards,\n" + "Maptek Hiring Team",
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
			transporter.close();
		});
	});
	next();
}

// Assign test and test conditions for list of candidates, and send email to them
router.post('/assignTestForCandidates', function(req, res, next) {
	/* Given list of candidate ids in req.body, update all their test questions and test conditions
	 * Must first check that candidate's current test_start_time is > current time
	 * or test_start_time = null
	 */
	var current_time = new Date();
	var input_date = new Date(req.body.test_end_time);

	// Cannot send an email if the end time of test is before the current time or is empty
	if ((input_date.getTime() < current_time.getTime())|| req.body.test_end_time == null) {
		console.log("Error: empty or invalid date chosen when assigning test to candidates");
		return res.sendStatus(406);		// 406: not acceptable
	}

	// Test must include at least one question and at least one candidate
	if (req.body.question_ids.length == 0 || req.body.candidate_ids.length == 0) {
		console.log("Error: Need to assign at least one question and one candidate");
		return res.sendStatus(412);		// 412: pre condition failed
	}

	var test = [];
	for (var i = 0; i < req.body.question_ids.length; i++) {
		question = {
			"question_id": parseInt(req.body.question_ids[i])
		};
		test.push(question);
	}

	var allocated_candidates = [];
	for (var i = 0; i < req.body.candidate_ids.length; i++) {
		question = {
			"candidate_id": req.body.candidate_ids[i],
			status:false
		};
		allocated_candidates.push(question);
	}
	
	req.input_date = input_date;
	req.current_time = current_time;
	req.body.test = test;
	let testId=(new Date()).getTime()
	req.body.test.forEach(item=>{
		item.test_id=testId;
		item.submited=false,
		item.feedback=''
	})

	req.body.allocated_candidates = allocated_candidates;
	next();
}, function(req,res,next) {
	// Save this allocation
	var newAllocation = {
		candidates: req.body.allocated_candidates,
		questions: req.body.test,
		allocated_completion_time: req.input_date
	}

	allocationModel.create(newAllocation, function(err, result) {
		if (err) {
			console.log(err);
			console.log("allocation fail");
			return res.sendStatus(500);
		}
		console.log(req)
		next();
	})
}, function(req, res, next) {
	console.log("req:",req.body)
	// Set test time conditions and test for all candidates (overwrite pre-existing test condition)
	candidateModel.updateMany({_id: {$in: req.body.candidate_ids}},
	{$set: {condition: {test_start_time: req.current_time, test_end_time : req.input_date}},$push:{test:req.body.test}},
	function(err, candidates) {
		
		if (err) {
			console.log(err);
			console.log("fail allocating test time");
			return res.sendStatus(500);
		}
		if (candidates == null) {
			return res.sendStatus(500);
		}
	});
	next();
}, function(req, res, next) {
	// This variable will be used later to send email to candidate with real_password. Store here
	// because real_password will be lost when trying to access it later due to async
	candidates_passwords = []
	candidateModel.find({"_id" : {$in: req.body.candidate_ids}}, "real_password", function(err, output) {
		if (err) {
			console.log(err);
			return res.sendStatus(500);
		}
		for (var i = 0; i < output.length; i++) {
			item = {
				"real_password": output[i].real_password,
				"candidate_id": output[i]._id
			};
			candidates_passwords.push(item);
		}
		req.body.candidates_passwords = candidates_passwords;
		console.log(req.body.candidates_passwords);
		next();
	})
}, setEmailHandler, sendIntroEmailToCandidates, getAllAdminRecipients,
setReminderEndOfTestEmailMainBody, setCronJobReminderEndOfTest, setCronJobDeleteAllocationEndOfTest,
function(req, res, next) {
  res.sendStatus(200);
});

// todo: extra, milestone3
// Update candidate personal info
router.post('/updateCandidateInfo', function(req, res, next) {
	// Update candidate's (of id = req.body.candidateid) personal information (name, email, password)
  res.send();
});

// todo: extra, milestone3
// Delete list of candidates
router.post('/deleteCandidates', function(req, res, next) {
	// Given a list of candidate ids in req.body, delete from collection
  res.send();
});


// View list of questions (returning only id and title)
router.get('/questions.json', function(req, res, next) {
	// Return list of all questions
	questionModel.find({}, 'question_id title body', function(err, questionList){
		if(err){
			return res.sendStatus(500);
		}
		else {
			res.send(questionList);
		}
	});
});

// todo: milestone2
// View a question
router.get('/question.json', function(req, res, next) {
	// Return question of question_id = req.body.questionid
	questionModel.find({"question_id": req.body.question_id}, function(err, question) {
		if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	if (question == null) {
			console.log('Cannot find question');
			return res.sendStatus(403);
		} else {
			console.log(question);
			res.status(200);
			res.send(question);
		}
	})
});

var upload = multer({ dest: './public/images/'});
router.post('/addQuestion', function (req, res, next) {
	/* We want to save image with file name "q" + questionID
	 * So we first have to get current ID. We can get it after creating the new question.
	 * However, with form multipart/form-data used for uploading images, qw can't extract req.body
	 * without downloading some other module to deal with different types of data. 
	 *
	 * We get around this by getting the current question id counter and increment it by one to
	 * reflect the new questionID.
	 *
	 * For some reason the other form attributes can be extracted after the first function, which
	 * is used to create the document to upload into the Question collection in the database.
	 */
	counterModel.findOne({_id: "question_id"}, function(err, questionID) {
		if (err) {
			console.log(err);
			return res.sendStatus(500);
		}
		req.newQuestionID = parseInt(questionID.seq) + 1;
		next();
	});
}, upload.single('file'), function(req, res, next) {
	if (!req.file) {
		// If there's no file, go on to just uploading the question
		next();
	} else {
		var fileExt = path.extname(req.file.originalname).toLowerCase();
	  var tempPath = req.file.path;
		var targetPath = __dirname + '/../public/images/q' + req.newQuestionID + fileExt;

		if (fileExt === '.jpeg' || fileExt === '.jpg' || fileExt === '.png' || fileExt === '.pdf' || fileExt === '.txt') {
			fs.rename(tempPath, targetPath, err => {
				if (err) {
					console.log("Error: there was some problem in saving image");
					return res.sendStatus(500);
				};

		 		console.log("Uploaded file successfully");
		 		req.body.imagePath = "images/q" + req.newQuestionID + fileExt;
		 		next();
		  });
		} else {
			fs.unlink(tempPath, err => {
				if (err) {
					console.log("Error: uploaded file is not JPEG, JPG, PNG, or PDF");
					return res.sendStatus(406); // Not acceptable
				}
			});
		}
	}
}, function(req, res, next) {
	var newQuestion = {
		title: req.body.title,
		body: req.body.body,
		image: req.body.imagePath
	};
  questionModel.create(newQuestion, function(err, result) {
  	if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}
  	res.sendStatus(200);
  });
});

// todo: extra, milestone3
// Delete a question
router.post('/deleteQuestion', function(req, res, next) {
	// Delete a question of id = req.body.questionid
  res.send();
});

// todo: extra, milestone 3
// Update a question
router.post('/updateQuestion', function(req, res, next) {
	// Update a question (title, body, image) of id = req.body.questionid
  res.send();
});

// View if a candidate has completed their test or not
router.get('/testCompletedStatus.json', function(req, res, next) {

	candidateModel.findOne({_id: req.body.candidate_id}, 'testCompleted', function(err, candidate) {
		if (err) {
			console.log(err);
			return res.sendStatus(500);
		}
		if (candidate === null) {
			return res.sendStatus(500);
		}
			res.status(200);
			res.send(candidate.testCompleted);		
	});
});
// todo: extra, milestone3
// View question completed status of all candidates
router.get('/questionStatus.json', function(req, res, next) {
	/* Given a questions's id in req.body.questionid,
	 * return list of candidates (with name, email, and testCompleted)
	 * when checking testCompleted, if test_end_time < current date, then set testCompleted=true
	 *
	 * Filtering of candidates who have completed or not completed questions can be done on front end
	 */
  res.send();
});

// View list of responses (including feedback) given a candidate'a id
router.get('/responses.json', function(req, res, next) {
	// Check if candidate has completed the test (testCompleted = true).
	// Admin should only be able to view responses for completed tests
	candidateModel.findOne({"_id": req.query.cid}, 'name condition.test_end_time testCompleted lastSubmittedTime lastSavedTime test feedback', function(err,docs){
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
		// 	return res.sendStatus(403);	//403: Forbidden
		// }

		res.send(docs);
	});
});


// todo: Should we delete this one?
// todo: required feature, milestone2/3
// View a response and feedback given candidates' ids and questions' ids (in req.query)
router.get('/response.json', function(req, res, next) {
	/* Given candidate's id and question's id, return candidate's response and current feedback
	 * Make sure that either candidate's test_end_time < current date (if this, set testCompleted=true)
	 * or testCompleted field is true.
	 *
	 * If testCompleted=false, return empty response. If candidate is not assigned that question,
	 * return 404 and throw error message that candidate was not assigned question
	 */

	 
  res.send();
});

// View feedback given candidate's id
router.get('/feedback.json', function(req, res, next) {
	console.log("in feedback : " + req.query.cid);
	// Given candidate's id in req.query.candidate_id
	candidateModel.findOne({"_id": req.query.cid}, function(err, output) {
		if (err) {
			console.log(err);
			return res.sendStatus(500);
		}
		if (output == null) {
			console.log("no one");
			return res.sendStatus(500);
		}
		else{
			console.log(output.feedback);
			res.status(200);
			res.send(output.feedback);
		}
	});
});

// Add/update feedback given candidate's ids and question's id
router.post('/feedback', function(req, res, next) {
// Given candidate's id, update/overwrite current feedback with req.body.feedback
	candidateModel.findOneAndUpdate({"_id": req.body.candidate_id}, {$set: {feedback: req.body.feedback,test:req.body.questions}}, function(err, output) {
		console.log(output)
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
  program.language = req.body.response.type;
  program.script = req.body.response.body;

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








module.exports = router;
