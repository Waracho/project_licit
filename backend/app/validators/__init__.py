# app/validators/__init__.py
from .roles import ROLES, ROLES_INDEXES
from .users import USERS, USERS_INDEXES
from .persons import PERSONS, PERSONS_INDEXES
from .departments import DEPARTMENTS, DEPARTMENTS_INDEXES
from .tender_requests import TENDER_REQUESTS, TENDER_REQUESTS_INDEXES

COLLECTIONS = {
    "roles": ROLES,
    "users": USERS,
    "persons": PERSONS,
    "departments": DEPARTMENTS,
    "tender_requests": TENDER_REQUESTS,
}

INDEXES = {
    "roles": ROLES_INDEXES,
    "users": USERS_INDEXES,
    "persons": PERSONS_INDEXES,
    "departments": DEPARTMENTS_INDEXES,
    "tender_requests": TENDER_REQUESTS_INDEXES,
}
