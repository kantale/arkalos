

$(document).ready(function() {
	$('#system-select').multiselect();

	//Also edit CSS 
	window.installation_ace = ace.edit("installation_ace");
    window.installation_ace.setTheme("ace/theme/github");
    window.installation_ace.getSession().setMode("ace/mode/sh");

	window.validate_installation_ace = ace.edit("validate_installation_ace");
    window.validate_installation_ace.setTheme("ace/theme/github");
    window.validate_installation_ace.getSession().setMode("ace/mode/sh");

	window.log_ace = ace.edit("log_ace");
    window.log_ace.setTheme("ace/theme/github");
    window.log_ace.getSession().setMode("ace/mode/text");
    window.log_ace.setReadOnly(true);


// constructs the suggestion engine
var reference_suggestions = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  remote: {
    url: '/reference_suggestions/?query=%QUERY',
    wildcard: '%QUERY'
  }
});

reference_suggestions.initialize();

/*
$('#bloodhound_tools_references .typeahead').typeahead({
  hint: true,
  highlight: true,
  minLength: 1
},
{
  name: 'abcd',
  display: 'value',
  source: reference_suggestions,
  templates: {
  	suggestion : function (data) {
        return '<p><strong>' + data.value + '</strong> - ' + data.html + '</p>';
    }
  }
});
*/
//$('.category-container > > input').tagsinput({
$('#ta_tools_ref').tagsinput({
	typeaheadjs:[
		{
		  hint: true,
		  highlight: true,
		  minLength: 1
		},
		{
		  name: 'abcd',
		  display: 'value',
		  source: reference_suggestions,
		  templates: {
		  	suggestion : function (data) {
		        return '<p><strong>' + data.value + '</strong> - ' + data.html + '</p>';
		    }
		  }
		}
	],
	allowDuplicates: false,
	freeInput: false,
	itemValue: 'value'
}
);
//$('#bloodhound_tools_references').tagsinput('add', { id: 'tag id', label: 'tag lable' });

//Bootstrap table

// Click on row table
//$('#tools_table').on('click-row.bs.table', function (e, row, $element) {
//	angular.element($('#tools_table')).scope().$apply(function(){
//		angular.element($('#tools_table')).scope().tools_table_row_clicked(row);
//	});
//});

// Click on expanded item in row of table 
$('#tools_table')
.on('expand-row.bs.table', function (e, index, row, $detail) {
	var this_id = "tools_table_expand_" + index ;
	$detail.html('<div id="' + this_id + '"></div><script>$("#' + this_id + '").jstree();</script>');

	angular.element($('#tools_table')).scope().$apply(function(){
		angular.element($('#tools_table')).scope().tools_create_jstree(row['name'], this_id, '1', 'tools_table_row_clicked');
	});

})
.on('collapse-row.bs.table', function(e, index, row) {
	var this_id = "tools_table_expand_" + index ;
	$('#' + this_id).jstree("destroy");
});

// tools_dependencies_table
$('#tools_dependencies_table')
.on('expand-row.bs.table', function (e, index, row, $detail) {
	var this_id = "tools_table_dependencies_expand_" + index ;
	//$detail.html('<div id="' + this_id + '"></div><script>$("#' + this_id + '").jstree();</script>');
	$detail.html('<div id="' + this_id + '"></div><script>$("#' + this_id + '").jstree({"core": {check_callback: true}, "plugins": ["dnd"]});</script>');

	angular.element($('#tools_table')).scope().$apply(function(){
		angular.element($('#tools_table')).scope().tools_create_jstree(row['name'], this_id, '2', '');
	});

})
.on('collapse-row.bs.table', function(e, index, row) {
	var this_id = "tools_table_dependencies_expand_" + index ;
	$('#' + this_id).jstree("destroy");
});

//Drophere jstree
$('#jstree_drophere').jstree({
	"core": {check_callback: true},
	"plugins": ["dnd", "types"],
	"dnd": {
		"is_draggable": function (node) {

			var ret = false;
			angular.element($('#tools_table')).scope().$apply(function(){
				ret = !angular.element($('#tools_table')).scope().add_tool_dis_table_clicked;
			});
			return ret;


        }
	},
	"types": {
		"tool": {"icon": "glyphicon glyphicon-flash"},
		"exposed": {"icon" : "glyphicon glyphicon-ok"}
	}
});


// http://jsfiddle.net/DGAF4/517/ 
//$('#jstree_tools').jstree({
//	'core': {check_callback: true},
//	'plugins': ['dnd']
//});
//}).on("copy_node.jstree", function () {
//            alert("copy_node fires");
//}).on("move_node.jstree", function () {
//            alert("move_node fires");
//});

// Jstree. This is the tree on top of Tools Add/Edit
$('#jstree_tools').jstree();


$(document).on('dnd_move.vakata', function (e, data) {
	var t = $(data.event.target);
	var tt = $(data.element).attr('id'); // plink||12_anchor
	//console.log(tt);

	var tt_s = tt.split('_').slice(0,-1).join().split('||'); // Array [ "plink", "12" ]

	if (tt_s[0] == '2') { //We are moving an item from the dependency TABLE
		if (t.closest('#drophere').length) {
			data.helper.find('.jstree-icon').removeClass('jstree-er').addClass('jstree-ok');
		}
		else {
			data.helper.find('.jstree-icon').removeClass('jstree-ok').addClass('jstree-er');
		}
	}
	if (tt_s[0] == '3') { //We are moving an item from the dependecy JSTREE
		if (t.closest('#dropheredelete').length) {
			data.helper.find('.jstree-icon').removeClass('jstree-er').addClass('jstree-ok');
		}
		else {
			data.helper.find('.jstree-icon').removeClass('jstree-ok').addClass('jstree-er');
		}		
	}
});

$(document).on('dnd_stop.vakata', function (e, data) {
	var t = $(data.event.target);
	var tt = $(data.element).attr('id'); // 2||plink||12_anchor
	var tt_s = tt.split('_').slice(0,-1).join().split('||'); // Array [ "2", "plink", "12" ]

	if (tt_s[0] == '2') { //We are moving an item from the dependency TABLE


		if (t.closest('#drophere').length) {

			//Create new dependency
			var new_dependency = {
				'name': tt_s[1], 
				'current_version': +tt_s[2],
			};
			//console.log(new_dependency);

			angular.element($('#tools_table')).scope().$apply(function(){
				angular.element($('#tools_table')).scope().add_tool_dependency(new_dependency);
			});
		}
	}
	if (tt_s[0] == '3') { //We are moving an item from the dependecy JSTREE 
		if (t.closest('#dropheredelete').length) {
			//console.log('DELETEIT!');
			angular.element($('#tools_table')).scope().$apply(function(){
				angular.element($('#tools_table')).scope().remove_tool_dependency({'name': tt_s[1], 'current_version': +tt_s[2]});
			});
		}
	}
});

$('#jstree_tools').on('select_node.jstree', function(e, data){
//	console.log(data);
//	console.log(data.node.original.current_version);
	if (data.event === undefined) {}
	else {
		angular.element($('#tools_table')).scope().$apply(function(){
			row = {'name': data.node.original.name, 'current_version': data.node.original.current_version};
			angular.element($('#tools_table')).scope().tools_table_row_clicked(row);
		});
	}

});

}); //document.ready()

//function tools_table_detailFormatter(index, row) {
//	console.log(index);
//	console.log(row);
//
//	return '<h2>AAAA</h2>';
//};

