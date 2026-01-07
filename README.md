# Flowers 

A Django-based application that serves a beautiful flower bouquet page with customizable names and messages. It also logs visits for you to see who viewed your bouquet.

## Quick Start with Docker

1. **Pull and Run the Container**
   ```bash
   docker run -p 8000:8000 -e DJANGO_SECRET_KEY='your-secret-key' -e DJANGO_ALLOWED_HOSTS='*' ghcr.io/arsiba/flowers:latest
   ```

2. **Create Superuser**
   After starting the container, you need to create an admin account to access the dashboard:
   ```bash
   docker exec -it <container_id_or_name> python manage.py createsuperuser
   ```

## Usage & API

The application provides a flexible way to personalize the bouquet page using either URL paths or query parameters.

### Endpoints

- **Main Page:** `GET /`
- **Admin Dashboard:** `GET /admin/` (Access logs and statistics)

### Parameters

| Parameter | Description | Example                                              |
|-----------|-------------|------------------------------------------------------|
| `name`    | The recipient's name | `?name=Alice` or `/Alice/`                           |
| `message` | A custom message to display | `?message=Have a lovely day` or `/Alice/Have a lovely day/` |
| `sender`  | The sender's name | `?sender=Bob` or `/Alice/Have a lovely day/Bob/` |

### URL Patterns

1. **Query Parameters (Recommended for sharing)**
   `http://localhost:8000/?name=Jane&message=Thinking%20of%20you&sender=Bob` (Result: "Thinking of you/Bob")

2. **Path Parameters**
   - Name only: `http://localhost:8000/Jane/`
   - Name and Message: `http://localhost:8000/Jane/Thinking%20of%20you/`
   - Name, Message and Sender: `http://localhost:8000/Jane/Thinking%20of%20you/Bob/` (Result: "Thinking of you/Bob")

## Configuration

You can configure the application using the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Secret key for Django security | (Insecure default provided) |
| `DJANGO_DEBUG` | Enable/Disable debug mode | `False` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated list of allowed hosts | `*` |
| `DATABASE_URL` | Database connection string | `sqlite:///db.sqlite3` |
| `DJANGO_SECURE_SSL_REDIRECT` | Redirect HTTP to HTTPS | `False` |

## Monitoring

Log into the admin dashboard at `/admin/` to view:
- Access logs (IP, User Agent, Path)
- Visit statistics and charts
- Personalized messages sent
