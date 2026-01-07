from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('<str:name>/', views.index, name='index_with_name'),
    path('<str:name>/<path:message>/<str:sender>/', views.index, name='index_with_name_message_and_sender'),
    path('<str:name>/<path:message>/', views.index, name='index_with_name_and_message'),
]
