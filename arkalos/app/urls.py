from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^register/$', views.register, name='register'),
    url(r'^login/$', views.login, name='login'),
    url(r'^logout/$', views.logout, name='logout'),
    url(r'^add_reference/$', views.add_reference, name='add_reference'),
    url(r'^get_references/$', views.get_references, name='get_references'),
    url(r'^reference_suggestions/$', views.reference_suggestions, name='reference_suggestions'),
    url(r'^get_tools/$', views.get_tools, name='get_tools'),
    url(r'^add_tool/$', views.add_tool, name='add_tool'),

]

