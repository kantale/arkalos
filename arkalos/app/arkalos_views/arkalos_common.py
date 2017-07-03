
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout

from django.shortcuts import redirect

from django.core.validators import URLValidator # https://stackoverflow.com/questions/7160737/python-how-to-validate-a-url-in-python-malformed-or-not 
from django.core.exceptions import ValidationError

from app.models import Reference, Tools

import io
import six
import simplejson

#https://pybtex.org/
from pybtex.database import parse_string as parse_reference_string

import pybtex.database.input.bibtex
import pybtex.plugin

# Globals
pybtex_style = pybtex.plugin.find_plugin('pybtex.style.formatting', 'plain')()
pybtex_html_backend = pybtex.plugin.find_plugin('pybtex.backends', 'html')()
pybtex_parser = pybtex.database.input.bibtex.Parser()

sep = '||'
url_validator = URLValidator() # https://stackoverflow.com/questions/7160737/python-how-to-validate-a-url-in-python-malformed-or-not 

class ArkalosException(Exception):
    pass

def get_user_id(request):
    '''
    Get id of user
    '''
    is_authenticated = request.user.is_authenticated()
    if is_authenticated:
        return request.user.id

    return None

def get_user(request):
    '''
    Get user object
    '''
    is_authenticated = request.user.is_authenticated()
    if is_authenticated:
        return request.user

    return None

def fail(error_message=None):
    '''
    Failed AJAX request
    '''

    ret = {'success': False, 'error_message': error_message}
    json = simplejson.dumps(ret)
    return HttpResponse(json, content_type='application/json')

def success(data={}):
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
                            print ("GET: {} == {}".format(k, kwargs[k]))

            return f(*args, **kwargs)

    return wrapper

def has_field(field_names, errors):
    '''
    Check if field names are present
    field_name: The field to check

    '''
    def decorator(f):
        def wrapper(*args, **kwargs):

            for field_index, field_name in enumerate(field_names):
                if not field_name in kwargs:
                    if callable(errors):
                        kwargs['error'] = errors(field_name)
                    elif type(errors) is list:
                        kwargs['error'] = errors[field_index]
                    elif type(errors) is dict:
                        kwargs['error'] = errors[field_name]
                    elif type(errors) is str:
                        kwargs['error'] = errors
                    else:
                        # This should never happen
                        raise ArkalosException('Unknown error type: {}'.format(type(error).__name__))
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

def URL_validate(url):
    '''
    https://stackoverflow.com/questions/7160737/python-how-to-validate-a-url-in-python-malformed-or-not
    '''

    try:
        url_validator(url)
    except ValidationError as e:
        return False 

    return True

###########################################################################
##################DATABASE FUNCTIONS#######################################
###########################################################################

def serve_boostrap_table(model, bindings, order_by, **kwargs):
    '''
    http://bootstrap-table.wenzhixin.net.cn/ 
    '''
    count = model.objects.count()

    #print ('Count:', count)

    order = kwargs['order'] 
    offset = kwargs['offset']
    limit = kwargs['limit']

    #print ('order:', order)
    #print ('offset:', offset)
    #print ('limit:', limit)

    from_offset = int(offset)
    to_offset = from_offset + int(limit)

    if 'filter' in kwargs:
        filter_ = kwargs['filter']
        filter_ = simplejson.loads(filter_)
        filter_ = { bindings[k] + '__icontains':v for k,v in filter_.items()}

        #print ('filter_:', filter_)

        querySet = model.objects.filter(**filter_)
        count = querySet.count()
        querySet = querySet[from_offset:to_offset]
    else:
        querySet = model.objects.order_by(order_by)[from_offset:to_offset]

    ret = {'total': count}
    ret['rows'] = [ {k: getattr(entry, v) for k, v in bindings.items()} for entry in querySet]

    json = simplejson.dumps(ret)
    return HttpResponse(json, content_type='application/json')


def db_exists(model, filters):
    return model.objects.filter(**filters).exists()

