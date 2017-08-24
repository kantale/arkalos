from django.db import models
from django.contrib.auth.models import User

'''
Field Referene: https://docs.djangoproject.com/en/1.11/ref/models/fields/ 

After making changed here:
python manage.py makemigrations ; python manage.py migrate;

Interactive Shell
python manage.py shell
>>> from app.models import Reference
'''

class Reference(models.Model):
	user = models.ForeignKey(User)
	code = models.CharField(max_length=100, unique=True,)
	title = models.TextField()
	authors = models.TextField()
	content = models.TextField()
	html = models.TextField()
	# Perhaps not the nicest way. We need something like enum...
	reference_type = models.CharField(max_length=20, ) # BIBTEX, RSA, ...
	created_at = models.DateTimeField(auto_now_add=True,)

class Tools(models.Model):

	user = models.ForeignKey(User)
	name = models.CharField(max_length=100)
	version = models.CharField(max_length=100)
	system = models.CharField(max_length=100) # TODO perhaps "choices" is better https://docs.djangoproject.com/en/1.11/ref/models/fields/#choices 
	current_version = models.PositiveIntegerField()
	previous_version = models.PositiveIntegerField(null=True)
	created_at = models.DateTimeField(auto_now_add=True,)
	url = models.URLField() # WARNING!! DEFAULT MAX SIZE IS 200 # https://docs.djangoproject.com/en/1.11/ref/models/fields/#urlfield 
	description = models.TextField()
	installation = models.TextField()
	references = models.ManyToManyField(Reference)
	dependencies = models.ManyToManyField("Tools")
	exposed = models.TextField() # JSON serialized



