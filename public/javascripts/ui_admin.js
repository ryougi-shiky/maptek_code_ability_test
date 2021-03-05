/*jshint esversion: 6 */
//This vue instance is used by the admin's user interface header section.
Vue.config.debug = true;
Vue.config.devtools = true;
//Vue.component('vue-multiselect', window.VueMultiselect.default);
function updateFunction(el, binding) {
  //get options from binding value.
  //v-select="THIS-IS-THE-BINDING-VALUE"
  let options = binding.value || {};

  //set up select2
  $(el).select2(options).on("select2:select", (e) => {
    //v-model looks for
    //- an event named "change"
    //- a value with property path "$event.target.value"
    el.dispatchEvent(new Event('change', {
      target: e.target
    }));
  });
}

Vue.directive('select', {
  inserted: updateFunction,
  componentUpdated: updateFunction,
});

function formatFunction(state) {
  var $state = $(
    '<span style="color: red">' + state.text + '</span>'
  );
  return $state;
}

//Multiselect JQuery Function
$(document).ready(function() {
  $('.js-example-basic-multiple').select2({
    placeholder: '  Select Questions',
    closeOnSelect: false
  });
});

var appVue = new Vue({
  el: "#app",
  data: {
    radio: '1',
    radios:[
      {
        label: 'show picture',
        value:'1',
        isChecked: true,
      },
      {
        label: 'show link',
        value:'2',
        isChecked: false,
      },
    ],
    //name to display on top right corner
    displayName: "",

    //The following variables are used to get the account details for the new admin account.
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    seen: true,

    //The following variables are for the Change Password function
    oldPassword: "",
    newPassword: "",
    changePasswordSuccess: false,
    changePasswordErrors: [],
    toggle: true,
    // Variables for adding new question to the database
    image: '',
    uploadQuestionFormData: '',
    tempUploadQuestionFormData: '',
    title:"",
    body:"",
    uploadQuestionSuccess: false,
    uploadQuestionErrors: [],
    checked: true,

    // Variables for adding admin pop up
    createAdminSuccess: false,
    createAdminErrors: [],

    // Variables for the uploading test
    
    assignTestErrors: [],

    //Variables for candidate details (will have fields id, firstname, lastname, and email)
    savedCandidates: [],
    candidates: [{
      firstname: "",
      lastname: "",
      email: ""
    }],

    
    allCandidates: [{
      
    }],

    assign_tests:[{
      chosenQuestions: [],
      chosenCandidates: [],
      testEndDate: "",
    }],
    //variables for the questions
    allDetails:[],
    Question_details:[{
      id:"",
      title:"",
      body:"",
      image:""
    }],
    Qustions1: [],


    test:{
      chosenQuestions: [],
      chosenCandidates: [],
      testEndDate: "",
    },
    allQuestions: {
    },
  },
  mounted: function() {
    this.fillAdminPage();
    this.getQuestions();
    this.getCandidates();
    this.getQuestion_details();
    this.show_questions();
  },
  methods: {
    check(index) {
      //Cancel all selected items first
      this.radios.forEach((item) => {
        item.isChecked = false;
      });
      //Set the current selected item
      this.radio = this.radios[index].value;
      //Sets the value for passing
      this.radios[index].isChecked = true;
      console.log(this.radio);
    },
    //This method is used to send the AJAX request to add the new admin account details to the database.
    createAdmin: function(event) {
		  //Disable default form submission
		  event.preventDefault();

      //Reset create admin errors
      appVue.createAdminErrors = [];

      //Create new AJAX request
      var xhttp = new XMLHttpRequest();
      //Define behaviour for a response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          appVue.createAdminSuccess = true;
        } else if (this.readyState == 4 && this.status == 406) {
          appVue.createAdminSuccess = false;
          appVue.createAdminErrors.push("Email is already taken. Please choose another email.");
        } else if (this.readyState == 4 && this.status == 401) {
          appVue.createAdminSuccess = false;
          appVue.createAdminErrors.push("You're currently not logged in as admin. Please log in.");
        }else if (this.readyState == 4 && this.status != 200 && this.status != 406 && this.status != 401) {
          appVue.createAdminSuccess = false;
          appVue.createAdminErrors.push("There's an error creating an admin. Please try again.");
          console.log("Error: could not create an admin.");
        }
      };
      //Initiate connection
      xhttp.open("POST", "admin/admin", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json");
      //Send request
      //'this' keyword points to variables in the data section above.
      xhttp.send(JSON.stringify({
        firstname: this.firstname,
        lastname: this.lastname,
        email: this.email,
        password: this.password
      }));
    },
    changePassword: function(event) {
      //Disable default form submission
      event.preventDefault();

      //Reset create admin errors
      appVue.changePasswordErrors = [];

      //Create new AJAX request
      var xhttp = new XMLHttpRequest();
      //Define behaviour for a response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          appVue.changePasswordSuccess = true;
        } else if (this.readyState == 4 && (this.status == 500 || this.status == 403)) {
          appVue.changePasswordSuccess = false;
          appVue.changePasswordErrors.push("Cannot find admin in database / password incorrect.");
        } else if (this.readyState == 4 && this.status == 401) {
          appVue.changePasswordSuccess = false;
          appVue.changePasswordErrors.push("You're currently not logged in as admin. Please log in.");
        }else if (this.readyState == 4 && this.status != 200 && this.status != 403 && this.status != 401 ) {
          appVue.changePasswordSuccess = false;
          appVue.changePasswordErrors.push("There's an error changing your password. Please try again.");
          console.log("Error: could not create an admin.");
        }
      };
      //Initiate connection
      xhttp.open("POST", "admin/updatePassword", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json");
      //Send request
      //'this' keyword points to variables in the data section above.
      xhttp.send(JSON.stringify({
        oldPassword: this.oldPassword,
        newPassword: this.newPassword
      }));
    },

    addNewCandidateForm() {
      this.candidates.push({
        firstname: "",
        lastname: "",
        email: ""
      })
    },

    deleteCandidateForm(index) {
      this.candidates.splice(index, 1)
    },

    //This function sends the current inputs for candidate details to the server and clears the candidates array.
    save_candidates: function(event) {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();
      var numCandAdded = this.candidates.length;
      //Define behaviour for a response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //do stuff if successful
          //empty the candidates array
          ptrToData.candidates.splice(0, numCandAdded);
          var res = JSON.parse(xhttp.response);
          for (var i = 0; i < res.length; i++) {
            var candidate = {
              id: res[i]._id,
              firstname: res[i].name.first,
              lastname: res[i].name.last,
              email: res[i].email
            }
            ptrToData.savedCandidates.push(candidate);
          }
          //get the list of saved candidates
          //getCandidates();
        } else if (this.readyState == 4 && this.status == 500) {
          alert("Error: candidates could not be added");
        }
      };
      //Initiate connection
      xhttp.open("POST", "admin/newCandidates", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json");
      //Send request
      //'this' keyword points to variables in the data section above.
      xhttp.send(JSON.stringify({candidates: this.candidates}));
    },

    //todo: check if still need this
    getCandidates() {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //save the responses to the saved candidates array
          var res = JSON.parse(xhttp.response);
          Candidates_arr = []
          for (var i = 0; i < res.length; i++) {
            var sigle_candidate = {
              id: res[i]._id,
              text: res[i].name.first + " " + res[i].name.last,
            }
            Candidates_arr.push(sigle_candidate);
          }
          appVue.allCandidates = {data: Candidates_arr};
        }
      };
      //Open connection
      xhttp.open("GET", "admin/candidates.json", true);
      //Send request
      xhttp.send();
    },

    fillAdminPage: function(event) {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //display the name of user
          var res = JSON.parse(xhttp.response);
          var str = "Hi ";
          ptrToData.displayName = str.concat(res.name.first, ' ', res.name.last);
        } else if (this.readyState == 4 && this.status == 401) {
          //Non admins cannot access the admin page, will be redirected to login page
          window.location.href = "/admin_login.html";
        }
      };
      //Open connection
      xhttp.open("GET", "/admin/info.json", true);
      //Send request
      xhttp.send();
    },

    logout: function(event) {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //redirect back to login page.
          window.location.href = "/admin_login.html";
        }
      };
      //Open connection
      xhttp.open("POST", "/logout", true);
      //Send request
      xhttp.send();
    },

    //Get ID and Questions
    getQuestions() {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //save the responses to the saved candidates array
          var res = JSON.parse(xhttp.response);
          questions = []
          for (var i = 0; i < res.length; i++) {
            var question = {
              id: res[i].question_id,
              text: "Q" + res[i].question_id + ": " + res[i].title
            }
            questions.push(question);
          }
          appVue.allQuestions = {data: questions};
        }
      };
      //Open connection
      xhttp.open("GET", "admin/questions.json", true);
      //Send request
      xhttp.send();
    },

    getQuestion_details() {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //save the responses to the saved candidates array
          var res = JSON.parse(xhttp.response);
          QDetails = []
          for (var i = 0; i < res.length; i++) {
            var QDetail = {
              id: res[i].question_id,
              title: res[i].title,
              body: res[i].question_body,
              image: res[i].question_image
            }
            QDetails.push(QDetail);
          }
          appVue.allDetails = {data: QDetails};
        }
      };
      //Open connection
      xhttp.open("GET", "admin/questions.json", true);
      //Send request
      xhttp.send();
    },

    show_questions: function(event){
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Define behaviour for a response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var res = JSON.parse(xhttp.response);
          for(var i = 0; i < res.length; i++){
            var QDetail = {
              "id": res[i].question_id,
              "title": res[i].title,
              "body": res[i].body
            }
            ptrToData.Qustions1.push(QDetail);
          }
        }
        else if (this.readyState == 4 && this.status == 500) {
          alert("Questions are not in database")
        }
      };
      //Initiate Connection
      xhttp.open("GET", "admin/questions.json", true);
      //Send request
      xhttp.send()
    },

    save_chosen_questions: function(event) {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();
      var numQuestionsAdded = this.chosenQuestions.length;
      //Define behaviour for a response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //do stuff if successful
          //empty the candidates array
          ptrToData.chosenQuestions.splice(0, numQuestionsAdded);
        } else if (this.readyState == 4 && this.status == 403) {
          alert("Error questions not added.");
        }
      };
      //Initiate connection
      xhttp.open("POST", "admin/question", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json");
      //Send request
      //'this' keyword points to variables in the data section above.
      xhttp.send(JSON.stringify(this.chosenQuestions));
    },

    //This is called when admin uploads a question, it also sends the file as a binary encoded file
    uploadQuestion: function(event) {
      //Disable default form submission
      event.preventDefault();

      //Form data to send over url
      appVue.uploadQuestionFormData = new FormData($("#uploadQuestionForm")[0]);
      console.log(appVue.uploadQuestionFormData)
      if (appVue.image) {
        appVue.uploadQuestionFormData.set('file', appVue.tempUploadQuestionFormData.get('file'))
      }

      //Initialise error to nil
      appVue.uploadQuestionErrors = [];

      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Define behaviour for a response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          appVue.uploadQuestionSuccess = true;
          //Reset values
          appVue.title = "";
          appVue.body = "";
          appVue.image = "";
          //Populate Vue's question fields again
          appVue.getQuestions();
        } else if (this.readyState == 4 && this.status == 406) {
          appVue.uploadQuestionSuccess = false;
          appVue.uploadQuestionErrors.push("The file you uploaded must be either jpeg, png, or pdf");
        } else if (this.readyState == 4 && this.status == 401) {
          appVue.uploadQuestionSuccess = false;
          appVue.uploadQuestionErrors.push("You're currently not logged in as admin. Please log in.");
        } else if (this.readyState ==4 && this.status == 500) {
          appVue.uploadQuestionSuccess = false;
          appVue.uploadQuestionErrors.push("Unknown error uploading to server. Please try again.");
          console.log("Error: could not uplod question.");
        }
      };
      //Initiate connection
      xhttp.open("POST", "admin/addQuestion", true);
      xhttp.send(appVue.uploadQuestionFormData);
    },

    //Display selected image on uploadQuestionFrom
    createImage(){
      appVue.tempUploadQuestionFormData = new FormData($("#uploadQuestionForm")[0]);

      var files = this.$refs.uploadedFile.files;
      if (!files.length){
        return;
      }
      var file = files[0];
      var image = new Image();
      var reader = new FileReader();

      reader.onload = (e) => {
        appVue.image = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    //Remove selected image on uploadQuestionForm
    removeImage: function (e) {
      this.image = '';
    },

    assignTestToCandidates: function(event) {
      //Disable default form submission
      event.preventDefault();
      appVue.assign_tests.forEach(element => {
        var xhttp = new XMLHttpRequest();

        //Define behaviour for a response
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            //alert("Successfully assigned test to candidates");
            window.location.href = "/admin.html";
          } else if (this.readyState == 4 && this.status == 401) {
            alert("You're currently not logged in as admin. Please log in.");
          } else if (this.readyState == 4 && this.status == 406) {
            alert("Error: selected due date is not valid.");
          } else if (this.readyState == 4 && this.status == 412) {
            alert("Error: must select at least one candidate and one question before assigning test");
          } else if (this.readyState ==4 && this.status == 500) {
            alert("Error: there was some error connecting to database.");
          }
        };
        //Initiate connection
        xhttp.open("POST", "admin/assignTestForCandidates", true);
        //Set content type to JSON
        xhttp.setRequestHeader("Content-type", "application/json");
  
        //Set variables to send over
        candidateIDs = [];
        xhttp.send(JSON.stringify({
          candidate_ids: element.chosenCandidates,
          question_ids: element.chosenQuestions,
          test_end_time: element.testEndDate
        }));
      });
      //Create new AJAX request   
    }
  }
});
