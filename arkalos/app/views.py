from django.shortcuts import render

from .arkalos_views import register, login, logout, \
	add_reference, get_references, get_reference, reference_suggestions, \
	get_tools, get_tools_ui, add_tool, jstree_tool, jstree_tool_dependencies, get_tool_dependencies, get_tool_variables, \
	get_reports, get_reports_ui, add_report, jstree_report, \
	add_workflow, get_workflows, jstree_wf, get_workflow

def index(request):

	#Check if user is authenticated
	is_authenticated = request.user.is_authenticated()

	context = {
		'include_static': True, 
		'username' : request.user.username if is_authenticated else '',
	}

	return render(request, 'app/index.html', context)


