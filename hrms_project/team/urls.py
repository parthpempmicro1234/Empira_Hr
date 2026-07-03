from django.urls import path

from .views import MyTeamTodaySummaryView, MyTeamCalendarView

urlpatterns = [
    path("summary/", MyTeamTodaySummaryView.as_view(), name='myteamsummary'),
    path("teamcalander/", MyTeamCalendarView.as_view(), name='myteamcalander')
]