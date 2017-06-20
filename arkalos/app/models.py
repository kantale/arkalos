from django.db import models
from django.contrib.auth.models import User

'''
After making changed here:
python manage.py makemigrations ; python manage.py migrate;
'''

class Reference(models.Model):
	user = models.ForeignKey(User)
	code = models.CharField(max_length=100, unique=True,)
	content = models.TextField()
	# Perhaps not the nicest way. We need something like enum...
	reference_type = models.CharField(max_length=20, unique=True,) # BIBTEX, RSA, ...
	created_at = models.DateTimeField(auto_now_add=True,)
