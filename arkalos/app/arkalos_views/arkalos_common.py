
from django.http import HttpResponse

from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout

from django.shortcuts import redirect

from django.core.validators import URLValidator # https://stackoverflow.com/questions/7160737/python-how-to-validate-a-url-in-python-malformed-or-not 
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from django.db.models import Max, Count

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
format_time_string = '%a, %d %b %Y %H:%M:%S' # RFC 2822 Internet email standard. https://docs.python.org/2/library/time.html#time.strftime   # '%Y-%m-%d, %H:%M:%S'
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

def format_time(t):
    '''
    Universal method to string format time vars
    '''
    return t.strftime(format_time_string)

###########################################################################
##################DATABASE FUNCTIONS#######################################
###########################################################################

def bootstrap_table_format_field(entry, value):
    '''
    Formats the field of a bootstrap table. Values are taken from bidings
    '''

    if type(value) is str:
        if type(entry) is dict:
            return entry[value]
        else:
            return getattr(entry, value)
    elif callable(value):
        return value(entry)

def serve_boostrap_table2(model, count_f, query_f, bindings, **kwargs):
    '''
    count_f = Tools.objects.values('name', 'url').annotate(Count('name')).count()
    query_f = Tools.objects.values('name', 'url').annotate(Count('name'))
    '''

    count = count_f()

    order = kwargs['order'] 
    offset = kwargs['offset']
    limit = kwargs['limit']

    from_offset = int(offset)
    to_offset = from_offset + int(limit)

    if 'filter' in kwargs:
        # "read" the filter
        filter_ = kwargs['filter']
        filter_ = simplejson.loads(filter_)
    else:
        querySet = query_f()

    ret = {'total': count}
    ret['rows'] = [ {k: bootstrap_table_format_field(entry, v) for k, v in bindings.items()} for entry in querySet]

    json = simplejson.dumps(ret)
    return HttpResponse(json, content_type='application/json')

def serve_boostrap_table(model, bindings, order_by, **kwargs):
    '''
    http://bootstrap-table.wenzhixin.net.cn/ 
    '''
    count = model.objects.count()

    order = kwargs['order'] 
    offset = kwargs['offset']
    limit = kwargs['limit']

    from_offset = int(offset)
    to_offset = from_offset + int(limit)

    if 'filter' in kwargs:
        filter_ = kwargs['filter']
        filter_ = simplejson.loads(filter_)
        filter_ = { bindings[k] + '__icontains':v for k,v in filter_.items()}

        querySet = model.objects.filter(**filter_)
        count = querySet.count()
        querySet = querySet[from_offset:to_offset]
    else:
        querySet = model.objects.order_by(order_by)[from_offset:to_offset]

    ret = {'total': count}
    ret['rows'] = [ {k: bootstrap_table_format_field(entry, v) for k, v in bindings.items()} for entry in querySet]

    json = simplejson.dumps(ret)
    return HttpResponse(json, content_type='application/json')


def db_exists(model, filters):
    '''
    Does this entry exist?
    '''
    return model.objects.filter(**filters).exists()

def get_maximum_current_version(model, name):
    '''
    Return the next available current_version
    '''


    max_entry = model.objects.filter(name=name).aggregate(Max('current_version'))

    if max_entry['current_version__max'] is None:
        return 1

    assert type(max_entry) is dict
    assert len(max_entry) == 1

    return max_entry['current_version__max'] + 1

def build_jstree_tool_dependencies(tool, prefix='', include_original=False):
    '''
    Build the dependency jstree of this tool
    include_original are we including the original tool in the jstree?
    '''

    def node(t):

        ret = {
            'id': prefix + sep + t.name + sep + str(t.current_version),
            'text': t.name + ' ' + str(t.current_version),
            'children': [build_jstree_tool_dependencies(x, prefix, include_original=True) for x in t.dependencies.all()] + [{'text': x[0], 'type': 'exposed'} for x in simplejson.loads(t.exposed)],
            'current_version': t.current_version,
            'name': t.name,
            'type': 'tool',
        }

        return ret

    if include_original:
        return node(tool)
    else:
        return [node(dependent_tool) for dependent_tool in tool.dependencies.all()]

def build_jstree(model, name, prefix=''):
    '''
    Take an entry that has a previous_version and current_version
    Build a jstree compatible structure 
    '''

    index = {}

    if prefix:
        prefix_to_add = prefix + sep
    else:
        prefix_to_add = ''

    def node(o):
        current_version = o.current_version
        ret = {
            'id': prefix_to_add + o.name + sep + str(o.current_version), 
            'text': o.name + ' ' + str(o.current_version), 
            'children': [],
            'current_version': o.current_version,
            'name': o.name
            }

        index[current_version] = ret
        return ret

    ret = []
    all_objects = model.objects.filter(name=name).order_by("current_version")

    ret.append(node(all_objects[0]))

    for o in all_objects[1:]:
        previous_version = o.previous_version
        this_node = node(o)
        index[previous_version]['children'].append(this_node)

    #print (simplejson.dumps(ret))

    return ret


###########################################################################
##################END OF DATABASE#######################################
###########################################################################

###########################################################################
################## REGISTER ###############################################
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

