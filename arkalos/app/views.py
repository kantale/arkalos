from django.shortcuts import render

from .arkalos_views import register, login, logout, \
	add_reference, get_references, reference_suggestions, \
	get_tools, add_tool

def index(request):

	#Check if user is authenticated
	is_authenticated = request.user.is_authenticated()

	context = {
		'include_static': True, 
		'username' : request.user.username if is_authenticated else '',
	}

	return render(request, 'app/index.html', context)


