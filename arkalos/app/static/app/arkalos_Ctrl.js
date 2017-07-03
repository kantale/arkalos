
app.controller('arkalos_Ctrl', function($scope, $http) {

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

	/*
	* Clicked the "Save" button in Add Tools
	*/
	$scope.add_tools_save_clicked = function() {
		
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