###########################################################################
################## END OF REGISTER ########################################
###########################################################################


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
    '''
    Get called from tagas input
    '''
    query = kwargs['query']

    querySet = Reference.objects.filter(content__icontains = query)[:10]
    ret = [ {'value' : entry.code, 'html': entry.html} for entry in querySet] # We have a html representation for each Reference

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


    def serve_boostrap_table2(model, count_f, query_f, bindings, **kwargs):
    
    count_f = Tools.objects.values('name', 'url').annotate(Count('name')).count()
    query_f = Tools.objects.values('name', 'url').annotate(Count('name')
    '''

    bindings = {
        'name' : 'name',
        'url': lambda entry : '<a href="{}" target="_blank">{}</a>'.format(entry['url'], entry['url']),
        'total_edits': lambda entry: entry['name__count'],
        'description': lambda entry: ''

        #'current_version': lambda entry: '{} -- {}'.format(entry.current_version, entry.previous_version),
        #'current_version': 'current_version',
        #'description': 'description',
        #'description': lambda entry: '{} {} -- {}'.format(entry.description, entry.current_version, entry.previous_version),
    }

    #return serve_boostrap_table(Tools, bindings, 'name', **kwargs)
    return serve_boostrap_table2(
        model = Tools,
        count_f = lambda : Tools.objects.values('name', 'url').annotate(Count('name')).count(),
        query_f = lambda : Tools.objects.values('name', 'url').annotate(Count('name')),
        bindings = bindings,
        **kwargs
        )

@has_data
@has_error
def get_tools_ui(request, **kwargs):
    '''
    Called when we want an explicit tool from the UI
    '''
    name = kwargs['name']
    current_version = kwargs['current_version']

    tool = Tools.objects.get(name=name, current_version=current_version)

    #print ('System: {}'.format(tool.system))

    exposed = simplejson.loads(tool.exposed)
    if not len(exposed):
        exposed = [['', '', '']]

    jstree = build_jstree(Tools, tool.name)
    dependencies = build_jstree_tool_dependencies(tool, prefix='3', include_original=False)

    #print ('DEPENDENCIES:')
    #print (dependencies)

    ret = {
        'name': tool.name,
        'current_version': current_version,
        'version' : tool.version, 
        'system' : simplejson.loads(tool.system),
        'username': tool.user.username,
        'created_at': format_time(tool.created_at),
        'url': tool.url,
        'description': tool.description,
        'installation': tool.installation,
        'validate_installation': tool.validate_installation,
        'exposed': exposed,
        'jstree': jstree,
        'references': [x.code for x in tool.references.all()],
        'summary': tool.summary,
        'dependencies': dependencies
    }

    return success(ret)


@has_data
@has_field(
    ['name', 'version', 'url', 'description', 'installation'], 
    ['Name cannot be empty', 'Version cannot be empty', 'Link cannot be empty', 'Description cannot be empty', 'Installation cannot be empty'])
@has_error
def add_tool(request, **kwargs):
    '''
    Attempt to add a new Tool
    '''

    system = kwargs['system']
    system_p = simplejson.loads(system)
    if not len(system_p):
        return fail('Please select one or more systems')

    url = kwargs['url']
    if not URL_validate(url):
        return fail('URL: {} does not seem to be valid'.format(url))

    references = kwargs['references']
    references = simplejson.loads(references)
    references = [Reference.objects.get(code=r) for r in references]

    name = kwargs['name']
    current_version = get_maximum_current_version(Tools, name)
    previous_version = kwargs["previous_version"]
    if current_version == 1:
        previous_version = None
    else:
        assert type(previous_version) is int
        assert previous_version > 0
#    else:
#        print ('Previous version: {}'.format(previous_version))
#        print ('Current version: {}'.format(current_version))
#        a=1/0 # Throw exception deliberately
    print ('Current version: {}'.format(current_version))

    user = get_user(request)
    version = kwargs['version']
    description = kwargs['description']
    installation=kwargs['installation']
    validate_installation = kwargs['validate_installation']
    exposed = kwargs['exposed']
    #print ('Exposed: {} {}'.format(exposed, type(exposed).__name__)) # This is a list
    exposed = [e for e in exposed if any(e)] # Remove empty
    exposed = simplejson.dumps(exposed) # Serialize

    summary = kwargs['summary']

    new_tool = Tools(
        user=user,
        name=name,
        version=version,
        system=system,
        current_version=current_version,
        previous_version=previous_version,
        url = url,
        description = description,
        installation = installation,
        validate_installation = validate_installation,
        exposed = exposed,
        summary = summary,
        );

    new_tool.save()

    #Add references
    new_tool.references.add(*references)
    new_tool.save()
    jstree = build_jstree(Tools, new_tool.name)

    #Add dependencies
    dependencies = kwargs['dependencies']
    dependencies_objects = [Tools.objects.get(name=dependency['name'], current_version=dependency['current_version']) for dependency in dependencies]
    new_tool.dependencies.add(*dependencies_objects)

    #Get created at
    created_at = format_time(new_tool.created_at)
    print ('Created at: {}'.format(created_at))

    ret = {
        'created_at': created_at,
        'current_version': current_version,
        'jstree': jstree
    }

    return success(ret)

@has_data
@has_error
def jstree_tool(request, **kwargs):
    '''
    AJAX backend to get the version jstree for a tool
    '''

    name = kwargs['name']
    prefix = kwargs['prefix']
    ret = {
        'jstree' : build_jstree(Tools, name, prefix=prefix),
    }

    return success(ret)

@has_data
@has_error
def jstree_tool_dependencies(request, **kwargs):
    '''
    AJAX backend to get the dependency jstree for a tool 
    '''

    name = kwargs['name']
    current_version = int(kwargs['current_version'])

    tool = Tools.objects.get(name=name, current_version=current_version)

    ret = {
        'jstree': build_jstree_tool_dependencies(tool, prefix='3', include_original=True)
    }

    print(ret)

    return success(ret)


########################################
####END OF TOOLS / DATA#################
########################################

