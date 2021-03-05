var appVue = new Vue({
  data: {
    CandidateID: "",
    CandidateName: "",
    CandidateFeedback: "",
    CandidateResponses:"",
    test:"",
    question:"",

    //this variable shows the index of the current question
    currentIndex: 0,
    prevIndex: 0,
    currentType: "cpp",

    //store the responses in this array
    responses: [],

    //store the compile
    compile: "",

    //pointer to the editor
    editor: null,
    editorSessions: [],

    //this array contains all the language types the candidate can choose from and the syntax will be highlighted by the editor
    types: [{name:"C++", value:"cpp"},{name:"C#", value:"csharp"},{name:"Java", value:"java"},{name:"Python 2", value:"python2"},{name:"PHP", value:"php"},{name:"Objective C", value:"objc"},{name:"C", value:"c"},{name:"NodeJS", value:"nodejs"}]
  },

  mounted: function() {
    this.loadEditor("cpp");
    this.getCandidateInfo();
    this.getQuestions();
  },

      getQuestions: function(event) {
      
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var res = JSON.parse(xhttp.response);
          //save the questions to array
          ptrToData.test = res;
          ptrToData.question = res[0];

          //get previously saved responses
          ptrToData.getResponse();
        } else if (this.readyState == 4 && this.status == 401) {
          //Non admins cannot access the admin page, will be redirected to login page
          window.location.href = "/";
        }
      };
      //Open connection
      xhttp.open("GET", "/candidate/test.json", true);
      //Send request
      xhttp.send();
    },
    
    getResponse: function(event){
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var res = JSON.parse(xhttp.response);
          //First initialise responses
          ptrToData.initialiseResponses();

          //check if responses have been entered before in database
          if (res.test != null){
            if (res.test[0].response) {
              ptrToData.responses = res.test;
            }

            ptrToData.reloadSavedResponses();
          }
        } else if (this.readyState == 4 && this.status == 401) {
          //Non admins cannot access the admin page, will be redirected to login page
          window.location.href = "/";
        }
      };
      //Open connection
      xhttp.open("GET", "/candidate/responses.json", true);
      //Send request
      xhttp.send();
    },

    initialiseResponses(){
      var EditSession = require("ace/edit_session").EditSession;
      ptrToData = this;
      this.test.forEach( function(question, index){
        var res = {question_id: question.question_id, response:{type:"c_cpp", body:"Type answer here."}};
        ptrToData.responses.push(res);

        //create an editor session for each question
        var editorSession = new EditSession("Type answer here.");
        ptrToData.editorSessions.push(editorSession);
      });
    },

    getCandidateInfo: function(event) {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      var ptrToData = this;
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          //display the name of user
          var res = JSON.parse(xhttp.response);
          //console.log("INFO: " + res);
          var str = "Hi ";
          ptrToData.CandidateName = str.concat(res.name.first, ' ', res.name.last);
          appVue.CandidateID = res._id;
        } else if (this.readyState == 4 && this.status == 401) {
          //Non admins cannot access the admin page, will be redirected to login page
          window.location.href = "/";
        }
      };
      //Open connection
      xhttp.open("GET", "/candidate/info.json", true);
      //Send request
      xhttp.send();
    }





