/*jshint esversion: 6 */
//This vue instance is used by the candidate's user interface 

var appVue = new Vue({
  el: "#app",
  data: {
    //name to display on top right corner
    displayName: "",
    ID: "",
    email: "",
    //this var is used for question side navigation bar
    toggle: true,
    test:[],
    question: {
      _id:null
    },
    hasImg: false,
    
    // Varaiables for selected candidate
    CandidateID: "",
    CandidateName: "",
    CandidateFeedback: "",
    CandidateResponses:"",

    //this variable shows the index of the current question
    currentIndex: 0,
    prevIndex: 0,
    currentType: "cpp",
    feedback:'',


    //Modify the variable of account information
    candidate:{
      candidate_id:"",
      name:{
        first:'',
        last:''
      },
      email:'',
      password:''
    },
    //store the responses in this array
    responses: [],

    //store the compile
    compile: "",

    //pointer to the editor
    editor: null,
    editorSessions: [],

    //this array contains all the language types the candidate can choose from and the syntax will be highlighted by the editor
    types: [{name:"C++", value:"cpp"},{name:"C#", value:"csharp"},{name:"Java", value:"java"},{name:"Python 2", value:"python2"},{name:"C", value:"c"}]
  },

  mounted: function() {
    this.loadEditor("cpp");
    this.getCandidateInfo();
    this.getQuestions();
  },
 
  watch: {
    currentIndex: function(){
      //get the previous question index, s.t. the responses can be stored correspondingly
      var ptrToData = this;
      this.test.forEach( function(q, i){
        if (q.question_id == ptrToData.question.question_id){
          ptrToData.prevIndex = i;
        }
      });
      this.updateResponse();
      this.updateCurrentQuestion();
    },

    //update the question's img variable
    question: function(){
      if (this.question.image != null){
        var extension = this.question.image.split(".").pop();
        this.hasImg = false;
        if (!(extension === "txt") && !(extension === "pdf"))
          this.hasImg = true;
      }
      else{
        this.hasImg = false;
      }
    }
  },

  methods: {
    //Modify account information
    updateCandidate(){
      this.candidate.candidate_id=this.ID
     console.log(this.candidate)
      
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
        }
      };
      //Open connection
      xhttp.open("POST", "/candidate/updateCandidates", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json")
      //Send request
      xhttp.send(JSON.stringify(this.candidate));
    },

    //this function gets all the questions assigned to this candidate
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
          //check if responses have been entered before in database
          if (res.test != null){ 
            let tem_list=[]
              res.test.forEach((item)=>{
                ptrToData.test.forEach(ques=>{
                  let tem={}
                  if(item.question_id==ques.question_id){
                    tem.body=ques.body
                    tem.feedback=ques.feedback
                    tem.image=ques.image
                    tem.question_id=item.question_id
                    tem.title=item.title
                    tem._id=ques._id
                    tem.test_id=item.test_id
                    tem.submited=item.submited
                    tem.title=ques.title
                    if(!item.response){
                      tem.response={type:"cpp", body:"Type answer here."}
                    }else{
                      tem.response=item.response
                    }
                    tem.feedback=item.feedback
                    tem_list.push(tem)
                  }
                })
              })
              let temtest=1
              let temptime
              tem_list.forEach((item,index)=>{
                item.issplit=false;
                if(index==0){
                  temptime=item.test_id
                  item.test_id=JSON.parse(temtest)
                }else{
                  if(item.test_id==temptime){
                    item.test_id=JSON.parse(temtest)
                  }else{
                    tem_list[index-1].issplit=true
                    temtest++;
                    temptime=item.test_id
                    item.test_id=JSON.parse(temtest)
                  }
              }
            console.log(item)})
              tem_list[tem_list.length-1].issplit=true
              ptrToData.test = tem_list;
              ptrToData.question = tem_list[0];
              console.log(ptrToData.question)
              ptrToData.responses = ptrToData.test;
            ptrToData.initialiseResponses();
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

    //this method sets up the responses array based on the question ids.
    initialiseResponses(){
      var EditSession = require("ace/edit_session").EditSession;
      ptrToData = this;
      this.test.forEach( function(question, index){
        var res = {question_id: question.question_id, response:{type:"cpp", body:"Type answer here."}};
        //create an editor session for each question
        var editorSession = new EditSession("Type answer here.");
        ptrToData.editorSessions.push(editorSession);
      });
    },

    //This is when we load candidate.html. So it only concerns he first question displayed only.
    reloadSavedResponses(){
      if (this.test.length > 0) {
         this.editor.setSession(this.editorSessions[0]);
         this.editor.setValue(this.responses[0].response.body);
         this.currentType = this.responses[0].response.type;
         this.feedback=this.responses[this.currentIndex].feedback;
         this.loadEditor(this.currentType);
      }
    },

    //initialise editor
    loadEditor(type){
      this.editor = ace.edit("editor");
      this.editor.setTheme("ace/theme/chrome");
      this.editor.getSession().setMode("ace/mode/" + type);
      this.editor.session.setTabSize(4);
    },

    //save the responses
    updateResponse(){
      try{
        this.responses[this.prevIndex].response.body = this.editor.getValue();
        this.responses[this.prevIndex].response.type = this.currentType;
      }catch(err){
        console.log(err)
      }
    },

    //update current question displayed on the screen
    updateCurrentQuestion(){
      //also update the current question 
      try{
        this.question = this.test[this.currentIndex];

      //update the editor to the new questions values
      this.editor.setSession(this.editorSessions[this.currentIndex]);
        this.feedback=""
        this.editor.setValue(this.responses[this.currentIndex].response.body);
        this.currentType = this.responses[this.currentIndex].response.type;
        this.loadEditor(this.currentType);
        this.feedback=this.responses[this.currentIndex].feedback;
      }catch(err){
        console.log(err)
      }
      //update the current response type and syntax highlighting   
    },

    //the following routes saves and submit the current responses for the questions
    save(){
      //Update current question's response before saving
      console.log(this.responses)
      this.responses[this.currentIndex].response.body = this.editor.getValue();
      this.responses[this.currentIndex].response.type = this.currentType;
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
        }
      };
      //Open connection
      xhttp.open("POST", "/candidate/saveTest", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json")
      //Send request
      xhttp.send(JSON.stringify({response_arr : this.responses}));
    },

   Tests() {
          var xhttp = new XMLHttpRequest();
          var current_id = this.ID;
          var ptrToData = this;
          //Handle response
          xhttp.onreadystatechange = function() {
    
            if(this.readyState == 4 && this.status == 200){
              var responses = [];
              for (var i = 0; i < res.test.length; i++) {
                var body = "";
                var type = "cpp"
                if (res.test[i].response) {
                  if (res.test[i].response.body) {
                    body = res.test[i].response.body;
                  }
                  if (res.test[i].response.body) {
                    type = res.test[i].response.type;
                  }
                }
                var response = {
                  question_id: res.test[i].question_id,
                  response: {
                    body: body,
                    type: type
                  },
                  question_counter: i
                }
                responses.push(response);
              }
              ptrToData.CandidateResponses = responses;
              ptrToData.email = res.name.first + " " + res.name.last;
              window.location.href ="/previous_questions.html";
              
            }
            //Direct back to responses page if forbiden (i.e. can't view uncompleted candidate's test)
            else if (this.readyState == 4 && this.status == 403) {
              window.location.href = "/candidate.html";
            }
            else if (this.readyState == 4 && this.status == 500) {
              window.location.href = "/candidate.html";
            }
            else if (this.readyState == 4 && this.status == 404) {
              window.location.href = "/index.html";
            }
            else{
              window.location.href = "/candidate.html";
            }
          };
          xhttp.open("GET", "/candidate/responses.json", true);
          xhttp.send();       
      },

   Account() {
          var xhttp = new XMLHttpRequest();
          var current_id = this.ID;
          var ptrToData = this;
          //Handle response
          xhttp.onreadystatechange = function() {
    
            if(this.readyState == 4 && this.status == 200){
              window.location.href ="/previous_questions.html";
            }
            //Direct back to responses page if forbiden (i.e. can't view uncompleted candidate's test)
            else if (this.readyState == 4 && this.status == 403) {
              window.location.href = "/candidate.html";
            }
            else if (this.readyState == 4 && this.status == 500) {
              window.location.href = "/candidate.html";
            }
            else if (this.readyState == 4 && this.status == 404) {
              window.location.href = "/index.html";
            }
            else{
              window.location.href = "/candidate_account.html";
            }
          };
          xhttp.open("GET", "/candidate/responses.json", true);
          xhttp.send();   
      },

    reviewTest() {    
          var xhttp = new XMLHttpRequest();
          var current_id = this.ID;
          var ptrToData = this;
          //Handle response
          xhttp.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
              window.location.href ="/previous_questions.html";           
            }
            // Direct back to responses page if forbiden (i.e. can't view uncompleted candidate's test)
            else if (this.readyState == 4 && this.status == 403) {
              window.location.href = "/candidate.html";
            }
            else if (this.readyState == 4 && this.status == 500) {
              window.location.href = "/candidate.html";
            }
            else if (this.readyState == 4 && this.status == 404) {
              window.location.href = "/index.html";
            }
            else{
              window.location.href = "/previous_questions.html";
            }
          };
          xhttp.open("GET", "/candidate/responses.json", true);
          xhttp.send();  
      },

    Test(){
      //Update current question's response before saving
      this.responses[this.currentIndex].response.body = this.editor.getValue();
      this.responses[this.currentIndex].response.type = this.currentType;
      var ID = this.currentIndex;
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();
      var ptrToData = this;
      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          var res = JSON.parse(xhttp.response);
          if(res.statusCode==200){
          ptrToData.compile = res.output;}
          else if(res.statusCode==417){
          ptrToData.compile = res.output;}
          else{
            alert("invalid request, please check the code");
          }
        }
      };
      //Open connection
      xhttp.open("POST", "/candidate/Test", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json")
      //Send request
      xhttp.send(JSON.stringify({response_arr : this.responses[ID]}));
    },

    submit(){
      console.log(this.responses)
      console.log(this.currentIndex)
      // Update current question's response before saving
      let temp=this.responses[this.currentIndex].test_id
      this.responses[this.currentIndex].response.body = this.editor.getValue();
      this.responses[this.currentIndex].response.type = this.currentType;
      this.responses[this.currentIndex].submited=true
      this.responses.forEach((item)=>{
        if(item.test_id==temp){
          item.submited=true
        }
      })

      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          window.location.href = "/";
        }
      };
      //Open connection
      xhttp.open("POST", "/candidate/submitTest", true);
      //Set content type to JSON
      xhttp.setRequestHeader("Content-type", "application/json")
      //Send request
      xhttp.send(JSON.stringify({response_arr : this.responses}));
    },

    //this route is used to get candidate info to display on the top right corner of page
    getCandidateInfo: function(event) {
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
          appVue.ID = res._id;
          appVue.candidate.name.first = res.name.first;
          appVue.candidate.name.last = res.name.last;
          appVue.candidate.email = res.email;
          appVue.candidate.password = res.password

        } else if (this.readyState == 4 && this.status == 401) {
          //Non admins cannot access the admin page, will be redirected to login page
          window.location.href = "/";
        }
      };
      //Open connection
      xhttp.open("GET", "/candidate/info.json", true);
      //Send request
      xhttp.send();
    },

    //this route is used to send logout request and reroute to login page
    logout: function(event) {
      //Create new AJAX request
      var xhttp = new XMLHttpRequest();

      //Handle response
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status ==
         200) {
          // redirect back to login page.
          window.location.href = "/";
        }
      };
      //Open connection
      xhttp.open("POST", "/logout", true);
      //Send request
      xhttp.send();
    },
    //the following method opens and closes the question navigation bar
    toggleQuestionNav(){
      $('#sidebar').toggleClass('active');
    }
  }
});

