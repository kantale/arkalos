from django.shortcuts import render

from .arkalos_views import register, login, logout, \
	add_reference, get_references

def index(request):

	#Check if user is authenticated
	is_authenticated = request.user.is_authenticated()

	context = {
		'username' : request.user.username if is_authenticated else '',
	}

	return render(request, 'app/index.html', context)


