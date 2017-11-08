
app.controller('arkalos_Ctrl', function($scope, $http, $timeout) {

	/*
	* Init function called by angular
	*/
	$scope.init = function() {
		$scope.username = username;
		$scope.initialize_ui();
		$scope.add_tool_dis_new_version = false; // Is the user editing a new tool version?
		$scope.add_tool_dis_table_clicked = false; // Is the user just clicked a new tool from the table?
		$scope.add_tool_dis_new_tool = false; // Is the user adding a new version?
	};


	/*
	* Helper function that perform ajax calls
	* success_view: what to do if data were correct and call was successful
	* fail_view: What to do if call was succesful but data where incorrect
	* fail_ajax: what to do if ajax call was incorrect
	*/
	$scope.ajax = function(url, data, success_view, fail_view, fail_ajax) {
		// URL should always end with '/'

		console.log('Before Ajax, data:');
		console.log(data);

		data.csrftoken = CSRF_TOKEN;

		$http({
			headers: {
				"Content-Type": 'application/json',
				"Access-Control-Allow-Origin": "*", // TODO : REMOVE THIS!
				//"X-CSRFToken" : getCookie('csrftoken'),
				"X-CSRFToken" : window.CSRF_TOKEN,
			},
		    method : "POST",
		    url : url,
		    data : data
		}).then(function mySucces(response) {
		    // $scope.myWelcome = response.data;
		    // alert(JSON.stringify(response));
		    if (response['data']['success']) {
		    	console.log('AJAX SUCCESS:');
		    	console.log(response['data']['success']);
		    	success_view(response['data']);
		    }
		    else {
		    	console.log('AJAX ERROR:');
		    	fail_view(response['data']);
		    }
		    
		}, function myError(response) {
			fail_ajax(response.statusText);
		});
	};

	/*
	* Initialiaze what to show at beginning 
	*/
	$scope.initialize_ui = function() {
		$scope.registration_show = false;
		$scope.registration_error_msg = '';
		$scope.login_error_msg = '';
		$scope.tools_error_msg = '';
		$scope.add_tool_show = false;
		$scope.add_tool_table_show = false;
		$scope.tools_show = false;
		$scope.references_show = false;
		$scope.references_error_msg = '';
		$scope.validate_button_disabled = false;
		$scope.add_tools_is_validated = false;
		$scope.add_tools_exposed_vars = [['','','']];
		$scope.tool_summary = '';
		$scope.tool_dependencies = [];
		$scope.show_jstree_tools = false;

		$scope.reports_show = false;
		$scope.add_report_show = false;
		$scope.reports_error_msg = '';
		$scope.reports_show_fields = false;
		$scope.show_report_table = true;

		$scope.add_report_dis_new_version = false;
		$scope.add_report_dis_new_report = false;
		$scope.add_report_dis_table_clicked = false;
		$scope.add_report_dis_init = true;

		$scope.wf_error_msg = '';
		$scope.wf_show = false;
		$scope.show_wf_tools = false;
		$scope.wf_form_show = false;
		$scope.wf_form_task_show = false;

		$scope.wf = {"nodes": [], "links": [], "groups": []};

		$scope.wf_variable_name = '';
		$scope.wf_variable_value = '';
		$scope.wf_variable_description = '';
	};



	////////////////////////////////////////////////////
	/////////////REGISTRATION///////////////////////////
	////////////////////////////////////////////////////


	/*
	* Invoked when "sign up" in nav bar is clicked
	*/
	$scope.nav_bar_signup_clicked = function() {
		$scope.initialize_ui();
		$scope.registration_show = true;
	};

	/*
	* Invoked when user clicks the register button
	*/
	$scope.registration_clicked = function() {

		$scope.ajax(
			"register/",
			{
				"username" : $scope.registration_username,
				"password" : $scope.registration_password,
				"password_confirm": $scope.registration_password_confirm,
				"email" : $scope.registration_email
			 },
			 function(response) {
			 	$scope.registration_error_msg = '';
			 	$scope.registration_show = false;
			 },
			 function(response) {
			 	$scope.registration_error_msg = response['error_message'];
			 },
			 function(statusText) {
			 	$scope.registration_error_msg = statusText;
			 }
		);


	};

	/*
	* Invoked when pressed cancel in the registration form
	*/
	$scope.registration_cancel = function() {
		$scope.initialize_ui();
		$scope.registration_show = false;
	};

	/*
	* Invoked when the 'Sign In' button is pressed
	*/
	$scope.login = function() {
		$scope.ajax(
			"login/",
			{
				"username": $scope.nav_bar_username,
				"password": $scope.nav_bar_password
			},
			function(response) {
				//alert('login correct');
				$scope.username = $scope.nav_bar_username;
				$('#sign_in_dropdown').dropdown('toggle');
				$scope.initialize_ui();
			},
			function(response) {
				$scope.login_error_msg = response['error_message'];
			},
			function(statusText) {
				$scope.login_error_msg = statusText;
			}
		);
	};

	///////////////////////////////////////////
	/////END OF REGISTRATION///////////////////
	///////////////////////////////////////////

	// ###########################################
	// ########### TALK WITH DOCKER SERVER #######
	// ###########################################

	/*
	* Append text to log_ace
	*/
	$scope.log_ace_append = function(text) {
		log_ace.setValue(log_ace.getValue() + '\n' + text, 1);
	};

	/*
	* DOCKER GET IDLE
	*/
	$scope.docker_get_idle = function(docker_none_idle, docker_found_idle, docker_get_output, none_counter, commands, validation_commands) {

		$scope.log_ace_append('Trying to reach validation server..');

		$scope.ajax(
			'http://139.91.70.73:8080/',
			{
				'action': 'GET IDLE'
			},
			function(response) {
				var p_index = response['p_index']
				if (p_index == 'NONE') {
					if (none_counter>3) {
						console.log('FOUND MORE THAN 3 NONE. QUITING');
						docker_none_idle(); 
					}
					else {
						console.log('GET IDLE NONE COUNT: ' + none_counter + ' RETRYING..' );
						$scope.docker_get_idle(docker_none_idle, docker_found_idle, docker_get_output, none_counter+1, commands, validation_commands);
					}
				}
				else {
					$scope.log_ace_append('Found IDLE testing process in effort #' + (none_counter+1));
					docker_found_idle(docker_get_output, p_index, commands, validation_commands);
				}
			},
			function(response) {
				console.log('THIS SHOULD NEVER HAPPEN 384');
			},
			function(statusText) {
				//console.log('COULD NOT REACH DOCKER SERVER 1 : ' + statusText );
				//log_ace.setValue('',1)
				$scope.log_ace_append('Error 23. Could not reach validation server.. Please try later.');
				$scope.validate_button_disabled = false;
			}
		);
	};

	/*
	* DOCKER SUBMIT COMMANDS
	*/
	$scope.docker_found_idle = function(docker_get_output, p_index, commands, validation_commands) {

		$scope.log_ace_append('Submitting installation commands..');

		$scope.ajax(
			'http://139.91.70.73:8080/',
			{
				'action': 'SUBMIT',
				'p_index': p_index,
				'task': commands,
				'validate': validation_commands
			},
			function(response) {
				if (response['response'] == 'SUBMITTED') {
					$scope.log_ace_append('Commands submitted.');
					docker_get_output(p_index)
				}
				else {
					console.log('THIS SOULD NEVER HAPPEN 444');
				}
			},
			function(response) {
				console.log('THIS SHOULD NEVER HAPPEN 188');
			},
			function(statusText) {
				$scope.log_ace_append('Error 25. Could not reach validation server .');
				$scope.validate_button_disabled = false;
				//console.log('COULD NOT REACH DOCKER SERVER 2 : ' + statusText);
			}
		);
	};

	/*
	* DOCKER GET OUTPUT
	*/
	$scope.docker_get_output = function(p_index) {

		$scope.log_ace_append('Waiting for output..');

		$scope.ajax(
			'http://139.91.70.73:8080/',
			{
				'action': 'GET OUTPUT',
				'p_index': p_index
			},
			function(response) {
				var output = response['output'];
				var last = response['last'];
				var validated = response['validated'];
				//console.log('RECEIVED OUTPUT:');
				if ($.trim(output) == '') {
					$scope.log_ace_append('Received empty output.');
				}
				else {
					$scope.log_ace_append('Received non-empty output:');
					$scope.log_ace_append(output);
				}
				
				if (last) {
					//FINISHED (set verified??)
					$scope.log_ace_append('Finished!');
				}
				else {
					//console.log('NOT FINISHED.. WAITING MORE OUTPUT');
					$scope.log_ace_append('Not finished.');
					//WAIT 1.5 SEC
					$timeout(
						function() {$scope.docker_get_output(p_index)},
						1500
					);
				}

				if (validated == 1) {
					// DID NOT VALIDATE
					$scope.log_ace_append('Validation failed.');
					$scope.validate_button_disabled = false;
					$scope.add_tools_is_validated = false;
				}
				else if (validated == 2) {
					// VALIDATIONS SUCCEEDED
					$scope.log_ace_append('Validation succeeded.');
					$scope.validate_button_disabled = false;
					$scope.add_tools_is_validated = true;
				}
			},
			function(response) {
				console.log('THIS SHOULD NEVER HAPPEN 782');
			},
			function(statusText) {
				//console.log('COUND NOT REACH DOCKER SERVER 3 : ' + statusText);
				$scope.log_ace_append('Error 26. Could not reach validation server .');
				$scope.validate_button_disabled = false;
			}
		);
	};

	/*
	* WRAPPER FUNCTION. USE THIS
	*/
	$scope.do_docker = function(commands, validation_commands) {

		$scope.docker_get_idle(
			function() {
				//console.log('QUITING..');
				$scope.log_ace_append('Validation server is too busy.. Try again later.')
			}, // docker_none_idle, 
			$scope.docker_found_idle, //docker_found_idle, 
			$scope.docker_get_output, //docker_get_output, 
			0, //none_counter, 
			commands,
			validation_commands);

	};
	

	// ###########################################
	// #### END OF TALK WITH DOCKER SERVER #######
	// ###########################################



	/////////////////////////////////////////////////////
	/////////////TOOLS / DATA ///////////////////////////
	/////////////////////////////////////////////////////

	/*
	* Clicked the "Tools/Data" from navbar
	*/
	$scope.nav_bar_tools_clicked = function() {
		$scope.initialize_ui();
		$scope.tools_show = true;
		$scope.add_tool_table_show = true;
	};

	/*
	* Clicked the "Add" button from the Tools Table
	*/
	$scope.tools_table_add_button_clicked = function() {

		if ($scope.username == '') {
			$scope.tools_error_msg = 'Login to add a Tool/Dataset';
		}
		else {
			$('#jstree_tools').jstree(true).settings.core.data = [];
			$('#jstree_tools').jstree(true).refresh();
			$scope.tool_name_model = '';
			$scope.tool_version_model = '';
			$('#system-select').multiselect('enable');
			$('#system-select').multiselect("deselectAll", false).multiselect("refresh");
			$scope.tool_url_model = '';
			$scope.tool_description_model = '';
			$('#tools_dependencies_table').bootstrapTable('refresh'); //Refresh dependency TABLE

			// Remove existing dependencies from the tree
			$scope.tool_dependencies = []
			$('#jstree_drophere').jstree(true).settings.core.data = $scope.tool_dependencies;
			$('#jstree_drophere').jstree(true).refresh();

			$scope.add_tools_is_validated = false;
			$scope.add_tools_exposed_vars = [['','','']];
			$('#ta_tools_ref').tagsinput('removeAll');

			$scope.tool_previous_version = 'N/A';
			$scope.tool_current_version = 'N/A';
			$scope.tools_created_at = 'N/A';
			$scope.tools_username = $scope.username;
			$scope.add_tool_show = true;
			$scope.add_tool_table_show = false;

			var install_commands_init =	"# Insert the BASH commands that install the tool\n" +
										"# The following tools are already installed: git, gcc, g++, make, zip, wget, curl, bzip2\n" +
										"# No need to run 'apt-get update' (already performed)\n";

			var validate_commands_init = "# Insert the BASH commands that check if the tool is properly installed.\n" + 
										"# exit with 0 if it succeeds or non-zero if it fails\n" +
										"# For example:\n" + 
										"#mytool --version\n" +
										"#if [ $? -eq 0 ] ; then\n" +
										"#    echo 'mytool is already installed'\n" +
										"#    exit 0\n" +
										"#fi\n\n" + 
										"exit 1 # DO NOT REMOVE THIS (or make sure that the script returns non zero exit code in case of failure)\n";

			var log_ace_init = "Logs from validation process in Docker\nPress 'Validate' button to test installation script";

			installation_ace.setValue(install_commands_init, 1);
			installation_ace.setReadOnly(false);

			validate_installation_ace.setValue(validate_commands_init, 1);
			validate_installation_ace.setReadOnly(false);

			log_ace.setValue(log_ace_init, 1);

			$scope.add_tool_dis_new_tool = true;
			$scope.add_tool_dis_table_clicked = false;
			$scope.add_tool_dis_new_version = false;

		}


	};

	/*
	* Clicked the "Cancel" button at Tools/Data
	*/
	$scope.add_tools_cancel_clicked = function() {
		$scope.add_tool_show = false;
	};

	/*
	* Clicked the button "New Version" at Tools/Data
	*/
	$scope.add_tools_new_version_clicked = function() {
		$scope.add_tool_dis_new_version = true;
		$scope.add_tool_dis_table_clicked = false;
		$scope.add_tool_dis_new_tool = false;

		$scope.tool_previous_version = $scope.tool_current_version;
		$scope.tool_current_version = 'N/A';
		$scope.tools_created_at = 'N/A';
		installation_ace.setReadOnly(false);
		validate_installation_ace.setReadOnly(false);
		$('#system-select').multiselect('enable');
		$scope.tool_summary = '';

	};

	/*
	* ARKALOS WORKER SERVER: http://139.91.70.73:8080/ 
	* Button "Validate" clicked
	*/
	$scope.add_tools_validate = function() {
		var install_commands = installation_ace.getValue();
		var validation_commands = validate_installation_ace.getValue();
		//console.log(install_commands);

		$scope.validate_button_disabled = true;
		$scope.do_docker(install_commands, validation_commands);
	};

	/*
	* Clear log button clicked
	*/
	$scope.add_tools_log_clear = function() {
		log_ace.setValue('', 1);
	};

	/*
	* Clicked the "Save" button in Add Tools
	*/
	$scope.add_tools_save_clicked = function() {
		
		if (false) { // TODO: SET TRUE IN PRODUCTION!
			if (!$scope.validate_button_disabled) {
				$scope.tools_error_msg = 'Please validate the tool before saving.'
				return;
			}
		}

		// Remove any error message
		$scope.tools_error_msg = '';

		// Get references from UI
		var references = [];
		$.each($('#ta_tools_ref').tagsinput('items'), function(key,value) {references.push(value.value)});

		$scope.ajax(
			'add_tool/',
			{
				"name": $scope.tool_name_model,
				"version": $scope.tool_version_model,
				"system": JSON.stringify($('#system-select').val()),
				"url": $scope.tool_url_model,
				"description": $scope.tool_description_model,
				"installation": installation_ace.getValue(),
				"validate_installation": validate_installation_ace.getValue(),
				"references": JSON.stringify(references),
				"exposed": $scope.add_tools_exposed_vars,
				"previous_version": $scope.tool_previous_version,
				"summary": $scope.tool_summary,
				"dependencies": $scope.tool_dependencies
			},
			function(response) {
				//alert('add tool success');
				$scope.tools_created_at = response['created_at'];
				$scope.tool_current_version = response['current_version'];

				$scope.add_tools_row_clicked_ui(response['jstree']);
			},
			function(response) {
				$scope.tools_error_msg = response['error_message'];
			},
			function(statusText) {
				$scope.tools_error_msg = statusText;
			}
		);
	};

	/*
	* "+" button clicked in exposed vars
	*/
	$scope.add_tools_add_exposed_var = function() {
		$scope.add_tools_exposed_vars.push(['', '', '']);
	};

	/*
	*	'-' button clicked in exposed vars
	*/
	$scope.add_tools_remove_exposed_var = function(index) {
		$scope.add_tools_exposed_vars.splice(index, 1);
	};

	/*
	* Feed a jstree_id with data
	* prefix : String added in id
	*/
	$scope.tools_create_jstree = function(name, jstree_id, prefix, on_select) {

		$scope.ajax(
			'jstree_tool/',
			{
				'name': name,
				'prefix': prefix
			},
			function(response) {
				var t_jstree = response['jstree'];

				var jstree_id_jq = '#' + jstree_id;

				$(jstree_id_jq).on('refresh.jstree', function() {
					$(jstree_id_jq).jstree("open_all");
				});

				if (on_select == 'tools_table_row_clicked') {
					$(jstree_id_jq).on('select_node.jstree', function(e, data){
						row = {'name': data.node.original.name, 'current_version': data.node.original.current_version};
						$scope.tools_table_row_clicked(row);
					});
				}

				$(jstree_id_jq).jstree(true).settings.core.data = t_jstree;
				$(jstree_id_jq).jstree(true).refresh();
			},
			function(response) {
				alert('FAIL123');
			},
			function(statusText) {
				alert('FAIL3463');
			}
		);

	};

	/*
	* Create a reports jstree. TODO: MOVE TO REPORTS SECTION!
	*/
	$scope.reports_create_jstree = function(name, jstree_id, prefix, on_select) {
		$scope.ajax(
			'jstree_report/',
			{
				'name': name,
				'prefix': prefix
			},
			function(response) {
				var r_jstree = response['jstree'];
				var jstree_id_jq = '#' + jstree_id;

				$(jstree_id_jq).on('refresh.jstree', function() {
					$(jstree_id_jq).jstree("open_all");
				});

				$(jstree_id_jq).on('select_node.jstree', function(e, data){
					row = {'name': data.node.original.name, 'current_version': data.node.original.current_version};
					$scope.reports_table_row_clicked(row);
				});

				$(jstree_id_jq).jstree(true).settings.core.data = r_jstree;
				$(jstree_id_jq).jstree(true).refresh();		

			},
			function(response) {
				alert('FAIL986');
			},
			function(statusText) {
				alert('FAIL7811');
			}
		);
	};

	/*
	* A report was selected. TODO: MOVE TO REPORTS RECTION
	*/
	$scope.reports_table_row_clicked = function(row) {
//		$scope.add_report_show = true;
		$scope.reports_show_fields = true;
//		$scope.show_report_table = true;

		$scope.ajax(
			'get_reports_ui/',
			{
				'name': row['name'],
				'current_version': row['current_version']
			},
			function(response) {
				$scope.report_name_model = response['name'];
				$scope.report_current_version = response['current_version'];
				$scope.reports_username = response['username'];
				$scope.reports_created_at = response['created_at'];

				report_ace.setValue(response['markdown']);
				report_ace.setReadOnly(true);
				$scope.report_render();

				$scope.report_summary = response['summary']

				$scope.add_report_dis_new_version = false;
				$scope.add_report_dis_new_report = false;
				$scope.add_report_dis_table_clicked = true;
				$scope.add_report_dis_init = false;

			},
			function(response) {

			},
			function(statusText) {

			}
		);

	};

	/*
	* Update UI after a row is clicked in the tools table
	*/
	$scope.add_tools_row_clicked_ui = function(t_jstree) {

		$('#jstree_tools').jstree(true).settings.core.data = t_jstree;
		$('#jstree_tools').jstree(true).refresh();
		$timeout(function() {
			$('#jstree_tools').jstree('select_node', $scope.tool_name_model + '||' + $scope.tool_current_version);
		}, 500);

		$scope.add_tool_dis_table_clicked = true;
		$scope.add_tool_dis_new_tool = false;
		$scope.add_tool_dis_new_version = false;

		installation_ace.setReadOnly(true);
		validate_installation_ace.setReadOnly(true);
		$('#system-select').multiselect('disable');
	};

	/*
	* A row at the tools table was clicked
	*/
	$scope.tools_table_row_clicked = function(row) {
		//alert(row['name']);
		$scope.add_tool_show = true;
		$scope.add_tool_table_show = false;

		//Get more info from server and feed them to UI
		$scope.ajax(
			'get_tools_ui/',
			{
				'name': row['name'],
				'current_version': row['current_version']
			},
			function(response) {
				$scope.tool_name_model = response['name'];
				$scope.tool_current_version = response['current_version'];
				$scope.tool_version_model = response['version'];
				$('#system-select').multiselect('select', response['system']);
				$scope.tools_username = response['username'];
				$scope.tools_created_at = response['created_at'];
				$scope.tool_url_model = response['url'];
				$scope.tool_description_model = response['description'];
				installation_ace.setValue(response['installation']);
				validate_installation_ace.setValue(response['validate_installation']);
				$scope.add_tools_exposed_vars = response['exposed'];
				$scope.tool_summary = response['summary'];
				
				//Refresh dependency table
				$('#tools_dependencies_table').bootstrapTable('refresh'); 

				//Clear all tag input
				$('#ta_tools_ref').tagsinput('removeAll');

				//Add tag input entries
				for (var item in response['references']) {
					$('#ta_tools_ref').tagsinput('add', {value: response['references'][item], html: ''});
				}

				var t_jstree = response['jstree'];
				$scope.add_tools_row_clicked_ui(t_jstree);

				$scope.tool_dependencies = response['dependencies'];
				$('#jstree_drophere').jstree(true).settings.core.data = $scope.tool_dependencies;
				$('#jstree_drophere').jstree(true).refresh();

			},
			function(response) {
				$scope.tools_error_msg = response['error_message'];
			},
			function(statusText) {
				$scope.tools_error_msg = statusText;
			}
		);

	};

	/*
	* Recursively chech 
	* called by $scope.add_tool_dependency
	*/
	$scope.add_tool_dependency_rec = function(dependencies, new_dependency) {

		console.log("current dependencies:");
		console.log(dependencies);

		var rec_dep = "ok";
		if ("children" in dependencies) {
			if (dependencies.children.length) {
				rec_dep = $scope.add_tool_dependency_rec(dependencies.children, new_dependency);
			}
		}
		if (rec_dep != "ok") {
			return rec_dep;
		}

		for (var i in dependencies) {
			if ((dependencies[i].name == new_dependency.name) && (dependencies[i].current_version == new_dependency.current_version)) {
				return "This tool already exists in dependencies";
			}
		}

		return "ok";
	};

	/*
	* Add a new dependency to the tool/data
	*/
	$scope.add_tool_dependency = function(new_dependency) {
		//$scope.tool_dependencies = [];

		var ok = $scope.add_tool_dependency_rec($scope.tool_dependencies, new_dependency);
		if (ok!="ok") {
			$scope.tools_error_msg = ok;
			return;
		}

		$scope.ajax(
			'jstree_tool_dependencies/',
			{
				'name': new_dependency['name'],
				'current_version': new_dependency['current_version']
			},
			function(response) {
				$scope.tools_error_msg = '';
				var jstree = response['jstree']
				$scope.tool_dependencies.push(jstree);

				console.log($scope.tool_dependencies);

				//Update UI
				$('#jstree_drophere').jstree(true).settings.core.data = $scope.tool_dependencies;
				$('#jstree_drophere').jstree(true).refresh();

			},
			function(response) {},
			function(statusText) {
				$scope.tools_error_msg = statusText;
			}

		);

		
		

	};

	/*
	* Remove a dependency
	*/
	$scope.remove_tool_dependency = function(dependency) {
		var index_to_del = -1;
		for (var index in $scope.tool_dependencies) {
			if (($scope.tool_dependencies[index]['name'] == dependency['name']) && ($scope.tool_dependencies[index]['current_version'] == dependency['current_version'])) {
				index_to_del = index;
				break;
			}
		}

		if (index_to_del > -1) {
			$scope.tool_dependencies.splice(index_to_del, 1);
			$('#jstree_drophere').jstree(true).settings.core.data = $scope.tool_dependencies;
			$('#jstree_drophere').jstree(true).refresh();
		}

	};

	/*
	* Togle jstree view of Edit histort of Tools/Data
	*/
	$scope.toggle_show_jstree_tools = function() {
		$scope.show_jstree_tools = !$scope.show_jstree_tools;
	};

	////////////////////////////////////////////////////
	//////////END OF TOOLS / DATA //////////////////////
	////////////////////////////////////////////////////

	/////////////////////////////////////////////////////
	///////////// REPORTS ///////////////////////////////
	/////////////////////////////////////////////////////

	/*
	* Clicked "References" from navbar
	*/
	$scope.nav_bar_reports_clicked = function() {
		$scope.initialize_ui();
		$scope.reports_show = true;
		$scope.add_report_show = true;
	};

	/*
	* Add references to report
	*/
	$scope.process_report = function(report) {

		var all_references = {};
		var counter = 0;
		$scope.reports_error_msg = '';
		var ret = report;

		var re = /\[([a-zA-Z0-9]+)\][^\(]/g;
		do {
			m = re.exec(report);
			if (m) {
				var code = m[1];

				if (!(code in all_references)) {
					all_references[code] = {};
				}
			}
		} while (m);


		$scope.ajax(
			'get_reference/',
			{
				codes: Object.keys(all_references)
			},
			function(response) {
				counter += 1;
				all_references = response['data'];
				$scope.report_references = [];


				for (var item in all_references) {
					ret = ret.replace(new RegExp('\\[' + item + '\\]', 'g'), '[' + all_references[item].counter +']'); // https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
					$scope.report_references.push(item); // TODO. Save reports should be done here.
				}

				if (response['total']>0) {
					ret = ret + '\n## References\n';
					for (var index=0; index<response['total']; index++) {
						ret = ret + (index+1) + '. ' + response['html'][index]['html'] + '\n';
					}
				}

				var md_html = markdown.makeHtml(ret);
				$('#report_document').html(md_html);

			},
			function(response) {},
			function(statusText) {
				$scope.reports_error_msg = statusText;
			}
		);



	};

	/*
	* Clicked update in report
	*/
	$scope.report_render = function() {
		var md_text = report_ace.getValue();
		$scope.process_report(md_text);

	};

	/*
	* Clicked show/hide on report table
	*/
	$scope.toggle_show_report_table = function() {
		$scope.show_report_table = !$scope.show_report_table;
	};

	/*
	* Clicked "Create New" button on Reports
	*/
	$scope.reports_table_add_button_clicked = function() {

		if ($scope.username == '') {
			$scope.reports_error_msg = 'Login to add a report';
			return;
		}
		$scope.reports_error_msg = '';

		$scope.reports_show_fields = true;
		$scope.report_name_model = '';
		$scope.report_previous_version = 'N/A';
		$scope.report_current_version = 'N/A';
		$scope.reports_username = $scope.username;
		$scope.reports_created_at = 'N/A';
		report_ace.setValue('', 1);
		report_ace.setReadOnly(false);
		$('#report_document').html('');
		$scope.report_references = [];

		$scope.add_report_dis_new_version = false;
		$scope.add_report_dis_new_report = true;
		$scope.add_report_dis_table_clicked = false;
		$scope.add_report_dis_init = false;

	};

	/*
	* Clicked "Save" button on Reports
	*/
	$scope.add_reports_save_clicked = function() {
		//Some sanity check
		if ($scope.report_name_model == '') {
			$scope.reports_error_msg = 'name cannot be empty';
			return;
		}

		if (($scope.report_previous_version != 'N/A') && ($scope.report_summary == '')) {
			$scope.reports_error_msg = 'Summary cannot be empty';
			return;
		}

		$scope.reports_error_msg = '';

		$scope.ajax(
			'add_report/',
			{
				'name': $scope.report_name_model,
				'previous_version': $scope.report_previous_version,
				'markdown': report_ace.getValue(),
				'references': $scope.report_references
			},
			function(response) {
				$scope.reports_error_msg = '';

				$scope.report_current_version = response['current_version'];
				$('#reports_table').bootstrapTable('refresh');

				$scope.add_report_dis_new_version = false;
				$scope.add_report_dis_new_report = false;
				$scope.add_report_dis_table_clicked = true;
				$scope.add_report_dis_init = false;

				report_ace.setReadOnly(true);


			},
			function(response) {

			},
			function(statusText){
				$scope.reports_error_msg = statusText;
			}
		);

	};

	/*
	* Clicked "New Version" in reports
	*/
	$scope.add_reports_new_version_clicked = function() {

		if ($scope.username == '') {
			$scope.reports_error_msg = 'Login to add a new version of a report';
			return;
		}
		$scope.reports_error_msg = '';


		$scope.add_report_dis_new_version = true;
		$scope.add_report_dis_new_report = false;
		$scope.add_report_dis_table_clicked = false;
		$scope.add_report_dis_init = false;

		$scope.report_previous_version = $scope.report_current_version;
		$scope.report_current_version = 'N/A';
		$scope.reports_username = $scope.username;
		$scope.reports_created_at = 'N/A';

		report_ace.setReadOnly(false);


	};

	/////////////////////////////////////////////////////
	///////////// END OF REPORTS ////////////////////////
	/////////////////////////////////////////////////////


	/////////////////////////////////////////////////////
	///////////// REFERENCES ////////////////////////////
	/////////////////////////////////////////////////////

	/*
	* Clicked "References" from navbar
	*/
	$scope.nav_bar_references_clicked = function() {
		$scope.initialize_ui();
		$scope.references_show = true;
	};

	/*
	* Clicked "Add Reference"
	*/
	$scope.references_table_add_button_clicked = function() {
		if ($scope.username == '') {
			$scope.references_error_msg = 'Login to add a reference';
		}
		else {
			$scope.add_reference_show = true;
		}
	};

	/*
	* clicked "Cancel" in "Add References"
	*/
	$scope.add_reference_cancel_clicked = function() {
		$scope.references_show = false;
	};

	/*
	* Clicked "Save" in "Add References"
	*/
	$scope.add_reference_save_clicked = function() {

		$scope.ajax(
			"add_reference/",
			{
				reference_type: "BIBTEX",
				content: $scope.reference_bibtex_model
			},
			function(response) {
				//Clear form
				$scope.reference_bibtex_model = '';
				$scope.add_reference_show = false;
				$scope.references_error_msg = '';
			},
			function(response) {
				$scope.references_error_msg = response['error_message'];
			},
			function(statusText) {
				$scope.references_error_msg = statusText;
			}
		);
	};

	////////////////////////////////////////////////////
	//////////END OF REFERENCES ////////////////////////
	////////////////////////////////////////////////////

	///////////////////////////////////////////////////
	///////// WORKFLOWS ///////////////////////////////
	///////////////////////////////////////////////////

	/*
	* Shortcut to update workdflow
	*/
	$scope.update_workflow = function() {
		update_workflow($scope.wf);
	};

	/*
	* Debug workflow. Return a string representation of the graph
	*/
	$scope.wf_debug = function() {
		var ret = ''

		for (var i=0; i<$scope.wf.nodes.length; i++) {
			ret += 'NODE: ' + $scope.wf.nodes[i].name +  '  INDEX FIELD: ' + $scope.wf.nodes[i].index + ' INDEX ARRAY: ' + i + ' \n'; 
		}
		for (var i=0; i<$scope.wf.links.length; i++) {
			ret += 'EDGE  ' + $scope.wf.links[i].name + ' SOURCE: ' + $scope.wf.links[i].source.index + '  TARGET: ' + $scope.wf.links[i].target.index + '\n';
		}

		return ret
	};


	/*
	* Clicked the "Workflows" from navbar
	*/
	$scope.nav_bar_wf_clicked = function() {
		$scope.initialize_ui();
		$scope.wf_show = true;
	};

	/*
	* Clicked show/hide tools in workflows
	*/
	$scope.toggle_show_wf_tools = function() {
		$scope.show_wf_tools = !$scope.show_wf_tools;
	};

	/*
	* Add tool to graph. Drag and drop from table.
	*/
	$scope.wf_add_tool_in_graph = function(row, update) {

		var new_node_node_name = row['name'] + ' ' + row['current_version'];

		$scope.wf["nodes"].push({"name": new_node_node_name, "type": "tool", "current_version": row['current_version'], "tool_name": row["name"], "children": []});
		//console.log($scope.wf);
		if (update) {update_workflow($scope.wf);}
	
		return new_node_node_name;
	};

	/*
	* Add variable in graph
	*/
	$scope.wf_add_variable_in_graph = function(variable, row) {
		var new_node_node_name = variable[0];
		$scope.wf["nodes"].push({
			"name": new_node_node_name, 
			"type": "variable", 
			"current_version": row["current_version"], 
			"tool_name": row["name"], 
			"children": [], 
			"variable_name": variable[0],
			"variable_value": variable[1],
			"variable_description": variable[2]
		});
		return new_node_node_name
	};

	/*
	* Get the index of a node/edge in the wf
	*/
	$scope.wf_get_index = function(node_edge, name) {

			for (var i=0; i<$scope.wf[node_edge].length; i++) {
				if ($scope.wf[node_edge][i]['name'] == name) {
					return i;
				}
			}

			return -1
	};

	/*
	* Get the index of a node in the wf
	*/
	$scope.wf_get_node_index = function(name) {
		return $scope.wf_get_index('nodes', name)
	};

	/*
	* Get the index of an edge in the wf
	*/
	$scope.wf_get_edge_index = function(name) {
		return $scope.wf_get_index('links', name)
	};

	/*
	* Returns all the edge indexes that target to a specific node index
	*/
//	$scope.wf_get_edge_index_from_targets_index = function(node_index) {
//		var ret = [];
//
//		for (var i=0; i<$scope.wf.links.length; i++) {
//			if ($scope.wf.links[i].target.index == node_index) {
//				console.log("Adding to the remove stack:");
//				console.log($scope.wf.links[i].name);
//				ret.push(i);
//			}
//		}
//
//		return ret;
//	};

	/* 
	* Add a node to the graph
	*/
	$scope.wf_add_node = function(node) {
		//Does this node exist?
		var index = $scope.wf_get_node_index(node.name);
		if (index == -1) {
			//It does not exist. Add it.
			$scope.wf["nodes"].push(node);
			return $scope.wf["nodes"].length-1;
		}
		else {
			return index;
		}
	};

	/*
	* Add an edge in the graph
	*/
	$scope.wf_add_edge = function(node_source, node_target, edge_name, update) {

		var edge_index = $scope.wf_get_edge_index(edge_name);
		if (edge_index > -1) {
			//This node exists.
			return;
		}

		//Add the nodes
		var index_source = $scope.wf_add_node(node_source);
		var index_target = $scope.wf_add_node(node_target);

		//Add the children
		$scope.wf.nodes[index_source].children.push(index_target);

		//Add the edge
		$scope.wf['links'].push({'source': index_source, 'target': index_target, 'name': edge_name});

		if (update) {
			$scope.update_workflow();
		}
	};

	/*
	* Remove a node from that wf
	*/
	$scope.wf_remove_node_index = function(node_index) {


		//Remove this node
//		console.log('WF BEFORE:');
//		console.log($scope.wf_debug());
		//Remove the nodes
		$scope.wf.nodes.splice(node_index, 1);
//		console.log('WF AFTER');
//		console.log($scope.wf_debug());

		// Which edges lead to this node?
		//var edges_indexes_to_remove = $scope.wf_get_edge_index_from_targets_index(node_index);
		while (true) {
			var to_delete = -1;
			for (var i=0; i<$scope.wf.links.length; i++) {
				if ($scope.wf.links[i].target.index == node_index) {
					to_delete = i;
					break;
				}
			}
			if (to_delete > -1) {
				$scope.wf.links.splice(to_delete, 1);
			}
			else {
				break;
			}
		}
		
		//Go through all links. And fix the indexes 
		for (var i=0; i<$scope.wf.links.length; i++) {
			var current_link = $scope.wf.links[i];

			if (current_link.source.index > node_index) {
				current_link.source.index -= 1;
			}
			if (current_link.target.index > node_index) {
				current_link.target.index -= 1; 
			}
		}

		//Go through all nodes and fix children indexes
		for (var i=0; i<$scope.wf.nodes.length; i++) {
			for (var j=0; j<$scope.wf.nodes[i].children.length; j++) {
				if ($scope.wf.nodes[i].children[j] > node_index) {
					$scope.wf.nodes[i].children[j] -= 1;
				}
			}
		}

	};

	/*
	* Remove from the graph all the children of this node
	*/
	$scope.wf_remove_children = function(node) {

		for (var i=0; i<node.children.length; i++) {
			var child_index = node.children[i];
			var child_node = $scope.wf.nodes[child_index];

			//Check if this child has children
			if (child_node.children.length == 0) {
				//It does not have any children. REMOVE IT!
				$scope.wf_remove_node_index(child_index);
			}
			else {
				//It has children
				//Remove all the children
				$scope.wf_remove_children(child_node);

				//Remove this node
				$scope.wf_remove_node_index(child_index)
			}
		} 

		//All the children have been removed
		node.children = [];
	};

	/*
	* double clicked a node in wf
	*/
	$scope.wf_node_double_click = function(node) {

		if (node.type == 'tool') {
			//Does this node has children?
			if (node.children.length > 0) {
				//It has children. Remove them
				console.log("Before remove");
				console.log($scope.wf);
				$scope.wf_remove_children(node);
				console.log("After remove");
				console.log($scope.wf);
				//console.log($scope.wf);
				update_workflow($scope.wf);
			}

			else {
				//Check if this tool has the dependencies node
				var tool_dep_name = node.name + ' dependencies';
				var tool_dep_name_index = $scope.wf_get_node_index(tool_dep_name);

				if (tool_dep_name_index == -1) {
					// It does not have. Add it. 
					$scope.wf_add_edge(
						{'name': node.name},
						{"name": tool_dep_name, "type": "tool_dep", "tool_name": node.tool_name, "current_version": node.current_version, "children": []},
						node.name + " tool_dep",
						false
					);
					update_workflow($scope.wf);
				}

				//Check if this tool has the exposed node
				var tool_var_name = node.name + ' variables';
				var tool_var_name_index = $scope.wf_get_node_index(tool_var_name);
				if (tool_var_name_index == -1) {
					$scope.wf_add_edge(
						{'name': node.name},
						{"name": tool_var_name, "type": "tool_var", "tool_name": node.tool_name, "current_version": node.current_version, "children": []},
						node.name + " tool_var",
						false
					);
					update_workflow($scope.wf);

				}
			}
		}
		else if (node.type == 'tool_dep') {
			//Does this node has children?
			if (node.children.length > 0) {
				//It has children. Remove them
				$scope.wf_remove_children(node);
				//console.log($scope.wf);
				update_workflow($scope.wf);
			}

			else {			
				$scope.ajax(
					'get_tool_dependencies/',
					{
						'name': node.tool_name,
						'current_version': node.current_version
					},
					function (response) {
						for (var i=0; i<response['dependencies'].length; i++) {
							var tool_name = response['dependencies'][i].name;
							var tool_current_version = response['dependencies'][i].current_version;
							var new_node_node_name = $scope.wf_add_tool_in_graph({'name': tool_name, 'current_version': tool_current_version}, false);
							$scope.wf_add_edge(
								{'name': node.name},
								{'name': new_node_node_name},
								node.name + ' <--> ' + new_node_node_name,
								false
							);
						}
						update_workflow($scope.wf);

					},
					function (response) {
						$scope.wf_error_msg = response['error_message'];
					},
					function (statusText) {
						$scope.wf_error_msg = statusText;
					}
				);
			}
		}
		else if (node.type == 'tool_var') {
			//Does this node has children?
			if (node.children.length > 0) {
				//It has children. Remove them
				$scope.wf_remove_children(node);
				//console.log($scope.wf);
				update_workflow($scope.wf);
			}

			else {
				//This node does not have children. Fetch them!
				$scope.ajax(
					'get_tool_variables/',
					{
						'name': node.tool_name,
						'current_version': node.current_version
					},
					function (response) {
						for (var i=0; i<response['variables'].length; i++) {
							var new_node_node_name = $scope.wf_add_variable_in_graph(response['variables'][i], {'name': node.tool_name, 'current_version': node.current_version});
							$scope.wf_add_edge(
								{'name': node.name},
								{ 'name': new_node_node_name},
								node.name + ' <--> ' + new_node_node_name,
								false
							);
						}
						update_workflow($scope.wf);
					},
					function (response) {
						$scope.wf_error_msg = response['error_message'];
					},
					function (statusText) {
						$scope.wf_error_msg = statusText;
					}
				);
			}
		}


	};

	/*
	* clicked a node in wf
	* IMPORTANT TODO: Distibguish between double click and click. This is fired two time in double click!
	*/
	$scope.wf_node_click = function(node) {
		//alert('CLICKED!');
		//console.log("CLICKED!");

		if (node.type == 'variable') {
			$scope.wf_variable_name = node.variable_name;
			$scope.wf_variable_value = node.variable_value;
			$scope.wf_variable_description = node.variable_description;
		}
	};

	/*
	* Button workflows add task clicked
	*/
	$scope.wf_add_task = function() {
		if ($scope.username == '') {
			$scope.wf_error_msg = 'Login to add a task in a workflow';
			return;
		}
		$scope.wf_error_msg = '';

		$scope.wf_form_show = false;
		$scope.wf_form_task_show = true;
	};

	/*
	* Button workflows "Save Workdlow" (under the graph) clicked
	*/
	$scope.wf_save_workflow = function() {
		if ($scope.username == '') {
			$scope.wf_error_msg = 'Login to save a workflow';
			return;
		}

		$scope.wf_error_msg = '';
		$scope.wf_form_show = true;
		$scope.wf_form_task_show = false;
	};

	/*
	* Button on workflows add task clicked
	*/
	$scope.wf_add_task_clicked = function() {
		var new_node = {"name": $scope.wf_task_name, "type": "task", "children": []}
		$scope.wf_add_node(new_node);
		update_workflow($scope.wf);
	};

	/*
	* Button on workflows cancel task clicked
	*/
	$scope.wf_cancel_task_clicked = function() {
		$scope.wf_form_task_show = false;
	};

	/*
	* Clicked the "download" glyphicon in clicked variable
	*/
	$scope.wf_import_variable = function() {
		task_ace.setValue(log_ace.getValue() + '$' +$scope.wf_variable_name, 1);
	};

	///////////////////////////////////////////////////
	///////// END OF WORKFLOWS ////////////////////////
	///////////////////////////////////////////////////


});
