

$(document).ready(function() {
	$('#system-select').multiselect();

	var installation_ace = ace.edit("installation_ace");
    installation_ace.setTheme("ace/theme/github");
    installation_ace.getSession().setMode("ace/mode/sh");

});
