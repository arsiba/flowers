from django.shortcuts import render
from .models import AccessLog

def index(request, name=None, message=None):
    name_param = name or request.GET.get('name', '')
    custom_message = message or request.GET.get('message', '')
    
    AccessLog.objects.create(
        name=name_param,
        message=custom_message,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT'),
        path=request.path
    )
    
    name = name_param
    if name:
        name = name.strip().title()
    if custom_message:
        custom_message = custom_message.strip()
        if custom_message:
            custom_message = custom_message[0].upper() + custom_message[1:]
    
    landing_text = "I got you some flowers,"
    if name:
        landing_text = f"{landing_text} {name}"
    
    flower_message = ""
    if custom_message:
        signature = ", Arne"
        if not custom_message.endswith(signature):
            flower_message = f"{custom_message}{signature}"
        else:
            flower_message = custom_message
        
    return render(request, 'bouquet/index.html', {
        'name': landing_text,
        'message': flower_message
    })
