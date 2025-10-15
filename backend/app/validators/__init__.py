# app/validators/__init__.py
from .roles import ROLES, ROLES_INDEXES
from .users import USERS, USERS_INDEXES
from .persons import PERSONS, PERSONS_INDEXES

COLLECTIONS = {
    "roles": ROLES,
    "users": USERS,
    "persons": PERSONS,
}

INDEXES = {
    "roles": ROLES_INDEXES,
    "users": USERS_INDEXES,
    "persons": PERSONS_INDEXES,
}
