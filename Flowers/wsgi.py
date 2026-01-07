import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Flowers.settings')

application = get_wsgi_application()
