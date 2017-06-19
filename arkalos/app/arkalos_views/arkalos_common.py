
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout

from django.shortcuts import redirect

import simplejson

def fail(error_message=None):
    '''
    Failed AJAX request
    '''

    ret = {'success': False, 'error_message': error_message}
    json = simplejson.dumps(ret)
    return HttpResponse(json, content_type='application/json')

def success(data):
    '''
    success Ajax request
    '''
    data['success'] = True
    json = simplejson.dumps(data)
    return HttpResponse(json, content_type='application/json')



def has_data(f):
    '''
    Decorator that passes AJAX data to a function parameters
    '''
    def wrapper(*args, **kwargs):
            request = args[0]
            if request.method == 'POST':
                    if len(request.POST):
                            for k in request.POST:
                                    kwargs[k] = request.POST[k]
                    else:
                            POST = simplejson.loads(request.body)
                            for k in POST:
                                    kwargs[k] = POST[k]
            elif request.method == 'GET':
                    for k in request.GET:
                            kwargs[k] = request.GET[k]
                            print ("GET: {} == {}".format(k, kwargs[kß]))

            return f(*args, **kwargs)

    return wrapper

def has_field(field_names, errors):
    '''
    Check if field names are present
    '''
    def decorator(f):
        def wrapper(*args, **kwargs):

            for field_index, field_name in enumerate(field_names):
                if not field_name in kwargs:
                    if callable(errors):
                        kwargs['error'] = errors(field_name)
                    elif type(a) is list:
                        kwargs['error'] = errors[field_index]
                    return f(*args, **kwargs)

            return f(*args, **kwargs)

        return wrapper
    return decorator

def has_error(f):
    '''
    Check if error in kwargs
    '''
    def wrapper(*args, **kwargs):
        if 'error' in kwargs:
            return fail(kwargs['error'])

        return f(*args, **kwargs)
    return wrapper

def username_exists(username):
    '''
    Checks if a username exists
    '''
    return User.objects.filter(username=username).exists()


@has_data
@has_field(['username', 'password', 'password_confirm', 'email'], lambda x :'{} is required'.format(x))
@has_error
def register(request, **kwargs):
    '''
    Register
    '''

    #print (kwargs)

    username = kwargs['username']
    password = kwargs['password']
    password_confirm = kwargs['password_confirm']
    email = kwargs['email']

    #Check if this user exists
    if username_exists(username):
        return fail('Username {} exists'.format(username))

    #Check if password match
    if kwargs['password'] != kwargs['password_confirm']:
        return fail('Passwords do not match')

    #Create user
    user = User.objects.create_user(username, email, password)

    return success({})

@has_data
@has_field(['username', 'password'], lambda x :'{} is required'.format(x))
@has_error
def loginlocal(request, **kwargs):
    '''
    Function called from login
    '''

    username = kwargs['username']
    password = kwargs['password']

    user = authenticate(username=username, password=password)

    if user is None:
        return fail('Invalid username or password')

    #if user.is_active: ... # https://docs.djangoproject.com/en/1.9/topics/auth/default/ 

    login(request, user)

    ret = {'username': username}
    return success(ret)

def logoutlocal(request):
    '''
    logout
    '''
    logout(request)
    return redirect('/')
