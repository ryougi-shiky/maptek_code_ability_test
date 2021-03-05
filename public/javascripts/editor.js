//For <div> with class = editor
var editors = document.querySelectorAll(".editor");
editors.forEach(function(editorElem) {
	var editor = ace.edit(editorElem);
	editor.setTheme("ace/theme/chrome");
	editor.getSession().setMode("ace/mode/c_cpp");
	editor.session.setTabSize(4);
});