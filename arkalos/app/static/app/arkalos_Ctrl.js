
app.controller('arkalos_Ctrl', function($scope, $http, $timeout) {

	/*
	* Init function called by angular
	*/
	$scope.init = function() {
		$scope.username = username;
		$scope.initialize_ui();
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
			$scope.tool_current_version = 'N/A';
			$scope.tools_created_at = 'N/A';
			$scope.add_tool_show = true;
		}


	};

	/*
	* Clicked the "Cancel" button at Tools/Data
	*/
	$scope.add_tools_cancel_clicked = function() {
		$scope.add_tool_show = false;
	};

	// ###########################################
	// ########### TALK WITH DOCKER SERVER #######
	// ###########################################

	/*
	* DOCKER GET IDLE
	*/
	$scope.docker_get_idle = function(docker_none_idle, docker_found_idle, docker_get_output, none_counter, commands) {
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
						$scope.docker_get_idle(docker_none_idle, docker_found_idle, docker_get_output, none_counter+1, commands);
					}
				}
				else {
					docker_found_idle(docker_get_output, p_index, commands);
				}
			},
			function(response) {
				console.log('THIS SHOULD NEVER HAPPEN 384');
			},
			function(statusText) {
				console.log('COULD NOT REACH DOCKER SERVER 1 : ' + statusText );
			}
		);
	};

	/*
	* DOCKER SUBMIT COMMANDS
	*/
	$scope.docker_found_idle = function(docker_get_output, p_index, commands) {
		$scope.ajax(
			'http://139.91.70.73:8080/',
			{
				'action': 'SUBMIT',
				'p_index': p_index,
				'task': commands
			},
			function(response) {
				if (response['response'] == 'SUBMITTED') {
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
				console.log('COULD NOT REACH DOCKER SERVER 2 : ' + statusText);
			}
		);
	};

	/*
	* DOCKER GET OUTPUT
	*/
	$scope.docker_get_output = function(p_index) {
		$scope.ajax(
			'http://139.91.70.73:8080/',
			{
				'action': 'GET OUTPUT',
				'p_index': p_index
			},
			function(response) {
				var output = response['output'];
				var last = response['last'];
				console.log('RECEIVED OUTPUT:');
				console.log(output);
				if (last) {
					//FINISHED (set verified??)
				}
				else {
					console.log('NOT FINISHED.. WAITING MORE OUTPUT');
					//WAIT 1.5 SEC
					$timeout(
						function() {$scope.docker_get_output(p_index)},
						1500
					);

				}
			},
			function(response) {
				console.log('THIS SHOULD NEVER HAPPEN 782');
			},
			function(statusText) {
				console.log('COUND NOT REACH DOCKER SERVER 3 : ' + statusText);
			}
		);
	};

	/*
	* WRAPPER FUNCTION. USE THIS
	*/
	$scope.do_docker = function(commands) {

		$scope.docker_get_idle(
			function() {console.log('QUITING..');}, // docker_none_idle, 
			$scope.docker_found_idle, //docker_found_idle, 
			$scope.docker_get_output, //docker_get_output, 
			0, //none_counter, 
			commands);

	};
	

	// ###########################################
	// #### END OF TALK WITH DOCKER SERVER #######
	// ###########################################


	/*
	* ARKALOS WORKER SERVER: http://139.91.70.73:8080/ 
	*/
	$scope.add_tools_save_clicked = function() {
		var install_commands = installation_ace.getValue()
		console.log(install_commands);

		$scope.do_docker(install_commands);
	};

	/*
	* Clicked the "Save" button in Add Tools
	*/
	$scope.add_tools_save_clicked_old = function() {
		
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
				"references": JSON.stringify(references)
			},
			function(response) {
				alert('add tool success');
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
