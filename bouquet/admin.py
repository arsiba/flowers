from django.contrib import admin
from django.db.models import Count
from django.db.models.functions import TruncDay
from django.shortcuts import render
from django.urls import path
from .models import AccessLog
import json
from django.utils.safestring import mark_safe

@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'name', 'message', 'ip_address', 'path')
    list_filter = ('timestamp', 'name')
    search_fields = ('name', 'message', 'ip_address', 'path')

    def changelist_view(self, request, extra_context=None):
        chart_data = (
            AccessLog.objects.annotate(date=TruncDay('timestamp'))
            .values('date')
            .annotate(y=Count('id'))
            .order_by('date')
        )

        path_data = (
            AccessLog.objects.values('path')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        name_message_data = (
            AccessLog.objects.values('name', 'message')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        as_json = json.dumps([
            {'x': entry['date'].strftime('%Y-%m-%d') if entry['date'] else 'None', 'y': entry['y']}
            for entry in chart_data
        ])
        
        paths_json = json.dumps([
            {'label': entry['path'], 'data': entry['count']}
            for entry in path_data
        ])

        name_message_json = json.dumps([
            {'label': f"{entry['name'] or 'Anonymous'}: {entry['message'] or 'No message'}", 'data': entry['count']}
            for entry in name_message_data
        ])

        extra_context = extra_context or {}
        extra_context['chart_data'] = mark_safe(as_json)
        extra_context['paths_data'] = mark_safe(paths_json)
        extra_context['name_message_data'] = mark_safe(name_message_json)

        return super().changelist_view(request, extra_context=extra_context)