###########################################################################
##################END OF DATABASE#######################################
###########################################################################


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

###############################
####REFERENCES#################
###############################

def reference_get_fields(content):
    '''
    Get the code of the bibtex entry
    '''
    p = parse_reference_string(content, 'bibtex')
    p_len = len(p.entries)
    if p_len == 0:
        return False, 'Could not find BIBTEX entry'
    if p_len > 1:
        return False, 'More than one BIBTEX entries found'

    code = p.entries.keys()[0]
    if not 'title' in p.entries[code].fields:
        return False, 'Could not find title information'
    
    title = p.entries[code].fields['title']

    if not hasattr(p.entries[code], 'persons'):
        return False, 'Could not find author information'

    if not 'author' in p.entries[code].persons:
        return False, 'Could not find author information'

    if len(p.entries[code].persons['author']) == 0:
        return False, 'Could not find author information'

    authors = sep.join([str(x) for x in p.entries[code].persons['author']])


    return True, {'code': code, 'title': title, 'authors': authors}

def bibtex_to_html(content):
    '''
    Convert bibtex to html
    Adapted from: http://pybtex-docutils.readthedocs.io/en/latest/quickstart.html#overview 
    '''
    data = pybtex_parser.parse_stream(six.StringIO(content))
    data_formatted = pybtex_style.format_entries(six.itervalues(data.entries))

    output = io.StringIO()
    pybtex_html_backend.write_to_stream(data_formatted, output)
    html = output.getvalue()

    html_s = html.split('\n')
    html_s = html_s[9:-2]
    new_html = '\n'.join(html_s).replace('<dd>', '').replace('</dd>', '')
    return new_html

@has_data
@has_field(['content'], 'BIBTEX content is required')
@has_error
def add_reference(request, **kwargs):
    '''
    Add reference 
    '''

    content = kwargs['content']

    s, fields = reference_get_fields(content)
    if not s:
        return fail(fiels)

    if db_exists(Reference, {'code': fields['code']}):
        return fail('BIBTEX entry with code {} already exists'.format(code))

    html = bibtex_to_html(content)

    r = Reference(
        user=get_user(request),
        code=fields['code'],
        title=fields['title'],
        authors=fields['authors'],
        content=content,
        reference_type='BIBTEX',
        html = html,
        )
    r.save()

    return success()

@has_data
def get_references(request, **kwargs):
    '''
    Serve GET Request for References bootstrap table 
    '''
    bindings = {
        'id': 'code',
        'content': 'html',
    }
    return serve_boostrap_table(Reference, bindings, 'id', **kwargs)

@has_data
def reference_suggestions(request, **kwargs):
    query = kwargs['query']

    querySet = Reference.objects.filter(content__icontains = query)[:10]
    ret = [ {'value' : entry.code, 'html': entry.html} for entry in querySet]

    json = simplejson.dumps(ret)
    return HttpResponse(json, content_type='application/json')

###############################
######END OF REFERENCES########
###############################

#################################
####TOOLS / DATA#################
#################################

@has_data
def get_tools(request, **kwargs):
    '''
    Serve GET Request for Tools bootstrap table
    '''

    bindings = {
        'name' : 'name'
    }

    return serve_boostrap_table(Tools, bindings, 'name', **kwargs)

@has_data
@has_field(
    ['name', 'version', 'url', 'description', 'installation'], 
    ['Name cannot be empty', 'Version cannot be empty', 'URL cannot be empty', 'Description cannot be empty', 'Installation cannot be empty'])
@has_error
def add_tool(request, **kwargs):

    system = kwargs['system']
    system = simplejson.loads(system)
    if not len(system):
        return fail('Please select one or more systems')
    
    url = kwargs['url']
    if not URL_validate(url):
        return fail('URL: {} does not seem to be valid'.format(url))

    references = kwargs['references']
    references = simplejson.loads(references)
    

    #print (kwargs['system'])
    return success()

########################################
####END OF TOOLS / DATA#################
########################################

