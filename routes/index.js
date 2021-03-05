const fs = require('fs');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const saltRounds = 10;



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

/* todo: remove models not required in index.js
 * All models are included here to show examples of how to retrieve these
 * collections from the database
 */
var adminModel = mongoose.model('Admin');
var candidateModel = mongoose.model('Candidate');
var questionModel = mongoose.model('Question');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});



/* query admin collection for matching email and password
 * if found, set req.session.admin=true and req.session.adminid=_id from docs returned from query
 * else, send status 403
 */
router.post('/adminLogin', function(req, res, next) {
	if (req.session.admin != undefined || req.session.candidate != undefined) {
  	console.log('A user is currently logged in. Please log out of that account first.');
    return res.status(403).redirect('/admin_login.html');
  }

  var email = req.body.email;
  var password = req.body.password;
  
  adminModel.findOne({"email": email}, 'password', function(err, output) {
  	if (err) {
  		console.log(err);
  		return res.sendStatus(500);
  	}

    if (output === null) {
      console.log("Email not found.");
      return res.status(403).redirect('/admin_login.html');
    }

    bcrypt.compare(password, output.password, function(err, result) {
        // result == true
        if (result == false) {
          console.log('Unsuccessful log in attempt.');
          return res.status(403).redirect('/admin_login.html');
        }
        else {
          console.log('Admin successfully logged in.');
          req.session.admin = true;
          console.log('req.session.admin: ', req.session.admin)
          req.session.adminid = output._id;
          console.log('req.session.adminid: ', req.session.adminid)
          res.status(200).redirect("/admin.html");
        }
    });
  });
});

/* query candidate collection for matching email and password
 * candidate's testCompleted status must also be false, and also within the given time frame
 * if found, set req.session.candidate=true and req.session.candidateid=_id from docs returned
 * from query. Else, send status 403
 * 
 * Note: there could be multiple candidates with same email
 */
router.post('/candidateLogin', function(req, res, next) {
	if (req.session.admin != undefined || req.session.candidate != undefined) {
  	console.log('A user is currently logged in. Please log out of that account first.');
    return res.status(403).redirect('/index.html');
  }
  var currentTime = new Date();
  candidateModel.find({"email": req.body.email,  "testCompleted": false}, "password",
    function(err, output) {
      console.log("这里",output)
  		if (err) {
	  		console.log(err);
	  		return res.sendStatus(500);
	  	}
  		if (output == null) {
  			console.log('Candidate not found.');
  			return res.status(403).redirect('/index.html');
  		}

      for (var i = 0; i < output.length; i++) {
        if (bcrypt.compareSync(req.body.password, output[i].password) == true) {
            console.log('Candidate successfully logged in.');
            req.session.candidate = true;
            req.session.candidateid = output[i]._id
            res.status(200).redirect("/candidate.html");
        }
      }
      next();
    });
}, function (req, res, next) {
  if (req.session.candidate != true) {
    console.log('Unsuccessful log in attempt.');
    res.status(403).redirect('/index.html');
  }
});

// Log out
router.post('/logout', function(req, res, next) {
  // If valid session present for admin, unset user.
  if (req.session.admin != undefined) {
  	delete req.session.admin;
    delete req.session.adminid;
  }

  if (req.session.candidate != undefined) {
  	delete req.session.candidate;
    delete req.session.candidateid;
  }

  res.sendStatus(200);
});

// Send a notification email to admins that candidate has completed test
function sendForgotPasswordEmail(req, res, next) {
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
    to: req.body.forgotAdminName.first + " " + req.body.forgotAdminName.last 
    + " <" + req.body.forgotAdminEmail + ">",
    subject: "Fogot Password",
    text:
      "Hi " + req.body.forgotAdminName.first + " " + req.body.forgotAdminName.last + ", \n\n"
      + "Here's the new password for you to log in to your account: " + req.body.forgotAdminPwd
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

router.post('/forgotPassword', function(req, res, next) {
  adminModel.findOne({"email": req.body.email, "name.first": req.body.firstname,
  "name.last": req.body.lastname}, "_id email name", function(err, output) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }
    console.log(output);

    if (output === null) {
      console.log("Can't match fields");
      return res.sendStatus(401); // 401: Unauthorised
    }

    var randomPwd = Math.random().toString(36).slice(-8);
    var hash = bcrypt.hashSync(randomPwd, saltRounds);

    req.body.forgotAdminID = output._id;
    req.body.forgotAdminEmail = output.email;
    req.body.forgotAdminName = output.name;
    req.body.forgotAdminPwd = randomPwd;

    adminModel.findOneAndUpdate({"_id": output._id}, {$set: {"password": hash}}, function (err, result) {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      }
      if (result === null) {
        return res.sendStatus(500);
      }
      next();
    });
  });
}, setEmailHandler, sendForgotPasswordEmail, function(req, res, next) {
  res.send();
})



module.exports = router;