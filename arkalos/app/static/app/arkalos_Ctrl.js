
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
		$scope.tools_show = false;
		$scope.references_show = false;
		$scope.references_error_msg = '';
		$scope.validate_button_disabled = false;
		$scope.add_tools_is_validated = false;
		$scope.add_tools_exposed_vars = [['','','']];
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
			$scope.add_tools_is_validated = false;
			$scope.add_tools_exposed_vars = [['','','']];
			$('#ta_tools_ref').tagsinput('removeAll');

			$scope.tool_previous_version = 'N/A';
			$scope.tool_current_version = 'N/A';
			$scope.tools_created_at = 'N/A';
			$scope.tools_username = $scope.username;
			$scope.add_tool_show = true;

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

			validate_installation_ace.setValue(validate_commands_init, 1);

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
		log_ace.setValue('',1);
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
				"previous_version": $scope.tool_previous_version
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
	*/
	$scope.tools_create_jstree = function(name, jstree_id) {

		$scope.ajax(
			'jstree_tool/',
			{
				'name': name
			},
			function(response) {
				var t_jstree = response['jstree'];

				var jstree_id_jq = '#' + jstree_id;

				$(jstree_id_jq).on('refresh.jstree', function() {
					$(jstree_id_jq).jstree("open_all");
				});

				$(jstree_id_jq).on('select_node.jstree', function(e, data){
					row = {'name': data.node.original.name, 'current_version': data.node.original.current_version};
					$scope.tools_table_row_clicked(row);
				});

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

				var t_jstree = response['jstree'];

				$scope.add_tools_row_clicked_ui(t_jstree);
			},
			function(response) {
				$scope.tools_error_msg = response['error_message'];
			},
			function(statusText) {
				$scope.tools_error_msg = statusText;
			}
		);

	};

	////////////////////////////////////////////////////
	//////////END OF TOOLS / DATA //////////////////////
	////////////////////////////////////////////////////

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


});
