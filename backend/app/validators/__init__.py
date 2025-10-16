from .roles import ROLES, ROLES_INDEXES
from .users import USERS, USERS_INDEXES
from .persons import PERSONS, PERSONS_INDEXES
from .departments import DEPARTMENTS, DEPARTMENTS_INDEXES
from .tender_requests import TENDER_REQUESTS, TENDER_REQUESTS_INDEXES
from .request_files import REQUEST_FILES, REQUEST_FILES_INDEXES
from .tender_request_events import TENDER_REQUEST_EVENTS, TENDER_REQUEST_EVENTS_INDEXES

COLLECTIONS = {
    "roles": ROLES,
    "users": USERS,
    "persons": PERSONS,
    "departments": DEPARTMENTS,
    "tender_requests": TENDER_REQUESTS,
    "request_files": REQUEST_FILES,
    "tender_request_events": TENDER_REQUEST_EVENTS,
}

INDEXES = {
    "roles": ROLES_INDEXES,
    "users": USERS_INDEXES,
    "persons": PERSONS_INDEXES,
    "departments": DEPARTMENTS_INDEXES,
    "tender_requests": TENDER_REQUESTS_INDEXES,
    "request_files": REQUEST_FILES_INDEXES,
    "tender_request_events": TENDER_REQUEST_EVENTS_INDEXES,
}
