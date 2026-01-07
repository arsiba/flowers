FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip
COPY requirements.txt .

RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=Flowers.settings
ENV DJANGO_DEBUG=False
ENV DJANGO_ALLOWED_HOSTS=*
ENV DJANGO_SECURE_SSL_REDIRECT=False

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

COPY . .

RUN mkdir -p /app/staticfiles

RUN DJANGO_SECRET_KEY=collectstatic-dummy-key \
    DJANGO_DEBUG=False \
    DJANGO_ALLOWED_HOSTS=* \
    python manage.py collectstatic --noinput

RUN addgroup --system django && adduser --system --group django
RUN chown -R django:django /app

USER django

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 120 --preload --access-logfile - --error-logfile - Flowers.wsgi:application"]
